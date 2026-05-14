import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;
type User = Doc<"users">;
type Report = Doc<"reports">;

const leadershipRoles = new Set<User["roles"][number]>([
  "core_team",
  "president",
  "admin",
]);

export function isLeadershipUser(user: Pick<User, "approved" | "roles"> | null) {
  return Boolean(
    user?.approved && user.roles.some((role) => leadershipRoles.has(role))
  );
}

export function canManageDepartmentReport(
  user: Pick<User, "approved" | "roles" | "departmentId"> | null,
  departmentId: Id<"departments">
) {
  return Boolean(
    user?.approved &&
      user.departmentId === departmentId &&
      user.roles.includes("department_head")
  );
}

export function canViewReport(user: User | null, report: Report) {
  if (!user?.approved) return false;
  if (isLeadershipUser(user)) return true;
  if (user.departmentId !== report.departmentId) return false;
  if (user.roles.includes("department_head")) return true;
  return report.status === "submitted";
}

export async function getCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

export async function requireApprovedUser(ctx: Ctx) {
  const user = await getCurrentUser(ctx);
  if (!user?.approved) throw new Error("Unauthorized");
  return user;
}

export async function requireReportManager(
  ctx: Ctx,
  departmentId: Id<"departments">
) {
  const user = await requireApprovedUser(ctx);
  if (!canManageDepartmentReport(user, departmentId)) {
    throw new Error("Only department heads can manage reports for their own department");
  }
  return user;
}

export async function requireLeadershipUser(ctx: Ctx) {
  const user = await requireApprovedUser(ctx);
  if (!isLeadershipUser(user)) {
    throw new Error("Only core team users can perform this action");
  }
  return user;
}
