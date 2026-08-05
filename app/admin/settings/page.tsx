'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import { Settings as SettingsIcon, Shield, Save, Check, Moon, Sun, Monitor } from 'lucide-react';

export default function AdminSettingsPage() {
  const [theme, setTheme] = useState('dark');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Platform settings updated successfully!');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Platform Settings</h1>
            <p className="text-xs text-slate-400 mt-1">
              General platform configuration, theme preferences, and security options.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="max-w-2xl glass-card-dark p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <span>System Preferences</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-6 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Admin Portal Interface Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Dark Mode', val: 'dark', icon: Moon },
                  { name: 'Light Mode', val: 'light', icon: Sun },
                  { name: 'System Default', val: 'system', icon: Monitor },
                ].map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setTheme(t.val)}
                    className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                      theme === t.val
                        ? 'bg-primary text-white border-primary font-bold shadow-lg shadow-primary/25'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <t.icon className="w-5 h-5" />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Security Status</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                JWT auth middleware enabled with HTTP-only cookies and bcrypt password encryption.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
