'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useToasts } from '../../../components/Providers';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToasts();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setErrorMsg('Invalid verification link parameters.');
      return;
    }

    api.get(`/auth/verify?token=${token}&email=${email}`)
      .then(() => {
        setStatus('success');
        showToast('Email Verified', 'Account activated! You can now log in.', 'success');
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Verification failed or expired.');
        showToast('Verification Failed', 'Invalid or expired verification link.', 'error');
      });
  }, [searchParams]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-6"
    >
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl mx-auto">
        M
      </div>

      {status === 'loading' && (
        <div className="space-y-4 py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 text-sm">Verifying your email address, please wait...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
          <p className="text-slate-400 text-sm">
            Your email has been verified successfully. Your account is now active and ready to use.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
          >
            Sign In
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
          <p className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
            {errorMsg}
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go back to Login
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function Verify() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
