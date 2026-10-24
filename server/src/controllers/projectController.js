import Project from '../models/Project.js';
import Team from '../models/Team.js';
import JoinRequest from '../models/JoinRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, listMeta } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';
import { badRequest, forbidden, notFound } from '../utils/ApiError.js';
import { toOwnerRef } from '../utils/serialize.js';
import { decorateWithMembersCount } from './userController.js';

const PROJECT_STATUSES = ['open', 'in-progress', 'full', 'completed'];
const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
};

/**
 * GET /api/projects?search=&skill=&status=&sort=&page=&limit=
 * Explore Projects — server-side search, skill/status filters, sorting and
 * pagination with a capped page size.
 */
export const listProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = (req.query.search || '').toString().trim();
  const skill = (req.query.skill || '').toString().trim();
  const status = (req.query.status || '').toString().trim();
  const sortKey = (req.query.sort || 'newest').toString().trim();

  if (status && !PROJECT_STATUSES.includes(status)) {
    throw badRequest('Invalid status filter.', [
      { field: 'status', msg: 'Status must be open, in-progress, full or completed' },
    ]);
  }
  const sort = SORTS[sortKey];
  if (!sort) {
    throw badRequest('Invalid sort option.', [{ field: 'sort', msg: 'Sort must be newest, oldest or title' }]);
  }

  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }];
  }
  if (skill) {
    filter.requiredSkills = { $regex: escapeRegex(skill), $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate('owner', 'name _id')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Project.countDocuments(filter),
  ]);

  res.json(listMeta(await decorateWithMembersCount(projects), total, page, limit));
});

/**
 * POST /api/projects — creates the idea AND its team atomically-enough for
 * the MVP: if the team insert fails we roll the project back so we never
 * leave a project without its team.
 */
export const createProject = asyncHandler(async (req, res) => {
  const { title, description, requiredSkills, teamSize } = req.body;

  if (req.body.status !== undefined && req.body.status !== 'open') {
    throw badRequest('New projects always start as open.', [
      { field: 'status', msg: 'New projects always start as open' },
    ]);
  }

  const project = await Project.create({
    title,
    description,
    requiredSkills,
    teamSize,
    owner: req.user._id,
  });

  try {
    await Team.create({ project: project._id, owner: req.user._id, members: [] });
  } catch (error) {
    await Project.findByIdAndDelete(project._id);
    throw error;
  }

  const populated = await Project.findById(project._id).populate('owner', 'name _id');
  res.status(201).json({
    data: { ...(populated.toObject({ virtuals: true })), membersCount: 0 },
  });
});

/**
 * GET /api/projects/:id — details incl. team (members populated), the
 * caller's own most recent request for this project, and an isOwner flag
 * the UI may use for convenience (server checks remain authoritative).
 */
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('owner', 'name _id');
  if (!project) throw notFound('Project not found.');

  const team = await findOrCreateTeam(project);
  await team.populate({ path: 'members.user', select: 'name department skills _id' });

  const myRequest = await JoinRequest.findOne({ project: project._id, requester: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    data: {
      project: project.toObject({ virtuals: true }),
      team,
      myRequest: myRequest ? { _id: myRequest._id, status: myRequest.status, createdAt: myRequest.createdAt } : null,
      isOwner: project.owner._id.equals(req.user._id),
    },
  });
});

/**
 * PATCH /api/projects/:id — owner (or admin) may update a subset of fields.
 * `full` is system-managed (set when seats fill) and can't be set manually.
 */
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('owner', 'name _id');
  if (!project) throw notFound('Project not found.');

  assertCanManage(project, req.user);

  const editable = ['title', 'description', 'requiredSkills', 'teamSize'];
  for (const field of editable) {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  }
  if (req.body.status !== undefined) {
    const next = req.body.status;
    if (!['open', 'in-progress', 'completed'].includes(next)) {
      throw badRequest('Invalid status.', [
        { field: 'status', msg: 'Use open, in-progress or completed — “full” is set automatically' },
      ]);
    }
    project.status = next;
  }

  await project.save();
  await project.populate('owner', 'name _id');
  res.json({ data: project.toObject({ virtuals: true }) });
});

/**
 * DELETE /api/projects/:id — owner or admin. Cascades: the project's team
 * and all join requests aimed at it are removed as well.
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound('Project not found.');

  assertCanManage(project, req.user);

  await Promise.all([
    Team.findOneAndDelete({ project: project._id }),
    JoinRequest.deleteMany({ project: project._id }),
  ]);
  await project.deleteOne();

  res.json({ data: { message: 'Project deleted.' } });
});

export function assertCanManage(project, user) {
  const isOwner = project.owner && project.owner._id
    ? project.owner._id.equals(user._id)
    : project.owner.equals(user._id);
  if (!isOwner && user.role !== 'admin') {
    throw forbidden('Only the project owner can manage this project.');
  }
}

async function findOrCreateTeam(project) {
  const existing = await Team.findOne({ project: project._id });
  if (existing) return existing;
  // Defensive repair for any data created before the team insert existed.
  return Team.create({ project: project._id, owner: project.owner });
}
