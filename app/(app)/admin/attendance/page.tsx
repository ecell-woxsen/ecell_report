"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { Download, CalendarDays, Users, UserX } from "lucide-react";
import * as XLSX from "xlsx";

// ── Date helpers ──────────────────────────────────────────────────────────

function todayIST(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().split("T")[0];
}

function nDaysAgo(n: number): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000 - n * 24 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().split("T")[0];
}

function formatTime(epochMs: number) {
  return new Date(epochMs).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Permission gate ────────────────────────────────────────────────────────

const leadershipRoles = new Set([
  "core_team",
  "president",
  "vice_president",
  "advisor",
  "admin",
]);

const visitorViewerRoles = new Set([
  "department_head",
  ...leadershipRoles,
]);

// ── Tab type ───────────────────────────────────────────────────────────────

type Tab = "daily" | "summary" | "visitors";

// ── Daily Log Tab ──────────────────────────────────────────────────────────

type DailyEntry = {
  _id: string;
  type: "member" | "visitor";
  checkedInAt: number;
  memberName?: string | null;
  departmentName?: string | null;
  departmentColor?: string | null;
  visitorName?: string;
  visitorCourse?: string;
  dateKey: string;
};

function DailyLogTab() {
  const [dateKey, setDateKey] = useState(todayIST());
  const entries = useQuery(api.attendance.getDailyLog, { dateKey });

  // Group member entries by department
  const membersByDept = useMemo(() => {
    if (!entries) return new Map<string, DailyEntry[]>();
    const map = new Map<string, DailyEntry[]>();
    for (const e of entries) {
      if (e.type !== "member") continue;
      const key = e.departmentName ?? "No Department";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e as DailyEntry);
    }
    return map;
  }, [entries]);

  const visitors = useMemo(
    () => entries?.filter((e) => e.type === "visitor") ?? [],
    [entries]
  );

  const totalMembers = useMemo(
    () => entries?.filter((e) => e.type === "member").length ?? 0,
    [entries]
  );

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-text-tertiary" />
          <input
            type="date"
            id="daily-log-date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            max={todayIST()}
            className="px-3 py-1.5 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
        <span className="text-[13px] text-text-tertiary">
          {formatDate(dateKey)}
        </span>
        {entries !== undefined && (
          <span className="ml-auto text-[13px] font-medium text-text-secondary">
            {totalMembers} member{totalMembers !== 1 ? "s" : ""},{" "}
            {visitors.length} visitor{visitors.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {entries === undefined ? (
        <div className="skeleton h-48 rounded-2xl" />
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center space-y-2">
          <UserX size={32} className="text-text-tertiary mx-auto" />
          <p className="text-text-secondary text-[14px]">
            No logbook entries for {formatDate(dateKey)}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Members grouped by department */}
          {Array.from(membersByDept.entries()).map(([dept, deptEntries]) => {
            const color = (deptEntries[0] as DailyEntry).departmentColor ?? "#8B929A";
            return (
              <div key={dept} className="card overflow-hidden">
                <div
                  className="px-5 py-3 flex items-center gap-2 border-b border-border-light"
                  style={{ backgroundColor: color + "12" }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color }}
                  >
                    {dept}
                  </span>
                  <span className="ml-auto text-[11px] text-text-tertiary">
                    {deptEntries.length} member{deptEntries.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-border-light">
                  {deptEntries.map((e) => (
                    <div
                      key={e._id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <span className="text-[13px] font-medium text-text-primary flex-1">
                        {e.memberName}
                      </span>
                      <span className="text-[12px] text-text-tertiary font-mono">
                        {formatTime(e.checkedInAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Visitors */}
          {visitors.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2 border-b border-border-light bg-purple-light/50">
                <div className="w-2.5 h-2.5 rounded-full bg-purple" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-purple">
                  Visitors
                </span>
                <span className="ml-auto text-[11px] text-text-tertiary">
                  {visitors.length}
                </span>
              </div>
              <div className="divide-y divide-border-light">
                {visitors.map((e) => (
                  <div
                    key={e._id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-text-primary">
                        {(e as DailyEntry).visitorName}
                      </span>
                      {(e as DailyEntry).visitorCourse && (
                        <span className="ml-2 text-[11px] text-text-tertiary">
                          — {(e as DailyEntry).visitorCourse}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-text-tertiary font-mono">
                      {formatTime(e.checkedInAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary Tab ────────────────────────────────────────────────────────────

function SummaryTab() {
  const [days, setDays] = useState(30);
  const startDateKey = nDaysAgo(days - 1);
  const endDateKey = todayIST();

  const summary = useQuery(api.attendance.getDepartmentAttendanceSummary, {
    startDateKey,
    endDateKey,
  });

  const deptOptions = [
    { label: "Last 7 days", value: 7 },
    { label: "Last 30 days", value: 30 },
    { label: "Last 90 days", value: 90 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-text-secondary">Show:</span>
        <div className="flex gap-1.5">
          {deptOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                days === opt.value
                  ? "bg-brand text-white shadow-sm"
                  : "bg-bg-tertiary text-text-secondary hover:bg-border-light"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {summary === undefined ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : summary.length === 0 ? (
        <div className="card p-12 text-center space-y-2">
          <Users size={32} className="text-text-tertiary mx-auto" />
          <p className="text-text-secondary text-[14px]">
            No member visits in the last {days} days.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-light bg-bg-tertiary">
                <th className="px-5 py-3 text-text-tertiary font-semibold text-left">
                  Member
                </th>
                <th className="px-5 py-3 text-text-tertiary font-semibold text-left">
                  Department
                </th>
                <th className="px-5 py-3 text-text-tertiary font-semibold text-right">
                  Days in office
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {summary.map((row, i) => (
                <tr key={row.userId} className="hover:bg-bg-primary transition-colors">
                  <td className="px-5 py-3 font-medium text-text-primary">
                    <span className="text-[11px] text-text-tertiary mr-2">
                      #{i + 1}
                    </span>
                    {row.name}
                  </td>
                  <td className="px-5 py-3">
                    {row.departmentName ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        style={{
                          backgroundColor: (row.departmentColor ?? "#8B929A") + "18",
                          color: row.departmentColor ?? "#8B929A",
                        }}
                      >
                        {row.departmentName}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-semibold text-text-primary">
                      {row.dayCount}
                    </span>
                    <span className="text-text-tertiary">
                      {" "}
                      / {days}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Visitors Tab ───────────────────────────────────────────────────────────

function VisitorsTab() {
  const [startDateKey, setStartDateKey] = useState(nDaysAgo(29));
  const [endDateKey, setEndDateKey] = useState(todayIST());

  const visitors = useQuery(api.attendance.getVisitorsByDateRange, {
    startDateKey,
    endDateKey,
  });

  const handleExport = () => {
    if (!visitors || visitors.length === 0) return;

    const rows = visitors.map((v) => ({
      Name: v.visitorName ?? "",
      Course: v.visitorCourse ?? "—",
      Date: formatDate(v.dateKey),
      Time: formatTime(v.checkedInAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visitors");
    XLSX.writeFile(wb, `visitors_${startDateKey}_to_${endDateKey}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Date range + export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] text-text-secondary">From</span>
          <input
            type="date"
            id="visitor-start-date"
            value={startDateKey}
            onChange={(e) => setStartDateKey(e.target.value)}
            max={endDateKey}
            className="px-3 py-1.5 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <span className="text-[13px] text-text-secondary">to</span>
          <input
            type="date"
            id="visitor-end-date"
            value={endDateKey}
            onChange={(e) => setEndDateKey(e.target.value)}
            min={startDateKey}
            max={todayIST()}
            className="px-3 py-1.5 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>

        <button
          id="visitor-export-btn"
          onClick={handleExport}
          disabled={!visitors || visitors.length === 0}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} /> Export to Excel
        </button>
      </div>

      {visitors === undefined ? (
        <div className="skeleton h-48 rounded-2xl" />
      ) : visitors.length === 0 ? (
        <div className="card p-12 text-center space-y-2">
          <UserX size={32} className="text-text-tertiary mx-auto" />
          <p className="text-text-secondary text-[14px]">
            No visitor entries for this date range.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border-light bg-bg-tertiary flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">
              {visitors.length} visitor{visitors.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[11px] text-text-tertiary">
              {formatDate(startDateKey)} → {formatDate(endDateKey)}
            </span>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-light">
                <th className="px-5 py-3 text-text-tertiary font-semibold text-left">
                  Name
                </th>
                <th className="px-5 py-3 text-text-tertiary font-semibold text-left">
                  Course / Programme
                </th>
                <th className="px-5 py-3 text-text-tertiary font-semibold text-left">
                  Date
                </th>
                <th className="px-5 py-3 text-text-tertiary font-semibold text-right">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {visitors.map((v) => (
                <tr
                  key={v._id}
                  className="hover:bg-bg-primary transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {v.visitorName}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {v.visitorCourse ?? (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {formatDate(v.dateKey)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-text-secondary">
                    {formatTime(v.checkedInAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AttendanceDashboardPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const [activeTab, setActiveTab] = useState<Tab>("daily");

  const isLeadership = convexUser?.roles?.some((r) =>
    leadershipRoles.has(r as Parameters<typeof leadershipRoles.has>[0])
  );
  const canViewVisitors = convexUser?.roles?.some((r) =>
    visitorViewerRoles.has(r as Parameters<typeof visitorViewerRoles.has>[0])
  );

  if (!isLeadership && !canViewVisitors) {
    return (
      <div className="card p-12 text-center text-text-secondary text-[14px]">
        Leadership or department head access required.
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    ...(isLeadership
      ? [
          {
            key: "daily" as Tab,
            label: "Daily Log",
            icon: <CalendarDays size={14} />,
          },
          {
            key: "summary" as Tab,
            label: "Member Summary",
            icon: <Users size={14} />,
          },
        ]
      : []),
    ...(canViewVisitors
      ? [
          {
            key: "visitors" as Tab,
            label: "Visitor Log",
            icon: <UserX size={14} />,
          },
        ]
      : []),
  ];

  // If the user is dept_head only (not leadership), force to visitors tab
  const effectiveTab = isLeadership ? activeTab : "visitors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">
          Office Logbook
        </h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">
          See who&apos;s been in the office and when.
        </p>
      </div>

      {/* Tab bar — only show if user has more than one tab */}
      {tabs.length > 1 && (
        <div className="flex gap-2 border-b border-border-light pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`logbook-tab-${t.key}`}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-[13px] font-medium transition-all ${
                effectiveTab === t.key
                  ? "bg-white border border-border-light border-b-white text-brand -mb-[1px]"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {effectiveTab === "daily" && <DailyLogTab />}
      {effectiveTab === "summary" && <SummaryTab />}
      {effectiveTab === "visitors" && <VisitorsTab />}
    </div>
  );
}
