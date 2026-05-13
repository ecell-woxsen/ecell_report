"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (!convexUser || !departments) return;

    const dept = departments.find((d) => d._id === convexUser.departmentId);
    if (!dept) return;

    const weekStart = getCurrentWeekStart();
    const weekLabel = getWeekLabel();

    createDraft({
      departmentId: dept._id,
      departmentName: dept.name,
      weekLabel,
      weekStart,
      departmentHeadClerkId: convexUser.clerkId,
      departmentHeadName: convexUser.name,
    }).then((reportId) => {
      router.replace(`/reports/${reportId}/edit`);
    });
  }, [convexUser, departments, createDraft, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <Loader2 size={32} className="text-brand mx-auto mb-4 animate-spin" />
        <p className="text-text-secondary">Creating your report...</p>
      </div>
    </div>
  );
}
