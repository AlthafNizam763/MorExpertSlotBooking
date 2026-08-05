'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Check,
  Sparkles,
  DollarSign,
  FileText,
  CheckCircle2,
  X,
  Database,
  RefreshCw,
  Palette,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/components/Notification/ToastContext';
import { IPackage } from '@/types';
import { formatPrice } from '@/lib/utils';

const GRADIENT_PRESETS = [
  { name: 'Slate Dark', value: 'from-slate-700 via-slate-800 to-slate-900' },
  { name: 'Golden Amber', value: 'from-amber-500 via-amber-600 to-yellow-600' },
  { name: 'Royal Blue & Indigo', value: 'from-blue-600 via-indigo-600 to-purple-600' },
  { name: 'Emerald Teal', value: 'from-emerald-500 via-teal-600 to-cyan-600' },
  { name: 'Rose Sunset', value: 'from-rose-500 via-pink-600 to-purple-600' },
];

export default function AdminPackagesPage() {
  const toast = useToast();
  const [packages, setPackages] = useState<IPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<IPackage | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>(500);
  const [description, setDescription] = useState('');
  const [documentsStr, setDocumentsStr] = useState('');
  const [servicesStr, setServicesStr] = useState('');
  const [gradientTheme, setGradientTheme] = useState(GRADIENT_PRESETS[0].value);
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Database verification modal/state
  const [dbVerifying, setDbVerifying] = useState(false);
  const [dbVerifyResult, setDbVerifyResult] = useState<any>(null);

  const fetchPackages = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/packages');
      const json = await res.json();
      if (json.success) {
        setPackages(json.data || []);
      }
    } catch (err) {
      toast.error('Failed to load packages', 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenAdd = () => {
    setEditingPkg(null);
    setName('');
    setPrice(500);
    setDescription('');
    setDocumentsStr('Resume PDF Review, ATS Keyword Checklist');
    setServicesStr('30 Min 1-on-1 Consultation, Actionable Feedback Report');
    setGradientTheme(GRADIENT_PRESETS[0].value);
    setIsPopular(false);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: IPackage) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setPrice(pkg.price);
    setDescription(pkg.description);
    setDocumentsStr((pkg.includedDocuments || []).join(', '));
    setServicesStr((pkg.includedServices || []).join(', '));
    setGradientTheme(pkg.gradientTheme || GRADIENT_PRESETS[0].value);
    setIsPopular(Boolean(pkg.isPopular));
    setIsActive(pkg.isActive !== undefined ? Boolean(pkg.isActive) : true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price === '' || price < 0 || !description) {
      toast.warning('Please fill in required fields (Name, Price, Description).', 'Validation Warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        price: Number(price),
        description,
        includedDocuments: documentsStr.split(',').map((s) => s.trim()).filter(Boolean),
        includedServices: servicesStr.split(',').map((s) => s.trim()).filter(Boolean),
        gradientTheme,
        isPopular,
        isActive,
      };

      const url = editingPkg ? `/api/packages/${editingPkg._id}` : '/api/packages';
      const method = editingPkg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save package');
      }

      toast.success(
        editingPkg ? `Package "${name}" updated!` : `Package "${name}" created!`,
        'Package Saved'
      );
      setIsModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.message || 'Error saving package', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: IPackage) => {
    if (!confirm(`Are you sure you want to delete "${pkg.name}"?`)) return;

    try {
      const res = await fetch(`/api/packages/${pkg._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete package');
      }

      toast.success(`Package "${pkg.name}" deleted.`, 'Package Deleted');
      fetchPackages();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting package', 'Delete Failed');
    }
  };

  const handleVerifyMongoDb = async () => {
    setDbVerifying(true);
    setDbVerifyResult(null);
    try {
      const res = await fetch('/api/admin/verify-db');
      const json = await res.json();
      setDbVerifyResult(json);
      if (json.success) {
        toast.success(json.message, 'MongoDB Verified');
      } else {
        toast.error(json.error || 'Database verification failed', 'DB Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify MongoDB', 'Network Error');
    } finally {
      setDbVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Package className="w-8 h-8 text-sky-400" />
              <span>Package Management</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Add, Edit, and Delete packages stored in MongoDB. Updates appear immediately on the Home Page and Booking flow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleVerifyMongoDb}
              disabled={dbVerifying}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white rounded-xl transition-all"
            >
              {dbVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Database className="w-4 h-4 text-emerald-400" />
              )}
              <span>Verify MongoDB CRUD</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Package</span>
            </button>
          </div>
        </div>

        {/* MongoDB Test Result Banner */}
        {dbVerifyResult && (
          <div
            className={`p-5 rounded-2xl border text-xs space-y-3 ${
              dbVerifyResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                {dbVerifyResult.message}
              </span>
              <button
                onClick={() => setDbVerifyResult(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-1 font-mono text-[11px]">
              {dbVerifyResult.auditLogs?.map((log: string, i: number) => (
                <li key={i}>{log}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Package Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm font-medium">Loading packages from MongoDB...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="glass-card-dark p-12 text-center rounded-3xl border border-slate-800 space-y-4">
            <Package className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Packages Available</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first package to display dynamic pricing cards on the home page and booking page.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-primary rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Create Package</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg._id}
                className="glass-card-dark rounded-3xl border border-slate-800 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-slate-700 transition-all"
              >
                {/* Visual Header / Badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                        pkg.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {pkg.isActive ? 'Active' : 'Disabled'}
                    </span>

                    {pkg.isPopular && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-white mb-2">{pkg.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{pkg.description}</p>

                  <div className="flex items-baseline gap-1.5 pb-4 border-b border-slate-800">
                    <span className="text-3xl font-black text-sky-400">{formatPrice(pkg.price)}</span>
                    <span className="text-xs text-slate-500">/ session</span>
                  </div>

                  {/* Included Documents */}
                  <div className="pt-4 space-y-2">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Included Documents:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {pkg.includedDocuments?.map((doc, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Included Services */}
                  <div className="pt-4 space-y-2">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Included Services:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {pkg.includedServices?.map((srv, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{srv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    className="flex-1 py-2.5 px-3 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Edit Package</span>
                  </button>

                  <button
                    onClick={() => handleDelete(pkg)}
                    className="p-2.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all"
                    title="Delete Package"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto">
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-800 shadow-2xl space-y-6 text-white my-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-sky-400" />
                  <span>{editingPkg ? 'Edit Package' : 'Create New Package'}</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Golden Review Package"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Price (₹ INR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="999"
                        className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Gradient / Theme Preset
                    </label>
                    <select
                      value={gradientTheme}
                      onChange={(e) => setGradientTheme(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-sky-500 focus:outline-none"
                    >
                      {GRADIENT_PRESETS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of who this package is for..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Included Documents (comma separated)
                  </label>
                  <input
                    type="text"
                    value={documentsStr}
                    onChange={(e) => setDocumentsStr(e.target.value)}
                    placeholder="Resume PDF Annotation, Cover Letter Template, ATS Match Score Report"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Included Services (comma separated)
                  </label>
                  <input
                    type="text"
                    value={servicesStr}
                    onChange={(e) => setServicesStr(e.target.value)}
                    placeholder="45 Min Live Strategy Session, LinkedIn Optimization, 2 Rounds of Edits"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPopular}
                      onChange={(e) => setIsPopular(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="font-semibold text-slate-300">Mark as "Popular" Package</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    <span className="font-semibold text-slate-300">Package Active</span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Package</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
