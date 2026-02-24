import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api';
import { getSocket } from '../socket';

export default function Leaderboard() {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState([]);

    const fetchLB = async () => {
        try { setData(await getLeaderboard()); } catch { }
    };

    useEffect(() => {
        fetchLB();
        const interval = setInterval(fetchLB, 5000);
        const socket = getSocket();
        socket.on('leaderboard:update', fetchLB);
        return () => { clearInterval(interval); socket.off('leaderboard:update', fetchLB); };
    }, []);

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <>
            <button className="lb-toggle" onClick={() => setOpen(!open)} title="Leaderboard">
                🏆
            </button>
            <div className={`leaderboard-panel ${open ? 'open' : ''}`}>
                <div className="lb-title">LEADERBOARD</div>
                {data.map((p, i) => (
                    <div key={i} className="lb-entry">
                        <div className={`lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                            {p.rank}
                        </div>
                        <div className="lb-info">
                            <div className="lb-name">{p.name}</div>
                            <div className="lb-stats">
                                Depth {p.depth} • {p.mistakes} mistakes • {formatTime(p.timeElapsed)}
                            </div>
                        </div>
                        <div className="lb-score">{p.score}</div>
                    </div>
                ))}
                {data.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginTop: 20 }}>
                        No players yet
                    </p>
                )}
            </div>
        </>
    );
}
