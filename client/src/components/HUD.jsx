import { useState, useEffect } from 'react';

export default function HUD({ player }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!player?.startTime) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - new Date(player.startTime).getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [player?.startTime]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    if (!player) return null;

    return (
        <div className="hud">
            <div className="hud-item">
                <span className="label">TIME</span>
                <span className="value">{formatTime(elapsed)}</span>
            </div>
            <div className="hud-item">
                <span className="value">{player.depth || 0}/15</span>
            </div>
        </div>
    );
}
