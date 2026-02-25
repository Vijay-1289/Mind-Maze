import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Text, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';

const PLAYER_HEIGHT = 1.7;
const MOVE_SPEED = 5.5;
const TURN_SPEED = 2.5;
const MOUSE_SENS = 0.002;
const CELL = 4;
const WALL_H = 3.5;
const WALL_T = 0.35;
const PLAYER_R = 0.35;

/*
  SIGN ROTATION NOTE:
  In local space, the sign's text is at z = +0.04/+0.05, meaning the
  "readable front" of the sign faces the local +Z direction.

  To make a sign face a world direction:
    Face south (+Z world)  → rotY = 0
    Face north (-Z world)  → rotY = Math.PI
    Face west  (-X world)  → rotY = Math.PI/2
    Face east  (+X world)  → rotY = -Math.PI/2

  "Approach direction" (ddx, ddz) = direction FROM previous node TO sign node.
  The sign must face OPPOSITE = face back toward where the player is coming from.
*/
function facePlayerRotY(ddx, ddz) {
    // ddx, ddz = direction the player is WALKING (from prev → sign)
    // Sign must face the OPPOSITE direction (back at the player)
    // rotY=0 → local +Z faces world +Z (south)
    // rotY=π → local +Z faces world -Z (north)
    // rotY=-π/2 → local +Z faces world -X (west)
    // rotY=π/2 → local +Z faces world +X (east)
    if (ddz < 0) return 0;            // walking north → sign faces south (+Z)
    if (ddz > 0) return Math.PI;      // walking south → sign faces north (-Z)
    if (ddx > 0) return -Math.PI / 2; // walking east  → sign faces west (-X)
    if (ddx < 0) return Math.PI / 2;  // walking west  → sign faces east (+X)
    return 0;
}

// ── Yellow Road Sign (question board) ──
function QuestionSign({ position, rotY, text, difficulty }) {
    return (
        <group position={position} rotation={[0, rotY, 0]}>
            <mesh position={[-1.2, 1.2, 0]}><cylinderGeometry args={[0.06, 0.06, 2.4, 8]} /><meshStandardMaterial color="#b0b0b0" metalness={0.8} roughness={0.3} /></mesh>
            <mesh position={[1.2, 1.2, 0]}><cylinderGeometry args={[0.06, 0.06, 2.4, 8]} /><meshStandardMaterial color="#b0b0b0" metalness={0.8} roughness={0.3} /></mesh>
            <mesh position={[0, 2.6, -0.04]}><boxGeometry args={[2.9, 1.1, 0.05]} /><meshStandardMaterial color="#212121" /></mesh>
            <mesh position={[0, 2.6, 0]}><boxGeometry args={[2.8, 1.0, 0.08]} /><meshStandardMaterial color="#f9a825" roughness={0.3} /></mesh>
            <Text position={[0, 2.72, 0.05]} fontSize={0.13} maxWidth={2.5} color="#1a1a1a" anchorX="center" anchorY="top" textAlign="center" fontWeight="bold">{text}</Text>
            <Text position={[0, 2.18, 0.05]} fontSize={0.09} color="#5d4037" anchorX="center" anchorY="middle">
                {`${'★'.repeat(difficulty)}${'☆'.repeat(5 - difficulty)}`}
            </Text>
        </group>
    );
}

// ── Green Path Sign (answer, placed inside path entrance) ──
function PathSign({ position, rotY, text }) {
    return (
        <group position={position} rotation={[0, rotY, 0]}>
            <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.04, 0.04, 2.0, 8]} /><meshStandardMaterial color="#9e9e9e" metalness={0.7} roughness={0.3} /></mesh>
            <mesh position={[0, 2.15, -0.02]}><boxGeometry args={[1.9, 0.55, 0.04]} /><meshStandardMaterial color="#ffffff" /></mesh>
            <mesh position={[0, 2.15, 0]}><boxGeometry args={[1.8, 0.45, 0.06]} /><meshStandardMaterial color="#1b5e20" roughness={0.35} /></mesh>
            <Text position={[0, 2.15, 0.04]} fontSize={0.12} maxWidth={1.5} color="#ffffff" anchorX="center" anchorY="middle" textAlign="center" fontWeight="bold">{text}</Text>
        </group>
    );
}

// ── Main Maze Scene ──
export default function MazeScene({ maze, questions, onEnterPath, onReachDeadEnd }) {
    const { camera, gl } = useThree();
    const keysRef = useRef({});
    const yawRef = useRef(Math.PI);
    const pitchRef = useRef(0);
    const posRef = useRef(new THREE.Vector3(0, PLAYER_HEIGHT, 1));
    const isLockedRef = useRef(false);
    const enteredRef = useRef(new Set());
    const deadEndHitRef = useRef(new Set());
    // Pre-allocated for collision testing (no GC pressure)
    const testBoxRef = useRef(new THREE.Box3());
    const testSize = useRef(new THREE.Vector3(PLAYER_R * 2, PLAYER_HEIGHT, PLAYER_R * 2));

    // ─── Build maze geometry + pre-compute collision ───
    const { wallBoxes, wallMeshData, floorTiles, questionZones, deadEndZones, pathZones } = useMemo(() => {
        if (!maze) return { wallBoxes: [], wallMeshData: [], floorTiles: [], questionZones: [], deadEndZones: [], pathZones: [] };

        const S = maze.SEGMENT_LENGTH;
        const nodePos = {};
        let minGX = Infinity, maxGX = -Infinity, minGZ = Infinity, maxGZ = -Infinity;
        for (const [id, node] of Object.entries(maze.nodes)) {
            const gx = Math.round(node.x / S), gz = Math.round(node.z / S);
            nodePos[id] = { gx, gz };
            minGX = Math.min(minGX, gx); maxGX = Math.max(maxGX, gx);
            minGZ = Math.min(minGZ, gz); maxGZ = Math.max(maxGZ, gz);
        }
        minGX -= 1; maxGX += 1; minGZ -= 1; maxGZ += 1;

        const passages = new Set();
        for (const edge of maze.edges) {
            const a = nodePos[edge.from], b = nodePos[edge.to];
            if (!a || !b) continue;
            if (Math.abs(a.gx - b.gx) + Math.abs(a.gz - b.gz) === 1) {
                passages.add(`${a.gx},${a.gz}|${b.gx},${b.gz}`);
                passages.add(`${b.gx},${b.gz}|${a.gx},${a.gz}`);
            }
        }

        const wData = [], wBoxes = [];
        function addW(cx, cy, cz, sx, sy, sz) {
            wData.push({ p: [cx, cy, cz], s: [sx, sy, sz] });
            wBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(cx, cy, cz), new THREE.Vector3(sx, sy, sz)));
        }

        const visited = new Set();
        for (const id of Object.keys(maze.nodes)) {
            const { gx, gz } = nodePos[id];
            const wx = gx * CELL, wz = gz * CELL;
            for (const d of [
                { dx: 0, dz: 1, wX: wx, wZ: wz + CELL / 2, sx: CELL + WALL_T, sz: WALL_T },
                { dx: 0, dz: -1, wX: wx, wZ: wz - CELL / 2, sx: CELL + WALL_T, sz: WALL_T },
                { dx: 1, dz: 0, wX: wx + CELL / 2, wZ: wz, sx: WALL_T, sz: CELL + WALL_T },
                { dx: -1, dz: 0, wX: wx - CELL / 2, wZ: wz, sx: WALL_T, sz: CELL + WALL_T },
            ]) {
                const nGX = gx + d.dx, nGZ = gz + d.dz;
                const k = `${Math.min(gx, nGX)},${Math.min(gz, nGZ)},${Math.abs(d.dx)}`;
                if (!visited.has(k)) {
                    visited.add(k);
                    if (!passages.has(`${gx},${gz}|${nGX},${nGZ}`)) addW(d.wX, WALL_H / 2, d.wZ, d.sx, WALL_H, d.sz);
                }
            }
        }

        // Boundary
        const bMinX = minGX * CELL - CELL / 2, bMaxX = (maxGX + 1) * CELL - CELL / 2;
        const bMinZ = minGZ * CELL - CELL / 2, bMaxZ = (maxGZ + 1) * CELL - CELL / 2;
        addW((bMinX + bMaxX) / 2, WALL_H / 2, bMaxZ, bMaxX - bMinX + WALL_T, WALL_H, WALL_T);
        addW((bMinX + bMaxX) / 2, WALL_H / 2, bMinZ, bMaxX - bMinX + WALL_T, WALL_H, WALL_T);
        addW(bMaxX, WALL_H / 2, (bMinZ + bMaxZ) / 2, WALL_T, WALL_H, bMaxZ - bMinZ + WALL_T);
        addW(bMinX, WALL_H / 2, (bMinZ + bMaxZ) / 2, WALL_T, WALL_H, bMaxZ - bMinZ + WALL_T);

        const floors = [], qZ = [], deZ = [], pZ = [];
        for (const [id, node] of Object.entries(maze.nodes)) {
            const { gx, gz } = nodePos[id];
            floors.push({ p: [gx * CELL, 0, gz * CELL], s: [CELL, 0.1, CELL], t: node.type });
            if (node.isQuestion) qZ.push({ id, x: gx * CELL, z: gz * CELL });
            if (node.type === 'deadend') deZ.push({ id, x: gx * CELL, z: gz * CELL });
        }
        for (const edge of maze.edges) {
            if (edge.pathIndex !== undefined) {
                const p = nodePos[edge.to];
                if (p) pZ.push({ qId: edge.from, pi: edge.pathIndex, x: p.gx * CELL, z: p.gz * CELL });
            }
        }

        return { wallBoxes: wBoxes, wallMeshData: wData, floorTiles: floors, questionZones: qZ, deadEndZones: deZ, pathZones: pZ };
    }, [maze]);

    // ─── Pointer lock ───
    const reqLock = useCallback(() => gl.domElement.requestPointerLock(), [gl]);
    useEffect(() => {
        const onLC = () => { isLockedRef.current = !!document.pointerLockElement; };
        const onMM = (e) => {
            if (!isLockedRef.current) return;
            yawRef.current -= e.movementX * MOUSE_SENS;
            pitchRef.current = Math.max(-1, Math.min(1, pitchRef.current - e.movementY * MOUSE_SENS));
        };
        document.addEventListener('pointerlockchange', onLC);
        document.addEventListener('mousemove', onMM);
        gl.domElement.addEventListener('click', reqLock);
        return () => { document.removeEventListener('pointerlockchange', onLC); document.removeEventListener('mousemove', onMM); gl.domElement.removeEventListener('click', reqLock); };
    }, [gl, reqLock]);

    // ─── Keyboard ───
    useEffect(() => {
        const dn = (e) => { keysRef.current[e.code] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); };
        const up = (e) => { keysRef.current[e.code] = false; };
        window.addEventListener('keydown', dn);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
    }, []);

    // ─── Collision test (reuses pre-allocated Box3, zero GC) ───
    const collides = useCallback((px, py, pz) => {
        testBoxRef.current.setFromCenterAndSize(
            new THREE.Vector3(px, py, pz), testSize.current
        );
        for (let i = 0; i < wallBoxes.length; i++) {
            if (testBoxRef.current.intersectsBox(wallBoxes[i])) return true;
        }
        return false;
    }, [wallBoxes]);

    // ─── Game Loop (optimized — no allocations) ───
    useFrame((_, delta) => {
        const k = keysRef.current;
        const dt = Math.min(delta, 0.04); // cap for consistency

        // ── TURN: A / ← = left, D / → = right ──
        if (k['KeyA'] || k['ArrowLeft']) yawRef.current += TURN_SPEED * dt;
        if (k['KeyD'] || k['ArrowRight']) yawRef.current -= TURN_SPEED * dt;

        // ── MOVE: W / ↑ = forward, S / ↓ = backward ──
        let fwd = 0;
        if (k['KeyW'] || k['ArrowUp']) fwd = 1;
        if (k['KeyS'] || k['ArrowDown']) fwd = -1;

        if (fwd !== 0) {
            const speed = MOVE_SPEED * dt * fwd;
            const sin = Math.sin(yawRef.current), cos = Math.cos(yawRef.current);
            const mx = -speed * sin;
            const mz = -speed * cos;
            const pos = posRef.current;

            // X axis
            if (!collides(pos.x + mx, pos.y, pos.z)) pos.x += mx;
            // Z axis
            if (!collides(pos.x, pos.y, pos.z + mz)) pos.z += mz;
        }

        camera.position.copy(posRef.current);
        camera.rotation.set(pitchRef.current, yawRef.current, 0, 'YXZ');

        // Path detection
        const px = posRef.current.x, pz2 = posRef.current.z;
        for (let i = 0; i < pathZones.length; i++) {
            const z = pathZones[i];
            const dx = px - z.x, dz = pz2 - z.z;
            if (dx * dx + dz * dz < 3.2) {
                const key = `${z.qId}_${z.pi}`;
                if (!enteredRef.current.has(key)) {
                    enteredRef.current.add(key);
                    onEnterPath(z.qId, z.pi);
                }
            }
        }

        // Dead end detection — only fires when player physically reaches a dead end
        for (let i = 0; i < deadEndZones.length; i++) {
            const de = deadEndZones[i];
            const ddx = px - de.x, ddz = pz2 - de.z;
            if (ddx * ddx + ddz * ddz < 4.0) {
                if (!deadEndHitRef.current.has(de.id)) {
                    deadEndHitRef.current.add(de.id);
                    onReachDeadEnd(de.id);
                }
            }
        }
    });

    // ─── Materials (shared, created once) ───
    const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.75 }), []);
    const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a0a090', roughness: 0.85 }), []);
    const deadFloorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c62828', roughness: 0.7, emissive: '#b71c1c', emissiveIntensity: 0.3 }), []);
    const victoryFloorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.5, emissive: '#ff8f00', emissiveIntensity: 0.4 }), []);
    const wallTopMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#388e3c', roughness: 0.6 }), []);

    // ─── Question sign data ───
    const qSignData = useMemo(() => {
        if (!maze || !questions) return [];
        const S = maze.SEGMENT_LENGTH;
        return questionZones.map(qz => {
            const q = questions[qz.id];
            if (!q) return null;
            const inEdge = maze.edges.find(e => e.to === qz.id && e.pathIndex === undefined);
            if (!inEdge || !maze.nodes[inEdge.from]) return null;
            const fn = maze.nodes[inEdge.from];
            const ddx = Math.round(qz.x / CELL) - Math.round(fn.x / S);
            const ddz = Math.round(qz.z / CELL) - Math.round(fn.z / S);
            return { ...qz, rotY: facePlayerRotY(ddx, ddz), text: q.questionText, diff: q.difficulty || 1 };
        }).filter(Boolean);
    }, [maze, questions, questionZones]);

    // ─── Path sign data (placed AT path cell, facing back to question) ───
    const pSignData = useMemo(() => {
        if (!maze || !questions) return [];
        const S = maze.SEGMENT_LENGTH;
        const signs = [];
        for (const edge of maze.edges) {
            if (edge.pathIndex === undefined) continue;
            const q = questions[edge.from];
            if (!q) continue;
            const fn = maze.nodes[edge.from], tn = maze.nodes[edge.to];
            if (!fn || !tn) continue;
            const ddx = Math.round(tn.x / S) - Math.round(fn.x / S);
            const ddz = Math.round(tn.z / S) - Math.round(fn.z / S);
            // Sign is AT the path cell, facing back toward the question
            const label = q.pathLabels?.[edge.pathIndex] || `Option ${edge.pathIndex + 1}`;
            signs.push({ x: Math.round(tn.x / S) * CELL, z: Math.round(tn.z / S) * CELL, rotY: facePlayerRotY(ddx, ddz), text: label });
        }
        return signs;
    }, [maze, questions]);

    // ─── Dead end sign data (rotated to face approaching player) ───
    const deadEndSignData = useMemo(() => {
        if (!maze) return [];
        const S = maze.SEGMENT_LENGTH;
        return deadEndZones.map(de => {
            // Find the edge leading INTO this dead end
            const inEdge = maze.edges.find(e => e.to === de.id);
            if (!inEdge || !maze.nodes[inEdge.from]) return { ...de, rotY: 0 };
            const fn = maze.nodes[inEdge.from];
            const ddx = Math.round(de.x / CELL) - Math.round(fn.x / S);
            const ddz = Math.round(de.z / CELL) - Math.round(fn.z / S);
            return { ...de, rotY: facePlayerRotY(ddx, ddz) };
        });
    }, [maze, deadEndZones]);

    return (
        <>
            <ambientLight intensity={0.9} />
            <directionalLight position={[50, 30, -200]} intensity={1.8} color="#fffde7" castShadow />
            <hemisphereLight skyColor="#87ceeb" groundColor="#4caf50" intensity={0.6} />
            <fog attach="fog" args={['#c8e6c9', 25, 90]} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[200, -0.05, -200]} receiveShadow>
                <planeGeometry args={[800, 800]} />
                <meshStandardMaterial color="#7cb342" roughness={0.95} />
            </mesh>

            {wallMeshData.length > 0 && (
                <>
                    <Instances limit={10000} range={wallMeshData.length} material={wallMat} castShadow receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        {wallMeshData.map((w, i) => (
                            <Instance key={`w-${i}`} position={w.p} scale={w.s} />
                        ))}
                    </Instances>
                    <Instances limit={10000} range={wallMeshData.length} material={wallTopMat} castShadow receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        {wallMeshData.map((w, i) => (
                            <Instance key={`wt-${i}`} position={[w.p[0], w.p[1] + w.s[1] / 2 + 0.1, w.p[2]]} scale={[w.s[0] + 0.15, 0.2, w.s[2] + 0.15]} />
                        ))}
                    </Instances>
                </>
            )}

            {floorTiles.length > 0 && (
                <>
                    <Instances limit={10000} range={floorTiles.filter(f => f.t !== 'deadend' && f.t !== 'victory').length} material={floorMat} receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        {floorTiles.filter(f => f.t !== 'deadend' && f.t !== 'victory').map((f, i) => (
                            <Instance key={`f-norm-${i}`} position={f.p} scale={f.s} />
                        ))}
                    </Instances>
                    <Instances limit={10000} range={floorTiles.filter(f => f.t === 'deadend').length} material={deadFloorMat} receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        {floorTiles.filter(f => f.t === 'deadend').map((f, i) => (
                            <Instance key={`f-dead-${i}`} position={f.p} scale={f.s} />
                        ))}
                    </Instances>
                    <Instances limit={10000} range={floorTiles.filter(f => f.t === 'victory').length} material={victoryFloorMat} receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        {floorTiles.filter(f => f.t === 'victory').map((f, i) => (
                            <Instance key={`f-vic-${i}`} position={f.p} scale={f.s} />
                        ))}
                    </Instances>
                </>
            )}

            {deadEndSignData.map((de, i) => (
                <group key={i} position={[de.x, 0, de.z]} rotation={[0, de.rotY, 0]}>
                    <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.04, 0.04, 2.4, 6]} /><meshStandardMaterial color="#9e9e9e" metalness={0.7} /></mesh>
                    <mesh position={[0, 2.5, 0]}><boxGeometry args={[1.8, 0.6, 0.06]} /><meshStandardMaterial color="#d32f2f" /></mesh>
                    <Text position={[0, 2.5, 0.04]} fontSize={0.22} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">DEAD END</Text>
                </group>
            ))}

            {qSignData.map(qs => <QuestionSign key={qs.id} position={[qs.x, 0, qs.z]} rotY={qs.rotY} text={qs.text} difficulty={qs.diff} />)}
            {pSignData.map((ps, i) => <PathSign key={i} position={[ps.x, 0, ps.z]} rotY={ps.rotY} text={ps.text} />)}
        </>
    );
}
