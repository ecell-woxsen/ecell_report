import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    reportId: v.id("reports"),
    sectionKey: v.string(),
    authorClerkId: v.string(),
    authorName: v.string(),
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
    const commentId = await ctx.db.insert("comments", {
      reportId: args.reportId,
      sectionKey: args.sectionKey,
      authorClerkId: args.authorClerkId,
      authorName: args.authorName,
      text: args.text,
      tag: args.tag,
      resolved: false,
      createdAt: Date.now(),
    });

    // Notify the department head
    const report = await ctx.db.get(args.reportId);
    if (report && report.departmentHeadClerkId !== args.authorClerkId) {
      await ctx.db.insert("notifications", {
        recipientClerkId: report.departmentHeadClerkId,
        type: "comment_added",
        reportId: args.reportId,
        commentId,
        message: `${args.authorName} commented on your ${report.weekLabel} report`,
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
    authorClerkId: v.string(),
    authorName: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      reportId: args.reportId,
      sectionKey: args.sectionKey,
      parentId: args.parentId,
      authorClerkId: args.authorClerkId,
      authorName: args.authorName,
      text: args.text,
      resolved: false,
      createdAt: Date.now(),
    });

    // Notify original commenter
    const parent = await ctx.db.get(args.parentId);
    if (parent && parent.authorClerkId !== args.authorClerkId) {
      await ctx.db.insert("notifications", {
        recipientClerkId: parent.authorClerkId,
        type: "comment_reply",
        reportId: args.reportId,
        commentId,
        message: `${args.authorName} replied to your comment`,
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
    await ctx.db.patch(args.commentId, { resolved: true });
  },
});

export const listByReport = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_report", (q) => q.eq("reportId", args.reportId))
      .collect();
  },
});
