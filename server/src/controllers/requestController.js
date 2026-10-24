import Project from '../models/Project.js';
import Team from '../models/Team.js';
import JoinRequest from '../models/JoinRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, listMeta } from '../utils/pagination.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/ApiError.js';

const REQUEST_POPULATE = [
  { path: 'requester', select: 'name department skills _id' },
  { path: 'project', select: 'title status teamSize owner _id' },
];

async function findProjectTeam(projectId) {
  const team = await Team.findOne({ project: projectId });
  if (!team) return Team.create({ project: projectId, owner: (await Project.findById(projectId))?.owner });
  return team;
}

/**
 * POST /api/requests { projectId, message? }
 * The whole join flow's rules live here (and only here):
 * own project → 400, closed project → 400, already member → 409,
 * duplicate pending → 409, no seats (incl. pending) → 409.
 */
export const sendRequest = asyncHandler(async (req, res) => {
  const { projectId } = req.body;
  const message = (req.body.message ?? '').toString().trim();

  const project = await Project.findById(projectId);
  if (!project) throw notFound('Project not found.');

  if (project.owner.equals(req.user._id)) {
    throw badRequest('You cannot request to join your own project.');
  }
  if (project.status !== 'open') {
    throw badRequest('This project is not accepting join requests right now.');
  }

  const team = await findProjectTeam(project);
  if (team.hasMember(req.user._id)) {
    throw conflict('You are already part of this project team.');
  }

  const existingPending = await JoinRequest.findOne({
    project: project._id,
    requester: req.user._id,
    status: 'pending',
  });
  if (existingPending) {
    throw conflict('You already have a pending request for this project.');
  }

  // Seats are counted conservatively: accepted members + other pending requests.
  const pendingCount = await JoinRequest.countDocuments({
    project: project._id,
    status: 'pending',
    requester: { $ne: req.user._id },
  });
  if (team.members.length + pendingCount >= project.teamSize) {
    throw conflict('This team has no free seats left.');
  }

  const request = await JoinRequest.create({
    project: project._id,
    requester: req.user._id,
    message,
  });
  await request.populate(REQUEST_POPULATE);

  res.status(201).json({ data: request });
});

/**
 * GET /api/requests/incoming?status= — requests aimed at MY projects (owner view).
 */
export const incomingRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20);
  const status = (req.query.status || '').toString().trim();
  const filter = { requester: { $ne: req.user._id } };

  const myProjects = await Project.find({ owner: req.user._id }).select('_id');
  filter.project = { $in: myProjects.map((p) => p._id) };
  if (status) {
    assertStatusFilter(status);
    filter.status = status;
  }

  const [requests, total] = await Promise.all([
    JoinRequest.find(filter).populate(REQUEST_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
    JoinRequest.countDocuments(filter),
  ]);

  res.json(listMeta(requests, total, page, limit));
});

/** GET /api/requests/mine — requests I have sent, newest first. */
export const myRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20);
  const filter = { requester: req.user._id };

  const [requests, total] = await Promise.all([
    JoinRequest.find(filter).populate(REQUEST_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
    JoinRequest.countDocuments(filter),
  ]);

  res.json(listMeta(requests, total, page, limit));
});

/**
 * PATCH /api/requests/:id { status: accepted|rejected } — project owner only.
 * Accepting appends the requester to the team and flips the project to
 * `full` automatically when the seats (teamSize) are exhausted.
 */
export const respondToRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    throw badRequest('Invalid status.', [{ field: 'status', msg: 'Status must be accepted or rejected' }]);
  }

  const request = await JoinRequest.findById(req.params.id);
  if (!request) throw notFound('Join request not found.');

  const project = await Project.findById(request.project);
  if (!project) throw notFound('The project for this request no longer exists.');

  if (!project.owner.equals(req.user._id)) {
    throw forbidden('Only the project owner can respond to join requests.');
  }

  if (status === 'accepted') {
    if (request.status === 'accepted') {
      throw conflict('This request was already accepted.');
    }

    const team = await findProjectTeam(project);
    if (team.hasMember(request.requester)) {
      throw conflict('This student is already a member of the team.');
    }
    if (team.members.length >= project.teamSize) {
      throw conflict('The team is already full.');
    }

    team.members.push({ user: request.requester });
    await team.save();

    if (team.members.length >= project.teamSize && project.status !== 'completed') {
      project.status = 'full';
      await project.save();
    }
  }

  request.status = status;
  await request.save();
  await request.populate(REQUEST_POPULATE);

  res.json({ data: request });
});

/**
 * DELETE /api/requests/:id — the requester cancels their own PENDING request.
 */
export const cancelRequest = asyncHandler(async (req, res) => {
  const request = await JoinRequest.findById(req.params.id);
  if (!request) throw notFound('Join request not found.');

  if (!request.requester.equals(req.user._id)) {
    throw forbidden('You can only cancel your own request.');
  }
  if (request.status !== 'pending') {
    throw badRequest('Only pending requests can be cancelled.');
  }

  await request.deleteOne();
  res.json({ data: { message: 'Request cancelled.' } });
});

function assertStatusFilter(status) {
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    throw badRequest('Invalid status filter.', [
      { field: 'status', msg: 'Status must be pending, accepted or rejected' },
    ]);
  }
}
