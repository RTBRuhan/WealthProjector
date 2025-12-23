import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';

interface CalculationData {
  period: number;
  date: string;
  totalInvested: number;
  currentValue: number;
  profit: number;
  displayValue: number;
}

interface ProjectionData {
  period: number;
  startValue: number;
  newCash: number;
  totalInvested: number;  // Start + Cash In (what's actually invested before growth)
  profit: number;         // The actual interest/growth earned this period
  afterGrowth: number;    // Total Invested + Profit (value after growth, before cash out)
  cashOut: number;
  endValue: number;
}

type Frequency = 'once' | 'daily' | 'weekly' | 'monthly';
type ProjectionFrequency = 'yearly' | 'monthly' | 'weekly' | 'daily';
type ReinvestmentStrategy = 
  | '2x' 
  | 'repeat' 
  | 'all-in' 
  | 'double-down' 
  | 'shield-value' 
  | 'level-up' 
  | 'pay-yourself' 
  | 'capital-protect' 
  | 'take-salary'
  | 'custom';

interface StrategyInfo {
  name: string;
  color: string;
}

const STRATEGIES: Record<ReinvestmentStrategy, StrategyInfo> = {
  '2x': { name: '2X', color: 'bg-red-600' },
  'repeat': { name: 'Repeat', color: 'bg-orange-600' },
  'all-in': { name: 'All In', color: 'bg-green-600' },
  'double-down': { name: 'Double Down', color: 'bg-blue-600' },
  'shield-value': { name: 'Shield Value', color: 'bg-cyan-600' },
  'level-up': { name: 'Level Up', color: 'bg-purple-600' },
  'pay-yourself': { name: 'Pay Yourself', color: 'bg-pink-600' },
  'capital-protect': { name: 'Capital Protect', color: 'bg-amber-600' },
  'take-salary': { name: 'Take Salary', color: 'bg-gray-600' },
  'custom': { name: 'Custom', color: 'bg-indigo-600' }
};

const DEFAULT_PROJECTION_DURATIONS: Record<ProjectionFrequency, number> = {
  yearly: 10,
  monthly: 12,
  weekly: 4,
  daily: 30
};

const formatNum = (n: number) => '$' + n.toLocaleString();

const getStrategyDescription = (
  strategy: ReinvestmentStrategy,
  balance: number,
  principal: number,
  profit: number,
  inflationRate: number,
  levelUpAmount: number,
  salaryAmount: number,
  perPeriodInvestment: number,
  targetAmount: number,
  periods: number
): string => {
  const bal = formatNum(balance);
  const prin = formatNum(principal);
  const prof = formatNum(Math.round(profit));
  const halfProf = formatNum(Math.round(profit / 2));
  const inflationTopUp = formatNum(Math.round(balance * (inflationRate / 100)));
  const levelUp = formatNum(levelUpAmount);
  const salary = formatNum(salaryAmount);
  const perPeriod = formatNum(Math.round(Math.abs(perPeriodInvestment)));
  const target = formatNum(targetAmount);
  const totalCashNeeded = formatNum(Math.round(Math.abs(perPeriodInvestment) * periods));
  
  switch (strategy) {
    case '2x':
      return `Double your position. ${bal} balance → add ${bal} more → invest ${formatNum(balance * 2)} total.`;
    case 'repeat':
      return `Add your starting amount again. ${bal} balance + ${prin} original → invest ${formatNum(balance + principal)}.`;
    case 'all-in':
      return `Just let it grow. ${bal} stays in, no extra cash needed, no withdrawals.`;
    case 'double-down':
      return `Add cash equal to your profit. Made ${prof}? Add ${prof} more → invest ${formatNum(balance + profit)}.`;
    case 'shield-value':
      return `Beat inflation. Add ${inflationTopUp} top-up to protect your money's value → invest ${formatNum(Math.round(balance * (1 + inflationRate / 100)))}.`;
    case 'level-up':
      return `Add a fixed amount each time. ${bal} balance + ${levelUp} extra → invest ${formatNum(balance + levelUpAmount)}.`;
    case 'pay-yourself':
      return `Take half your profit home. Made ${prof}? Keep ${halfProf}, reinvest the rest → invest ${formatNum(Math.round(balance - profit / 2))}.`;
    case 'capital-protect':
      return `Withdraw all profit as income. Made ${prof}? Take it home → invest ${formatNum(balance - profit)}.`;
    case 'take-salary':
      return `Withdraw a fixed ${salary} each period as your salary. Balance after: ${formatNum(Math.max(0, balance - salaryAmount))}.`;
    case 'custom':
      if (perPeriodInvestment >= 0) {
        return `To reach ${target}, invest ${perPeriod} each period (${totalCashNeeded} total over ${periods} periods).`;
      } else {
        const withdrawAmt = formatNum(Math.abs(Math.round(perPeriodInvestment)));
        const totalWithdraw = formatNum(Math.abs(Math.round(perPeriodInvestment * periods)));
        return `To reach ${target}, withdraw ${withdrawAmt} each period (${totalWithdraw} total over ${periods} periods).`;
      }
    default:
      return '';
  }
};

export default function InvestmentCalculator() {
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const [roiPercentage, setRoiPercentage] = useState<number>(10);
  const [duration, setDuration] = useState<number>(12);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [enableInflation, setEnableInflation] = useState<boolean>(false);
  const [inflationRate, setInflationRate] = useState<number>(3);
  const [projectionFrequency, setProjectionFrequency] = useState<ProjectionFrequency>('yearly');
  const [projectionDuration, setProjectionDuration] = useState<number>(10);
  const [reinvestmentStrategy, setReinvestmentStrategy] = useState<ReinvestmentStrategy>('all-in');
  const [levelUpAmount, setLevelUpAmount] = useState<number>(50);
  const [customGainPercent, setCustomGainPercent] = useState<number>(20);
  const [customTargetAmount, setCustomTargetAmount] = useState<number>(50000);
  const [salaryAmount, setSalaryAmount] = useState<number>(100);

  // Update projection duration when frequency changes
  const handleProjectionFrequencyChange = (freq: ProjectionFrequency) => {
    setProjectionFrequency(freq);
    setProjectionDuration(DEFAULT_PROJECTION_DURATIONS[freq]);
  };

  // Calculate the fixed per-period investment/withdrawal needed to reach target amount
  const calculatePerPeriodInvestment = (
    startBalance: number,
    targetAmount: number,
    periods: number,
    annualRate: number,
    freq: ProjectionFrequency
  ): number => {
    if (periods <= 0 || startBalance <= 0) return 0;
    
    // Get per-period rate
    let rate: number;
    switch (freq) {
      case 'monthly': rate = annualRate / 12; break;
      case 'weekly': rate = annualRate / 52; break;
      case 'daily': rate = annualRate / 365; break;
      default: rate = annualRate;
    }
    
    if (rate === 0) return (targetAmount - startBalance) / periods;
    
    // Using future value of annuity formula + compound growth
    // FV = P * (1+r)^n + C * ((1+r)^n - 1) / r
    // Where P = starting balance, C = per-period contribution, r = rate, n = periods
    // Solving for C: C = (FV - P * (1+r)^n) * r / ((1+r)^n - 1)
    const growthFactor = Math.pow(1 + rate, periods);
    const futureValueOfStart = startBalance * growthFactor;
    
    // If target < futureValue, result will be negative (meaning withdrawals needed)
    const amountNeeded = targetAmount - futureValueOfStart;
    const annuityFactor = (growthFactor - 1) / rate;
    
    return amountNeeded / annuityFactor;
  };

  // Sync target amount when percentage changes
  const handleCustomPercentChange = (percent: number) => {
    setCustomGainPercent(percent);
    // Don't auto-update target amount - let user set it independently
  };

  // Sync percentage when target amount changes  
  const handleCustomTargetChange = (target: number) => {
    setCustomTargetAmount(target);
    // Calculate what percentage this represents
    if (calculations.length > 0) {
      const startBalance = calculations[calculations.length - 1].currentValue;
      const perPeriod = calculatePerPeriodInvestment(
        startBalance,
        target,
        projectionDuration,
        roiPercentage / 100,
        projectionFrequency
      );
      // Calculate as percentage of starting balance
      const percentOfBalance = (perPeriod / startBalance) * 100;
      setCustomGainPercent(Math.round(percentOfBalance * 10) / 10);
    }
  };

  const calculations = useMemo<CalculationData[]>(() => {
    let data: CalculationData[] = [];
    let totalInvested = 0;
    let currentValue = 0;
    
    const start = new Date(startDate);
    
    if (frequency === 'once') {
      const annualRate = roiPercentage / 100;
      const months = duration;
      const rate = annualRate * (months / 12);
      const inflationAdjustment = enableInflation ? (1 - (inflationRate / 100) * (months / 12)) : 1;
      
      totalInvested = investmentAmount;
      currentValue = investmentAmount * (1 + rate) * inflationAdjustment;
      
      for (let i = 0; i <= months; i++) {
        let periodDate = new Date(start);
        periodDate.setMonth(start.getMonth() + i);
        
        const periodRate = annualRate * (i / 12);
        const periodInflation = enableInflation ? (1 - (inflationRate / 100) * (i / 12)) : 1;
        const periodValue = i === 0 ? investmentAmount : investmentAmount * (1 + periodRate) * periodInflation;
        const profit = periodValue - totalInvested;
        
        data.push({
          period: i,
          date: periodDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          totalInvested: Math.round(totalInvested),
          currentValue: Math.round(periodValue),
          profit: Math.round(profit),
          displayValue: showTotal ? Math.round(periodValue) : Math.round(profit)
        });
      }
    } else {
      const periodsPerYear = frequency === 'daily' ? 365 : frequency === 'weekly' ? 52 : 12;
      const totalPeriods = Math.floor((duration / 12) * periodsPerYear);
      const ratePerPeriod = roiPercentage / 100 / periodsPerYear;
      const inflationPerPeriod = enableInflation ? inflationRate / 100 / periodsPerYear : 0;
      
      for (let i = 0; i <= totalPeriods; i++) {
        if (i > 0) {
          totalInvested += investmentAmount;
          currentValue = (currentValue + investmentAmount) * (1 + ratePerPeriod);
          
          if (enableInflation) {
            currentValue = currentValue / (1 + inflationPerPeriod);
          }
        }
        
        let periodDate = new Date(start);
        if (frequency === 'daily') {
          periodDate.setDate(start.getDate() + i);
        } else if (frequency === 'weekly') {
          periodDate.setDate(start.getDate() + (i * 7));
        } else {
          periodDate.setMonth(start.getMonth() + i);
        }
        
        const profit = currentValue - totalInvested;
        
        data.push({
          period: i,
          date: periodDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          totalInvested: Math.round(totalInvested),
          currentValue: Math.round(currentValue),
          profit: Math.round(profit),
          displayValue: showTotal ? Math.round(currentValue) : Math.round(profit)
        });
      }
    }
    
    return data;
  }, [investmentAmount, roiPercentage, duration, frequency, startDate, showTotal, enableInflation, inflationRate]);

  const finalData = calculations[calculations.length - 1];
  const totalReturn = finalData ? ((finalData.profit / finalData.totalInvested) * 100).toFixed(2) : '0';

  const futureProjections = useMemo<ProjectionData[] | null>(() => {
    if (!finalData) return null;
    
    const annualRate = roiPercentage / 100;
    const monthlyRate = roiPercentage / 100 / 12;
    const weeklyRate = roiPercentage / 100 / 52;
    const dailyRate = roiPercentage / 100 / 365;
    // Inflation for general adjustments (only if enabled)
    const inflationAnnual = enableInflation ? inflationRate / 100 : 0;
    const inflationMonthly = enableInflation ? inflationRate / 100 / 12 : 0;
    const inflationWeekly = enableInflation ? inflationRate / 100 / 52 : 0;
    const inflationDaily = enableInflation ? inflationRate / 100 / 365 : 0;
    // Shield Value always uses inflation rate (regardless of toggle)
    const shieldInflationAnnual = inflationRate / 100;
    const shieldInflationMonthly = inflationRate / 100 / 12;
    const shieldInflationWeekly = inflationRate / 100 / 52;
    const shieldInflationDaily = inflationRate / 100 / 365;
    
    let projections: ProjectionData[] = [];
    // Start from the original investment amount (Year 1 = first year of investment)
    let balance = investmentAmount;
    const originalPrincipal = investmentAmount;
    
    const getConfig = () => {
      switch(projectionFrequency) {
        case 'monthly':
          return { rate: monthlyRate, inflation: inflationMonthly, shieldInflation: shieldInflationMonthly };
        case 'weekly':
          return { rate: weeklyRate, inflation: inflationWeekly, shieldInflation: shieldInflationWeekly };
        case 'daily':
          return { rate: dailyRate, inflation: inflationDaily, shieldInflation: shieldInflationDaily };
        default:
          return { rate: annualRate, inflation: inflationAnnual, shieldInflation: shieldInflationAnnual };
      }
    };
    
    const { rate, shieldInflation } = getConfig();
    const periods = projectionDuration;
    let previousProfit = 0;  // Track previous year's profit for "Double Down" strategy
    
    for (let i = 1; i <= periods; i++) {
      // Year 1: bank starts at $0, you cash in your investment, and it grows for the year
      if (i === 1) {
        const year1Invested = balance;
        const year1Profit = year1Invested * rate;
        const year1EndValue = year1Invested + year1Profit;
        
        projections.push({
          period: i,
          startValue: 0,
          newCash: Math.round(balance),
          totalInvested: Math.round(year1Invested),
          profit: Math.round(year1Profit),
          afterGrowth: Math.round(year1EndValue),
          cashOut: 0,
          endValue: Math.round(year1EndValue)
        });
        
        previousProfit = year1Profit;  // Store for next year's "Double Down"
        balance = year1EndValue;  // Update balance for next year
        continue;
      }
      
      const startValue = balance;
      
      let newCash = 0;
      let cashOut = 0;
      let endValue = 0;
      
      // Apply reinvestment strategy
      switch (reinvestmentStrategy) {
        case '2x':
          // Double your position: balance + same amount as balance
          newCash = startValue;
          endValue = (startValue + newCash) * (1 + rate);
          break;
          
        case 'repeat':
          // Balance + original principal
          newCash = originalPrincipal;
          endValue = (startValue + newCash) * (1 + rate);
          break;
          
        case 'all-in':
          // Just compound everything (no new cash, no withdrawal)
          endValue = startValue * (1 + rate);
          break;
          
        case 'double-down':
          // Balance + LAST YEAR'S profit amount as new cash
          newCash = previousProfit;
          endValue = (startValue + newCash) * (1 + rate);
          break;
          
        case 'shield-value':
          // Balance + inflation adjustment (always uses inflation rate, regardless of toggle)
          newCash = startValue * shieldInflation;
          endValue = (startValue + newCash) * (1 + rate);
          break;
          
        case 'level-up':
          // Balance + fixed extra amount
          newCash = levelUpAmount;
          endValue = (startValue + newCash) * (1 + rate);
          break;
          
        case 'pay-yourself':
          // Take half the profit each period, reinvest the other half
          // Balance grows, we take half the growth as cash out
          const payYourselfGrowth = startValue * rate;
          cashOut = payYourselfGrowth / 2;
          // Current balance + half the profit stays invested
          endValue = startValue + (payYourselfGrowth / 2);
          break;
          
        case 'capital-protect':
          // Keep ONLY principal invested, withdraw ALL profit
          // First, withdraw any excess over principal (if startValue > principal)
          // Then, withdraw the profit from the principal's growth
          const excessOverPrincipal = Math.max(0, startValue - originalPrincipal);
          const principalProfit = originalPrincipal * rate;
          cashOut = excessOverPrincipal + principalProfit;
          endValue = originalPrincipal; // End value stays at principal
          break;
          
        case 'take-salary':
          // Withdraw a fixed salary amount each period
          // Balance grows, then we withdraw the fixed salary
          const afterGrowth = startValue * (1 + rate);
          cashOut = Math.min(salaryAmount, afterGrowth); // Can't withdraw more than available
          endValue = Math.max(0, afterGrowth - cashOut);
          break;
          
        case 'custom':
          // Add a fixed per-period investment/withdrawal to reach target amount
          const customPerPeriodAmount = calculatePerPeriodInvestment(
            finalData.currentValue,
            customTargetAmount,
            periods,
            roiPercentage / 100,
            projectionFrequency
          );
          if (customPerPeriodAmount >= 0) {
            // Positive = invest more (add at start of period, then grow)
            newCash = customPerPeriodAmount;
            endValue = (startValue + newCash) * (1 + rate);
          } else {
            // Negative = withdraw money (grow first, then withdraw at end)
            const grownValue = startValue * (1 + rate);
            cashOut = Math.min(Math.abs(customPerPeriodAmount), grownValue);
            endValue = Math.max(0, grownValue - cashOut);
          }
          break;
          
        default:
          endValue = startValue * (1 + rate);
      }
      
      // Calculate the total invested (Start + Cash In)
      const totalInvested = startValue + newCash;
      
      // Calculate actual profit (interest earned this period)
      // For cash-in strategies: profit = totalInvested * rate
      // For cash-out strategies: profit = startValue * rate
      const actualProfit = newCash > 0 
        ? totalInvested * rate 
        : startValue * rate;
      
      // Calculate after growth value (before cash out)
      const afterGrowthValue = newCash > 0 
        ? totalInvested * (1 + rate) 
        : startValue * (1 + rate);
      
      projections.push({
        period: i,
        startValue: Math.round(startValue),
        newCash: Math.round(newCash),
        totalInvested: Math.round(totalInvested),
        profit: Math.round(actualProfit),
        afterGrowth: Math.round(afterGrowthValue),
        cashOut: Math.round(cashOut),
        endValue: Math.round(endValue)
      });
      
      previousProfit = actualProfit;  // Store for next year's "Double Down"
      balance = endValue;
    }
    
    return projections;
  }, [finalData, roiPercentage, investmentAmount, enableInflation, inflationRate, projectionFrequency, projectionDuration, reinvestmentStrategy, levelUpAmount, customGainPercent, salaryAmount, customTargetAmount, calculatePerPeriodInvestment]);

  const totalCashOut = futureProjections?.reduce((sum, p) => sum + p.cashOut, 0) ?? 0;
  const totalNewCash = futureProjections?.reduce((sum, p) => sum + p.newCash, 0) ?? 0;
  const totalProfitFromProjections = futureProjections?.reduce((sum, p) => sum + p.profit, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Investment Growth Calculator</h1>
            </div>
            <a 
              href="https://rtbruhan.github.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
            >
              by RTBRuhan
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Investment Amount ($)
                </label>
                <input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  ROI Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={roiPercentage}
                  onChange={(e) => setRoiPercentage(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Investment Duration (months)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Investment Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Investment Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2 invisible">Spacer</label>
                <div className="flex gap-4">
                  <div className="flex-1 flex items-center justify-between px-4 py-2 bg-white rounded-lg border-2 border-gray-300 h-[42px]">
                    <span className="text-sm font-semibold text-gray-800">Show Total</span>
                    <button
                      onClick={() => setShowTotal(!showTotal)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        showTotal ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          showTotal ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex-1 flex items-center justify-between px-4 py-2 bg-white rounded-lg border-2 border-gray-300 h-[42px]">
                    <span className="text-sm font-semibold text-gray-800">Inflation</span>
                    <button
                      onClick={() => setEnableInflation(!enableInflation)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        enableInflation ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          enableInflation ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {enableInflation && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Inflation Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value))}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {finalData && (
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <p className="text-sm font-medium opacity-90">Total Invested</p>
                </div>
                <p className="text-3xl font-bold">${finalData.totalInvested.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <p className="text-sm font-medium opacity-90">Total Profit</p>
                </div>
                <p className="text-3xl font-bold">${finalData.profit.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <p className="text-sm font-medium opacity-90">Final Value</p>
                </div>
                <p className="text-3xl font-bold">${finalData.currentValue.toLocaleString()}</p>
                <p className="text-sm mt-1 opacity-90">Return: {totalReturn}%</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Growth Projection ({showTotal ? 'Total Value' : 'Profit Only'})
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={calculations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e0e0e0', borderRadius: '8px' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="displayValue" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  name={showTotal ? "Total Value" : "Profit"}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalInvested" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Total Invested"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {futureProjections && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Future Projections
                </h2>
                
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {(['yearly', 'monthly', 'weekly', 'daily'] as ProjectionFrequency[]).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => handleProjectionFrequencyChange(freq)}
                      className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                        projectionFrequency === freq
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-sm font-medium text-gray-600">Duration:</label>
                    <input
                      type="number"
                      value={projectionDuration}
                      onChange={(e) => setProjectionDuration(Number(e.target.value))}
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-semibold focus:border-indigo-500 focus:outline-none"
                      min={1}
                    />
                    <span className="text-sm text-gray-500">
                      {projectionFrequency === 'yearly' ? 'years' : 
                       projectionFrequency === 'monthly' ? 'months' :
                       projectionFrequency === 'weekly' ? 'weeks' : 'days'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Reinvestment Strategy:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {(Object.keys(STRATEGIES) as ReinvestmentStrategy[]).map((strategy) => (
                      <button
                        key={strategy}
                        onClick={() => setReinvestmentStrategy(strategy)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          reinvestmentStrategy === strategy
                            ? `${STRATEGIES[strategy].color} text-white shadow-lg`
                            : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {STRATEGIES[strategy].name}
                      </button>
                    ))}
                  </div>
                  
                  {(() => {
                    const startBalance = finalData?.currentValue ?? 0;
                    const perPeriodInvestment = calculatePerPeriodInvestment(
                      startBalance,
                      customTargetAmount,
                      projectionDuration,
                      roiPercentage / 100,
                      projectionFrequency
                    );
                    return (
                      <p className="text-sm text-gray-600 mt-2 p-3 bg-white rounded-lg border border-gray-200">
                        <strong className="text-gray-800">{STRATEGIES[reinvestmentStrategy].name}:</strong>{' '}
                        {finalData && getStrategyDescription(
                          reinvestmentStrategy,
                          finalData.currentValue,
                          investmentAmount,
                          finalData.profit,
                          inflationRate,
                          levelUpAmount,
                          salaryAmount,
                          perPeriodInvestment,
                          customTargetAmount,
                          projectionDuration
                        )}
                      </p>
                    );
                  })()}

                  {reinvestmentStrategy === 'level-up' && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fixed Extra Amount ($)
                      </label>
                      <input
                        type="number"
                        value={levelUpAmount}
                        onChange={(e) => setLevelUpAmount(Number(e.target.value))}
                        className="w-full max-w-xs px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {reinvestmentStrategy === 'take-salary' && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Salary Amount ($)
                      </label>
                      <input
                        type="number"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(Number(e.target.value))}
                        className="w-full max-w-xs px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Fixed amount to withdraw each period as your salary
                      </p>
                    </div>
                  )}

                  {reinvestmentStrategy === 'custom' && (
                    <div className="mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Target Amount ($)
                          </label>
                          <input
                            type="number"
                            value={customTargetAmount}
                            onChange={(e) => handleCustomTargetChange(Number(e.target.value))}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Your target final balance
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            % of Balance per Period
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={customGainPercent}
                            onChange={(e) => handleCustomPercentChange(Number(e.target.value))}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Auto-calculated from target
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Final Balance</p>
                  <p className="text-lg font-bold text-gray-800">
                    ${futureProjections[futureProjections.length - 1]?.endValue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Total Cash In</p>
                  <p className="text-lg font-bold text-blue-600">
                    +${totalNewCash.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Total Cash Out</p>
                  <p className="text-lg font-bold text-green-600">
                    ${totalCashOut.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Net Cash Flow</p>
                  <p className={`text-lg font-bold ${totalCashOut - totalNewCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalCashOut - totalNewCash >= 0 ? '+' : ''}${(totalCashOut - totalNewCash).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-300">
                  <p className="text-xs text-gray-500 mb-1">Total Gain</p>
                  <p className="text-lg font-bold text-purple-600">
                    +${totalProfitFromProjections.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-purple-100">
                    <tr className="border-b-2 border-purple-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        {projectionFrequency === 'yearly' ? 'Year' : 
                         projectionFrequency === 'monthly' ? 'Month' :
                         projectionFrequency === 'weekly' ? 'Week' : 'Day'}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Start</th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-600">+ Cash In</th>
                      <th className="text-right py-3 px-4 font-semibold text-indigo-600">Invested</th>
                      <th className="text-right py-3 px-4 font-semibold text-purple-600">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold text-green-600">- Cash Out</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">End Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futureProjections.map((proj) => (
                      <tr key={proj.period} className="border-b border-purple-100 hover:bg-purple-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-indigo-600">
                          {projectionFrequency === 'yearly' ? `Year ${proj.period}` : 
                           projectionFrequency === 'monthly' ? `Month ${proj.period}` :
                           projectionFrequency === 'weekly' ? `Week ${proj.period}` : `Day ${proj.period}`}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">${proj.startValue.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-blue-600 font-medium">
                          {proj.newCash > 0 ? `+$${proj.newCash.toLocaleString()}` : '-'}
                        </td>
                        <td className="text-right py-3 px-4 text-indigo-600 font-medium">
                          ${proj.totalInvested.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-purple-600 font-semibold">
                          {proj.profit >= 0 ? '+' : ''}${proj.profit.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-green-600 font-medium">
                          {proj.cashOut > 0 ? `-$${proj.cashOut.toLocaleString()}` : '-'}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900">${proj.endValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border-2 border-purple-200">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-800">Note:</strong> Showing{' '}
                  {projectionDuration} {projectionFrequency === 'yearly' ? 'years' : 
                   projectionFrequency === 'monthly' ? 'months' : 
                   projectionFrequency === 'weekly' ? 'weeks' : 'days'} of projections.
                  {' '}Flow: Start → Cash In → Invested → Profit ({roiPercentage}% of Invested) → Cash Out → End Value.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
