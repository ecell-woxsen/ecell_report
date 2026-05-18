import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  canManageDepartmentReport,
  canViewReport,
  getCurrentUser,
  isLeadershipUser,
  requireReportManager,
} from "./permissions";

type ReportAttachment = NonNullable<Doc<"reports">["attachments"]>[number];
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

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

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeAttachmentName(value: string) {
  const trimmed = value.trim();
  return (trimmed || "Attachment").slice(0, 180);
}

function withoutAttachment(
  attachments: ReportAttachment[] | undefined,
  storageId: Id<"_storage">
) {
  return (attachments ?? []).filter((attachment) => attachment.storageId !== storageId);
}

export const createDraft = mutation({
  args: {
    departmentId: v.id("departments"),
    weekLabel: v.string(),
    weekStart: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireReportManager(ctx, args.departmentId, args.clerkId);
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
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId, args.clerkId);

    await ctx.db.patch(args.reportId, {
      sections: args.sections,
      activeMembersCount: args.activeMembersCount,
      updatedAt: Date.now(),
    });
  },
});

export const generateAttachmentUploadUrl = mutation({
  args: {
    reportId: v.id("reports"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId, args.clerkId);

    return await ctx.storage.generateUploadUrl();
  },
});

export const attachFile = mutation({
  args: {
    reportId: v.id("reports"),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.optional(v.string()),
    size: v.number(),
    description: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    const user = await requireReportManager(ctx, report.departmentId, args.clerkId);
    if (!Number.isFinite(args.size) || args.size < 0) {
      throw new Error("Invalid attachment size");
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new Error("Uploaded file not found");
    if (metadata.size > MAX_ATTACHMENT_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Attachment must be 3 MB or smaller");
    }

    const contentType = normalizeOptionalText(args.contentType);
    const description = normalizeOptionalText(args.description);
    const attachment: ReportAttachment = {
      storageId: args.storageId,
      name: normalizeAttachmentName(args.name),
      size: metadata.size ?? args.size,
      uploadedAt: Date.now(),
      uploadedByClerkId: user.clerkId,
      uploadedByName: user.name,
      ...(contentType ? { contentType } : {}),
      ...(description ? { description } : {}),
    };

    await ctx.db.patch(args.reportId, {
      attachments: [...withoutAttachment(report.attachments, args.storageId), attachment],
      updatedAt: Date.now(),
    });
  },
});

export const removeAttachment = mutation({
  args: {
    reportId: v.id("reports"),
    storageId: v.id("_storage"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId, args.clerkId);

    const remainingAttachments = withoutAttachment(report.attachments, args.storageId);
    if (remainingAttachments.length === (report.attachments ?? []).length) {
      throw new Error("Attachment not found");
    }

    await ctx.db.patch(args.reportId, {
      attachments: remainingAttachments,
      updatedAt: Date.now(),
    });
    await ctx.storage.delete(args.storageId);
  },
});

export const listAttachments = query({
  args: {
    reportId: v.id("reports"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
    const report = await ctx.db.get(args.reportId);
    if (!report || !canViewReport(user, report)) return [];

    return await Promise.all(
      (report.attachments ?? [])
        .slice()
        .sort((a, b) => b.uploadedAt - a.uploadedAt)
        .map(async (attachment) => ({
          ...attachment,
          url: await ctx.storage.getUrl(attachment.storageId),
        }))
    );
  },
});

export const submit = mutation({
  args: {
    reportId: v.id("reports"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId, args.clerkId);
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
  args: {
    reportId: v.id("reports"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
    const report = await ctx.db.get(args.reportId);
    if (!report || !canViewReport(user, report)) return null;
    return report;
  },
});

export const getCurrentDraft = query({
  args: {
    departmentId: v.id("departments"),
    weekStart: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
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
  args: {
    departmentId: v.id("departments"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
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
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
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
  args: {
    departmentId: v.id("departments"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
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
  args: {
    weekStart: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
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
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
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
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireReportManager(ctx, report.departmentId, args.clerkId);
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
