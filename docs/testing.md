# SkillBridge — Testing records

> How SkillBridge is tested, what is covered, and the evidence collected for this submission.

## 1. Automated API tests

The whole REST surface is covered by a fast, dependency-free integration suite:

- Framework: Node's built-in `node:test` runner (no extra test framework needed)
- Database: `mongodb-memory-server` — an in-memory MongoDB, real-enough to test Mongoose
  indexes/unique constraints/partial filters, starts in ~150 ms, no local mongod needed

```bash
cd server
npm run test:api        # → 41 tests, green
```

Result on the submitted code:

```
# pass 41
# fail 0
# duration_ms ~1.7s
```

### What the 41 tests cover

| Area | Behaviour verified |
|---|---|
| Health | `GET /health` responds `ok` |
| Validation | register rejects short password / bad email / missing name; login rejects unknown email and wrong password; teamSize bounds (1–8); title/description minimum lengths; request message max length; chip arrays capped |
| NoSQL sanitisation | `{ $ne: null }` style injections rejected / neutralised on auth and search inputs |
| Auth security | register → 201 + token; logged-in `/auth/me`; protected routes 401 without/with bad token; admin endpoints 403 for students |
| Ownership | non-owner cannot PATCH/DELETE someone else's project (403); owner can; non-owner cannot accept requests; admin bypasses |
| Join flow | duplicate pending request → 409; sending to a `full` project rejected; owner sees request in `/requests/incoming`; accept appends member to team + sets membership; reject does not |
| Seats cascade | accepting the final free seat flips project to `full`; `full` cannot be set manually (400); freeing a seat (`DELETE /teams/:id/members/:memberId`) keeps status |
| Team access | `/teams/mine` shows teams where I own or was accepted; `/teams/:id` 403 for outsiders, 200 for owner/member/admin |
| Cancelling | sender can cancel a pending request (its status → cancelled); owner cannot cancel via the same endpoint |
| Cascade deletes | deleting a project removes its team and pending requests; deleting a user removes their teams/requests edges |
| Misc | unknown routes → 404 envelope; invalid MongoId → 400; unknown user id → 404 |

### How the suite isolates itself

- `tests/api.test.mjs` boots the app with `NODE_ENV=test`; the auth rate limiter is
  skipped in that mode so the suite behaves deterministically.
- The single file spins up one `MongoInstance`, `before()` connects, `after()` disconnects+stops.

## 2. Manual browser flows (evidence screenshots)

Run against the live stack: in-memory Mongo (`npm run dev:mongo`), API on :5000, Vite on :5173.
The final pass recorded **0 console/page errors** on all pages below.

| # | Flow | What was exercised | Screenshot |
|---|---|---|---|
| 01 | Landing page | marketing hero + CTA | `docs/screenshots/01-landing.png` |
| 02 | Login | real login form filled via browser automation | `docs/screenshots/02-login.png` |
| 03 | Registration | full form incl. skill/interest chips (max 10/16 chars enforced) | `docs/screenshots/03-register.png` |
| 04 | Dashboard | stats tiles, my skills, my projects (owner + seats), recent projects | `docs/screenshots/04-dashboard.png` |
| 05 | Explore projects | cards grid + filters enabled, seats math `filled = joined + owner` | `docs/screenshots/05-explore.png` |
| 06 | Project detail | title, owner, Open badge, description, skills, team list with Owner row, "Request to join" | `docs/screenshots/06-project-details.png` |
| 07 | Find teammates | search by name, skill filter chips, student cards | `docs/screenshots/07-find-teammates.png` |
| 08 | My teams | team cards with owner names + `{members+1} of {total} seats` | `docs/screenshots/08-my-teams.png` |
| 09 | Requests received | requester + project + message + pending/accepted rows, Accept/Reject buttons | `docs/screenshots/09-requests-received.png` |
| 10 | Edit profile | name/department/bio counters, skill & interest chip editors 4/10, 2/10 | `docs/screenshots/10-profile.png` |
| 11 | New project form | title, description w/ counter, teamSize, skills, status (full blocked) | `docs/screenshots/11-project-form.png` |
| 12 | Mobile dashboard | 390×844 viewport, hamburger menu, 2-up stat tiles | `docs/screenshots/12-dashboard-mobile.png` |
| 13 | Admin panel | stats tiles, latest signups, users table w/ role dropdown + delete, students tab | `docs/screenshots/13-admin.png` |

Session-level flows verified end-to-end by driving the real UI (puppeteer-core + Chrome —
code lives outside the repo, so it doesn't pollute the submission):

1. Register a fresh student → auto-login → dashboard greeting shows the new name.
2. Login → hard reload `/projects` → session rehydrates through `GET /auth/me` (no bounce to `/login`).
3. Open a project as a non-member → "Request to join" → pending banner appears.
4. Owner accepts from the received-requests table → member appears in `team.members`;
   when the last seat is filled the project badge flips to `full`.
5. Admin login → Admin nav item appears; role dropdown + stats populate.

## 3. Build & static checks

```bash
cd client && npm run build
# vite build → dist size 240.68 kB (gzip 71.77 kB), 0 errors
```

- `npm run build` runs `vite build` which fails on any unresolved import — caught and fixed
  the missing `Link`/`StatusBadge`/`SkillTag` imports in `ProjectCard.jsx` this way.
- ESLint (`npx eslint .`) available; repo has no lint violations at submission time
  (`no-undef` warnings about react JSX globals are false positives outside editor tooling).

## 4. API smoke (curl) transcript

```bash
$ curl -s http://localhost:5000/health
{"status":"ok","uptime":5.005640108}

$ curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"aditi@skillbridge.dev","password":"<seed-password>"}'
{"data":{"token":"eyJhbGciOiJIUzI1N...","user":{...}}}

$ curl -s http://localhost:5000/api/dashboard -H "Authorization: Bearer <token>"
{"data":{"stats":{"myProjects":1,"activeTeams":2,"pendingIncoming":1,"pendingOutgoing":0},'...'}}

$ curl -s "http://localhost:5000/api/projects?limit=3"
{"data":[...],"page":1,"limit":3,"total":5,"pages":2}
```

## 5. Known gaps (documented honesty)

- No unit tests for individual React components — UI verification is manual + build-based.
  Priority next step if extending: React Testing Library smoke tests for login/register.
- Load/peak behaviour is untested (rate limiters exist but without load-testing harness).
- File uploads (avatars) are out of scope for the MVP.
