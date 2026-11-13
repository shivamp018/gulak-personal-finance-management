/**
 * StudentSpend AI — Peer Debts & Social Lending Ledger
 */

const PeerDebtsManager = {
    renderDebtsTable(debts, profile, onSettle, onReminder, onDelete) {
        const lentContainer = document.getElementById('debtsLentList');
        const borrowedContainer = document.getElementById('debtsBorrowedList');

        if (!lentContainer || !borrowedContainer) return;

        const lentDebts = debts.filter(d => d.type === 'given' || d.type === 'lent');
        const borrowedDebts = debts.filter(d => d.type === 'borrowed');

        // Render Lent Debts (Money Given to Friends)
        if (lentDebts.length === 0) {
            lentContainer.innerHTML = `
                <div class="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                    <i class="fas fa-check-circle text-2xl mb-2 text-emerald-500"></i>
                    <p>No outstanding money lent to friends. You're all settled!</p>
                </div>
            `;
        } else {
            lentContainer.innerHTML = lentDebts.map(d => this.createDebtCardHtml(d, profile, 'lent')).join('');
        }

        // Render Borrowed Debts (Money Borrowed from Friends/Parents)
        if (borrowedDebts.length === 0) {
            borrowedContainer.innerHTML = `
                <div class="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                    <i class="fas fa-smile-beam text-2xl mb-2 text-indigo-500"></i>
                    <p>You haven't borrowed any money. Debt-free zone!</p>
                </div>
            `;
        } else {
            borrowedContainer.innerHTML = borrowedDebts.map(d => this.createDebtCardHtml(d, profile, 'borrowed')).join('');
        }

        // Attach listeners
        document.querySelectorAll('.btn-settle-debt').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (onSettle) onSettle(id);
            };
        });

        document.querySelectorAll('.btn-remind-debt').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (onReminder) onReminder(id);
            };
        });

        document.querySelectorAll('.btn-delete-debt').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (onDelete) onDelete(id);
            };
        });
    },

    createDebtCardHtml(debt, profile, debtType) {
        const isSettled = debt.status === 'settled';
        const isOverdue = !isSettled && debt.dueDate && new Date(debt.dueDate) < new Date();
        const isLent = debtType === 'lent';
        
        let statusBadge = '';
        if (isSettled) {
            statusBadge = `<span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Settled</span>`;
        } else if (isOverdue) {
            statusBadge = `<span class="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold animate-pulse">Overdue</span>`;
        } else if (isLent) {
            statusBadge = `<span class="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">Pending Return</span>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold">You Owe</span>`;
        }

        return `
            <div class="p-3.5 rounded-xl border ${isSettled ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-indigo-400">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isLent ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'}">
                        ${(debt.person || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(debt.person) || 'Anonymous'}</span>
                            ${statusBadge}
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            ${debt.reason ? `"${escapeHtml(debt.reason)}" • ` : ''}Date: ${escapeHtml(debt.date) || 'Recent'}
                            ${debt.dueDate ? ` • Due: <span class="${isOverdue ? 'text-rose-500 font-medium' : ''}">${escapeHtml(debt.dueDate)}</span>` : ''}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div class="text-right">
                        <div class="text-base font-bold ${isLent ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'} font-mono">
                            ${formatCurrency(debt.amount, profile.currency)}
                        </div>
                        <span class="text-[11px] text-slate-400 block">${isLent ? 'Owed to you' : 'You owe'}</span>
                    </div>

                    <div class="flex items-center gap-1.5">
                        ${!isSettled ? `
                            ${isLent ? `
                                <button class="btn-remind-debt p-2 text-xs rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors" data-id="${debt.id}" title="Generate AI WhatsApp/SMS Reminder">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                                <button class="btn-settle-debt px-3 py-1.5 text-xs rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-extrabold shadow-sm transition-all flex items-center gap-1.5" data-id="${debt.id}" title="Click when ${escapeHtml(debt.person)} returned your money">
                                    <i class="fas fa-hand-holding-usd text-sm"></i>
                                    <span>Got Money Back</span>
                                </button>
                            ` : `
                                <button class="btn-settle-debt px-2.5 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-colors flex items-center gap-1" data-id="${debt.id}">
                                    <i class="fas fa-check"></i> Repay & Settle
                                </button>
                            `}
                        ` : `
                            <span class="px-2.5 py-1 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-bold border border-emerald-200 dark:border-emerald-800">
                                <i class="fas fa-check-double text-emerald-500"></i> ${isLent ? 'Money Returned' : 'Settled'}
                            </span>
                        `}
                        <button class="btn-delete-debt p-2 text-xs rounded-lg text-slate-400 hover:text-rose-500 transition-colors" data-id="${debt.id}" title="Remove entry">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};
