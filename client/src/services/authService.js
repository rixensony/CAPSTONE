import api from './apiClient.js';

export const authService = {
  register(payload) {
    return api.post('/auth/register', payload, { auth: false });
  },

  login(email, password) {
    return api.post('/auth/login', { email, password }, { auth: false });
  },

  me() {
    return api.get('/auth/me');
  },
};

export default authService;
