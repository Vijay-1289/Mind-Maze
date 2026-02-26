import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Player from '../models/Player.js';
import Question from '../models/Question.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { clearPlayerMapping, clearAllMappings } from '../services/questionEngine.js';
import multer from 'multer';
import csvParser from 'csv-parser';
import fs from 'fs';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Admin login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all players (admin)
router.get('/players', adminAuth, async (req, res) => {
    try {
        const players = await Player.find().sort({ score: -1, depth: -1 });
        res.json(players.map(p => ({
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
            tabSwitchCount: p.tabSwitchCount,
            completedAt: p.completedAt,
            timeElapsed: Math.floor(((p.completedAt || Date.now()) - p.startTime) / 1000)
        })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to get players' });
    }
});

// Kick player
router.post('/kick', adminAuth, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const player = await Player.findOne({ sessionId });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        player.status = 'kicked';
        await player.save();
        clearPlayerMapping(sessionId);

        const io = req.app.get('io');
        if (io) {
            io.emit('player:kicked', { sessionId });
            io.emit('leaderboard:update');
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to kick player' });
    }
});

// Pause/unpause game
router.post('/pause', adminAuth, async (req, res) => {
    try {
        const { paused } = req.body;
        const status = paused ? 'paused' : 'active';
        await Player.updateMany(
            { status: { $in: ['active', 'paused'] } },
            { status }
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('game:paused', { paused });
        }

        res.json({ success: true, paused });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle pause' });
    }
});

// Reset all players
router.post('/reset', adminAuth, async (req, res) => {
    try {
        await Player.deleteMany({});
        clearAllMappings();

        const io = req.app.get('io');
        if (io) {
            io.emit('game:reset');
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset' });
    }
});

// Declare winner
router.post('/declare-winner', adminAuth, async (req, res) => {
    try {
        const { sessionId } = req.body;
        let winner;
        if (sessionId) {
            winner = await Player.findOne({ sessionId });
        } else {
            winner = await Player.findOne({ status: { $in: ['active', 'finished'] } }).sort({ score: -1, depth: -1 });
        }
        if (!winner) return res.status(404).json({ error: 'No player found' });

        const io = req.app.get('io');
        if (io) {
            io.emit('game:winner', {
                name: winner.name,
                rollNumber: winner.rollNumber,
                score: winner.score,
                depth: winner.depth,
                mistakes: winner.mistakes,
                timeElapsed: Math.floor(((winner.completedAt || Date.now()) - winner.startTime) / 1000)
            });
        }

        res.json({ success: true, winner: winner.name });
    } catch (err) {
        res.status(500).json({ error: 'Failed to declare winner' });
    }
});

// ===== Question Management =====

// Get all questions
router.get('/questions', adminAuth, async (req, res) => {
    try {
        const questions = await Question.find().sort({ difficulty: 1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get questions' });
    }
});

// Add question
router.post('/questions', adminAuth, async (req, res) => {
    try {
        const question = new Question(req.body);
        await question.save();
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// Update question
router.put('/questions/:id', adminAuth, async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// Delete question
router.delete('/questions/:id', adminAuth, async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// Bulk upload CSV
router.post('/questions/upload', adminAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const questions = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csvParser())
                .on('data', (row) => {
                    try {
                        questions.push({
                            text: row.text || row.question,
                            options: [
                                row.option1 || row.a,
                                row.option2 || row.b,
                                row.option3 || row.c,
                                row.option4 || row.d || row.oc
                            ],
                            correctIndex: parseInt(row.correct || row.correctIndex || '0'),
                            difficulty: parseInt(row.difficulty || '1'),
                            category: row.category || 'brain-teaser'
                        });
                    } catch (e) { /* skip bad rows */ }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (questions.length > 0) {
            await Question.insertMany(questions);
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ success: true, count: questions.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to upload questions' });
    }
});

// Game stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const total = await Player.countDocuments();
        const active = await Player.countDocuments({ status: 'active' });
        const finished = await Player.countDocuments({ status: 'finished' });
        const suspicious = await Player.countDocuments({ suspicious: true });
        const questionCount = await Question.countDocuments({ active: true });

        res.json({ total, active, finished, suspicious, questionCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
