# E-Cell Weekly Reports

A focused internal operations platform for Woxsen University E-Cell. It replaces scattered WhatsApp updates, fragile spreadsheets, and memory-based follow-ups with structured weekly reports, role-aware dashboards, leadership feedback, analytics, and exportable records.

This is not a generic reporting app. It is built around how an E-Cell actually works: departments, department heads, core team reviews, weekly accountability, task carry-forward, and a permanent history of what happened.

## What This Solves

Most student organizations lose operational context every week:

- Updates are buried in group chats.
- Reports arrive in different formats.
- Tasks are forgotten between meetings.
- Leadership cannot compare departments quickly.
- New team members inherit no useful history.
- Excel sheets become stale or overwritten.

This app turns that weekly chaos into one repeatable workflow:

1. Department head opens the app.
2. A weekly draft is created for their department.
3. They fill structured sections and metrics.
4. The report autosaves while they work.
5. They submit once the week is ready.
6. Core team and leadership review, comment, and track progress.

## Product Snapshot

| Area | What it does |
| --- | --- |
| Landing page | Public entry point for sign in and onboarding |
| Onboarding | Captures name, phone, year, department, and requested role |
| Dashboard | Shows the right home view for department users or leadership |
| Report composer | Structured weekly report editor with autosave and submit flow |
| Report viewer | Clean read-only report view with comments and exports |
| Analytics | Organization-wide department and task visibility |
| Team directory | Searchable list of approved members and departments |
| Notifications | Report, comment, approval, and role-change updates |
| Admin | Manage users, departments, approvals, roles, and announcements |

## Core Features

### Structured Weekly Reports

Each report is tied to a department and week. Templates define the sections that appear in the report, including:

- Report header
- Team participation
- Task tracker
- Weekly goals
- Work completed
- Performance metrics
- Challenges
- Plans for next week
- Budget, campaign, event, or department-specific sections

### Autosave Drafts

The editor saves changes automatically while users type. A submitted report becomes read-only, preventing accidental edits to finalized records.

### Leadership Visibility

Core team, president, and admin users get a leadership dashboard that shows:

- Total departments
- Submitted reports
- Draft reports
- Departments that have not started
- Per-department weekly status

### Feedback and Comments

Leadership users can comment on specific report sections. Department heads can see feedback in context instead of chasing messages across DMs.

### Analytics

The analytics page summarizes:

- Total reports
- Submitted reports
- Department report counts
- Task completion distribution
- Department leaderboard

### Exports

Reports can be exported for offline sharing, archival, and review. The current implementation supports spreadsheet-style exports and polished PDF generation from the report viewer.

### Role Requests

Users can request role changes from Settings. Promotions require admin approval. Lower-access changes can apply immediately.

## Roles and Permissions

The platform uses role-based UI access and an approval workflow.

| Role | Intended user | Main access |
| --- | --- | --- |
| `member` | Regular department member | Dashboard, reports, team, notifications, settings |
| `department_head` | Department lead | Department reporting workflow and department report history |
| `core_team` | E-Cell core leadership | Leadership dashboard, analytics, report review, comments |
| `president` | E-Cell president | Leadership access plus admin area |
| `admin` | Technical or operations admin | Full admin area for users, roles, departments, and announcements |

Approval is separate from role. A signed-in but unapproved user sees a pending approval state until an admin or president approves them.

## Report Lifecycle

```text
Not Started
    |
    | New Report
    v
Draft
    |
    | Autosave while editing
    v
Draft Updated
    |
    | Submit
    v
Submitted
    |
    | Leadership review
    v
Comments / Follow-ups / Exports
```

Important behavior:

- `New Report` reuses an unfinished draft for the current week.
- `New Report` does not route users to an already submitted report.
- Submitted reports are preserved as historical records.
- Current-week dashboards prefer an active draft when one exists.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Auth | Clerk |
| Database and realtime backend | Convex |
| Charts | Recharts |
| Exports | `xlsx`, `xlsx-js-style`, `jspdf`, `jspdf-autotable` |
| Runtime and package manager | Bun |

## Project Structure

```text
app/
  page.tsx                         Public landing page
  providers.tsx                    Clerk and Convex providers
  globals.css                      Design tokens and global styles
  onboarding/page.tsx              First-run profile setup
  sign-in/                         Clerk sign-in route
  sign-up/                         Clerk sign-up route
  (app)/
    layout.tsx                     Authenticated app shell
    dashboard/page.tsx             Department and leadership dashboards
    reports/page.tsx               Report list and filters
    reports/new/page.tsx           Current-week report creation
    reports/[id]/page.tsx          Report viewer and exports
    reports/[id]/edit/page.tsx     Report editor
    analytics/page.tsx             Organization analytics
    notifications/page.tsx         User notifications
    team/page.tsx                  Team directory
    settings/page.tsx              Profile and role requests
    admin/
      page.tsx                     Department management
      users/page.tsx               User approval, roles, department assignment
      announcements/page.tsx       Announcement publishing

components/
  ecell-logo.tsx                   Shared logo component

convex/
  schema.ts                        Data model
  users.ts                         User, approval, role workflows
  departments.ts                   Department management
  templates.ts                     Report template seed/config
  reports.ts                       Report creation, autosave, submit, history
  comments.ts                      Section feedback threads
  notifications.ts                 User notifications
  announcements.ts                 Admin announcements
  http.ts                          Clerk webhook route
```

## Data Model

The core Convex tables are:

| Table | Purpose |
| --- | --- |
| `users` | Clerk-linked users, profile, department, roles, approval state |
| `departments` | Department names, slugs, colors, active state |
| `templates` | Per-department report section definitions |
| `reports` | Weekly report drafts and submissions |
| `comments` | Section-level report feedback and replies |
| `notifications` | Per-user activity and approval notifications |
| `announcements` | Admin-published internal announcements |

## Getting Started

### Prerequisites

- Bun
- Node.js compatible with Next.js 16
- Convex account/project
- Clerk application

### Install dependencies

```bash
bun install
```

### Configure environment

Create `.env.local` in the project root:

```bash
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CONVEX_SITE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
```

Do not commit `.env.local`.

### Start Convex

```bash
npx convex dev
```

This generates Convex bindings and keeps backend functions synced during development.

For a one-time sync:

```bash
npx convex dev --once
```

For generated types only:

```bash
npx convex codegen
```

### Start the web app

```bash
bun run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Next.js development server |
| `bun run build` | Build production app |
| `bun run start` | Start production server after build |
| `bun run lint` | Run ESLint |
| `npx convex dev` | Sync and run Convex functions in development |
| `npx convex codegen` | Regenerate Convex client/server types |

## Clerk Setup

The app uses Clerk for authentication and Convex for app data.

Recommended Clerk setup:

1. Create a Clerk application.
2. Enable email or Google sign-in.
3. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
4. Set `CLERK_SECRET_KEY`.
5. Configure the Clerk Convex JWT template or integration with audience `convex`.
6. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex to your Clerk issuer URL, for example `https://your-app.clerk.accounts.dev`.
7. Add the Convex webhook endpoint for Clerk user sync.

Convex webhook path:

```text
/clerk-webhook
```

## Convex Setup

The app expects Convex functions under `convex/`.

During development, keep this running:

```bash
npx convex dev
```

When schema or function names change, regenerate bindings:

```bash
npx convex codegen
```

## Admin Bootstrap

The first admin must be created or promoted through the data layer after signup. After that, admin users can approve accounts and manage roles through the app.

Typical bootstrap flow:

1. Sign up through the app.
2. Ensure the Clerk user exists in Convex.
3. Promote that user to `admin` or `president` in Convex.
4. Use `/admin/users` for future approvals and role changes.

## Development Notes

### Next.js Version

This project uses Next.js 16. The APIs and conventions may differ from older Next.js versions. Before changing app structure, routing, proxy, or data-fetching behavior, check:

```text
node_modules/next/dist/docs/
```

### Styling

The design system lives primarily in:

```text
app/globals.css
```

It defines:

- Brand colors
- Status colors
- Neutral colors
- Radius scale
- Shadow scale
- Animation utilities
- Shared card and glass utilities

### Generated Files

Convex generated files live in:

```text
convex/_generated/
```

Do not hand-edit generated files. Regenerate them with Convex commands.

## Deployment Checklist

Before deploying for real internal use:

- Use production Clerk keys.
- Use a production Convex deployment.
- Set all environment variables in the hosting provider.
- Verify Clerk webhook delivery.
- Confirm the first admin account is configured.
- Run `bun run build`.
- Run `bun run lint`.
- Test sign-up, onboarding, admin approval, report creation, submit flow, comments, exports, and role requests.

## Security Notes

This is an internal tool, but internal tools still need real permission checks.

Important hardening work:

- Enforce roles inside Convex functions, not only in the UI.
- Verify Clerk webhook signatures.
- Ensure report drafts are only readable/editable by allowed users.
- Ensure admin mutations can only be called by admin/president users.
- Add tests around approval, role changes, report access, and submission.

## Product Philosophy

The app should make accountability easier, not heavier.

The standard for every feature is simple:

- Faster than writing a WhatsApp update.
- Clearer than a spreadsheet.
- Useful to the next person who inherits the role.
- Structured enough for leadership, flexible enough for students.

## License

Private internal project for Woxsen University E-Cell.
