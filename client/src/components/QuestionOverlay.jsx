import { motion } from 'framer-motion';

export default function QuestionOverlay({ question, onChoosePath, locked }) {
    if (!question) return null;

    return (
        <motion.div className="question-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}>
            <motion.div className="question-box"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'Orbitron', marginBottom: '1rem', letterSpacing: '3px' }}>
                    DIFFICULTY {question.difficulty || 1}/5
                </div>
                <p className="question-text">{question.questionText}</p>
                <div className="path-options">
                    {Object.entries(question.pathLabels || {}).map(([pathIdx, label]) => (
                        <motion.div
                            key={pathIdx}
                            className="path-option"
                            whileHover={!locked ? { scale: 1.05, borderColor: '#e94560' } : {}}
                            onClick={() => !locked && onChoosePath(parseInt(pathIdx))}
                            style={{ cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1 }}>
                            <span className="path-num">{parseInt(pathIdx) + 1}</span>
                            <span>{label}</span>
                        </motion.div>
                    ))}
                </div>
                <p className="question-hint">
                    👆 Click a path or walk into it to answer
                </p>
            </motion.div>
        </motion.div>
    );
}
