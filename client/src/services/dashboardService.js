import api from './apiClient.js';

export const dashboardService = {
  get() {
    return api.get('/dashboard');
  },
};

export default dashboardService;
