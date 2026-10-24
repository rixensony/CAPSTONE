import User from '../models/User.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, listMeta } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';
import { notFound } from '../utils/ApiError.js';
import { toSafeUser, toSummaryUser } from '../utils/serialize.js';

/**
 * GET /api/users?search=&skill=&page=&limit=
 * Find Teammates — students only (admins are excluded from matchmaking),
 * searchable by name and by any skill chip (case-insensitive).
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = (req.query.search || '').toString().trim();
  const skill = (req.query.skill || '').toString().trim();

  const filter = { role: 'student' };
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: 'i' };
  }
  if (skill) {
    filter.skills = { $regex: escapeRegex(skill), $options: 'i' };
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json(
    listMeta(
      users.map((u) => toSummaryUser(u)),
      total,
      page,
      limit
    )
  );
});

/**
 * GET /api/users/:id — a student profile plus the project ideas they own.
 * Email is never included in profile lookups (only /auth/me and /users/me).
 */
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('Student not found.');

  const projects = await Project.find({ owner: user._id })
    .sort({ createdAt: -1 })
    .populate('owner', 'name _id');
  const decorated = await decorateWithMembersCount(projects);

  res.json({ data: { user: toSummaryUser(user), projects: decorated } });
});

/**
 * PUT /api/users/me — the ONLY mutable profile endpoint; the owner comes
 * from the token, so one student can never write another student's profile.
 */
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'department', 'bio', 'skills', 'interests'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  }
  await req.user.save();
  res.json({ data: { user: toSafeUser(req.user) } });
});

/**
 * Shared helper: attaches `membersCount` (joined teammates) to a list of
 * project documents with one query, so cards can show seats filled.
 */
export async function decorateWithMembersCount(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return [];
  const projectIds = projects.map((p) => p._id);
  const teams = await Team.find({ project: { $in: projectIds } }).select('project members');
  const counts = new Map(teams.map((t) => [String(t.project), t.members.length]));
  return projects.map((project) => ({
    ...project.toObject({ virtuals: true }),
    membersCount: counts.get(String(project._id)) ?? 0,
  }));
}
