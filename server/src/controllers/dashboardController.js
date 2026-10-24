import Project from '../models/Project.js';
import Team from '../models/Team.js';
import JoinRequest from '../models/JoinRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decorateWithMembersCount } from './userController.js';

/**
 * GET /api/dashboard — one aggregated snapshot for the student home screen,
 * so the UI needs a single request for its whole overview.
 */
export const dashboard = asyncHandler(async (req, res) => {
  const me = req.user._id;

  const [myProjects, teams, pendingIncoming, pendingOutgoing] = await Promise.all([
    Project.find({ owner: me }).sort({ createdAt: -1 }).limit(6).populate('owner', 'name _id'),
    Team.find({ $or: [{ owner: me }, { 'members.user': me }] })
      .populate('project', 'status')
      .select('project'),
    JoinRequest.countDocuments({ status: 'pending', project: { $in: await myProjectIds(me) } }),
    JoinRequest.countDocuments({ status: 'pending', requester: me }),
  ]);

  const activeTeams = teams.filter((t) =>
    ['open', 'in-progress'].includes(t.project?.status)
  ).length;

  const recentProjects = await Project.find({ status: 'open', owner: { $ne: me } })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate('owner', 'name _id');

  res.json({
    data: {
      stats: {
        myProjects: await Project.countDocuments({ owner: me }),
        activeTeams,
        pendingIncoming,
        pendingOutgoing,
      },
      mySkills: req.user.skills,
      myProjects: await decorateWithMembersCount(myProjects),
      recentProjects: await decorateWithMembersCount(recentProjects),
    },
  });
});

async function myProjectIds(userId) {
  const projects = await Project.find({ owner: userId }).select('_id');
  return projects.map((p) => p._id);
}
