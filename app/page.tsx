'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar/Navbar';
import { Footer } from '@/components/Footer/Footer';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  FileCheck,
  Zap,
  TrendingUp,
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Star,
  Award,
  UploadCloud,
  FileText,
  Loader2,
} from 'lucide-react';
import { IPackage } from '@/types';
import { formatPrice } from '@/lib/utils';

export default function LandingPage() {
  const [packages, setPackages] = useState<IPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch('/api/packages');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPackages(json.data.filter((p: IPackage) => p.isActive !== false));
        }
      } catch (err) {
        console.error('Failed to load packages:', err);
      } finally {
        setLoadingPackages(false);
      }
    }
    loadPackages();
  }, []);
  return (
    <div className="min-h-screen bg-background text-secondary flex flex-col font-sans selection:bg-accent/20">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden animated-bg">
          {/* Subtle background blur orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-primary/10 via-accent/15 to-blue-200/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Hero Left Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-7 space-y-6 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-blue-200/80 shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Exclusive 1-on-1 Expert Review Slots Available
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-secondary tracking-tight leading-[1.15]">
                  Build a Resume That Gets You{' '}
                  <span className="bg-gradient-to-r from-primary via-blue-600 to-accent bg-clip-text text-transparent">
                    Hired.
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 font-normal max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Book a professional 1-on-1 resume review session with MorExpert industry experts. Get ATS-optimization, structural feedback, and tailored career insights.
                </p>

                {/* Hero CTAs */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link
                    href="/book"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-primary via-blue-600 to-primary hover:from-blue-600 hover:to-primary rounded-2xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all transform hover:-translate-y-1"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Book Your Slot Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/track"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-slate-700 bg-white/80 hover:bg-white border border-slate-200 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow transition-all"
                  >
                    <FileCheck className="w-5 h-5 text-primary" />
                    <span>Track Booking Status</span>
                  </Link>
                </div>

                {/* Trust stats */}
                <div className="pt-8 border-t border-slate-200/60 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
                  <div>
                    <p className="text-2xl font-bold text-secondary">98.4%</p>
                    <p className="text-xs text-slate-500 font-medium">Interview Call Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">5,000+</p>
                    <p className="text-xs text-slate-500 font-medium">Resumes Reviewed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-accent">4.9/5★</p>
                    <p className="text-xs text-slate-500 font-medium">Candidate Rating</p>
                  </div>
                </div>
              </motion.div>

              {/* Hero Right Visuals: Floating Glass Cards & Resume Mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="lg:col-span-5 relative flex items-center justify-center"
              >
                {/* Main Glass Resume Mock Card */}
                <div className="w-full max-w-md glass-card p-6 rounded-3xl border border-white/90 shadow-2xl relative z-10 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                        SE
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Senior Software Engineer</h3>
                        <p className="text-xs text-slate-500">ATS Match Score: 94% High</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold rounded-full">
                      Verified
                    </span>
                  </div>

                  {/* Mock Resume Lines */}
                  <div className="space-y-3">
                    <div className="h-3 bg-slate-200/80 rounded-full w-full" />
                    <div className="h-3 bg-slate-200/60 rounded-full w-4/5" />
                    <div className="h-3 bg-slate-200/40 rounded-full w-2/3" />
                  </div>

                  {/* Interactive Slot Preview */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl border border-blue-100/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" />
                        Next Slot Available Today
                      </span>
                      <span className="text-emerald-600 font-bold">03:00 PM</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full w-2/3" />
                    </div>
                  </div>
                </div>

                {/* Floating Glass Card 1 (Top Right) */}
                <div className="absolute -top-6 -right-4 glass-card p-4 rounded-2xl shadow-xl animate-float-slow hidden sm:flex items-center gap-3 z-20 border border-white">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Expert Feedback</p>
                    <p className="text-[11px] text-slate-500">100% Personalised</p>
                  </div>
                </div>

                {/* Floating Glass Card 2 (Bottom Left) */}
                <div className="absolute -bottom-8 -left-6 glass-card p-4 rounded-2xl shadow-xl animate-float-delay hidden sm:flex items-center gap-3 z-20 border border-white">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Instant Booking ID</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Generated Immediately</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 bg-primary/10 rounded-full">
                Simple 4-Step Process
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mt-3">
                How MorExpert Slot Booking Works
              </h2>
              <p className="text-slate-600 mt-3 text-base">
                Book your session in under 2 minutes and get ready for a career-transforming review.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  icon: Calendar,
                  title: 'Choose Date & Slot',
                  desc: 'Pick an open date from our Calendly-style interactive calendar and select your preferred slot.',
                },
                {
                  step: '02',
                  icon: UploadCloud,
                  title: 'Upload PDF Resume',
                  desc: 'Fill in your name, email, phone, and upload your current resume in PDF format (up to 10MB).',
                },
                {
                  step: '03',
                  icon: Zap,
                  title: 'Get Instant Booking ID',
                  desc: 'System automatically generates a unique Booking ID (e.g. MB-94A21X) to track your review live.',
                },
                {
                  step: '04',
                  icon: UserCheck,
                  title: 'Admin Review & Price',
                  desc: 'MorExpert admin reviews your submission, assigns custom pricing (e.g. ₹500), and conducts your session.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card p-6 rounded-2xl border border-slate-100 hover:border-primary/30 transition-all hover:shadow-xl relative group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-extrabold text-slate-200 group-hover:text-primary/20 transition-colors">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-accent px-3 py-1 bg-accent/10 rounded-full">
                Transparent & Flexible Packages
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mt-3">
                Review Session Packages
              </h2>
              <p className="text-slate-600 mt-3 text-base">
                Choose the perfect review package tailored to your career stage and goals.
              </p>
            </div>

            {loadingPackages ? (
              <div className="p-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm font-medium">Loading review packages...</p>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 text-slate-600">
                <p>No active packages available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {packages.map((pkg) => (
                  <div
                    key={pkg._id}
                    className={`glass-card p-8 rounded-3xl border transition-all hover:shadow-2xl flex flex-col justify-between relative overflow-hidden ${
                      pkg.isPopular
                        ? 'border-primary/40 shadow-xl ring-2 ring-primary/20 bg-white'
                        : 'border-slate-200 bg-white/80'
                    }`}
                  >
                    {pkg.isPopular && (
                      <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-primary to-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-bl-2xl shadow-md">
                        Most Popular
                      </div>
                    )}

                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900 mb-2">{pkg.name}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-6">{pkg.description}</p>

                      <div className="flex items-baseline gap-2 pb-6 border-b border-slate-100">
                        <span className="text-4xl font-black text-secondary">{formatPrice(pkg.price)}</span>
                        <span className="text-slate-500 text-xs font-medium">/ session</span>
                      </div>

                      {/* Included Documents */}
                      {pkg.includedDocuments && pkg.includedDocuments.length > 0 && (
                        <div className="pt-6 space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Included Documents:
                          </p>
                          <ul className="space-y-2 text-sm text-slate-700">
                            {pkg.includedDocuments.map((doc, i) => (
                              <li key={i} className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-medium">{doc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Included Services */}
                      {pkg.includedServices && pkg.includedServices.length > 0 && (
                        <div className="pt-6 space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Included Services:
                          </p>
                          <ul className="space-y-2 text-sm text-slate-700">
                            {pkg.includedServices.map((srv, i) => (
                              <li key={i} className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="font-medium">{srv}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-8">
                      <Link
                        href={`/book?packageId=${pkg._id}`}
                        className={`w-full inline-flex items-center justify-center gap-2 py-4 px-6 font-bold rounded-2xl transition-all ${
                          pkg.isPopular
                            ? 'text-white bg-primary hover:bg-blue-600 shadow-lg shadow-primary/25'
                            : 'text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <span>Reserve Your Slot</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
