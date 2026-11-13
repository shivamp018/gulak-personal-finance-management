/**
 * StudentSpend AI — Main Application Orchestrator & State Management
 */

class StudentSpendApp {
    constructor() {
        this.profile = StorageManager.getProfile();
        this.transactions = StorageManager.getTransactions();
        this.debts = StorageManager.getDebts();
        this.currentFilter = 'all';
        this.currentCategoryFilter = 'all';
        this.searchQuery = '';
        this.selectedDebtForReminder = null;

        this.init();
    }

    async init() {
        this.applyTheme(this.profile.theme || 'dark');
        this.bindEvents();
        this.checkLoginState();

        // Check & sync with MongoDB Atlas in background
        try {
            const synced = await StorageManager.syncWithCloud();
            if (synced) {
                this.profile = StorageManager.getProfile();
                this.transactions = StorageManager.getTransactions();
                this.debts = StorageManager.getDebts();
                this.renderHeader();
                this.refreshAll();
            }
        } catch (e) {
            console.warn('Initial cloud sync skipped:', e);
        }
    }

    checkLoginState() {
        const loginScreen = document.getElementById('loginScreen');
        const appScreen = document.getElementById('appScreen');

        if (this.profile.isLoggedIn && this.profile.studentName) {
            if (loginScreen) loginScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');
            this.refreshAll();
        } else {
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (appScreen) appScreen.classList.add('hidden');
            this.prefillLoginForm();
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const appScreen = document.getElementById('appScreen');
        if (appScreen) appScreen.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');
        this.prefillLoginForm();
    }

    prefillLoginForm() {
        const { firstDay, nextMonthFirst } = getSampleDates();
        if (document.getElementById('loginStudentName')) {
            document.getElementById('loginStudentName').value = this.profile.studentName || '';
        }
        if (document.getElementById('loginCollegeName')) {
            document.getElementById('loginCollegeName').value = this.profile.collegeName || '';
        }
        if (document.getElementById('loginPocketMoney')) {
            document.getElementById('loginPocketMoney').value = this.profile.monthlyAllowance || 5000;
        }
        if (document.getElementById('loginCurrency')) {
            document.getElementById('loginCurrency').value = this.profile.currency || '₹';
        }
        if (document.getElementById('loginDateReceived')) {
            document.getElementById('loginDateReceived').value = this.profile.dateReceived || firstDay;
        }
        if (document.getElementById('loginNextDate')) {
            document.getElementById('loginNextDate').value = this.profile.nextPaymentDate || nextMonthFirst;
        }
        if (document.getElementById('loginMonthlyBudget')) {
            document.getElementById('loginMonthlyBudget').value = this.profile.monthlyBudget || '';
        }
    }

    // ==========================================
    // Calculations & Metrics Engine
    // ==========================================
    calculateMetrics() {
        const allowance = Number(this.profile.monthlyAllowance) || 0;
        let extraInflows = 0;
        let totalExpenses = 0;
        let moneyGiven = 0;
        let moneyReceivedBack = 0;
        let moneyBorrowed = 0;
        let moneyRepaid = 0;

        this.transactions.forEach(t => {
            const amt = Number(t.amount) || 0;
            switch (t.type) {
                case 'inflow':
                    // If not marked as the base monthly allowance deposit
                    const isBaseAllowance = t.isAllowance || 
                        t.title?.toLowerCase().includes('monthly pocket money deposit') || 
                        t.title?.toLowerCase().includes('monthly pocket money from parents');
                    if (!isBaseAllowance) {
                        extraInflows += amt;
                    }
                    break;
                case 'expense':
                    totalExpenses += amt;
                    break;
                case 'money_given':
                    moneyGiven += amt;
                    break;
                case 'money_received_back':
                    moneyReceivedBack += amt;
                    break;
                case 'money_borrowed':
                    moneyBorrowed += amt;
                    break;
                case 'money_repaid':
                    moneyRepaid += amt;
                    break;
            }
        });

        // Exact formula for student balance
        const currentBalance = (allowance + extraInflows + moneyReceivedBack + moneyBorrowed) - (totalExpenses + moneyGiven + moneyRepaid);

        // Days calculation
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nextDate = new Date(this.profile.nextPaymentDate || (Date.now() + 30 * 24 * 3600 * 1000));
        nextDate.setHours(0, 0, 0, 0);

        const diffTime = nextDate.getTime() - now.getTime();
        const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Safe spending limit per day
        const dailySafeLimit = remainingDays > 0 ? Math.max(0, currentBalance / remainingDays) : currentBalance;

        // Savings
        const totalInflows = allowance + extraInflows;
        const monthlySavings = totalInflows - totalExpenses;
        const budgetRemaining = this.profile.monthlyBudget ? (this.profile.monthlyBudget - totalExpenses) : null;

        return {
            monthlyAllowance: allowance,
            totalExtraInflows: extraInflows,
            totalInflows,
            currentBalance,
            totalExpenses,
            moneyGiven,
            moneyReceivedBack,
            moneyBorrowed,
            moneyRepaid,
            remainingDays,
            dailySafeLimit,
            monthlySavings,
            budgetRemaining
        };
    }

    // ==========================================
    // UI Update & Render Coordinator
    // ==========================================
    refreshAll() {
        const metrics = this.calculateMetrics();

        this.renderHeader();
        this.renderMetricCards(metrics);
        this.renderSmartAlerts(metrics);
        this.renderTransactionsList();
        this.renderDebts();
        this.renderAISuggestions(metrics);

        // Update Chart.js instances
        if (typeof ChartManager !== 'undefined') {
            ChartManager.updateAllCharts(metrics, this.transactions, this.profile);
        }
    }

    renderHeader() {
        const name = this.profile.studentName || 'Shivam';
        const college = this.profile.collegeName || 'Personal Account';
        const emoji = this.profile.avatarEmoji || '👨‍💻';

        this.setText('studentNameDisplay', name);
        this.setText('collegeNameDisplay', college);
        this.setText('headerStudentName', name);
        this.setText('dropdownStudentName', name);
        this.setText('dropdownCollegeName', college);

        // Time-based greeting (Morning, Afternoon, Evening)
        const hour = new Date().getHours();
        let greetingText = 'Good Evening';
        let greetingIcon = '👋';
        if (hour >= 5 && hour < 12) {
            greetingText = 'Good Morning';
            greetingIcon = '☀️';
        } else if (hour >= 12 && hour < 17) {
            greetingText = 'Good Afternoon';
            greetingIcon = '🌤️';
        }

        const greetingNameEl = document.getElementById('greetingStudentName');
        if (greetingNameEl) {
            greetingNameEl.textContent = name;
        }
        const studentNameDisplay = document.getElementById('studentNameDisplay');
        if (studentNameDisplay) {
            const h1 = studentNameDisplay.closest('h1');
            if (h1) {
                h1.innerHTML = `<span>${greetingText}, <span id="studentNameDisplay">${escapeHtml(name)}</span>!</span> <span class="text-2xl">${greetingIcon}</span>`;
            }
        }

        if (document.getElementById('currencySelector')) {
            document.getElementById('currencySelector').value = this.profile.currency || '₹';
        }
        if (document.getElementById('avatarEmoji')) {
            document.getElementById('avatarEmoji').textContent = emoji;
        }
    }

    renderMetricCards(m) {
        const curr = this.profile.currency;

        // Top 10 Dashboard Metric Cards
        this.setText('metricCurrentBalance', formatCurrency(m.currentBalance, curr));
        this.setText('metricAllowance', formatCurrency(m.totalInflows, curr));
        this.setText('metricTotalExpenses', formatCurrency(m.totalExpenses, curr));
        this.setText('metricMoneyGiven', formatCurrency(m.moneyGiven, curr));
        this.setText('metricMoneyReceivedBack', formatCurrency(m.moneyReceivedBack, curr));
        this.setText('metricMoneyBorrowed', formatCurrency(m.moneyBorrowed, curr));
        this.setText('metricMoneyRepaid', formatCurrency(m.moneyRepaid, curr));
        this.setText('metricRemainingDays', `${m.remainingDays} Days`);
        this.setText('metricDailySafeLimit', `${formatCurrency(Math.round(m.dailySafeLimit), curr)} / day`);
        this.setText('metricMonthlySavings', formatCurrency(m.monthlySavings, curr));

        // Subtitles & progress indicators
        const balanceSub = document.getElementById('metricBalanceSub');
        if (balanceSub) {
            if (m.currentBalance <= (m.dailySafeLimit * 2)) {
                balanceSub.innerHTML = `<span class="text-rose-500 font-medium">⚠️ Low Funds (${m.remainingDays}d left)</span>`;
            } else {
                balanceSub.innerHTML = `<span class="text-emerald-500 font-medium">✅ Safe Runway</span>`;
            }
        }

        // Allowance Progress Bar
        const percentSpent = m.totalInflows > 0 ? Math.min(100, Math.round((m.totalExpenses / m.totalInflows) * 100)) : 0;
        const progressBar = document.getElementById('allowanceProgressBar');
        const progressLabel = document.getElementById('allowanceProgressLabel');
        if (progressBar && progressLabel) {
            progressBar.style.width = `${percentSpent}%`;
            progressLabel.textContent = `${percentSpent}% used (${formatCurrency(m.totalExpenses, curr)} / ${formatCurrency(m.totalInflows, curr)})`;
            
            if (percentSpent > 85) {
                progressBar.className = 'h-2 rounded-full bg-rose-500 transition-all duration-500';
            } else if (percentSpent > 60) {
                progressBar.className = 'h-2 rounded-full bg-amber-500 transition-all duration-500';
            } else {
                progressBar.className = 'h-2 rounded-full bg-emerald-500 transition-all duration-500';
            }
        }

        // Gullak AI Dashboard additions:
        this.setText('doughnutCenterTotal', formatCurrency(m.totalExpenses, curr));
        this.renderCategoryBreakdown(m);
        this.renderBudgetProgress(m);
        this.renderAIInsights(m);
    }

    renderCategoryBreakdown(m) {
        const list = document.getElementById('categoryBreakdownList');
        if (!list) return;

        const curr = this.profile.currency;
        const total = m.totalExpenses || 0;
        const catMap = {};
        this.transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'other';
            catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
        });

        const catColors = {
            food: { bg: 'bg-amber-500', name: 'Food' },
            shopping: { bg: 'bg-blue-500', name: 'Shopping' },
            transport: { bg: 'bg-emerald-500', name: 'Transport' },
            rent: { bg: 'bg-purple-500', name: 'Bills' },
            study: { bg: 'bg-indigo-500', name: 'Study' },
            social: { bg: 'bg-rose-500', name: 'Social' },
            other: { bg: 'bg-slate-400', name: 'Others' }
        };

        const sortedCats = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
        if (sortedCats.length === 0) {
            list.innerHTML = `
                <div class="text-slate-400 text-xs py-2">No expenses logged yet. Add your first spending!</div>
            `;
            return;
        }

        list.innerHTML = sortedCats.slice(0, 5).map(([catId, amount]) => {
            const meta = catColors[catId] || { bg: 'bg-slate-400', name: catId };
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
            return `
                <div class="flex items-center justify-between font-semibold">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${meta.bg}"></span>
                        <span class="text-slate-800 dark:text-slate-200">${meta.name}</span>
                    </div>
                    <div class="flex items-center gap-2 font-mono">
                        <span class="text-slate-500 font-normal">${pct}%</span>
                        <span class="font-bold text-slate-900 dark:text-white">${formatCurrency(amount, curr)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderBudgetProgress(m) {
        const curr = this.profile.currency;
        const catMap = {};
        this.transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'other';
            catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
        });

        const foodSpent = catMap['food'] || 0;
        const shopSpent = catMap['shopping'] || 0;
        const transSpent = catMap['transport'] || 0;
        const billsSpent = (catMap['rent'] || 0) + (catMap['subscriptions'] || 0);

        const foodCap = 5000;
        const shopCap = 4000;
        const transCap = 2000;
        const billsCap = 2000;

        this.setText('budgetFoodSpent', formatCurrency(foodSpent, curr));
        this.setText('budgetFoodTotal', `/ ${formatCurrency(foodCap, curr)}`);
        const foodPct = Math.round((foodSpent / foodCap) * 100);
        this.setText('budgetFoodPct', `${foodPct}%`);
        const foodBar = document.getElementById('budgetFoodBar');
        if (foodBar) foodBar.style.width = `${Math.min(100, foodPct)}%`;

        this.setText('budgetShopSpent', formatCurrency(shopSpent, curr));
        this.setText('budgetShopTotal', `/ ${formatCurrency(shopCap, curr)}`);
        const shopPct = Math.round((shopSpent / shopCap) * 100);
        this.setText('budgetShopPct', `${shopPct}%`);
        const shopBar = document.getElementById('budgetShopBar');
        if (shopBar) shopBar.style.width = `${Math.min(100, shopPct)}%`;

        this.setText('budgetTransSpent', formatCurrency(transSpent, curr));
        this.setText('budgetTransTotal', `/ ${formatCurrency(transCap, curr)}`);
        const transPct = Math.round((transSpent / transCap) * 100);
        this.setText('budgetTransPct', `${transPct}%`);
        const transBar = document.getElementById('budgetTransBar');
        if (transBar) {
            transBar.style.width = `${Math.min(100, transPct)}%`;
            if (transPct > 100) transBar.className = 'bg-rose-500 h-2 rounded-full';
            else transBar.className = 'bg-emerald-500 h-2 rounded-full';
        }

        const alertTrans = document.getElementById('budgetTransAlert');
        if (alertTrans) {
            alertTrans.style.display = transPct > 100 ? 'flex' : 'none';
        }

        this.setText('budgetBillsSpent', formatCurrency(billsSpent, curr));
        this.setText('budgetBillsTotal', `/ ${formatCurrency(billsCap, curr)}`);
        const billsPct = Math.round((billsSpent / billsCap) * 100);
        this.setText('budgetBillsPct', `${billsPct}%`);
        const billsBar = document.getElementById('budgetBillsBar');
        if (billsBar) billsBar.style.width = `${Math.min(100, billsPct)}%`;
    }

    renderAIInsights(m) {
        const bubble = document.getElementById('aiInsightsSpeechBubble');
        const tip = document.getElementById('aiInsightsTipText');
        if (!bubble || !tip) return;

        const health = AIAssistant.analyzeFinancialHealth(m, this.transactions, this.profile);
        if (health.suggestions && health.suggestions.length > 0) {
            bubble.textContent = health.suggestions[0].message || 'Your spending patterns are on track for this cycle!';
            if (health.suggestions.length > 1) {
                tip.textContent = health.suggestions[1].message;
            }
        }
    }

    renderSmartAlerts(m) {
        const container = document.getElementById('smartAlertsContainer');
        if (!container) return;

        const alerts = [];
        const curr = this.profile.currency;

        // 1. Budget breach or warning
        if (this.profile.monthlyBudget && m.totalExpenses > this.profile.monthlyBudget) {
            const over = m.totalExpenses - this.profile.monthlyBudget;
            alerts.push({
                type: 'danger',
                icon: 'fas fa-exclamation-triangle',
                title: 'Budget Exceeded!',
                text: `You have crossed your monthly budget of ${formatCurrency(this.profile.monthlyBudget, curr)} by ${formatCurrency(over, curr)}.`
            });
        }

        // 2. Burn rate warning
        const health = AIAssistant.analyzeFinancialHealth(m, this.transactions, this.profile);
        if (health.isDepletingEarly && health.daysDeficit > 0) {
            alerts.push({
                type: 'warning',
                icon: 'fas fa-burn',
                title: 'High Burn Rate Detected',
                text: `At current pace, money may deplete in ~${health.projectedDaysUntilBroke} days. Aim for ${formatCurrency(Math.round(m.dailySafeLimit), curr)}/day.`
            });
        }

        // 3. Pending loan recovery
        const overdueDebts = this.debts.filter(d => d.type === 'given' && d.status === 'pending' && d.dueDate && new Date(d.dueDate) < new Date());
        if (overdueDebts.length > 0) {
            const totalOverdue = overdueDebts.reduce((sum, d) => sum + d.amount, 0);
            alerts.push({
                type: 'info',
                icon: 'fas fa-hand-holding-usd',
                title: 'Pending Money Lent to Collect',
                text: `${overdueDebts.length} friend(s) owe you a total of ${formatCurrency(totalOverdue, curr)}. Send an AI polite reminder to collect.`
            });
        }

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-check-circle text-emerald-500 text-lg"></i>
                        <p class="text-sm font-medium">All financial signals look great! Safe daily limit is active.</p>
                    </div>
                    <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 font-semibold">Healthy</span>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(a => {
            const colorClass = a.type === 'danger' 
                ? 'border-rose-300 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                : a.type === 'warning'
                ? 'border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                : 'border-indigo-300 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300';
            
            return `
                <div class="p-3.5 rounded-xl border ${colorClass} flex items-start gap-3 shadow-sm mb-2">
                    <i class="${a.icon} text-lg mt-0.5"></i>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm">${a.title}</h4>
                        <p class="text-xs opacity-90 mt-0.5">${a.text}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAISuggestions(metrics) {
        const container = document.getElementById('aiSuggestionsContainer');
        if (!container) return;

        const health = AIAssistant.analyzeFinancialHealth(metrics, this.transactions, this.profile);
        
        container.innerHTML = health.suggestions.map(s => {
            const bgClass = s.type === 'danger' 
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
                : s.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200';

            return `
                <div class="p-3 rounded-xl border ${bgClass} transition-all hover:scale-[1.01]">
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-bold text-xs flex items-center gap-1.5">
                            <i class="fas fa-sparkles text-indigo-500"></i> ${s.title}
                        </span>
                        <span class="text-[10px] px-2 py-0.5 rounded bg-white/70 dark:bg-black/30 font-medium">AI Tip</span>
                    </div>
                    <p class="text-xs leading-relaxed opacity-90">${s.message}</p>
                </div>
            `;
        }).join('');
    }

    renderTransactionsList() {
        const container = document.getElementById('transactionsTableBody');
        if (!container) return;

        let filtered = [...this.transactions];

        // Type filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(t => t.type === this.currentFilter);
        }

        // Category filter
        if (this.currentCategoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategoryFilter);
        }

        // Search query
        if (this.searchQuery && this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.notes && t.notes.toLowerCase().includes(q)) ||
                (t.person && t.person.toLowerCase().includes(q)) ||
                (t.category && t.category.toLowerCase().includes(q))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-slate-400">
                        <i class="fas fa-search text-2xl mb-1 block"></i>
                        No transactions found.
                    </td>
                </tr>
            `;
            return;
        }

        const curr = this.profile.currency;

        container.innerHTML = filtered.map(t => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === t.category) || { name: t.category || 'General', icon: 'tag' };
            
            // Merchant Brand Detection
            let brandBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
            let brandIcon = `<i class="fas fa-${cat.icon || 'receipt'}"></i>`;
            const titleLower = (t.title || '').toLowerCase();
            
            if (titleLower.includes('swiggy')) {
                brandBg = 'bg-[#fc8019] text-white';
                brandIcon = `<span class="font-black text-xs">S</span>`;
            } else if (titleLower.includes('zomato')) {
                brandBg = 'bg-[#cb202d] text-white';
                brandIcon = `<span class="font-black text-xs">Z</span>`;
            } else if (titleLower.includes('amazon')) {
                brandBg = 'bg-[#131921] text-amber-400';
                brandIcon = `<i class="fab fa-amazon text-xs"></i>`;
            } else if (titleLower.includes('phonepe') || titleLower.includes('upi')) {
                brandBg = 'bg-[#5f259f] text-white';
                brandIcon = `<span class="font-black text-xs">पे</span>`;
            } else if (titleLower.includes('metro') || titleLower.includes('uber') || titleLower.includes('ola')) {
                brandBg = 'bg-emerald-600 text-white';
                brandIcon = `<i class="fas fa-subway text-xs"></i>`;
            } else if (titleLower.includes('chai') || titleLower.includes('tea') || titleLower.includes('coffee')) {
                brandBg = 'bg-amber-600 text-white';
                brandIcon = `<i class="fas fa-coffee text-xs"></i>`;
            } else if (titleLower.includes('bill') || titleLower.includes('electricity') || titleLower.includes('wifi')) {
                brandBg = 'bg-amber-500 text-white';
                brandIcon = `<i class="fas fa-bolt text-xs"></i>`;
            } else if (titleLower.includes('oil') || titleLower.includes('petrol') || titleLower.includes('fuel')) {
                brandBg = 'bg-blue-600 text-white';
                brandIcon = `<i class="fas fa-gas-pump text-xs"></i>`;
            }

            // Custom Icon & Badge for Peer Lending / Returning
            if (t.type === 'money_given') {
                brandBg = 'bg-amber-500 text-white';
                brandIcon = `<i class="fas fa-hand-holding-usd text-xs"></i>`;
            } else if (t.type === 'money_received_back') {
                brandBg = 'bg-emerald-500 text-white';
                brandIcon = `<i class="fas fa-coins text-xs"></i>`;
            } else if (t.type === 'money_borrowed') {
                brandBg = 'bg-purple-600 text-white';
                brandIcon = `<i class="fas fa-handshake text-xs"></i>`;
            } else if (t.type === 'money_repaid') {
                brandBg = 'bg-teal-600 text-white';
                brandIcon = `<i class="fas fa-undo text-xs"></i>`;
            }

            // Category Badge styling
            let catBadge = '';
            if (t.type === 'money_given') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Lent / Loan</span>`;
            } else if (t.type === 'money_received_back') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Returned</span>`;
            } else if (t.type === 'money_borrowed') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Borrowed</span>`;
            } else if (t.type === 'money_repaid') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">Repaid</span>`;
            } else if (t.category === 'food') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Food</span>`;
            } else if (t.category === 'shopping') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Shopping</span>`;
            } else if (t.category === 'transport') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">Transport</span>`;
            } else if (t.category === 'rent' || t.category === 'subscriptions') {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Bills</span>`;
            } else {
                catBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${escapeHtml(cat.name)}</span>`;
            }

            // Amount formatting
            const isNegative = t.type === 'expense' || t.type === 'money_given' || t.type === 'money_repaid';
            const amountPrefix = isNegative ? '- ' : '+ ';
            const amountClass = isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
            const amountFormatted = `${amountPrefix}${formatCurrency(t.amount, curr)}`;

            // Source tag: Auto or Manual
            const isAuto = (t.notes && t.notes.includes('UPI')) || titleLower.includes('phonepe') || titleLower.includes('upi') || t.isAllowance;
            const sourceBadge = isAuto 
                ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#dff5e9] text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Auto</span>`
                : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Manual</span>`;

            // Date format: e.g. "Apr 25, 2025"
            let formattedDate = t.date || 'Today';
            if (t.date && t.date.includes('-')) {
                try {
                    const d = new Date(t.date);
                    if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                } catch(e) {}
            }

            // Peer Debt Settlement Action / Badge
            let settleActionBtn = '';
            if (t.type === 'money_given') {
                const isLentSettled = t.isSettled || 
                    (t.debtId && this.debts.some(d => d.id === t.debtId && d.status === 'settled')) ||
                    this.transactions.some(tx => tx.type === 'money_received_back' && (tx.notes?.includes(t.title) || (t.person && tx.person?.toLowerCase() === t.person?.toLowerCase() && Number(tx.amount) === Number(t.amount))));
                
                if (isLentSettled) {
                    settleActionBtn = `
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mr-1.5 shadow-xs" title="Money returned & loan settled">
                            <i class="fas fa-check-circle text-emerald-500"></i> Returned
                        </span>
                    `;
                } else {
                    settleActionBtn = `
                        <button type="button" class="btn-return-money-tx px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-extrabold text-[10px] sm:text-xs shadow-sm inline-flex items-center gap-1 transition-all transform hover:scale-105 mr-1.5" data-id="${t.id}" title="Did ${escapeHtml(t.person || 'they')} return your money? Click to settle & credit ₹${t.amount} back to your balance">
                            <i class="fas fa-hand-holding-usd text-xs"></i> <span>Got Back</span>
                        </button>
                    `;
                }
            }

            return `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-1">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl ${brandBg} flex items-center justify-center flex-shrink-0 shadow-sm">
                                ${brandIcon}
                            </div>
                            <div class="min-w-0">
                                <span class="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[130px] sm:max-w-none">
                                    ${escapeHtml(t.title) || 'Untitled'}
                                </span>
                                ${t.person ? `<span class="text-[10px] text-slate-400">👤 ${escapeHtml(t.person)}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-2">
                        ${catBadge}
                    </td>
                    <td class="py-3 px-2 text-right font-mono font-extrabold ${amountClass} whitespace-nowrap">
                        ${amountFormatted}
                    </td>
                    <td class="py-3 px-2 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        ${formattedDate}
                    </td>
                    <td class="py-3 px-2 text-center">
                        ${sourceBadge}
                    </td>
                    <td class="py-3 px-2 text-right whitespace-nowrap">
                        ${settleActionBtn}
                        <button type="button" class="btn-delete-tx text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block" data-id="${t.id}" title="Delete transaction">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach action events
        container.querySelectorAll('.btn-return-money-tx').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.markMoneyGivenReturned(id);
            };
        });

        container.querySelectorAll('.btn-delete-tx').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.deleteTransaction(id);
            };
        });
    }

    renderDebts() {
        PeerDebtsManager.renderDebtsTable(
            this.debts,
            this.profile,
            (id) => this.settleDebt(id),
            (id) => this.openDebtReminderModal(id),
            (id) => this.deleteDebt(id)
        );
    }

    // ==========================================
    // Event Handlers & State Mutations
    // ==========================================
    addTransaction(txData) {
        const newTx = StorageManager.addTransaction(txData);
        this.transactions = StorageManager.getTransactions();

        // Also check if this was a lending or borrowing action
        if (newTx.type === 'money_given' && newTx.person && !newTx.debtId) {
            const addedDebt = StorageManager.addDebt({
                type: 'given',
                person: newTx.person,
                amount: newTx.amount,
                date: newTx.date,
                dueDate: newTx.dueDate || '',
                reason: newTx.title,
                txId: newTx.id
            });
            newTx.debtId = addedDebt.id;
            StorageManager.saveTransactions(this.transactions);
            this.debts = StorageManager.getDebts();
        } else if (newTx.type === 'money_borrowed' && newTx.person && !newTx.debtId) {
            const addedDebt = StorageManager.addDebt({
                type: 'borrowed',
                person: newTx.person,
                amount: newTx.amount,
                date: newTx.date,
                dueDate: newTx.dueDate || '',
                reason: newTx.title,
                txId: newTx.id
            });
            newTx.debtId = addedDebt.id;
            StorageManager.saveTransactions(this.transactions);
            this.debts = StorageManager.getDebts();
        }

        this.refreshAll();
        this.triggerConfettiIfAppropriate(newTx);
    }

    deleteTransaction(id) {
        const targetTx = this.transactions.find(t => t.id === id);
        if (targetTx && targetTx.debtId) {
            let currentDebts = StorageManager.getDebts();
            currentDebts = currentDebts.filter(d => d.id !== targetTx.debtId);
            StorageManager.saveDebts(currentDebts);
            this.debts = currentDebts;
        }
        this.transactions = StorageManager.deleteTransaction(id);
        this.refreshAll();
    }

    playCashChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.setValueAtTime(880.00, now + 0.1); // A5

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, now + 0.1);
            osc2.frequency.setValueAtTime(1174.66, now + 0.2); // D6

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now + 0.1);
            osc1.stop(now + 0.6);
            osc2.stop(now + 0.6);
        } catch (e) {
            // Audio context not allowed or unsupported
        }
    }

    showToast(message, type = 'success') {
        let container = document.getElementById('gullakToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gullakToastContainer';
            container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto transform translate-y-4 opacity-0 transition-all duration-300 ease-out px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold ' + 
            (type === 'success' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/40 shadow-emerald-500/20' 
                : 'bg-slate-900 dark:bg-slate-800 text-white border border-slate-700');
        
        toast.innerHTML = `
            <div class="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-check text-xs"></i>
            </div>
            <div class="flex-1">${message}</div>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-2', 'opacity-0');
            setTimeout(() => toast.remove(), 350);
        }, 4000);
    }

    settleDebt(id) {
        const settledDebt = StorageManager.settleDebt(id);
        if (settledDebt) {
            // If associated with a transaction, mark tx as settled too
            if (settledDebt.txId) {
                const targetTx = this.transactions.find(t => t.id === settledDebt.txId);
                if (targetTx) {
                    targetTx.isSettled = true;
                    targetTx.settledAt = new Date().toISOString();
                }
            } else if (settledDebt.person) {
                const matchTx = this.transactions.find(t => 
                    t.type === 'money_given' && 
                    t.person?.toLowerCase() === settledDebt.person?.toLowerCase() && 
                    !t.isSettled
                );
                if (matchTx) {
                    matchTx.isSettled = true;
                    matchTx.settledAt = new Date().toISOString();
                }
            }

            // Auto add compensating transaction
            if (settledDebt.type === 'given' || settledDebt.type === 'lent') {
                this.addTransaction({
                    type: 'money_received_back',
                    amount: settledDebt.amount,
                    category: 'social',
                    title: `Money Returned by ${settledDebt.person}`,
                    person: settledDebt.person,
                    date: new Date().toISOString().split('T')[0],
                    notes: `Settled peer loan for "${settledDebt.reason || 'Debt'}"`
                });
            } else if (settledDebt.type === 'borrowed') {
                this.addTransaction({
                    type: 'money_repaid',
                    amount: settledDebt.amount,
                    category: 'emergency',
                    title: `Repaid Debt to ${settledDebt.person}`,
                    person: settledDebt.person,
                    date: new Date().toISOString().split('T')[0],
                    notes: `Settled debt owed for "${settledDebt.reason || 'Debt'}"`
                });
            }

            StorageManager.saveTransactions(this.transactions);
            this.debts = StorageManager.getDebts();
            this.refreshAll();

            this.playCashChime();
            if (typeof confetti === 'function') {
                confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
            }
            this.showToast(`🎉 Debt settled! ₹${Number(settledDebt.amount).toLocaleString('en-IN')} returned by ${settledDebt.person} and added to balance.`);
        }
    }

    markMoneyGivenReturned(txId) {
        const tx = this.transactions.find(t => t.id === txId);
        if (!tx) return;

        if (tx.isSettled) {
            this.showToast('ℹ️ This loan has already been marked as returned.');
            return;
        }

        // Mark transaction as settled
        tx.isSettled = true;
        tx.settledAt = new Date().toISOString();

        // Settle associated debt if found
        if (tx.debtId) {
            StorageManager.settleDebt(tx.debtId);
        } else if (tx.person) {
            const matchDebt = this.debts.find(d => 
                (d.type === 'given' || d.type === 'lent') && 
                d.person?.toLowerCase() === tx.person?.toLowerCase() && 
                d.status !== 'settled'
            );
            if (matchDebt) {
                StorageManager.settleDebt(matchDebt.id);
            }
        }

        // Add compensating 'money_received_back' transaction
        const personName = tx.person || 'Friend';
        const returnedTx = {
            type: 'money_received_back',
            amount: Number(tx.amount) || 0,
            category: 'social',
            title: `Money Returned by ${personName}`,
            person: personName,
            date: new Date().toISOString().split('T')[0],
            notes: `Settled loan: "${tx.title || 'Money Given'}"`
        };

        this.addTransaction(returnedTx);
        StorageManager.saveTransactions(this.transactions);
        this.debts = StorageManager.getDebts();
        this.refreshAll();

        // Audio chime + confetti + toast
        this.playCashChime();
        if (typeof confetti === 'function') {
            confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
        }
        this.showToast(`🎉 Awesome! ${personName} returned ₹${Number(tx.amount).toLocaleString('en-IN')}. Added back to your balance!`);
    }

    openQuickSettleModal() {
        const list = document.getElementById('quickSettleItemsList');
        if (!list) return;

        // Find all pending lent debts or unsettled money_given transactions
        const pendingLentDebts = this.debts.filter(d => (d.type === 'given' || d.type === 'lent') && d.status !== 'settled');
        const unsettledTxs = this.transactions.filter(t => t.type === 'money_given' && !t.isSettled && !pendingLentDebts.some(d => d.txId === t.id || d.id === t.debtId));

        const allPending = [
            ...pendingLentDebts.map(d => ({
                id: d.id,
                isDebt: true,
                person: d.person || 'Friend',
                amount: d.amount,
                title: d.reason || 'Money Given',
                date: d.date
            })),
            ...unsettledTxs.map(t => ({
                id: t.id,
                isDebt: false,
                person: t.person || 'Friend',
                amount: t.amount,
                title: t.title || 'Money Lent',
                date: t.date
            }))
        ];

        if (allPending.length === 0) {
            list.innerHTML = `
                <div class="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                    <div class="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
                        <i class="fas fa-check-double"></i>
                    </div>
                    <p class="font-extrabold text-sm text-slate-800 dark:text-slate-200">You're All Settled Up!</p>
                    <p class="mt-1 text-slate-500 dark:text-slate-400">No outstanding money lent to friends right now.</p>
                </div>
            `;
        } else {
            list.innerHTML = allPending.map(item => `
                <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-3 hover:border-emerald-400 transition-all">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                            ${(item.person || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div class="min-w-0">
                            <span class="font-extrabold text-xs text-slate-900 dark:text-white block truncate">${escapeHtml(item.person)}</span>
                            <span class="text-[10px] text-slate-500 dark:text-slate-400 block truncate">${escapeHtml(item.title)} • ${escapeHtml(item.date || 'Recent')}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2.5 flex-shrink-0">
                        <span class="font-mono font-extrabold text-xs text-amber-600 dark:text-amber-400">${formatCurrency(item.amount, this.profile.currency)}</span>
                        <button type="button" class="btn-quick-settle-item px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all" data-id="${item.id}" data-is-debt="${item.isDebt}">
                            <i class="fas fa-hand-holding-usd text-xs"></i>
                            <span>Got Back</span>
                        </button>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.btn-quick-settle-item').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const isDebt = e.currentTarget.getAttribute('data-is-debt') === 'true';
                    if (isDebt) {
                        this.settleDebt(id);
                    } else {
                        this.markMoneyGivenReturned(id);
                    }
                    this.openQuickSettleModal(); // refresh list inside modal
                };
            });
        }

        this.openModal('quickSettleModal');
    }



    deleteDebt(id) {
        let currentDebts = StorageManager.getDebts();
        const targetDebt = currentDebts.find(d => d.id === id);
        if (targetDebt && targetDebt.txId) {
            this.transactions = StorageManager.deleteTransaction(targetDebt.txId);
        }
        currentDebts = currentDebts.filter(d => d.id !== id);
        StorageManager.saveDebts(currentDebts);
        this.debts = currentDebts;
        this.refreshAll();
    }

    updateProfile(newProfileData) {
        this.profile = { ...this.profile, ...newProfileData };
        StorageManager.saveProfile(this.profile);
        this.refreshAll();
    }

    applyTheme(theme) {
        this.profile.theme = theme;
        StorageManager.saveProfile(this.profile);

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            const themeBtn = document.getElementById('themeToggleBtn');
            if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun text-amber-300"></i>';
        } else {
            document.documentElement.classList.remove('dark');
            const themeBtn = document.getElementById('themeToggleBtn');
            if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon text-lavender-600"></i>';
        }

        if (typeof ChartManager !== 'undefined') {
            const metrics = this.calculateMetrics();
            ChartManager.updateAllCharts(metrics, this.transactions, this.profile);
        }
    }

    toggleTheme() {
        const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        this.applyTheme(next);
    }

    triggerConfettiIfAppropriate(tx) {
        if (typeof confetti === 'function') {
            if (tx.type === 'inflow' || tx.type === 'money_received_back') {
                confetti({
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.7 }
                });
            }
        }
    }

    setText(elemId, text) {
        const elem = document.getElementById(elemId);
        if (elem) elem.textContent = text;
    }

    // ==========================================
    // Modal Helpers
    // ==========================================
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    openDebtReminderModal(debtId) {
        const debt = this.debts.find(d => d.id === debtId);
        if (!debt) return;
        this.selectedDebtForReminder = debt;

        const modal = document.getElementById('reminderModal');
        document.getElementById('reminderFriendName').textContent = debt.person || 'Friend';
        document.getElementById('reminderAmount').textContent = formatCurrency(debt.amount, this.profile.currency);

        this.updateReminderTone('friendly');
        this.openModal('reminderModal');
    }

    updateReminderTone(tone) {
        if (!this.selectedDebtForReminder) return;
        const msg = AIAssistant.generateDebtReminder(this.selectedDebtForReminder, this.profile, tone);
        document.getElementById('reminderMessageText').value = msg;
    }

    // ==========================================
    // Event Binding Engine
    // ==========================================
    bindEvents() {
        // Student / User Login Form Submit
        document.getElementById('studentLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('loginStudentName').value.trim();
            const college = document.getElementById('loginCollegeName')?.value?.trim() || 'Personal Account';
            const allowance = parseFloat(document.getElementById('loginPocketMoney').value) || 0;
            const currency = document.getElementById('loginCurrency').value || '₹';
            const dateReceived = document.getElementById('loginDateReceived').value || new Date().toISOString().split('T')[0];
            const nextPaymentDate = document.getElementById('loginNextDate').value || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
            const monthlyBudget = parseFloat(document.getElementById('loginMonthlyBudget').value) || 0;
            const avatarEmoji = document.getElementById('loginAvatarEmoji').value || '🪙';
            
            const startMode = document.querySelector('input[name="loginStartMode"]:checked')?.value || 'fresh';

            if (!name || allowance <= 0) {
                alert('Please enter your name and a valid monthly allowance amount.');
                return;
            }

            StorageManager.setupNewUser({
                studentName: name,
                collegeName: college,
                monthlyAllowance: allowance,
                currency,
                dateReceived,
                nextPaymentDate,
                monthlyBudget,
                avatarEmoji
            }, startMode === 'fresh');

            this.profile = StorageManager.getProfile();
            this.transactions = StorageManager.getTransactions();
            this.debts = StorageManager.getDebts();

            this.checkLoginState();
            
            // Celebration confetti on login
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 80,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            }
        });

        // Avatar Selection in Login Page
        document.querySelectorAll('.btn-avatar-choice').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.btn-avatar-choice').forEach(b => {
                    b.classList.remove('bg-indigo-500', 'text-white', 'border-indigo-500');
                    b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'border-transparent');
                });
                const chosen = e.currentTarget;
                chosen.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'border-transparent');
                chosen.classList.add('bg-indigo-500', 'text-white', 'border-indigo-500');
                const emoji = chosen.getAttribute('data-emoji') || '🎓';
                document.getElementById('loginAvatarEmoji').value = emoji;
            };
        });

        // Switch Student / Logout
        document.getElementById('btnSwitchStudent')?.addEventListener('click', () => {
            document.getElementById('userMenuDropdown')?.classList.add('hidden');
            this.showLoginScreen();
        });

        document.getElementById('btnLogout')?.addEventListener('click', () => {
            document.getElementById('userMenuDropdown')?.classList.add('hidden');
            StorageManager.logout();
            this.profile = StorageManager.getProfile();
            this.showLoginScreen();
        });

        // Theme toggle
        document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

        // Currency Selector
        document.getElementById('currencySelector')?.addEventListener('change', (e) => {
            this.profile.currency = e.target.value;
            StorageManager.saveProfile(this.profile);
            this.refreshAll();
        });

        // Allowance Setup Trigger
        document.getElementById('btnOpenAllowanceSetup')?.addEventListener('click', () => {
            document.getElementById('setupStudentName').value = this.profile.studentName || '';
            if (document.getElementById('setupCollegeName')) {
                document.getElementById('setupCollegeName').value = this.profile.collegeName || '';
            }
            document.getElementById('setupAllowance').value = this.profile.monthlyAllowance || '';
            document.getElementById('setupDateReceived').value = this.profile.dateReceived || '';
            document.getElementById('setupNextDate').value = this.profile.nextPaymentDate || '';
            document.getElementById('setupMonthlyBudget').value = this.profile.monthlyBudget || '';
            this.openModal('allowanceSetupModal');
        });

        // Save Allowance Setup Form
        document.getElementById('allowanceSetupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const updated = {
                studentName: document.getElementById('setupStudentName').value,
                collegeName: document.getElementById('setupCollegeName')?.value || this.profile.collegeName || 'Personal Account',
                monthlyAllowance: parseFloat(document.getElementById('setupAllowance').value) || 0,
                dateReceived: document.getElementById('setupDateReceived').value,
                nextPaymentDate: document.getElementById('setupNextDate').value,
                monthlyBudget: parseFloat(document.getElementById('setupMonthlyBudget').value) || 0
            };
            this.updateProfile(updated);
            this.closeModal('allowanceSetupModal');
        });

        // Transaction Type Switcher inside Add Modal
        document.getElementById('txTypeSelect')?.addEventListener('change', (e) => {
            const val = e.target.value;
            const personField = document.getElementById('txPersonFieldGroup');
            const categoryField = document.getElementById('txCategoryFieldGroup');
            
            if (['money_given', 'money_borrowed', 'money_repaid', 'money_received_back'].includes(val)) {
                if (personField) personField.classList.remove('hidden');
            } else {
                if (personField) personField.classList.add('hidden');
            }
        });

        // Add Transaction Form
        document.getElementById('addTransactionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const txType = document.getElementById('txTypeSelect').value;
            const amount = parseFloat(document.getElementById('txAmountInput').value) || 0;
            const title = document.getElementById('txTitleInput').value.trim();
            const category = document.getElementById('txCategorySelect').value;
            const date = document.getElementById('txDateInput').value || new Date().toISOString().split('T')[0];
            const person = document.getElementById('txPersonInput').value.trim();
            const notes = document.getElementById('txNotesInput').value.trim();

            if (amount <= 0 || !title) {
                alert('Please enter a valid amount and description.');
                return;
            }

            this.addTransaction({
                type: txType,
                amount,
                title,
                category,
                date,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                person,
                notes
            });

            e.target.reset();
            document.getElementById('txDateInput').value = new Date().toISOString().split('T')[0];
            this.closeModal('addTransactionModal');
        });

        // Open Add Transaction Modal
        document.getElementById('btnOpenAddTx')?.addEventListener('click', () => {
            document.getElementById('txDateInput').value = new Date().toISOString().split('T')[0];
            this.openModal('addTransactionModal');
        });

        // Quick Settle / Money Returned Modal
        document.getElementById('btnOpenQuickSettle')?.addEventListener('click', () => {
            this.openQuickSettleModal();
        });

        // AI Natural Language Quick Add Modal
        document.getElementById('btnOpenAIQuickAdd')?.addEventListener('click', () => {
            document.getElementById('aiQuickAddInput').value = '';
            document.getElementById('aiParsedPreview').classList.add('hidden');
            this.openModal('aiQuickAddModal');
        });

        // Process Natural Language Input
        document.getElementById('aiQuickAddInput')?.addEventListener('input', (e) => {
            const val = e.target.value;
            const parsed = AIAssistant.parseNaturalLanguage(val);
            const previewBox = document.getElementById('aiParsedPreview');

            if (parsed && parsed.amount > 0) {
                previewBox.classList.remove('hidden');
                document.getElementById('parsedType').textContent = parsed.type.toUpperCase();
                document.getElementById('parsedAmount').textContent = formatCurrency(parsed.amount, this.profile.currency);
                document.getElementById('parsedCategory').textContent = parsed.category;
                document.getElementById('parsedPerson').textContent = parsed.person || 'N/A';
            } else {
                previewBox.classList.add('hidden');
            }
        });

        // Confirm AI Quick Add
        document.getElementById('btnConfirmAIQuickAdd')?.addEventListener('click', () => {
            const val = document.getElementById('aiQuickAddInput').value;
            const parsed = AIAssistant.parseNaturalLanguage(val);
            if (!parsed || parsed.amount <= 0) {
                alert('Could not parse an amount. E.g. "Spent 150 on snacks with Rahul"');
                return;
            }

            this.addTransaction({
                type: parsed.type,
                amount: parsed.amount,
                title: parsed.title,
                category: parsed.category,
                person: parsed.person,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                notes: 'Logged via Natural Language AI'
            });

            this.closeModal('aiQuickAddModal');
        });

        // Purchase Simulator Modal Trigger
        document.getElementById('btnOpenSimulator')?.addEventListener('click', () => {
            document.getElementById('simItemName').value = '';
            document.getElementById('simItemCost').value = '';
            document.getElementById('simulatorResultCard').classList.add('hidden');
            this.openModal('purchaseSimulatorModal');
        });

        // Run Purchase Simulator
        document.getElementById('btnRunSimulator')?.addEventListener('click', () => {
            const name = document.getElementById('simItemName').value.trim() || 'Target Purchase';
            const cost = parseFloat(document.getElementById('simItemCost').value) || 0;
            const metrics = this.calculateMetrics();

            const result = AIAssistant.simulatePurchase(cost, name, metrics, this.profile);
            const card = document.getElementById('simulatorResultCard');
            card.classList.remove('hidden');

            document.getElementById('simVerdictBadge').textContent = result.badge;
            document.getElementById('simVerdictMessage').textContent = result.message;
            document.getElementById('simRecommendation').textContent = result.recommendation;
        });

        // Debt Reminder Tone Switchers
        document.querySelectorAll('.btn-tone-choice').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.btn-tone-choice').forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
                e.currentTarget.classList.add('bg-indigo-600', 'text-white');
                const tone = e.currentTarget.getAttribute('data-tone');
                this.updateReminderTone(tone);
            };
        });

        // Copy Reminder Text
        document.getElementById('btnCopyReminder')?.addEventListener('click', () => {
            const textarea = document.getElementById('reminderMessageText');
            textarea.select();
            navigator.clipboard.writeText(textarea.value);
            const btn = document.getElementById('btnCopyReminder');
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy Message'; }, 2000);
        });

        // WhatsApp Direct Share
        document.getElementById('btnShareWhatsApp')?.addEventListener('click', () => {
            const text = encodeURIComponent(document.getElementById('reminderMessageText').value);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });

        // AI Copilot Chat Drawer
        document.getElementById('btnToggleAIChat')?.addEventListener('click', () => {
            const drawer = document.getElementById('aiChatDrawer');
            drawer.classList.toggle('translate-x-full');
        });

        document.getElementById('btnCloseAIChat')?.addEventListener('click', () => {
            document.getElementById('aiChatDrawer').classList.add('translate-x-full');
        });

        // Chat Input & Send
        const sendChatMessage = async () => {
            const input = document.getElementById('aiChatInput');
            const q = input.value.trim();
            if (!q) return;

            const chatLogs = document.getElementById('aiChatMessages');
            
            // Append User Bubble (HTML escaped for security)
            chatLogs.innerHTML += `
                <div class="flex justify-end mb-3">
                    <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[80%] text-xs shadow-sm">
                        ${escapeHtml(q)}
                    </div>
                </div>
            `;

            input.value = '';
            chatLogs.scrollTop = chatLogs.scrollHeight;

            // Loading indicator
            const loadingId = 'ai-loading-' + Date.now();
            chatLogs.innerHTML += `
                <div id="${loadingId}" class="flex items-start gap-2 mb-3">
                    <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px]">🤖</div>
                    <div class="chat-bubble-ai rounded-2xl rounded-tl-none px-4 py-2 text-xs text-slate-600 dark:text-slate-300">
                        <i class="fas fa-circle-notch fa-spin mr-1 text-indigo-500"></i> Thinking...
                    </div>
                </div>
            `;
            chatLogs.scrollTop = chatLogs.scrollHeight;

            const metrics = this.calculateMetrics();
            const answer = await AIAssistant.askCopilot(q, {
                metrics,
                transactions: this.transactions,
                profile: this.profile,
                debts: this.debts
            });

            // Replace loading with final bubble
            const loadingElem = document.getElementById(loadingId);
            if (loadingElem) {
                const parsedHtml = (typeof marked !== 'undefined') ? marked.parse(answer) : answer.replace(/\n/g, '<br>');
                const safeHtml = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(parsedHtml) : escapeHtml(answer);

                loadingElem.outerHTML = `
                    <div class="flex items-start gap-2 mb-3">
                        <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] shadow-sm">🤖</div>
                        <div class="chat-bubble-ai rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-700 dark:text-slate-200 leading-relaxed shadow-sm">
                            ${safeHtml}
                        </div>
                    </div>
                `;
            }
            chatLogs.scrollTop = chatLogs.scrollHeight;
        };

        document.getElementById('btnSendAIChat')?.addEventListener('click', sendChatMessage);
        document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });

        // Filter buttons on transactions table
        document.querySelectorAll('.btn-tx-filter').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.btn-tx-filter').forEach(b => b.classList.remove('bg-indigo-600', 'text-white', 'dark:bg-indigo-600'));
                e.currentTarget.classList.add('bg-indigo-600', 'text-white', 'dark:bg-indigo-600');
                this.currentFilter = e.currentTarget.getAttribute('data-type');
                this.renderTransactionsList();
            };
        });

        // Search Input
        document.getElementById('searchTransactionsInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTransactionsList();
        });

        // Category Filter Select
        document.getElementById('filterCategorySelect')?.addEventListener('change', (e) => {
            this.currentCategoryFilter = e.target.value;
            this.renderTransactionsList();
        });

        // Export Data
        document.getElementById('btnExportJSON')?.addEventListener('click', () => StorageManager.exportDataJSON());
        document.getElementById('btnExportCSV')?.addEventListener('click', () => StorageManager.exportTransactionsCSV());
        document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());

        // Import Data Trigger
        document.getElementById('btnImportJSON')?.addEventListener('click', () => {
            document.getElementById('fileImportInput').click();
        });

        document.getElementById('fileImportInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const ok = StorageManager.importDataJSON(event.target.result);
                if (ok) {
                    this.profile = StorageManager.getProfile();
                    this.transactions = StorageManager.getTransactions();
                    this.debts = StorageManager.getDebts();
                    this.refreshAll();
                    alert('Data imported successfully!');
                } else {
                    alert('Invalid JSON file format.');
                }
            };
            reader.readAsText(file);
        });

        // Reset to default mock data
        document.getElementById('btnResetSampleData')?.addEventListener('click', () => {
            if (confirm('Reset to realistic sample student data? This will overwrite your current dataset.')) {
                StorageManager.resetToSampleData();
                this.profile = StorageManager.getProfile();
                this.transactions = StorageManager.getTransactions();
                this.debts = StorageManager.getDebts();
                this.refreshAll();
            }
        });

        // Settings Modal Open
        const openSettingsModal = () => {
            const settings = StorageManager.getSettings();
            const apiKeyInput = document.getElementById('settingsGeminiApiKey');
            const soundCheckbox = document.getElementById('settingsSoundEffects');
            const autoSuggestCheckbox = document.getElementById('settingsAutoSuggestions');
            const testStatus = document.getElementById('apiKeyTestStatus');

            if (apiKeyInput) apiKeyInput.value = settings.geminiApiKey || '';
            if (soundCheckbox) soundCheckbox.checked = settings.soundEffects !== false;
            if (autoSuggestCheckbox) autoSuggestCheckbox.checked = settings.autoSuggestions !== false;
            if (testStatus) {
                testStatus.classList.add('hidden');
                testStatus.textContent = '';
            }

            document.getElementById('userMenuDropdown')?.classList.add('hidden');
            this.openModal('settingsModal');
        };

        document.getElementById('btnOpenSettings')?.addEventListener('click', openSettingsModal);
        document.getElementById('btnOpenSettingsFromChat')?.addEventListener('click', openSettingsModal);

        // Toggle API Key Visibility
        document.getElementById('btnToggleApiKeyVisibility')?.addEventListener('click', () => {
            const input = document.getElementById('settingsGeminiApiKey');
            const icon = document.getElementById('apiKeyEyeIcon');
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });

        // Test Gemini API Key
        document.getElementById('btnTestGeminiKey')?.addEventListener('click', async () => {
            const key = document.getElementById('settingsGeminiApiKey')?.value.trim();
            const statusDiv = document.getElementById('apiKeyTestStatus');
            if (!statusDiv) return;

            statusDiv.classList.remove('hidden', 'bg-rose-100', 'text-rose-800', 'dark:bg-rose-950/40', 'dark:text-rose-300', 'bg-emerald-100', 'text-emerald-800', 'dark:bg-emerald-950/40', 'dark:text-emerald-300', 'bg-slate-100', 'text-slate-700');

            if (!key) {
                statusDiv.classList.add('bg-rose-100', 'text-rose-800', 'dark:bg-rose-950/40', 'dark:text-rose-300');
                statusDiv.innerHTML = '<i class="fas fa-exclamation-circle text-rose-500"></i> Please enter an API key to test.';
                return;
            }

            statusDiv.classList.add('bg-slate-100', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
            statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin text-indigo-500"></i> Verifying with Gemini API...';

            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
                    })
                });

                if (res.ok) {
                    statusDiv.classList.remove('bg-slate-100', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
                    statusDiv.classList.add('bg-emerald-100', 'text-emerald-800', 'dark:bg-emerald-950/40', 'dark:text-emerald-300');
                    statusDiv.innerHTML = '<i class="fas fa-check-circle text-emerald-500"></i> Connection successful! Key is valid.';
                } else {
                    const errData = await res.json().catch(() => ({}));
                    statusDiv.classList.remove('bg-slate-100', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
                    statusDiv.classList.add('bg-rose-100', 'text-rose-800', 'dark:bg-rose-950/40', 'dark:text-rose-300');
                    statusDiv.innerHTML = `<i class="fas fa-times-circle text-rose-500"></i> Validation failed (${res.status}): ${escapeHtml(errData.error?.message || 'Invalid key')}`;
                }
            } catch (err) {
                statusDiv.classList.remove('bg-slate-100', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
                statusDiv.classList.add('bg-rose-100', 'text-rose-800', 'dark:bg-rose-950/40', 'dark:text-rose-300');
                statusDiv.innerHTML = `<i class="fas fa-wifi text-rose-500"></i> Network error: ${escapeHtml(err.message)}`;
            }
        });

        // Save Settings Form
        document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const geminiApiKey = document.getElementById('settingsGeminiApiKey')?.value.trim() || '';
            const soundEffects = document.getElementById('settingsSoundEffects')?.checked ?? true;
            const autoSuggestions = document.getElementById('settingsAutoSuggestions')?.checked ?? true;

            StorageManager.saveSettings({
                geminiApiKey,
                soundEffects,
                autoSuggestions
            });

            this.closeModal('settingsModal');
            alert('Settings updated successfully!');
        });

        // ==========================================
        // PhonePe & UPI Auto-Sync Hub Events
        // ==========================================
        const openUpiSyncModal = () => {
            document.getElementById('userMenuDropdown')?.classList.add('hidden');
            const rawInput = document.getElementById('upiRawTextInput');
            if (rawInput) rawInput.value = '';
            document.getElementById('upiParsedPreview')?.classList.add('hidden');
            this.pendingUpiTx = null;
            this.openModal('upiSyncModal');
        };

        document.getElementById('btnOpenUpiSync')?.addEventListener('click', openUpiSyncModal);
        document.getElementById('btnHeroOpenUpiSync')?.addEventListener('click', openUpiSyncModal);
        document.getElementById('btnMenuUpiSync')?.addEventListener('click', openUpiSyncModal);

        // Tab switcher in UPI Sync Hub
        document.querySelectorAll('.btn-upi-tab').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.btn-upi-tab').forEach(b => {
                    b.classList.remove('bg-white', 'dark:bg-warmDark-800', 'text-lavender-700', 'dark:text-lavender-300', 'shadow-sm');
                    b.classList.add('text-stone-600', 'dark:text-stone-400');
                });
                e.currentTarget.classList.add('bg-white', 'dark:bg-warmDark-800', 'text-lavender-700', 'dark:text-lavender-300', 'shadow-sm');
                e.currentTarget.classList.remove('text-stone-600', 'dark:text-stone-400');

                const targetTabId = e.currentTarget.getAttribute('data-tab');
                document.querySelectorAll('.upi-tab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(targetTabId)?.classList.remove('hidden');
            };
        });

        // Real-time Bank SMS / PhonePe Raw Text Parsing
        document.getElementById('upiRawTextInput')?.addEventListener('input', (e) => {
            const val = e.target.value;
            const parsed = AIAssistant.parseBankOrPhonePeSMS(val);
            const preview = document.getElementById('upiParsedPreview');

            if (parsed && parsed.amount > 0) {
                this.pendingUpiTx = parsed;
                preview.classList.remove('hidden');

                const typeBadge = document.getElementById('upiParsedTypeBadge');
                if (parsed.type === 'inflow') {
                    typeBadge.textContent = 'CREDIT / INFLOW';
                    typeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
                } else {
                    typeBadge.textContent = 'DEBIT / EXPENSE';
                    typeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
                }

                document.getElementById('upiParsedAmount').textContent = formatCurrency(parsed.amount, this.profile.currency);
                document.getElementById('upiParsedVendor').textContent = parsed.vendor || 'UPI Payment';
                document.getElementById('upiParsedCategory').textContent = parsed.category;
                document.getElementById('upiParsedBalance').textContent = parsed.remainingBalance ? formatCurrency(parsed.remainingBalance, this.profile.currency) : 'Unchanged';
            } else {
                this.pendingUpiTx = null;
                preview.classList.add('hidden');
            }
        });

        // Confirm UPI / SMS parsed transaction
        document.getElementById('btnConfirmUpiSync')?.addEventListener('click', () => {
            if (!this.pendingUpiTx || !this.pendingUpiTx.amount) {
                alert('No valid transaction parsed. Please paste an SMS or PhonePe alert.');
                return;
            }

            const tx = this.pendingUpiTx;
            this.addTransaction({
                type: tx.type,
                amount: tx.amount,
                title: tx.title,
                category: tx.category,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                notes: `Auto-synced from ${tx.source || 'PhonePe'}${tx.refId ? ' • Ref: ' + tx.refId : ''}`
            });

            this.closeModal('upiSyncModal');
            document.getElementById('upiRawTextInput').value = '';
            document.getElementById('upiParsedPreview')?.classList.add('hidden');
            const balanceNote = tx.remainingBalance ? `\nVerified Bank Balance: ${formatCurrency(tx.remainingBalance, this.profile.currency)}` : '';
            this.pendingUpiTx = null;

            alert(`⚡ Transaction Synced successfully!${balanceNote}`);
        });

        // 1-Click Simulation Buttons
        document.querySelectorAll('.btn-simulate-txn').forEach(btn => {
            btn.onclick = (e) => {
                const sms = e.currentTarget.getAttribute('data-sms');
                const parsed = AIAssistant.parseBankOrPhonePeSMS(sms);
                if (parsed) {
                    this.addTransaction({
                        type: parsed.type,
                        amount: parsed.amount,
                        title: parsed.title,
                        category: parsed.category,
                        date: new Date().toISOString().split('T')[0],
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        notes: `Simulated PhonePe alert: "${sms.slice(0, 45)}..."`
                    });
                    this.closeModal('upiSyncModal');
                    alert(`⚡ Simulated PhonePe payment logged: ${parsed.title} (${formatCurrency(parsed.amount, this.profile.currency)})`);
                }
            };
        });

        // Copy Google Apps Script Template
        document.getElementById('btnCopyEmailScript')?.addEventListener('click', () => {
            const scriptCode = `// -------------------------------------------------------------
// Google Apps Script: Auto-forward Bank & PhonePe Alert Emails to StudentSpend
// -------------------------------------------------------------
function checkBankEmails() {
  // Finds unread debit alert emails from HDFC, SBI, ICICI, PhonePe, Paytm
  var threads = GmailApp.search('is:unread (subject:"Transaction alert" OR subject:"debited" OR from:phonepe OR from:hdfcbank OR from:sbi)');
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      if (msg.isUnread()) {
        var body = msg.getPlainBody();
        Logger.log("Parsed Bank Alert: " + body);
        // Mark as read after reading
        msg.markRead();
      }
    }
  }
}`;
            navigator.clipboard.writeText(scriptCode);
            const btn = document.getElementById('btnCopyEmailScript');
            btn.innerHTML = '<i class="fas fa-check text-emerald-500"></i> Copied to Clipboard!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy text-lavender-500"></i> Copy Google Apps Script Template';
            }, 2500);
        });

        // Screenshot Dropzone & Paste Handler
        const dropzone = document.getElementById('receiptDropzone');
        const fileInput = document.getElementById('receiptFileInput');
        const scanBtn = document.getElementById('btnScanReceipt');

        dropzone?.addEventListener('click', () => fileInput?.click());

        const handleImageFile = (file) => {
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.receiptBase64 = e.target.result;
                const previewImg = document.getElementById('receiptImagePreview');
                if (previewImg) previewImg.src = e.target.result;
                document.getElementById('dropzoneEmpty')?.classList.add('hidden');
                document.getElementById('dropzonePreview')?.classList.remove('hidden');
                document.getElementById('receiptFileName').textContent = file.name || 'Pasted PhonePe Receipt';
                if (scanBtn) scanBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        };

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageFile(e.target.files[0]);
            }
        });

        dropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-active');
        });

        dropzone?.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-active');
        });

        dropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-active');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageFile(e.dataTransfer.files[0]);
            }
        });

        // Global Paste Listener for Screenshots (Cmd + V)
        window.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    this.openModal('upiSyncModal');
                    // Switch to screenshot tab
                    document.querySelectorAll('.btn-upi-tab').forEach(b => {
                        if (b.getAttribute('data-tab') === 'tab-screenshot-ocr') {
                            b.click();
                        }
                    });
                    handleImageFile(blob);
                    break;
                }
            }
        });

        // Scan Receipt Button Click
        scanBtn?.addEventListener('click', async () => {
            if (!this.receiptBase64) return;
            scanBtn.disabled = true;
            scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Scanning with AI...';

            const settings = StorageManager.getSettings();
            try {
                const parsed = await AIAssistant.parsePhonePeScreenshot(this.receiptBase64, settings.geminiApiKey);
                this.addTransaction({
                    type: parsed.type || 'expense',
                    amount: parsed.amount,
                    title: parsed.title,
                    category: parsed.category,
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    notes: `Scanned from PhonePe receipt • Ref: ${parsed.refId || 'N/A'}`
                });

                this.closeModal('upiSyncModal');
                alert(`✅ Receipt Scanned!\nLogged: ${parsed.title} (${formatCurrency(parsed.amount, this.profile.currency)})`);
            } catch (err) {
                alert('Could not scan receipt. Please enter the details manually or paste the SMS.');
            } finally {
                scanBtn.disabled = false;
                scanBtn.innerHTML = '<i class="fas fa-sparkles mr-1"></i> Scan & Extract Details';
            }
        });

        // Terms & Conditions and Privacy Policy Modal Triggers
        const openLegalModal = (tabId = 'legal-privacy') => {
            const modal = document.getElementById('termsPrivacyModal');
            if (!modal) return;
            
            // Switch tabs
            document.querySelectorAll('.btn-legal-tab').forEach(b => {
                const isActive = b.getAttribute('data-tab') === tabId;
                b.classList.toggle('bg-white', isActive);
                b.classList.toggle('dark:bg-warmDark-800', isActive);
                b.classList.toggle('text-lavender-700', isActive);
                b.classList.toggle('dark:text-lavender-300', isActive);
                b.classList.toggle('shadow-sm', isActive);
                b.classList.toggle('text-stone-600', !isActive);
                b.classList.toggle('dark:text-stone-400', !isActive);
            });

            document.querySelectorAll('.legal-tab-content').forEach(c => {
                c.classList.toggle('hidden', c.id !== tabId);
            });

            const title = document.getElementById('termsPrivacyModalTitle');
            if (title) {
                title.textContent = tabId === 'legal-privacy' ? 'Privacy Policy & Security Standards' : 'Terms & Conditions';
            }

            this.openModal('termsPrivacyModal');
        };

        document.getElementById('btnOpenPrivacyModal')?.addEventListener('click', () => openLegalModal('legal-privacy'));
        document.getElementById('btnOpenTermsModal')?.addEventListener('click', () => openLegalModal('legal-terms'));

        document.querySelectorAll('.btn-legal-tab').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.getAttribute('data-tab');
                openLegalModal(tab);
            };
        });

        // Close dropdowns on outside click
        window.addEventListener('click', (e) => {
            if (!e.target.closest('#btnUserMenu') && !e.target.closest('#userMenuDropdown')) {
                document.getElementById('userMenuDropdown')?.classList.add('hidden');
            }
            if (!e.target.closest('#btnMoreActions') && !e.target.closest('#moreActionsDropdown')) {
                document.getElementById('moreActionsDropdown')?.classList.add('hidden');
            }
        });

        // Close modal buttons
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => {
                const modal = btn.closest('.modal-container');
                if (modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            };
        });
    }
}

// Global bootstrap on DOM load
let app = null;
window.addEventListener('DOMContentLoaded', () => {
    app = new StudentSpendApp();
});


// ==========================================
// Global Sidebar Slider Toggle (Desktop & Mobile)
// ==========================================
window.toggleSidebar = function() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('mobileSidebarOverlay');
    const floatingBtn = document.getElementById('btnFloatingSidebarSlider');
    const sliderIcon = document.getElementById('sidebarSliderIcon');
    if (!sidebar) return;

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile Drawer Toggle
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            if (overlay) overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('translate-x-0');
            if (overlay) overlay.classList.add('hidden');
        }
    } else {
        // Desktop Slider Bar Collapse / Expand
        const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
        if (isCollapsed) {
            // Expand Sidebar
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.style.width = '16rem'; // 256px / w-64
            sidebar.style.padding = '1.25rem';
            sidebar.style.opacity = '1';
            sidebar.style.borderRightWidth = '1px';
            sidebar.style.pointerEvents = 'auto';
            if (floatingBtn) floatingBtn.classList.add('hidden');
            if (sliderIcon) sliderIcon.className = 'fas fa-chevron-left text-[10px]';
            localStorage.setItem('gullak_sidebar_collapsed', 'false');
        } else {
            // Slide & Hide Sidebar
            sidebar.classList.add('sidebar-collapsed');
            sidebar.style.width = '0px';
            sidebar.style.padding = '0px';
            sidebar.style.opacity = '0';
            sidebar.style.borderRightWidth = '0px';
            sidebar.style.pointerEvents = 'none';
            if (floatingBtn) floatingBtn.classList.remove('hidden');
            if (sliderIcon) sliderIcon.className = 'fas fa-chevron-right text-[10px]';
            localStorage.setItem('gullak_sidebar_collapsed', 'true');
        }
    }
};

// Restore saved sidebar collapsed preference
window.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth >= 768 && localStorage.getItem('gullak_sidebar_collapsed') === 'true') {
        const sidebar = document.getElementById('appSidebar');
        const floatingBtn = document.getElementById('btnFloatingSidebarSlider');
        if (sidebar) {
            sidebar.classList.add('sidebar-collapsed');
            sidebar.style.width = '0px';
            sidebar.style.padding = '0px';
            sidebar.style.opacity = '0';
            sidebar.style.borderRightWidth = '0px';
            sidebar.style.pointerEvents = 'none';
            if (floatingBtn) floatingBtn.classList.remove('hidden');
        }
    }
});

// Shortcut ⌘ + B or Ctrl + B to toggle sidebar slider
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        window.toggleSidebar();
    }
});

// Global Cmd+K Search Focus
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchTransactionsInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
});

// ==========================================
// PWA Installation & Service Worker Manager
// ==========================================
class PWAManager {
    static init() {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then((reg) => {
                    console.log('✅ PWA Service Worker registered:', reg.scope);
                }).catch((err) => {
                    console.log('ℹ️ PWA SW registration note:', err.message);
                });
            });
        }

        let deferredPrompt = null;
        const btnInstall = document.getElementById('btnInstallApp');
        const btnSidebarInstall = document.getElementById('btnSidebarInstallApp');
        const banner = document.getElementById('pwaInstallBanner');
        const btnBannerInstall = document.getElementById('btnBannerInstallAction');
        const btnCloseBanner = document.getElementById('btnClosePwaBanner');
        const btnDismissBanner = document.getElementById('btnDismissPwaBanner');

        // Check if iOS
        const isIos = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /iphone|ipad|ipod/.test(userAgent);
        };
        const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

        // Always show sidebar install button on mobile or desktop browsers
        if (btnSidebarInstall) {
            btnSidebarInstall.classList.remove('hidden');
        }

        // Capture Android / Desktop Chrome install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            if (btnInstall) btnInstall.classList.remove('hidden');
            if (btnSidebarInstall) btnSidebarInstall.classList.remove('hidden');

            // Show mobile banner after 2.5 seconds if not dismissed previously
            if (!localStorage.getItem('pwa_dismissed')) {
                setTimeout(() => {
                    if (banner && deferredPrompt) {
                        banner.classList.remove('hidden');
                    }
                }, 2500);
            }
        });

        const triggerInstall = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('User accepted the PWA install prompt');
                    if (banner) banner.classList.add('hidden');
                    if (btnInstall) btnInstall.classList.add('hidden');
                }
                deferredPrompt = null;
            } else if (isIos() && !isInStandaloneMode()) {
                const modal = document.getElementById('pwaIosGuideModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            } else {
                alert('📱 To install Gullak AI App on your phone:\n\n• On Android Chrome: Tap top menu (⋮) → "Install app" or "Add to Home screen"\n• On iPhone Safari: Tap Share button (📤) → "Add to Home Screen" (➕)');
            }
        };

        if (btnInstall) btnInstall.addEventListener('click', triggerInstall);
        if (btnSidebarInstall) btnSidebarInstall.addEventListener('click', triggerInstall);
        if (btnBannerInstall) btnBannerInstall.addEventListener('click', triggerInstall);

        const dismissBanner = () => {
            if (banner) banner.classList.add('hidden');
            localStorage.setItem('pwa_dismissed', 'true');
        };

        if (btnCloseBanner) btnCloseBanner.addEventListener('click', dismissBanner);
        if (btnDismissBanner) btnDismissBanner.addEventListener('click', dismissBanner);

        // App Installed event
        window.addEventListener('appinstalled', () => {
            console.log('🎉 Gullak AI App installed successfully!');
            if (banner) banner.classList.add('hidden');
            if (btnInstall) btnInstall.classList.add('hidden');
            if (btnSidebarInstall) btnSidebarInstall.classList.add('hidden');
        });
    }
}

// Initialize PWA Manager
PWAManager.init();
