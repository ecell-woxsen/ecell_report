import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  canManageDepartmentReport,
  canViewReport,
  getCurrentUser,
  isLeadershipUser,
  requireReportManager,
} from "./permissions";

function newestFirst(reports: Doc<"reports">[]) {
  return [...reports].sort((a, b) => b.updatedAt - a.updatedAt);
}

function pickDraft(reports: Doc<"reports">[]) {
  return newestFirst(reports).find((report) => report.status === "draft") ?? null;
}

function pickActiveWeeklyReport(reports: Doc<"reports">[]) {
  const sortedReports = newestFirst(reports);
  return (
    sortedReports.find((report) => report.status === "draft") ??
    sortedReports.find((report) => report.status === "submitted") ??
    null
  );
}

export const createDraft = mutation({
  args: {
    departmentId: v.id("departments"),
    weekLabel: v.string(),
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireReportManager(ctx, args.departmentId);
    const department = await ctx.db.get(args.departmentId);
    if (!department?.active) throw new Error("Department not found");

    // Reuse an unfinished draft, but never route "New Report" to a submitted report.
    const existingReports = await ctx.db
      .query("reports")
      .withIndex("by_department_week", (q) =>
        q.eq("departmentId", args.departmentId).eq("weekStart", args.weekStart)
      )
      .collect();

    const existingDraft = pickDraft(existingReports);
    if (existingDraft) return existingDraft._id;

    return await ctx.db.insert("reports", {
      departmentId: args.departmentId,
      departmentName: department.name,
      weekLabel: args.weekLabel,
      weekStart: args.weekStart,
      departmentHeadClerkId: user.clerkId,
      departmentHeadName: user.name,
      status: "draft",
      sections: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const autosave = mutation({
  args: {
    reportId: v.id("reports"),
    sections: v.any(),
    activeMembersCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId);
    if (report.status === "submitted") {
      throw new Error("Submitted reports are read-only");
    }

    await ctx.db.patch(args.reportId, {
      sections: args.sections,
      activeMembersCount: args.activeMembersCount,
      updatedAt: Date.now(),
    });
  },
});

export const submit = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId);
    if (report.status === "submitted") throw new Error("Report already submitted");

    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      status: "submitted",
      submittedAt: now,
      submissionDate: new Date(now).toISOString().split("T")[0],
      updatedAt: now,
    });

    // Send notifications to all core team and president
    const coreUsers = await ctx.db.query("users").collect();
    const notifyUsers = coreUsers.filter((u) =>
      u.roles.some((r) => ["core_team", "president", "admin"].includes(r)) && u.approved
    );

    for (const user of notifyUsers) {
      await ctx.db.insert("notifications", {
        recipientClerkId: user.clerkId,
        type: "report_submitted",
        reportId: args.reportId,
        departmentName: report.departmentName,
        message: `${report.departmentName} submitted their ${report.weekLabel} report`,
        read: false,
        createdAt: now,
      });
    }
  },
});

export const getById = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report || !canViewReport(user, report)) return null;
    return report;
  },
});

export const getCurrentDraft = query({
  args: {
    departmentId: v.id("departments"),
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (
      !user?.approved ||
      (user.departmentId !== args.departmentId && !isLeadershipUser(user))
    ) {
      return null;
    }

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_department_week", (q) =>
        q.eq("departmentId", args.departmentId).eq("weekStart", args.weekStart)
      )
      .collect();

    if (!isLeadershipUser(user) && !canManageDepartmentReport(user, args.departmentId)) {
      return newestFirst(reports).find((report) => report.status === "submitted") ?? null;
    }

    return pickActiveWeeklyReport(reports);
  },
});

export const listByDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (
      !user?.approved ||
      (user.departmentId !== args.departmentId && !isLeadershipUser(user))
    ) {
      return [];
    }

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .order("desc")
      .collect();

    if (isLeadershipUser(user) || canManageDepartmentReport(user, args.departmentId)) {
      return reports;
    }

    return reports.filter((report) => report.status === "submitted");
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user?.approved) return [];

    if (isLeadershipUser(user)) {
      return await ctx.db.query("reports").order("desc").collect();
    }

    if (!user.departmentId) return [];

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_department", (q) => q.eq("departmentId", user.departmentId!))
      .order("desc")
      .collect();

    if (canManageDepartmentReport(user, user.departmentId)) {
      return reports;
    }

    return reports.filter((report) => report.status === "submitted");
  },
});

export const getLastSubmitted = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (
      !user?.approved ||
      (user.departmentId !== args.departmentId && !isLeadershipUser(user))
    ) {
      return null;
    }

    return await ctx.db
      .query("reports")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "submitted"))
      .first();
  },
});

export const getOrgStatusThisWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isLeadershipUser(user)) return [];

    const departments = await ctx.db
      .query("departments")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    const statusList = [];
    for (const dept of departments) {
      const reports = await ctx.db
        .query("reports")
        .withIndex("by_department_week", (q) =>
          q.eq("departmentId", dept._id).eq("weekStart", args.weekStart)
        )
        .collect();
      const report = pickActiveWeeklyReport(reports);

      // Get dept head info
      let headName = "Not assigned";
      if (dept.headUserId) {
        const head = await ctx.db.get(dept.headUserId);
        if (head) headName = head.name;
      }

      statusList.push({
        department: dept,
        headName,
        report: report || null,
        status: report ? report.status : "not_started",
      });
    }

    return statusList;
  },
});

export const getMetricsHistory = query({
  args: {
    departmentId: v.id("departments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (
      !user?.approved ||
      (user.departmentId !== args.departmentId && !isLeadershipUser(user))
    ) {
      return [];
    }

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "submitted"))
      .take(args.limit || 12);

    return reports.map((r) => ({
      weekLabel: r.weekLabel,
      weekStart: r.weekStart,
      metrics: r.sections?.metrics || {},
    }));
  },
});

export const carryForwardTasks = mutation({
  args: {
    reportId: v.id("reports"),
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId);
    if (report.departmentId !== args.departmentId) {
      throw new Error("Report does not belong to this department");
    }

    const lastReport = await ctx.db
      .query("reports")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "submitted"))
      .first();

    if (!lastReport || !lastReport.sections?.task_tracker) return [];

    const pendingTasks = lastReport.sections.task_tracker.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.status === "Pending" || t.status === "Delayed"
    );

    if (pendingTasks.length === 0) return [];

    const currentTasks = report.sections?.task_tracker || [];
    const newTasks = [
      ...currentTasks,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...pendingTasks.map((t: any) => ({
        ...t,
        id: crypto.randomUUID(),
        status: "In Progress",
        remarks: `Carried forward from ${lastReport.weekLabel}`,
      })),
    ];

    await ctx.db.patch(args.reportId, {
      sections: { ...report.sections, task_tracker: newTasks },
      updatedAt: Date.now(),
    });

    return newTasks;
  },
});
