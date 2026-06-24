"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useCallback } from "react";
import { ECellLogo } from "@/components/ecell-logo";

// ── Local-storage key for visitor prefill ──────────────────────────────────
const VISITOR_STORAGE_KEY = "ecell_visitor_info";

type VisitorInfo = { name: string; course?: string };

function loadVisitorInfo(): VisitorInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VisitorInfo;
  } catch {
    return null;
  }
}

function saveVisitorInfo(info: VisitorInfo) {
  try {
    localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // storage not available — silently ignore
  }
}

function formatTime(epochMs: number) {
  return new Date(epochMs).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CheckinCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-5 py-12">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">{children}</div>
    </div>
  );
}

function LogoHeader() {
  return (
    <div className="text-center space-y-3">
      <ECellLogo size={72} className="mx-auto rounded-3xl shadow-sm" priority />
      <div>
        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">
          E-Cell · Woxsen
        </p>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-0.5">
          Office Logbook
        </h1>
      </div>
    </div>
  );
}

// ── Success State ──────────────────────────────────────────────────────────

function SuccessState({
  emoji,
  headline,
  subline,
  time,
}: {
  emoji: string;
  headline: string;
  subline: string;
  time: number;
}) {
  return (
    <CheckinCard>
      <LogoHeader />
      <div className="bg-white border border-border-light rounded-2xl p-8 text-center shadow-sm space-y-3 animate-scale-in">
        <div className="text-6xl">{emoji}</div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          {headline}
        </h2>
        <p className="text-text-secondary text-[15px]">{subline}</p>
        <p className="text-text-tertiary text-[13px] font-medium pt-1">
          Entered at{" "}
          <span className="text-brand font-semibold">{formatTime(time)}</span>
        </p>
      </div>
    </CheckinCard>
  );
}

// ── Pending State ──────────────────────────────────────────────────────────

function PendingState({ name }: { name: string }) {
  return (
    <CheckinCard>
      <LogoHeader />
      <div className="bg-warn-light border border-warn/20 rounded-2xl p-7 text-center space-y-2 animate-scale-in">
        <div className="text-4xl">⏳</div>
        <h2 className="text-xl font-bold text-text-primary">Pending Approval</h2>
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Hi <strong>{name}</strong>! Your account is still awaiting approval.
          <br />
          Ask an admin to approve you — once approved, you can log your visits.
        </p>
      </div>
    </CheckinCard>
  );
}

// ── Visitor form ───────────────────────────────────────────────────────────

function VisitorForm({ onBack }: { onBack: () => void }) {
  const visitorCheckIn = useMutation(api.attendance.visitorCheckIn);

  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; time: number } | null>(null);
  const [savedInfo, setSavedInfo] = useState<VisitorInfo | null>(null);
  const [editing, setEditing] = useState(false);

  // Load saved visitor info on mount
  useEffect(() => {
    const info = loadVisitorInfo();
    if (info) {
      setSavedInfo(info);
      setName(info.name);
      setCourse(info.course ?? "");
    } else {
      setEditing(true); // No saved info — go straight to the form
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await visitorCheckIn({
        name: name.trim(),
        course: course.trim() || undefined,
      });
      const info: VisitorInfo = { name: name.trim(), course: course.trim() || undefined };
      saveVisitorInfo(info);
      setResult({ name: name.trim(), time: res.checkedInAt });
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen for visitor ─────────────────────────────────────
  if (result) {
    return (
      <SuccessState
        emoji="👋"
        headline={`Welcome, ${result.name}!`}
        subline="You're now logged in the office logbook."
        time={result.time}
      />
    );
  }

  // ── One-tap check-in when info is saved and not editing ───────────
  const showQuickCheckIn = savedInfo && !editing;

  return (
    <CheckinCard>
      <LogoHeader />
      <div className="bg-white border border-border-light rounded-2xl p-6 shadow-sm space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-text-primary">Visitor Log-in</h2>
          <button
            onClick={onBack}
            className="text-[12px] text-text-tertiary hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
        </div>

        {showQuickCheckIn ? (
          // One-tap with prefill
          <div className="space-y-4">
            <div className="bg-bg-tertiary rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-[13px] font-semibold text-text-primary">{savedInfo.name}</p>
              {savedInfo.course && (
                <p className="text-[12px] text-text-tertiary">{savedInfo.course}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-brand text-white font-semibold text-[15px] hover:bg-brand-mid transition-all disabled:opacity-60 shadow-sm"
              >
                {loading ? "Logging in…" : `Check in as ${savedInfo.name}`}
              </button>
            </form>

            <button
              onClick={() => setEditing(true)}
              className="w-full text-center text-[12px] text-text-tertiary hover:text-text-secondary transition-colors py-1"
            >
              Not you? Edit details
            </button>
          </div>
        ) : (
          // Full form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
                Your Name <span className="text-danger">*</span>
              </label>
              <input
                id="visitor-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
                Course / Programme{" "}
                <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <input
                id="visitor-course"
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. B.Tech CSE 3rd year"
                className="w-full px-4 py-3 rounded-xl border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3.5 rounded-xl bg-brand text-white font-semibold text-[15px] hover:bg-brand-mid transition-all disabled:opacity-60 shadow-sm"
            >
              {loading ? "Logging in…" : "Log my visit"}
            </button>
          </form>
        )}
      </div>
    </CheckinCard>
  );
}

// ── Unsigned-in landing ────────────────────────────────────────────────────

function UnsignedLanding({ onVisitor }: { onVisitor: () => void }) {
  return (
    <CheckinCard>
      <LogoHeader />

      <div className="bg-white border border-border-light rounded-2xl p-6 shadow-sm space-y-4 animate-scale-in">
        <p className="text-center text-text-secondary text-[14px] leading-relaxed">
          Welcome to the E-Cell office. Log your visit below.
        </p>

        {/* Member sign-in — passes redirect_url so Clerk brings them back here */}
        <SignInButton
          mode="redirect"
          forceRedirectUrl="/checkin"
          fallbackRedirectUrl="/checkin"
        >
          <button
            id="checkin-member-btn"
            className="w-full py-4 rounded-xl bg-brand text-white font-semibold text-[16px] hover:bg-brand-mid transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>🏷️</span> I&apos;m a member — Log in
          </button>
        </SignInButton>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-border-light" />
          <span className="text-[11px] text-text-tertiary font-medium">or</span>
          <div className="flex-1 h-px bg-border-light" />
        </div>

        <button
          id="checkin-visitor-btn"
          onClick={onVisitor}
          className="w-full py-4 rounded-xl bg-bg-tertiary border border-border text-text-primary font-semibold text-[16px] hover:bg-border-light transition-all flex items-center justify-center gap-2"
        >
          <span>👋</span> I&apos;m a visitor
        </button>
      </div>

      <p className="text-center text-[11px] text-text-tertiary">
        Scanning at the E-Cell office door
      </p>
    </CheckinCard>
  );
}

// ── Member auto-check-in ───────────────────────────────────────────────────

function MemberCheckIn({ userName, clerkId }: { userName: string; clerkId: string }) {
  const todayStatus = useQuery(api.attendance.getTodayStatus, { clerkId });
  const checkIn = useMutation(api.attendance.checkIn);
  const [result, setResult] = useState<{
    status: "checked_in" | "already_checked_in";
    checkedInAt: number;
  } | null>(null);

  const doCheckIn = useCallback(async () => {
    const res = await checkIn({ clerkId });
    setResult(res);
  }, [checkIn, clerkId]);

  // Once we know today's status, act:
  // - If already checked in → show from DB (no mutation)
  // - If not → fire mutation
  useEffect(() => {
    if (todayStatus === undefined) return; // still loading
    if (todayStatus !== null) {
      // Already in DB — show cached state
      setResult({ status: "already_checked_in", checkedInAt: todayStatus.checkedInAt });
    } else {
      doCheckIn();
    }
  }, [todayStatus, doCheckIn]);

  if (!result) {
    return (
      <CheckinCard>
        <LogoHeader />
        <div className="bg-white border border-border-light rounded-2xl p-8 text-center shadow-sm space-y-3 animate-scale-in">
          <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary text-[15px]">Logging your visit…</p>
        </div>
      </CheckinCard>
    );
  }

  if (result.status === "already_checked_in") {
    return (
      <SuccessState
        emoji="✅"
        headline="Already logged!"
        subline={`You already logged your visit today, ${userName.split(" ")[0]}.`}
        time={result.checkedInAt}
      />
    );
  }

  return (
    <SuccessState
      emoji="🎉"
      headline={`You're in, ${userName.split(" ")[0]}!`}
      subline="Your visit has been logged in the office logbook."
      time={result.checkedInAt}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CheckinPage() {
  const { user, isLoaded } = useUser();
  const [flow, setFlow] = useState<"landing" | "visitor">("landing");

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // ── Loading ──
  if (!isLoaded || (user && convexUser === undefined)) {
    return (
      <CheckinCard>
        <LogoHeader />
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </CheckinCard>
    );
  }

  // ── Signed in ──
  if (user && convexUser !== undefined) {
    // Account pending approval
    if (convexUser && !convexUser.approved) {
      return <PendingState name={user.firstName ?? user.fullName ?? "there"} />;
    }

    // Approved member
    if (convexUser?.approved) {
      return <MemberCheckIn userName={convexUser.name || user.fullName || "Member"} clerkId={user.id} />;
    }
  }

  // ── Not signed in ──
  if (flow === "visitor") {
    return <VisitorForm onBack={() => setFlow("landing")} />;
  }

  return <UnsignedLanding onVisitor={() => setFlow("visitor")} />;
}
