# SkillBridge — Wireframes

Rough layouts (guide section 2: "Paper or a free design tool is enough. Include mobile layout.").
Top bar navigation appears on every signed-in screen; on mobile it collapses into a hamburger menu.

## Route map

```
Public
  /                Landing (hero, features, CTA)      -> redirect to /dashboard if logged in
  /login           Login form
  /register        Register form

Student (protected)
  /dashboard       Overview: stats, my skills, my projects, recent projects
  /projects        Explore projects (search, skill/status filters, pagination)
  /projects/new    Create project idea form
  /projects/:id    Project details (join, owner tools, team, join requests)
  /projects/:id/edit  Edit own project (owner only)
  /students        Find teammates (search by skill)
  /students/:id    A student's profile
  /profile         My Profile (edit my details, skills, interests)
  /teams           My Teams (3 tabs: Teams / Requests sent / Requests received)

Admin (role=admin)
  /admin           Platform stats + Users & Projects management tables
```

## Landing page (`/`) — logged out

```
+--------------------------------------------------------------+
| SKILLBRIDGE                                  [Log in] [Sign up]|
+--------------------------------------------------------------+
|                                                              |
|        Find teammates for your next project —                |
|        by skill, not by chance.                              |
|                                                              |
|        [ Create free account ]   [ Explore projects ]        |
|                                                              |
+--------------------------------------------------------------+
|  How it works                                                |
|  1. Create your profile  →  2. Post ideas  →  3. Form teams  |
+--------------------------------------------------------------+
|  Feature cards (registration, ideas, search, teams, admin)   |
+--------------------------------------------------------------+
| footer: ICTAK MERN project • GitHub • docs                   |
+--------------------------------------------------------------+
```

Mobile (≤ 768px): everything stacks to one column; buttons go full-width.

## Login / Register

```
+-------------------------------------------+
|  SKILLBRIDGE                              |
|                                           |
|  [Card, centered, max-width 420px]        |
|    Welcome back                           |
|    Email    [__________]  label above     |
|    Password [__________]                  |
|    [        Log in           ] (disabled  |
|         while submitting)                 |
|    inline error text under fields         |
|    New here? Create an account            |
+-------------------------------------------+
```

Mobile: card becomes edge-to-edge with 16px padding.

## Dashboard (`/dashboard`)

```
+--------------------------------------------------------------+
| nav: logo | Dashboard | Projects | Students | Teams | (user)  |
+--------------------------------------------------------------+
| Hi, {name}. Here's what's happening.        [ + New project ]|
|                                                              |
| +---------+ +---------+ +---------+ +---------+              |
| |My       | |Active   | |Incoming | |Requests |  (4 stat  |
| |projects | |teams    | |requests | |sent     |   cards)  |
+--------------------------------------------------------------+
| My skills:  [React] [Node.js] [MongoDB]   (chips) → Edit      |
+--------------------------------------------------------------+
| My projects (3 cards)                        [ View all → ]  |
| +---------+ +---------+ +---------+                          |
| | Project | | Project | | + one   |                          |
| | card    | | card    | | more?   |                          |
+--------------------------------------------------------------+
| Recent projects from students (6 cards grid)                  |
+--------------------------------------------------------------+
```

Mobile: stat cards become a 2-column grid; project cards stack.

## Explore projects (`/projects`)

```
+--------------------------------------------------------------+
| Explore projects                              [ + New idea ]  |
| [Search by title…__________]                                 |
| Skill filter:  [All] [React] [Python] [Node.js] [UI/UX…]     |
| Status: [All | Open | In progress | Completed]                |
+--------------------------------------------------------------+
| project card grid (3 columns)                                 |
| +----------------+  each card:                                |
| | Title          |  badges: status • teamSize ⇒ seats         |
| | short desc…    |  skill chips, owner name, date             |
| | [ chips ]      |  [View details]                            |
+--------------------------------------------------------------+
|     [ ← Prev ]   Page 1 of 5   [ Next → ]                     |
+--------------------------------------------------------------+
| FOUR STATES: spinner while loading / grid on success /        |
| "No projects match your filters." empty state / retry alert   |
+--------------------------------------------------------------+
```

Mobile: filters scroll horizontally, cards single column.

## Project details (`/projects/:id`)

```
+--------------------------------------------------------------+
| ← Back to projects                                            |
| Title                                    [status badge]       |
| Posted by {owner} • date                                      |
| ------------------------------------------------------------- |
| Description (full text)                                       |
|                                                               |
| Required skills: [chips]                                      |
| Team: owner + {n}/{teamSize} seats filled                     |
|   • members list (avatar + name)                              |
| ------------------------------------------------------------- |
| Call-to-action area depends on who you are:                   |
|  - member/visitor: [Request to join]  (message box, optional) |
|  - pending:        [Cancel my request]                        |
|  - owner:          [Edit] [Delete] + Join requests panel      |
|                    (each row: requester, message,             |
|                     [Accept] [Reject])                        |
+--------------------------------------------------------------+
```

## Create / edit project (`/projects/new`, `/projects/:id/edit`)

```
+--------------------------------------------------------------+
| Share a project idea                                          |
| Title      [______________________]                           |
| Description[______________________]                           |
| Required skills (type + Enter to add a chip) [chip x] [chip x]|
| Teammates needed [ 2 ] (number 1–9)                           |
| Status           [ open ▾ ]   (only on edit)                  |
| [ Create project ] (disabled while saving)                    |
+--------------------------------------------------------------+
```

## Find teammates (`/students`, `/students/:id`)

```
+--------------------------------------------------------------+
| Find teammates                                                |
| [Search name…____]  Skill filter: [All][React][Python][Java…] |
+--------------------------------------------------------------+
| user card grid: avatar initials, name, department,            |
| skill chips, "their projects: n", [View profile]              |
+--------------------------------------------------------------+
| pagination                                                    |
+--------------------------------------------------------------+
| Profile page: avatar, name, department, bio, skill chips,     |
| interests, then "Their open projects" as project cards        |
+--------------------------------------------------------------+
```

## My teams (`/teams`)

```
+--------------------------------------------------------------+
| My teams                                                      |
| [ Teams ] [ Requests sent ] [ Requests received ]   <- tabs   |
+--------------------------------------------------------------+
| Teams tab — team cards:                                       |
| +-------------------+                                         |
| | Project title     |  [status badge]                         |
| | Owner: name       |  • members (avatar initials)            |
| | [Open project →]  |  seats filled                           |
+--------------------------------------------------------------+
| Requests sent — table: project, sent date, status badge,      |
|                     [Cancel] (pending only)                   |
| Requests received (owner) — rows: requester, project,         |
|                     message, [Accept] [Reject]                |
+--------------------------------------------------------------+
```

## My profile (`/profile`)

```
+--------------------------------------------------------------+
| My profile                                                    |
| avatar initials                                       [card]  |
| Name        [____________]                                    |
| Department  [____________]                                    |
| Bio         [____________]                                    |
| Skills      [chip chip chip] (type + Enter, click x to remove)|
| Interests   [chip chip]                                       |
| [Save changes] (disabled while saving)                        |
| + My projects (reuse project card row)                        |
+--------------------------------------------------------------+
```

## Admin panel (`/admin`)

```
+--------------------------------------------------------------+
| Admin panel                                        [role chip]|
| stat cards: Students | Admins | Projects | Open | Teams |     |
|             Pending requests | New signups (5 latest list)    |
+--------------------------------------------------------------+
| [ Users ] [ Projects ]                                        |
| Users: search box; table: user, email, role select,           |
|        project count, [Delete]                                |
|        (own row: role select + Delete disabled, tooltip       |
|         "You cannot change/delete your own account")          |
| Projects: table: title, owner, status, date, [Delete]         |
+--------------------------------------------------------------+
```
