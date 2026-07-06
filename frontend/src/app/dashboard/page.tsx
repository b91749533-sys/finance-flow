'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useToasts } from '../../components/Providers';
import { useAuthStore } from '../../store/auth';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Sparkles,
  Bot,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  ChevronRight,
  PlusCircle,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiChatbot } from '../../components/AiChatbot';

export default function Dashboard() {
  const { showToast } = useToasts();
  const { user } = useAuthStore();
  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Transaction Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newTx, setNewTx] = useState({
    accountId: '',
    categoryId: '',
    amount: '',
    type: 'EXPENSE',
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    tags: '',
  });

  const loadDashboardData = async () => {
    try {
      const [ovRes, accRes, catRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/users/accounts'),
        api.get('/transactions/categories'),
      ]);
      setData(ovRes.data.data.overview);
      setAccounts(accRes.data.data.accounts);
      setCategories(catRes.data.data.categories);

      // Default the modal account and category
      if (accRes.data.data.accounts.length > 0) {
        setNewTx(prev => ({
          ...prev,
          accountId: accRes.data.data.accounts[0].id,
        }));
      }
      if (catRes.data.data.categories.length > 0) {
        setNewTx(prev => ({
          ...prev,
          categoryId: catRes.data.data.categories[0].id,
        }));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('Error', 'Failed to retrieve wallet statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { accountId, amount, description } = newTx;
    if (!accountId || !amount || !description) {
      showToast('Validation Warning', 'Please specify account, amount and description.', 'warning');
      return;
    }

    try {
      await api.post('/transactions', {
        ...newTx,
        tags: newTx.tags ? newTx.tags.split(',').map(t => t.trim()) : [],
      });
      showToast('Transaction Logged', 'Successfully saved transaction to account.', 'success');
      setIsAddModalOpen(false);
      
      // Reset description
      setNewTx(prev => ({
        ...prev,
        description: '',
        amount: '',
        notes: '',
        tags: '',
      }));
      
      loadDashboardData(); // Refresh overview
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not record transaction.', 'error');
    }
  };

  if (loading || !data) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const {
    currentBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    netWorth,
    financialScore,
    recentTransactions,
    upcomingBills,
    todaySpent,
    todayEarned,
  } = data;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 z-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Good morning, {firstName} 👋
            </h2>
            <p className="text-slate-400 text-xs font-semibold">Let's make today a good financial day</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#7C5CFF] hover:bg-[#6c4ef2] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-[#7C5CFF]/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Log Transaction
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-4.5 h-4.5" /> Chat with AI
            </button>
          </div>
        </div>

        {/* 5 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className="bg-[#121424] border border-[#1e223d] p-6 rounded-2xl card-shadow flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Balance</span>
              <div className="p-2 bg-indigo-950/40 text-[#7C5CFF] rounded-xl">
                <Wallet className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-auto">
              <h3 className="text-2xl font-bold tracking-tight text-white">{netWorth.toLocaleString()} DH</h3>
              <svg className="w-full h-8 mt-2 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="purple-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,28 L0,15 Q25,8 50,22 T100,5 L100,28 Z" fill="url(#purple-grad)" />
                <path d="M0,15 Q25,8 50,22 T100,5" fill="none" stroke="#7C5CFF" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="bg-[#121424] border border-[#1e223d] p-6 rounded-2xl card-shadow flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Income</span>
              <div className="p-2 bg-cyan-950/40 text-[#22d3ee] rounded-xl">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-auto">
              <h3 className="text-2xl font-bold tracking-tight text-[#22d3ee]">
                +{monthlyIncome.toLocaleString()} DH
              </h3>
              <svg className="w-full h-8 mt-2 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyan-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,28 L0,20 Q25,10 50,18 T100,6 L100,28 Z" fill="url(#cyan-grad)" />
                <path d="M0,20 Q25,10 50,18 T100,6" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="bg-[#121424] border border-[#1e223d] p-6 rounded-2xl card-shadow flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expenses</span>
              <div className="p-2 bg-rose-950/40 text-[#ff007a] rounded-xl">
                <TrendingDown className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-auto">
              <h3 className="text-2xl font-bold tracking-tight text-[#ff007a]">
                -{monthlyExpenses.toLocaleString()} DH
              </h3>
              <svg className="w-full h-8 mt-2 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="rose-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff007a" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#ff007a" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,28 L0,10 Q25,24 50,15 T100,22 L100,28 Z" fill="url(#rose-grad)" />
                <path d="M0,10 Q25,24 50,15 T100,22" fill="none" stroke="#ff007a" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="bg-[#121424] border border-[#1e223d] p-6 rounded-2xl card-shadow flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Savings Rate</span>
              <div className="p-2 bg-amber-950/40 text-[#ff9e7d] rounded-xl">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <h3 className="text-2xl font-bold tracking-tight text-[#ff9e7d]">
                {savingsRate.toFixed(0)}%
              </h3>
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="22" cy="22" r="16" className="stroke-slate-800 fill-none" strokeWidth="3" />
                  <circle cx="22" cy="22" r="16" className="stroke-[#ff9e7d] fill-none" strokeWidth="3"
                          strokeDasharray={100} strokeDashoffset={100 - Math.min(100, Math.max(0, savingsRate))} strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#121424] border border-[#1e223d] p-6 rounded-2xl card-shadow flex flex-col justify-between h-[155px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Flow</span>
              <div className="p-2 bg-amber-950/40 text-amber-500 rounded-xl">
                <Activity className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5 mt-auto pb-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Earned:</span>
                <span className="font-bold text-emerald-400">+{todayEarned.toLocaleString()} DH</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Spent:</span>
                <span className="font-bold text-rose-500">-{todaySpent.toLocaleString()} DH</span>
              </div>
            </div>
          </div>

        </div>

        {/* Middle row: Dashboard breakdown & Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Accounts Widget */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-shadow p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base">Your Accounts</h3>
              <span className="text-xs font-semibold text-slate-500">Asset summary</span>
            </div>
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No accounts linked yet. Click settings or admin.</div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/20 transition duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                        {acc.type === 'CREDIT' ? '💳' : '🏦'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{acc.name}</h4>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{acc.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-sm ${acc.type === 'CREDIT' ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                        {acc.type === 'CREDIT' ? '-' : ''}{Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} DH
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Financial Score Dial */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-shadow p-6 flex flex-col justify-between items-center text-center">
            <div className="w-full flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Financial Health Score</h3>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">INDEX</span>
            </div>

            {/* Custom SVG Dial */}
            <div className="relative w-36 h-36 flex items-center justify-center my-6">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle cx="72" cy="72" r="58" strokeWidth="10" stroke="#1e223d" fill="transparent" />
                {/* Progress Ring */}
                <circle
                  cx="72" cy="72" r="58" strokeWidth="10" stroke="#7C5CFF"
                  strokeDasharray={2 * Math.PI * 58}
                  strokeDashoffset={2 * Math.PI * 58 * (1 - financialScore / 100)}
                  strokeLinecap="round" fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold">{financialScore}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flow Score</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed px-4">
              Your ranking is computed from your savings rate, budget limits adherence, and savings progress. A score above 75 represents excellent health.
            </p>
          </div>

        </div>

        {/* Bottom row: Recent Transactions & Upcoming Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Transactions list */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-shadow p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Recent Transactions</h3>
              <a href="/transactions" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No recent transactions recorded.</div>
              ) : (
                recentTransactions.map((tx: any) => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-sm">
                          {isIncome ? '💰' : '🏷️'}
                        </span>
                        <div>
                          <h4 className="font-semibold text-sm truncate max-w-xs">{tx.description}</h4>
                          <span className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString()} &bull; {tx.category?.name || 'Uncategorized'}</span>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${isIncome ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                        {isIncome ? '+' : '-'}{Number(tx.amount).toFixed(2)} DH
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Bills List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-shadow p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Upcoming Bills</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">7 Days</span>
            </div>
            <div className="flex-1 space-y-4">
              {upcomingBills.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                  No bills due in the next 7 days.
                </div>
              ) : (
                upcomingBills.map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center text-xs font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">{bill.name}</h4>
                        <span className="text-[10px] text-slate-400">Due: {new Date(bill.nextBillingDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-rose-500">
                      -{Number(bill.amount).toFixed(2)} DH
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* AI Bot Sidebar Component */}
      <AiChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Modal: Log Transaction */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl card-shadow overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-base">Record a Transaction</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="p-6 text-center space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You don't have any wallets configured yet. Create a default cash wallet to start logging transactions.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.post('/users/accounts', {
                          name: 'Main Wallet',
                          type: 'CHECKING',
                          balance: 0,
                          currency: 'MAD',
                        });
                        showToast('Account Created', 'Main Wallet created successfully.', 'success');
                        
                        // Load updated account list and overview stats
                        const [accRes, ovRes] = await Promise.all([
                          api.get('/users/accounts'),
                          api.get('/analytics/overview'),
                        ]);
                        
                        setAccounts(accRes.data.data.accounts);
                        setData(ovRes.data.data.overview);
                        
                        if (accRes.data.data.accounts.length > 0) {
                          setNewTx(prev => ({
                            ...prev,
                            accountId: accRes.data.data.accounts[0].id,
                          }));
                        }
                      } catch (err) {
                        showToast('Error', 'Failed to create account.', 'error');
                      }
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-blue-500/25"
                  >
                    Create Default Wallet (Main Wallet)
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddTransactionSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                    <select
                      value={newTx.type}
                      onChange={(e) => setNewTx(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount (DH)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newTx.amount}
                      onChange={(e) => setNewTx(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    required
                    value={newTx.description}
                    onChange={(e) => setNewTx(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Starbucks Coffee"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
                    <select
                      value={newTx.accountId}
                      onChange={(e) => setNewTx(prev => ({ ...prev, accountId: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={newTx.categoryId}
                      onChange={(e) => setNewTx(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    >
                      <option value="">Auto-Detect (AI)</option>
                      {categories.filter(c => c.type === newTx.type).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={newTx.date}
                      onChange={(e) => setNewTx(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={newTx.tags}
                      onChange={(e) => setNewTx(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="coffee, monthly"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</label>
                  <textarea
                    value={newTx.notes}
                    onChange={(e) => setNewTx(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Attach short notes..."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition"
                  >
                    Log Transaction
                  </button>
                </div>
              </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
