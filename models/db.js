const mongoose = require('mongoose');

// Profile Schema
const ProfileSchema = new mongoose.Schema({
    userId: { type: String, default: 'primary_user', index: true, unique: true },
    studentName: { type: String, default: 'User' },
    collegeName: { type: String, default: 'Personal Account' },
    currency: { type: String, default: '₹' },
    monthlyAllowance: { type: Number, default: 5000 },
    dateReceived: { type: String, default: '' },
    nextPaymentDate: { type: String, default: '' },
    monthlyBudget: { type: Number, default: 0 },
    avatarEmoji: { type: String, default: '🪙' },
    theme: { type: String, default: 'dark' },
    isLoggedIn: { type: Boolean, default: true }
}, { timestamps: true });

// Transaction Schema
const TransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: 'primary_user', index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { 
        type: String, 
        enum: ['inflow', 'expense', 'money_given', 'money_received_back', 'money_borrowed', 'money_repaid'],
        default: 'expense' 
    },
    category: { type: String, default: 'other' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    person: { type: String, default: '' },
    notes: { type: String, default: '' },
    isAllowance: { type: Boolean, default: false },
    debtId: { type: String, default: '' },
    isSettled: { type: Boolean, default: false }
}, { timestamps: true, strict: false });

// Debt Schema
const DebtSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: 'primary_user', index: true },
    person: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['lent', 'given', 'borrowed'], default: 'lent' },
    reason: { type: String, default: '' },
    date: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
    settledAt: { type: String, default: '' },
    txId: { type: String, default: '' }
}, { timestamps: true, strict: false });

const Profile = mongoose.model('Profile', ProfileSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Debt = mongoose.model('Debt', DebtSchema);

module.exports = {
    Profile,
    Transaction,
    Debt
};
