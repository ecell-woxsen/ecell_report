import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientClerkId", args.clerkId))
      .order("desc")
      .take(50);
  },
});

export const getUnreadCount = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientClerkId", args.clerkId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    return notifs.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientClerkId", args.clerkId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    for (const n of notifs) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});
