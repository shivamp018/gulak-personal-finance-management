/**
 * StudentSpend AI — Storage & State Persistence Layer
 */

const STORAGE_KEYS = {
    PROFILE: 'studentspend_profile_v1',
    TRANSACTIONS: 'studentspend_transactions_v1',
    DEBTS: 'studentspend_debts_v1',
    SETTINGS: 'studentspend_settings_v1',
    AI_HISTORY: 'studentspend_ai_history_v1'
};

const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'Food & Canteen', icon: 'utensils', color: '#d69fa4', badgeClass: 'badge-food' }, // Dusty Rose
    { id: 'transport', name: 'Metro & Commute', icon: 'bus', color: '#b2aabd', badgeClass: 'badge-transport' }, // Muted Lavender
    { id: 'study', name: 'Books & Printouts', icon: 'book-open', color: '#d4c89d', badgeClass: 'badge-study' }, // Warm Ochre
    { id: 'rent', name: 'Hostel & Utilities', icon: 'home', color: '#c49787', badgeClass: 'badge-rent' }, // Terracotta/Clay
    { id: 'social', name: 'Hangouts & Movies', icon: 'film', color: '#dcb88f', badgeClass: 'badge-social' }, // Sand
    { id: 'subscriptions', name: 'Student Subscriptions', icon: 'tv', color: '#9fa6ac', badgeClass: 'badge-subscriptions' }, // Soft Slate
    { id: 'shopping', name: 'Personal & Clothing', icon: 'shopping-bag', color: '#c2858b', badgeClass: 'badge-shopping' }, // Deep Rose
    { id: 'emergency', name: 'Medical & Emergency', icon: 'heart-pulse', color: '#a87278', badgeClass: 'badge-emergency' }, // Dark Rose
    { id: 'other', name: 'Miscellaneous', icon: 'tag', color: '#9bb5a9', badgeClass: 'badge-other' } // Sage
];

// Generate current month date strings dynamically for fresh initial mock data
function getSampleDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    
    // First day of next month
    const nextMonthFirst = new Date(year, month + 1, 1).toISOString().split('T')[0];

    // Offsets
    const d = (dayOffset) => {
        const target = new Date(year, month, Math.max(1, Math.min(28, dayOffset)));
        return target.toISOString().split('T')[0];
    };

    return { firstDay, nextMonthFirst, d };
}

function getDefaultProfile() {
    const { firstDay, nextMonthFirst } = getSampleDates();
    return {
        isLoggedIn: false,
        studentName: '',
        collegeName: '',
        currency: '₹',
        monthlyAllowance: 5000,
        dateReceived: firstDay,
        nextPaymentDate: nextMonthFirst,
        monthlyBudget: 4500,
        avatarEmoji: '🎓',
        theme: 'dark'
    };
}

function getDefaultTransactions() {
    const { d } = getSampleDates();
    return [
        {
            id: 'tx-1',
            type: 'inflow', // monthly allowance initial deposit
            amount: 7500,
            category: 'other',
            title: 'Monthly Pocket Money from Parents',
            date: d(1),
            time: '09:00',
            notes: 'Bank transfer received for the month',
            isAllowance: true
        },
        {
            id: 'tx-2',
            type: 'expense',
            amount: 450,
            category: 'study',
            title: 'Data Structures Reference Book & Printouts',
            date: d(2),
            time: '14:30',
            notes: 'Photocopy center near library'
        },
        {
            id: 'tx-3',
            type: 'expense',
            amount: 600,
            category: 'transport',
            title: 'Monthly Metro Smart Card Recharge',
            date: d(3),
            time: '10:15',
            notes: 'Metro pass for college commute'
        },
        {
            id: 'tx-4',
            type: 'expense',
            amount: 199,
            category: 'subscriptions',
            title: 'Spotify Student Premium Plan',
            date: d(4),
            time: '08:00',
            notes: 'Monthly music subscription'
        },
        {
            id: 'tx-5',
            type: 'expense',
            amount: 280,
            category: 'food',
            title: 'Canteen Lunch & Cold Coffee',
            date: d(5),
            time: '13:45',
            notes: 'With batchmates at central mess'
        },
        {
            id: 'tx-6',
            type: 'money_given', // Lent to friend
            amount: 500,
            category: 'social',
            title: 'Lent to Rohan for College Fest Pass',
            date: d(6),
            time: '17:20',
            person: 'Rohan Verma',
            dueDate: d(20),
            settled: false,
            notes: 'Fest committee registration'
        },
        {
            id: 'tx-7',
            type: 'expense',
            amount: 340,
            category: 'food',
            title: 'Hostel Late-Night Maggi & Snacks',
            date: d(8),
            time: '23:15',
            notes: 'Exam group study session'
        },
        {
            id: 'tx-8',
            type: 'inflow',
            amount: 1200,
            category: 'other',
            title: 'Freelance Graphic Design Gig',
            date: d(10),
            time: '19:00',
            notes: 'Designed poster for university club'
        },
        {
            id: 'tx-9',
            type: 'money_borrowed', // Borrowed from friend
            amount: 300,
            category: 'emergency',
            title: 'Borrowed from Priya (UPI Server was Down)',
            date: d(11),
            time: '16:00',
            person: 'Priya Patel',
            dueDate: d(18),
            settled: false,
            notes: 'Stationery shop bill emergency'
        },
        {
            id: 'tx-10',
            type: 'expense',
            amount: 520,
            category: 'social',
            title: 'Weekend Movie Ticket & Popcorn',
            date: d(12),
            time: '18:30',
            notes: 'Dune Part 2 at City Mall'
        },
        {
            id: 'tx-11',
            type: 'money_repaid', // Repaid Priya
            amount: 300,
            category: 'emergency',
            title: 'Repaid Priya ₹300 for Stationery',
            date: d(14),
            time: '11:00',
            person: 'Priya Patel',
            notes: 'Settled via Google Pay'
        },
        {
            id: 'tx-12',
            type: 'expense',
            amount: 380,
            category: 'food',
            title: 'Evening Cafe Chitchat with Roommates',
            date: d(15),
            time: '19:40',
            notes: 'Chai and sandwiches'
        }
    ];
}

function getDefaultDebts() {
    const { d } = getSampleDates();
    return [
        {
            id: 'debt-1',
            type: 'given', // Money I gave (Friend owes me)
            person: 'Rohan Verma',
            amount: 500,
            date: d(6),
            dueDate: d(20),
            reason: 'College Fest Pass',
            status: 'pending', // 'pending' or 'settled'
            reminderSentCount: 1,
            lastReminder: d(12)
        },
        {
            id: 'debt-2',
            type: 'given',
            person: 'Ananya Gupta',
            amount: 250,
            date: d(9),
            dueDate: d(16),
            reason: 'Shared Swiggy Pizza order',
            status: 'pending',
            reminderSentCount: 0,
            lastReminder: null
        }
    ];
}

const StorageManager = {
    isCloudConnected: false,

    async apiCall(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (body) options.body = JSON.stringify(body);
            const res = await fetch(endpoint, options);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async checkCloudStatus() {
        const data = await this.apiCall('/api/status');
        this.isCloudConnected = Boolean(data && data.status === 'connected');
        this.updateCloudStatusBadge(data);
        return this.isCloudConnected;
    },

    updateCloudStatusBadge(data = null) {
        const badge = document.getElementById('cloudStatusBadge');
        if (!badge) return;
        if (this.isCloudConnected) {
            badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold shadow-sm transition-all cursor-pointer';
            badge.innerHTML = '<i class="fas fa-cloud text-xs text-emerald-600 dark:text-emerald-400"></i> <span class="hidden md:inline">Cloud Sync</span> <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono font-bold">ACTIVE</span>';
            badge.title = 'Encrypted Cloud Vault Active & Synced';
        } else {
            badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-stone-300 border border-stone-200 dark:border-slate-700 text-xs font-bold shadow-sm transition-all cursor-pointer';
            badge.innerHTML = '<i class="fas fa-cloud-slash text-xs text-stone-500"></i> <span class="hidden md:inline">Offline Mode</span>';
            badge.title = 'Offline mode (saving securely in local device storage)';
        }
    },

    async syncWithCloud() {
        if (!await this.checkCloudStatus()) return;

        const cloudData = await this.apiCall('/api/sync');
        if (cloudData && (cloudData.profile || (cloudData.transactions && cloudData.transactions.length > 0))) {
            if (cloudData.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(cloudData.profile));
            if (cloudData.transactions && cloudData.transactions.length > 0) {
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cloudData.transactions));
            }
            if (cloudData.debts && cloudData.debts.length > 0) {
                localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(cloudData.debts));
            }
            return true;
        } else {
            // First time cloud is empty: push initial local data to populate MongoDB!
            const profile = this.getProfile();
            const transactions = this.getTransactions();
            const debts = this.getDebts();
            await this.apiCall('/api/sync', 'POST', { profile, transactions, debts });
            return true;
        }
    },

    getProfile() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
            if (!raw) {
                const def = getDefaultProfile();
                this.saveProfile(def);
                return def;
            }
            return JSON.parse(raw);
        } catch (e) {
            console.error('Error reading profile from localStorage:', e);
            return getDefaultProfile();
        }
    },

    saveProfile(profile) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
        this.apiCall('/api/profile', 'POST', profile);
    },

    getTransactions() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
            if (!raw) {
                const def = getDefaultTransactions();
                this.saveTransactions(def);
                return def;
            }
            return JSON.parse(raw);
        } catch (e) {
            console.error('Error reading transactions:', e);
            return getDefaultTransactions();
        }
    },

    saveTransactions(transactions) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    },

    addTransaction(tx) {
        const txs = this.getTransactions();
        tx.id = tx.id || 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        txs.unshift(tx);
        this.saveTransactions(txs);
        this.apiCall('/api/transactions', 'POST', tx);
        return tx;
    },

    deleteTransaction(id) {
        let txs = this.getTransactions();
        txs = txs.filter(t => t.id !== id);
        this.saveTransactions(txs);
        this.apiCall('/api/transactions/' + id, 'DELETE');
        return txs;
    },

    getDebts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DEBTS);
            if (!raw) {
                const def = getDefaultDebts();
                this.saveDebts(def);
                return def;
            }
            return JSON.parse(raw);
        } catch (e) {
            console.error('Error reading debts:', e);
            return getDefaultDebts();
        }
    },

    saveDebts(debts) {
        localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
    },

    addDebt(debt) {
        const debts = this.getDebts();
        debt.id = debt.id || 'debt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        debt.status = debt.status || 'pending';
        debt.reminderSentCount = 0;
        debts.unshift(debt);
        this.saveDebts(debts);
        this.apiCall('/api/debts', 'POST', debt);
        return debt;
    },

    settleDebt(id) {
        const debts = this.getDebts();
        const target = debts.find(d => d.id === id);
        if (target) {
            target.status = 'settled';
            target.settledAt = new Date().toISOString().split('T')[0];
            this.saveDebts(debts);
            this.apiCall('/api/debts', 'POST', target);
        }
        return target;
    },

    deleteDebt(id) {
        let debts = this.getDebts();
        debts = debts.filter(d => d.id !== id);
        this.saveDebts(debts);
        this.apiCall('/api/debts/' + id, 'DELETE');
        return debts;
    },

    getSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return raw ? JSON.parse(raw) : { geminiApiKey: '', soundEffects: true, autoSuggestions: true };
        } catch (e) {
            return { geminiApiKey: '', soundEffects: true, autoSuggestions: true };
        }
    },

    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    resetToSampleData() {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
        localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.DEBTS);
        localStorage.removeItem(STORAGE_KEYS.AI_HISTORY);
        return {
            profile: this.getProfile(),
            transactions: this.getTransactions(),
            debts: this.getDebts()
        };
    },

    setupNewUser(userData, startFresh = true) {
        const profile = {
            ...this.getProfile(),
            ...userData,
            isLoggedIn: true
        };
        this.saveProfile(profile);

        if (startFresh) {
            // Initial Pocket Money Inflow
            const initialInflow = {
                id: 'tx-init-' + Date.now(),
                type: 'inflow',
                amount: Number(profile.monthlyAllowance) || 0,
                category: 'other',
                title: 'Monthly Pocket Money Deposit',
                date: profile.dateReceived || new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                notes: 'Starting pocket money allowance',
                isAllowance: true
            };
            this.saveTransactions([initialInflow]);
            this.saveDebts([]);
        } else {
            // Adapt demo transactions with user's allowance
            const demoTxs = getDefaultTransactions();
            demoTxs[0].amount = Number(profile.monthlyAllowance) || 5000;
            demoTxs[0].date = profile.dateReceived;
            demoTxs[0].isAllowance = true;
            this.saveTransactions(demoTxs);
            this.saveDebts(getDefaultDebts());
        }

        return profile;
    },

    logout() {
        const profile = this.getProfile();
        profile.isLoggedIn = false;
        this.saveProfile(profile);
    },

    clearAllData() {
        const baseProfile = {
            studentName: 'Student',
            collegeName: '',
            currency: '₹',
            monthlyAllowance: 0,
            dateReceived: new Date().toISOString().split('T')[0],
            nextPaymentDate: new Date(Date.now() + 30*24*3600*1000).toISOString().split('T')[0],
            monthlyBudget: 0,
            avatarEmoji: '🎒',
            theme: 'dark'
        };
        this.saveProfile(baseProfile);
        this.saveTransactions([]);
        this.saveDebts([]);
    },

    exportDataJSON() {
        const exportObj = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            profile: this.getProfile(),
            transactions: this.getTransactions(),
            debts: this.getDebts(),
            settings: this.getSettings()
        };
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GullakAI_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    exportTransactionsCSV() {
        const txs = this.getTransactions();
        const headers = ['ID', 'Date', 'Time', 'Type', 'Category', 'Title', 'Amount', 'Person/Entity', 'Notes'];
        const rows = txs.map(t => [
            `"${t.id}"`,
            `"${t.date || ''}"`,
            `"${t.time || ''}"`,
            `"${t.type || ''}"`,
            `"${t.category || ''}"`,
            `"${(t.title || '').replace(/"/g, '""')}"`,
            t.amount || 0,
            `"${(t.person || '').replace(/"/g, '""')}"`,
            `"${(t.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GullakAI_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importDataJSON(jsonString) {
        try {
            if (typeof jsonString !== 'string' || jsonString.length > 10 * 1024 * 1024) {
                console.error('Import rejected: Payload size exceeds 10MB limit.');
                return false;
            }

            const data = JSON.parse(jsonString);
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                console.error('Import rejected: Invalid root object.');
                return false;
            }

            // Prototype Pollution Protection
            const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
            for (const key of Object.keys(data)) {
                if (forbiddenKeys.includes(key)) {
                    console.error('Import rejected: Malicious prototype keys detected.');
                    return false;
                }
            }

            // Sanitize & Validate Profile
            if (data.profile && typeof data.profile === 'object') {
                const safeProfile = {
                    isLoggedIn: Boolean(data.profile.isLoggedIn),
                    studentName: String(data.profile.studentName || '').slice(0, 100),
                    collegeName: String(data.profile.collegeName || 'Personal Account').slice(0, 100),
                    currency: ['₹', '$', '€', '£'].includes(data.profile.currency) ? data.profile.currency : '₹',
                    monthlyAllowance: Math.max(0, Number(data.profile.monthlyAllowance) || 0),
                    dateReceived: String(data.profile.dateReceived || '').slice(0, 20),
                    nextPaymentDate: String(data.profile.nextPaymentDate || '').slice(0, 20),
                    monthlyBudget: Math.max(0, Number(data.profile.monthlyBudget) || 0),
                    avatarEmoji: String(data.profile.avatarEmoji || '🪙').slice(0, 10),
                    theme: data.profile.theme === 'light' ? 'light' : 'dark'
                };
                this.saveProfile(safeProfile);
            }

            // Sanitize & Validate Transactions
            if (Array.isArray(data.transactions)) {
                const allowedTypes = ['inflow', 'expense', 'money_given', 'money_received_back', 'money_borrowed', 'money_repaid'];
                const safeTransactions = data.transactions.slice(0, 5000).filter(t => t && typeof t === 'object').map(t => ({
                    id: String(t.id || 'tx_' + Date.now()).slice(0, 50),
                    title: String(t.title || 'Untitled').slice(0, 150),
                    amount: Math.abs(Number(t.amount) || 0),
                    type: allowedTypes.includes(t.type) ? t.type : 'expense',
                    category: String(t.category || 'other').slice(0, 50),
                    date: String(t.date || '').slice(0, 20),
                    time: String(t.time || '').slice(0, 20),
                    person: String(t.person || '').slice(0, 100),
                    notes: String(t.notes || '').slice(0, 300),
                    isAllowance: Boolean(t.isAllowance)
                }));
                this.saveTransactions(safeTransactions);
            }

            // Sanitize & Validate Debts
            if (Array.isArray(data.debts)) {
                const safeDebts = data.debts.slice(0, 2000).filter(d => d && typeof d === 'object').map(d => ({
                    id: String(d.id || 'debt_' + Date.now()).slice(0, 50),
                    person: String(d.person || 'Anonymous').slice(0, 100),
                    amount: Math.abs(Number(d.amount) || 0),
                    type: ['lent', 'borrowed'].includes(d.type) ? d.type : 'lent',
                    reason: String(d.reason || '').slice(0, 200),
                    date: String(d.date || '').slice(0, 20),
                    dueDate: String(d.dueDate || '').slice(0, 20),
                    status: ['pending', 'settled'].includes(d.status) ? d.status : 'pending'
                }));
                this.saveDebts(safeDebts);
            }

            // Sanitize Settings
            if (data.settings && typeof data.settings === 'object') {
                const safeSettings = {
                    geminiApiKey: String(data.settings.geminiApiKey || '').trim().slice(0, 200),
                    soundEffects: Boolean(data.settings.soundEffects !== false),
                    runwayAlerts: Boolean(data.settings.runwayAlerts !== false)
                };
                this.saveSettings(safeSettings);
            }

            return true;
        } catch (e) {
            console.error('Failed to import and sanitize JSON data', e);
            return false;
        }
    }
};

// Global HTML escape helper for XSS prevention
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Global format currency helper with multi-locale support
function formatCurrency(amount, currency = '₹') {
    const num = Number(amount) || 0;
    const localeMap = {
        '₹': 'en-IN',
        '$': 'en-US',
        '€': 'de-DE',
        '£': 'en-GB'
    };
    const locale = localeMap[currency] || 'en-IN';
    return `${currency}${num.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}
