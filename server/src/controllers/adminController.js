import User from '../models/User.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import JoinRequest from '../models/JoinRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, listMeta } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';
import { conflict, notFound, badRequest } from '../utils/ApiError.js';
import { toSummaryUser, toSafeUser } from '../utils/serialize.js';
import { deleteUserCascade, deleteSingleProject } from '../utils/cascade.js';

/**
 * GET /api/admin/stats — platform-wide numbers for the admin overview.
 */
export const adminStats = asyncHandler(async (req, res) => {
  const [users, students, admins, projects, openProjects, teams, pendingRequests, latestUsers] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      Project.countDocuments({}),
      Project.countDocuments({ status: 'open' }),
      Team.countDocuments({}),
      JoinRequest.countDocuments({ status: 'pending' }),
      User.find({}).sort({ createdAt: -1 }).limit(5),
    ]);

  const statusCounts = { open: 0, 'in-progress': 0, full: 0, completed: 0 };
  const byStatus = await Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  for (const row of byStatus) {
    if (row._id in statusCounts) statusCounts[row._id] = row.count;
  }

  res.json({
    data: {
      users: { total: users, students, admins },
      projects: { total: projects, ...statusCounts },
      teams,
      pendingRequests,
      latestUsers: latestUsers.map((u) => toSummaryUser(u)),
    },
  });
});

/**
 * GET /api/admin/users?search=&page=&limit= — every account including admins,
 * searchable by name or email, with each user's project count attached.
 */
export const adminListUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20);
  const search = (req.query.search || '').toString().trim();

  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const projectCounts = await Project.aggregate([
    { $group: { _id: '$owner', count: { $sum: 1 } } },
  ]);
  const counts = new Map(projectCounts.map((row) => [String(row._id), row.count]));

  res.json(
    listMeta(
      users.map((u) => ({ ...toSafeUser(u), projectCount: counts.get(String(u._id)) ?? 0 })),
      total,
      page,
      limit
    )
  );
});

/**
 * PATCH /api/admin/users/:id/role { role } — promote/demote.
 * Guardrails: you cannot change your own role, and the system always keeps
 * at least one administrator.
 */
export const adminSetRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['student', 'admin'].includes(role)) {
    throw badRequest('Invalid role.', [{ field: 'role', msg: 'Role must be student or admin' }]);
  }

  const target = await User.findById(req.params.id);
  if (!target) throw notFound('User not found.');

  if (target._id.equals(req.user._id)) {
    throw conflict('You cannot change your own role.');
  }

  if (target.role === 'admin' && role === 'student') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      throw conflict('You cannot demote the last administrator.');
    }
  }

  target.role = role;
  await target.save();
  res.json({ data: toSafeUser(target) });
});

/**
 * DELETE /api/admin/users/:id — account removal with full cascade cleanup
 * of the user's projects, teams, memberships and join requests.
 */
export const adminDeleteUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw notFound('User not found.');

  if (target._id.equals(req.user._id)) {
    throw conflict('You cannot delete your own account.');
  }
  if (target.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      throw conflict('You cannot delete the last administrator.');
    }
  }

  await deleteUserCascade(target._id);

  res.json({ data: { message: `Account for ${target.name} deleted.` } });
});

/**
 * DELETE /api/admin/projects/:id — moderation: delete ANY project; cascades
 * exactly like the owner-delete path.
 */
export const adminDeleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound('Project not found.');

  await deleteSingleProject(project._id);
  res.json({ data: { message: 'Project deleted.' } });
});
