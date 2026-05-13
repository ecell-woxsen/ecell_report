import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createDraft = mutation({
  args: {
    departmentId: v.id("departments"),
    departmentName: v.string(),
    weekLabel: v.string(),
    weekStart: v.string(),
    departmentHeadClerkId: v.string(),
    departmentHeadName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if draft already exists for this dept + week
    const existing = await ctx.db
      .query("reports")
      .withIndex("by_department_week", (q) =>
        q.eq("departmentId", args.departmentId).eq("weekStart", args.weekStart)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("reports", {
      ...args,
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
    if (!report || report.status === "submitted") return;

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
    return await ctx.db.get(args.reportId);
  },
});

export const getCurrentDraft = query({
  args: {
    departmentId: v.id("departments"),
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_department_week", (q) =>
        q.eq("departmentId", args.departmentId).eq("weekStart", args.weekStart)
      )
      .first();
  },
});

export const listByDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reports").order("desc").collect();
  },
});

export const getLastSubmitted = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
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
    const departments = await ctx.db
      .query("departments")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    const statusList = [];
    for (const dept of departments) {
      const report = await ctx.db
        .query("reports")
        .withIndex("by_department_week", (q) =>
          q.eq("departmentId", dept._id).eq("weekStart", args.weekStart)
        )
        .first();

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

    const report = await ctx.db.get(args.reportId);
    if (!report) return [];

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
