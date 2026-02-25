// MindTrap Maze — Clean S-shaped winding maze with 30 questions
//
// The maze follows a clear serpentine (S-shaped) pattern:
//   Go north several cells → turn east → go east → turn south →
//   Go south several cells → turn east → go east → turn north → repeat
//
// Between questions: 4-6 corridor cells of exploration with turns.
// Wrong paths: 3-4 cells before dead end.
// Correct paths: continue into next exploration section.
//
// All connections are strictly cardinal (horizontal/vertical).

const WALL_HEIGHT = 3.5;
const CORRIDOR_WIDTH = 4;
const SEGMENT_LENGTH = 4;

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
    const occupied = new Set();
    const correctPaths = {}; // Maps questionId -> correct path index
    const TOTAL_QUESTIONS = 30;

    function key(gx, gz) { return `${gx},${gz}`; }
    function isFree(gx, gz) { return !occupied.has(key(gx, gz)); }
    function addNode(id, gx, gz, props) {
        occupied.add(key(gx, gz));
        nodes[id] = { id, x: gx * SEGMENT_LENGTH, z: gz * SEGMENT_LENGTH, ...props };
    }

    // Directions: 0=north(-z), 1=east(+x), 2=south(+z), 3=west(-x)
    const DX = [0, 1, 0, -1];
    const DZ = [-1, 0, 1, 0];
    function leftOf(d) { return (d + 3) % 4; }
    function rightOf(d) { return (d + 1) % 4; }

    // Place a chain of corridor nodes going in direction `dir` from (sx,sz)
    // Returns { lastId, cx, cz }
    function placeChain(startId, sx, sz, dir, count, depthVal) {
        let lastId = startId, cx = sx, cz = sz;
        for (let i = 0; i < count; i++) {
            cx += DX[dir];
            cz += DZ[dir];
            if (!isFree(cx, cz)) break;
            const id = `cor_${cx}_${cz}`;
            addNode(id, cx, cz, { depth: depthVal, isQuestion: false, type: 'corridor' });
            edges.push({ from: lastId, to: id });
            lastId = id;
        }
        return { lastId, cx, cz };
    }

    // ─── Build the S-shaped maze ───

    let cx = 0, cz = 0;
    addNode('start', cx, cz, { depth: 0, isQuestion: false, type: 'corridor' });
    let lastId = 'start';

    // Main direction alternates: north, then south (serpentine)
    // Lateral shift is always east (+x) to create the S-shape
    let vertDir = 0; // 0 = north (-z), 2 = south (+z)

    for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
        // ═══ EXPLORATION: Go vertical 3-4 cells ═══
        const vertLen = 3 + (q % 2); // alternates 3, 4
        const vertResult = placeChain(lastId, cx, cz, vertDir, vertLen, q - 1);
        lastId = vertResult.lastId;
        cx = vertResult.cx;
        cz = vertResult.cz;

        // ═══ TURN: Go east 1-2 cells (lateral shift) ═══
        const latLen = 1 + (q % 3 === 0 ? 1 : 0);
        const latResult = placeChain(lastId, cx, cz, 1, latLen, q - 1); // east
        lastId = latResult.lastId;
        cx = latResult.cx;
        cz = latResult.cz;

        // ═══ QUESTION JUNCTION ═══
        // Place question 1 cell forward in vertical direction
        const qx = cx + DX[vertDir];
        const qz = cz + DZ[vertDir];
        if (!isFree(qx, qz)) {
            // Fallback: place in current direction
            cx += DX[1]; cz += DZ[1]; // go east
        } else {
            cx = qx; cz = qz;
        }

        const qId = `q${q}`;
        addNode(qId, cx, cz, { depth: q - 1, isQuestion: true, type: 'junction', pathCount: 3 });
        edges.push({ from: lastId, to: qId });

        // ═══ THREE BRANCHING PATHS ═══
        // Paths go: left, forward, right relative to approach direction
        const approachDir = vertDir; // player approaches from this direction
        // RANDOMIZE the correct path per player using the seed!
        const correctIdx = Math.floor(rng() * 3);
        correctPaths[qId] = correctIdx;
        const pathDirs = [leftOf(approachDir), approachDir, rightOf(approachDir)];

        for (let p = 0; p < 3; p++) {
            const pDir = pathDirs[p];
            const px = cx + DX[pDir];
            const pz = cz + DZ[pDir];
            if (!isFree(px, pz)) continue;

            const pId = `q${q}_p${p}`;
            addNode(pId, px, pz, { depth: q, isQuestion: false, type: 'corridor' });
            edges.push({ from: qId, to: pId, pathIndex: p });

            if (p === correctIdx) {
                // ═══ CORRECT PATH: 2-3 more corridor cells ═══
                const corLen = 2 + (q % 2);
                const corResult = placeChain(pId, px, pz, pDir, corLen, q);

                if (q < TOTAL_QUESTIONS) {
                    lastId = corResult.lastId;
                    cx = corResult.cx;
                    cz = corResult.cz;
                    // After correct path: flip vertical direction for S-shape
                    if (q % 5 === 0) vertDir = vertDir === 0 ? 2 : 0;
                } else {
                    // Victory node
                    const vx = corResult.cx + DX[pDir];
                    const vz = corResult.cz + DZ[pDir];
                    if (isFree(vx, vz)) {
                        addNode('victory', vx, vz, { depth: TOTAL_QUESTIONS, isQuestion: false, type: 'victory' });
                        edges.push({ from: corResult.lastId, to: 'victory' });
                    }
                }
            } else {
                // ═══ WRONG PATH: Extended 6-8 winding cells → dead end ═══
                let wDir = pDir;
                let wLastId = pId, wx = px, wz = pz;

                // We will create exactly 3 segments with 2 turns
                const segmentLengths = [
                    1 + Math.floor(rng() * 2), // 1-2 cells
                    1 + Math.floor(rng() * 2), // 1-2 cells
                    1 + Math.floor(rng() * 2)  // 1-2 cells
                ];

                for (let seg = 0; seg < segmentLengths.length; seg++) {
                    const len = segmentLengths[seg];
                    for (let s = 0; s < len; s++) {
                        const nx = wx + DX[wDir], nz = wz + DZ[wDir];
                        if (!isFree(nx, nz)) break; // Stop if wall hit
                        const id = `q${q}_w${p}_seg${seg}_${s}`;
                        addNode(id, nx, nz, { depth: q, isQuestion: false, type: 'corridor' });
                        edges.push({ from: wLastId, to: id });
                        wLastId = id; wx = nx; wz = nz;
                    }

                    // Turn at the end of the segment (except the last one)
                    if (seg < segmentLengths.length - 1) {
                        const turnLeft = rng() > 0.5;
                        const turnDir = turnLeft ? leftOf(wDir) : rightOf(wDir);
                        const tnx = wx + DX[turnDir], tnz = wz + DZ[turnDir];
                        if (isFree(tnx, tnz)) {
                            const tid = `q${q}_wt${p}_${seg}`;
                            addNode(tid, tnx, tnz, { depth: q, isQuestion: false, type: 'corridor' });
                            edges.push({ from: wLastId, to: tid });
                            wLastId = tid; wx = tnx; wz = tnz; wDir = turnDir;
                        } else {
                            // If unable to turn without hitting wall, force stop extending
                            break;
                        }
                    }
                }

                // Dead end
                const deadX = wx + DX[wDir], deadZ = wz + DZ[wDir];
                if (isFree(deadX, deadZ)) {
                    const deadId = `q${q}_dead${p}`;
                    addNode(deadId, deadX, deadZ, { depth: q, isQuestion: false, type: 'deadend' });
                    edges.push({ from: wLastId, to: deadId });
                } else {
                    nodes[wLastId].type = 'deadend';
                }
            }
        }
    }

    return { nodes, edges, WALL_HEIGHT, CORRIDOR_WIDTH, SEGMENT_LENGTH, correctPaths };
}

export function getQuestionNodes() {
    const nodes = [];
    for (let i = 1; i <= 30; i++) nodes.push(`q${i}`);
    return nodes;
}

export function getDifficultyForDepth(depth) {
    if (depth <= 6) return 1;
    if (depth <= 12) return 2;
    if (depth <= 18) return 3;
    if (depth <= 24) return 4;
    return 5;
}
