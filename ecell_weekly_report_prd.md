# PRD: E-Cell Weekly Report & Operations Platform

**Version:** 2.0  
**Status:** Ready for Development  
**Stack:** Next.js 14 (App Router) · React · Convex · Clerk  
**Organization:** Woxsen University E-Cell  
**Prepared for:** E-Cell President & Core Team

---

## 1. Overview

### 1.1 The Real Problem

Right now, E-Cell runs its entire weekly accountability loop on WhatsApp messages and, at best, a shared Excel sheet. This means:

- The President and Core Team have **no single place** to see what all departments did this week.
- Department Heads send updates into a group chat that gets buried within hours.
- There is **no history** — what was done last month? Last semester? Gone.
- Task follow-ups happen through personal DMs. If someone doesn't reply, it falls through.
- Comparing performance across departments is impossible — every dept uses a different format.
- Excel sheets are overwritten, not versioned. A formula breaks and nobody notices.
- New Core Team members have zero context on what was done before they joined.

### 1.2 What We're Building

A purpose-built web application for E-Cell where **every department** (Outreach, Tech, Marketing, Finance, Events, PR, Design, or any future department) submits a structured weekly report. The President and Core Team get a unified dashboard showing the health of the entire organization at a glance. Everything is stored permanently, searchable, and comparable over time.

This replaces WhatsApp updates, Excel sheets, and informal check-ins — not by adding bureaucracy, but by making the right thing the easy thing.

### 1.3 Key Outcomes

- Every department's weekly activity is captured in a structured, permanent record.
- The President sees the entire organization's status on one screen, not across 10 WhatsApp groups.
- Department Heads spend under 15 minutes filling their report. It's faster than typing a WhatsApp summary.
- Core Team can add feedback, flag issues, and track follow-ups without DMing anyone.
- Any trend — task slippage, declining participation, metric drops — becomes visible over time.
- Nothing is lost when a team member or department head is replaced.

### 1.4 Core Design Philosophy

> **Replace friction, not freedom.** The tool should feel like the fastest way to communicate what your team did — not like filling a government form.

- Autosave everything. Never lose work.
- Mobile-friendly. Department heads are students; they may fill reports from their phones.
- Department-aware. Each department gets a report template appropriate for their work.
- Flat and fast. No deep navigation. The main flow is: open app → fill report → submit.

---

## 2. Organization Structure & Roles

### 2.1 E-Cell Hierarchy (as modeled in the app)

```
E-Cell President
    └── Core Team (Secretary General, Vice Presidents, etc.)
            ├── Outreach Department
            │       └── Department Head + Members
            ├── Tech Department
            │       └── Department Head + Members
            ├── Marketing Department
            │       └── Department Head + Members
            ├── Finance Department
            │       └── Department Head + Members
            ├── Events Department
            │       └── Department Head + Members
            ├── Design Department
            │       └── Department Head + Members
            ├── PR & Partnerships Department
            │       └── Department Head + Members
            └── [Any future department]
```

Departments are created and managed by Admin in the app. No hardcoded list — departments are data, not config.

### 2.2 User Roles

| Role | Who | What They Can Do |
|---|---|---|
| **Member** | Regular department member | View their dept's submitted reports; fill assigned tasks in reports if enabled |
| **Department Head** | Dept lead (fills the report) | Create, edit, and submit weekly reports for their department; view own dept history |
| **Core Team** | Secretaries, VPs, Core members | View all departments' reports; add comments/feedback; view org-wide analytics |
| **President** | E-Cell President | Everything Core Team can do + approve users + access all settings |
| **Admin** | Technical admin | Full access; manage departments, templates, users, system config |

> A user can hold multiple roles (e.g., a Core Team member who is also a Department Head for one dept).

### 2.3 Role Assignment Flow

1. User signs up via Clerk (Google OAuth or email).
2. They fill their profile: name, phone, year of study, and select their department + role requested.
3. Admin or President approves the role. Until approved, user sees a "Pending Approval" screen.
4. Admin can promote/demote roles at any time.

---

## 3. Department Templates

This is the foundational concept that makes the platform work across all departments.

### 3.1 What Is a Department Template?

Each department has a report template that defines:
- Which sections appear in their weekly report.
- Whether a section is required or optional.
- What the section title, description, and placeholder text says.
- Which metrics (numeric KPIs) are relevant to that department.
- The section order.

Templates are managed by Admin through a template editor UI. No code changes needed to add a new department or modify a section.

### 3.2 Shared Core Sections (Every Department)

These 8 sections appear in every department's report regardless of template customization:

| # | Section | Description |
|---|---|---|
| 1 | Report Header | Week, dept head, active members, submission date |
| 2 | Team Participation | Dynamic table: member, role, participation level, contribution |
| 3 | Task Tracker | Dynamic table: task, assigned to, deadline, status, remarks |
| 4 | Weekly Goals Planned | Goals set at the start of this week |
| 5 | Work Completed This Week | What was actually done (dept-specific sub-sections) |
| 6 | Performance Metrics | Dept-specific numeric KPIs in a card grid |
| 7 | Challenges Faced | Blockers, problems, friction points |
| 8 | Plans for Next Week | Action items and priorities for the coming week |

### 3.3 Optional Sections (Dept Configurable)

These sections are toggled on/off per department template:

| Section | Default Depts |
|---|---|
| Important Conversations & Leads | Outreach, PR, Finance |
| Team Performance Review (quadrant) | All (recommended) |
| Solutions & Actions Taken | All |
| Support Required from Core Team | All |
| Budget & Expenditure Tracker | Finance, Events |
| Campaign / Event Status | Marketing, Events |
| Overall Weekly Summary | All (recommended) |

### 3.4 Department-Specific Metric Sets

Each department template defines its own KPI cards for Section 6:

**Outreach Department**
- Cold Emails Sent · LinkedIn Messages Sent · Calls Conducted
- Positive Responses · Meetings Scheduled · Partnerships Closed
- Sponsors Contacted · Speakers Approached · Follow-Ups Completed

**Marketing Department**
- Posts Published · Total Reach · Engagement Rate (%)
- New Followers · Stories/Reels Posted · Campaigns Launched
- Collaborations Executed · Content Pieces Created

**Tech Department**
- Features Shipped · Bugs Fixed · PRs Merged
- Hours Logged · Deployments · Issues Opened · Issues Closed

**Events Department**
- Events Planned · Events Executed · Registrations Collected
- Sponsors Confirmed · Venues Booked · Volunteers Engaged

**Finance Department**
- Budget Requests Processed · Reimbursements Cleared
- Pending Approvals · Expenses Logged · Invoices Raised

**Design Department**
- Design Requests Received · Designs Delivered · Revisions Completed
- Assets Published · Pending Requests

**PR & Partnerships Department**
- Media Mentions · Press Releases Sent · Partnership MoUs Signed
- Influencers Contacted · Coverage Pieces Published

Metrics are stored as a flexible key-value map on the report, so the template defines the labels and the report stores the values.

---

## 4. Core Features

### 4.1 Authentication & Onboarding (Clerk)

- Sign up / sign in via Clerk: Google OAuth (primary) or email + password.
- Post-signup onboarding screen:
  - Full name (pre-filled from Google)
  - Phone number
  - Year of study
  - Department (dropdown from Convex `departments` table)
  - Role requested (Member / Department Head)
- "Pending Approval" screen shown until Admin/President approves.
- Clerk webhook syncs user data to Convex `users` table on creation and update.

### 4.2 President / Core Team Dashboard (`/dashboard`)

The home screen for leadership. Shows the full E-Cell in one view.

**Org Status Card Grid**
- One card per department, sorted by submission status: Submitted → Draft → Not Started.
- Each card shows:
  - Department name + color tag
  - Department Head name
  - This week's status badge: `Submitted [date]` / `Draft` / `Not Started`
  - 3–4 headline metrics (if submitted)
  - "View Report" button

**This Week Summary Bar** (top of page)
- Total departments: X
- Submitted: X | Draft: X | Not Started: X
- Overdue departments highlighted in red (past Sunday with no submission)

**Recent Activity Feed** (right sidebar or bottom)
- "Outreach submitted their Week 19 report — 2 hours ago"
- "Tech updated their draft — 45 min ago"
- "Marketing hasn't submitted yet (3 days overdue)"

**Quick Links**
- View all reports · Analytics · Manage departments · Manage users

### 4.3 Department Head Dashboard (`/dashboard`)

For Department Heads, the home screen shows:

- **This Week's Report** card — "Draft in progress" / "Not started" / "Submitted ✓"
- "Continue Draft" or "Start Report" CTA (large, prominent)
- **Last 4 Weeks** report cards with submission date and quick status
- **Open Tasks** — tasks from last week's Task Tracker that were marked Pending or Delayed (pulled from Convex, shown as a reminder)
- **Unread Comments** from leadership on past reports

### 4.4 Member Dashboard (`/dashboard`)

For regular members:

- Their department's submitted reports (read-only view)
- Their own task assignments this week (pulled from Task Tracker rows where `assignedTo` matches their name)
- Announcements from Core Team

### 4.5 Report Composer

The core experience. Opened from the Department Head dashboard.

#### Header Bar (Sticky)

- Department name + week label (left)
- Save status indicator: `All changes saved` / `Saving…` / `Unsaved changes` (center)
- Section completion progress: `9 / 13 sections filled` (right)
- Submit Report button (primary, right)

#### Report Header Section

| Field | Type | Behavior |
|---|---|---|
| Week Duration | Text | Auto-filled with current Mon–Sun range. Editable. |
| Department | Text | Auto-filled from user profile. Read-only. |
| Department Head | Text | Auto-filled from user profile. Editable if needed. |
| Active Members | Number | Count of members who contributed this week |
| Submission Date | Date | Defaults to today |

#### Section 2: Team Participation Report

Dynamic table with rows:
- **Team Member** — text input (with autocomplete from dept member list in Convex)
- **Role** — text input
- **Participation Level** — select: `Excellent` / `Good` / `Moderate` / `Low` — renders as color-coded badge immediately
- **Contribution Summary** — textarea (auto-grows)

"+ Add Member" dashed button below table. Trash icon on each row (visible on hover).

#### Section 3: Task Assignment & Progress Tracker

Dynamic table:
- **Task** — text input
- **Assigned To** — text input with member autocomplete
- **Deadline** — date picker
- **Status** — select: `Completed` / `In Progress` / `Pending` / `Delayed` — color-coded badge
- **Remarks** — textarea

Filter bar above the table: All | Completed | In Progress | Pending | Delayed (client-side filter, doesn't affect data).

"+ Add Task" dashed button. Trash icon per row on hover.

**Carry-forward logic:** When creating a new report, any tasks from the previous report that were `Pending` or `Delayed` are offered for import with a "Carry forward X unfinished tasks" banner at the top of this section. One click imports them (status resets to `In Progress`).

#### Section 4: Weekly Goals Planned

- Carry-forward button: "Import from last week's plans" — pre-fills with prior report's Section 8 (Next Week Plans). One click.
- Single textarea, full-width, min-height 80px.

#### Section 5: Work Completed This Week

Sub-sections are defined by the department template. For Outreach, they're: Founder Outreach · Sponsorship Outreach · Speaker Coordination · Collaborations & Networking. For Marketing, they'd be: Content · Campaigns · Social Media · Partnerships. Each sub-section is a labeled textarea. Admin can customize labels per template.

#### Section 6: Performance Metrics

Metrics defined by department template. Layout: 3-column card grid on desktop, 2-column on mobile.

Each metric card:
- Label (from template)
- Large number input (placeholder "0")
- Trend indicator: ▲ +3 / ▼ -2 / — (compared to prior week, fetched from Convex)

Below the grid: **Performance Analysis** — a green-tinted textarea for narrative commentary.

#### Section 7: Important Conversations & Leads *(Outreach, PR, Finance — template-controlled)*

Three textareas:
- Key Conversations This Week
- Promising Leads
- Pending Follow-Ups & Next Steps

#### Section 8: Team Performance Review

2×2 card grid, each with a short label and textarea:
- Most Active Members
- Members Showing Leadership
- Members Requiring Improvement
- Internal Coordination Quality

Below: Communication Effectiveness textarea.

#### Section 9: Challenges Faced

Single textarea. Placeholder gives examples relevant to the department.

#### Section 10: Solutions & Actions Taken

Single textarea. Actions implemented in response to last week's challenges.

#### Section 11: Budget & Expenditure *(Finance, Events — template-controlled)*

Dynamic table:
- Item · Category · Amount (₹) · Status (Approved / Pending / Rejected) · Notes

#### Section 12: Campaign / Event Status *(Marketing, Events — template-controlled)*

Dynamic table:
- Campaign/Event Name · Lead · Deadline · Status · Notes

#### Section 13: Plans for Next Week

Single textarea. This feeds into next week's Section 4 carry-forward.

#### Section 14: Support Required from Core Team

Single textarea. What approvals, resources, or decisions are needed from leadership.

#### Section 15: Overall Weekly Summary

Large textarea. The one-paragraph narrative the President reads first. Explicitly recommended to write last.

All sections are **collapsible** (open by default). Collapse state saved in localStorage per user per report.

### 4.6 Autosave

- Every keystroke triggers a 2-second debounced save to Convex via `reports.autosave` mutation.
- Save indicator in the sticky header updates in real time.
- On returning to an unsubmitted report, the draft is restored exactly as left.
- One active draft per department per week enforced at the DB level.

### 4.7 Submit Flow

1. Department Head clicks "Submit Report".
2. A modal appears showing:
   - Sections filled vs total (e.g. 12/15)
   - Any required sections that are empty (warns, doesn't block unless configured as hard-required)
   - Metrics summary
   - Confirmation CTA: "Submit for this week"
3. On confirm:
   - `reports.submit` mutation fires: status → `submitted`, `submittedAt` recorded.
   - Report becomes read-only for the Department Head.
   - Notifications sent to all Core Team and President users.
4. A success toast: "Week 19 report submitted ✓"

### 4.8 Report Viewer (Read-Only)

Identical layout to the composer with all inputs replaced by styled static text. Shown for:
- Any submitted report viewed by anyone.
- Draft viewed by Core Team (they can view but not edit).

**Submission banner** at top: `Submitted by [Name] · [Date & Time]`

Per-section comment threads appear below each section body (see 4.9).

### 4.9 Comments & Feedback System

Available to Core Team and President on any submitted report.

- Each section has a "Add Feedback" button (collapsed by default).
- Comment fields: text, optional tag (`Action Required` / `Good Work` / `Follow Up` / `Note`).
- Comments appear as a thread below the section with author avatar, name, timestamp, and tag badge.
- Department Head can reply (one level of threading).
- Comment added → notification to Department Head.
- Reply added → notification to the commenter.

### 4.10 Report History & Archive (`/reports`)

**For Department Heads:** Their department's reports listed by week, most recent first.

**For Core Team / President:** All departments. Filterable by:
- Department (multi-select)
- Week / date range
- Submission status (Submitted / Draft / Not Started)
- Has unread comments

Each report card shows:
- Department · Week label · Submission date
- Headline metrics snapshot (3 most important KPIs for that dept)
- Status badge
- Comment count
- "View" button

### 4.11 Org-Wide Analytics Dashboard (`/analytics`)

Accessible to Core Team and President only.

**Overview Tab**
- Submission rate by department (bar chart, last 12 weeks)
- Org-wide task completion rate over time (line chart)
- Overdue report frequency per department (sorted worst to best)
- Active member count trend across all depts (stacked area chart)

**Department Deep Dive Tab**
- Department selector (dropdown)
- That department's metrics over time (line chart, each KPI a toggle-able line)
- Task completion rate for that dept (bar chart)
- Team participation distribution (donut: Excellent/Good/Moderate/Low)
- Challenges word cloud (from all challenge textareas — stretch goal, v2)

**Cross-Department Comparison Tab**
- Side-by-side metric comparison between selected departments
- Leaderboard: departments ranked by on-time submission streak
- Table: all departments, last week's headline metrics, sorted by column

**Filters:** Date range picker, department multi-select, metric selector.

### 4.12 PDF Export

- Available on any submitted report viewer page.
- "Export PDF" button generates a clean, print-formatted version of the full report.
- PDF matches the visual design of the HTML prototype (teal header, section structure, badges).
- Implemented via `@react-pdf/renderer` or browser print with `@media print` CSS.
- PDF footer: "E-Cell · [Department] · Week [N] · Submitted [Date]"

### 4.13 Notifications (In-App)

Bell icon in top nav with unread count badge.

| Event | Who Gets Notified |
|---|---|
| Report submitted | All Core Team + President |
| Comment added on any section | Department Head of that report |
| Reply to a comment | The original commenter |
| Department has not submitted by Sunday | That Dept Head + All Core Team |
| User account approved | The approved user |
| New user pending approval | Admin + President |

Notifications list page at `/notifications`. Mark individual or all as read.

### 4.14 Member Directory (`/team`)

- Full member list, filterable by department.
- Each member card: name, role, department, avatar (from Clerk), reports contributed to, avg participation level badge.
- Click member → their contribution history (extracted from all reports where their name appears in Team Participation rows).

### 4.15 Department & Template Management (`/admin/departments`)

Admin-only section.

**Departments:**
- Create department (name, color tag, description)
- Archive/deactivate a department
- Assign Department Head

**Templates:**
- Per-department template editor
- Toggle sections on/off
- Reorder sections (drag-and-drop)
- Edit section titles, descriptions, placeholder text
- Define metric cards (label, unit, order)
- Mark sections as required vs optional

### 4.16 User Management (`/admin/users`)

Admin / President only.

- Table of all users: name, email, department, role, status (approved/pending)
- Approve pending users
- Change role
- Move user to different department
- Deactivate account (soft delete)

---

## 5. Data Model (Convex Schema)

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ── USERS ──────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    yearOfStudy: v.optional(v.string()),
    roles: v.array(v.union(
      v.literal("member"),
      v.literal("department_head"),
      v.literal("core_team"),
      v.literal("president"),
      v.literal("admin")
    )),
    departmentId: v.optional(v.id("departments")),
    avatarUrl: v.optional(v.string()),
    approved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_department", ["departmentId"]),

  // ── DEPARTMENTS ────────────────────────────────────────────────────
  departments: defineTable({
    name: v.string(),               // "Outreach", "Tech", "Marketing"...
    slug: v.string(),               // "outreach", "tech", "marketing"
    colorTag: v.string(),           // hex color for UI identification
    description: v.optional(v.string()),
    headUserId: v.optional(v.id("users")),
    templateId: v.optional(v.id("templates")),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  // ── TEMPLATES ──────────────────────────────────────────────────────
  templates: defineTable({
    name: v.string(),
    departmentId: v.id("departments"),
    sections: v.array(v.object({
      key: v.string(),              // "team_participation", "task_tracker", "metrics"...
      title: v.string(),
      description: v.optional(v.string()),
      placeholder: v.optional(v.string()),
      type: v.union(
        v.literal("header"),
        v.literal("dynamic_table"),
        v.literal("textarea"),
        v.literal("textarea_multi"), // multiple labeled textareas
        v.literal("metrics_grid"),
        v.literal("performance_quadrant"),
        v.literal("budget_table"),
        v.literal("campaign_table")
      ),
      required: v.boolean(),
      enabled: v.boolean(),
      order: v.number(),
      config: v.optional(v.any()),  // section-type-specific config (metric labels, sub-section labels, etc.)
    })),
    updatedAt: v.number(),
    updatedBy: v.string(),          // clerkId
  }).index("by_department", ["departmentId"]),

  // ── REPORTS ────────────────────────────────────────────────────────
  reports: defineTable({
    departmentId: v.id("departments"),
    departmentName: v.string(),     // denormalized for query convenience
    weekLabel: v.string(),          // "May 6 – May 12, 2025"
    weekStart: v.string(),          // "2025-05-06" ISO date for sorting/uniqueness
    departmentHeadClerkId: v.string(),
    departmentHeadName: v.string(),
    activeMembersCount: v.optional(v.number()),
    submissionDate: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.optional(v.number()),

    // Sections stored as flexible document
    // Keys match template section keys. Values are section-type-specific.
    sections: v.any(),
    // Example structure of sections:
    // {
    //   team_participation: [{ id, name, role, level, contribution }],
    //   task_tracker: [{ id, task, assignedTo, deadline, status, remarks }],
    //   weekly_goals: "string",
    //   work_completed: { sub1: "string", sub2: "string" },
    //   metrics: { cold_emails_sent: 12, linkedin_messages: 8, ... },
    //   performance_analysis: "string",
    //   leads: { key_conversations: "", promising_leads: "", follow_ups: "" },
    //   team_performance: { most_active: "", leadership: "", improvement: "", coordination: "", communication: "" },
    //   challenges: "string",
    //   solutions: "string",
    //   next_week_plan: "string",
    //   support_required: "string",
    //   overall_summary: "string",
    //   budget: [{ item, category, amount, status, notes }],
    //   campaigns: [{ name, lead, deadline, status, notes }],
    // }
  })
    .index("by_department", ["departmentId"])
    .index("by_week_start", ["weekStart"])
    .index("by_status", ["status"])
    .index("by_department_week", ["departmentId", "weekStart"]),

  // ── COMMENTS ───────────────────────────────────────────────────────
  comments: defineTable({
    reportId: v.id("reports"),
    sectionKey: v.string(),
    authorClerkId: v.string(),
    authorName: v.string(),
    text: v.string(),
    tag: v.optional(v.union(
      v.literal("Action Required"),
      v.literal("Good Work"),
      v.literal("Follow Up"),
      v.literal("Note")
    )),
    parentId: v.optional(v.id("comments")),
    resolved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_report_section", ["reportId", "sectionKey"]),

  // ── NOTIFICATIONS ──────────────────────────────────────────────────
  notifications: defineTable({
    recipientClerkId: v.string(),
    type: v.union(
      v.literal("report_submitted"),
      v.literal("comment_added"),
      v.literal("comment_reply"),
      v.literal("report_overdue"),
      v.literal("account_approved"),
      v.literal("pending_user")
    ),
    reportId: v.optional(v.id("reports")),
    commentId: v.optional(v.id("comments")),
    departmentName: v.optional(v.string()),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_recipient", ["recipientClerkId"]),

  // ── ANNOUNCEMENTS (President → all) ───────────────────────────────
  announcements: defineTable({
    authorClerkId: v.string(),
    authorName: v.string(),
    title: v.string(),
    body: v.string(),
    targetRoles: v.array(v.string()), // ["all"] or ["department_head", "member"]
    targetDepartmentIds: v.optional(v.array(v.id("departments"))), // null = all depts
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }),

});
```

---

## 6. Page & Route Structure

```
app/
├── (auth)/
│   ├── sign-in/page.tsx              → Clerk sign-in
│   ├── sign-up/page.tsx              → Clerk sign-up
│   └── onboarding/page.tsx           → Post-signup profile completion
│
├── (app)/                             → Protected layout
│   ├── layout.tsx                     → Auth guard, top nav, sidebar
│   │
│   ├── dashboard/page.tsx             → Role-aware home (Pres/Core/Dept Head/Member)
│   │
│   ├── reports/
│   │   ├── page.tsx                   → Report archive (all or own dept)
│   │   ├── new/page.tsx               → Start new report (redirects to draft)
│   │   └── [id]/
│   │       ├── page.tsx               → Report viewer (read-only)
│   │       └── edit/page.tsx          → Report composer (draft only, own dept)
│   │
│   ├── analytics/page.tsx             → Org-wide analytics (Core Team + President)
│   │
│   ├── team/page.tsx                  → Member directory
│   │
│   ├── notifications/page.tsx         → Full notification list
│   │
│   ├── settings/page.tsx              → User profile settings
│   │
│   └── admin/
│       ├── layout.tsx                 → Admin/President only guard
│       ├── departments/page.tsx       → Department CRUD
│       ├── departments/[id]/template/page.tsx  → Template editor
│       ├── users/page.tsx             → User management & approvals
│       └── announcements/page.tsx    → Create org-wide announcements
│
└── api/
    └── webhooks/clerk/route.ts        → Clerk webhook → sync user to Convex
```

---

## 7. Component Architecture

```
components/
│
├── report/
│   ├── ReportComposer.tsx             — Top-level composer shell
│   ├── ReportHeader.tsx               — Week, dept, member count, date
│   ├── ReportProgressBar.tsx          — Sections filled indicator
│   ├── ReportActionBar.tsx            — Sticky bar: save status + submit
│   ├── SubmitModal.tsx                — Pre-submit confirmation
│   ├── ReportSection.tsx              — Collapsible section wrapper
│   │
│   └── sections/
│       ├── TeamParticipationSection.tsx
│       ├── TaskTrackerSection.tsx
│       ├── WeeklyGoalsSection.tsx
│       ├── WorkCompletedSection.tsx   — Renders dynamic sub-section textareas from template
│       ├── MetricsGridSection.tsx     — Renders metric cards from template config
│       ├── LeadsSection.tsx
│       ├── TeamPerformanceSection.tsx
│       ├── ChallengesSection.tsx
│       ├── SolutionsSection.tsx
│       ├── NextWeekPlanSection.tsx
│       ├── SupportSection.tsx
│       ├── BudgetSection.tsx
│       ├── CampaignSection.tsx
│       └── OverallSummarySection.tsx
│
├── viewer/
│   ├── ReportViewer.tsx               — Read-only report shell
│   ├── SectionViewer.tsx              — Renders any section type as static text
│   ├── SectionComments.tsx            — Comment thread per section
│   └── CommentInput.tsx
│
├── dashboard/
│   ├── PresidentDashboard.tsx
│   ├── DeptHeadDashboard.tsx
│   ├── MemberDashboard.tsx
│   ├── DeptStatusCard.tsx             — Per-department status card (for President view)
│   ├── OrgStatusBar.tsx               — Submitted/Draft/Not Started counts
│   ├── ActivityFeed.tsx
│   └── OpenTasksReminder.tsx
│
├── analytics/
│   ├── SubmissionRateChart.tsx        — Bar chart, per dept, last 12 weeks
│   ├── TaskCompletionChart.tsx
│   ├── MetricsTrendChart.tsx          — Line chart, dept-specific KPIs
│   ├── ParticipationDonut.tsx
│   ├── SubmissionHeatmap.tsx
│   ├── DeptLeaderboard.tsx
│   └── CrossDeptComparison.tsx
│
├── admin/
│   ├── DepartmentForm.tsx
│   ├── TemplateEditor.tsx             — Section toggle, reorder, config
│   ├── MetricConfigEditor.tsx
│   ├── UserTable.tsx
│   └── ApprovalQueue.tsx
│
└── ui/
    ├── Badge.tsx                      — Status + participation badges
    ├── MetricCard.tsx                 — KPI card with trend indicator
    ├── DynamicTable.tsx               — Reusable add/delete row table
    ├── SectionTextarea.tsx
    ├── SaveIndicator.tsx
    ├── NotificationBell.tsx
    ├── CarryForwardBanner.tsx         — Offer to import from last report
    └── DeptColorTag.tsx               — Department color pill
```

---

## 8. Key Convex Functions

### Mutations

| Function | Description |
|---|---|
| `reports.createDraft` | Creates a new draft for dept + week. Fails if one already exists. Initializes sections from template. |
| `reports.autosave` | Deep-partial update of `sections` field. Debounced on client. |
| `reports.submit` | Sets status `submitted`, records timestamp, triggers notifications. |
| `reports.carryForwardTasks` | Copies Pending/Delayed tasks from last week's report into new draft. |
| `comments.add` | Adds comment to a section. Creates notification for dept head. |
| `comments.reply` | Adds reply. Creates notification for original commenter. |
| `comments.resolve` | Marks comment resolved (Core Team only). |
| `notifications.markRead` | Mark one or all notifications as read. |
| `users.upsertFromClerk` | Clerk webhook handler: create or update user in Convex. |
| `users.approve` | Admin approves a user. Sends `account_approved` notification. |
| `users.updateRole` | Admin changes user role(s). |
| `departments.create` | Creates new department. |
| `departments.archive` | Soft-deletes a department. |
| `templates.upsert` | Creates or updates a department template. |
| `announcements.create` | President/Admin creates org announcement. |

### Queries

| Function | Description |
|---|---|
| `reports.listAll` | Paginated list with dept + week filters (Core Team / President). |
| `reports.listByDepartment` | Dept Head's own dept reports. |
| `reports.getById` | Full report document. |
| `reports.getCurrentDraft` | Active draft for caller's dept this week. |
| `reports.getLastSubmitted` | Last submitted report for a dept (for carry-forward). |
| `reports.getMetricsHistory` | Last N weeks of metrics for a dept (analytics). |
| `reports.getOrgStatusThisWeek` | All depts + their current week status (President dashboard). |
| `comments.listByReport` | All comments, grouped by sectionKey. |
| `notifications.listForUser` | All notifs for caller, unread first. |
| `users.listPendingApproval` | Admin queue. |
| `users.listByDepartment` | Members in a dept (for autocomplete in tables). |
| `departments.listAll` | All active departments. |
| `templates.getByDepartment` | Template for a given dept. |
| `analytics.submissionRates` | Submission rate data per dept, last N weeks. |
| `analytics.taskCompletion` | Task status distribution per dept, last N weeks. |

---

## 9. UI Design System

### Brand Colors

| Token | Value | Use |
|---|---|---|
| `--brand` | `#1D9E75` | Primary: buttons, section numbers, links |
| `--brand-light` | `#E1F5EE` | Section number bg, analysis box bg, success toasts |
| `--brand-mid` | `#0F6E56` | Hover states, analysis box text |
| `--warn` | `#BA7517` | Moderate participation, Pending status |
| `--warn-light` | `#FAEEDA` | Warn badge backgrounds |
| `--danger` | `#A32D2D` | Low participation, Delayed status, overdue |
| `--danger-light` | `#FCEBEB` | Danger badge backgrounds |
| `--info` | `#185FA5` | Good participation, In Progress status |
| `--info-light` | `#E6F1FB` | Info badge backgrounds |
| `--purple` | `#534AB7` | Core Team actions, leadership UI |
| `--purple-light` | `#EEEDFE` | Purple badge backgrounds |
| `--success-text` | `#3B6D11` | Excellent/Completed badge text |
| `--success-bg` | `#EAF3DE` | Excellent/Completed badge background |

### Department Color Tags (default set, admin-editable)

| Department | Color |
|---|---|
| Outreach | `#1D9E75` (brand green) |
| Tech | `#185FA5` (blue) |
| Marketing | `#E05E1A` (orange) |
| Finance | `#3B6D11` (dark green) |
| Events | `#7C3AED` (violet) |
| Design | `#DB2777` (pink) |
| PR & Partnerships | `#0891B2` (cyan) |

### Typography
- Font: Inter (`next/font/google`)
- Base: 13px, line-height 1.6
- Uppercase labels: 10px, letter-spacing 0.08em, color tertiary
- Section titles: 13px, weight 500
- Report title: 18px, weight 500
- Metric values: 20px, weight 500
- Badge text: 10px, weight 500

### Spacing & Layout
- Section cards: `border-radius: 8px`, `border: 0.5px solid`
- Sections collapsible with chevron animation
- Tables: `font-size: 12px`, row hover highlight, 0.5px borders
- Mobile: single column, bottom-sticky submit button
- Max content width: 900px, centered

---

## 10. Access Control Matrix

| Action | Member | Dept Head | Core Team | President | Admin |
|---|---|---|---|---|---|
| View own dept reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all depts' reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create/edit own draft | ❌ | ✅ | ❌ | ❌ | ✅ |
| Submit own report | ❌ | ✅ | ❌ | ❌ | ✅ |
| Add comments on reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Reply to comments | ❌ | ✅ (own) | ✅ | ✅ | ✅ |
| Resolve comments | ❌ | ❌ | ✅ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export any report PDF | ❌ | ✅ (own) | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage departments | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit templates | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit submitted report | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create announcements | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve users | ❌ | ❌ | ❌ | ✅ | ✅ |

Enforced at both the component level (UI elements hidden) and Convex mutation level (`ctx.auth` + role check).

---

## 11. Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_WEBHOOK_SECRET=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
```

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Autosave latency | ≤ 2s after last keystroke |
| Report page load | ≤ 1s (Convex real-time subscriptions) |
| Dashboard load (all depts) | ≤ 2s |
| PDF export | ≤ 5s |
| Mobile usability | Full functionality at 375px viewport |
| Concurrent users | 50+ (Convex handles natively) |
| Data retention | Permanent — no reports ever deleted |
| Offline behavior | "You're offline" banner; autosave queued and retried on reconnect |
| Browser support | Chrome, Firefox, Safari, Edge (last 2 major versions) |

---

## 13. Out of Scope — v1

These are explicitly deferred. Note them to avoid scope creep during v1 build:

- **Email / WhatsApp notifications** — in-app only in v1. Email via Resend in v2.
- **File attachments** on reports (images, decks, docs)
- **Rich text editor** for textareas (markdown or WYSIWYG)
- **AI-assisted report filling** (smart summarization, metric suggestions)
- **Public report sharing** (password-protected link visible outside Clerk auth)
- **Mobile native app**
- **Calendar integration** (sync deadlines to Google Calendar)
- **Slack integration**
- **Report approval workflow** (Core Team formally approves a report before it's "final")
- **Custom roles** (beyond the 5 defined roles)

---

## 14. Development Phases

### Phase 1 — Foundation (Week 1–2)
- Clerk auth, webhook, Convex user sync
- Department and template seeding (all 7 departments, Outreach template fully configured, others basic)
- Convex schema live
- Protected layout, routing, role-aware navigation
- Onboarding flow + approval queue

### Phase 2 — Report Composer (Week 3–4)
- All 15 section components built
- Template-driven rendering (sections pulled from dept template)
- Autosave working end-to-end
- Submit flow + read-only viewer
- Carry-forward for tasks and goals

### Phase 3 — President & Core Team Views (Week 5)
- President dashboard with dept status card grid
- Report archive with filters
- Comments and feedback system
- In-app notifications

### Phase 4 — Analytics & Export (Week 6)
- Analytics dashboard (Overview + Dept Deep Dive tabs)
- PDF export
- Metrics trend indicators on metric cards

### Phase 5 — Admin & Polish (Week 7)
- Department management UI
- Template editor (toggle, reorder, label editing)
- User management and role editor
- Member directory
- Mobile responsiveness pass
- Performance audit

### Phase 6 — Hardening (Week 8)
- Edge case handling (duplicate drafts, orphaned users, missing templates)
- Full access control audit (every Convex mutation has auth check)
- Onboarding documentation for Department Heads
- Seed data for demo / President review

---

## 15. Success Metrics (4 Weeks Post-Launch)

| Metric | Target |
|---|---|
| Departments actively submitting | 100% (all active depts) |
| On-time submission rate (by Sunday) | ≥ 85% of weeks |
| Avg time to fill and submit a report | ≤ 15 minutes |
| WhatsApp used for weekly updates | 0 — fully replaced |
| President dashboard load: all depts visible | 100% of weeks |
| Leadership feedback comments per report | ≥ 1 per submitted report |
| Data completeness (sections filled) | ≥ 75% sections non-empty |
| Zero data loss incidents | 100% |

---

## Appendix A: Terminology

| Term | Meaning in this app |
|---|---|
| Report | A weekly submission by a single department |
| Draft | A report that has been started but not submitted |
| Template | The section and metric configuration for a department |
| Section | A discrete block within a report (e.g., Task Tracker, Metrics) |
| Week | Monday–Sunday calendar week, identified by `weekStart` date |
| Carry-forward | Importing data from a prior report into a new one |
| Core Team | E-Cell leadership tier above Department Heads |

## Appendix B: Seed Departments for v1

| Department | Slug | Head (placeholder) |
|---|---|---|
| Outreach | `outreach` | TBD |
| Tech | `tech` | TBD |
| Marketing | `marketing` | TBD |
| Finance | `finance` | TBD |
| Events | `events` | TBD |
| Design | `design` | TBD |
| PR & Partnerships | `pr` | TBD |

---

*This document is v2.0 of the E-Cell Weekly Report Platform PRD. It supersedes v1.0 (Outreach-only). All implementation decisions should reference this document. Update version and changelog when scope changes.*
