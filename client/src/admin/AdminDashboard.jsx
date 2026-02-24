import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminGetPlayers, adminGetStats, adminAction } from '../api';
import { connectSocket } from '../socket';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const token = sessionStorage.getItem('adminToken');
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState({});
    const [tab, setTab] = useState('monitor');

    const refresh = useCallback(async () => {
        if (!token) return;
        try {
            setPlayers(await adminGetPlayers(token));
            setStats(await adminGetStats(token));
        } catch { navigate('/admin'); }
    }, [token, navigate]);

    useEffect(() => {
        if (!token) { navigate('/admin'); return; }
        refresh();
        const interval = setInterval(refresh, 3000);
        const socket = connectSocket();
        socket.emit('admin:join');
        socket.on('player:updated', refresh);
        socket.on('player:joined', refresh);
        return () => { clearInterval(interval); socket.off('player:updated'); socket.off('player:joined'); };
    }, [token, navigate, refresh]);

    const kick = async (sessionId) => {
        if (window.confirm('Kick this player?')) {
            await adminAction(token, 'kick', { sessionId });
            refresh();
        }
    };

    const pauseGame = async (paused) => {
        await adminAction(token, 'pause', { paused });
    };

    const resetAll = async () => {
        if (window.confirm('Reset ALL players? This cannot be undone!')) {
            await adminAction(token, 'reset');
            refresh();
        }
    };

    const declareWinner = async (sessionId) => {
        if (window.confirm('Declare this player as winner?')) {
            await adminAction(token, 'declare-winner', { sessionId });
        }
    };

    const declareTopWinner = async () => {
        if (window.confirm('Declare the top-scoring player as winner?')) {
            await adminAction(token, 'declare-winner', {});
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="admin-title">🧠 MINDTRAP ADMIN</h1>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn-sm btn-warning" onClick={() => setTab(tab === 'monitor' ? 'questions' : 'monitor')}>
                        {tab === 'monitor' ? '📝 Questions' : '📊 Monitor'}
                    </button>
                    <button className="btn-sm btn-danger" onClick={() => { sessionStorage.removeItem('adminToken'); navigate('/admin'); }}>
                        Logout
                    </button>
                </div>
            </div>

            <div className="admin-stats">
                <div className="stat-card"><div className="val">{stats.total || 0}</div><div className="lbl">TOTAL</div></div>
                <div className="stat-card"><div className="val">{stats.active || 0}</div><div className="lbl">ACTIVE</div></div>
                <div className="stat-card"><div className="val">{stats.finished || 0}</div><div className="lbl">FINISHED</div></div>
                <div className="stat-card">
                    <div className="val" style={{ color: stats.suspicious > 0 ? 'var(--danger)' : undefined }}>
                        {stats.suspicious || 0}
                    </div>
                    <div className="lbl">SUSPICIOUS</div>
                </div>
                <div className="stat-card"><div className="val">{stats.questionCount || 0}</div><div className="lbl">QUESTIONS</div></div>
            </div>

            <div className="admin-controls">
                <button className="btn-sm btn-warning" onClick={() => pauseGame(true)}>⏸ Pause All</button>
                <button className="btn-sm btn-success" onClick={() => pauseGame(false)}>▶ Resume All</button>
                <button className="btn-sm btn-danger" onClick={resetAll}>🗑 Reset All</button>
                <button className="btn-sm btn-success" onClick={declareTopWinner}>🏆 Declare Top Winner</button>
            </div>

            {tab === 'monitor' && (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th><th>Roll</th><th>Depth</th><th>Mistakes</th>
                            <th>Score</th><th>Time</th><th>Status</th><th>Suspicious</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p, i) => (
                            <tr key={i}>
                                <td>{p.name}</td>
                                <td>{p.rollNumber}</td>
                                <td>{p.depth}/10</td>
                                <td>{p.mistakes}</td>
                                <td style={{ fontFamily: 'Orbitron', color: 'var(--accent)' }}>{p.score}</td>
                                <td>{formatTime(p.timeElapsed)}</td>
                                <td>
                                    <span style={{
                                        color: p.status === 'active' ? 'var(--success)' :
                                            p.status === 'finished' ? 'var(--gold)' :
                                                p.status === 'kicked' ? 'var(--danger)' : 'var(--warning)'
                                    }}>
                                        {p.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    {p.suspicious && <span className="suspicious-flag" title={p.suspiciousReasons?.join(', ')}>⚠️ YES</span>}
                                </td>
                                <td style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn-sm btn-danger" onClick={() => kick(p.sessionId)}>Kick</button>
                                    <button className="btn-sm btn-success" onClick={() => declareWinner(p.sessionId)}>🏆</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {tab === 'questions' && (
                <div style={{ color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
                    <p>Question management available via API endpoints.</p>
                    <p style={{ marginTop: 8 }}>POST /api/admin/questions — Add question</p>
                    <p>POST /api/admin/questions/upload — CSV bulk upload</p>
                    <p>PUT /api/admin/questions/:id — Edit</p>
                    <p>DELETE /api/admin/questions/:id — Delete</p>
                </div>
            )}
        </div>
    );
}
