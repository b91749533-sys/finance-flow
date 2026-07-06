'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useToasts } from '../../components/Providers';
import {
  Search,
  Filter,
  Trash2,
  Tag,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Edit2,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Transactions() {
  const { showToast } = useToasts();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceiptTxId, setActiveReceiptTxId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isBulkCatOpen, setIsBulkCatOpen] = useState(false);
  const [bulkCatId, setBulkCatId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
        ...(selectedCategory && { categoryId: selectedCategory }),
        ...(selectedAccount && { accountId: selectedAccount }),
        ...(selectedType && { type: selectedType }),
        ...(minAmount && { minAmount }),
        ...(maxAmount && { maxAmount }),
      });

      const [txRes, catRes, accRes] = await Promise.all([
        api.get(`/transactions?${queryParams.toString()}`),
        api.get('/transactions/categories'),
        api.get('/users/accounts'),
      ]);

      setTransactions(txRes.data.data.transactions);
      setTotal(txRes.data.data.pagination.total);
      setTotalPages(txRes.data.data.pagination.pages);
      setCategories(catRes.data.data.categories);
      setAccounts(accRes.data.data.accounts);
    } catch (err) {
      console.error('Failed to load transaction data:', err);
      showToast('Error', 'Failed to retrieve transactions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds([]); // Reset selection on reload
  }, [page, selectedCategory, selectedAccount, selectedType]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      loadData();
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedAccount('');
    setSelectedType('');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
  };

  // Selection handlers
  const handleCheckboxChange = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(transactions.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;
    try {
      await api.post('/transactions/bulk-delete', { ids: selectedIds });
      showToast('Success', `${selectedIds.length} transactions deleted successfully.`, 'success');
      setSelectedIds([]);
      loadData();
    } catch (err) {
      showToast('Error', 'Failed to delete selected transactions.', 'error');
    }
  };

  const handleBulkCategorizeSubmit = async () => {
    if (!bulkCatId) return;
    try {
      await api.post('/transactions/bulk-categorize', { ids: selectedIds, categoryId: bulkCatId });
      showToast('Success', 'Transactions categorized successfully.', 'success');
      setIsBulkCatOpen(false);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      showToast('Error', 'Failed to categorize selected transactions.', 'error');
    }
  };

  // CSV Import/Export
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/transactions/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      showToast('Error', 'Failed to export statement.', 'error');
    }
  };

  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await api.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('CSV Imported', res.data.message, 'success');
      setIsImportOpen(false);
      setImportFile(null);
      loadData();
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'CSV Import failed.', 'error');
    }
  };

  // Receipt upload
  const handleReceiptUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !activeReceiptTxId) return;

    const formData = new FormData();
    formData.append('receipt', receiptFile);

    try {
      const uploadRes = await api.post('/transactions/receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const receiptUrl = uploadRes.data.data.receiptUrl;

      // Update transaction with receipt URL
      await api.put(`/transactions/${activeReceiptTxId}`, { receiptUrl });
      showToast('Receipt Attached', 'File saved and linked to transaction.', 'success');
      setIsReceiptOpen(false);
      setReceiptFile(null);
      loadData();
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Failed to attach receipt.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl card-shadow">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 w-64"
              />
            </div>
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              Search
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        </div>

        {/* Filters drawer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl card-shadow flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-4.5 h-4.5" /> Filters:
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline ml-auto"
          >
            Reset All
          </button>
        </div>

        {/* Selection actions bar */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-xl"
          >
            <span className="text-xs font-semibold">{selectedIds.length} transactions selected</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBulkCatOpen(true)}
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Tag className="w-3.5 h-3.5" /> Re-Categorize
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          </motion.div>
        )}

        {/* Transactions Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/10">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === transactions.length && transactions.length > 0}
                    />
                  </th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Account</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      No transactions match current filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition">
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tx.id)}
                            onChange={() => handleCheckboxChange(tx.id)}
                          />
                        </td>
                        <td className="p-4 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={tx.description}>
                            {tx.description}
                          </div>
                          {tx.notes && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{tx.notes}</p>}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: tx.category?.color + '15', color: tx.category?.color }}
                          >
                            {tx.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500">{tx.account?.name}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {tx.tags.map((tag: string) => (
                              <span key={tag} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-[9px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <span className={`font-bold ${isIncome ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                            {isIncome ? '+' : '-'}{Number(tx.amount).toFixed(2)} DH
                          </span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setActiveReceiptTxId(tx.id);
                                setIsReceiptOpen(true);
                              }}
                              title={tx.receiptUrl ? 'View receipt' : 'Attach receipt'}
                              className={`p-1.5 rounded-lg border transition ${
                                tx.receiptUrl
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-900'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this transaction?')) {
                                  try {
                                    await api.delete(`/transactions/${tx.id}`);
                                    showToast('Success', 'Transaction deleted.', 'success');
                                    loadData();
                                  } catch (err) {
                                    showToast('Error', 'Failed to delete transaction.', 'error');
                                  }
                                }
                              }}
                              className="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Total {total} records</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2">{page} / {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal: CSV Import Wizard */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">Import CSV Statements</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Upload your banking statements. The wizard automatically resolves and maps accounts and categories. Format:
                <code className="block bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-[10px] mt-2 font-mono">
                  Date,Description,Amount,Type,Category,Account,Notes,Tags
                </code>
              </p>
              <form onSubmit={handleImportCSVSubmit} className="space-y-4 pt-2">
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Upload Statement
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Bulk Categorize Selection */}
      <AnimatePresence>
        {isBulkCatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkCatOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">Bulk Categorize</h3>
              <p className="text-xs text-slate-500">Apply a category to all {selectedIds.length} selected items.</p>
              <select
                value={bulkCatId}
                onChange={(e) => setBulkCatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsBulkCatOpen(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkCategorizeSubmit}
                  disabled={!bulkCatId}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition disabled:opacity-50"
                >
                  Apply Category
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Receipt File Attachment */}
      <AnimatePresence>
        {isReceiptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">Receipt Attachment</h3>
              
              {/* Check if current transaction has receiptUrl */}
              {transactions.find(t => t.id === activeReceiptTxId)?.receiptUrl ? (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-center min-h-[150px]">
                    {transactions.find(t => t.id === activeReceiptTxId).receiptUrl.endsWith('.pdf') ? (
                      <div className="text-center p-4">
                        <span className="text-4xl">📄</span>
                        <p className="text-xs text-slate-500 mt-2">PDF Document Attached</p>
                      </div>
                    ) : (
                      <img
                        src={`http://localhost:5000${transactions.find(t => t.id === activeReceiptTxId).receiptUrl}`}
                        alt="Receipt"
                        className="max-h-[300px] object-contain rounded"
                      />
                    )}
                  </div>
                  <a
                    href={`http://localhost:5000${transactions.find(t => t.id === activeReceiptTxId).receiptUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-xs text-blue-600 hover:underline"
                  >
                    Open receipt in new tab
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-normal">
                  Upload an image or a PDF receipt copy to attach it to this transaction. Max size: 5MB.
                </p>
              )}

              <form onSubmit={handleReceiptUploadSubmit} className="space-y-4 pt-2">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReceiptOpen(false);
                      setReceiptFile(null);
                    }}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Attach Receipt
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
