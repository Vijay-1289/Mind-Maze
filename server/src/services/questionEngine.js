import Question from '../models/Question.js';
import { getQuestionNodes, getStructuralCorrectPath, getDifficultyForDepth } from '../maze/mazeGraph.js';

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

// Per-player question assignment cache (in-memory, resets on server restart)
const playerMappings = new Map();

/**
 * Assign unique question mapping for a player session
 * Returns an object mapping questionNodeId -> { questionId, answerPathMapping }
 */
export async function assignQuestionsToPlayer(sessionId, seed) {
    if (playerMappings.has(sessionId)) {
        return playerMappings.get(sessionId);
    }

    const rng = seededRandom(seed);
    const questionNodes = getQuestionNodes();
    const mapping = {};

    for (let i = 0; i < questionNodes.length; i++) {
        const nodeId = questionNodes[i];
        const depth = Math.floor(i / 2) + 1;
        const difficulty = getDifficultyForDepth(depth);

        // Get questions of appropriate difficulty
        const questions = await Question.find({ difficulty: { $lte: difficulty + 1, $gte: Math.max(1, difficulty - 1) }, active: true });

        if (questions.length === 0) {
            throw new Error(`No questions available for difficulty ${difficulty}`);
        }

        // Use seeded random to pick a question (unique per player due to different seed)
        const shuffled = seededShuffle(questions, rng);

        // Avoid repeats within the same player session
        const usedQuestionIds = Object.values(mapping).map(m => m.questionId.toString());
        const question = shuffled.find(q => !usedQuestionIds.includes(q._id.toString())) || shuffled[0];

        // The structural correct path for this node
        const structuralCorrect = getStructuralCorrectPath(nodeId);

        // Create a randomized answer-to-path mapping
        // pathMapping[physicalPathIndex] = optionIndex
        const pathIndices = [0, 1, 2];
        const shuffledPaths = seededShuffle(pathIndices, rng);

        // Find which shuffled position maps to the correct answer
        // We need: walking into structuralCorrect path => correct answer
        // So: pathMapping[structuralCorrect] should = question.correctIndex
        const pathMapping = new Array(3);
        const optionOrder = seededShuffle([0, 1, 2], rng);

        // Ensure correct option maps to the structural correct path
        pathMapping[structuralCorrect] = question.correctIndex;

        // Fill remaining paths with wrong options
        const wrongOptions = [0, 1, 2].filter(o => o !== question.correctIndex);
        const wrongPaths = [0, 1, 2].filter(p => p !== structuralCorrect);
        const shuffledWrong = seededShuffle(wrongOptions, rng);

        wrongPaths.forEach((pathIdx, i) => {
            pathMapping[pathIdx] = shuffledWrong[i];
        });

        mapping[nodeId] = {
            questionId: question._id,
            questionText: question.text,
            options: question.options,
            pathMapping, // pathMapping[pathIndex] = optionIndex displayed on that path
            correctPath: structuralCorrect, // DO NOT send to client
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
        pathLabels[i] = data.options[optionIdx].obfuscated;
    }

    return {
        nodeId,
        questionText: data.questionText,
        pathLabels, // { 0: "Abstract Label A", 1: "Abstract Label B", 2: "Abstract Label C" }
        difficulty: data.difficulty
    };
}

/**
 * Validate which path the player chose (server-side only)
 * Returns { correct: boolean, correctPath: number }
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
        correctPath: undefined // Never expose correct path to client
    };
}

/**
 * Clear player mapping (on kick/reset)
 */
export function clearPlayerMapping(sessionId) {
    playerMappings.delete(sessionId);
}

export function clearAllMappings() {
    playerMappings.clear();
}
