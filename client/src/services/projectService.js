import api from './apiClient.js';

export const projectService = {
  listProjects(filters = {}) {
    return api.get('/projects', { params: filters });
  },

  getProject(id) {
    return api.get(`/projects/${id}`);
  },

  createProject(payload) {
    return api.post('/projects', payload);
  },

  updateProject(id, partial) {
    return api.patch(`/projects/${id}`, partial);
  },

  deleteProject(id) {
    return api.del(`/projects/${id}`);
  },
};

export default projectService;
