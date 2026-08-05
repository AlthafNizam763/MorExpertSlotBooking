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
} from 'lucide-react';
import { IBooking, BookingStatus } from '@/types';
import { formatPrice, getStatusBadgeClass } from '@/lib/utils';
import { useToast, useConfirm } from '@/components/Notification/ToastContext';

export default function AdminBookingsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-8 overflow-x-hidden">
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
                    <th className="py-4 px-4">Candidate Details</th>
                    <th className="py-4 px-4">Selected Package</th>
                    <th className="py-4 px-4">Date & Slot</th>
                    <th className="py-4 px-4">Price</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Approval & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No bookings match your current search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => {
                      const badgeStyle = getStatusBadgeClass(b.status);
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
                            {formatPrice(b.price)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            {/* Approve Quick Button */}
                            {b.status !== 'Approved' && b.status !== 'Completed' && (
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-white animate-in fade-in zoom-in duration-200">
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
    </div>
  );
}
