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
 * Multiple entries per day are allowed, but with a minimum 1-hour gap.
 * Returns:
 *   { status: "checked_in", checkedInAt, entryId }  — new entry created
 *   { status: "too_soon", lastCheckedInAt, nextAvailableAt } — gap not met yet
 *
 * The schema keeps checkedOutAt for future exit-time tracking.
 */
const ONE_HOUR_MS = 60 * 60 * 1000;

export const checkIn = mutation({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireApprovedUser(ctx, args.clerkId);
    const dateKey = todayIST();

    // Find the most recent entry for this user today (server-side enforcement)
    const lastEntry = await ctx.db
      .query("attendance")
      .withIndex("by_clerk_date", (q) =>
        q.eq("clerkId", user.clerkId).eq("dateKey", dateKey)
      )
      .order("desc")
      .first();

    if (lastEntry) {
      const elapsed = Date.now() - lastEntry.checkedInAt;
      if (elapsed < ONE_HOUR_MS) {
        return {
          status: "too_soon" as const,
          lastCheckedInAt: lastEntry.checkedInAt,
          nextAvailableAt: lastEntry.checkedInAt + ONE_HOUR_MS,
        };
      }
    }

    const now = Date.now();
    const entryId = await ctx.db.insert("attendance", {
      type: "member",
      clerkId: user.clerkId,
      userId: user._id,
      departmentId: user.departmentId,
      dateKey,
      checkedInAt: now,
      // checkedOutAt is intentionally omitted here — reserved for future exit-time tracking
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
 * Returns the most recent logbook entry for today for the current member,
 * or null if they haven't checked in yet.
 * Used by the /checkin page to determine whether a new entry is allowed
 * (i.e., whether the 1-hour gap has elapsed).
 */
export const getTodayStatus = query({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
    if (!user?.approved) return null;

    const dateKey = todayIST();
    // .order("desc") so .first() gives the most recent entry, not the earliest
    return await ctx.db
      .query("attendance")
      .withIndex("by_clerk_date", (q) =>
        q.eq("clerkId", user.clerkId).eq("dateKey", dateKey)
      )
      .order("desc")
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
 * All logbook entries (members + visitors) in a date range, sorted newest-first.
 * Member entries are enriched with name and department info.
 * Accessible to department_head + leadership.
 */
export const getEntriesByDateRange = query({
  args: {
    startDateKey: v.string(),
    endDateKey: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireVisitorViewer(ctx, args.clerkId);

    const entries = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) =>
        q.gte("dateKey", args.startDateKey).lte("dateKey", args.endDateKey)
      )
      .order("desc")
      .collect();

    // Enrich member entries with user + department info (same as getDailyLog)
    return await Promise.all(
      entries.map(async (entry) => {
        if (entry.type === "member" && entry.userId) {
          const user = await ctx.db.get(entry.userId);
          const dept = entry.departmentId
            ? await ctx.db.get(entry.departmentId)
            : null;
          return {
            ...entry,
            displayName: user?.name ?? "Unknown Member",
            departmentName: dept?.name ?? null,
            departmentColor: dept?.colorTag ?? null,
          };
        }
        return {
          ...entry,
          displayName: entry.visitorName ?? "Visitor",
          departmentName: null,
          departmentColor: null,
        };
      })
    );
  },
});
