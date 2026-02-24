import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminLogin } from '../api';

export default function AdminLogin() {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await adminLogin(user, pass);
            if (data.token) {
                sessionStorage.setItem('adminToken', data.token);
                navigate('/admin/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch { setError('Server unreachable'); }
    };

    return (
        <div className="admin-login">
            <motion.form className="join-form" onSubmit={handleLogin}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 style={{ fontFamily: 'Orbitron', color: 'var(--accent)', textAlign: 'center' }}>ADMIN</h2>
                <input placeholder="Username" value={user} onChange={e => setUser(e.target.value)} />
                <input placeholder="Password" type="password" value={pass} onChange={e => setPass(e.target.value)} />
                {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
                <button className="btn-primary" type="submit">Login</button>
            </motion.form>
        </div>
    );
}
