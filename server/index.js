import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const LEVELS = [
    { id: 1, answer: 'lantern' },
    { id: 2, answer: 'amber' },
    { id: 3, answer: 'basalt' },
    { id: 4, answer: 'yarrow' },
    { id: 5, answer: 'raven' },
    { id: 6, answer: 'indigo' },
    { id: 7, answer: 'nebula' },
    { id: 8, answer: 'talon' },
    { id: 9, answer: 'horizon' },
    { id: 10, answer: 'CRYPTOQUEST{L4BYR1NTH_UNL0CK3D}' },
];

const ROUND_POINTS = [20, 25, 30, 35, 40, 45, 50, 55, 60, 100];

const inMemoryUsers = [];

app.use(cors({
    origin(origin, callback) {
        callback(null, !origin || CLIENT_ORIGINS.includes(origin));
    },
    credentials: true,
}));
app.use(express.json());

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, trim: true },
        teamName: { type: String, required: true, trim: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ['participant', 'admin'], default: 'participant' },
        totalPoints: { type: Number, default: 0 },
        finishedAt: { type: Date, default: null },
        token: { type: String, default: '' },
        solvedLevels: [
            {
                level: Number,
                points: Number,
                solvedAt: Date,
            },
        ],
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function connectDatabase() {
    if (!process.env.MONGODB_URI) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('MONGODB_URI is required in production.');
        }
        console.warn('MONGODB_URI not set. Starting in demo mode using in-memory storage.');
        return false;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
        return true;
    } catch (error) {
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
        console.warn('MongoDB unavailable. Starting in demo mode using in-memory storage.');
        console.warn(error.message);
        return false;
    }
}

let databaseReady = false;

function sanitizeUser(user) {
    if (!user) return null;
    return {
        id: user._id ? user._id.toString() : user.id,
        username: user.username,
        teamName: user.teamName,
        role: user.role,
        totalPoints: Number(user.totalPoints || 0),
        finishedAt: user.finishedAt || null,
        solvedLevels: (user.solvedLevels || []).map((entry) => ({
            level: entry.level,
            points: entry.points,
            solvedAt: entry.solvedAt || null,
        })),
    };
}

function getUserFromToken(token) {
    if (!token) return null;
    if (databaseReady) {
        return User.findOne({ token });
    }
    return inMemoryUsers.find((user) => user.token === token) || null;
}

function generateToken() {
    return randomBytes(24).toString('hex');
}

function ensureAdminSeed() {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return;

    if (databaseReady) {
        return User.findOne({ username: ADMIN_USERNAME }).then(async (existing) => {
            if (!existing) {
                const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
                await User.create({
                    username: ADMIN_USERNAME,
                    teamName: 'Admin Team',
                    passwordHash,
                    role: 'admin',
                    token: generateToken(),
                    solvedLevels: [],
                    totalPoints: 0,
                });
            }
        });
    }

    const existing = inMemoryUsers.find((user) => user.username === ADMIN_USERNAME && user.role === 'admin');
    if (!existing) {
        inMemoryUsers.push({
            id: `admin-${Date.now()}`,
            username: ADMIN_USERNAME,
            teamName: 'Admin Team',
            role: 'admin',
            passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
            token: generateToken(),
            totalPoints: 0,
            solvedLevels: [],
            finishedAt: null,
            createdAt: new Date().toISOString(),
        });
    }
}

async function ensureSeedData() {
    await ensureAdminSeed();
}

async function ensureParticipantSeeds() {
    for (let teamNumber = 1; teamNumber <= 30; teamNumber += 1) {
        const username = `TEAM${teamNumber}`;
        const existing = databaseReady
            ? await User.findOne({ username })
            : inMemoryUsers.find((user) => user.username === username);
        const passwordHash = await bcrypt.hash(`pass${teamNumber}`, 10);

        if (existing) {
            existing.passwordHash = passwordHash;
            if (databaseReady) await existing.save();
            continue;
        }

        const team = {
            username,
            teamName: username,
            passwordHash,
            role: 'participant',
            token: '',
            totalPoints: 0,
            solvedLevels: [],
        };

        if (databaseReady) {
            await User.create(team);
        } else {
            inMemoryUsers.push({
                ...team,
                id: `team-${teamNumber}`,
                finishedAt: null,
                createdAt: new Date().toISOString(),
            });
        }
    }
}

async function seedAllAccounts() {
    await ensureSeedData();
    await ensureParticipantSeeds();
}

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : '';

    if (!token) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = sanitizeUser(user);
    return next();
}

function requireAdmin(req, res, next) {
    if (req.user?.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden: admin access required.' });
}

function normalizeSolvedLevels(solvedLevels = []) {
    const unique = new Map();
    for (const entry of solvedLevels) {
        if (!entry || !entry.level) continue;
        unique.set(Number(entry.level), {
            level: Number(entry.level),
            points: Number(entry.points || 0),
            solvedAt: entry.solvedAt || new Date().toISOString(),
        });
    }
    return Array.from(unique.values()).sort((a, b) => a.level - b.level);
}

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        database: databaseReady ? 'mongodb' : 'demo-memory',
        timestamp: new Date().toISOString(),
    });
});

app.post('/api/auth/register', (req, res) => {
    return res.status(403).json({ error: 'Registration is disabled. Use your assigned team credentials.' });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required.' });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);

    if (ADMIN_USERNAME && ADMIN_PASSWORD && cleanUsername === ADMIN_USERNAME && cleanPassword === ADMIN_PASSWORD) {
        const adminUser = {
            id: 'admin-user',
            username: ADMIN_USERNAME,
            teamName: 'Admin Team',
            role: 'admin',
            totalPoints: 0,
            finishedAt: null,
            solvedLevels: [],
            token: generateToken(),
        };

        if (databaseReady) {
            const existing = await User.findOne({ username: ADMIN_USERNAME });
            if (existing) {
                existing.token = adminUser.token;
                await existing.save();
                return res.json({ token: adminUser.token, user: sanitizeUser(existing.toObject()) });
            }
        }

        const match = inMemoryUsers.find((user) => user.username === ADMIN_USERNAME && user.role === 'admin');
        if (match) {
            match.token = adminUser.token;
            return res.json({ token: adminUser.token, user: sanitizeUser(match) });
        }

        inMemoryUsers.push({ ...adminUser, passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10) });
        return res.json({ token: adminUser.token, user: sanitizeUser(adminUser) });
    }

    let user = databaseReady ? await User.findOne({ username: cleanUsername }) : inMemoryUsers.find((entry) => entry.username === cleanUsername);

    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValidPassword = await bcrypt.compare(cleanPassword, user.passwordHash || '');
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken();
    user.token = token;

    if (databaseReady) {
        await user.save();
        return res.json({ token, user: sanitizeUser(user.toObject()) });
    }

    return res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/me', authenticate, async (req, res) => {
    if (databaseReady) {
        const user = await User.findOne({ username: req.user.username });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        return res.json({ user: sanitizeUser(user.toObject()) });
    }

    const user = inMemoryUsers.find((entry) => entry.username === req.user.username);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: sanitizeUser(user) });
});

app.post('/api/answers/submit', authenticate, async (req, res) => {
    const { level, answer } = req.body || {};
    const numericLevel = Number(level);
    const suppliedAnswer = String(answer || '').trim();

    if (!numericLevel || !LEVELS.some((item) => item.id === numericLevel)) {
        return res.status(400).json({ error: 'Invalid level.' });
    }

    if (!suppliedAnswer) {
        return res.status(400).json({ error: 'Answer is required.' });
    }

    const user = databaseReady
        ? await User.findOne({ username: req.user.username })
        : inMemoryUsers.find((entry) => entry.username === req.user.username);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const alreadySolved = (user.solvedLevels || []).some((entry) => Number(entry.level) === numericLevel);
    if (alreadySolved) {
        return res.json({ correct: true, alreadySolved: true, user: sanitizeUser(databaseReady ? user.toObject() : user) });
    }

    const solvedLevelIds = new Set((user.solvedLevels || []).map((entry) => Number(entry.level)));
    const hasSolvedEarlierRounds = Array.from({ length: numericLevel - 1 }, (_, index) => index + 1)
        .every((requiredLevel) => solvedLevelIds.has(requiredLevel));
    if (!hasSolvedEarlierRounds) {
        return res.status(409).json({ error: 'Solve the earlier rounds first.' });
    }

    const target = LEVELS.find((item) => item.id === numericLevel);
    const isCorrect = suppliedAnswer.toLowerCase() === target.answer.toLowerCase();
    if (!isCorrect) {
        return res.status(400).json({ correct: false, error: 'Incorrect answer.' });
    }

    const points = ROUND_POINTS[numericLevel - 1] || 10;
    const solvedLevels = normalizeSolvedLevels(user.solvedLevels || []);
    solvedLevels.push({ level: numericLevel, points, solvedAt: new Date().toISOString() });
    user.solvedLevels = solvedLevels;
    user.totalPoints = solvedLevels.reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);

    if (solvedLevels.length >= LEVELS.length) {
        user.finishedAt = new Date();
    }

    if (databaseReady) await user.save();
    return res.json({ correct: true, points, user: sanitizeUser(databaseReady ? user.toObject() : user) });
});

app.get('/api/admin/leaderboard', authenticate, requireAdmin, async (req, res) => {
    if (databaseReady) {
        const users = await User.find({ role: 'participant' }).sort({ totalPoints: -1, finishedAt: 1, createdAt: 1 });
        const teams = users.map((user) => ({
            rank: 0,
            id: user._id.toString(),
            username: user.username,
            teamName: user.teamName,
            role: user.role,
            totalPoints: Number(user.totalPoints || 0),
            solvedLevels: normalizeSolvedLevels(user.solvedLevels || []),
            finishedAt: user.finishedAt || null,
        }));

        teams.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (a.finishedAt && b.finishedAt) return new Date(a.finishedAt) - new Date(b.finishedAt);
            if (a.finishedAt && !b.finishedAt) return -1;
            if (!a.finishedAt && b.finishedAt) return 1;
            return a.teamName.localeCompare(b.teamName);
        });

        const rankedTeams = teams.map((team, index) => ({ ...team, rank: index + 1 }));
        return res.json({ teams: rankedTeams });
    }

    const users = inMemoryUsers.filter((user) => user.role === 'participant');
    const teams = users
        .map((user) => ({
            rank: 0,
            id: user.id,
            username: user.username,
            teamName: user.teamName,
            role: user.role,
            totalPoints: Number(user.totalPoints || 0),
            solvedLevels: normalizeSolvedLevels(user.solvedLevels || []),
            finishedAt: user.finishedAt || null,
        }))
        .sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (a.finishedAt && b.finishedAt) return new Date(a.finishedAt) - new Date(b.finishedAt);
            if (a.finishedAt && !b.finishedAt) return -1;
            if (!a.finishedAt && b.finishedAt) return 1;
            return a.teamName.localeCompare(b.teamName);
        })
        .map((team, index) => ({ ...team, rank: index + 1 }));

    return res.json({ teams });
});

app.get('/api/leaderboard', (req, res) => {
    return res.status(403).json({ error: 'Forbidden: participant leaderboard access is disabled.' });
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
});

async function startServer() {
    databaseReady = await connectDatabase();
    await seedAllAccounts();
    app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error('Backend startup failed:', error.message);
    process.exitCode = 1;
});
