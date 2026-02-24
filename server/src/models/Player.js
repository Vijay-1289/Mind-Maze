import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    sessionId: { type: String, required: true, unique: true },
    currentNode: { type: String, default: 'start' },
    depth: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    lastActiveTime: { type: Date, default: Date.now },
    score: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'finished', 'kicked'], default: 'active' },
    questionsAnswered: { type: Number, default: 0 },
    questionSeed: { type: Number, required: true },
    answeredNodes: [{ nodeId: String, correct: Boolean, answeredAt: Date, timeTaken: Number }],
    suspicious: { type: Boolean, default: false },
    suspiciousReasons: [String],
    completedAt: { type: Date },
    tabSwitchCount: { type: Number, default: 0 }
}, { timestamps: true });

playerSchema.index({ score: -1 });
playerSchema.index({ status: 1 });

playerSchema.methods.calculateScore = function () {
    const timeElapsed = ((this.completedAt || Date.now()) - this.startTime) / 1000;
    const timePenalty = Math.floor(timeElapsed / 60) * 2;
    this.score = Math.max(0, (this.depth * 10) - (this.mistakes * 5) - timePenalty);
    return this.score;
};

export default mongoose.model('Player', playerSchema);
