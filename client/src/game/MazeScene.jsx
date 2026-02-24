import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PLAYER_HEIGHT = 2;
const PLAYER_SPEED = 6;
const MOUSE_SENSITIVITY = 0.002;

export default function MazeScene({ maze, question, onReachQuestion, onChoosePath, paused, playerState }) {
    const { camera, gl } = useThree();
    const keysRef = useRef({});
    const yawRef = useRef(0);
    const pitchRef = useRef(0);
    const playerPosRef = useRef(new THREE.Vector3(0, PLAYER_HEIGHT, 2));
    const isLockedRef = useRef(false);
    const wallMeshesRef = useRef([]);
    const triggeredNodesRef = useRef(new Set());

    // Build wall geometry
    const { walls, floors, pathLabels, questionZones, deadEndZones } = useMemo(() => {
        if (!maze) return { walls: [], floors: [], pathLabels: [], questionZones: [], deadEndZones: [] };

        const W = maze.CORRIDOR_WIDTH;
        const H = maze.WALL_HEIGHT;
        const S = maze.SEGMENT_LENGTH;
        const wallData = [];
        const floorData = [];
        const labels = [];
        const qZones = [];
        const deZones = [];

        // For each edge, create a corridor between nodes
        for (const edge of maze.edges) {
            const fromNode = maze.nodes[edge.from];
            const toNode = maze.nodes[edge.to];
            if (!fromNode || !toNode) continue;

            const fx = fromNode.x, fz = fromNode.z;
            const tx = toNode.x, tz = toNode.z;
            const dx = tx - fx, dz = tz - fz;
            const len = Math.sqrt(dx * dx + dz * dz);

            // Floor
            floorData.push({
                pos: [(fx + tx) / 2, 0, (fz + tz) / 2],
                size: dx !== 0 ? [Math.abs(dx) + W, 0.1, W] : [W, 0.1, Math.abs(dz) + W]
            });

            // Walls (left and right of corridor)
            if (Math.abs(dz) > Math.abs(dx)) {
                // Vertical corridor
                const minZ = Math.min(fz, tz), maxZ = Math.max(fz, tz);
                wallData.push({ pos: [fx - W / 2, H / 2, (minZ + maxZ) / 2], size: [0.3, H, maxZ - minZ + W] });
                wallData.push({ pos: [fx + W / 2, H / 2, (minZ + maxZ) / 2], size: [0.3, H, maxZ - minZ + W] });
            } else if (Math.abs(dx) > 0) {
                // Horizontal corridor
                const minX = Math.min(fx, tx), maxX = Math.max(fx, tx);
                wallData.push({ pos: [(minX + maxX) / 2, H / 2, fz - W / 2], size: [maxX - minX + W, H, 0.3] });
                wallData.push({ pos: [(minX + maxX) / 2, H / 2, fz + W / 2], size: [maxX - minX + W, H, 0.3] });
            }
        }

        // Junction floors and dead end markers
        for (const [id, node] of Object.entries(maze.nodes)) {
            floorData.push({ pos: [node.x, 0, node.z], size: [W, 0.1, W] });

            if (node.isQuestion) {
                qZones.push({ id, x: node.x, z: node.z });
            }
            if (node.type === 'deadend') {
                deZones.push({ id, x: node.x, z: node.z });
            }
        }

        return { walls: wallData, floors: floorData, pathLabels: labels, questionZones: qZones, deadEndZones: deZones };
    }, [maze]);

    // Pointer lock
    const requestLock = useCallback(() => {
        gl.domElement.requestPointerLock();
    }, [gl]);

    useEffect(() => {
        const onLockChange = () => { isLockedRef.current = !!document.pointerLockElement; };
        const onMouseMove = (e) => {
            if (!isLockedRef.current || paused) return;
            yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
            pitchRef.current -= e.movementY * MOUSE_SENSITIVITY;
            pitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitchRef.current));
        };
        document.addEventListener('pointerlockchange', onLockChange);
        document.addEventListener('mousemove', onMouseMove);
        gl.domElement.addEventListener('click', requestLock);
        return () => {
            document.removeEventListener('pointerlockchange', onLockChange);
            document.removeEventListener('mousemove', onMouseMove);
            gl.domElement.removeEventListener('click', requestLock);
        };
    }, [gl, requestLock, paused]);

    // Keyboard
    useEffect(() => {
        const onDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
    }, []);

    // Store wall refs for collision
    const wallBoxesRef = useRef([]);
    useEffect(() => {
        wallBoxesRef.current = walls.map(w => {
            const box = new THREE.Box3();
            const half = new THREE.Vector3(w.size[0] / 2, w.size[1] / 2, w.size[2] / 2);
            const center = new THREE.Vector3(w.pos[0], w.pos[1], w.pos[2]);
            box.setFromCenterAndSize(center, new THREE.Vector3(w.size[0], w.size[1], w.size[2]));
            return box;
        });
    }, [walls]);

    // Game loop
    useFrame((_, delta) => {
        if (paused && !question) return;
        if (question || paused) return; // Freeze during question

        const keys = keysRef.current;
        const speed = PLAYER_SPEED * delta;
        const dir = new THREE.Vector3();

        if (keys['w'] || keys['arrowup']) dir.z -= 1;
        if (keys['s'] || keys['arrowdown']) dir.z += 1;
        if (keys['a'] || keys['arrowleft']) dir.x -= 1;
        if (keys['d'] || keys['arrowright']) dir.x += 1;

        if (dir.length() > 0) {
            dir.normalize().multiplyScalar(speed);
            // Rotate direction by yaw
            const sin = Math.sin(yawRef.current);
            const cos = Math.cos(yawRef.current);
            const moveX = dir.x * cos - dir.z * sin;
            const moveZ = dir.x * sin + dir.z * cos;

            // Collision check
            const newPos = playerPosRef.current.clone();
            const RADIUS = 0.4;

            // Try X
            newPos.x += moveX;
            const playerBoxX = new THREE.Box3().setFromCenterAndSize(
                newPos, new THREE.Vector3(RADIUS * 2, PLAYER_HEIGHT, RADIUS * 2)
            );
            let collideX = false;
            for (const wb of wallBoxesRef.current) {
                if (playerBoxX.intersectsBox(wb)) { collideX = true; break; }
            }
            if (collideX) newPos.x -= moveX;

            // Try Z
            newPos.z += moveZ;
            const playerBoxZ = new THREE.Box3().setFromCenterAndSize(
                newPos, new THREE.Vector3(RADIUS * 2, PLAYER_HEIGHT, RADIUS * 2)
            );
            let collideZ = false;
            for (const wb of wallBoxesRef.current) {
                if (playerBoxZ.intersectsBox(wb)) { collideZ = true; break; }
            }
            if (collideZ) newPos.z -= moveZ;

            playerPosRef.current.copy(newPos);
        }

        // Update camera
        camera.position.copy(playerPosRef.current);
        const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        // Check proximity to question zones
        for (const qz of questionZones) {
            const dist = Math.sqrt(
                (playerPosRef.current.x - qz.x) ** 2 +
                (playerPosRef.current.z - qz.z) ** 2
            );
            if (dist < 2.5 && !triggeredNodesRef.current.has(qz.id)) {
                triggeredNodesRef.current.add(qz.id);
                onReachQuestion(qz.id);
            }
        }
    });

    // Wall material
    const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#3a3a5c',
        roughness: 0.85,
        metalness: 0.1,
    }), []);

    const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1a1a2e',
        roughness: 0.9,
        metalness: 0.05,
    }), []);

    const deadEndMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#4a1a1a',
        roughness: 0.8,
        emissive: '#2a0000',
        emissiveIntensity: 0.3,
    }), []);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.15} color="#8888cc" />
            <pointLight position={[0, 10, 0]} intensity={1} distance={50} color="#e94560" castShadow />
            <pointLight position={[0, 8, -40]} intensity={0.8} distance={60} color="#4466ff" />
            <pointLight position={[8, 8, -80]} intensity={0.8} distance={60} color="#e94560" />
            <pointLight position={[0, 8, -120]} intensity={0.6} distance={60} color="#44ccff" />

            {/* Fog */}
            <fog attach="fog" args={['#0a0a0f', 5, 40]} />

            {/* Ceiling */}
            <mesh position={[0, maze?.WALL_HEIGHT || 4, -80]} receiveShadow>
                <boxGeometry args={[100, 0.1, 200]} />
                <meshStandardMaterial color="#0f0f1a" roughness={0.95} />
            </mesh>

            {/* Walls */}
            {walls.map((w, i) => (
                <mesh key={`w${i}`} position={w.pos} castShadow receiveShadow>
                    <boxGeometry args={w.size} />
                    <primitive object={wallMat} attach="material" />
                </mesh>
            ))}

            {/* Floors */}
            {floors.map((f, i) => (
                <mesh key={`f${i}`} position={f.pos} receiveShadow>
                    <boxGeometry args={f.size} />
                    <primitive object={floorMat} attach="material" />
                </mesh>
            ))}

            {/* Dead end markers */}
            {deadEndZones.map((de, i) => (
                <mesh key={`de${i}`} position={[de.x, 0, de.z]} receiveShadow>
                    <boxGeometry args={[maze.CORRIDOR_WIDTH, 0.15, maze.CORRIDOR_WIDTH]} />
                    <primitive object={deadEndMat} attach="material" />
                </mesh>
            ))}

            {/* Question zone glow markers */}
            {questionZones.map((qz, i) => (
                <pointLight
                    key={`ql${i}`}
                    position={[qz.x, 2, qz.z]}
                    intensity={0.6}
                    distance={8}
                    color="#e94560"
                />
            ))}

            {/* Path labels (answer text on walls at junctions) */}
            {question && questionZones.map((qz) => {
                if (qz.id !== question.nodeId) return null;
                const paths = maze.edges.filter(e => e.from === qz.id && e.pathIndex !== undefined);
                return paths.map((p, pi) => {
                    const toNode = maze.nodes[p.to];
                    if (!toNode) return null;
                    const midX = (qz.x + toNode.x) / 2;
                    const midZ = (qz.z + toNode.z) / 2;
                    return (
                        <group key={`pl${pi}`} position={[midX, 2.5, midZ]}>
                            <pointLight intensity={0.4} distance={5} color="#ffd700" />
                        </group>
                    );
                });
            })}
        </>
    );
}
