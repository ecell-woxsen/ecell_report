# E-Cell Weekly Reports

Internal weekly reporting and operations platform for Woxsen University E-Cell.

The app replaces scattered WhatsApp updates, stale spreadsheets, and memory-based follow-ups with one structured workflow for department reports, leadership review, analytics, announcements, notifications, and exports.

## Product Overview

E-Cell Reports is built around the way a student E-Cell actually works:

- Department heads and team leads create one weekly report for their assigned department.
- Core team, president, vice president, advisor, and admin users can create or edit reports across departments when needed.
- Reports use department-specific templates with participation, task tracking, work completed, metrics, challenges, support needs, and next-week plans.
- Drafts autosave while report owners work, and supporting files can be attached with optional notes.
- Submitted reports become official weekly records, but authorized report managers can still make corrections after submission.
- Leadership can review organization-wide progress, leave section-level comments, and export reports for review or archival.

## Current Feature Map

| Area | Current behavior |
| --- | --- |
| Landing page | Public product entry with sign-in and sign-up links |
| Authentication | Clerk sign-in/sign-up with protected app routes |
| Onboarding | Captures name, phone, year of study, department, and requested role |
| Approval flow | New users remain pending until approved by an admin, president, vice president, or advisor |
| Dashboard | Department dashboard for members/heads, weekly status dashboard for leadership, and active announcements |
| Reports | Searchable report list with status filters, department filters, draft/submitted routing, and attachment counts |
| Report creation | `/reports/new` creates or reuses the current week's unfinished draft; leadership can pick any active department |
| Report editor | Template-driven editor with autosave, section progress, attachments, post-submit saving, and submit confirmation |
| Report viewer | Report view with comments, attachments, collapsible sections, Excel export, and PDF export |
| Analytics | Leadership-only charts for reports, departments, status distribution, task status, and department ranking |
| Team directory | Searchable directory of approved users and department assignments |
| Settings | Profile details, current roles, role-change requests, and pending request cancellation |
| Notifications | Report submission, comment, approval, pending-user, and role-request notifications |
| Admin | Department creation/archive, user approvals, role requests, role changes, department assignment, deactivation, and announcements |

## Roles

Roles are stored on Convex users and drive the navigation, dashboards, report access, and review tools.

| Role | Intended user | Main access |
| --- | --- | --- |
| `member` | Regular department member | Dashboard, submitted department reports, team, notifications, settings |
| `department_head` | Department lead | Create, edit, submit, and view reports for their assigned department |
| `team_lead` | Team lead | Same department report access as department heads |
| `core_team` | E-Cell core leadership | Leadership dashboard, analytics, all reports, cross-department report editing, and section comments |
| `president` | E-Cell president | Leadership access plus admin navigation and approval tools |
| `vice_president` | E-Cell vice president | Same access as president |
| `advisor` | E-Cell advisor | Same access as president |
| `admin` | Operations or technical admin | Admin navigation for users, roles, departments, approvals, and announcements |

Approval is separate from role. A signed-in but unapproved user sees a pending approval screen until an admin, president, vice president, or advisor approves the account.

Users can request role changes from Settings. Promotions are stored as pending requests until an admin, president, vice president, or advisor approves or rejects them; moving to a lower-access role updates immediately.

## Report Workflow

```text
Sign in
  |
  v
Onboarding and approval
  |
  v
Department head, team lead, or leadership user opens New Report
  |
  v
Assigned department or selected department draft is created or reused
  |
  v
Editor autosaves section data and attachments
  |
  v
Report manager submits
  |
  v
Submitted report becomes the official weekly record
  |
  v
Leadership reviews, comments, analyzes, exports, and authorized managers can make corrections
```

Important implementation details:

- The current week starts on Monday.
- `New Report` reuses an unfinished draft for the same department and week.
- `New Report` does not route a user to an already submitted report.
- Department members can only see submitted reports for their department.
- Department heads and team leads can manage reports only for their own department.
- Leadership users can view and manage reports across departments and leave section-level comments.
- Attachments are stored in Convex storage and are limited to 3 MB after browser-side compression.
- Excel and PDF exports include report data, leadership feedback, and attachment metadata.

## Default Departments

The app seeds these departments and refreshes old default department names:

| Department | Slug | Focus |
| --- | --- | --- |
| Outreach and Partnerships | `outreach` | Founder outreach, sponsorships, and partnerships |
| Tech | `tech` | Technical development and infrastructure |
| Marketing | `marketing` | Social media, campaigns, content |
| Finance | `finance` | Budget management, reimbursements |
| Events | `events` | Event planning and execution |
| Design | `design` | Visual design and creative assets |
| Documentation | `documentation` | Documentation, records, and public-facing updates |

Default report templates are generated per department and include shared sections plus department-specific metrics, work areas, performance review, budget tables, campaign/event tables, or lead tracking where relevant.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Auth | Clerk |
| Backend | Convex queries, mutations, HTTP actions, and storage |
| Charts | Recharts |
| Exports | `xlsx-js-style`, `xlsx`, `jspdf`, `jspdf-autotable` |
| Attachments | Browser image/gzip compression plus Convex file storage |
| Runtime/package manager | Bun |
| Language | TypeScript |

## Project Structure

```text
app/
  page.tsx                         Public landing page
  layout.tsx                       Root metadata and providers
  providers.tsx                    Clerk + Convex provider setup
  globals.css                      Design tokens, utilities, and global styles
  onboarding/page.tsx              First-run profile completion
  sign-in/                         Clerk sign-in route
  sign-up/                         Clerk sign-up route
  (app)/
    layout.tsx                     Authenticated app shell and sidebar
    dashboard/page.tsx             Department and leadership dashboards
    reports/page.tsx               Report list, filters, and entry points
    reports/new/page.tsx           Current-week draft creation
    reports/[id]/page.tsx          Report viewer, comments, attachments, Excel/PDF exports
    reports/[id]/edit/page.tsx     Autosaving report editor and attachment upload
    analytics/page.tsx             Leadership analytics
    notifications/page.tsx         User notifications
    team/page.tsx                  Team directory
    settings/page.tsx              Profile display and role requests
    admin/
      page.tsx                     Department management
      users/page.tsx               User approvals, role requests, roles, deactivation, and department assignment
      announcements/page.tsx       Announcement publishing

components/
  ecell-logo.tsx                   Shared logo component

convex/
  schema.ts                        Convex data model
  auth.config.ts                   Clerk JWT provider config for Convex auth
  http.ts                          Clerk webhook HTTP action
  permissions.ts                   Backend report/comment permission helpers
  users.ts                         User sync, approvals, roles, role requests
  departments.ts                   Department CRUD and seed data
  templates.ts                     Report template generation
  reports.ts                       Drafts, autosave, submit, attachments, history, metrics
  comments.ts                      Section feedback and replies
  notifications.ts                 Notification listing and read state
  announcements.ts                 Announcement publishing and listing

lib/
  attachments.ts                   Client-side attachment formatting and compression helpers
  departments.ts                   Department name/description normalization helpers
  permissions.ts                   Client-side role helpers

proxy.ts                           Next.js 16 Proxy route protection with Clerk
```

## Data Model

| Table | Purpose |
| --- | --- |
| `users` | Clerk-linked profile, department, roles, approval state, requested roles, and role-request timestamps |
| `departments` | Department metadata, colors, active state, and template links |
| `templates` | Ordered section definitions for each department report |
| `reports` | Weekly draft/submitted report records, section payloads, and attachment metadata |
| `comments` | Section-level leadership feedback, tags, replies, and resolved state |
| `notifications` | Per-user report, comment, approval, and admin notifications |
| `announcements` | Admin-published dashboard announcements |

## Environment Variables

Create `.env.local` in the project root for the Next.js app:

```bash
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Set this variable in Convex for Clerk JWT validation:

```bash
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-issuer-domain>
```

Notes:

- `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` are usually created or updated by `npx convex dev`.
- `NEXT_PUBLIC_SITE_URL` is used for metadata and should be the deployed site URL in production.
- `.env.local` is ignored by git and should not be committed.

## Local Development

Install dependencies:

```bash
bun install
```

Start Convex in one terminal:

```bash
npx convex dev
```

Start the Next.js app in another terminal:

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
| `bun run dev` | Start the Next.js development server |
| `bun run build` | Create a production build |
| `bun run start` | Start the production server after building |
| `bun run lint` | Run ESLint |
| `npx convex dev` | Run and sync Convex functions during development |
| `npx convex codegen` | Regenerate Convex client/server types |

## Clerk Setup

The app uses Clerk for identity and Convex for application data.

1. Create a Clerk application.
2. Enable the sign-in providers the E-Cell will use.
3. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`.
4. Configure a Clerk JWT template for Convex with audience/application ID `convex`.
5. Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex deployment to the Clerk issuer domain.
6. Add a Clerk webhook pointing to the Convex HTTP action:

```text
https://<your-convex-site>.convex.site/clerk-webhook
```

The webhook handler currently syncs `user.created` and `user.updated` events into the `users` table.

## Convex Setup

Keep Convex running while developing:

```bash
npx convex dev
```

Regenerate bindings after schema or function changes:

```bash
npx convex codegen
```

The app can seed departments and templates automatically from the onboarding or dashboard screens when the departments table is empty. To seed manually, run the Convex seed mutations from the Convex dashboard or CLI:

```bash
npx convex run departments:seed
npx convex run templates:seedTemplates
```

Generated Convex files live in `convex/_generated/`. Do not edit them by hand.

## Admin Bootstrap

The first admin has to be created outside the app after signup because all new accounts start unapproved.

Typical flow:

1. Sign up through the app.
2. Complete onboarding.
3. Find the user in the Convex `users` table.
4. Set `approved` to `true`.
5. Set `roles` to `["admin"]`, `["president"]`, `["vice_president"]`, or `["advisor"]`.
6. Use `/admin/users` for future approvals, role changes, and department assignments.

## Route Protection and Permissions

This app uses Next.js 16 `proxy.ts`, not the older `middleware.ts` convention. The Proxy file protects all non-public app routes with Clerk and redirects signed-in users away from auth routes.

Backend permission checks currently protect the report and comment workflow:

- Report managers must be approved department heads or team leads for their own department, or approved leadership users managing reports across departments.
- Leadership users can view all reports, create/edit reports across departments, access analytics, and comment on report sections.
- Admin-style users (`admin`, `president`, `vice_president`, and `advisor`) can access the admin navigation for user approvals, role requests, departments, and announcements.
- Non-leadership members only see submitted reports from their own department.

Before using this outside a trusted internal environment, harden the remaining admin-style Convex mutations with explicit backend role checks and verify Clerk webhook signatures.

## Development Notes

- This is a Next.js 16 project. Read the installed docs in `node_modules/next/dist/docs/` before changing routing, Proxy, app structure, or framework-specific APIs.
- Styling is centralized in `app/globals.css` with brand colors, status colors, radius/shadow scales, animations, skeletons, and shared card/glass utilities.
- The app uses the App Router only. There is no `pages/` directory.
- The report viewer creates Excel files in the browser with `xlsx-js-style` and PDFs with `jspdf` plus `jspdf-autotable`.
- The report editor compresses oversized image attachments to WebP or attempts gzip compression before upload; files must still be 3 MB or smaller once stored.
- There is no automated test suite in the repo yet.

## Deployment Checklist

Before production use:

- Use production Clerk keys.
- Use a production Convex deployment.
- Set all required environment variables in the hosting provider and Convex.
- Configure the Clerk Convex JWT template.
- Configure the Clerk webhook to the Convex `/clerk-webhook` HTTP action.
- Bootstrap the first admin, president, vice president, or advisor account.
- Run `bun run lint`.
- Run `bun run build`.
- Test sign-up, onboarding, pending approval, admin approval, role requests, department assignment, report creation, autosave, attachment upload/download/removal, submit, post-submit editing, comments, exports, notifications, announcements, and analytics.
- Add backend role checks to admin/department/announcement mutations before broader rollout.
- Add webhook signature verification before trusting webhook traffic in production.

## Product Standard

Every feature should make weekly accountability easier:

- Faster than writing a WhatsApp update.
- Clearer than maintaining a spreadsheet.
- Useful to the next person who inherits the role.
- Structured enough for leadership, flexible enough for student teams.

## License

Copyright (c) 2026 Shaik Imaduddin. All rights reserved.

Private internal project for Woxsen University E-Cell. No part of this project may be copied, modified, distributed, or used without permission from Shaik Imaduddin.
