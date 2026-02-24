import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { joinGame } from '../api';
import { connectSocket } from '../socket';

export default function LandingPage() {
    const [name, setName] = useState('');
    const [roll, setRoll] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!name.trim() || !roll.trim()) { setError('Both fields are required'); return; }
        setLoading(true); setError('');
        try {
            const data = await joinGame(name.trim(), roll.trim());
            if (data.error) { setError(data.error); setLoading(false); return; }
            sessionStorage.setItem('sessionId', data.sessionId);
            sessionStorage.setItem('playerName', name.trim());
            sessionStorage.setItem('mazeData', JSON.stringify(data.maze));
            if (data.currentQuestion) {
                sessionStorage.setItem('currentQuestion', JSON.stringify(data.currentQuestion));
            }
            sessionStorage.setItem('playerState', JSON.stringify(data.player));
            const socket = connectSocket();
            socket.emit('player:join', { sessionId: data.sessionId, name: name.trim() });
            navigate('/play');
        } catch (err) {
            setError('Server unreachable. Is the backend running?');
            setLoading(false);
        }
    };

    return (
        <div className="landing-page">
            <motion.h1 className="landing-title"
                initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}>
                MINDTRAP
            </motion.h1>
            <motion.p className="landing-subtitle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}>
                Navigate • Solve • Survive
            </motion.p>
            <motion.form className="join-form" onSubmit={handleJoin}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}>
                <input placeholder="Your Name" value={name}
                    onChange={e => setName(e.target.value)} autoFocus />
                <input placeholder="Roll Number" value={roll}
                    onChange={e => setRoll(e.target.value)} />
                {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
                <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Entering...' : 'Enter the Maze'}
                </button>
            </motion.form>
            <motion.p style={{ position: 'absolute', bottom: 20, color: 'var(--text-secondary)', fontSize: '0.75rem', zIndex: 1 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                <a href="/admin" style={{ color: 'var(--text-secondary)' }}>Admin</a>
            </motion.p>
        </div>
    );
}
