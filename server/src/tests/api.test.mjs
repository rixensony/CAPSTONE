/**
 * SkillBridge API integration suite (MERN guide §8: test each endpoint with
 * valid input, invalid input, missing auth and the wrong role).
 *
 * Run: npm run test:api
 * The suite boots an in-memory MongoDB (mongodb-memory-server), starts the
 * real Express app on an ephemeral port and exercises the API over HTTP —
 * the same journey a React client takes in production.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/skillbridge-test';
process.env.JWT_SECRET = 'test-secret-not-used-in-prod';

import assert from 'node:assert/strict';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let app;
let server;
let baseUrl;
let mongod;

// Fixtures created in the setup block below.
const users = {};
const projects = {};
const teams = {};

/** Minimal HTTP helper returning {status, body} exactly as a real client sees them. */
async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  return { status: response.status, body: parsed };
}

const studentPayload = (suffix = 1, overrides = {}) => ({
  name: `Test Student ${suffix}`,
  email: `student${suffix}@skillbridge.test`,
  password: 'passw0rd123',
  department: 'Computer Science',
  skills: ['React', 'Node.js'],
  ...overrides,
});

async function registerUser(payload) {
  const { status, body } = await request('POST', '/api/auth/register', { body: payload });
  assert.equal(status, 201, `fixture register failed for ${payload.email}: ${JSON.stringify(body)}`);
  return { token: body.data.token, user: body.data.user };
}

const projectPayload = (suffix = 1, overrides = {}) => ({
  title: `Project idea number ${suffix} title`,
  description: 'A description that is comfortably longer than twenty characters.',
  requiredSkills: ['React'],
  teamSize: 2,
  ...overrides,
});

async function createProject(token, overrides = {}) {
  const { status, body } = await request('POST', '/api/projects', {
    token,
    body: projectPayload(undefined, overrides),
  });
  assert.equal(status, 201, `fixture project failed: ${JSON.stringify(body)}`);
  return body.data;
}

test('setup: boots in-memory MongoDB and the Express app', async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('skillbridge-test');

  // Dynamic imports AFTER env so config picks the memory URI.
  const { connectDB } = await import('../config/db.js');
  await connectDB(process.env.MONGODB_URI);

  const { createApp } = await import('../app.js');
  app = createApp();
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Fixture accounts: two students, one admin (role set directly + re-register).
  const studentA = await registerUser(studentPayload(1));
  const studentB = await registerUser(studentPayload(2));
  const otherDept = await registerUser(studentPayload(3, { email: 'student3@skillbridge.test', skills: ['Python'] }));
  users.studentA = studentA;
  users.studentB = studentB;
  users.pythonStudent = otherDept;
  const admin = await registerUser({ ...studentPayload(9), name: 'Test Admin', email: 'admin@skillbridge.test' });
  const User = (await import('../models/User.js')).default;
  await User.findByIdAndUpdate(admin.user._id, { role: 'admin' });
  users.admin = admin;

  // Fixture projects: A owns one open (teamSize 2); B owns one too.
  projects.a1 = await createProject(studentA.token, { title: 'Team build app with React and friends' });
  projects.b1 = await createProject(studentB.token, { title: 'Python data pipeline mentor hunt' });
  const Team = (await import('../models/Team.js')).default;
  teams.a1 = await Team.findOne({ project: projects.a1._id });
  teams.b1 = await Team.findOne({ project: projects.b1._id });
});

test('health endpoint reports ok', async () => {
  const { status, body } = await request('GET', '/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
});

// ---------- Registration & login ----------

test('register validates input (bad email, short name, weak password)', async () => {
  const cases = [
    { body: { ...studentPayload(50), email: 'not-an-email' }, field: 'email' },
    { body: { ...studentPayload(50), name: 'A' }, field: 'name' },
    { body: { ...studentPayload(50), password: 'short' }, field: 'password' },
    { body: { ...studentPayload(50), password: 'nodigits' }, field: 'password' },
    { body: { ...studentPayload(50), department: '' }, field: 'department' },
  ];
  for (const [i, testCase] of cases.entries()) {
    const { status, body } = await request('POST', '/api/auth/register', { body: testCase.body });
    assert.equal(status, 400, `case ${i} should be 400: ${JSON.stringify(body)}`);
    assert.ok(body.message, 'error envelope must carry a message');
    if (testCase.field) {
      assert.ok(
        (body.errors ?? []).some((e) => e.field === testCase.field),
        `case ${i} should flag ${testCase.field}`
      );
    }
  }
});

test('register strips NoSQL operators before validation ($ operator injection)', async () => {
  // Without the sanitizer this would reach Mongo as an operator query.
  const { status, body } = await request('POST', '/api/auth/register', {
    body: {
      name: { $gt: '' },
      email: { $gt: '' },
      password: { $gt: '' },
      department: 'CS',
    },
  });
  assert.equal(status, 400);
  assert.notEqual(body.message.toLowerCase().includes('mongo'), true);
});

test('register succeeds, hashes password and returns token', async () => {
  const { status, body } = await request('POST', '/api/auth/register', {
    body: studentPayload(4, { email: 'fresh@skillbridge.test', interests: ['Chess', 'Chess'] }),
  });
  assert.equal(status, 201);
  assert.ok(body.data.token.length > 20);
  assert.equal(body.data.user.email, 'fresh@skillbridge.test');
  assert.equal(body.data.user.password, undefined, 'password hash must never be returned');
  assert.deepEqual(body.data.user.interests, ['Chess'], 'duplicate chips are de-duplicated');
});

test('register rejects duplicate email with 409', async () => {
  const { status, body } = await request('POST', '/api/auth/register', {
    body: studentPayload(1), // student1@skillbridge.test already exists
  });
  assert.equal(status, 409);
  assert.match(body.message, /already exists/i);
});

test('login rejects wrong password with a generic 401 (no user enumeration)', async () => {
  const { status, body } = await request('POST', '/api/auth/login', {
    body: { email: 'student1@skillbridge.test', password: 'wrongPassword9' },
  });
  assert.equal(status, 401);
  assert.equal(body.message, 'Invalid email or password.');
});

test('login rejects unknown email with the same generic 401', async () => {
  const { status, body } = await request('POST', '/api/auth/login', {
    body: { email: 'ghost@skillbridge.test', password: 'whatever123' },
  });
  assert.equal(status, 401);
  assert.equal(body.message, 'Invalid email or password.');
});

test('login succeeds with valid credentials', async () => {
  const { status, body } = await request('POST', '/api/auth/login', {
    body: { email: 'student1@skillbridge.test', password: 'passw0rd123' },
  });
  assert.equal(status, 200);
  assert.equal(body.data.user.role, 'student');
  assert.ok(body.data.token);
});

// ---------- Auth guard ----------

test('protected endpoint without token is 401; with garbage token also 401', async () => {
  const none = await request('GET', '/api/auth/me');
  assert.equal(none.status, 401);

  const garbage = await request('GET', '/api/auth/me', { token: 'not.a.jwt' });
  assert.equal(garbage.status, 401);
});

test('GET /auth/me returns the fresh user for a valid token', async () => {
  const { status, body } = await request('GET', '/api/auth/me', { token: users.studentA.token });
  assert.equal(status, 200);
  assert.equal(body.data.user.email, 'student1@skillbridge.test');
});

// ---------- Projects CRUD ----------

test('project list requires auth', async () => {
  const { status } = await request('GET', '/api/projects');
  assert.equal(status, 401);
});

test('project creation validates title length, skills array and teamSize', async () => {
  const cases = [
    { overrides: { title: 'tiny' }, field: 'title' },
    { overrides: { description: 'short' }, field: 'description' },
    { overrides: { requiredSkills: [] }, field: 'requiredSkills' },
    { overrides: { teamSize: 0 }, field: 'teamSize' },
    { overrides: { teamSize: 12 }, field: 'teamSize' },
    { overrides: { status: 'full' }, field: 'status' },
  ];
  for (const [i, testCase] of cases.entries()) {
    const { status, body } = await request('POST', '/api/projects', {
      token: users.studentA.token,
      body: projectPayload(20 + i, testCase.overrides),
    });
    assert.equal(status, 400, `case ${i}: ${JSON.stringify(body)}`);
    assert.ok(
      (body.errors ?? []).some((e) => e.field === testCase.field),
      `case ${i} should flag ${testCase.field}`
    );
  }
});

test('creating a project auto-creates its team', async () => {
  const created = await createProject(users.studentA.token, { title: 'Fresh team demo project here' });
  const Team = (await import('../models/Team.js')).default;
  const team = await Team.findOne({ project: created._id });
  assert.ok(team, 'team must exist for every project');
  assert.equal(team.members?.length ? team.members.length : 0, 0, 'a team starts with zero teammates');
  assert.equal(created.membersCount, 0);
  assert.equal(created.owner.name, 'Test Student 1');
});

test('project list supports skill filter, search and pagination meta', async () => {
  // Seed a few more so pagination has >0 pages.
  await createProject(users.studentA.token, { requiredSkills: ['Python'], title: 'Python loves pagination rows' });
  await createProject(users.studentA.token, { requiredSkills: ['Java', 'Flutter'], title: 'Java pagination rows here' });

  const reactList = await request('GET', '/api/projects?skill=react', { token: users.studentA.token });
  assert.equal(reactList.status, 200);
  assert.ok(reactList.body.data.length >= 1);
  assert.ok(reactList.body.data.every((p) =>
    p.requiredSkills.some((s) => /react/i.test(s))
  ));

  const searched = await request('GET', '/api/projects?search=java&page=1&limit=5', {
    token: users.studentA.token,
  });
  assert.equal(searched.status, 200);
  assert.equal(searched.body.page, 1);
  assert.equal(searched.body.limit, 5);
  assert.ok(searched.body.total >= searched.body.data.length);
  assert.ok(searched.body.pages >= 1);
});

test('invalid list filters get 400, not a half-broken 200', async () => {
  const badStatus = await request('GET', '/api/projects?status=bogus', { token: users.studentA.token });
  assert.equal(badStatus.status, 400);

  const badSort = await request('GET', '/api/projects?sort=random', { token: users.studentA.token });
  assert.equal(badSort.status, 400);
});

test('only the owner (or an admin) can PATCH a project — others get 403', async () => {
  const wrongUser = await request('PATCH', `/api/projects/${projects.a1._id}`, {
    token: users.studentB.token,
    body: { title: 'Hijack attempt title that works' },
  });
  assert.equal(wrongUser.status, 403);

  const admin = await request('PATCH', `/api/projects/${projects.a1._id}`, {
    token: users.admin.token,
    body: { status: 'in-progress' },
  });
  assert.equal(admin.status, 200);
});

test('owner can PATCH project fields and invalid PATCH values get field errors', async () => {
  const ok = await request('PATCH', `/api/projects/${projects.a1._id}`, {
    token: users.studentA.token,
    body: { title: 'Edited title — now very fresh', status: 'open' },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.title, 'Edited title — now very fresh');

  const bad = await request('PATCH', `/api/projects/${projects.a1._id}`, {
    token: users.studentA.token,
    body: { teamSize: 11 },
  });
  assert.equal(bad.status, 400);
  assert.ok((bad.body.errors ?? []).some((e) => e.field === 'teamSize'));
});

test('bad id shape returns 400 (never a 500 cast crash)', async () => {
  const { status } = await request('GET', '/api/projects/0000', { token: users.studentA.token });
  assert.equal(status, 400, 'expect NOT a 500');
});

// ---------- Join requests & team lifecycle ----------

test('requesting to join your own project is rejected', async () => {
  const { status } = await request('POST', '/api/requests', {
    token: users.studentA.token,
    body: { projectId: projects.a1._id, message: 'self join' },
  });
  assert.equal(status, 400);
});

test('a second student can request to join once; duplicates are 409', async () => {
  const first = await request('POST', '/api/requests', {
    token: users.pythonStudent.token,
    body: { projectId: projects.a1._id, message: 'I love the stack' },
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.data.status, 'pending');

  const duplicate = await request('POST', '/api/requests', {
    token: users.pythonStudent.token,
    body: { projectId: projects.a1._id },
  });
  assert.equal(duplicate.status, 409);
});

test('owner lists incoming requests; others cannot respond to them', async () => {
  const incoming = await request('GET', '/api/requests/incoming', { token: users.studentA.token });
  assert.equal(incoming.status, 200);
  const row = incoming.body.data.find((r) => r.project._id === projects.a1._id);
  assert.ok(row, 'owner sees the pending request');
  users.pendingRequestId = row._id;

  const stranger = await request('PATCH', `/api/requests/${row._id}`, {
    token: users.studentB.token,
    body: { status: 'accepted' },
  });
  assert.equal(stranger.status, 403);
});

test('accepting adds the member to the team; owner sees them in project details', async () => {
  const accept = await request('PATCH', `/api/requests/${users.pendingRequestId}`, {
    token: users.studentA.token,
    body: { status: 'accepted' },
  });
  assert.equal(accept.status, 200);

  const details = await request('GET', `/api/projects/${projects.a1._id}`, {
    token: users.studentA.token,
  });
  assert.equal(details.status, 200);
  assert.equal(details.body.data.isOwner, true);
  assert.equal(details.body.data.team.members.length, 1);
  assert.equal(details.body.data.team.members[0].user.name.indexOf('Student 3') >= 0, true);
  assert.equal(details.body.data.project.status, 'open', 'teamSize 2 leaves one seat free');
});

test('requester with accepted request is a member — re-requesting is 409 even after reopening', async () => {
  // Reopen the project (accept→members set status 'open') to emulate owner re-tag.
  const reopen = await request('PATCH', `/api/projects/${projects.a1._id}`, {
    token: users.studentA.token,
    body: { status: 'open' },
  });
  assert.equal(reopen.status, 200);

  const { status } = await request('POST', '/api/requests', {
    token: users.pythonStudent.token,
    body: { projectId: projects.a1._id },
  });
  assert.equal(status, 409);
  assert.match((await request('POST', '/api/requests', { token: users.pythonStudent.token, body: { projectId: projects.a1._id } })).body.message, /already part/i);
});

test('seats are respected: filling teamSize flips the project to full, new requests get 409', async () => {
  // projects.b1 has teamSize 2 with zero members: accept one request to fill it partially first.
  const firstSeat = await request('POST', '/api/requests', {
    token: users.pythonStudent.token,
    body: { projectId: projects.b1._id, message: 'seat one' },
  });
  assert.equal(firstSeat.status, 201);

  const acceptFirst = await request('PATCH', `/api/requests/${firstSeat.body.data._id}`, {
    token: users.studentB.token,
    body: { status: 'accepted' },
  });
  assert.equal(acceptFirst.status, 200);

  // Second seat: another student requests; accepted → project becomes 'full'.
  const second = await registerUser(studentPayload(5, { email: 'student5@skillbridge.test' }));
  const secondRequest = await request('POST', '/api/requests', {
    token: second.token,
    body: { projectId: projects.b1._id },
  });
  assert.equal(secondRequest.status, 201);

  const acceptSecond = await request('PATCH', `/api/requests/${secondRequest.body.data._id}`, {
    token: users.studentB.token,
    body: { status: 'accepted' },
  });
  assert.equal(acceptSecond.status, 200);

  const details = await request('GET', `/api/projects/${projects.b1._id}`, { token: users.studentB.token });
  assert.equal(details.body.data.project.status, 'full', 'auto-transition to full');

  // A third student cannot even request: 0 seats left (team full AND status not open).
  const third = await registerUser(studentPayload(6, { email: 'student6@skillbridge.test' }));
  const requestFull = await request('POST', '/api/requests', {
    token: third.token,
    body: { projectId: projects.b1._id },
  });
  assert.equal(requestFull.status, 400, 'closed project rejects new requests');
});

test('requester cannot respond to their own request; owner can reject, requester can cancel', async () => {
  const third = await registerUser(studentPayload(7, { email: 'student7@skillbridge.test' }));
  const sent = await request('POST', '/api/requests', {
    token: third.token,
    body: { projectId: projects.a1._id, message: 'would love to join' },
  });
  assert.equal(sent.status, 201);

  const selfReject = await request('PATCH', `/api/requests/${sent.body.data._id}`, {
    token: third.token,
    body: { status: 'accepted' },
  });
  assert.equal(selfReject.status, 403, 'requester cannot accept their own request');

  const ownerRejectsInstead = await request('PATCH', `/api/requests/${sent.body.data._id}`, {
    token: users.studentA.token,
    body: { status: 'rejected' },
  });
  assert.equal(ownerRejectsInstead.status, 200);

  const reapply = await request('POST', '/api/requests', {
    token: third.token,
    body: { projectId: projects.a1._id },
  });
  assert.equal(reapply.status, 201, 'rejected requests allow re-application');

  const cancel = await request('DELETE', `/api/requests/${reapply.body.data._id}`, { token: third.token });
  assert.equal(cancel.status, 200);

  const ownerCannotCancelOthers = await request(
    'DELETE',
    `/api/requests/${(await request('GET', '/api/requests/mine', { token: third.token })).body.data[0]?._id ?? '000000000000000000000000'}`,
    { token: users.studentA.token }
  );
  assert.ok([403, 404].includes(ownerCannotCancelOthers.status));
});

// ---------- Teams ----------

test('team visibility: not-a-member is 403, member/owner sees it', async () => {
  // pythonStudent joined a1's team (accepted above); studentB never joined it.
  const stranger = await request('GET', `/api/teams/${teams.a1._id}`, { token: users.studentB.token });
  assert.equal(stranger.status, 403);

  const member = await request('GET', `/api/teams/${teams.a1._id}`, { token: users.pythonStudent.token });
  assert.equal(member.status, 200);
  assert.equal(String(member.body.data.project._id), String(projects.a1._id), 'project context is populated');
});

test('myTeams lists teams I own AND teams I joined', async () => {
  const mine = await request('GET', '/api/teams/mine', { token: users.studentA.token });
  assert.equal(mine.status, 200);
  const teamIds = mine.body.data.teams.map((t) => String(t.project._id ?? t.project));
  assert.ok(teamIds.includes(String(projects.a1._id)), 'owned team listed');
});

test('owner can remove a member from the team; owner itself cannot be removed', async () => {
  // pythonStudent is a member of b1's team.
  const remove = await request('DELETE', `/api/teams/${teams.b1._id}/members/${users.pythonStudent.user._id}`, {
    token: users.studentB.token,
  });
  assert.equal(remove.status, 200);
  const teamAfter = await request('GET', `/api/teams/${teams.b1._id}`, { token: users.studentB.token });
  assert.equal(teamAfter.body.data.team.members.length, 1); // second joined member remains

  const removeOwner = await request('DELETE', `/api/teams/${teams.b1._id}/members/${users.studentB.user._id}`, {
    token: users.studentB.token,
  });
  assert.equal(removeOwner.status, 409);
});

// ---------- Users & dashboard ----------

test('find teammates filters by skill and excludes other roles', async () => {
  const python = await request('GET', '/api/users?skill=python', { token: users.studentA.token });
  assert.equal(python.status, 200);
  assert.ok(python.body.data.length >= 1);
  assert.ok(python.body.data.every((u) => u.role === 'student'));
});

test('student profile lists their projects; email is never exposed publicly', async () => {
  const { status, body } = await request('GET', `/api/users/${users.studentA.user._id}`, {
    token: users.studentB.token,
  });
  assert.equal(status, 200);
  assert.equal(body.data.user.email, undefined);
  assert.ok(body.data.projects.length >= 1);
});

test('PUT /users/me updates only my profile and validates input', async () => {
  const bad = await request('PUT', '/api/users/me', {
    token: users.studentA.token,
    body: { name: 'A' },
  });
  assert.equal(bad.status, 400);

  const ok = await request('PUT', '/api/users/me', {
    token: users.studentA.token,
    body: { department: 'CSE (Data Systems)', skills: ['React', 'Node.js', 'MongoDB'], bio: 'Hello!' },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.user.department, 'CSE (Data Systems)');
});

test('dashboard aggregation returns stats, skills and project strips', async () => {
  const { status, body } = await request('GET', '/api/dashboard', { token: users.studentA.token });
  assert.equal(status, 200);
  assert.equal(typeof body.data.stats.myProjects, 'number');
  assert.equal(typeof body.data.stats.activeTeams, 'number');
  assert.ok(Array.isArray(body.data.mySkills));
  assert.ok(Array.isArray(body.data.recentProjects));
  assert.ok(body.data.myProjects.some((p) => String(p._id) === String(projects.a1._id)));
});

// ---------- Admin ----------

test('students cannot reach admin routes (403)', async () => {
  const { status } = await request('GET', '/api/admin/stats', { token: users.studentA.token });
  assert.equal(status, 403);
});

test('admin stats report platform counts', async () => {
  const { status, body } = await request('GET', '/api/admin/stats', { token: users.admin.token });
  assert.equal(status, 200);
  assert.ok(body.data.users.total >= 4);
  assert.equal(body.data.users.students, body.data.users.total - 1);
  assert.ok(body.data.teams >= 2);
});

test('admin can list users with search and project counts', async () => {
  const { status, body } = await request('GET', '/api/admin/users?search=student1', { token: users.admin.token });
  assert.equal(status, 200);
  assert.ok(body.data.length >= 1);
  assert.equal(typeof body.data[0].projectCount, 'number');
});

test('role change guards: own role change and last-admin demotion are 409', async () => {
  const self = await request('PATCH', `/api/admin/users/${users.admin.user._id}/role`, {
    token: users.admin.token,
    body: { role: 'student' },
  });
  assert.equal(self.status, 409);

  const promote = await request('PATCH', `/api/admin/users/${users.studentB.user._id}/role`, {
    token: users.admin.token,
    body: { role: 'admin' },
  });
  assert.equal(promote.status, 200);
  users.studentB.token_role = users.studentB.token;

  const demote = await request('PATCH', `/api/admin/users/${users.studentB.user._id}/role`, {
    token: users.admin.token,
    body: { role: 'student' },
  });
  assert.equal(demote.status, 200);
});

test('admin moderation: delete a project with cascade of team & requests', async () => {
  const doomed = await createProject(users.studentA.token, { title: 'Doomed project to be moderated' });
  const Team = (await import('../models/Team.js')).default;
  const JoinRequest = (await import('../models/JoinRequest.js')).default;
  const team = await Team.findOne({ project: doomed._id });
  await JoinRequest.create({ project: doomed._id, requester: users.studentB.user._id });

  const removed = await request('DELETE', `/api/admin/projects/${doomed._id}`, { token: users.admin.token });
  assert.equal(removed.status, 200);

  assert.equal(await Team.countDocuments({ project: doomed._id }), 0, 'team cascade-deleted');
  assert.equal(await JoinRequest.countDocuments({ project: doomed._id }), 0, 'requests cascade-deleted');

  const gone = await request('GET', `/api/projects/${doomed._id}`, { token: users.studentA.token });
  assert.equal(gone.status, 404);
});

test('admin cannot delete own account but can delete a student cascade-clean', async () => {
  const selfDelete = await request('DELETE', `/api/admin/users/${users.admin.user._id}`, {
    token: users.admin.token,
  });
  assert.equal(selfDelete.status, 409);

  // student3 owns NO project but has a team membership on a1 → removed there.
  const doomedUser = await registerUser(studentPayload(8, { email: 'student8@skillbridge.test' }));
  await request('POST', '/api/requests', {
    token: doomedUser.token,
    body: { projectId: projects.a1._id, message: 'temp member' },
  });
  // accept their request
  const incoming = await request('GET', '/api/requests/incoming', { token: users.studentA.token });
  const theirs = incoming.body.data.find((r) => r.project._id === projects.a1._id && r.requester._id === doomedUser.user._id);
  const accepted = await request('PATCH', `/api/requests/${theirs._id}`, {
    token: users.studentA.token,
    body: { status: 'accepted' },
  });
  assert.equal(accepted.status, 200);

  const Team = (await import('../models/Team.js')).default;
  const before = (await Team.findOne({ project: projects.a1._id })).members.length;
  const deleted = await request('DELETE', `/api/admin/users/${doomedUser.user._id}`, { token: users.admin.token });
  assert.equal(deleted.status, 200);

  const after = (await Team.findOne({ project: projects.a1._id })).members.length;
  assert.equal(after, before - 1, 'membership removed from other owners teams');
});

test('404 for unknown API routes uses the standard envelope', async () => {
  const { status, body } = await request('GET', '/api/definitely/missing');
  assert.equal(status, 404);
  assert.ok(body.message);
});

test('teardown: closes app, DB and memory server', async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongod.stop();
});
