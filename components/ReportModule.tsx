import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Printer, PieChart } from 'lucide-react';
import { Purchase, Sale, Expense, CashLog } from '../types';

interface ReportModuleProps {
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  cashLogs: CashLog[];
}

type TimeRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const ReportModule: React.FC<ReportModuleProps> = ({ 
  purchases: allPurchases, 
  sales: allSales, 
  expenses: allExpenses, 
  cashLogs: allCashLogs
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('MONTHLY');

  const filteredData = useMemo(() => {
    const now = new Date();
    const filterByTime = (itemDate: string) => {
      const date = new Date(itemDate);
      if (timeRange === 'DAILY') return date.toDateString() === now.toDateString();
      if (timeRange === 'WEEKLY') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= lastWeek;
      }
      if (timeRange === 'MONTHLY') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (timeRange === 'YEARLY') return date.getFullYear() === now.getFullYear();
      return true;
    };

    const purchases = allPurchases.filter(p => filterByTime(p.date));
    const sales = allSales.filter(s => filterByTime(s.date));
    const expenses = allExpenses.filter(e => filterByTime(e.date));
    
    const adjustments = allCashLogs.filter(log => 
      filterByTime(log.date) && (
        log.note?.includes('সমন্বয়') || 
        log.note?.startsWith('বেশি') || 
        log.note?.startsWith('কম') ||
        log.denominations
      )
    );

    const tPurchase = purchases.reduce((sum, p) => sum + p.total, 0);
    const tSale = sales.reduce((sum, s) => sum + s.total, 0);
    const tExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const tAdjustment = adjustments.reduce((sum, log) => 
      log.type === 'ADD' ? sum + log.amount : sum - log.amount
    , 0);

    return {
      tPurchase,
      tSale,
      tExpense,
      tAdjustment,
      netProfit: tSale - tPurchase - tExpense + tAdjustment
    };
  }, [timeRange, allPurchases, allSales, allExpenses, allCashLogs]);

  const isProfit = filteredData.netProfit >= 0;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-green-600" />
          ব্যবসায়িক রিপোর্ট
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                timeRange === range 
                ? 'bg-green-600 text-white shadow-md scale-105' 
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {range === 'DAILY' ? 'আজ' : range === 'WEEKLY' ? 'সপ্তাহ' : range === 'MONTHLY' ? 'মাস' : 'বছর'}
            </button>
          ))}
          <button onClick={() => window.print()} className="bg-gray-800 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-black shadow-lg">
            <Printer className="w-4 h-4" /> PDF প্রিন্ট
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard label="মোট কেনা" amount={filteredData.tPurchase} icon={<TrendingDown className="text-emerald-600" />} color="bg-emerald-50" textColor="text-emerald-700" />
        <ReportCard label="মোট বেচা" amount={filteredData.tSale} icon={<TrendingUp className="text-blue-600" />} color="bg-blue-50" textColor="text-blue-700" />
        <ReportCard label="মোট খরচ" amount={filteredData.tExpense} icon={<DollarSign className="text-red-600" />} color="bg-red-50" textColor="text-red-700" />
        <ReportCard 
          label={isProfit ? "নিট লাভ" : "নিট লস"} 
          amount={Math.abs(filteredData.netProfit)} 
          icon={<PieChart className={isProfit ? "text-indigo-600" : "text-red-600"} />} 
          color={isProfit ? "bg-indigo-50" : "bg-red-50"} 
          textColor={isProfit ? "text-indigo-700" : "text-red-700"} 
        />
      </div>

    </div>
  );
};

interface ReportCardProps {
  label: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  textColor: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ label, amount, icon, color, textColor }) => (
  <div className={`p-6 rounded-[2rem] shadow-sm border-2 border-gray-50 ${color} transition-all`}>
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
    </div>
    <p className="text-xs font-black text-gray-500 mb-1 uppercase tracking-tight">{label}</p>
    <p className={`text-2xl font-black ${textColor}`}>৳ {amount.toLocaleString('bn-BD')}</p>
  </div>
);

export default ReportModule;