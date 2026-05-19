import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("departments")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const getById = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.departmentId);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("departments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    colorTag: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("departments", {
      name: args.name,
      slug: args.slug,
      colorTag: args.colorTag,
      description: args.description,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    departmentId: v.id("departments"),
    name: v.optional(v.string()),
    colorTag: v.optional(v.string()),
    description: v.optional(v.string()),
    headUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { departmentId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(departmentId, cleanUpdates);
  },
});

export const archive = mutation({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.departmentId, { active: false });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("departments").collect();
    const existingBySlug = new Map(existing.map((dept) => [dept.slug, dept]));

    const defaultDepartments = [
      { name: "Outreach and Partnerships", slug: "outreach", colorTag: "#1D9E75", description: "Founder outreach, sponsorships, and partnerships" },
      { name: "Tech", slug: "tech", colorTag: "#185FA5", description: "Technical development and infrastructure" },
      { name: "Marketing", slug: "marketing", colorTag: "#E05E1A", description: "Social media, campaigns, content" },
      { name: "Finance", slug: "finance", colorTag: "#3B6D11", description: "Budget management, reimbursements" },
      { name: "Events", slug: "events", colorTag: "#7C3AED", description: "Event planning and execution" },
      { name: "Design", slug: "design", colorTag: "#DB2777", description: "Visual design and creative assets" },
      { name: "Documentation", slug: "documentation", colorTag: "#0891B2", description: "Documentation, records, and public-facing updates" },
    ];

    for (const dept of defaultDepartments) {
      const existingDept =
        existingBySlug.get(dept.slug) ||
        (dept.slug === "documentation" ? existingBySlug.get("pr") : undefined);

      if (existingDept) {
        await ctx.db.patch(existingDept._id, {
          ...dept,
          active: true,
        });
      } else {
        await ctx.db.insert("departments", {
          ...dept,
          active: true,
          createdAt: Date.now(),
        });
      }
    }
  },
});
