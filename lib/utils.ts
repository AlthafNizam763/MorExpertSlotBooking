import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateBookingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MB-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(price)) {
    return "Not Assigned";
  }
  return `₹${price.toLocaleString("en-IN")}`;
}

export function getStatusBadgeClass(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case "Payment Pending":
      return { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" };
    case "Payment Submitted":
      return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" };
    case "Payment Verified":
      return { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" };
    case "Booking Confirmed":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" };
    case "Payment Failed":
      return { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" };
    case "Payment Expired":
      return { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" };
    case "Payment Cancelled":
      return { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" };
    case "Approved":
      return { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" };
    case "Pending Admin Approval":
      return { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" };
    case "Rescheduled":
      return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" };
    case "Pending":
      return { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" };
    case "Price Assigned":
      return { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500/20" };
    case "Confirmed":
      return { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" };
    case "Resume Under Review":
      return { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-500/20" };
    case "Completed":
      return { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/20" };
    case "Cancelled":
      return { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/20" };
    case "Rejected":
      return { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500/20" };
    default:
      return { bg: "bg-gray-500/10", text: "text-gray-600", border: "border-gray-500/20" };
  }
}
