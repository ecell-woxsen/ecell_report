import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    authorClerkId: v.string(),
    authorName: v.string(),
    title: v.string(),
    body: v.string(),
    targetRoles: v.array(v.string()),
    targetDepartmentIds: v.optional(v.array(v.id("departments"))),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("announcements", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("announcements")
      .order("desc")
      .take(20);
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("announcements")
      .order("desc")
      .take(20);

    const now = Date.now();
    return all.filter((a) => !a.expiresAt || a.expiresAt > now);
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.announcementId);
  },
});
