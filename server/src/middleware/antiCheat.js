import Player from '../models/Player.js';

const SUSPICIOUS_ANSWER_TIME_MS = 1500; // answering in less than 1.5s is suspicious
const MAX_TAB_SWITCHES = 10;

export async function checkSuspiciousActivity(req, res, next) {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return next();

        const player = await Player.findOne({ sessionId });
        if (!player) return next();

        // Check tab switch count
        if (player.tabSwitchCount > MAX_TAB_SWITCHES) {
            player.suspicious = true;
            if (!player.suspiciousReasons.includes('Excessive tab switching')) {
                player.suspiciousReasons.push('Excessive tab switching');
            }
            await player.save();
        }

        req.player = player;
        next();
    } catch (err) {
        next(err);
    }
}

export function checkAnswerTiming(player, timeTaken) {
    if (timeTaken < SUSPICIOUS_ANSWER_TIME_MS) {
        player.suspicious = true;
        if (!player.suspiciousReasons.includes('Suspiciously fast answer')) {
            player.suspiciousReasons.push('Suspiciously fast answer');
        }
        return true;
    }
    return false;
}
