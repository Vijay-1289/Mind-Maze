// MindTrap Maze — Procedurally generated 30-question maze graph
// The maze is a directed graph where each question node has 3 paths:
// 1 correct (leads deeper) and 2 dead ends.
// The maze snakes left-right creating a more interesting layout.

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
    const TOTAL_QUESTIONS = 30;
    const correctPaths = {}; // Maps questionId -> correct path index

    // Starting position
    let curX = 0;
    let curZ = 0;

    // Add start node
    nodes['start'] = {
        id: 'start', x: curX * SEGMENT_LENGTH, z: curZ * SEGMENT_LENGTH,
        depth: 0, isQuestion: false, type: 'corridor'
    };

    // Move forward to first question
    curZ -= 1;

    for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
        const qId = `q${q}`;
        const depth = q;

        // Place question node
        nodes[qId] = {
            id: qId, x: curX * SEGMENT_LENGTH, z: curZ * SEGMENT_LENGTH,
            depth: depth - 1, isQuestion: true, type: 'junction', pathCount: 3
        };

        // Connect from previous node
        if (q === 1) {
            edges.push({ from: 'start', to: qId });
        }

        // Determine which direction is "correct" and create 3 paths
        // RANDOMIZE the correct path per player using the seed!
        const correctPathIdx = Math.floor(rng() * 3);
        correctPaths[qId] = correctPathIdx;

        // 3 path positions: left(-1), center(0), right(+1) relative to current direction
        const pathOffsets = [-1, 0, 1];

        for (let p = 0; p < 3; p++) {
            const pathNodeId = `q${q}_p${p}`;
            const pathX = curX + pathOffsets[p];
            const pathZ = curZ - 1;

            nodes[pathNodeId] = {
                id: pathNodeId,
                x: pathX * SEGMENT_LENGTH,
                z: pathZ * SEGMENT_LENGTH,
                depth, isQuestion: false,
                type: 'corridor'
            };
            edges.push({ from: qId, to: pathNodeId, pathIndex: p });

            if (p === correctPathIdx) {
                // Correct path — leads to next question or victory
                if (q < TOTAL_QUESTIONS) {
                    // Add a connector corridor then next question
                    const connId = `q${q}_conn`;
                    const connZ = pathZ - 1;
                    nodes[connId] = {
                        id: connId,
                        x: pathX * SEGMENT_LENGTH,
                        z: connZ * SEGMENT_LENGTH,
                        depth, isQuestion: false, type: 'corridor'
                    };
                    edges.push({ from: pathNodeId, to: connId });

                    // Next question will be placed at the connector's position going forward
                    curX = pathX;
                    curZ = connZ - 1;

                    // Connect connector to next question (will be added next iteration)
                    const nextQId = `q${q + 1}`;
                    // We'll create an edge from connector to next question
                    edges.push({ from: connId, to: nextQId });
                } else {
                    // Last question — correct path leads to victory
                    const victoryId = 'victory';
                    nodes[victoryId] = {
                        id: victoryId,
                        x: pathX * SEGMENT_LENGTH,
                        z: (pathZ - 1) * SEGMENT_LENGTH,
                        depth: TOTAL_QUESTIONS, isQuestion: false, type: 'victory'
                    };
                    edges.push({ from: pathNodeId, to: victoryId });
                }
            } else {
                // Wrong path — leads to dead end
                const deadId = `q${q}_dead${p}`;
                nodes[deadId] = {
                    id: deadId,
                    x: pathX * SEGMENT_LENGTH,
                    z: (pathZ - 1) * SEGMENT_LENGTH,
                    depth, isQuestion: false, type: 'deadend'
                };
                edges.push({ from: pathNodeId, to: deadId });
            }
        }
    }

    return { nodes, edges, WALL_HEIGHT, CORRIDOR_WIDTH, SEGMENT_LENGTH, correctPaths };
}

// Get all question node IDs in order
export function getQuestionNodes() {
    const nodes = [];
    for (let i = 1; i <= 30; i++) nodes.push(`q${i}`);
    return nodes;
}

// Get difficulty for a question based on depth (1-5 scale over 30 questions)
export function getDifficultyForDepth(depth) {
    if (depth <= 6) return 1;
    if (depth <= 12) return 2;
    if (depth <= 18) return 3;
    if (depth <= 24) return 4;
    return 5;
}
