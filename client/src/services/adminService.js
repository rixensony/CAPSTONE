import api from './apiClient.js';

export const adminService = {
  stats() {
    return api.get('/admin/stats');
  },

  listUsers(filters = {}) {
    return api.get('/admin/users', { params: filters });
  },

  setRole(id, role) {
    return api.patch(`/admin/users/${id}/role`, { role });
  },

  deleteUser(id) {
    return api.del(`/admin/users/${id}`);
  },

  deleteProject(id) {
    return api.del(`/admin/projects/${id}`);
  },
};

export default adminService;
