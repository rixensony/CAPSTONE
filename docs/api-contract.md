# SkillBridge — API Contract

This document is the single source of truth for HTTP calls between the React client and the Express API.
The client must read the API base URL from `VITE_API_URL`; it never hard-codes endpoints.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `http://localhost:5000/api` in development (`VITE_API_URL` on the client, `PORT` on the server) |
| Content type | Requests and responses use `application/json` |
| Authentication | `Authorization: Bearer <JWT>` header, unless a route is marked **public** |
| Success envelope | `{"data": <payload>}` for single resources; `{"data": [<items>], "page": 1, "limit": 10, "total": 42, "pages": 5}` for paginated lists |
| Error envelope | `{"message": "Human readable message", "errors": [{"field": "…", "msg": "…"}]}` — `errors` appears only for validation failures |
| Pagination | `page` starts at 1, `limit` defaults to 9 (max 50) |
| Timestamps | All documents carry `createdAt` and `updatedAt` (Mongoose timestamps) |

## Status codes

| Code | Used for |
|---|---|
| 200 | Successful read, update, delete |
| 201 | Resource created (register, project, join request) |
| 400 | Missing/invalid input (validation failed) |
| 401 | Not logged in, expired or invalid token |
| 403 | Logged in but not allowed (ownership / role check failed) |
| 404 | Resource does not exist |
| 409 | Conflict (duplicate email, duplicate pending request, team full, last admin, self-action) |
| 500 | Unexpected server failure (safe generic message) |

## Roles

| Role | Allowed to |
|---|---|
| `student` | Own profile, own projects, join requests to other projects, team membership |
| `admin` | Everything a student can do plus: view all users, change roles (not own), delete any project, delete users, view platform stats |

## Endpoints

### Auth — `/api/auth`

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/auth/register` | Create account | JSON: `name`, `email`, `password`, `department`, optional `skills: string[]`, `interests: string[]`, `bio` | **201** `{ user, token }` | 400 invalid input, 409 email registered |
| `POST /api/auth/login` | Log in | JSON: `email`, `password` | **200** `{ user, token }` | 400 invalid input, 401 wrong credentials (generic message, no hint which field is wrong) |
| `GET /api/auth/me` | Current user | — | **200** `{ user }` | 401 not logged in |

`user` is always the safe shape: `_id, name, email, department, role, skills, interests, bio, createdAt, updatedAt`. Password hash is never returned.

### User profile & discovery — `/api/users`

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/users?search=&skill=&page=&limit=` | Find teammates (students only) | Auth. Query: free-text search on name; `skill` filters users who list it | **200** paginated list | 401 |
| `GET /api/users/:id` | Student profile + their projects | Auth | **200** `{ user, projects }` | 400 bad id, 404 not found |
| `PUT /api/users/me` | Update own profile | JSON: `name`, `department`, `bio`, `skills`, `interests` (all validated) | **200** `{ user }` | 400 invalid input, 401 |

A user **cannot** edit someone else's profile — only `/users/me` is mutable, and the owner is taken from the token, never from the URL.

### Projects — `/api/projects`

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/projects?search=&skill=&status=&sort=&page=&limit=` | Explore projects | Auth. Query: `search` on title/description, `skill`, `status` (`open|in-progress|completed|full`), `sort` (`newest\|oldest\|title`) | **200** paginated list (owner minimally populated) | 400 invalid filters, 401 |
| `POST /api/projects` | Share a project idea | JSON: `title` (5–100), `description` (20–2000), `requiredSkills` (1–10), `teamSize` (1–9), optional `status` | **201** project | 400 invalid input, 401 |
| `GET /api/projects/:id` | Project details | Auth | **200** `{ project, team, myRequest, isOwner }` — team member users populated; `myRequest` is the caller's own pending/sent request or `null` | 400 bad id, 404 |
| `PATCH /api/projects/:id` | Edit own project | JSON: any subset of `title`, `description`, `requiredSkills`, `teamSize`, `status` | **200** project | 400 invalid input, 401, 403 not owner (admins may edit), 404 |
| `DELETE /api/projects/:id` | Delete own project | — | **200** `{ message }` — cascades: team and join requests for the project are removed | 401, 403 not owner (admins may delete), 404 |

Ownership is always checked in the controller from `req.user.id` — never trusted from the request body.

### Join requests — `/api/requests`

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/requests` | Request to join a project | JSON: `projectId`, optional `message` (≤ 300 chars) | **201** request (project + requester populated) | 400 invalid input / own project / project not open, 404, **409** duplicate pending request / already a member / team has no free seats |
| `GET /api/requests/incoming?status=` | Requests received for **my** projects | Query: `pending\|accepted\|rejected` (default all mine) | **200** paginated list | 401 |
| `GET /api/requests/mine` | Requests **I** sent | — | **200** paginated list | 401 |
| `PATCH /api/requests/:id` | Accept or reject | JSON: `status: "accepted"\|"rejected"` | **200** updated request. On accept: requester added to the project's team; project auto-moves to `full` when seats are filled | 400 invalid status, 401, **403** not the project owner, 404, **409** team full / already a member |
| `DELETE /api/requests/:id` | Cancel my own pending request | — | **200** `{ message }` | 401, 403 not the requester, 404 |

Rules enforced server-side:
- You cannot request to join your own project.
- You cannot join a project you are already a member of.
- Only one pending request per (student, project).
- A request to a project whose seats are all filled (including pending ones) is a 409.
- Accepting a request can only be done by the project owner; a team cannot exceed `teamSize`.

### Teams — `/api/teams`

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/teams/mine` | Teams where I am owner or member | — | **200** `{ teams, invitations? }` (teams list with project + users populated) | 401 |
| `GET /api/teams/:id` | One team | Auth | **200** `{ team, project }` | 401, **403** not owner/member/admin, 404 |
| `DELETE /api/teams/:id/members/:memberId` | Remove a team member | — | **200** `{ team }` | 401, **403** project owner/admin only, 404, **409** that id is the owner |

Business rules:
- A team document is **auto-created** when a project is created — every project has exactly one team whose first (implicit) member is the owner.
- When a join request is accepted, the member is appended to `team.members`.
- Removing a member frees a seat but the project status is not automatically changed back — the owner can edit status via `PATCH /api/projects/:id`.

### Dashboard — `/api/dashboard`

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/dashboard` | Aggregated overview for the logged-in student | — | **200** `{ stats: { myProjects, activeTeams, pendingIncoming, pendingOutgoing }, mySkills, myProjects, recentProjects }` | 401 |

`recentProjects` = 6 newest `open` projects not owned by the caller (for the dashboard's "discover" strip).

### Admin — `/api/admin` (role `admin` required)

| Method + path | Purpose | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/admin/stats` | Platform statistics | — | **200** counts: users (total/students/admins), projects (total/each status), teams, pending requests, `latestUsers` (5 newest) | 401, 403 |
| `GET /api/admin/users?search=&page=&limit=` | List all users | Query: search on name/email | **200** paginated list | 401, 403 |
| `PATCH /api/admin/users/:id/role` | Promote / demote | JSON: `role: "student"\|"admin"` | **200** user | 400 invalid role, 401, 403, **409** cannot change your own role / cannot demote the last admin |
| `DELETE /api/admin/users/:id` | Delete a user | — | **200** `{ message }` — cascades: the user's projects (with teams + requests), memberships and join requests | 401, 403, **409** cannot delete yourself / cannot delete the last admin |
| `DELETE /api/admin/projects/:id` | Remove a project post | — | **200** `{ message }` (same cascade as owner delete) | 401, 403, 404 |

### Health — `/health` (not part of `/api`)

| Method + path | Purpose | Success |
|---|---|---|
| `GET /health` | Liveness probe for deployment monitoring | **200** `{ status: "ok", uptime }` |

## Validation rules (server-side, enforced again beyond the client)

| Field | Rule |
|---|---|
| `name` | Trimmed, 2–50 characters |
| `email` | Trimmed, lowercase, valid email format, unique |
| `password` | 8–64 characters, at least one letter and one number (registration only) |
| `department` | Trimmed, 2–60 characters |
| `skills` / `interests` | Arrays of trimmed strings, each ≤ 16 characters, max 10 items, no duplicates (case-insensitive) |
| `bio` | ≤ 500 characters |
| `title` | Trimmed, 5–100 characters |
| `description` | Trimmed, 20–2000 characters |
| `requiredSkills` | 1–10 items, same rules as skills |
| `teamSize` | Integer 1–9 (owner + teammates) |
| `status` | `open \| in-progress \| completed` (owner-managed), `full` is set automatically |
| `message` (join request) | ≤ 300 characters |
| URL params | MongoDB ids are validated so bad values return 400 instead of a cast error |
| Request bodies | Keys beginning with `$` or containing `.` are stripped before validation (NoSQL operator injection guard) |
