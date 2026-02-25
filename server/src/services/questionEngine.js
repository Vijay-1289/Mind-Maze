import Question from '../models/Question.js';
import { getQuestionNodes, createMazeGraph, getDifficultyForDepth } from '../maze/mazeGraph.js';

// Seeded random number generator (mulberry32)
function seededRandom(seed) {
    let t = seed + 0x6D2B79F5;
    return function () {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Shuffle array with seeded random
function seededShuffle(array, rng) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Per-player question assignment cache
const playerMappings = new Map();

/**
 * Assign unique question mapping for a player session.
 * Each of the 30 maze nodes gets a unique question from the pool.
 * Answer-to-path mapping is randomized per player.
 */
export async function assignQuestionsToPlayer(sessionId, seed) {
    if (playerMappings.has(sessionId)) {
        return playerMappings.get(sessionId);
    }

    const rng = seededRandom(seed);
    const questionNodes = getQuestionNodes(); // 30 nodes
    const mapping = {};

    // Get ALL questions and shuffle them with the player's seed
    const allQuestions = await Question.find({ active: true });
    if (allQuestions.length === 0) {
        throw new Error('No questions available in database');
    }

    // Create a seeded shuffle of all questions for this player
    const shuffledQuestions = seededShuffle(allQuestions, rng);

    // Generate the maze structure using the player's seed
    // This dictates which physical path is correct at each junction
    const mazeData = createMazeGraph(seed);
    const correctPaths = mazeData.correctPaths;

    for (let i = 0; i < questionNodes.length; i++) {
        const nodeId = questionNodes[i];

        // Pick question (wrap around if more nodes than questions)
        const question = shuffledQuestions[i % shuffledQuestions.length];

        // The structural correct path for this node, given the player's seed
        const structuralCorrect = correctPaths[nodeId];

        // We have 3 paths but questions may have 4 options.
        // Pick 3 options: the correct one + 2 random wrong ones.
        const correctIdx = question.correctIndex;
        const allOptionIndices = question.options.map((_, idx) => idx);
        const wrongIndices = allOptionIndices.filter(idx => idx !== correctIdx);
        const shuffledWrong = seededShuffle(wrongIndices, rng);
        const selectedWrong = shuffledWrong.slice(0, 2); // pick 2 wrong options

        // pathMapping[physicalPathIndex] = optionIndex to display on that path
        const pathMapping = new Array(3);

        // Correct option goes on the structural correct path
        pathMapping[structuralCorrect] = correctIdx;

        // Wrong options go on the remaining paths
        const wrongPaths = [0, 1, 2].filter(p => p !== structuralCorrect);
        const shuffledWrongPaths = seededShuffle(wrongPaths, rng);
        shuffledWrongPaths.forEach((pathIdx, j) => {
            pathMapping[pathIdx] = selectedWrong[j];
        });

        mapping[nodeId] = {
            questionId: question._id,
            questionText: question.text,
            options: question.options,
            pathMapping,
            correctPath: structuralCorrect, // SERVER-ONLY — never sent to client
            difficulty: question.difficulty
        };
    }

    playerMappings.set(sessionId, mapping);
    return mapping;
}

/**
 * Get question for a specific node for a player (client-safe version)
 */
export function getQuestionForNode(sessionId, nodeId) {
    const mapping = playerMappings.get(sessionId);
    if (!mapping || !mapping[nodeId]) return null;

    const data = mapping[nodeId];
    // Build path labels using obfuscated option text
    const pathLabels = {};
    for (let i = 0; i < 3; i++) {
        const optionIdx = data.pathMapping[i];
        pathLabels[i] = data.options[optionIdx]?.obfuscated || data.options[optionIdx]?.text || `Path ${i + 1}`;
    }

    return {
        nodeId,
        questionText: data.questionText,
        pathLabels,
        difficulty: data.difficulty
    };
}

/**
 * Validate which path the player chose (server-side only)
 */
export function validateAnswer(sessionId, nodeId, chosenPath) {
    const mapping = playerMappings.get(sessionId);
    if (!mapping || !mapping[nodeId]) {
        return { correct: false, error: 'Invalid session or node' };
    }

    const data = mapping[nodeId];
    const isCorrect = chosenPath === data.correctPath;

    return {
        correct: isCorrect,
        correctPath: undefined // Never expose to client
    };
}

export function clearPlayerMapping(sessionId) {
    playerMappings.delete(sessionId);
}

export function clearAllMappings() {
    playerMappings.clear();
}
