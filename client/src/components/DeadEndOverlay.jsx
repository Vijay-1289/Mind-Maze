import { motion } from 'framer-motion';

export default function DeadEndOverlay() {
    return (
        <motion.div className="deadend-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.p className="deadend-text"
                initial={{ scale: 0.5 }} animate={{ scale: [0.5, 1.2, 1] }}
                transition={{ duration: 0.5 }}>
                ✖ WRONG PATH
            </motion.p>
            <p className="deadend-sub">Returning to question in 3 seconds...</p>
        </motion.div>
    );
}
