require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Profile, Transaction, Debt } = require('./models/db');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// MongoDB Connection State
let isDbConnected = false;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 7000
    }).then(() => {
        isDbConnected = true;
        console.log('✅ Connected to MongoDB Atlas: gullak_ai database');
    }).catch(err => {
        console.error('⚠️ MongoDB connection error (running in local fallback mode):', err.message);
    });
} else {
    console.warn('⚠️ MONGO_URI not found in .env. Running in local fallback mode.');
}

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Health & Connection Status
app.get('/api/status', async (req, res) => {
    try {
        if (!isDbConnected && mongoose.connection.readyState !== 1) {
            return res.json({ status: 'offline', message: 'MongoDB not connected' });
        }
        const txCount = await Transaction.countDocuments();
        const debtCount = await Debt.countDocuments();
        res.json({
            status: 'connected',
            database: 'gullak_ai',
            counts: {
                transactions: txCount,
                debts: debtCount
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// 2. Full Sync Pull (Fetch All Cloud Data)
app.get('/api/sync', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        const profile = await Profile.findOne({ userId: 'primary_user' });
        const transactions = await Transaction.find({ userId: 'primary_user' }).sort({ createdAt: -1 });
        const debts = await Debt.find({ userId: 'primary_user' }).sort({ createdAt: -1 });

        res.json({
            profile: profile || null,
            transactions: transactions || [],
            debts: debts || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Full Sync Push (Bulk Upsert from Client)
app.post('/api/sync', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        const { profile, transactions, debts } = req.body;

        // Upsert Profile
        if (profile) {
            await Profile.findOneAndUpdate(
                { userId: 'primary_user' },
                { ...profile, userId: 'primary_user' },
                { upsert: true, new: true }
            );
        }

        // Upsert Transactions
        if (Array.isArray(transactions) && transactions.length > 0) {
            const bulkOps = transactions.map(t => ({
                updateOne: {
                    filter: { id: t.id, userId: 'primary_user' },
                    update: { $set: { ...t, userId: 'primary_user' } },
                    upsert: true
                }
            }));
            await Transaction.bulkWrite(bulkOps);
        }

        // Upsert Debts
        if (Array.isArray(debts) && debts.length > 0) {
            const bulkOps = debts.map(d => ({
                updateOne: {
                    filter: { id: d.id, userId: 'primary_user' },
                    update: { $set: { ...d, userId: 'primary_user' } },
                    upsert: true
                }
            }));
            await Debt.bulkWrite(bulkOps);
        }

        res.json({ success: true, message: 'Cloud sync successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Upsert Single Transaction
app.post('/api/transactions', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        const tx = req.body;
        if (!tx || !tx.id) {
            return res.status(400).json({ error: 'Invalid transaction data' });
        }
        const saved = await Transaction.findOneAndUpdate(
            { id: tx.id, userId: 'primary_user' },
            { ...tx, userId: 'primary_user' },
            { upsert: true, new: true }
        );
        res.json({ success: true, transaction: saved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Delete Single Transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        await Transaction.deleteOne({ id: req.params.id, userId: 'primary_user' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Upsert Single Debt
app.post('/api/debts', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        const debt = req.body;
        if (!debt || !debt.id) {
            return res.status(400).json({ error: 'Invalid debt data' });
        }
        const saved = await Debt.findOneAndUpdate(
            { id: debt.id, userId: 'primary_user' },
            { ...debt, userId: 'primary_user' },
            { upsert: true, new: true }
        );
        res.json({ success: true, debt: saved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Delete Single Debt
app.delete('/api/debts/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        await Debt.deleteOne({ id: req.params.id, userId: 'primary_user' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Update Profile
app.post('/api/profile', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database offline' });
        }
        const saved = await Profile.findOneAndUpdate(
            { userId: 'primary_user' },
            { ...req.body, userId: 'primary_user' },
            { upsert: true, new: true }
        );
        res.json({ success: true, profile: saved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Default Fallback to index.html for SPA (Express 5 compatible)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Gullak AI Server running at http://localhost:${PORT}`);
});
