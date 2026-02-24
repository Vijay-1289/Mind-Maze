// MindTrap Maze — Pre-defined maze graph
// The maze is a directed acyclic graph where question nodes have multiple children (paths)
// Each path corresponds to an answer option

const WALL_HEIGHT = 4;
const CORRIDOR_WIDTH = 3;
const SEGMENT_LENGTH = 8;

// Generate a multi-level maze graph with question nodes at branch points
function createMazeGraph() {
    const nodes = {};
    const edges = [];

    // ===== LEVEL 0: Entrance =====
    nodes['start'] = {
        id: 'start', x: 0, z: 0, depth: 0,
        isQuestion: false, type: 'corridor'
    };
    nodes['q1'] = {
        id: 'q1', x: 0, z: -SEGMENT_LENGTH, depth: 0,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'start', to: 'q1' });

    // ===== LEVEL 1: After Q1, 3 paths =====
    nodes['q1_p0'] = { id: 'q1_p0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 2, depth: 1, isQuestion: false, type: 'corridor' };
    nodes['q1_p1'] = { id: 'q1_p1', x: 0, z: -SEGMENT_LENGTH * 2, depth: 1, isQuestion: false, type: 'corridor' };
    nodes['q1_p2'] = { id: 'q1_p2', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 2, depth: 1, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q1', to: 'q1_p0', pathIndex: 0 });
    edges.push({ from: 'q1', to: 'q1_p1', pathIndex: 1 });
    edges.push({ from: 'q1', to: 'q1_p2', pathIndex: 2 });

    // Dead ends for wrong answers at Q1
    nodes['q1_dead0'] = { id: 'q1_dead0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 3, depth: 1, isQuestion: false, type: 'deadend' };
    nodes['q1_dead2'] = { id: 'q1_dead2', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 3, depth: 1, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q1_p0', to: 'q1_dead0' });
    edges.push({ from: 'q1_p2', to: 'q1_dead2' });

    // Correct path continues (q1_p1 is "structurally" correct, but mapping is randomized per player)
    nodes['q2'] = {
        id: 'q2', x: 0, z: -SEGMENT_LENGTH * 3, depth: 1,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q1_p1', to: 'q2' });

    // ===== LEVEL 2: After Q2, 3 paths =====
    nodes['q2_p0'] = { id: 'q2_p0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 4, depth: 2, isQuestion: false, type: 'corridor' };
    nodes['q2_p1'] = { id: 'q2_p1', x: 0, z: -SEGMENT_LENGTH * 4, depth: 2, isQuestion: false, type: 'corridor' };
    nodes['q2_p2'] = { id: 'q2_p2', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 4, depth: 2, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q2', to: 'q2_p0', pathIndex: 0 });
    edges.push({ from: 'q2', to: 'q2_p1', pathIndex: 1 });
    edges.push({ from: 'q2', to: 'q2_p2', pathIndex: 2 });

    nodes['q2_dead0'] = { id: 'q2_dead0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 5, depth: 2, isQuestion: false, type: 'deadend' };
    nodes['q2_dead1'] = { id: 'q2_dead1', x: 0, z: -SEGMENT_LENGTH * 5, depth: 2, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q2_p0', to: 'q2_dead0' });
    edges.push({ from: 'q2_p1', to: 'q2_dead1' });

    nodes['q3'] = {
        id: 'q3', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 5, depth: 2,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q2_p2', to: 'q3' });

    // ===== LEVEL 3: After Q3, 3 paths =====
    nodes['q3_p0'] = { id: 'q3_p0', x: 0, z: -SEGMENT_LENGTH * 6, depth: 3, isQuestion: false, type: 'corridor' };
    nodes['q3_p1'] = { id: 'q3_p1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 6, depth: 3, isQuestion: false, type: 'corridor' };
    nodes['q3_p2'] = { id: 'q3_p2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 6, depth: 3, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q3', to: 'q3_p0', pathIndex: 0 });
    edges.push({ from: 'q3', to: 'q3_p1', pathIndex: 1 });
    edges.push({ from: 'q3', to: 'q3_p2', pathIndex: 2 });

    nodes['q3_dead1'] = { id: 'q3_dead1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 7, depth: 3, isQuestion: false, type: 'deadend' };
    nodes['q3_dead2'] = { id: 'q3_dead2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 7, depth: 3, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q3_p1', to: 'q3_dead1' });
    edges.push({ from: 'q3_p2', to: 'q3_dead2' });

    nodes['q4'] = {
        id: 'q4', x: 0, z: -SEGMENT_LENGTH * 7, depth: 3,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q3_p0', to: 'q4' });

    // ===== LEVEL 4: After Q4, 3 paths =====
    nodes['q4_p0'] = { id: 'q4_p0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 8, depth: 4, isQuestion: false, type: 'corridor' };
    nodes['q4_p1'] = { id: 'q4_p1', x: 0, z: -SEGMENT_LENGTH * 8, depth: 4, isQuestion: false, type: 'corridor' };
    nodes['q4_p2'] = { id: 'q4_p2', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 8, depth: 4, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q4', to: 'q4_p0', pathIndex: 0 });
    edges.push({ from: 'q4', to: 'q4_p1', pathIndex: 1 });
    edges.push({ from: 'q4', to: 'q4_p2', pathIndex: 2 });

    nodes['q4_dead0'] = { id: 'q4_dead0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 9, depth: 4, isQuestion: false, type: 'deadend' };
    nodes['q4_dead2'] = { id: 'q4_dead2', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 9, depth: 4, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q4_p0', to: 'q4_dead0' });
    edges.push({ from: 'q4_p2', to: 'q4_dead2' });

    nodes['q5'] = {
        id: 'q5', x: 0, z: -SEGMENT_LENGTH * 9, depth: 4,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q4_p1', to: 'q5' });

    // ===== LEVEL 5: After Q5, 3 paths =====
    nodes['q5_p0'] = { id: 'q5_p0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 10, depth: 5, isQuestion: false, type: 'corridor' };
    nodes['q5_p1'] = { id: 'q5_p1', x: 0, z: -SEGMENT_LENGTH * 10, depth: 5, isQuestion: false, type: 'corridor' };
    nodes['q5_p2'] = { id: 'q5_p2', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 10, depth: 5, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q5', to: 'q5_p0', pathIndex: 0 });
    edges.push({ from: 'q5', to: 'q5_p1', pathIndex: 1 });
    edges.push({ from: 'q5', to: 'q5_p2', pathIndex: 2 });

    nodes['q5_dead0'] = { id: 'q5_dead0', x: -SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 11, depth: 5, isQuestion: false, type: 'deadend' };
    nodes['q5_dead1'] = { id: 'q5_dead1', x: 0, z: -SEGMENT_LENGTH * 11, depth: 5, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q5_p0', to: 'q5_dead0' });
    edges.push({ from: 'q5_p1', to: 'q5_dead1' });

    nodes['q6'] = {
        id: 'q6', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 11, depth: 5,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q5_p2', to: 'q6' });

    // ===== LEVEL 6: After Q6, 3 paths =====
    nodes['q6_p0'] = { id: 'q6_p0', x: 0, z: -SEGMENT_LENGTH * 12, depth: 6, isQuestion: false, type: 'corridor' };
    nodes['q6_p1'] = { id: 'q6_p1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 12, depth: 6, isQuestion: false, type: 'corridor' };
    nodes['q6_p2'] = { id: 'q6_p2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 12, depth: 6, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q6', to: 'q6_p0', pathIndex: 0 });
    edges.push({ from: 'q6', to: 'q6_p1', pathIndex: 1 });
    edges.push({ from: 'q6', to: 'q6_p2', pathIndex: 2 });

    nodes['q6_dead0'] = { id: 'q6_dead0', x: 0, z: -SEGMENT_LENGTH * 13, depth: 6, isQuestion: false, type: 'deadend' };
    nodes['q6_dead2'] = { id: 'q6_dead2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 13, depth: 6, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q6_p0', to: 'q6_dead0' });
    edges.push({ from: 'q6_p2', to: 'q6_dead2' });

    nodes['q7'] = {
        id: 'q7', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 13, depth: 6,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q6_p1', to: 'q7' });

    // ===== LEVEL 7: After Q7, 3 paths =====
    nodes['q7_p0'] = { id: 'q7_p0', x: 0, z: -SEGMENT_LENGTH * 14, depth: 7, isQuestion: false, type: 'corridor' };
    nodes['q7_p1'] = { id: 'q7_p1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 14, depth: 7, isQuestion: false, type: 'corridor' };
    nodes['q7_p2'] = { id: 'q7_p2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 14, depth: 7, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q7', to: 'q7_p0', pathIndex: 0 });
    edges.push({ from: 'q7', to: 'q7_p1', pathIndex: 1 });
    edges.push({ from: 'q7', to: 'q7_p2', pathIndex: 2 });

    nodes['q7_dead0'] = { id: 'q7_dead0', x: 0, z: -SEGMENT_LENGTH * 15, depth: 7, isQuestion: false, type: 'deadend' };
    nodes['q7_dead1'] = { id: 'q7_dead1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 15, depth: 7, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q7_p0', to: 'q7_dead0' });
    edges.push({ from: 'q7_p1', to: 'q7_dead1' });

    nodes['q8'] = {
        id: 'q8', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 15, depth: 7,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q7_p2', to: 'q8' });

    // ===== LEVEL 8: After Q8, 3 paths =====
    nodes['q8_p0'] = { id: 'q8_p0', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 16, depth: 8, isQuestion: false, type: 'corridor' };
    nodes['q8_p1'] = { id: 'q8_p1', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 16, depth: 8, isQuestion: false, type: 'corridor' };
    nodes['q8_p2'] = { id: 'q8_p2', x: SEGMENT_LENGTH * 3, z: -SEGMENT_LENGTH * 16, depth: 8, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q8', to: 'q8_p0', pathIndex: 0 });
    edges.push({ from: 'q8', to: 'q8_p1', pathIndex: 1 });
    edges.push({ from: 'q8', to: 'q8_p2', pathIndex: 2 });

    nodes['q8_dead1'] = { id: 'q8_dead1', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 17, depth: 8, isQuestion: false, type: 'deadend' };
    nodes['q8_dead2'] = { id: 'q8_dead2', x: SEGMENT_LENGTH * 3, z: -SEGMENT_LENGTH * 17, depth: 8, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q8_p1', to: 'q8_dead1' });
    edges.push({ from: 'q8_p2', to: 'q8_dead2' });

    nodes['q9'] = {
        id: 'q9', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 17, depth: 8,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q8_p0', to: 'q9' });

    // ===== LEVEL 9: After Q9, 3 paths =====
    nodes['q9_p0'] = { id: 'q9_p0', x: 0, z: -SEGMENT_LENGTH * 18, depth: 9, isQuestion: false, type: 'corridor' };
    nodes['q9_p1'] = { id: 'q9_p1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 18, depth: 9, isQuestion: false, type: 'corridor' };
    nodes['q9_p2'] = { id: 'q9_p2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 18, depth: 9, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q9', to: 'q9_p0', pathIndex: 0 });
    edges.push({ from: 'q9', to: 'q9_p1', pathIndex: 1 });
    edges.push({ from: 'q9', to: 'q9_p2', pathIndex: 2 });

    nodes['q9_dead0'] = { id: 'q9_dead0', x: 0, z: -SEGMENT_LENGTH * 19, depth: 9, isQuestion: false, type: 'deadend' };
    nodes['q9_dead2'] = { id: 'q9_dead2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 19, depth: 9, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q9_p0', to: 'q9_dead0' });
    edges.push({ from: 'q9_p2', to: 'q9_dead2' });

    nodes['q10'] = {
        id: 'q10', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 19, depth: 9,
        isQuestion: true, type: 'junction', pathCount: 3
    };
    edges.push({ from: 'q9_p1', to: 'q10' });

    // ===== LEVEL 10: Final question before victory =====
    nodes['q10_p0'] = { id: 'q10_p0', x: 0, z: -SEGMENT_LENGTH * 20, depth: 10, isQuestion: false, type: 'corridor' };
    nodes['q10_p1'] = { id: 'q10_p1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 20, depth: 10, isQuestion: false, type: 'corridor' };
    nodes['q10_p2'] = { id: 'q10_p2', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 20, depth: 10, isQuestion: false, type: 'corridor' };
    edges.push({ from: 'q10', to: 'q10_p0', pathIndex: 0 });
    edges.push({ from: 'q10', to: 'q10_p1', pathIndex: 1 });
    edges.push({ from: 'q10', to: 'q10_p2', pathIndex: 2 });

    nodes['q10_dead0'] = { id: 'q10_dead0', x: 0, z: -SEGMENT_LENGTH * 21, depth: 10, isQuestion: false, type: 'deadend' };
    nodes['q10_dead1'] = { id: 'q10_dead1', x: SEGMENT_LENGTH, z: -SEGMENT_LENGTH * 21, depth: 10, isQuestion: false, type: 'deadend' };
    edges.push({ from: 'q10_p0', to: 'q10_dead0' });
    edges.push({ from: 'q10_p1', to: 'q10_dead1' });

    // ===== VICTORY =====
    nodes['victory'] = {
        id: 'victory', x: SEGMENT_LENGTH * 2, z: -SEGMENT_LENGTH * 21, depth: 10,
        isQuestion: false, type: 'victory'
    };
    edges.push({ from: 'q10_p2', to: 'victory' });

    return { nodes, edges, WALL_HEIGHT, CORRIDOR_WIDTH, SEGMENT_LENGTH };
}

// Get the question node IDs in order
export function getQuestionNodes() {
    return ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
}

// For a question node, get which path index leads to the correct continuation
// This is the "structural" correct path before per-player randomization
export function getStructuralCorrectPath(questionId) {
    const correctPaths = {
        'q1': 1, 'q2': 2, 'q3': 0, 'q4': 1, 'q5': 2,
        'q6': 1, 'q7': 2, 'q8': 0, 'q9': 1, 'q10': 2
    };
    return correctPaths[questionId];
}

// Get children paths for a question node
export function getQuestionPaths(questionId, mazeData) {
    return mazeData.edges
        .filter(e => e.from === questionId && e.pathIndex !== undefined)
        .sort((a, b) => a.pathIndex - b.pathIndex)
        .map(e => ({ nodeId: e.to, pathIndex: e.pathIndex }));
}

// Get difficulty for a question based on depth
export function getDifficultyForDepth(depth) {
    if (depth <= 2) return 1;
    if (depth <= 4) return 2;
    if (depth <= 6) return 3;
    if (depth <= 8) return 4;
    return 5;
}

const mazeData = createMazeGraph();
export default mazeData;
