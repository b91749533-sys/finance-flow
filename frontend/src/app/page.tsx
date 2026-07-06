'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Zap, PieChart, Bot, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between font-sans">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7C5CFF] flex items-center justify-center font-bold text-white shadow-lg shadow-[#7C5CFF]/20">
            F
          </div>
          <span className="font-bold text-lg tracking-wide">FinanceFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm font-semibold text-slate-400 hover:text-white transition"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push('/auth/register')}
            className="text-sm font-semibold bg-[#7C5CFF] hover:bg-[#6c4ef2] px-5 py-2.5 rounded-xl transition shadow-lg shadow-[#7C5CFF]/15 flex items-center gap-1.5"
          >
            Sign Up <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 flex flex-col md:flex-row items-center gap-16 z-10 flex-1 justify-center">
        
        {/* Left column text */}
        <div className="flex-1 space-y-8 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 text-[#22d3ee] rounded-full text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" /> Empowering young professionals
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
          >
            Intelligent Wealth <br />
            <span className="bg-gradient-to-r from-purple-400 via-[#7C5CFF] to-cyan-400 bg-clip-text text-transparent">
              Engineered for Growth.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto md:mx-0 leading-relaxed"
          >
            Track wealth, manage budgets, automate categorizations, and receive predictive saving tips from FinanceFlow—your premium, AI-powered financial companion.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4"
          >
            <button
              onClick={() => router.push('/auth/register')}
              className="w-full sm:w-auto px-8 py-4 bg-[#7C5CFF] hover:bg-[#6c4ef2] text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-[#7C5CFF]/20"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-bold transition flex items-center justify-center"
            >
              Demo Access
            </button>
          </motion.div>
        </div>

        {/* Right column features layout */}
        <div className="flex-1 w-full max-w-md md:max-w-none grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/10 text-[#7C5CFF] flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">AI Financial Guide</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask natural queries to analyze your spending history and receive automated recommendations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Advanced Budgets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keep category spending under limits with dynamic color changes and automated over-budget notifications.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Bank-Grade Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fully protected sessions, short-lived JWT, secure refresh cookies, and two-factor QR authentication.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Smart CSV Wizard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Easily import existing statements. Missing accounts and categories are automatically resolved and mapped.
            </p>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-8 border-t border-slate-900 text-center text-xs text-slate-600 z-10">
        &copy; {new Date().getFullYear()} FinanceFlow Technologies Inc. All rights reserved. Made for young professionals.
      </footer>
    </div>
  );
}
