# waku

A shared project workspace for tasks, delivery tracking, and supervisor-ready status reports.

**Live app:** [the-waku.vercel.app](https://the-waku.vercel.app/)

## Features

- Projects, task lists, boards, assignments, deadlines, and blockers.
- A shared username/password login with selectable display profiles.
- Project delivery records for milestones, test cases, decisions, and environment notes.
- Status dashboards linked to project tasks and delivery records.
- Generated report drafts for review and landscape PDF exports.
- Day and night modes with a saved browser preference.
- Shared database persistence with version checks to prevent conflicting saves.

## Stack

Vanilla JavaScript and CSS, esbuild, Supabase Auth/Postgres/Edge Functions, jsPDF, and Vercel static hosting. Python serves the local preview only.

## Local setup

Requirements: **Node.js 22+**, npm, Python 3, and a configured Supabase project.

```sh
git clone https://github.com/sarahshahrir/waku.git
cd waku
npm ci
cp .env.example .env
```

Edit `.env` with your Supabase project settings:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Use a **publishable** key. Environment files are ignored; `.env.example` is safe to commit. Secret/service-role keys belong only on the server.

```sh
npm test
npm run build
npm run dev
```

Open [127.0.0.1:4173](http://127.0.0.1:4173). This is a static preview: rebuild and refresh after changing source files. Authentication needs the configured Supabase backend.

## Backend setup

The `supabase/` directory contains SQL templates and the `waaku-account` Edge Function. The legacy `waaku` identifiers are internal names retained for compatibility; the platform is named **waku**.

For a **new** Supabase project:

1. Review `schema.sql`, `invitations.sql`, `single-account.sql`, and `profiles.sql` in that order. Replace example email addresses before applying them.
2. Provision the owner in Supabase Auth and ensure its membership/account mapping is populated. The account SQL looks up the owner's existing Auth user; it does not create one.
3. Deploy `supabase/functions/waaku-account/index.ts` as `waaku-account`, with gateway JWT verification disabled. The function performs its own login and one-time setup-token checks.
4. Update the function's allowed origins for your deployment. The current source permits production and `http://127.0.0.1:4173`.
5. Issue a private, expiring, single-use password setup token through privileged administration. Only its SHA-256 hash belongs in the database; never commit the token or password.

These initial SQL templates have already been applied to the live workspace. **Do not rerun table-creation scripts on the existing production database.** Review and apply incremental changes separately.

The shared username is `wakuwaku`. Password verification and hashing use Supabase Auth. There is no public registration or public password-reset endpoint. Display profiles share workspace access; they are not separate authentication accounts.

## Using connected reports

1. Create a project and maintain its tasks, deadlines, and blocked reasons.
2. Open **Project → Delivery records** to maintain milestones, test results, decisions, and architecture/environment details. Click **Save delivery records**.
3. Open **Status report**. Its timeline and next steps use project tasks; testing, decisions, and notes use delivery records once enabled.
4. Select **Generate report draft**, review the summary, dates, and overall status, then save.
5. Select **Download PDF** to export the connected report after pending changes save.

Legacy manual testing counts remain in saved project data, but saving delivery records switches the dashboard to test-case results. Testing execution is `(passed + failed) / total`; blocked and remaining cases count toward the total. Readiness and sign-off require human assessment. A saved executive summary is a reviewed snapshot; regenerate it when you want a new draft.

Use the bottom sidebar to access **Settings**, **Profile**, **Switch profile**, and **Sign out**. Theme settings are also available under **Settings → Appearance**.

## Deployment

Import this repository into Vercel and configure these build environment variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

`vercel.json` sets the build command to `npm run build`, output to `dist`, and security headers. Deploy the Supabase Edge Function separately; Vercel does not deploy it. When using a different hostname, review the legacy hostname redirect and update allowed auth origins.

## Project structure

```text
src/
  index.html          Interface, styles, and app behavior
  backend.mjs         Authentication, profile selection, database integration
  profiles.mjs        Profile picker and creation validation
  sync.mjs            Versioned workspace synchronization
  project-report.mjs  Delivery records, report derivation, drafts, PDF export
scripts/build.mjs     Static production build
supabase/             Database SQL and authentication Edge Function
tests/                Interface, profile, reporting, and sync tests
vercel.json           Hosting configuration and response headers
```

## Verification and saving

Run `npm test` for interface rendering, profile validation, linked reporting calculations, PDF pagination, and synchronization checks. Run `npm run build` to verify script syntax and produce deployment assets.

A conflicting database version stops the save rather than overwriting newer changes. If prompted, download the unsaved draft and reconcile it with the latest workspace. Local drafts, generated exports, credentials, and deployment metadata are excluded by `.gitignore`.

## License

See [LICENSE](LICENSE).
