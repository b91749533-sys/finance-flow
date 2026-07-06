'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useToasts } from '../../components/Providers';
import {
  User as UserIcon,
  ShieldCheck,
  Smartphone,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Bell,
  Mail,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { showToast } = useToasts();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Settings toggles
  const [theme, setTheme] = useState(user?.settings?.theme || 'light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.settings?.notificationsEnabled ?? true);
  const [emailAlerts, setEmailAlerts] = useState(user?.settings?.emailAlerts ?? true);

  // 2FA state
  const [is2faSetupOpen, setIs2faSetupOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [tokenCode, setTokenCode] = useState('');

  // Device & sessions list
  const [sessions, setSessions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const loadSessionsData = async () => {
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data.data.sessions);
      setDevices(res.data.data.devices);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }
  };

  useEffect(() => {
    loadSessionsData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/users/profile', { name, email });
      updateUser({ name, email });
      showToast('Profile Updated', 'Your profile details have been saved.', 'success');
    } catch (err) {
      showToast('Error', 'Failed to update profile.', 'error');
    }
  };

  const handleToggleSettings = async (field: 'notificationsEnabled' | 'emailAlerts', value: boolean) => {
    try {
      // Optimistic update
      updateUser({
        settings: {
          ...(user?.settings || { theme: 'light', currency: 'USD', notificationsEnabled: true, emailAlerts: true }),
          [field]: value,
        },
      });

      if (field === 'notificationsEnabled') setNotificationsEnabled(value);
      if (field === 'emailAlerts') setEmailAlerts(value);

      await api.put('/users/settings', { [field]: value });
    } catch (err) {
      showToast('Error', 'Failed to save settings changes.', 'error');
    }
  };

  // 2FA setups
  const handleInitiate2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCodeUrl(res.data.data.qrCodeUrl);
      setSecret(res.data.data.secret);
      setIs2faSetupOpen(true);
    } catch (err) {
      showToast('Error', 'Could not configure 2FA secret.', 'error');
    }
  };

  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenCode) return;

    try {
      const res = await api.post('/auth/2fa/verify', {
        token: tokenCode,
        enable: !twoFactorEnabled, // Toggle status
      });

      setTwoFactorEnabled(!twoFactorEnabled);
      updateUser({ twoFactorEnabled: !twoFactorEnabled });
      setIs2faSetupOpen(false);
      setTokenCode('');
      showToast('2FA Status Updated', res.data.message, 'success');
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Invalid code.', 'error');
    }
  };

  const handleRevokeSessions = async () => {
    if (!window.confirm('Log out from all other sessions and devices?')) return;
    try {
      await api.post('/auth/logout-all');
      showToast('Sessions Revoked', 'Logged out from all other devices.', 'success');
      loadSessionsData();
    } catch (err) {
      showToast('Error', 'Failed to terminate other sessions.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General Profile & Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-4">
            <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">Profile Settings</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-500/25"
              >
                Save Profile
              </button>
            </form>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-5">
            <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">Notification Settings</h3>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold">In-App Alerts</h4>
                <p className="text-xs text-slate-500">Real-time browser notifications for budget thresholds</p>
              </div>
              <button
                onClick={() => handleToggleSettings('notificationsEnabled', !notificationsEnabled)}
                className="text-slate-400 hover:text-slate-600"
              >
                {notificationsEnabled ? (
                  <ToggleRight className="w-10 h-10 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold">Email Notifications</h4>
                <p className="text-xs text-slate-500">Security notifications and monthly analytical briefs</p>
              </div>
              <button
                onClick={() => handleToggleSettings('emailAlerts', !emailAlerts)}
                className="text-slate-400 hover:text-slate-600"
              >
                {emailAlerts ? (
                  <ToggleRight className="w-10 h-10 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Security, 2FA, Devices */}
        <div className="space-y-6">
          
          {/* Two-Factor QR Setup Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm">Two-Factor Authentication</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Add an extra layer of protection to your financial assets. Generates security codes via Google Authenticator.
            </p>

            {twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 p-3 border border-emerald-500/10 rounded-xl text-xs font-semibold">
                  <CheckCircle className="w-4.5 h-4.5" /> 2FA is currently active
                </div>
                <button
                  onClick={handleInitiate2FA}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition"
                >
                  Deactivate 2FA
                </button>
              </div>
            ) : (
              <button
                onClick={handleInitiate2FA}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20"
              >
                Setup 2FA Protection
              </button>
            )}
          </div>

          {/* Trusted Devices and active sessions list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl card-shadow space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Authorized Devices</h3>
              <button
                onClick={handleRevokeSessions}
                className="text-[10px] text-rose-500 hover:underline font-semibold"
              >
                Revoke All
              </button>
            </div>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto">
              {devices.map((dev) => (
                <div key={dev.id} className="flex gap-2.5 items-start text-xs border-b border-slate-50 dark:border-slate-800 pb-2">
                  <Smartphone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-semibold text-slate-800 dark:text-white truncate" title={dev.deviceName}>
                      {dev.deviceName}
                    </h4>
                    <span className="text-[9px] text-slate-400">
                      Active: {new Date(dev.lastActiveAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Setup 2FA verify */}
      <AnimatePresence>
        {is2faSetupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIs2faSetupOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl card-shadow overflow-hidden z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-base">Configure Google 2FA</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Scan the QR code in your Authenticator app, then input the 6-digit verification code below to verify:
              </p>
              
              <div className="flex justify-center p-4 bg-slate-50 rounded-xl border">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 animate-pulse bg-slate-200 rounded" />
                )}
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Secret Key:</span>
                <p className="text-xs font-mono select-all bg-slate-100 dark:bg-slate-800 p-1.5 rounded mt-1 text-slate-700 dark:text-slate-300">
                  {secret}
                </p>
              </div>

              <form onSubmit={handleVerify2FASubmit} className="space-y-4 pt-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={tokenCode}
                  onChange={(e) => setTokenCode(e.target.value)}
                  placeholder="Enter 6-digit token"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center tracking-wider text-slate-800 dark:text-white"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIs2faSetupOpen(false);
                      setTokenCode('');
                    }}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Activate 2FA
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
