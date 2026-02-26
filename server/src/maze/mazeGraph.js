// MindTrap Maze — Deterministic non-overlapping layout with randomized paths
// The maze uses a strict backtracking/grid structure to guarantee no physical overlaps in 3D

const WALL_HEIGHT = 3.5;
const CORRIDOR_WIDTH = 4;
const SEGMENT_LENGTH = 4;  // matches CELL size in MazeScene

// Seeded random number generator
function seededRandom(seed) {
    let t = seed + 0x6D2B79F5;
    return function () {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createMazeGraph(seed = 12345) {
    const rng = seededRandom(seed);
    const nodes = {};
    const edges = [];
    const TOTAL_QUESTIONS = 15;
    const correctPaths = {}; // Maps questionId -> correct path index

    function addNode(id, gx, gz, props) {
        nodes[id] = { id, x: gx * SEGMENT_LENGTH, z: gz * SEGMENT_LENGTH, ...props };
    }

    const DX = [0, 1, 0, -1]; // N, E, S, W
    const DZ = [-1, 0, 1, 0];

    // Draw a strict structured path that guarantees turns
    function drawPath(startId, sx, sz, segments, depthVal) {
        let lastId = startId, cx = sx, cz = sz, currentDir = 0;
        let stepCount = 0;

        for (const seg of segments) {
            const dir = seg[0];
            const length = seg[1];
            for (let i = 0; i < length; i++) {
                cx += DX[dir];
                cz += DZ[dir];
                const id = `${startId}_s_${stepCount++}`;
                addNode(id, cx, cz, { depth: depthVal, isQuestion: false, type: 'corridor' });
                edges.push({ from: lastId, to: id });
                lastId = id;
                currentDir = dir;
            }
        }
        return { lastId, cx, cz, lastDir: currentDir };
    }

    // Starting position (always flows North)
    let cx = 0, cz = 0;
    addNode('start', cx, cz, { depth: 0, isQuestion: false, type: 'corridor' });
    let lastId = 'start';

    // Walk forward 2 blocks initially
    const initRes = drawPath('start', cx, cz, [[0, 2]], 0);
    lastId = initRes.lastId;
    cx = initRes.cx;
    cz = initRes.cz;

    let previousCorrectIndex = -1;

    for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
        const qId = `q${q}`;

        // 1. Place Question Junction (1 block North)
        let qx = cx + DX[0]; // North
        let qz = cz + DZ[0];

        addNode(qId, qx, qz, { depth: q - 1, isQuestion: true, type: 'junction', pathCount: 3 });
        edges.push({ from: lastId, to: qId });
        cx = qx; cz = qz;

        // 3. Make three paths from this junction
        // Prevent consecutive questions from having the same physical path index answer
        let correctPathIdx = Math.floor(rng() * 3);
        if (correctPathIdx === previousCorrectIndex) {
            correctPathIdx = (correctPathIdx + 1) % 3;
        }
        correctPaths[qId] = correctPathIdx;
        previousCorrectIndex = correctPathIdx;

        let nextMainId = qId, nextMainX = cx, nextMainZ = cz;

        for (let p = 0; p < 3; p++) {
            // All paths start visually adjacent to junction
            const pDir = p === 0 ? 3 : (p === 1 ? 0 : 1); // West, North, East
            const px = cx + DX[pDir];
            const pz = cz + DZ[pDir];

            const pId = `q${q}_p${p}`;
            addNode(pId, px, pz, { depth: q, isQuestion: false, type: 'corridor' });
            edges.push({ from: qId, to: pId, pathIndex: p });

            // Hardcoded rigid mathematical profiles that guarantee NO overlaps
            let profile = [];
            if (p === 0) {
                // LEFT PATH: West 4 (from -1), North 5, East 2, North 5
                profile = [[3, 4], [0, 5], [1, 2], [0, 5]];
            } else if (p === 1) {
                // CENTER PATH: North 1 (from -1), West 2, North 4, East 4, North 4
                profile = [[0, 1], [3, 2], [0, 4], [1, 4], [0, 4]];
            } else {
                // RIGHT PATH: East 4 (from 1), North 5, West 2, North 5
                profile = [[1, 4], [0, 5], [3, 2], [0, 5]];
            }

            const pRes = drawPath(pId, px, pz, profile, q);

            if (p === correctPathIdx) {
                if (q < TOTAL_QUESTIONS) {
                    // This path is correct, add a connector straight North so next question is cleanly separated
                    // Needs to return perfectly to Center (X=0) and North 4
                    let connProfile = [];
                    if (p === 0) connProfile = [[0, 4], [1, 3], [0, 4]]; // Left is at X=-3
                    if (p === 1) connProfile = [[0, 4], [3, 2], [0, 4]]; // Center is at X=2
                    if (p === 2) connProfile = [[0, 4], [3, 3], [0, 4]]; // Right is at X=3

                    const connRes = drawPath(pRes.lastId, pRes.cx, pRes.cz, connProfile, q);
                    nextMainId = connRes.lastId;
                    nextMainX = connRes.cx;
                    nextMainZ = connRes.cz;
                } else {
                    // Final victory node
                    const vx = pRes.cx + DX[0]; // One block North
                    const vz = pRes.cz + DZ[0];
                    addNode('victory', vx, vz, { depth: TOTAL_QUESTIONS, isQuestion: false, type: 'victory' });
                    edges.push({ from: pRes.lastId, to: 'victory' });
                }
            } else {
                // Wrong path -> it naturally ends at the last block of its profile.
                // We add a 'deadend' type node directly into the wall they are facing,
                // making it visibly blocked.
                const finalDir = pRes.lastDir;
                const dx = pRes.cx + DX[finalDir];
                const dz = pRes.cz + DZ[finalDir];

                // Mark it as a deadend so MazeScene generates the red banner
                addNode(`q${q}_dead${p}`, dx, dz, { depth: q, isQuestion: false, type: 'deadend' });
                edges.push({ from: pRes.lastId, to: `q${q}_dead${p}` });
            }
        }

        // Setup state for next question loop
        lastId = nextMainId;
        cx = nextMainX;
        cz = nextMainZ;
    }

    return { nodes, edges, WALL_HEIGHT, CORRIDOR_WIDTH, SEGMENT_LENGTH, correctPaths };
}

// Get all question node IDs in order
export function getQuestionNodes() {
    const nodes = [];
    for (let i = 1; i <= 15; i++) nodes.push(`q${i}`);
    return nodes;
}

// Get difficulty for a question based on depth (1-5 scale over 15 questions)
export function getDifficultyForDepth(depth) {
    if (depth <= 3) return 1;
    if (depth <= 6) return 2;
    if (depth <= 9) return 3;
    if (depth <= 12) return 4;
    return 5;
}
