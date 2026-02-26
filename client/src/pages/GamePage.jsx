import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import MazeScene from '../game/MazeScene';
import HUD from '../components/HUD';
import DeadEndOverlay from '../components/DeadEndOverlay';
import VictoryOverlay from '../components/VictoryOverlay';
import { submitAnswer, reportTabSwitch, getGameState, getAllQuestions } from '../api';
import { getSocket } from '../socket';

export default function GamePage() {
    const navigate = useNavigate();
    const sessionId = sessionStorage.getItem('sessionId');
    const [maze, setMaze] = useState(null);
    const [player, setPlayer] = useState(null);
    const [questions, setQuestions] = useState({}); // nodeId -> questionData
    const [showDeadEnd, setShowDeadEnd] = useState(false);
    const [finished, setFinished] = useState(false);
    const [paused, setPaused] = useState(false);
    const [kicked, setKicked] = useState(false);
    const [winner, setWinner] = useState(null);
    const answeredRef = useRef(new Set());
    const loadingRef = useRef(new Set());
    const questionTimeRef = useRef(Date.now());

    // Load initial state
    useEffect(() => {
        if (!sessionId) { navigate('/'); return; }
        const mazeStr = sessionStorage.getItem('mazeData');
        const playerStr = sessionStorage.getItem('playerState');
        if (mazeStr) setMaze(JSON.parse(mazeStr));
        if (playerStr) setPlayer(JSON.parse(playerStr));

        // Fetch all question data in one call for 3D display
        getAllQuestions(sessionId).then(data => {
            if (data.error) {
                console.warn('Session no longer exists in DB');
                sessionStorage.clear();
                navigate('/');
                return;
            }
            if (data.questions) setQuestions(data.questions);
        }).catch(err => {
            console.error('Failed to load questions:', err);
            sessionStorage.clear();
            navigate('/');
        });
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

    // Player physically walked into a path entrance — submit silently
    const handleEnterPath = useCallback(async (questionNodeId, pathIndex) => {
        if (!sessionId || finished) return;

        const key = `${questionNodeId}_${pathIndex}`;
        if (answeredRef.current.has(questionNodeId) || loadingRef.current.has(key)) return;
        loadingRef.current.add(key);

        const timeTaken = Date.now() - questionTimeRef.current;
        questionTimeRef.current = Date.now();

        try {
            const result = await submitAnswer(sessionId, questionNodeId, pathIndex, timeTaken);

            if (result.correct) {
                answeredRef.current.add(questionNodeId);
                setPlayer(prev => ({
                    ...prev,
                    depth: result.depth,
                    mistakes: result.mistakes,
                    score: result.score,
                    status: result.finished ? 'finished' : prev?.status
                }));
            } else {
                // Wrong path — DON'T show overlay yet!
                // Just silently update mistakes/score. Overlay shows when they reach the dead end.
                setPlayer(prev => ({ ...prev, mistakes: result.mistakes, score: result.score }));
            }
        } catch (err) {
            console.error('Answer submit failed:', err);
        }
        loadingRef.current.delete(key);
    }, [sessionId, finished]);

    // Player physically reached a dead end — NOW show the "WRONG" feedback
    const handleReachDeadEnd = useCallback(() => {
        setShowDeadEnd(true);
        setTimeout(() => setShowDeadEnd(false), 2000);
    }, []);

    // Player physically reached the Victory mat at the end of the final path
    const handleReachVictory = useCallback(() => {
        if (!finished) setFinished(true);
    }, [finished]);

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
                shadows={{ type: THREE.PCFShadowMap }}
                camera={{ fov: 75, near: 0.1, far: 200, position: [0, 2, 2] }}
                gl={{ antialias: true, alpha: false }}
                onCreated={({ gl }) => { gl.setClearColor('#e8f5e9'); }}
            >
                <MazeScene
                    maze={maze}
                    questions={questions}
                    onEnterPath={handleEnterPath}
                    onReachDeadEnd={handleReachDeadEnd}
                    onReachVictory={handleReachVictory}
                    playerState={player}
                />
            </Canvas>

            <div className="crosshair" />

            <HUD player={player} />

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

            {/* Instructions */}
            <div style={{
                position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)', color: '#a5d6a7', padding: '8px 16px',
                borderRadius: 8, fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: 1,
                pointerEvents: 'none'
            }}>
                CLICK TO LOOK • WASD TO MOVE • WALK INTO A PATH TO ANSWER
            </div>
        </div>
    );
}
