'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import {
  Search,
  Filter,
  Eye,
  DollarSign,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  X,
  FileText,
  AlertCircle,
  MessageSquare,
  Edit,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Maximize2,
  Lock,
  DownloadCloud,
  Plus,
  ShieldCheck,
  User,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { IBooking, BookingStatus, IPackage } from '@/types';
import { formatPrice, getStatusBadgeClass } from '@/lib/utils';
import { useToast, useConfirm } from '@/components/Notification/ToastContext';
import {
  NAME_ERROR,
  NAME_PATTERN,
  PHONE_ERROR,
  PHONE_LENGTH,
  isValidName,
  isValidPhone,
  normalizeName,
  sanitizeNameInput,
  sanitizePhoneInput,
} from '@/lib/validation';

export default function AdminBookingsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Admin Slot Booking Modal State
  const [showAdminBookingModal, setShowAdminBookingModal] = useState(false);
  const [packages, setPackages] = useState<IPackage[]>([]);
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPackageName, setAdminPackageName] = useState('Golden Review Package');
  const [adminPackagePrice, setAdminPackagePrice] = useState<number>(999);
  const [adminDate, setAdminDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [adminSlot, setAdminSlot] = useState<string>('Slot 1');
  const [adminStatus, setAdminStatus] = useState<BookingStatus>('Approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminMarkPaid, setAdminMarkPaid] = useState(true);
  const [adminProofFile, setAdminProofFile] = useState<File | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Edit / Price Assignment / Reschedule Modal State
  const [selectedBooking, setSelectedBooking] = useState<IBooking | null>(null);
  const [actionTab, setActionTab] = useState<'details' | 'price' | 'reschedule' | 'notes'>('details');

  const [priceInput, setPriceInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<BookingStatus>('Pending Admin Approval');
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [privateNotesInput, setPrivateNotesInput] = useState<string>('');
  const [publicNotesInput, setPublicNotesInput] = useState<string>('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('09:00 AM');

  const [saving, setSaving] = useState(false);

  // PDF Previewer State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  // Payment screenshot previewer
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = `/api/bookings?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await fetch(url);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setBookings(json.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/packages')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPackages(json.data);
          if (json.data.length > 0) {
            setAdminPackageName(json.data[0].name);
            setAdminPackagePrice(json.data[0].price);
          }
        }
      })
      .catch((err) => console.error('Error fetching packages:', err));
  }, []);

  const handlePackageChange = (selectedPkgName: string) => {
    setAdminPackageName(selectedPkgName);
    const pkg = packages.find((p) => p.name === selectedPkgName);
    if (pkg) {
      setAdminPackagePrice(pkg.price);
    }
  };

  const handleCreateAdminBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeName(adminName);
    const cleanPhone = sanitizePhoneInput(adminPhone);

    if (!cleanName || !cleanPhone || !adminDate || !adminSlot) {
      toast.error('Full Name, Phone Number, Date, and Slot are required.', 'Missing Fields');
      return;
    }
    if (!isValidName(cleanName)) {
      toast.error(NAME_ERROR, 'Invalid Name');
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      toast.error(PHONE_ERROR, 'Invalid Phone Number');
      return;
    }

    setAdminName(cleanName);
    setAdminPhone(cleanPhone);

    setCreatingBooking(true);
    try {
      // Sent as FormData so the admin can attach the payment screenshot they
      // received offline — the same proof customers upload themselves.
      const form = new FormData();
      form.append('name', cleanName);
      form.append('phone', cleanPhone);
      form.append('email', adminEmail.trim() || 'adminbooking@morexpert.com');
      form.append('packageName', adminPackageName);
      form.append('packagePrice', String(adminPackagePrice));
      form.append('date', adminDate);
      form.append('slot', adminSlot);
      form.append('status', adminStatus);
      form.append('notes', adminNotes.trim());
      form.append('markPaid', String(adminMarkPaid));
      if (adminProofFile) form.append('paymentProof', adminProofFile);

      const res = await fetch('/api/bookings', { method: 'POST', body: form });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create admin booking.');
      }

      toast.success(`Admin booking ${json.bookingId || ''} created successfully!`, 'Booking Created');
      setShowAdminBookingModal(false);
      // Reset Form
      setAdminName('');
      setAdminPhone('');
      setAdminEmail('');
      setAdminNotes('');
      setAdminProofFile(null);
      fetchBookings();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bookingUpdated'));
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating admin booking.', 'Creation Failed');
    } finally {
      setCreatingBooking(false);
    }
  };

  const openActionModal = (booking: IBooking, tab: 'details' | 'price' | 'reschedule' | 'notes' = 'details') => {
    setSelectedBooking(booking);
    setActionTab(tab);
    setPriceInput(booking.price ? booking.price.toString() : '');
    setStatusInput(booking.status as BookingStatus);
    setRemarksInput(booking.remarks || '');
    setPrivateNotesInput(booking.privateNotes || '');
    setPublicNotesInput(booking.publicNotes || '');
    setRejectionReasonInput(booking.rejectionReason || '');
  };

  const handleApproveBooking = async (booking: IBooking) => {
    const isConfirmed = await confirm({
      title: 'Approve Booking',
      message: `Are you sure you want to approve booking ${booking.bookingId} for candidate ${booking.name}?`,
      confirmText: 'Approve & Lock Slot',
      cancelText: 'Cancel',
      variant: 'info',
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/bookings/${booking._id || booking.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          remarks: 'Booking approved by admin. Slot locked.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Booking ${booking.bookingId} approved successfully!`, 'Approved');
        fetchBookings();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('bookingUpdated'));
        }
      } else {
        toast.error(json.error || 'Failed to approve booking.', 'Approval Failed');
      }
    } catch (err) {
      toast.error('Failed to approve booking.', 'Network Error');
    }
  };

  const handleSaveBookingModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setSaving(true);
    try {
      const bodyPayload: any = {
        price: priceInput ? Number(priceInput) : null,
        status: statusInput,
        remarks: remarksInput,
        privateNotes: privateNotesInput,
        publicNotes: publicNotesInput,
        rejectionReason: rejectionReasonInput,
      };

      if (statusInput === 'Rescheduled' && rescheduleDate && rescheduleSlot) {
        bodyPayload.rescheduleDate = rescheduleDate;
        bodyPayload.rescheduleSlot = rescheduleSlot;
      }

      const res = await fetch(`/api/bookings/${selectedBooking._id || selectedBooking.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update booking.');
      }

      toast.success(`Booking ${selectedBooking.bookingId} updated successfully!`, 'Saved');
      setSelectedBooking(null);
      fetchBookings();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bookingUpdated'));
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating booking.', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Booking Record',
      message: `Are you sure you want to permanently delete booking record ${id}? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Keep Record',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`Booking ${id} deleted successfully.`, 'Deleted');
        fetchBookings();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('bookingUpdated'));
        }
      } else {
        toast.error(json.error || 'Delete failed.', 'Error');
      }
    } catch (err) {
      toast.error('Failed to delete booking record.', 'Network Error');
    }
  };

  const handleExportCsv = () => {
    window.open('/api/reports/export', '_blank');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden w-full">
        {/* HEADER & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Booking Management</h1>
            <p className="text-xs text-slate-400 mt-1">
              Approve/reject bookings, preview PDF resumes, assign pricing, and reschedule candidate appointments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdminBookingModal(true)}
              className="px-4 py-2.5 bg-primary hover:bg-blue-600 font-bold text-xs text-white rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Admin Booking</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-white border border-slate-700 rounded-xl transition-all flex items-center gap-2"
            >
              <DownloadCloud className="w-4 h-4 text-accent" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, Name, Email, Phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Booking Confirmed">Booking Confirmed (Paid)</option>
              <option value="Pending Admin Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Price Assigned">Price Assigned</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* BOOKINGS TABLE */}
        <div className="glass-card-dark rounded-3xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-slate-400">Loading bookings list...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-4">Booking ID</th>
                    <th className="py-4 px-4">Customer Name & Phone</th>
                    <th className="py-4 px-4">Selected Package</th>
                    <th className="py-4 px-4">Booking Date & Slot</th>
                    <th className="py-4 px-4">Package Price</th>
                    <th className="py-4 px-4">Payment Status</th>
                    <th className="py-4 px-4">Payment Screenshot</th>
                    <th className="py-4 px-4">Booking Status</th>
                    <th className="py-4 px-4">Source</th>
                    <th className="py-4 px-4 text-right">Approval & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        No bookings match your current search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => {
                      const badgeStyle = getStatusBadgeClass(b.status);
                      const paymentStatus = b.paymentStatus || 'Not Recorded';
                      const paymentBadge = getStatusBadgeClass(paymentStatus);
                      const isPaid = paymentStatus === 'Payment Verified';
                      return (
                        <tr key={b.bookingId} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-primary">
                            {b.bookingId}
                          </td>
                          <td className="py-4 px-4 space-y-0.5">
                            <div className="font-bold text-white text-sm">{b.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{b.phone}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-sky-400">
                              {b.packageName || 'Standard Package'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-300 font-medium">
                            <div>{b.date}</div>
                            <div className="text-accent text-[11px] font-bold">{b.slot}</div>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-200 text-sm">
                            {formatPrice(b.packagePrice ?? b.price)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 w-fit ${paymentBadge.bg} ${paymentBadge.text} ${paymentBadge.border}`}
                            >
                              {isPaid && <ShieldCheck className="w-3.5 h-3.5" />}
                              {paymentStatus}
                            </span>
                            {b.amountPaid !== undefined && b.amountPaid !== null && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Paid {formatPrice(b.amountPaid)}
                                {b.paidAt ? ` · ${new Date(b.paidAt).toLocaleDateString()}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {b.paymentProofUrl ? (
                              <button
                                onClick={() => setPreviewImageUrl(b.paymentProofUrl!)}
                                className="flex items-center gap-2.5 group"
                                title="Open the payment screenshot"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={b.paymentProofUrl}
                                  alt={`Payment screenshot from ${b.name}`}
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-700 group-hover:border-primary transition-colors shrink-0"
                                />
                                <span className="text-[11px] text-primary group-hover:text-blue-400 font-bold flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" /> View
                                </span>
                              </button>
                            ) : (
                              <span className="text-slate-600 italic text-[11px]">
                                No screenshot
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 capitalize mt-1">
                              {b.verificationMode
                                ? `verified via ${b.verificationMode}`
                                : b.transactionRef || ''}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {b.bookingSource === 'Admin' ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Admin
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1 w-fit">
                                <User className="w-3.5 h-3.5 text-sky-400" /> User
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            {/* Approve Quick Button — paid bookings are already confirmed */}
                            {b.status !== 'Approved' &&
                              b.status !== 'Completed' &&
                              b.status !== 'Booking Confirmed' && (
                              <button
                                onClick={() => handleApproveBooking(b)}
                                className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                                title="Approve Booking"
                              >
                                <Check className="w-3.5 h-3.5 inline" /> Approve
                              </button>
                            )}

                            {/* Edit / Reschedule Modal trigger */}
                            <button
                              onClick={() => openActionModal(b)}
                              className="px-2.5 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-xl text-xs font-bold transition-all"
                            >
                              <Edit className="w-3.5 h-3.5 inline" /> Action
                            </button>

                            <button
                              onClick={() => handleDeleteBooking(b._id || b.bookingId)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl transition-all"
                              title="Delete Booking"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* PAYMENT SCREENSHOT PREVIEW MODAL */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-primary">
                <ImageIcon className="w-5 h-5" />
                <span>Payment Screenshot</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewImageUrl}
                  download
                  className="px-3 py-1.5 bg-primary hover:bg-blue-600 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewImageUrl(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Payment screenshot uploaded by the customer"
              className="w-full rounded-2xl border border-slate-800"
            />
            <p className="text-[11px] text-slate-500">
              Cross-check the amount and timestamp against your UPI statement — a screenshot on its
              own is not proof of a credit.
            </p>
          </div>
        </div>
      )}

      {/* EMBEDDED PDF RESUME PREVIEW MODAL */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col justify-between text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base text-primary">
                <FileText className="w-5 h-5" />
                <span>Candidate Resume PDF Preview</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewPdfUrl}
                  download
                  className="px-3 py-1.5 bg-primary hover:bg-blue-600 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF iframe */}
            <div className="flex-grow my-4 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
              <iframe
                src={previewPdfUrl}
                className="w-full h-full"
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* EDIT / APPROVE / RESCHEDULE MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 sm:space-y-6 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Booking Management</span>
                <h3 className="text-xl font-extrabold text-primary font-mono">
                  {selectedBooking.bookingId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Tabs */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                onClick={() => setActionTab('details')}
                className={`py-2 px-4 font-bold border-b-2 transition-colors ${
                  actionTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Status & Price
              </button>
              <button
                onClick={() => setActionTab('reschedule')}
                className={`py-2 px-4 font-bold border-b-2 transition-colors ${
                  actionTab === 'reschedule'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Reject & Reschedule
              </button>
              <button
                onClick={() => setActionTab('notes')}
                className={`py-2 px-4 font-bold border-b-2 transition-colors ${
                  actionTab === 'notes'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Private & Public Notes
              </button>
            </div>

            <form onSubmit={handleSaveBookingModal} className="space-y-4 text-xs">
              {actionTab === 'details' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Candidate Name</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedBooking.name} (${selectedBooking.email})`}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Assign Price (₹ INR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Update Status</label>
                    <select
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value as BookingStatus)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:border-primary focus:outline-none"
                    >
                      <option value="Booking Confirmed">Booking Confirmed (Paid)</option>
                      <option value="Pending Admin Approval">Pending Admin Approval</option>
                      <option value="Approved">Approved (Lock Slot)</option>
                      <option value="Price Assigned">Price Assigned</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled (Release Slot)</option>
                      <option value="Rejected">Rejected Completely</option>
                    </select>
                  </div>
                </>
              )}

              {actionTab === 'reschedule' && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-xl">
                    <p className="font-bold">Reject & Reschedule Flow</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Releases current slot ({selectedBooking.slot}) and reserves a new date/slot for candidate.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      New Proposed Date *
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      New Proposed Slot *
                    </label>
                    <select
                      value={rescheduleSlot}
                      onChange={(e) => setRescheduleSlot(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    >
                      <option value="09:00 AM">09:00 AM (Morning)</option>
                      <option value="11:00 AM">11:00 AM (Afternoon)</option>
                      <option value="03:00 PM">03:00 PM (Evening)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Reason for Rescheduling
                    </label>
                    <input
                      type="text"
                      value={rejectionReasonInput}
                      onChange={(e) => {
                        setRejectionReasonInput(e.target.value);
                        setStatusInput('Rescheduled');
                      }}
                      placeholder="e.g. Selected slot unavailable due to expert schedule conflict."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                </div>
              )}

              {actionTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Private Staff Notes (Visible only to Admin)
                    </label>
                    <textarea
                      rows={3}
                      value={privateNotesInput}
                      onChange={(e) => setPrivateNotesInput(e.target.value)}
                      placeholder="Internal candidate assessment or internal review notes..."
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Public Notes / Feedback (Visible to Candidate on Track page)
                    </label>
                    <textarea
                      rows={3}
                      value={publicNotesInput}
                      onChange={(e) => setPublicNotesInput(e.target.value)}
                      placeholder="Public feedback, action points, or session instructions..."
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save & Update Booking</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN SLOT BOOKING MODAL */}
      {showAdminBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 sm:space-y-6 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-extrabold text-white font-sans">
                  Create Admin Slot Booking
                </h3>
              </div>
              <button
                onClick={() => setShowAdminBookingModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(sanitizeNameInput(e.target.value))}
                  onBlur={() => setAdminName((current) => normalizeName(current))}
                  placeholder="e.g. John Doe"
                  autoComplete="name"
                  pattern={NAME_PATTERN.source}
                  title="Letters and spaces only"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="9876543210"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={PHONE_LENGTH}
                    pattern="\d{10}"
                    title="Enter a 10-digit phone number"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Package *
                </label>
                <select
                  value={adminPackageName}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-primary focus:outline-none"
                >
                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <option key={pkg._id || pkg.name} value={pkg.name}>
                        {pkg.name} — ₹{pkg.price}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Silver Review Package">Silver Review Package — ₹499</option>
                      <option value="Golden Review Package">Golden Review Package — ₹999</option>
                      <option value="Premium Review Package">Premium Review Package — ₹1999</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={adminDate}
                    onChange={(e) => setAdminDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Slot *
                  </label>
                  <select
                    value={adminSlot}
                    onChange={(e) => setAdminSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-primary focus:outline-none"
                  >
                    <option value="Slot 1">Slot 1 (09:00 AM)</option>
                    <option value="Slot 2">Slot 2 (11:00 AM)</option>
                    <option value="Slot 3">Slot 3 (03:00 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Booking Status
                </label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value as BookingStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-primary focus:outline-none"
                >
                  <option value="Approved">Approved (Lock Slot Immediately)</option>
                  <option value="Pending Admin Approval">Pending Admin Approval</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>

              {/* PAYMENT RECORD — admin bookings bypass the online checkout,
                  so the payment has to be stated explicitly. */}
              <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminMarkPaid}
                    onChange={(e) => setAdminMarkPaid(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-500"
                  />
                  <span>
                    <span className="block font-bold text-white">Payment already received</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Records this booking as paid and verified by you. Leave unchecked to save it
                      as Payment Pending.
                    </span>
                  </span>
                </label>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Payment Screenshot (optional)
                  </label>
                  <label
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed cursor-pointer transition-colors ${
                      adminProofFile
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {adminProofFile ? adminProofFile.name : 'Attach the screenshot you received'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => setAdminProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Internal Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes about candidate or admin booking source..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={creatingBooking}
                  className="flex-1 py-3 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  {creatingBooking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Create & Save Booking</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminBookingModal(false)}
                  className="px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
