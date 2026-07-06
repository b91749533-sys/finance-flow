'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useToasts } from '../../components/Providers';
import { Sparkles, Bot, AlertTriangle, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Budgets() {
  const { showToast } = useToasts();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: '',
    amountLimit: '',
  });

  const loadBudgetsData = async () => {
    try {
      const [budRes, catRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/transactions/categories'),
      ]);
      setBudgets(budRes.data.data.budgets);
      setCategories(catRes.data.data.categories);
      
      // Default form category
      const expenseCats = catRes.data.data.categories.filter((c: any) => c.type === 'EXPENSE');
      if (expenseCats.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: expenseCats[0].id }));
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
      showToast('Error', 'Failed to retrieve budget limits.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAiRecommendations = async () => {
    setAiLoading(true);
    try {
      const res = await api.get('/ai/recommendations');
      setRecommendations(res.data.data.recommendations);
    } catch (err) {
      console.error('Failed to load AI suggestions:', err);
      setRecommendations('Could not generate AI optimizations at this time. Please check your Gemini configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadBudgetsData();
    loadAiRecommendations();
  }, []);

  const handleCreateBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.amountLimit) return;

    try {
      await api.post('/budgets', formData);
      showToast('Budget Created', 'New category limit saved successfully.', 'success');
      setIsModalOpen(false);
      setFormData(prev => ({ ...prev, amountLimit: '' }));
      loadBudgetsData();
      loadAiRecommendations(); // Refresh tips
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not create budget.', 'error');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Delete this budget limit?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      showToast('Budget Deleted', 'Category limit removed.', 'success');
      loadBudgetsData();
      loadAiRecommendations();
    } catch (err) {
      showToast('Error', 'Failed to delete budget.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Budgets list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">Monthly Category Limits</h3>
              <p className="text-xs text-slate-500 mt-0.5">Control category-wise monthly thresholds.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Create Budget
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="p-12 text-center col-span-2 text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : budgets.length === 0 ? (
              <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center col-span-2 text-slate-400 text-xs">
                No active budgets found. Click "Create Budget" to start tracking limits.
              </div>
            ) : (
              budgets.map((b) => {
                const limit = Number(b.amountLimit);
                const spent = Number(b.currentSpent);
                const percent = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
                const isOver = spent > limit;

                let progressColor = 'bg-emerald-500';
                let textColor = 'text-emerald-600 dark:text-emerald-400';
                let borderClass = 'border-slate-200 dark:border-slate-800';

                if (percent >= 100) {
                  progressColor = 'bg-rose-500';
                  textColor = 'text-rose-500';
                  borderClass = 'border-rose-200 dark:border-rose-950/60 bg-rose-500/5';
                } else if (percent >= 80) {
                  progressColor = 'bg-amber-500';
                  textColor = 'text-amber-500';
                  borderClass = 'border-amber-200 dark:border-amber-950/60 bg-amber-500/5';
                }

                return (
                  <div
                    key={b.id}
                    className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl card-shadow flex flex-col justify-between ${borderClass} transition duration-300`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                          {b.category?.icon === 'Utensils' ? '🍔' : b.category?.icon === 'Film' ? '🎬' : '🛍️'}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">{b.category?.name}</h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Monthly</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-end justify-between text-xs">
                        <span className="text-slate-500">Spent: <strong>{spent.toFixed(2)} DH</strong></span>
                        <span className={`font-bold ${textColor}`}>{limit.toFixed(0)} DH limit</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                        <span>{percent.toFixed(0)}% used</span>
                        {isOver ? (
                          <span className="text-rose-500 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Over budget
                          </span>
                        ) : (
                          <span className="text-emerald-500 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Under limit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Gemini AI Recommendations */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Bot className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm">Aero Smart Advisory</h3>
              <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold ml-auto uppercase tracking-wider">AI</span>
            </div>

            {aiLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                Analyzing spending parameters...
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-slate-300 space-y-2 whitespace-pre-line">
                {/* AI Markdown parsing */}
                {recommendations.split('\n').map((line, lIdx) => {
                  let processed = line;
                  const boldMatch = processed.match(/\*(.*?)\*/g);
                  if (boldMatch) {
                    return (
                      <p key={lIdx} className="m-0">
                        {processed.split('*').map((part, pIdx) => 
                          pIdx % 2 === 1 ? <strong key={pIdx} className="text-blue-400">{part}</strong> : part
                        )}
                      </p>
                    );
                  }
                  if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    return (
                      <li key={lIdx} className="ml-3 list-disc">
                        {line.substring(2)}
                      </li>
                    );
                  }
                  return <p key={lIdx} className="m-0">{line}</p>;
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal: Create Budget Limit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">Track Category Budget</h3>
              <form onSubmit={handleCreateBudgetSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expense Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  >
                    {categories.filter(c => c.type === 'EXPENSE').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Limit (DH)</label>
                  <input
                    type="number"
                    required
                    value={formData.amountLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountLimit: e.target.value }))}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Log Limit
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
