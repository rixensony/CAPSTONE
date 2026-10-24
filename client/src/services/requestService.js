import api from './apiClient.js';

export const requestService = {
  sendRequest({ projectId, message }) {
    return api.post('/requests', { projectId, message });
  },

  incomingRequests({ status } = {}) {
    return api.get('/requests/incoming', { params: status ? { status } : undefined });
  },

  myRequests() {
    return api.get('/requests/mine');
  },

  respondRequest(id, status) {
    return api.patch(`/requests/${id}`, { status });
  },

  cancelRequest(id) {
    return api.del(`/requests/${id}`);
  },
};

export default requestService;
