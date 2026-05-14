import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const roleValidator = v.union(
  v.literal("member"),
  v.literal("department_head"),
  v.literal("core_team"),
  v.literal("president"),
  v.literal("admin")
);

type Role = Doc<"users">["roles"][number];

const roleRank: Record<Role, number> = {
  member: 0,
  department_head: 1,
  core_team: 2,
  president: 3,
  admin: 3,
};

function highestRoleRank(roles: Role[]) {
  if (roles.length === 0) return 0;
  return Math.max(...roles.map((role) => roleRank[role] ?? 0));
}

function formatRoles(roles: Role[]) {
  return roles.map((role) => role.replace("_", " ")).join(", ");
}

function rolesAreSame(a: Role[], b: Role[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((role, index) => role === sortedB[index]);
}

async function notifyAdminsOfRoleRequest(ctx: MutationCtx, user: Doc<"users">, requestedRoles: Role[]) {
  const users = await ctx.db.query("users").collect();
  const admins = users.filter(
    (candidate) =>
      candidate.approved &&
      candidate.roles.some((role) => role === "admin" || role === "president")
  );

  for (const admin of admins) {
    await ctx.db.insert("notifications", {
      recipientClerkId: admin.clerkId,
      type: "pending_user",
      message: `${user.name} requested role change to ${formatRoles(requestedRoles)}`,
      read: false,
      createdAt: Date.now(),
    });
  }
}

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
    roles: v.array(roleValidator),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      roles: args.roles,
      requestedRoles: undefined,
      roleRequestCreatedAt: undefined,
    });
  },
});

export const requestRoleChange = mutation({
  args: {
    clerkId: v.string(),
    roles: v.array(roleValidator),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    if (rolesAreSame(user.roles, args.roles)) {
      await ctx.db.patch(user._id, {
        requestedRoles: undefined,
        roleRequestCreatedAt: undefined,
      });
      return { status: "unchanged" };
    }

    const isPromotion = highestRoleRank(args.roles) > highestRoleRank(user.roles);
    if (isPromotion) {
      await ctx.db.patch(user._id, {
        requestedRoles: args.roles,
        roleRequestCreatedAt: Date.now(),
      });
      await notifyAdminsOfRoleRequest(ctx, user, args.roles);
      return { status: "pending" };
    }

    await ctx.db.patch(user._id, {
      roles: args.roles,
      requestedRoles: undefined,
      roleRequestCreatedAt: undefined,
    });
    return { status: "updated" };
  },
});

export const approveRoleRequest = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.requestedRoles) return;

    await ctx.db.patch(args.userId, {
      roles: user.requestedRoles,
      requestedRoles: undefined,
      roleRequestCreatedAt: undefined,
    });

    await ctx.db.insert("notifications", {
      recipientClerkId: user.clerkId,
      type: "account_approved",
      message: `Your role change to ${formatRoles(user.requestedRoles)} has been approved.`,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const rejectRoleRequest = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.requestedRoles) return;

    const requestedRoles = user.requestedRoles;
    await ctx.db.patch(args.userId, {
      requestedRoles: undefined,
      roleRequestCreatedAt: undefined,
    });

    await ctx.db.insert("notifications", {
      recipientClerkId: user.clerkId,
      type: "account_approved",
      message: `Your role change to ${formatRoles(requestedRoles)} was not approved.`,
      read: false,
      createdAt: Date.now(),
    });
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
