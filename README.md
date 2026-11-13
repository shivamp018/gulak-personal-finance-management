# 🪙 Gullak AI — Smart Money, UPI & Expense Manager

> A production-grade, privacy-first, responsive web application engineered for personal expense management, automatic UPI & PhonePe transaction sync, peer lending ledgers, and intelligent runway forecasting with an embedded AI Financial Copilot.

---

## 🌟 Key Features

### 1. 💰 Pocket Money & Allowance Cycle Setup
* **Monthly Inflow Tracking:** Configure monthly allowance, deposit date, and expected next payment date.
* **Optional Monthly Budget:** Set custom spending caps with real-time budget breach warnings.
* **Multi-Currency Support:** Seamlessly toggle between ₹ INR, $ USD, € EUR, and £ GBP.

### 2. 📊 Live Dashboard & The 10 Core Financial Metrics
1. 💳 **Current Balance:** Dynamically calculated:
   $$\text{Current Balance} = (\text{Allowance} + \text{Extra Inflows} + \text{Money Received Back} + \text{Money Borrowed}) - (\text{Expenses} + \text{Money Given} + \text{Money Repaid})$$
2. 💰 **Monthly Money Received:** Base pocket money + freelance/gigs.
3. 📉 **Total Expenses:** Sum of categorized student spending.
4. 🤝 **Money Given (Lent):** Money lent to peers & friends.
5. 📥 **Money Received Back:** Peer debt settlements received.
6. 💳 **Money Borrowed:** Loans taken from friends or family.
7. 🔄 **Money Repaid:** Debt paid back by the student.
8. ⏳ **Remaining Days:** Real-time countdown to next pocket money deposit.
9. 🛡️ **Daily Safe Spending Limit:**
   $$\text{Daily Safe Limit} = \frac{\text{Current Balance}}{\text{Remaining Days}}$$
10. 🏦 **Monthly Savings:** Net surplus after all outflows.

---

### 3. 📈 Interactive Financial Visualizations (Chart.js Engine)
* **Category-Wise Spending Doughnut:** Percentage breakdown across Food & Canteen, Metro/Transit, Study/Books, Hostel Rent, Social Hangouts, Subscriptions, Shopping, and Medical.
* **Daily Spending vs Safe Limit:** Daily bar chart highlighting days where spending exceeded the safe threshold.
* **Income vs Outflow Flow:** Grouped cash flow comparison.
* **Predictive Burn-Rate Runway Curve:** Forecast line mapping projected balance depletion against next deposit date.

---

### 4. ⚡ PhonePe & UPI Auto-Sync Hub (iOS & Android)
* **Instant Bank SMS & Alert Parser:** Paste any PhonePe notification or bank debit alert (HDFC, SBI, ICICI, Kotak, Axis) $\rightarrow$ automatically extracts amount, vendor, category, and verified remaining bank balance.
* **PhonePe Receipt Screenshot Scanner (Gemini Vision OCR):** Upload or paste (`Cmd + V`) a PhonePe "Payment Successful" screenshot to extract and log transaction details with zero manual typing.
* **Apple Shortcuts Automation for iOS:** Step-by-step native iPhone Shortcuts guide ("When PhonePe Closes" $\rightarrow$ auto-opens quick sync).
* **100% Cloud Email Forwarder Script:** Ready-to-copy Google Apps Script template for automated bank debit alert forwarding on Gmail.
* **1-Click Test Simulator:** Instantly test live transactions (Chai Point ₹40, Swiggy ₹240, Metro Pass ₹300, Freelance Credit ₹1,200).

---

### 5. 🤖 AI Financial Copilot & Smart Tools
* **Natural Language Quick-Add:** Type or dictate e.g., *"Spent 150 on burger and iced tea with Aryan"* or *"Bought 2 coffees for 120"* or *"Lent 500 to Priya for fest pass"* $\rightarrow$ extracts amounts, quantities, categories, and peer names automatically.
* **Hybrid Copilot Engine:** Works 100% offline via a built-in heuristic advisor, or seamlessly integrates with **Google Gemini Flash API** by adding your personal API key via the in-app Settings modal.
* **"Can I Afford This?" Purchase Simulator:** Evaluates prospective purchases (gadgets, sneakers, concert tickets) against remaining days and essentials to calculate post-purchase budget impact.
* **Predictive Burn-Rate & Survival Mode:** Alerts students when their daily burn rate will exhaust funds before next pocket money.
* **Polite Peer Debt Reminder Generator:** Generates WhatsApp/SMS templates in 4 styles (*Friendly, Casual, Funny, Meme mode*) with one-click copy & WhatsApp sharing.
* **Interactive Financial Advisor Chatbot:** Answers budgeting questions, hostel meal hacks, and saving tips.

---

### 5. 🤝 Social Peer Debts & Lending Ledger
* Dual-tabbed tracker for **"Friends Who Owe Me"** and **"Debts I Owe"**.
* Overdue badges, one-click settlement that automatically updates transaction history and balance.

---

### 6. 🔒 100% Client-Side Privacy & Data Management
* Complete offline persistence via `localStorage`.
* One-click **JSON Backup & Restore**.
* **CSV Export** for spreadsheet analysis.
* **Printable Student Financial Report / PDF**.
* Pre-loaded with realistic student mock data on first launch for immediate testing.

---
   


---

## 📂 Project Structure

```
student-spend-ai/
├── index.html          # Responsive Single-Page Application
├── css/
│   └── styles.css      # Glassmorphism, animations, badges, theme styles
├── js/
│   ├── app.js          # Main orchestrator, state management, calculation formulas, event binding
│   ├── storage.js      # StorageManager, default mock data, JSON/CSV export & import
│   ├── charts.js       # Chart.js configs (Category, Daily, Inflow/Outflow, Runway)
│   ├── ai-assistant.js # Natural language parser, purchase simulator, habit diagnostics, chatbot
│   └── peer-debts.js   # Peer lending ledger, overdue alerts, reminder generator
└── README.md           # Documentation & user manual
```

---

## 💡 Tech Stack
* **HTML5 & CSS3** with **Tailwind CSS**
* **Chart.js v4**
* **Canvas-Confetti**
* **Marked.js**
* **FontAwesome 6**
* **Pure Modular JavaScript (ES6+)**
