'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useToasts } from '../../../components/Providers';
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const router = useRouter();
  const { showToast } = useToasts();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verificationLink, setVerificationLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Validation Error', 'Please fill in all fields', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      showToast('Registration Successful', 'Verification email sent!', 'success');
      if (res.data.verificationLink) {
        setVerificationLink(res.data.verificationLink);
      }
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Try again.';
      showToast('Registration Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Check Your Inbox</h2>
            <p className="text-slate-400 text-sm">
              We've sent a verification link to <span className="text-blue-400 font-semibold">{email}</span>. Click the link in the email to activate your account.
            </p>
          </div>
          
          {verificationLink ? (
            <a
              href={verificationLink}
              className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
            >
              Verify Account Instantly (Local Testing)
            </a>
          ) : (
            <div className="border border-slate-700 bg-slate-900/50 rounded-xl p-4 text-left">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local Testing tip:</h4>
              <p className="text-xs text-slate-400 mt-1">
                Since email is mocked locally, please check the **backend console terminal output** to find your verification link and copy it here!
              </p>
            </div>
          )}
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-white">Create your account</h2>
          <p className="text-slate-400 text-sm">Join FinanceFlow and master your personal finance.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-sm focus:outline-none text-white placeholder-slate-600"
              />
            </div>
          </div>

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
            <label className="text-xs font-semibold text-slate-400">Password</label>
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? 'Creating Account...' : 'Get Started'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-blue-400 hover:underline">
            Log in
          </a>
        </p>
      </motion.div>
    </div>
  );
}
