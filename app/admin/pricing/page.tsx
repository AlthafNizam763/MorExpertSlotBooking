'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import { DollarSign, Save, Loader2, Check, Percent, Tag } from 'lucide-react';
import { useToast } from '@/components/Notification/ToastContext';

export default function AdminPricingPage() {
  const toast = useToast();
  const [defaultPrice, setDefaultPrice] = useState<number>(500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
          setDefaultPrice(json.data.defaultPrice || 500);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPrice: Number(defaultPrice) }),
      });

      const json = await res.json();
      if (json.success) {
        const msg = 'Pricing settings updated successfully!';
        setSuccessMsg(msg);
        toast.success(msg, 'Pricing Updated');
      } else {
        toast.error(json.error || 'Failed to update pricing settings.', 'Update Error');
      }
    } catch (err) {
      toast.error('Failed to update pricing settings.', 'Network Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Pricing Settings</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure default slot booking prices and promotional discount rules.
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
            <DollarSign className="w-5 h-5 text-sky-400" />
            <span>Base Pricing & Defaults</span>
          </h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Default Per-Slot Review Price (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    required
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Number(e.target.value))}
                    placeholder="500"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-base focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Initial price displayed when admin assigns price to a pending booking.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-accent font-bold text-sm">
                  <Tag className="w-4 h-4" />
                  <span>Coupon Codes & Discounts (Future Ready)</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Support for promo coupons (e.g. MOR50 for 50% discount) and holiday surge pricing is built into the MorExpert system schema.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /><span>Update Pricing</span></>}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
