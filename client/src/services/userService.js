import api from './apiClient.js';

export const userService = {
  listUsers(filters = {}) {
    return api.get('/users', { params: filters });
  },

  getUser(id) {
    return api.get(`/users/${id}`);
  },

  updateMe(payload) {
    return api.put('/users/me', payload);
  },
};

export default userService;
