import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import playerRoutes from './routes/playerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import setupSocket from './socket/socketHandler.js';
import { seedQuestions } from './seed.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // Allow localhost or deployed frontend (or no origin for server-to-server)
            if (!origin || origin.includes('localhost') || origin.includes('netlify.app') || process.env.CORS_ORIGIN === '*') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

// Store io instance for routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow localhost or deployed frontend (or no origin for mobile/tools)
        if (!origin || origin.includes('localhost') || origin.includes('netlify.app') || process.env.CORS_ORIGIN === '*') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json());
app.use(generalLimiter);

// Routes
app.use('/api/player', playerRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket.io
setupSocket(io);

// Connect MongoDB and start server
const PORT = process.env.PORT || 3001;

async function start() {
    try {
        // Use in-memory MongoDB (no external MongoDB needed)
        console.log('⏳ Starting in-memory MongoDB...');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        console.log('✅ In-memory MongoDB started');

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB (in-memory)');

        // Auto-seed questions on startup
        await seedQuestions();

        httpServer.listen(PORT, () => {
            console.log(`🚀 MindTrap server running on port ${PORT}`);
            console.log(`🎮 Frontend: http://localhost:5173`);
            console.log(`🔐 Admin: http://localhost:5173/admin`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

start();
