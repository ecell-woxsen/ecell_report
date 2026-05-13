import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    departmentId: v.id("departments"),
    name: v.string(),
    sections: v.array(
      v.object({
        key: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        placeholder: v.optional(v.string()),
        type: v.union(
          v.literal("header"),
          v.literal("dynamic_table"),
          v.literal("textarea"),
          v.literal("textarea_multi"),
          v.literal("metrics_grid"),
          v.literal("performance_quadrant"),
          v.literal("budget_table"),
          v.literal("campaign_table")
        ),
        required: v.boolean(),
        enabled: v.boolean(),
        order: v.number(),
        config: v.optional(v.any()),
      })
    ),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        sections: args.sections,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
      return existing._id;
    }

    return await ctx.db.insert("templates", {
      name: args.name,
      departmentId: args.departmentId,
      sections: args.sections,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
  },
});

// Seed default templates for each department
export const seedTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTemplates = await ctx.db.query("templates").collect();
    if (existingTemplates.length > 0) return;

    const departments = await ctx.db.query("departments").collect();

    type SectionType = "header" | "dynamic_table" | "textarea" | "textarea_multi" | "metrics_grid" | "performance_quadrant" | "budget_table" | "campaign_table";
    type SectionDef = {
      key: string; title: string; description?: string; placeholder?: string;
      type: SectionType; required: boolean; enabled: boolean; order: number;
      config?: Record<string, unknown>;
    };

    // Common core sections every department gets
    const coreSections: SectionDef[] = [
      {
        key: "report_header",
        title: "Report Header",
        type: "header" as const,
        required: true,
        enabled: true,
        order: 1,
      },
      {
        key: "team_participation",
        title: "Team Participation Report",
        description: "Track member participation and contributions",
        type: "dynamic_table" as const,
        required: true,
        enabled: true,
        order: 2,
        config: {
          columns: ["Team Member", "Role", "Participation Level", "Contribution Summary"],
        },
      },
      {
        key: "task_tracker",
        title: "Task Assignment & Progress Tracker",
        description: "Track task assignments, deadlines, and progress",
        type: "dynamic_table" as const,
        required: true,
        enabled: true,
        order: 3,
        config: {
          columns: ["Task", "Assigned To", "Deadline", "Status", "Remarks"],
        },
      },
      {
        key: "weekly_goals",
        title: "Weekly Goals Planned",
        description: "Goals set at the start of this week",
        placeholder: "List the goals that were planned for this week...",
        type: "textarea" as const,
        required: true,
        enabled: true,
        order: 4,
      },
      {
        key: "challenges",
        title: "Challenges Faced",
        description: "Blockers, problems, and friction points",
        placeholder: "Describe any challenges or blockers your team faced...",
        type: "textarea" as const,
        required: true,
        enabled: true,
        order: 9,
      },
      {
        key: "solutions",
        title: "Solutions & Actions Taken",
        description: "Actions implemented in response to challenges",
        placeholder: "What solutions were implemented to address the challenges?",
        type: "textarea" as const,
        required: false,
        enabled: true,
        order: 10,
      },
      {
        key: "next_week_plan",
        title: "Plans for Next Week",
        description: "Action items and priorities for the coming week",
        placeholder: "Outline the priorities and plans for next week...",
        type: "textarea" as const,
        required: true,
        enabled: true,
        order: 13,
      },
      {
        key: "support_required",
        title: "Support Required from Core Team",
        description: "Approvals, resources, or decisions needed from leadership",
        placeholder: "What support or approvals do you need from the Core Team?",
        type: "textarea" as const,
        required: false,
        enabled: true,
        order: 14,
      },
      {
        key: "overall_summary",
        title: "Overall Weekly Summary",
        description: "One-paragraph narrative of the week",
        placeholder: "Write a brief summary of the department's week overall...",
        type: "textarea" as const,
        required: false,
        enabled: true,
        order: 15,
      },
    ];

    // Department-specific metrics
    const deptMetrics: Record<string, string[]> = {
      outreach: ["Cold Emails Sent", "LinkedIn Messages Sent", "Calls Conducted", "Positive Responses", "Meetings Scheduled", "Partnerships Closed", "Sponsors Contacted", "Speakers Approached", "Follow-Ups Completed"],
      tech: ["Features Shipped", "Bugs Fixed", "PRs Merged", "Hours Logged", "Deployments", "Issues Opened", "Issues Closed"],
      marketing: ["Posts Published", "Total Reach", "Engagement Rate (%)", "New Followers", "Stories/Reels Posted", "Campaigns Launched", "Collaborations Executed", "Content Pieces Created"],
      finance: ["Budget Requests Processed", "Reimbursements Cleared", "Pending Approvals", "Expenses Logged", "Invoices Raised"],
      events: ["Events Planned", "Events Executed", "Registrations Collected", "Sponsors Confirmed", "Venues Booked", "Volunteers Engaged"],
      design: ["Design Requests Received", "Designs Delivered", "Revisions Completed", "Assets Published", "Pending Requests"],
      pr: ["Media Mentions", "Press Releases Sent", "Partnership MoUs Signed", "Influencers Contacted", "Coverage Pieces Published"],
    };

    // Department-specific work sub-sections
    const deptWorkSections: Record<string, string[]> = {
      outreach: ["Founder Outreach", "Sponsorship Outreach", "Speaker Coordination", "Collaborations & Networking"],
      tech: ["Development", "Bug Fixes & Maintenance", "Infrastructure", "Research & Learning"],
      marketing: ["Content Creation", "Campaigns", "Social Media Management", "Brand Partnerships"],
      finance: ["Budget Management", "Reimbursements", "Financial Planning", "Reporting"],
      events: ["Event Planning", "Event Execution", "Venue & Logistics", "Post-Event Analysis"],
      design: ["Design Requests", "Brand Assets", "Marketing Collateral", "UI/UX"],
      pr: ["Media Relations", "Press Coverage", "Partnership Development", "Public Communications"],
    };

    for (const dept of departments) {
      const sections: SectionDef[] = [...coreSections];

      // Work Completed
      sections.push({
        key: "work_completed",
        title: "Work Completed This Week",
        description: "Department-specific work breakdown",
        type: "textarea_multi" as const,
        required: true,
        enabled: true,
        order: 5,
        config: {
          subSections: deptWorkSections[dept.slug] || ["General Work"],
        },
      });

      // Metrics
      sections.push({
        key: "metrics",
        title: "Performance Metrics",
        description: "Key performance indicators for the week",
        type: "metrics_grid" as const,
        required: true,
        enabled: true,
        order: 6,
        config: {
          metrics: (deptMetrics[dept.slug] || []).map((label) => ({
            label,
            unit: "",
          })),
        },
      });

      // Optional: Leads (Outreach, PR, Finance)
      if (["outreach", "pr", "finance"].includes(dept.slug)) {
        sections.push({
          key: "leads",
          title: "Important Conversations & Leads",
          description: "Key conversations, leads, and follow-ups",
          type: "textarea_multi" as const,
          required: false,
          enabled: true,
          order: 7,
          config: {
            subSections: ["Key Conversations This Week", "Promising Leads", "Pending Follow-Ups & Next Steps"],
          },
        });
      }

      // Team Performance Review
      sections.push({
        key: "team_performance",
        title: "Team Performance Review",
        type: "performance_quadrant" as const,
        required: false,
        enabled: true,
        order: 8,
        config: {
          quadrants: ["Most Active Members", "Members Showing Leadership", "Members Requiring Improvement", "Internal Coordination Quality"],
        },
      });

      // Budget (Finance, Events)
      if (["finance", "events"].includes(dept.slug)) {
        sections.push({
          key: "budget",
          title: "Budget & Expenditure Tracker",
          description: "Track budget and expenses",
          type: "budget_table" as const,
          required: false,
          enabled: true,
          order: 11,
          config: {
            columns: ["Item", "Category", "Amount (₹)", "Status", "Notes"],
          },
        });
      }

      // Campaigns (Marketing, Events)
      if (["marketing", "events"].includes(dept.slug)) {
        sections.push({
          key: "campaigns",
          title: "Campaign / Event Status",
          description: "Track campaign and event progress",
          type: "campaign_table" as const,
          required: false,
          enabled: true,
          order: 12,
          config: {
            columns: ["Campaign/Event Name", "Lead", "Deadline", "Status", "Notes"],
          },
        });
      }

      // Sort by order
      sections.sort((a, b) => a.order - b.order);

      const templateId = await ctx.db.insert("templates", {
        name: `${dept.name} Report Template`,
        departmentId: dept._id,
        sections,
        updatedAt: Date.now(),
        updatedBy: "system",
      });

      await ctx.db.patch(dept._id, { templateId });
    }
  },
});
