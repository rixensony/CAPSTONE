import Project from '../models/Project.js';
import Team from '../models/Team.js';
import JoinRequest from '../models/JoinRequest.js';
import User from '../models/User.js';

/**
 * Deleting a project must also remove its team and every join request aimed
 * at it — a single helper keeps that rule in one place (used by the owner
 * delete route, the admin moderation route and the user cascade).
 */
export async function cascadeDeleteProjects(projectIds) {
  const ids = Array.isArray(projectIds) ? projectIds : [projectIds];
  if (ids.length === 0) return;
  await Promise.all([
    Team.deleteMany({ project: { $in: ids } }),
    JoinRequest.deleteMany({ project: { $in: ids } }),
  ]);
}

/** Deleting a project without query loops: remove the docs first, then their children. */
export async function deleteSingleProject(projectId) {
  await cascadeDeleteProjects(projectId);
  await Project.findByIdAndDelete(projectId);
}

/**
 * When an admin deletes a user account everything the user created is cleaned
 * up so no orphan documents remain (guide: database stays consistent).
 */
export async function deleteUserCascade(userId) {
  const ownedProjects = await Project.find({ owner: userId }).select('_id');
  await cascadeDeleteProjects(ownedProjects.map((p) => p._id));
  await Promise.all([
    Project.deleteMany({ owner: userId }),
    // remove the user from other owners' teams
    Team.updateMany({}, { $pull: { members: { user: userId } } }),
    JoinRequest.deleteMany({ requester: userId }),
  ]);
}
