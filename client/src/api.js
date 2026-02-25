const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function joinGame(name, rollNumber) {
    const res = await fetch(`${API}/api/player/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rollNumber })
    });
    return res.json();
}

export async function getGameState(sessionId) {
    const res = await fetch(`${API}/api/player/state/${sessionId}`);
    return res.json();
}

export async function submitAnswer(sessionId, nodeId, chosenPath, timeTaken) {
    const res = await fetch(`${API}/api/player/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, nodeId, chosenPath, timeTaken })
    });
    return res.json();
}

export async function reachNode(sessionId, nodeId) {
    const res = await fetch(`${API}/api/player/reach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, nodeId })
    });
    return res.json();
}

export async function getAllQuestions(sessionId) {
    const res = await fetch(`${API}/api/player/questions/${sessionId}`);
    return res.json();
}

export async function reportTabSwitch(sessionId) {
    fetch(`${API}/api/player/tabswitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    }).catch(() => { });
}

export async function getLeaderboard() {
    const res = await fetch(`${API}/api/player/leaderboard`);
    return res.json();
}

export async function adminLogin(username, password) {
    const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    return res.json();
}

export async function adminGetPlayers(token) {
    const res = await fetch(`${API}/api/admin/players`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
}

export async function adminAction(token, action, body = {}) {
    const res = await fetch(`${API}/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    return res.json();
}

export async function adminGetStats(token) {
    const res = await fetch(`${API}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
}

export async function adminGetQuestions(token) {
    const res = await fetch(`${API}/api/admin/questions`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
}

export async function adminSaveQuestion(token, question, id) {
    const url = id ? `${API}/api/admin/questions/${id}` : `${API}/api/admin/questions`;
    const res = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(question)
    });
    return res.json();
}

export async function adminDeleteQuestion(token, id) {
    const res = await fetch(`${API}/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
}
