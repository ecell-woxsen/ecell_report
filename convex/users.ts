import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      roles: ["member"],
      approved: false,
      createdAt: Date.now(),
    });
  },
});

export const completeOnboarding = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    phone: v.string(),
    yearOfStudy: v.string(),
    departmentId: v.id("departments"),
    requestedRole: v.union(v.literal("member"), v.literal("department_head")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name,
        email: "",
        phone: args.phone,
        yearOfStudy: args.yearOfStudy,
        departmentId: args.departmentId,
        roles: [args.requestedRole],
        approved: false,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      phone: args.phone,
      yearOfStudy: args.yearOfStudy,
      departmentId: args.departmentId,
      roles: [args.requestedRole],
    });
    return user._id;
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const listPendingApproval = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_approved", (q) => q.eq("approved", false))
      .collect();
  },
});

export const listByDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .collect();
  },
});

export const approve = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { approved: true });

    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.insert("notifications", {
        recipientClerkId: user.clerkId,
        type: "account_approved",
        message: "Your account has been approved! You now have full access.",
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(
      v.union(
        v.literal("member"),
        v.literal("department_head"),
        v.literal("core_team"),
        v.literal("president"),
        v.literal("admin")
      )
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { roles: args.roles });
  },
});

export const updateDepartment = mutation({
  args: {
    userId: v.id("users"),
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { departmentId: args.departmentId });
  },
});

export const deactivate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { approved: false, roles: ["member"] });
  },
});
