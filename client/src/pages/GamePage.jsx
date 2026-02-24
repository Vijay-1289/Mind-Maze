import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import MazeScene from '../game/MazeScene';
import HUD from '../components/HUD';
import QuestionOverlay from '../components/QuestionOverlay';
import DeadEndOverlay from '../components/DeadEndOverlay';
import VictoryOverlay from '../components/VictoryOverlay';
import Leaderboard from '../components/Leaderboard';
import { submitAnswer, reportTabSwitch, getGameState } from '../api';
import { getSocket } from '../socket';

export default function GamePage() {
    const navigate = useNavigate();
    const sessionId = sessionStorage.getItem('sessionId');
    const [maze, setMaze] = useState(null);
    const [player, setPlayer] = useState(null);
    const [question, setQuestion] = useState(null);
    const [showDeadEnd, setShowDeadEnd] = useState(false);
    const [finished, setFinished] = useState(false);
    const [locked, setLocked] = useState(false);
    const [paused, setPaused] = useState(false);
    const [kicked, setKicked] = useState(false);
    const questionTimeRef = useRef(Date.now());
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        if (!sessionId) { navigate('/'); return; }
        const mazeStr = sessionStorage.getItem('mazeData');
        const playerStr = sessionStorage.getItem('playerState');
        const questionStr = sessionStorage.getItem('currentQuestion');
        if (mazeStr) setMaze(JSON.parse(mazeStr));
        if (playerStr) setPlayer(JSON.parse(playerStr));
        if (questionStr) setQuestion(JSON.parse(questionStr));
    }, [sessionId, navigate]);

    // Socket events
    useEffect(() => {
        const socket = getSocket();
        socket.on('game:paused', (d) => setPaused(d.paused));
        socket.on('player:kicked', (d) => {
            if (d.sessionId === sessionId) setKicked(true);
        });
        socket.on('game:reset', () => { sessionStorage.clear(); navigate('/'); });
        socket.on('game:winner', (d) => setWinner(d));
        return () => {
            socket.off('game:paused');
            socket.off('player:kicked');
            socket.off('game:reset');
            socket.off('game:winner');
        };
    }, [sessionId, navigate]);

    // Tab switch detection
    useEffect(() => {
        const handler = () => {
            if (document.hidden && sessionId) reportTabSwitch(sessionId);
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [sessionId]);

    const handleReachQuestion = useCallback((nodeId) => {
        if (locked) return;
        // Fetch question from cached state or reload
        getGameState(sessionId).then(data => {
            if (data.currentQuestion) {
                setQuestion(data.currentQuestion);
                questionTimeRef.current = Date.now();
            }
            if (data.player) setPlayer(data.player);
        });
    }, [sessionId, locked]);

    const handleChoosePath = useCallback(async (chosenPath) => {
        if (!question || locked) return;
        setLocked(true);
        const timeTaken = Date.now() - questionTimeRef.current;
        try {
            const result = await submitAnswer(sessionId, question.nodeId, chosenPath, timeTaken);
            if (result.correct) {
                setQuestion(null);
                setPlayer(prev => ({
                    ...prev,
                    depth: result.depth,
                    mistakes: result.mistakes,
                    score: result.score
                }));
                if (result.finished) {
                    setFinished(true);
                }
            } else {
                setShowDeadEnd(true);
                setPlayer(prev => ({ ...prev, mistakes: result.mistakes }));
                setTimeout(() => {
                    setShowDeadEnd(false);
                    setLocked(false);
                }, 3000);
                return; // Don't unlock yet
            }
        } catch (err) {
            console.error('Answer submit failed:', err);
        }
        setLocked(false);
    }, [question, sessionId, locked]);

    if (kicked) return (
        <div className="landing-page">
            <h1 className="landing-title" style={{ fontSize: '2rem' }}>KICKED</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>You have been removed by the admin.</p>
        </div>
    );

    if (!maze) return (
        <div className="landing-page">
            <p style={{ color: 'var(--text-secondary)' }}>Loading maze...</p>
        </div>
    );

    return (
        <div className="game-container">
            <Canvas
                shadows
                camera={{ fov: 75, near: 0.1, far: 200, position: [0, 2, 2] }}
                gl={{ antialias: true, alpha: false }}
                onCreated={({ gl }) => { gl.setClearColor('#0a0a0f'); }}
            >
                <MazeScene
                    maze={maze}
                    question={question}
                    onReachQuestion={handleReachQuestion}
                    onChoosePath={handleChoosePath}
                    paused={paused || !!question || showDeadEnd || finished}
                    playerState={player}
                />
            </Canvas>

            <div className="crosshair" />

            <HUD player={player} />

            {question && !showDeadEnd && (
                <QuestionOverlay
                    question={question}
                    onChoosePath={handleChoosePath}
                    locked={locked}
                />
            )}

            {showDeadEnd && <DeadEndOverlay />}
            {finished && <VictoryOverlay player={player} />}
            {winner && !finished && (
                <div className="victory-overlay">
                    <h1 className="victory-title">🏆 WINNER DECLARED 🏆</h1>
                    <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{winner.name}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Score: {winner.score}</p>
                </div>
            )}
            {paused && (
                <div className="question-overlay">
                    <h2 style={{ fontFamily: 'Orbitron', color: 'var(--warning)' }}>⏸ GAME PAUSED</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>The admin has paused the game.</p>
                </div>
            )}

            <Leaderboard sessionId={sessionId} />
        </div>
    );
}
