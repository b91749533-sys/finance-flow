'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import { useToasts } from '../../../components/Providers';
import { Mail, Lock, KeyRound, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { showToast } = useToasts();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Validation Error', 'Please enter email and password', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        ...(requires2FA && { code }),
      });

      if (res.data.requires2FA) {
        setRequires2FA(true);
        showToast('2FA Code Required', 'Please enter your 2FA security code', 'info');
      } else {
        const { token, user } = res.data.data;
        setAuth(user, token);
        showToast('Welcome Back!', `Logged in successfully as ${user.name}`, 'success');
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Try again.';
      showToast('Login Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl card-shadow z-10"
      >
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 bg-[#7C5CFF] rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto shadow-lg shadow-[#7C5CFF]/20">
            F
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-slate-400 text-sm">Enter your credentials to access your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requires2FA ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-sm focus:outline-none text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-sm focus:outline-none text-white placeholder-slate-600"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">2FA Security Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-sm focus:outline-none text-white placeholder-slate-600 tracking-wider text-center"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? 'Processing...' : requires2FA ? 'Verify Code' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between text-xs">
          <a href="/auth/register" className="text-blue-400 hover:underline">
            Create an account
          </a>
        </div>
      </motion.div>
    </div>
  );
}
