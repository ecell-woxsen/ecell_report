"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { canSubmitDepartmentReport, isLeadershipUser } from "@/lib/permissions";
import { normalizeDepartmentName } from "@/lib/departments";
import type { Id } from "@/convex/_generated/dataModel";

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

export default function NewReportPage() {
  const { user } = useUser();
  const clerkId = user?.id;
  const router = useRouter();
  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkId ? { clerkId } : "skip"
  );
  const departments = useQuery(api.departments.listAll);
  const createDraft = useMutation(api.reports.createDraft);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState<Id<"departments"> | "">("");
  const canSubmitReport = canSubmitDepartmentReport(convexUser);
  const canPickDepartment = isLeadershipUser(convexUser);
  const availableDepartments =
    convexUser && departments
      ? canPickDepartment
        ? departments
        : departments.filter(
            (department) => department._id === convexUser.departmentId
          )
      : [];
  const selectedReportDepartmentId =
    selectedDepartmentId ||
    (availableDepartments.length === 1 ? availableDepartments[0]._id : "");

  const createReport = useCallback(
    async (departmentId: Id<"departments">) => {
      if (!clerkId) {
        setError("You need to sign in before creating a report.");
        return;
      }

      setCreating(true);
      setError(null);

      const weekStart = getCurrentWeekStart();
      const weekLabel = getWeekLabel();

      try {
        const reportId = await createDraft({
          departmentId,
          weekLabel,
          weekStart,
          clerkId,
        });
        router.replace(`/reports/${reportId}/edit`);
      } catch {
        setError("You do not have permission to create this report.");
        setCreating(false);
      }
    },
    [clerkId, createDraft, router]
  );

  const handleCreateReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReportDepartmentId || creating) return;
    void createReport(selectedReportDepartmentId);
  };

  const assignedDepartmentMissing = Boolean(
    convexUser &&
      departments &&
      canSubmitReport &&
      !canPickDepartment &&
      availableDepartments.length === 0
  );

  if (convexUser && !canSubmitReport) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-sm text-center animate-fade-in">
          <AlertCircle size={34} className="text-warn mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-text-primary mb-2">
            Report submission is restricted
          </h1>
          <p className="text-sm text-text-secondary mb-5">
            Approved department heads, team leads, core team, presidents, vice presidents, advisors, and admins can create and submit reports.
          </p>
          <Link
            href="/reports"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            View Reports
          </Link>
        </div>
      </div>
    );
  }

  if (assignedDepartmentMissing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-sm text-center animate-fade-in">
          <AlertCircle size={34} className="text-danger mx-auto mb-4" />
          <p className="text-sm text-text-secondary mb-5">
            Your account needs an assigned department before you can create a report.
          </p>
          <Link
            href="/reports"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  if (convexUser && canSubmitReport) {
    if (!departments) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <Loader2 size={32} className="text-brand mx-auto mb-4 animate-spin" />
            <p className="text-text-secondary">Loading departments...</p>
          </div>
        </div>
      );
    }

    if (departments.length === 0 || availableDepartments.length === 0) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="max-w-sm text-center animate-fade-in">
            <AlertCircle size={34} className="text-warn mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-text-primary mb-2">
              No departments found
            </h1>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
            >
              Back to Reports
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <form
          onSubmit={handleCreateReport}
          className="w-full max-w-md p-6 rounded-2xl bg-white border border-border-light shadow-sm animate-fade-in"
        >
          <h1 className="text-lg font-semibold text-text-primary mb-1">
            New Report
          </h1>
          <p className="text-xs text-text-tertiary mb-5">{getWeekLabel()}</p>

          {canPickDepartment || availableDepartments.length > 1 ? (
            <>
              <label
                htmlFor="department"
                className="block text-xs font-medium text-text-secondary mb-1.5"
              >
                Department
              </label>
              <select
                id="department"
                value={selectedDepartmentId}
                onChange={(event) =>
                  setSelectedDepartmentId(
                    event.target.value as Id<"departments"> | ""
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="">Select department</option>
                {availableDepartments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {normalizeDepartmentName(department)}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">
                Department
              </p>
              <div className="px-3.5 py-2.5 rounded-xl border border-border bg-bg-primary text-sm text-text-primary">
                {normalizeDepartmentName(availableDepartments[0])}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle size={13} />
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <Link
              href="/reports"
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!selectedReportDepartmentId || creating}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Create Report"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-sm text-center animate-fade-in">
          <AlertCircle size={34} className="text-danger mx-auto mb-4" />
          <p className="text-sm text-text-secondary mb-5">{error}</p>
          <Link
            href="/reports"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <Loader2 size={32} className="text-brand mx-auto mb-4 animate-spin" />
        <p className="text-text-secondary">Creating your report...</p>
      </div>
    </div>
  );
}
