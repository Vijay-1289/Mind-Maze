import { motion } from 'framer-motion';

export default function VictoryOverlay({ player }) {
    const timeElapsed = player?.startTime
        ? Math.floor((Date.now() - new Date(player.startTime).getTime()) / 1000)
        : 0;
    const mins = Math.floor(timeElapsed / 60);
    const secs = timeElapsed % 60;

    const handleExit = () => {
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('playerState');
        sessionStorage.removeItem('mazeData');
        window.location.href = '/';
    };

    return (
        <motion.div className="victory-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.h1 className="victory-title"
                initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.8, type: 'spring' }}>
                🏆 MAZE CONQUERED 🏆
            </motion.h1>
            <motion.p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                Congratulations, {player?.name || 'Player'}!
            </motion.p>
            <motion.div className="victory-stats"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}>
                <div className="victory-stat">
                    <div className="val">{player?.score || 0}</div>
                    <div className="lbl">FINAL SCORE</div>
                </div>
                <div className="victory-stat">
                    <div className="val">{mins}:{secs.toString().padStart(2, '0')}</div>
                    <div className="lbl">TIME</div>
                </div>
                <div className="victory-stat">
                    <div className="val">{player?.mistakes || 0}</div>
                    <div className="lbl">MISTAKES</div>
                </div>
            </motion.div>

            <motion.button
                className="btn btn-primary"
                style={{ marginTop: '2rem', fontSize: '1.2rem', padding: '10px 30px' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                onClick={handleExit}>
                EXIT MAZE
            </motion.button>
        </motion.div>
    );
}
