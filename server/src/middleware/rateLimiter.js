import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

export const answerLimiter = rateLimit({
    windowMs: 10 * 1000,
    max: 5,
    message: { error: 'Answering too fast. Slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts.' },
    standardHeaders: true,
    legacyHeaders: false
});
