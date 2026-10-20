# waku

Personal project tracking at https://the-waku.vercel.app.

## Login

The platform uses one username: `wakuwaku`. There is no public registration screen
or email-link sign-in. The password is selected privately using a one-time setup
page. No password or setup token belongs in source control or deployment metadata.

A Supabase Edge Function (`waaku-account`) maps this username to the existing
owner's Auth user ID. It checks passwords through Supabase Auth and returns a
normal Supabase session. Password hashing remains in Supabase Auth. The server-only
service key is provided by the Edge Function runtime and never goes to the browser.
The app keeps the owner's existing ID, projects, tasks and assignments.

The private `waaku_account` table has RLS and no anonymous/authenticated table grants.
Database membership checks additionally require the configured account ID. Previous
email invitations no longer grant access to other accounts. After login, choose a display profile. Sarah and Wallace are included, and anyone
using the shared login can create more profiles. Profiles share the same access;
they are display identities, not separate password-protected accounts.

Password setup uses a 256-bit random token, stores only its SHA-256 digest server
side, expires after 24 hours, and claims it atomically before changing the password.
The fragment is removed from the address bar after loading. Setup never sends email.
If the setup link expires or a password is forgotten, the owner must issue a new
setup token through privileged project administration. Do not enable public reset
or account provisioning endpoints.

## Development and deployment

Requires Node.js 22+; Python 3 is used only for local preview.

```sh
npm ci
npm test
npm run build
npm run dev
```

Local `.env` supplies `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Only a public
`sb_publishable_` key is allowed in the browser build. Do not commit `.env` or service
keys. Vercel has these public build settings configured already.

Vercel project: `prj_XRoBW3UyqrSTi6b14DyoIRI4w8fy`.
Team: `team_gXWF4i8aN5sFbnnt4dohgVnY`.
Supabase project: `mpmtophybbezghllzdmz` (Singapore).

The old `workbench-lemon.vercel.app` domain has a permanent redirect to
`the-waku.vercel.app`. Keep that project-domain redirect configured in Vercel.
The production sign-in origin is `https://the-waku.vercel.app`; the Edge Function
also permits `http://127.0.0.1:4173` for development. Other origins are rejected.

The Supabase function source is in `supabase/functions/waaku-account/index.ts`.
Deploy it with gateway JWT verification disabled because the function performs its
own password/setup-token authentication. Its only actions are login and the
single-use setup flow. It does not provide a registration endpoint.

Initial SQL source is retained under `supabase/`; those migrations are already
applied. Do not rerun initial table-creation SQL against this project.

## Project status reports

Open a project → **Status report** → **Edit status report**. Record status, report
and go-live dates, summaries, delivery stages, testing counts, decisions, and notes.
Saving also updates the project's status and target date. Reports persist in the
existing shared workspace document; no additional reporting tables are needed.

**Download PDF** waits for the workspace save and downloads a landscape report.
Long tables/notes continue onto numbered pages. Testing execution is (pass + fail)
/ total, including blocked/remaining in total. Overall status is manually assessed.

## Saving and verification

Shared state uses atomic version checks. Conflicts cannot overwrite a newer save;
download the unsaved draft and manually reapply after reloading. Idle browsers check
for updates every 1.5 seconds, deferring refresh while a form or drawer is open.

The local test suite covers empty pages, project choices, report calculations,
long PDFs, save acknowledgement, conflict handling and in-flight edits. Live checks
confirm incorrect usernames and invalid setup tokens are rejected. Successful
password login still needs to be verified after the owner sets the password.


## Display profiles

After login (including a page reload), choose Sarah, Wallace, or **Create a profile**.
A new profile needs a unique name and can include a role/title. Profiles are stored
separately in `waaku_profiles`, so adding one does not overwrite project data.
Use **Switch profile** beside the connection status to choose another person without
logging out. Pending workspace changes must save before switching.

Task creation, comments, assignments, project leads and report updates use the
selected display profile. Existing Sarah assignments retain their original IDs.
Profiles do not create separate workspaces or permission boundaries. All people
with the shared login can choose any profile; activity names are coordination
labels, not verified personal identities.

## Connected project reporting

Project → Delivery records maintains test cases/results, milestones, decisions,
and architecture/environment notes in the existing versioned workspace JSON.
Status dashboards and PDFs derive next steps, blockers and task timeline entries
from the project's task list, plus delivery records when enabled. Legacy manual
test counts remain available until delivery records are first saved. Generating
a report draft opens a review form; it does not automatically approve readiness
or overwrite the saved summary. Report status remains a human assessment.

Before applying the SQL templates to a new Supabase project, replace the example owner and teammate email addresses with your own. Production environment files and deployment metadata are intentionally excluded from this repository.
