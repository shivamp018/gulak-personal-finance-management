/**
 * StudentSpend AI — Dynamic Chart.js Analytics Engine
 */

let categoryChartInstance = null;
let dailyChartInstance = null;
let incomeExpenseChartInstance = null;
let runwayChartInstance = null;

const ChartManager = {
    getThemeColors() {
        const isDark = document.documentElement.classList.contains('dark');
        return {
            textColor: isDark ? '#94a3b8' : '#64748b',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            cardBg: isDark ? '#111827' : '#ffffff'
        };
    },

    updateAllCharts(metrics, transactions, profile) {
        this.renderCategoryChart(metrics, transactions, profile);
        this.renderDailySpendingChart(metrics, transactions, profile);
        this.renderIncomeExpenseChart(metrics, transactions, profile);
        this.renderRunwayChart(metrics, transactions, profile);
    },

    /**
     * 1. Category-wise Spending Doughnut Chart
     */
    renderCategoryChart(metrics, transactions, profile) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const colors = this.getThemeColors();
        const categoryMap = {};

        // Aggregate only expenses
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'other';
            categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
        });

        const labels = [];
        const data = [];
        const bgColors = [];

        DEFAULT_CATEGORIES.forEach(cat => {
            if (categoryMap[cat.id] && categoryMap[cat.id] > 0) {
                labels.push(cat.name);
                data.push(categoryMap[cat.id]);
                bgColors.push(cat.color);
            }
        });

        // Fallback for empty state
        if (data.length === 0) {
            labels.push('No Expenses Yet');
            data.push(1);
            bgColors.push('#94a3b8');
        }

        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }

        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 2,
                    borderColor: colors.cardBg,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${formatCurrency(val, profile.currency)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '74%'
            }
        });
    },

    /**
     * 2. Daily Spending vs Safe Limit Bar Chart
     */
    renderDailySpendingChart(metrics, transactions, profile) {
        const ctx = document.getElementById('dailySpendingChart');
        if (!ctx) return;

        const colors = this.getThemeColors();
        const dailySpendMap = {};

        // Aggregate daily spending
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const dateStr = t.date;
            if (dateStr) {
                // formatted as "Aug 5" or "05"
                const dayNum = dateStr.split('-')[2] || dateStr;
                dailySpendMap[dayNum] = (dailySpendMap[dayNum] || 0) + Number(t.amount || 0);
            }
        });

        // Generate day sequence (up to 31 or current days)
        const days = Object.keys(dailySpendMap).sort((a, b) => Number(a) - Number(b));
        if (days.length === 0) {
            days.push('01');
            dailySpendMap['01'] = 0;
        }

        const safeLimit = metrics.dailySafeLimit || 200;
        const labels = days.map(d => `Day ${Number(d)}`);
        const data = days.map(d => dailySpendMap[d] || 0);
        const barColors = data.map(v => v > safeLimit ? 'rgba(214, 159, 164, 0.85)' : 'rgba(178, 170, 189, 0.85)');

        if (dailyChartInstance) {
            dailyChartInstance.destroy();
        }

        dailyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Daily Expense',
                        data: data,
                        backgroundColor: barColors,
                        borderRadius: 6,
                        barPercentage: 0.6
                    },
                    {
                        label: `Daily Safe Limit (${formatCurrency(safeLimit, profile.currency)})`,
                        data: Array(labels.length).fill(safeLimit),
                        type: 'line',
                        borderColor: '#d4c89d',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            font: { family: 'Plus Jakarta Sans', size: 11 },
                            callback: value => formatCurrency(value, profile.currency)
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor,
                            font: { family: 'Plus Jakarta Sans', size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y, profile.currency)}`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 3. Income vs Expense Comparison Chart
     */
    renderIncomeExpenseChart(metrics, transactions, profile) {
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        const colors = this.getThemeColors();

        const totalInflows = (Number(metrics.monthlyAllowance) || 0) + (Number(metrics.totalExtraInflows) || 0);
        const totalExpenses = Number(metrics.totalExpenses) || 0;
        const netSavings = Math.max(0, totalInflows - totalExpenses);
        const moneyGiven = Number(metrics.moneyGiven) || 0;
        const moneyBorrowed = Number(metrics.moneyBorrowed) || 0;

        if (incomeExpenseChartInstance) {
            incomeExpenseChartInstance.destroy();
        }

        incomeExpenseChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total Inflow', 'Total Outflow', 'Net Savings', 'Peer Lent', 'Peer Borrowed'],
                datasets: [{
                    label: 'Financial Flow',
                    data: [totalInflows, totalExpenses, netSavings, moneyGiven, moneyBorrowed],
                    backgroundColor: [
                        'rgba(155, 181, 169, 0.85)', // Natural Sage Inflow
                        'rgba(214, 159, 164, 0.85)', // Dusty Rose Outflow
                        'rgba(178, 170, 189, 0.85)', // Muted Lavender Savings
                        'rgba(220, 184, 143, 0.85)', // Sand Lent
                        'rgba(196, 151, 135, 0.85)'  // Clay Borrowed
                    ],
                    borderRadius: 8,
                    barPercentage: 0.55
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            callback: value => formatCurrency(value, profile.currency),
                            font: { family: 'Plus Jakarta Sans', size: 11 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${formatCurrency(context.parsed.y, profile.currency)}`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 4. Predictive Burn-Rate & Runway Trajectory Chart
     */
    renderRunwayChart(metrics, transactions, profile) {
        const ctx = document.getElementById('runwayChart');
        if (!ctx) return;

        const colors = this.getThemeColors();

        const startDate = new Date(profile.dateReceived || Date.now());
        const nextDate = new Date(profile.nextPaymentDate || (Date.now() + 30 * 24 * 3600 * 1000));
        
        // Days difference
        const totalCycleDays = Math.max(1, Math.ceil((nextDate - startDate) / (1000 * 3600 * 24)));
        const daysPassed = Math.max(1, Math.ceil((new Date() - startDate) / (1000 * 3600 * 24)));
        
        const initialMoney = (Number(metrics.monthlyAllowance) || 0) + (Number(metrics.totalExtraInflows) || 0);
        const currentBalance = Number(metrics.currentBalance) || 0;
        const avgBurnRatePerDay = daysPassed > 0 ? (initialMoney - currentBalance) / daysPassed : 0;

        const labels = [];
        const idealBudgetCurve = [];
        const actualBalancePoints = [];
        const forecastRunway = [];

        // Build trajectory from Day 1 to TotalCycleDays
        for (let i = 1; i <= totalCycleDays; i++) {
            labels.push(`Day ${i}`);
            
            // Ideal steady spend line down to 0 or 10% reserve
            const idealVal = Math.max(0, initialMoney - (initialMoney / totalCycleDays) * i);
            idealBudgetCurve.push(idealVal);

            // Actual line up to today
            if (i <= daysPassed) {
                // Interpolate actual decline
                const actualApprox = Math.max(0, initialMoney - (avgBurnRatePerDay * i));
                actualBalancePoints.push(i === daysPassed ? currentBalance : actualApprox);
                forecastRunway.push(null);
            } else {
                actualBalancePoints.push(null);
                // Forecast line starting from today
                const forecastStep = Math.max(0, currentBalance - (avgBurnRatePerDay * (i - daysPassed)));
                forecastRunway.push(forecastStep);
            }
        }

        // Bridge the forecast with the current balance point
        if (daysPassed > 0 && daysPassed <= totalCycleDays) {
            forecastRunway[daysPassed - 1] = currentBalance;
        }

        if (runwayChartInstance) {
            runwayChartInstance.destroy();
        }

        runwayChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual Balance',
                        data: actualBalancePoints,
                        borderColor: '#9bb5a9', // Natural Sage
                        backgroundColor: 'rgba(155, 181, 169, 0.15)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3.5
                    },
                    {
                        label: 'AI Projected Runway',
                        data: forecastRunway,
                        borderColor: '#d69fa4', // Dusty Rose
                        borderDash: [6, 6],
                        borderWidth: 2.5,
                        tension: 0.2,
                        pointRadius: 2.5
                    },
                    {
                        label: 'Ideal Safe Budget Pace',
                        data: idealBudgetCurve,
                        borderColor: '#b2aabd', // Muted Lavender
                        borderDash: [3, 3],
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: colors.gridColor },
                        ticks: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            callback: value => formatCurrency(value, profile.currency),
                            font: { family: 'Plus Jakarta Sans', size: 10 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor,
                            font: { family: 'Plus Jakarta Sans', size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.parsed.y === null) return '';
                                return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y, profile.currency)}`;
                            }
                        }
                    }
                }
            }
        });
    }
};
