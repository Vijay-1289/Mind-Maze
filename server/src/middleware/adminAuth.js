import jwt from 'jsonwebtoken';

export function adminAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.adminToken;
    if (!token) {
        return res.status(401).json({ error: 'Admin authentication required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
