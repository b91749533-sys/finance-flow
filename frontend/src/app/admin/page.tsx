'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useToasts } from '../../components/Providers';
import { ShieldAlert, Users, Database, Activity, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Admin() {
  const { showToast } = useToasts();
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const [metricsRes, usersRes, logsRes, alertsRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
        api.get('/admin/fraud-alerts'),
      ]);

      setMetrics(metricsRes.data.data.metrics);
      setUsers(usersRes.data.data.users);
      setAuditLogs(logsRes.data.data.logs);
      setFraudAlerts(alertsRes.data.data.alerts);
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
      showToast('Restricted Access', 'Failed to retrieve administrative records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [user]);

  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change this user role to ${nextRole}?`)) return;

    try {
      await api.put(`/admin/users/${targetUserId}/role`, { role: nextRole });
      showToast('Role Updated', `User promoted to ${nextRole} successfully.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Failed to modify role.', 'error');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <ShieldAlert className="w-16 h-16 text-rose-500" />
          <h2 className="text-xl font-bold">Unauthorized Access</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            This module is reserved for administrators only. Your current role is {user?.role}.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading || !metrics) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
              <h3 className="text-2xl font-bold tracking-tight">{metrics.totalUsers}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Actions</span>
              <h3 className="text-2xl font-bold tracking-tight">{metrics.totalTransactions}</h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Volume</span>
              <h3 className="text-2xl font-bold tracking-tight">{metrics.totalVolume.toLocaleString()} DH</h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Sessions</span>
              <h3 className="text-2xl font-bold tracking-tight">{metrics.activeSessions}</h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Fraud Alerts panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 mb-2 dark:border-slate-800">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-sm">Security Anomalies & Fraud Monitoring</h3>
            <span className="text-[8px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-auto">REALTIME</span>
          </div>

          <div className="space-y-3">
            {fraudAlerts.length === 0 ? (
              <div className="text-xs text-emerald-500 bg-emerald-500/5 p-4 border border-emerald-500/10 rounded-xl flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4.5 h-4.5" /> No security anomalies or risk patterns flagged on the network.
              </div>
            ) : (
              fraudAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 border rounded-xl text-xs flex justify-between items-start gap-4 ${
                    alert.severity === 'high'
                      ? 'bg-rose-500/5 border-rose-500/15 text-rose-600 dark:text-rose-400'
                      : alert.severity === 'medium'
                      ? 'bg-amber-500/5 border-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-500/5 border-blue-500/15 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <p className="leading-relaxed font-medium">{alert.message}</p>
                  <span className="text-[9px] text-slate-400 flex-shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lower layout: User List and System Audit Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* User management list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between">
            <div className="border-b pb-3 mb-4 dark:border-slate-800">
              <h3 className="font-bold text-sm">User Management</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider dark:border-slate-800">
                    <th className="pb-2.5">Name</th>
                    <th className="pb-2.5">Role</th>
                    <th className="pb-2.5 text-right">Balance</th>
                    <th className="pb-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 dark:text-white">{u.name}</span>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${u.role === 'ADMIN' ? 'bg-blue-600/10 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold">{u.netBalance.toLocaleString()} DH</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="text-[10px] text-blue-600 hover:underline font-semibold"
                        >
                          Toggle Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Audit logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow flex flex-col justify-between">
            <div className="border-b pb-3 mb-4 dark:border-slate-800">
              <h3 className="font-bold text-sm">System Operations Audit Log</h3>
            </div>

            <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/30 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{log.action}</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Triggered by: {log.user?.name || 'System / Unauth'} ({log.user?.email || 'Guest'})
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">IP: {log.ipAddress || 'Internal'}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
