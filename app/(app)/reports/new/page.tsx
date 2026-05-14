"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { canSubmitDepartmentReport } from "@/lib/permissions";

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
  const router = useRouter();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const departments = useQuery(api.departments.listAll);
  const createDraft = useMutation(api.reports.createDraft);
  const [error, setError] = useState<string | null>(null);
  const canSubmitReport = canSubmitDepartmentReport(convexUser);

  useEffect(() => {
    if (!convexUser || !departments) return;
    if (!canSubmitReport) return;

    const dept = departments.find((d) => d._id === convexUser.departmentId);
    if (!dept) return;

    const weekStart = getCurrentWeekStart();
    const weekLabel = getWeekLabel();

    createDraft({
      departmentId: dept._id,
      weekLabel,
      weekStart,
    }).then((reportId) => {
      router.replace(`/reports/${reportId}/edit`);
    }).catch(() => {
      setError("You do not have permission to create this report.");
    });
  }, [canSubmitReport, convexUser, departments, createDraft, router]);

  if (convexUser && !canSubmitReport) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-sm text-center animate-fade-in">
          <AlertCircle size={34} className="text-warn mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-text-primary mb-2">
            Report submission is restricted
          </h1>
          <p className="text-sm text-text-secondary mb-5">
            Only approved department heads can create and submit reports for their own department.
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
