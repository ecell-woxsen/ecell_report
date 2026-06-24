import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import {
  getCurrentUser,
  requireApprovedUser,
  requireLeadershipUser,
  requireVisitorViewer,
} from "./permissions";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the current IST date as "YYYY-MM-DD".
 * IST is UTC+5:30. Using a fixed offset so the logbook
 * always shows the local Hyderabad date, not the UTC date.
 */
function todayIST(): string {
  const now = new Date();
  // Shift by IST offset (+5h 30m = 330 min)
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().split("T")[0];
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Member flows ───────────────────────────────────────────────────────────

/**
 * Member check-in via QR scan.
 * Returns { status: "checked_in" | "already_checked_in", checkedInAt }.
 * Never throws for the duplicate case — the client renders a friendly message.
 */
export const checkIn = mutation({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireApprovedUser(ctx, args.clerkId);
    const dateKey = todayIST();

    // Check for existing entry today
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_clerk_date", (q) =>
        q.eq("clerkId", user.clerkId).eq("dateKey", dateKey)
      )
      .first();

    if (existing) {
      return {
        status: "already_checked_in" as const,
        checkedInAt: existing.checkedInAt,
        entryId: existing._id,
      };
    }

    const now = Date.now();
    const entryId = await ctx.db.insert("attendance", {
      type: "member",
      clerkId: user.clerkId,
      userId: user._id,
      departmentId: user.departmentId,
      dateKey,
      checkedInAt: now,
      method: "qr_scan",
    });

    return {
      status: "checked_in" as const,
      checkedInAt: now,
      entryId,
    };
  },
});

/**
 * Visitor log-in — no auth required by design.
 * Each submission is independently logged; no deduplication.
 * (A visitor may genuinely scan twice; that's fine.)
 */
export const visitorCheckIn = mutation({
  args: {
    name: v.string(),
    course: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const entryId = await ctx.db.insert("attendance", {
      type: "visitor",
      visitorName: args.name.trim(),
      visitorCourse: args.course?.trim() || undefined,
      dateKey: todayIST(),
      checkedInAt: now,
      method: "qr_scan",
    });

    return {
      status: "checked_in" as const,
      checkedInAt: now,
      entryId,
    };
  },
});

/**
 * Returns the current signed-in member's logbook entry for today, or null.
 */
export const getTodayStatus = query({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
    if (!user?.approved) return null;

    const dateKey = todayIST();
    return await ctx.db
      .query("attendance")
      .withIndex("by_clerk_date", (q) =>
        q.eq("clerkId", user.clerkId).eq("dateKey", dateKey)
      )
      .first();
  },
});

/**
 * Paginated list of the current member's past logbook entries, newest first.
 */
export const getMyAttendanceHistory = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireApprovedUser(ctx);

    return await ctx.db
      .query("attendance")
      .withIndex("by_clerk_date", (q) => q.eq("clerkId", user.clerkId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ── Leadership / admin flows ───────────────────────────────────────────────

/**
 * All logbook entries for a given date, joined with user details for members.
 * Leadership-only.
 * Each row is tagged with `type` so the UI can badge members vs visitors.
 */
export const getDailyLog = query({
  args: {
    dateKey: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireLeadershipUser(ctx, args.clerkId);

    const entries = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("dateKey", args.dateKey))
      .order("asc")
      .collect();

    // Enrich member entries with user + department info
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        if (entry.type === "member" && entry.userId) {
          const user = await ctx.db.get(entry.userId);
          const dept = entry.departmentId
            ? await ctx.db.get(entry.departmentId)
            : null;
          return {
            ...entry,
            memberName: user?.name ?? "Unknown",
            departmentName: dept?.name ?? null,
            departmentColor: dept?.colorTag ?? null,
          };
        }
        return {
          ...entry,
          memberName: null,
          departmentName: null,
          departmentColor: null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Per-user count of unique check-in days over a date range — members only.
 * Returns sorted by count desc so the most-present members appear first.
 * Leadership-only.
 */
export const getDepartmentAttendanceSummary = query({
  args: {
    startDateKey: v.string(),
    endDateKey: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireLeadershipUser(ctx, args.clerkId);

    const entries = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) =>
        q.gte("dateKey", args.startDateKey).lte("dateKey", args.endDateKey)
      )
      .filter((q) => q.eq(q.field("type"), "member"))
      .collect();

    // Aggregate: userId → { name, departmentName, color, days: Set<dateKey> }
    const byUser = new Map<
      string,
      {
        userId: string;
        name: string;
        departmentName: string | null;
        departmentColor: string | null;
        days: Set<string>;
      }
    >();

    for (const entry of entries) {
      if (!entry.userId) continue;
      const uid = entry.userId;
      if (!byUser.has(uid)) {
        const user = await ctx.db.get(uid);
        const dept = entry.departmentId
          ? await ctx.db.get(entry.departmentId)
          : null;
        byUser.set(uid, {
          userId: uid,
          name: user?.name ?? "Unknown",
          departmentName: dept?.name ?? null,
          departmentColor: dept?.colorTag ?? null,
          days: new Set(),
        });
      }
      byUser.get(uid)!.days.add(entry.dateKey);
    }

    return Array.from(byUser.values())
      .map((u) => ({ ...u, dayCount: u.days.size, days: undefined }))
      .sort((a, b) => b.dayCount - a.dayCount);
  },
});

/**
 * All visitor logbook entries in a date range, sorted newest-first.
 * Accessible to department_head + leadership (wider than most admin queries).
 */
export const getVisitorsByDateRange = query({
  args: {
    startDateKey: v.string(),
    endDateKey: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireVisitorViewer(ctx, args.clerkId);

    return await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) =>
        q.gte("dateKey", args.startDateKey).lte("dateKey", args.endDateKey)
      )
      .filter((q) => q.eq(q.field("type"), "visitor"))
      .order("desc")
      .collect();
  },
});
