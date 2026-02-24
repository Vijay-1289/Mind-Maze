import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 5;
const MOUSE_SENSITIVITY = 0.002;
const CELL = 4;       // each grid cell is 4x4 units
const WALL_H = 3.5;   // wall height
const WALL_T = 0.35;  // wall thickness

export default function MazeScene({ maze, question, onReachQuestion, onChoosePath, paused, playerState }) {
    const { camera, gl } = useThree();
    const keysRef = useRef({});
    const yawRef = useRef(Math.PI);  // face into the maze (negative Z)
    const pitchRef = useRef(0);
    const playerPosRef = useRef(new THREE.Vector3(0, PLAYER_HEIGHT, 1));
    const isLockedRef = useRef(false);
    const triggeredNodesRef = useRef(new Set());

    // ─── Build a solid grid-based maze ───
    // Convert the graph into a 2D grid and place walls on every edge
    // that is NOT a valid corridor. This guarantees full enclosure.
    const { wallBoxes, wallMeshData, floorTiles, questionZones, deadEndZones, gridBounds } = useMemo(() => {
        if (!maze) return { wallBoxes: [], wallMeshData: [], floorTiles: [], questionZones: [], deadEndZones: [], gridBounds: {} };

        const S = maze.SEGMENT_LENGTH;
        const W = maze.CORRIDOR_WIDTH;

        // 1) Collect all node positions and convert to grid coords
        const nodeGrid = {};        // "gx,gz" -> nodeId
        const nodePositions = {};   // nodeId -> {gx, gz}
        let minGX = Infinity, maxGX = -Infinity, minGZ = Infinity, maxGZ = -Infinity;

        for (const [id, node] of Object.entries(maze.nodes)) {
            const gx = Math.round(node.x / S);
            const gz = Math.round(node.z / S);
            nodeGrid[`${gx},${gz}`] = id;
            nodePositions[id] = { gx, gz };
            minGX = Math.min(minGX, gx); maxGX = Math.max(maxGX, gx);
            minGZ = Math.min(minGZ, gz); maxGZ = Math.max(maxGZ, gz);
        }

        // Expand grid bounds by 1 for outer walls
        minGX -= 1; maxGX += 1; minGZ -= 1; maxGZ += 1;

        // 2) Build a set of valid passages between adjacent grid cells
        const passages = new Set(); // "gx1,gz1|gx2,gz2"
        for (const edge of maze.edges) {
            const a = nodePositions[edge.from];
            const b = nodePositions[edge.to];
            if (!a || !b) continue;
            const key1 = `${a.gx},${a.gz}|${b.gx},${b.gz}`;
            const key2 = `${b.gx},${b.gz}|${a.gx},${a.gz}`;
            passages.add(key1);
            passages.add(key2);
        }

        // 3) For each grid cell that contains a node, check all 4 edges.
        //    If an edge does NOT have a passage, place a wall segment.
        const wallData = [];
        const boxes = [];

        function addWall(cx, cy, cz, sx, sy, sz) {
            wallData.push({ pos: [cx, cy, cz], size: [sx, sy, sz] });
            const box = new THREE.Box3();
            box.setFromCenterAndSize(
                new THREE.Vector3(cx, cy, cz),
                new THREE.Vector3(sx, sy, sz)
            );
            boxes.push(box);
        }

        // Place walls for each node cell
        const visitedWalls = new Set();
        for (const [id, node] of Object.entries(maze.nodes)) {
            const { gx, gz } = nodePositions[id];
            const wx = gx * CELL;  // world x
            const wz = gz * CELL;  // world z

            // Check 4 directions: north(+z), south(-z), east(+x), west(-x)
            const dirs = [
                { dx: 0, dz: 1, wallX: wx, wallZ: wz + CELL / 2, sx: CELL + WALL_T, sy: WALL_H, sz: WALL_T },  // north
                { dx: 0, dz: -1, wallX: wx, wallZ: wz - CELL / 2, sx: CELL + WALL_T, sy: WALL_H, sz: WALL_T }, // south
                { dx: 1, dz: 0, wallX: wx + CELL / 2, wallZ: wz, sx: WALL_T, sy: WALL_H, sz: CELL + WALL_T },  // east
                { dx: -1, dz: 0, wallX: wx - CELL / 2, wallZ: wz, sx: WALL_T, sy: WALL_H, sz: CELL + WALL_T }, // west
            ];

            for (const d of dirs) {
                const neighborGX = gx + d.dx;
                const neighborGZ = gz + d.dz;
                const passageKey = `${gx},${gz}|${neighborGX},${neighborGZ}`;
                const wallKey = `${Math.min(gx, neighborGX)},${Math.min(gz, neighborGZ)},${Math.abs(d.dx)}`;

                if (!visitedWalls.has(wallKey)) {
                    visitedWalls.add(wallKey);
                    // Place wall if NO passage exists here
                    if (!passages.has(passageKey)) {
                        addWall(d.wallX, WALL_H / 2, d.wallZ, d.sx, d.sy, d.sz);
                    }
                }
            }
        }

        // 4) Add outer boundary walls — fully enclose the maze
        const bMinX = minGX * CELL - CELL / 2;
        const bMaxX = (maxGX + 1) * CELL - CELL / 2;
        const bMinZ = minGZ * CELL - CELL / 2;
        const bMaxZ = (maxGZ + 1) * CELL - CELL / 2;
        const bW = bMaxX - bMinX;
        const bH = bMaxZ - bMinZ;

        // North boundary
        addWall((bMinX + bMaxX) / 2, WALL_H / 2, bMaxZ, bW + WALL_T, WALL_H, WALL_T);
        // South boundary
        addWall((bMinX + bMaxX) / 2, WALL_H / 2, bMinZ, bW + WALL_T, WALL_H, WALL_T);
        // East boundary
        addWall(bMaxX, WALL_H / 2, (bMinZ + bMaxZ) / 2, WALL_T, WALL_H, bH + WALL_T);
        // West boundary
        addWall(bMinX, WALL_H / 2, (bMinZ + bMaxZ) / 2, WALL_T, WALL_H, bH + WALL_T);

        // 5) Floor tiles for every node cell
        const floors = [];
        for (const [id, node] of Object.entries(maze.nodes)) {
            const { gx, gz } = nodePositions[id];
            floors.push({ pos: [gx * CELL, 0, gz * CELL], size: [CELL, 0.1, CELL], type: node.type });
        }
        // Also fill corridor floors between connected nodes
        for (const edge of maze.edges) {
            const a = nodePositions[edge.from];
            const b = nodePositions[edge.to];
            if (!a || !b) continue;
            const steps = Math.max(Math.abs(b.gx - a.gx), Math.abs(b.gz - a.gz));
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                const ix = Math.round(a.gx + (b.gx - a.gx) * t);
                const iz = Math.round(a.gz + (b.gz - a.gz) * t);
                floors.push({ pos: [ix * CELL, 0, iz * CELL], size: [CELL, 0.1, CELL], type: 'corridor' });
            }
        }

        // 6) Collect question zones and dead ends
        const qZones = [];
        const deZones = [];
        for (const [id, node] of Object.entries(maze.nodes)) {
            const { gx, gz } = nodePositions[id];
            if (node.isQuestion) qZones.push({ id, x: gx * CELL, z: gz * CELL });
            if (node.type === 'deadend') deZones.push({ id, x: gx * CELL, z: gz * CELL });
        }

        return {
            wallBoxes: boxes,
            wallMeshData: wallData,
            floorTiles: floors,
            questionZones: qZones,
            deadEndZones: deZones,
            gridBounds: { minX: bMinX, maxX: bMaxX, minZ: bMinZ, maxZ: bMaxZ }
        };
    }, [maze]);

    // ─── Pointer Lock ───
    const requestLock = useCallback(() => { gl.domElement.requestPointerLock(); }, [gl]);

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

    // ─── Keyboard ───
    useEffect(() => {
        const onDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
    }, []);

    // ─── Game Loop ───
    useFrame((_, delta) => {
        if (paused && !question) return;
        if (question || paused) return;

        const keys = keysRef.current;
        const speed = PLAYER_SPEED * delta;
        const dir = new THREE.Vector3();

        if (keys['w'] || keys['arrowup']) dir.z -= 1;
        if (keys['s'] || keys['arrowdown']) dir.z += 1;
        if (keys['a'] || keys['arrowleft']) dir.x -= 1;
        if (keys['d'] || keys['arrowright']) dir.x += 1;

        if (dir.length() > 0) {
            dir.normalize().multiplyScalar(speed);
            const sin = Math.sin(yawRef.current);
            const cos = Math.cos(yawRef.current);
            const moveX = dir.x * cos - dir.z * sin;
            const moveZ = dir.x * sin + dir.z * cos;

            const newPos = playerPosRef.current.clone();
            const R = 0.3; // player collision radius

            // Try X movement
            newPos.x += moveX;
            const boxX = new THREE.Box3().setFromCenterAndSize(
                newPos, new THREE.Vector3(R * 2, PLAYER_HEIGHT, R * 2)
            );
            if (wallBoxes.some(wb => boxX.intersectsBox(wb))) newPos.x -= moveX;

            // Try Z movement
            newPos.z += moveZ;
            const boxZ = new THREE.Box3().setFromCenterAndSize(
                newPos, new THREE.Vector3(R * 2, PLAYER_HEIGHT, R * 2)
            );
            if (wallBoxes.some(wb => boxZ.intersectsBox(wb))) newPos.z -= moveZ;

            playerPosRef.current.copy(newPos);
        }

        // Camera
        camera.position.copy(playerPosRef.current);
        const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        // Question zone proximity
        for (const qz of questionZones) {
            const dist = Math.sqrt((playerPosRef.current.x - qz.x) ** 2 + (playerPosRef.current.z - qz.z) ** 2);
            if (dist < 2.5 && !triggeredNodesRef.current.has(qz.id)) {
                triggeredNodesRef.current.add(qz.id);
                onReachQuestion(qz.id);
            }
        }
    });

    // ─── Materials ───
    const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#2e7d32',
        roughness: 0.75,
        metalness: 0.0,
    }), []);

    const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#a0a090',
        roughness: 0.85,
        metalness: 0.02,
    }), []);

    const deadFloorMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#c62828',
        roughness: 0.7,
        emissive: '#b71c1c',
        emissiveIntensity: 0.3,
    }), []);

    const victoryFloorMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#ffd700',
        roughness: 0.5,
        emissive: '#ff8f00',
        emissiveIntensity: 0.4,
    }), []);

    const wallTopMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#388e3c',
        roughness: 0.6,
    }), []);

    return (
        <>
            {/* Bright natural lighting */}
            <ambientLight intensity={0.9} color="#ffffff" />
            <directionalLight position={[15, 25, 15]} intensity={1.8} color="#fffde7" castShadow
                shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <hemisphereLight skyColor="#87ceeb" groundColor="#4caf50" intensity={0.6} />
            <pointLight position={[0, 8, 0]} intensity={1.2} distance={60} color="#ffffff" />
            <pointLight position={[0, 8, -40]} intensity={1.0} distance={60} color="#ffffff" />
            <pointLight position={[8, 8, -80]} intensity={1.0} distance={60} color="#ffffff" />
            <pointLight position={[0, 8, -120]} intensity={0.8} distance={60} color="#ffffff" />
            <pointLight position={[8, 8, -160]} intensity={0.8} distance={60} color="#ffffff" />

            {/* Sky-colored fog */}
            <fog attach="fog" args={['#c8e6c9', 25, 120]} />

            {/* Ground plane — extends beyond maze */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -80]} receiveShadow>
                <planeGeometry args={[200, 300]} />
                <meshStandardMaterial color="#7cb342" roughness={0.95} />
            </mesh>

            {/* Walls */}
            {wallMeshData.map((w, i) => (
                <group key={`wg${i}`}>
                    <mesh position={w.pos} castShadow receiveShadow>
                        <boxGeometry args={w.size} />
                        <primitive object={wallMat} attach="material" />
                    </mesh>
                    {/* Wall top cap — slightly wider for hedge look */}
                    <mesh position={[w.pos[0], w.pos[1] + w.size[1] / 2 + 0.1, w.pos[2]]} receiveShadow>
                        <boxGeometry args={[w.size[0] + 0.15, 0.2, w.size[2] + 0.15]} />
                        <primitive object={wallTopMat} attach="material" />
                    </mesh>
                </group>
            ))}

            {/* Floor tiles */}
            {floorTiles.map((f, i) => (
                <mesh key={`fl${i}`} position={f.pos} receiveShadow>
                    <boxGeometry args={f.size} />
                    <primitive
                        object={f.type === 'deadend' ? deadFloorMat : f.type === 'victory' ? victoryFloorMat : floorMat}
                        attach="material"
                    />
                </mesh>
            ))}

            {/* Question zone glow */}
            {questionZones.map((qz, i) => (
                <group key={`qg${i}`}>
                    <pointLight position={[qz.x, 2.5, qz.z]} intensity={1.0} distance={10} color="#ffeb3b" />
                    {/* Glowing floor marker */}
                    <mesh position={[qz.x, 0.06, qz.z]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[1.5, 32]} />
                        <meshStandardMaterial color="#ffeb3b" emissive="#ffd600" emissiveIntensity={0.6} transparent opacity={0.7} />
                    </mesh>
                </group>
            ))}

            {/* Dead end glow */}
            {deadEndZones.map((de, i) => (
                <pointLight key={`dg${i}`} position={[de.x, 2, de.z]} intensity={0.6} distance={6} color="#f44336" />
            ))}

            {/* Path lights at junctions when question is active */}
            {question && questionZones.map((qz) => {
                if (qz.id !== question.nodeId) return null;
                const paths = maze.edges.filter(e => e.from === qz.id && e.pathIndex !== undefined);
                return paths.map((p, pi) => {
                    const toNode = maze.nodes[p.to];
                    if (!toNode) return null;
                    const nodePos = (() => {
                        const S = maze.SEGMENT_LENGTH;
                        const gx = Math.round(toNode.x / S);
                        const gz = Math.round(toNode.z / S);
                        return { x: gx * CELL, z: gz * CELL };
                    })();
                    return (
                        <group key={`pl${pi}`} position={[(qz.x + nodePos.x) / 2, 2.5, (qz.z + nodePos.z) / 2]}>
                            <pointLight intensity={0.8} distance={8} color="#ffd700" />
                        </group>
                    );
                });
            })}
        </>
    );
}
