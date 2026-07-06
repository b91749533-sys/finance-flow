'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useToasts } from '../../components/Providers';
import {
  PieChart as PieIcon,
  TrendingUp,
  FileText,
  DollarSign,
  Printer,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Analytics() {
  const { showToast } = useToasts();
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<any[]>([]);
  const [projections, setProjections] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAnalyticsData = async () => {
    try {
      const [breakRes, flowRes, nwRes, projRes] = await Promise.all([
        api.get('/analytics/breakdown'),
        api.get('/analytics/cash-flow'),
        api.get('/analytics/net-worth'),
        api.get('/analytics/projections'),
      ]);

      setBreakdown(breakRes.data.data.breakdown);
      setTotalExpense(breakRes.data.data.totalExpense);
      setCashFlow(flowRes.data.data.cashFlow);
      setNetWorthHistory(nwRes.data.data.netWorthHistory);
      setProjections(projRes.data.data.projections);
    } catch (err) {
      console.error('Failed to load analytics details:', err);
      showToast('Error', 'Failed to retrieve analytics databases.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate coordinates for SVG Cash Flow Area Chart
  // cashFlow is array: { month: string, income: number, expenses: number }
  const maxVal = Math.max(...cashFlow.flatMap(c => [c.income, c.expenses]), 1000);
  const chartHeight = 150;
  const chartWidth = 500;
  const padding = 20;
  
  const getPoints = (type: 'income' | 'expenses') => {
    if (cashFlow.length === 0) return '';
    const points = cashFlow.map((cf, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (cashFlow.length - 1);
      const val = type === 'income' ? cf.income : cf.expenses;
      const y = chartHeight - padding - (val * (chartHeight - padding * 2)) / maxVal;
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  // Coordinates for Net Worth Line Chart
  const nwMax = Math.max(...netWorthHistory.map(nw => nw.netWorth), 1000);
  const nwPoints = netWorthHistory.map((nw, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (netWorthHistory.length - 1);
    const y = chartHeight - padding - (nw.netWorth * (chartHeight - padding * 2)) / nwMax;
    return `${x},${y}`;
  }).join(' ');

  return (
    <DashboardLayout>
      <div className="space-y-6 print:p-0 print:space-y-4">
        
        {/* Toolbar Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex justify-between items-center print:hidden">
          <div>
            <h3 className="font-bold text-base">Advanced Insights & Trends</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visualize breakdowns, cash flows, and projections.</p>
          </div>
          <button
            onClick={handlePrintReport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <Printer className="w-4 h-4" /> Print PDF Report
          </button>
        </div>

        {/* Top charts row: Cash flow & Category breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Cash Flow Area Chart (Income vs Expense) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h4 className="font-bold text-sm">Income vs Expenses</h4>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Income</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Expenses</span>
              </div>
            </div>

            {/* Custom SVG Area Chart */}
            <div className="relative w-full overflow-hidden flex items-center justify-center">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                {/* Horizontal gridlines */}
                {[0, 0.5, 1].map((r, i) => {
                  const y = padding + r * (chartHeight - padding * 2);
                  return (
                    <line key={i} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-slate-800" />
                  );
                })}
                
                {/* Income path */}
                <polyline fill="none" stroke="#10b981" strokeWidth="3" points={getPoints('income')} strokeLinecap="round" />
                {/* Expense path */}
                <polyline fill="none" stroke="#ef4444" strokeWidth="3" points={getPoints('expenses')} strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-semibold px-2">
              {cashFlow.map((cf, idx) => (
                <span key={idx}>{cf.month}</span>
              ))}
            </div>
          </div>

          {/* Category distribution pie/breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
              <h4 className="font-bold text-sm">Category Spending</h4>
              <span className="text-[10px] text-slate-500">This Month</span>
            </div>

            <div className="flex-1 space-y-4">
              {breakdown.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No expense breakdown recorded this month.</div>
              ) : (
                breakdown.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {Number(item.amount).toFixed(2)} DH ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    {/* progress line */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Lower Row: Net worth line and savings projections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Net Worth Line Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
              <h4 className="font-bold text-sm">Net Worth Growth</h4>
              <span className="text-[10px] text-slate-400">Past 6 Months</span>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="relative w-full overflow-hidden flex items-center justify-center">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                {/* Horizontal gridlines */}
                {[0, 0.5, 1].map((r, i) => {
                  const y = padding + r * (chartHeight - padding * 2);
                  return (
                    <line key={i} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-slate-800" />
                  );
                })}
                
                {/* Line path */}
                <polyline fill="none" stroke="#2563eb" strokeWidth="3.5" points={nwPoints} strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-semibold px-2">
              {netWorthHistory.map((cf, idx) => (
                <span key={idx}>{cf.month}</span>
              ))}
            </div>
          </div>

          {/* Projections */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-blue-500" />
                <h4 className="font-bold text-sm">12-Month Projections</h4>
              </div>
              <span className="text-[9px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">PREDICTIONS</span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Calculated dynamically using your average savings over the last 3 months. Continue saving consistently to stay on track.
              </p>
              
              <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {projections.map((p, index) => (
                  <div key={index} className="flex justify-between py-2.5 text-xs">
                    <span className="text-slate-500">{p.month}</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {Math.round(p.projectedNetWorth).toLocaleString()} DH
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
