"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  BarChart3,
  FileText,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-border-light">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-mid flex items-center justify-center">
              <span className="text-white font-bold text-sm">EC</span>
            </div>
            <span className="font-semibold text-lg text-text-primary">
              E-Cell Reports
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:bg-brand-mid transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:bg-brand-mid transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-light/40 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-light text-brand-mid text-sm font-medium mb-8">
              <Zap size={14} />
              Woxsen University E-Cell
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-text-primary leading-tight mb-6 tracking-tight">
              Your Weekly Reports,{" "}
              <span className="bg-gradient-to-r from-brand to-brand-mid bg-clip-text text-transparent">
                Simplified
              </span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-10 max-w-2xl mx-auto">
              A purpose-built platform for E-Cell departments to submit structured weekly reports. 
              Leadership gets full visibility. Department heads save time. Nothing gets lost.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-up"}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand text-white font-semibold text-base hover:bg-brand-mid transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {isSignedIn ? "Go to Dashboard" : "Start Now"}
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-border text-text-secondary font-medium text-base hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200"
              >
                Learn More
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Departments", value: "7+" },
              { label: "Report Sections", value: "15" },
              { label: "Min to Submit", value: "<15" },
              { label: "Data Retention", value: "∞" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-white border border-border-light shadow-sm"
              >
                <div className="text-3xl font-bold text-brand mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-text-tertiary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Everything Your E-Cell Needs
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Built specifically for student entrepreneurship cells. Every feature serves a purpose.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Structured Reports",
                desc: "Department-specific templates with metrics, tasks, and goals. No more unformatted WhatsApp messages.",
                color: "brand",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Track submission rates, performance trends, and department metrics over time.",
                color: "info",
              },
              {
                icon: Users,
                title: "Team Management",
                desc: "Role-based access for members, department heads, core team, and president.",
                color: "purple",
              },
              {
                icon: Clock,
                title: "Auto-Save Drafts",
                desc: "Every keystroke is saved. Never lose your work. Resume from any device.",
                color: "warn",
              },
              {
                icon: Shield,
                title: "Feedback System",
                desc: "Leadership can comment on specific sections. Action items tracked and resolved.",
                color: "danger",
              },
              {
                icon: CheckCircle2,
                title: "Task Carry-Forward",
                desc: "Pending tasks automatically carry into next week's report. Nothing falls through.",
                color: "success-text",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-7 rounded-2xl border border-border-light bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    backgroundColor: `var(--${feature.color}-light, var(--brand-light))`,
                    color: `var(--${feature.color}, var(--brand))`,
                  }}
                >
                  <feature.icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-24 bg-bg-primary">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Built for Every Department
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Each department gets its own report template with relevant metrics and sections.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: "Outreach", color: "#1D9E75" },
              { name: "Tech", color: "#185FA5" },
              { name: "Marketing", color: "#E05E1A" },
              { name: "Finance", color: "#3B6D11" },
              { name: "Events", color: "#7C3AED" },
              { name: "Design", color: "#DB2777" },
              { name: "PR & Partnerships", color: "#0891B2" },
            ].map((dept) => (
              <div
                key={dept.name}
                className="px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:scale-105 cursor-default"
                style={{
                  backgroundColor: dept.color + "15",
                  color: dept.color,
                  border: `1px solid ${dept.color}30`,
                }}
              >
                {dept.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-brand to-brand-mid">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Weekly Reports?
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Join E-Cell and start submitting structured, trackable reports today.
          </p>
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-brand font-semibold text-base hover:bg-brand-light transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {isSignedIn ? "Open Dashboard" : "Get Started Free"}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white border-t border-border-light">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-mid flex items-center justify-center">
              <span className="text-white font-bold text-xs">EC</span>
            </div>
            <span className="text-sm text-text-secondary">
              E-Cell · Woxsen University
            </span>
          </div>
          <p className="text-sm text-text-tertiary">
            © {new Date().getFullYear()} E-Cell Woxsen. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
