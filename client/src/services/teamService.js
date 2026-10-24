import api from './apiClient.js';

export const teamService = {
  myTeams() {
    return api.get('/teams/mine');
  },

  getTeam(id) {
    return api.get(`/teams/${id}`);
  },

  removeMember(teamId, userId) {
    return api.del(`/teams/${teamId}/members/${userId}`);
  },
};

export default teamService;
