import { apiClient } from './apiClient';

export const NotificationsService = {
  async list() {
    return apiClient.get('/api/notifications');
  },

  async markRead(id: string) {
    return apiClient.post(`/api/notifications/${id}/read`);
  },

  async clearAll() {
    return apiClient.post('/api/notifications/clear');
  }
};

export default NotificationsService;
