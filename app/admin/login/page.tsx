'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid admin credentials');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-card-dark p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-3 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-xl shadow-primary/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">MorExpert Admin</h1>
          <p className="text-xs text-slate-400">
            Enter your administrator credentials to access the slot booking management dashboard.
          </p>
        </div>

        {/* Login Error Notification */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@morexpert.com"
                className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 font-bold text-white bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Access Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Back to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}
