'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useToasts } from '../../components/Providers';
import { Plus, PiggyBank, Target, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Savings() {
  const { showToast } = useToasts();
  const [goals, setGoals] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  const [contributionAmount, setContributionAmount] = useState('');

  const loadGoalsData = async () => {
    try {
      const [goalsRes, analyticsRes] = await Promise.all([
        api.get('/goals'),
        api.get('/goals/analytics'),
      ]);
      setGoals(goalsRes.data.data.goals);
      setAnalytics(analyticsRes.data.data.analytics);
    } catch (err) {
      console.error('Failed to load goals:', err);
      showToast('Error', 'Failed to retrieve savings goals details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoalsData();
  }, []);

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, targetAmount, deadline } = newGoal;
    if (!name || !targetAmount || !deadline) return;

    try {
      await api.post('/goals', {
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(newGoal.currentAmount || '0'),
        deadline,
      });
      showToast('Savings Goal Created', 'Target and deadline saved successfully.', 'success');
      setIsCreateOpen(false);
      setNewGoal({ name: '', targetAmount: '', currentAmount: '', deadline: '' });
      loadGoalsData();
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not save savings goal.', 'error');
    }
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionAmount || !activeGoalId) return;

    try {
      await api.post(`/goals/${activeGoalId}/contribute`, { amount: contributionAmount });
      showToast('Funds Deposited', 'Goal balance updated successfully.', 'success');
      setIsContributeOpen(false);
      setContributionAmount('');
      loadGoalsData();
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not add funds.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Goals Stats Overview */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Saved</span>
              <h3 className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {Number(analytics.totalSaved).toLocaleString()} DH
              </h3>
              <p className="text-[10px] text-slate-400">Cumulative savings across all active goals</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-500">
                {analytics.progressPercent.toFixed(1)}%
              </h3>
              <p className="text-[10px] text-slate-400">Target of {Number(analytics.totalTarget).toLocaleString()} DH</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Goals</span>
              <h3 className="text-2xl font-bold tracking-tight text-indigo-500">
                {analytics.completedGoals} / {analytics.totalGoals}
              </h3>
              <p className="text-[10px] text-slate-400">Successfully completed objectives</p>
            </div>
          </div>
        )}

        {/* Toolbar header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Your Active Savings Targets</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visualize contribution histories and trajectories.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Create Goal
          </button>
        </div>

        {/* Goals Listing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="p-12 text-center col-span-3 text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : goals.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center col-span-3 text-slate-400 text-xs">
              No savings goals configured. Add a goal to start saving.
            </div>
          ) : (
            goals.map((g) => {
              const target = Number(g.targetAmount);
              const current = Number(g.currentAmount);
              const percent = Math.min(100, target > 0 ? (current / target) * 100 : 0);
              const isCompleted = g.status === 'COMPLETED' || current >= target;

              return (
                <div
                  key={g.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between space-y-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate max-w-[150px]">
                          {g.name}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> Due {new Date(g.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        COMPLETED
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between text-xs">
                      <span className="text-slate-500">Saved: <strong>{current.toFixed(0)} DH</strong></span>
                      <span className="text-slate-400">Goal: {target.toFixed(0)} DH</span>
                    </div>
                    {/* progress bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>{percent.toFixed(1)}% of target</span>
                      <span className="font-bold">
                        {isCompleted ? 'Target met! 🎉' : `${(target - current).toFixed(0)} DH left`}
                      </span>
                    </div>
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => {
                        setActiveGoalId(g.id);
                        setIsContributeOpen(true);
                      }}
                      className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200/40 dark:border-slate-800"
                    >
                      <Target className="w-4 h-4" /> Save Funds
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Modal: Create Goal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">New Savings Goal</h3>
              <form onSubmit={handleCreateGoalSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Name</label>
                  <input
                    type="text"
                    required
                    value={newGoal.name}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. New MacBook Pro"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target (DH)</label>
                    <input
                      type="number"
                      required
                      value={newGoal.targetAmount}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                      placeholder="e.g. 2500"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start (DH)</label>
                    <input
                      type="number"
                      value={newGoal.currentAmount}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, currentAmount: e.target.value }))}
                      placeholder="e.g. 0"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline</label>
                  <input
                    type="date"
                    required
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Create Goal
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Contribute to Goal */}
      <AnimatePresence>
        {isContributeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsContributeOpen(false);
                setContributionAmount('');
              }}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-xs w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">Contribute Savings</h3>
              <p className="text-xs text-slate-500">
                Deposit cash into your goal balance.
              </p>
              <form onSubmit={handleContributeSubmit} className="space-y-4">
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="Enter amount (DH)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsContributeOpen(false);
                      setContributionAmount('');
                    }}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Deposit Funds
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
