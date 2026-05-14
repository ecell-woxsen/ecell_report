import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canViewReport, getCurrentUser, requireLeadershipUser } from "./permissions";

export const add = mutation({
  args: {
    reportId: v.id("reports"),
    sectionKey: v.string(),
    text: v.string(),
    tag: v.optional(
      v.union(
        v.literal("Action Required"),
        v.literal("Good Work"),
        v.literal("Follow Up"),
        v.literal("Note")
      )
    ),
  },
  handler: async (ctx, args) => {
    const author = await requireLeadershipUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report || !canViewReport(author, report)) throw new Error("Report not found");

    const commentId = await ctx.db.insert("comments", {
      reportId: args.reportId,
      sectionKey: args.sectionKey,
      authorClerkId: author.clerkId,
      authorName: author.name,
      text: args.text,
      tag: args.tag,
      resolved: false,
      createdAt: Date.now(),
    });

    // Notify the department head
    if (report.departmentHeadClerkId !== author.clerkId) {
      await ctx.db.insert("notifications", {
        recipientClerkId: report.departmentHeadClerkId,
        type: "comment_added",
        reportId: args.reportId,
        commentId,
        message: `${author.name} commented on your ${report.weekLabel} report`,
        read: false,
        createdAt: Date.now(),
      });
    }

    return commentId;
  },
});

export const reply = mutation({
  args: {
    reportId: v.id("reports"),
    sectionKey: v.string(),
    parentId: v.id("comments"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const author = await requireLeadershipUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report || !canViewReport(author, report)) throw new Error("Report not found");

    const commentId = await ctx.db.insert("comments", {
      reportId: args.reportId,
      sectionKey: args.sectionKey,
      parentId: args.parentId,
      authorClerkId: author.clerkId,
      authorName: author.name,
      text: args.text,
      resolved: false,
      createdAt: Date.now(),
    });

    // Notify original commenter
    const parent = await ctx.db.get(args.parentId);
    if (parent && parent.authorClerkId !== author.clerkId) {
      await ctx.db.insert("notifications", {
        recipientClerkId: parent.authorClerkId,
        type: "comment_reply",
        reportId: args.reportId,
        commentId,
        message: `${author.name} replied to your comment`,
        read: false,
        createdAt: Date.now(),
      });
    }

    return commentId;
  },
});

export const resolve = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const author = await requireLeadershipUser(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    const report = await ctx.db.get(comment.reportId);
    if (!report || !canViewReport(author, report)) throw new Error("Report not found");

    await ctx.db.patch(args.commentId, { resolved: true });
  },
});

export const listByReport = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report || !canViewReport(user, report)) return [];

    return await ctx.db
      .query("comments")
      .withIndex("by_report", (q) => q.eq("reportId", args.reportId))
      .collect();
  },
});
