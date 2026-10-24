import Team from '../models/Team.js';
import Project from '../models/Project.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { conflict, forbidden, notFound } from '../utils/ApiError.js';

/**
 * GET /api/teams/mine — teams where I am the owner OR a joined member,
 * with the project context populated enough for the My Teams page.
 */
export const myTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
  })
    .populate({
      path: 'project',
      select: 'title status teamSize _id owner',
      populate: { path: 'owner', select: 'name _id' },
    })
    .populate({ path: 'members.user', select: 'name department _id' })
    .sort({ createdAt: -1 });

  res.json({ data: { teams } });
});

/**
 * GET /api/teams/:id — visible to the owner, joined members and admins.
 * Returns both the team and its project (populated members).
 */
export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate({ path: 'project', populate: { path: 'owner', select: 'name _id' } })
    .populate({ path: 'members.user', select: 'name department skills _id' })
    .populate({ path: 'owner', select: 'name _id' });

  if (!team) throw notFound('Team not found.');

  const isOwner = team.owner._id.equals(req.user._id);
  const isMember = team.hasMember(req.user._id);
  if (!isOwner && !isMember && req.user.role !== 'admin') {
    throw forbidden('Only team members can view this team.');
  }

  res.json({ data: { team, project: team.project } });
});

/**
 * DELETE /api/teams/:id/members/:memberId — project owner (or admin) removes
 * a member. Frees a seat; the owner may re-open the project status via
 * PATCH /api/projects/:id (deliberately not automatic).
 */
export const removeMember = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw notFound('Team not found.');

  const project = await Project.findById(team.project);
  const isOwner = project && project.owner.equals(req.user._id);
  const isCoOwner = team.owner && team.owner.equals(req.user._id);
  if (!isOwner && !isCoOwner && req.user.role !== 'admin') {
    throw forbidden('Only the project owner can manage team membership.');
  }

  const { memberId } = req.params;
  const target = (project?.owner ?? team.owner).equals(memberId);
  if (target) {
    throw conflict('The project owner cannot be removed from their own team.');
  }

  const position = team.members.findIndex((m) => String(m.user) === String(memberId));
  if (position === -1) {
    throw notFound('That user is not a member of this team.');
  }

  team.members.splice(position, 1);
  await team.save();

  res.json({ data: { team } });
});
