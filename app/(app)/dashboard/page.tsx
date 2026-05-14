"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import Link from "next/link";
import {
  FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Plus, Eye, Edit3, Building2, BarChart3, Megaphone,
} from "lucide-react";

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getWeekLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const seedDepts = useMutation(api.departments.seed);
  const seedTemplates = useMutation(api.templates.seedTemplates);
  const departments = useQuery(api.departments.listAll);

  useEffect(() => {
    if (departments !== undefined && departments.length === 0) {
      seedDepts().then(() => seedTemplates());
    }
  }, [departments, seedDepts, seedTemplates]);

  if (!convexUser) return <DashboardSkeleton />;

  const isPresident = convexUser.roles.some((r) => ["president", "admin"].includes(r));
  const isCoreTeam = convexUser.roles.some((r) => ["core_team", "president", "admin"].includes(r));
  const isDeptHead = convexUser.roles.includes("department_head");

  if (isPresident || isCoreTeam) return <LeadershipDashboard />;
  if (isDeptHead) return <DeptHeadDashboard clerkId={user!.id} />;
  return <MemberDashboard clerkId={user!.id} />;
}

/* ── Leadership Dashboard ─────────────────────────────────────────── */
function LeadershipDashboard() {
  const weekStart = getCurrentWeekStart();
  const orgStatus = useQuery(api.reports.getOrgStatusThisWeek, { weekStart });
  const announcements = useQuery(api.announcements.listActive);

  if (!orgStatus) return <DashboardSkeleton />;

  const submitted = orgStatus.filter((s) => s.status === "submitted").length;
  const drafts = orgStatus.filter((s) => s.status === "draft").length;
  const notStarted = orgStatus.filter((s) => s.status === "not_started").length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-tertiary text-[13px] mt-0.5">Week of {getWeekLabel()}</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-white hover:shadow-sm transition-all">
            <FileText size={15} /> All Reports
          </Link>
          <Link href="/analytics" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid transition-all shadow-sm">
            <BarChart3 size={15} /> Analytics
          </Link>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Departments" value={orgStatus.length} icon={Building2} color="var(--brand)" bg="var(--brand-light)" />
        <StatCard label="Submitted" value={submitted} icon={CheckCircle2} color="var(--success-text)" bg="var(--success-bg)" />
        <StatCard label="In Draft" value={drafts} icon={Edit3} color="var(--warn)" bg="var(--warn-light)" />
        <StatCard label="Not Started" value={notStarted} icon={AlertTriangle} color="var(--danger)" bg="var(--danger-light)" />
      </div>

      {/* Department Status */}
      <div>
        <h2 className="text-[15px] font-semibold text-text-primary mb-4 tracking-tight">Department Status</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgStatus.sort((a, b) => {
            const order = { submitted: 0, draft: 1, not_started: 2 };
            return (order[a.status as keyof typeof order] ?? 2) - (order[b.status as keyof typeof order] ?? 2);
          }).map((item) => (
            <DeptStatusCard key={item.department._id} item={item} />
          ))}
        </div>
      </div>

      <AnnouncementsList announcements={announcements} />
    </div>
  );
}

/* ── Department Head Dashboard ────────────────────────────────────── */
function DeptHeadDashboard({ clerkId }: { clerkId: string }) {
  const convexUser = useQuery(api.users.getByClerkId, { clerkId });
  const weekStart = getCurrentWeekStart();
  const currentDraft = useQuery(api.reports.getCurrentDraft, convexUser?.departmentId ? { departmentId: convexUser.departmentId, weekStart } : "skip");
  const deptReports = useQuery(api.reports.listByDepartment, convexUser?.departmentId ? { departmentId: convexUser.departmentId } : "skip");
  const announcements = useQuery(api.announcements.listActive);

  if (!convexUser) return <DashboardSkeleton />;
  const recentReports = deptReports?.slice(0, 4) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Dashboard</h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">Week of {getWeekLabel()}</p>
      </div>

      {/* This Week */}
      <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary tracking-tight">This Week&apos;s Report</h2>
            <p className="text-text-tertiary text-[13px] mt-0.5">{getWeekLabel()}</p>
          </div>
          <StatusBadge status={currentDraft?.status === "submitted" ? "submitted" : currentDraft ? "draft" : "not_started"} />
        </div>
        <div className="mt-5">
          {currentDraft?.status === "submitted" ? (
            <Link href={`/reports/${currentDraft._id}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all">
              <Eye size={15} /> View Submitted Report
            </Link>
          ) : currentDraft ? (
            <Link href={`/reports/${currentDraft._id}/edit`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-[13px] font-semibold hover:bg-brand-mid transition-all shadow-sm">
              <Edit3 size={15} /> Continue Draft
            </Link>
          ) : (
            <Link href="/reports/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-[13px] font-semibold hover:bg-brand-mid transition-all shadow-sm">
              <Plus size={15} /> Start Report
            </Link>
          )}
        </div>
      </div>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary mb-4 tracking-tight">Recent Reports</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {recentReports.map((report) => (
              <Link key={report._id} href={`/reports/${report._id}`} className="p-5 rounded-2xl bg-white border border-border-light hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[13px] font-semibold text-text-primary">{report.weekLabel}</span>
                  <StatusBadge status={report.status} />
                </div>
                {report.submittedAt && (
                  <p className="text-[11px] text-text-tertiary">Submitted {new Date(report.submittedAt).toLocaleDateString()}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-[11px] text-brand font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View Report <ArrowRight size={11} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <AnnouncementsList announcements={announcements} />
    </div>
  );
}

/* ── Member Dashboard ─────────────────────────────────────────────── */
function MemberDashboard({ clerkId }: { clerkId: string }) {
  const convexUser = useQuery(api.users.getByClerkId, { clerkId });
  const deptReports = useQuery(api.reports.listByDepartment, convexUser?.departmentId ? { departmentId: convexUser.departmentId } : "skip");
  const announcements = useQuery(api.announcements.listActive);

  if (!convexUser) return <DashboardSkeleton />;
  const submittedReports = deptReports?.filter((r) => r.status === "submitted").slice(0, 6) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Dashboard</h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">Welcome back, {convexUser.name}</p>
      </div>

      <AnnouncementsList announcements={announcements} />

      <div>
        <h2 className="text-[15px] font-semibold text-text-primary mb-4 tracking-tight">Department Reports</h2>
        {submittedReports.length === 0 ? (
          <div className="p-14 rounded-2xl bg-white border border-border-light text-center">
            <FileText size={36} className="text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary text-[13px]">No reports submitted yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {submittedReports.map((report) => (
              <Link key={report._id} href={`/reports/${report._id}`} className="p-5 rounded-2xl bg-white border border-border-light hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[13px] font-semibold text-text-primary">{report.weekLabel}</span>
                  <StatusBadge status={report.status} />
                </div>
                <p className="text-[11px] text-text-tertiary">{report.departmentName}</p>
                {report.submittedAt && <p className="text-[11px] text-text-tertiary mt-0.5">Submitted {new Date(report.submittedAt).toLocaleDateString()}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared Components ────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string; icon?: typeof CheckCircle2 }> = {
    submitted: { bg: "bg-success-bg", text: "text-success-text", label: "Submitted", icon: CheckCircle2 },
    draft: { bg: "bg-warn-light", text: "text-warn", label: "Draft", icon: Edit3 },
    not_started: { bg: "bg-bg-tertiary", text: "text-text-tertiary", label: "Not Started" },
  };
  const c = config[status] || config.not_started;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${c.bg} ${c.text}`}>
      {Icon && <Icon size={11} />}
      {c.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: React.ComponentType<{ size?: number }>; color: string; bg: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-border-light shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg, color }}>
        <Icon size={19} />
      </div>
      <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
      <div className="text-[11px] text-text-tertiary mt-0.5 font-medium">{label}</div>
    </div>
  );
}

function DeptStatusCard({ item }: { item: { department: { _id: string; name: string; colorTag: string }; headName: string; report: { _id: string; submittedAt?: number } | null; status: string } }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-border-light shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.department.colorTag }} />
          <span className="font-semibold text-[13px] text-text-primary">{item.department.name}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-[11px] text-text-tertiary mb-3">Head: {item.headName}</p>
      {item.report && (
        <Link href={`/reports/${item.report._id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-mid transition-colors">
          View Report <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function AnnouncementsList({ announcements }: { announcements: any[] | undefined }) {
  if (!announcements || announcements.length === 0) return null;
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-text-primary mb-4 tracking-tight">Announcements</h2>
      <div className="space-y-3">
        {announcements.map((a: any) => (
          <div key={a._id} className="flex items-start gap-3 p-4 rounded-xl bg-purple-light/60 border border-purple/8">
            <Megaphone size={16} className="text-purple mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-[13px] leading-snug">{a.title}</h3>
              <p className="text-text-secondary text-[13px] mt-1 leading-relaxed">{a.body}</p>
              {a.authorName && (
                <p className="text-text-tertiary text-[11px] mt-2">By {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div><div className="skeleton h-8 w-48 mb-2" /><div className="skeleton h-4 w-32" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    </div>
  );
}
