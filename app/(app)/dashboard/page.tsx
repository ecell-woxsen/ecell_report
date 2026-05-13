"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus,
  Eye,
  Edit3,
  Building2,
  Users,
  BarChart3,
  Megaphone,
} from "lucide-react";

// Get current week's Monday as ISO date string
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

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const seedDepts = useMutation(api.departments.seed);
  const seedTemplates = useMutation(api.templates.seedTemplates);

  // Auto-seed departments and templates if empty
  const departments = useQuery(api.departments.listAll);
  useEffect(() => {
    if (departments !== undefined && departments.length === 0) {
      seedDepts().then(() => seedTemplates());
    }
  }, [departments, seedDepts, seedTemplates]);

  if (!convexUser) {
    return <DashboardSkeleton />;
  }

  const isPresident = convexUser.roles.some((r) =>
    ["president", "admin"].includes(r)
  );
  const isCoreTeam = convexUser.roles.some((r) =>
    ["core_team", "president", "admin"].includes(r)
  );
  const isDeptHead = convexUser.roles.includes("department_head");

  if (isPresident || isCoreTeam) {
    return <LeadershipDashboard />;
  }
  if (isDeptHead) {
    return <DeptHeadDashboard clerkId={user!.id} />;
  }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Week of {getWeekLabel()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            <FileText size={16} />
            View All Reports
          </Link>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-mid transition-all"
          >
            <BarChart3 size={16} />
            Analytics
          </Link>
        </div>
      </div>

      {/* Status Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          label="Total Departments"
          value={orgStatus.length}
          icon={Building2}
          color="brand"
        />
        <StatusCard
          label="Submitted"
          value={submitted}
          icon={CheckCircle2}
          color="success-text"
        />
        <StatusCard
          label="In Draft"
          value={drafts}
          icon={Edit3}
          color="warn"
        />
        <StatusCard
          label="Not Started"
          value={notStarted}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      {/* Department Status Grid */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Department Status
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgStatus
            .sort((a, b) => {
              const order = { submitted: 0, draft: 1, not_started: 2 };
              return (
                (order[a.status as keyof typeof order] ?? 2) -
                (order[b.status as keyof typeof order] ?? 2)
              );
            })
            .map((item) => (
              <DeptStatusCard key={item.department._id} item={item} />
            ))}
        </div>
      </div>

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Announcements
          </h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a._id}
                className="p-5 rounded-2xl bg-purple-light border border-purple/10"
              >
                <div className="flex items-start gap-3">
                  <Megaphone size={18} className="text-purple mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm">
                      {a.title}
                    </h3>
                    <p className="text-text-secondary text-sm mt-1">{a.body}</p>
                    <p className="text-text-tertiary text-xs mt-2">
                      By {a.authorName} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Department Head Dashboard ────────────────────────────────────── */
function DeptHeadDashboard({ clerkId }: { clerkId: string }) {
  const convexUser = useQuery(api.users.getByClerkId, { clerkId });
  const weekStart = getCurrentWeekStart();

  const currentDraft = useQuery(
    api.reports.getCurrentDraft,
    convexUser?.departmentId
      ? { departmentId: convexUser.departmentId, weekStart }
      : "skip"
  );
  const deptReports = useQuery(
    api.reports.listByDepartment,
    convexUser?.departmentId
      ? { departmentId: convexUser.departmentId }
      : "skip"
  );
  const announcements = useQuery(api.announcements.listActive);

  if (!convexUser) return <DashboardSkeleton />;

  const recentReports = deptReports?.slice(0, 4) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Week of {getWeekLabel()}
        </p>
      </div>

      {/* This Week's Report Card */}
      <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              This Week&apos;s Report
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {getWeekLabel()}
            </p>
          </div>
          <StatusBadge
            status={
              currentDraft?.status === "submitted"
                ? "submitted"
                : currentDraft
                  ? "draft"
                  : "not_started"
            }
          />
        </div>
        <div className="mt-6">
          {currentDraft?.status === "submitted" ? (
            <Link
              href={`/reports/${currentDraft._id}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
            >
              <Eye size={16} />
              View Submitted Report
            </Link>
          ) : currentDraft ? (
            <Link
              href={`/reports/${currentDraft._id}/edit`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all shadow-sm"
            >
              <Edit3 size={16} />
              Continue Draft
            </Link>
          ) : (
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all shadow-sm"
            >
              <Plus size={16} />
              Start Report
            </Link>
          )}
        </div>
      </div>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Recent Reports
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {recentReports.map((report) => (
              <Link
                key={report._id}
                href={`/reports/${report._id}`}
                className="p-5 rounded-2xl bg-white border border-border-light hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-text-primary">
                    {report.weekLabel}
                  </span>
                  <StatusBadge status={report.status} />
                </div>
                {report.submittedAt && (
                  <p className="text-xs text-text-tertiary">
                    Submitted{" "}
                    {new Date(report.submittedAt).toLocaleDateString()}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1 text-xs text-brand font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View Report
                  <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Announcements
          </h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a._id}
                className="p-4 rounded-xl bg-purple-light border border-purple/10"
              >
                <h3 className="font-semibold text-sm text-text-primary">
                  {a.title}
                </h3>
                <p className="text-text-secondary text-sm mt-1">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Member Dashboard ─────────────────────────────────────────────── */
function MemberDashboard({ clerkId }: { clerkId: string }) {
  const convexUser = useQuery(api.users.getByClerkId, { clerkId });
  const deptReports = useQuery(
    api.reports.listByDepartment,
    convexUser?.departmentId
      ? { departmentId: convexUser.departmentId }
      : "skip"
  );
  const announcements = useQuery(api.announcements.listActive);

  if (!convexUser) return <DashboardSkeleton />;

  const submittedReports =
    deptReports?.filter((r) => r.status === "submitted").slice(0, 6) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Welcome back, {convexUser.name}
        </p>
      </div>

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Announcements
          </h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a._id}
                className="p-4 rounded-xl bg-purple-light border border-purple/10"
              >
                <h3 className="font-semibold text-sm text-text-primary">
                  {a.title}
                </h3>
                <p className="text-text-secondary text-sm mt-1">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Reports */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Department Reports
        </h2>
        {submittedReports.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-border-light text-center">
            <FileText size={40} className="text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No reports submitted yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {submittedReports.map((report) => (
              <Link
                key={report._id}
                href={`/reports/${report._id}`}
                className="p-5 rounded-2xl bg-white border border-border-light hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">
                    {report.weekLabel}
                  </span>
                  <StatusBadge status={report.status} />
                </div>
                <p className="text-xs text-text-tertiary">
                  {report.departmentName}
                </p>
                {report.submittedAt && (
                  <p className="text-xs text-text-tertiary mt-1">
                    Submitted{" "}
                    {new Date(report.submittedAt).toLocaleDateString()}
                  </p>
                )}
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
  const config: Record<string, { bg: string; text: string; label: string }> = {
    submitted: {
      bg: "bg-success-bg",
      text: "text-success-text",
      label: "Submitted",
    },
    draft: { bg: "bg-warn-light", text: "text-warn", label: "Draft" },
    not_started: {
      bg: "bg-bg-tertiary",
      text: "text-text-tertiary",
      label: "Not Started",
    },
  };
  const c = config[status] || config.not_started;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}
    >
      {status === "submitted" && <CheckCircle2 size={12} />}
      {status === "draft" && <Edit3 size={12} />}
      {c.label}
    </span>
  );
}

function StatusCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-border-light shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `var(--${color}-light, var(--brand-light))`,
            color: `var(--${color}, var(--brand))`,
          }}
        >
          <Icon size={20} />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-tertiary mt-0.5">{label}</div>
    </div>
  );
}

function DeptStatusCard({
  item,
}: {
  item: {
    department: { _id: string; name: string; colorTag: string };
    headName: string;
    report: { _id: string; submittedAt?: number; sections?: Record<string, unknown> } | null;
    status: string;
  };
}) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-border-light shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.department.colorTag }}
          />
          <span className="font-semibold text-sm text-text-primary">
            {item.department.name}
          </span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-xs text-text-tertiary mb-3">Head: {item.headName}</p>
      {item.report && (
        <Link
          href={`/reports/${item.report._id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-mid transition-colors"
        >
          View Report
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
