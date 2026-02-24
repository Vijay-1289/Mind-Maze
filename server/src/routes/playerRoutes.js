import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Player from '../models/Player.js';
import { assignQuestionsToPlayer, getQuestionForNode, validateAnswer } from '../services/questionEngine.js';
import { checkSuspiciousActivity, checkAnswerTiming } from '../middleware/antiCheat.js';
import { answerLimiter } from '../middleware/rateLimiter.js';
import mazeData, { getQuestionNodes } from '../maze/mazeGraph.js';

const router = Router();

// Join game
router.post('/join', async (req, res) => {
    try {
        const { name, rollNumber } = req.body;
        if (!name || !rollNumber) {
            return res.status(400).json({ error: 'Name and roll number required' });
        }

        // Check for existing session
        let player = await Player.findOne({ rollNumber, status: { $in: ['active', 'paused'] } });
        if (player) {
            // Resume existing session
            const questionData = getQuestionForNode(player.sessionId, player.currentNode);
            return res.json({
                sessionId: player.sessionId,
                player: sanitizePlayer(player),
                currentQuestion: questionData,
                maze: getClientMaze(),
                resumed: true
            });
        }

        const sessionId = uuidv4();
        const seed = Math.floor(Math.random() * 2147483647);

        player = new Player({
            name: name.trim(),
            rollNumber: rollNumber.trim(),
            sessionId,
            questionSeed: seed
        });
        await player.save();

        // Assign questions server-side
        await assignQuestionsToPlayer(sessionId, seed);

        // Emit to admin
        const io = req.app.get('io');
        if (io) {
            io.to('admin').emit('player:joined', sanitizePlayerForAdmin(player));
        }

        res.json({
            sessionId,
            player: sanitizePlayer(player),
            maze: getClientMaze(),
            resumed: false
        });
    } catch (err) {
        console.error('Join error:', err);
        res.status(500).json({ error: 'Failed to join game' });
    }
});

// Get current game state
router.get('/state/:sessionId', async (req, res) => {
    try {
        const player = await Player.findOne({ sessionId: req.params.sessionId });
        if (!player) return res.status(404).json({ error: 'Session not found' });

        const questionNodes = getQuestionNodes();
        const currentQuestion = questionNodes.includes(player.currentNode)
            ? getQuestionForNode(player.sessionId, player.currentNode)
            : null;

        res.json({
            player: sanitizePlayer(player),
            currentQuestion,
            maze: getClientMaze()
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get state' });
    }
});

// Submit answer (player walks into a path)
router.post('/answer', answerLimiter, checkSuspiciousActivity, async (req, res) => {
    try {
        const { sessionId, nodeId, chosenPath, timeTaken } = req.body;
        if (!sessionId || !nodeId || chosenPath === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const player = await Player.findOne({ sessionId });
        if (!player) return res.status(404).json({ error: 'Session not found' });
        if (player.status !== 'active') return res.status(403).json({ error: 'Game is not active' });

        // Check if already answered this node correctly
        const alreadyAnswered = player.answeredNodes.find(a => a.nodeId === nodeId && a.correct);
        if (alreadyAnswered) {
            return res.json({ correct: true, alreadyAnswered: true });
        }

        // Anti-cheat: check timing
        checkAnswerTiming(player, timeTaken || 0);

        // Validate answer server-side
        const result = validateAnswer(sessionId, nodeId, chosenPath);

        if (result.correct) {
            // Update depth
            const node = mazeData.nodes[nodeId];
            player.depth = Math.max(player.depth, (node?.depth || 0) + 1);
            player.questionsAnswered += 1;

            // Find next node on correct path
            const nextEdge = mazeData.edges.find(e => e.from === nodeId && e.pathIndex === chosenPath);
            if (nextEdge) {
                player.currentNode = nextEdge.to;

                // Check for child corridor leading to next question or victory
                const childEdge = mazeData.edges.find(e => e.from === nextEdge.to);
                if (childEdge) {
                    const childNode = mazeData.nodes[childEdge.to];
                    if (childNode?.type === 'victory') {
                        player.status = 'finished';
                        player.completedAt = new Date();
                        player.calculateScore();
                    }
                }
            }

            player.answeredNodes.push({
                nodeId, correct: true, answeredAt: new Date(), timeTaken: timeTaken || 0
            });
        } else {
            player.mistakes += 1;
            player.answeredNodes.push({
                nodeId, correct: false, answeredAt: new Date(), timeTaken: timeTaken || 0
            });
        }

        player.lastActiveTime = new Date();
        player.calculateScore();
        await player.save();

        // Emit updates
        const io = req.app.get('io');
        if (io) {
            io.emit('leaderboard:update', await getLeaderboard());
            io.to('admin').emit('player:updated', sanitizePlayerForAdmin(player));
        }

        // Get next question if needed
        let nextQuestion = null;
        if (result.correct) {
            const questionNodes = getQuestionNodes();
            // Look ahead for next question node
            const nextQuestionNode = questionNodes.find(qn => {
                const answered = player.answeredNodes.find(a => a.nodeId === qn && a.correct);
                return !answered;
            });
            if (nextQuestionNode) {
                nextQuestion = getQuestionForNode(sessionId, nextQuestionNode);
            }
        }

        res.json({
            correct: result.correct,
            depth: player.depth,
            mistakes: player.mistakes,
            score: player.score,
            finished: player.status === 'finished',
            nextQuestion
        });
    } catch (err) {
        console.error('Answer error:', err);
        res.status(500).json({ error: 'Failed to process answer' });
    }
});

// Report tab switch
router.post('/tabswitch', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const player = await Player.findOne({ sessionId });
        if (player) {
            player.tabSwitchCount += 1;
            if (player.tabSwitchCount > 10) {
                player.suspicious = true;
                if (!player.suspiciousReasons.includes('Excessive tab switching')) {
                    player.suspiciousReasons.push('Excessive tab switching');
                }
            }
            await player.save();
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to report' });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        res.json(await getLeaderboard());
    } catch (err) {
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Helper: get leaderboard data
async function getLeaderboard() {
    const players = await Player.find({ status: { $in: ['active', 'finished'] } })
        .sort({ score: -1, depth: -1, mistakes: 1 })
        .limit(50)
        .select('name rollNumber depth mistakes score status questionsAnswered startTime completedAt');

    return players.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        rollNumber: p.rollNumber,
        depth: p.depth,
        mistakes: p.mistakes,
        score: p.score,
        status: p.status,
        questionsAnswered: p.questionsAnswered,
        timeElapsed: Math.floor(((p.completedAt || Date.now()) - p.startTime) / 1000)
    }));
}

// Helper: sanitize player for client
function sanitizePlayer(p) {
    return {
        name: p.name,
        rollNumber: p.rollNumber,
        currentNode: p.currentNode,
        depth: p.depth,
        mistakes: p.mistakes,
        score: p.score,
        status: p.status,
        questionsAnswered: p.questionsAnswered,
        startTime: p.startTime
    };
}

// Helper: sanitize player for admin
function sanitizePlayerForAdmin(p) {
    return {
        name: p.name,
        rollNumber: p.rollNumber,
        sessionId: p.sessionId,
        currentNode: p.currentNode,
        depth: p.depth,
        mistakes: p.mistakes,
        score: p.score,
        status: p.status,
        questionsAnswered: p.questionsAnswered,
        startTime: p.startTime,
        lastActiveTime: p.lastActiveTime,
        suspicious: p.suspicious,
        suspiciousReasons: p.suspiciousReasons,
        tabSwitchCount: p.tabSwitchCount
    };
}

// Helper: get client-safe maze data
function getClientMaze() {
    // Send only structural data, no answer info
    const clientNodes = {};
    for (const [id, node] of Object.entries(mazeData.nodes)) {
        clientNodes[id] = {
            id: node.id,
            x: node.x,
            z: node.z,
            depth: node.depth,
            isQuestion: node.isQuestion,
            type: node.type,
            pathCount: node.pathCount
        };
    }
    const clientEdges = mazeData.edges.map(e => ({
        from: e.from,
        to: e.to,
        pathIndex: e.pathIndex
    }));
    return {
        nodes: clientNodes,
        edges: clientEdges,
        WALL_HEIGHT: mazeData.WALL_HEIGHT,
        CORRIDOR_WIDTH: mazeData.CORRIDOR_WIDTH,
        SEGMENT_LENGTH: mazeData.SEGMENT_LENGTH
    };
}

export default router;
