"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import {
  canEditReportForDepartment,
  canSubmitDepartmentReport,
  isLeadershipUser,
} from "@/lib/permissions";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Edit3,
  ArrowRight,
  Calendar,
} from "lucide-react";

export default function ReportsPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const canSubmitReport = canSubmitDepartmentReport(convexUser);
  const canViewAllDepartments = isLeadershipUser(convexUser);
  const allReports = useQuery(
    api.reports.listAll,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const departments = useQuery(api.departments.listAll);

  if (!allReports || !convexUser) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const availableDepartments = canViewAllDepartments
    ? departments
    : departments?.filter((department) => department._id === convexUser.departmentId);

  const filtered = allReports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (deptFilter !== "all" && r.departmentId !== deptFilter) return false;
    if (
      search &&
      !r.departmentName.toLowerCase().includes(search.toLowerCase()) &&
      !r.weekLabel.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Reports</h1>
          <p className="text-text-tertiary text-[13px] mt-0.5">
            {canViewAllDepartments
              ? "Organization-wide report view across departments"
              : canSubmitReport
                ? "Report history and drafts for your department"
                : "Read-only submitted reports for your department"}
          </p>
        </div>
        {canSubmitReport && (
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid transition-all shadow-sm"
          >
            <Plus size={15} />
            New Report
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-border bg-white text-[13px] text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="draft">Draft</option>
        </select>
        {availableDepartments && availableDepartments.length > 1 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-border bg-white text-[13px] text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="all">All Departments</option>
            {availableDepartments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Report List */}
      {filtered.length === 0 ? (
        <div className="p-14 rounded-2xl bg-white border border-border-light text-center">
          <FileText size={36} className="text-text-tertiary mx-auto mb-3" />
          <h3 className="text-[15px] font-semibold text-text-primary mb-1.5 tracking-tight">
            No reports found
          </h3>
          <p className="text-text-secondary text-[13px]">
            {canSubmitReport
              ? "Start by creating a report or adjust your filters."
              : "No reports match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <Link
              key={report._id}
              href={
                report.status === "draft" &&
                canEditReportForDepartment(convexUser, report.departmentId)
                  ? `/reports/${report._id}/edit`
                  : `/reports/${report._id}`
              }
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light hover:shadow-md transition-all group"
            >
              <div
                className="w-2 h-12 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    departments?.find((d) => d._id === report.departmentId)
                      ?.colorTag || "#1D9E75",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[13px] text-text-primary">
                    {report.departmentName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      report.status === "submitted"
                        ? "bg-success-bg text-success-text"
                        : "bg-warn-light text-warn"
                    }`}
                  >
                    {report.status === "submitted" ? (
                      <CheckCircle2 size={10} />
                    ) : (
                      <Edit3 size={10} />
                    )}
                    {report.status === "submitted" ? "Submitted" : "Draft"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {report.weekLabel}
                  </span>
                  {report.submittedAt && (
                    <span>
                      Submitted{" "}
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight
                size={16}
                className="text-text-tertiary group-hover:text-brand transition-colors shrink-0"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
