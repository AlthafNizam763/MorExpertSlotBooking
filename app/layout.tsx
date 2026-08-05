import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/Notification/ToastContext';

export const metadata: Metadata = {
  title: 'MorExpert | Premium Resume Review & Slot Booking',
  description: 'Book 1-on-1 expert resume review sessions with industry professionals. Build an ATS-optimized resume that lands top tier interviews.',
  keywords: 'Resume Review, Slot Booking, MorExpert, Resume Builder, Career Coaching, ATS Resume',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-sky-500/20 selection:text-primary">
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}

