# 💰 Wealth Projector - Investment Growth Calculator

A beautiful, interactive investment calculator built with React and TypeScript. Plan your financial future with powerful projection tools and multiple reinvestment strategies.

![Investment Calculator](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan) ![Vite](https://img.shields.io/badge/Vite-5-purple)

## ✨ Features

### 📊 Core Calculator
- **Investment Amount** - Set your initial or recurring investment
- **ROI Percentage** - Define your expected annual return rate
- **Investment Duration** - Choose your investment timeframe
- **Investment Frequency** - Once, Daily, Weekly, or Monthly investments
- **Inflation Adjustment** - Optional inflation rate to see real returns

### 📈 Visual Projections
- Interactive line chart showing growth over time
- Total Value vs Total Invested comparison
- Summary cards displaying Total Invested, Total Profit, and Final Value

### 🔄 10 Reinvestment Strategies

| Strategy | Description |
|----------|-------------|
| **2X** | Double your position - match your balance with fresh cash |
| **Repeat** | Add your original investment amount each period |
| **All In** | Pure compounding - let everything grow together |
| **Double Down** | Add cash equal to last period's profit |
| **Shield Value** | Add inflation adjustment to protect purchasing power |
| **Level Up** | Add a fixed amount each period |
| **Pay Yourself** | Take 50% of profits, reinvest the rest |
| **Capital Protect** | Withdraw all profits, keep principal invested |
| **Take Salary** | Withdraw a fixed salary amount each period |
| **Custom** | Set a target amount and calculate required investments |

### 📋 Detailed Projection Table
- Year-by-year breakdown with columns:
  - Start Value
  - Cash In
  - Total Invested
  - Profit
  - Cash Out
  - End Value
- Configurable duration (Yearly, Monthly, Weekly, Daily views)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/RTBRuhan/WealthProjector.git

# Navigate to project directory
cd WealthProjector

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **Tailwind CSS** - Styling
- **Recharts** - Charts & Graphs
- **Lucide React** - Icons

## 📁 Project Structure

```
src/
├── components/
│   └── InvestmentCalculator.tsx   # Main calculator component
├── App.tsx                         # App entry point
├── main.tsx                        # React DOM render
└── index.css                       # Global styles & Tailwind
```

## 🎨 Screenshots

### Calculator Interface
The clean, modern interface allows easy input of investment parameters with real-time calculations.

### Growth Projection Chart
Visual representation of your investment growth over time with comparison lines.

### Strategy Comparison
Detailed tables showing how different reinvestment strategies affect your returns.

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**RTBRuhan**
- GitHub: [@RTBRuhan](https://github.com/RTBRuhan)
- Website: [rtbruhan.github.io](https://rtbruhan.github.io)

---

<p align="center">
  Made with ❤️ by RTBRuhan
</p>

