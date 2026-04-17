import { defineStore } from 'pinia';
import api from '../services/api';
import { getToken } from '../utils/authToken';

export type NotificationItem = {
  id: number;
  type: 'reply' | 'mention' | 'favorite' | 'system';
  title: string;
  body?: string | null;
  is_read: boolean;
  created_at: string;
  related_type?: string | null;
  related_id?: number | null;
};

export const useContentStore = defineStore('content', {
  state: () => ({
    notifications: [] as NotificationItem[],
    unreadCount: 0,
    pollTimer: 0 as unknown as number
  }),
  actions: {
    async fetchNotifications() {
      const token = getToken();
      if (!token) {
        this.notifications = [];
        this.unreadCount = 0;
        return;
      }
      const { data } = await api.get('/notifications');
      this.notifications = data.items ?? [];
      this.unreadCount = Number(data.unread ?? 0);
    },
    async markRead(id: number) {
      await api.patch(`/notifications/${id}/read`);
      const item = this.notifications.find((n) => n.id === id);
      if (item && !item.is_read) {
        item.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    },
    async markAllRead() {
      await api.patch('/notifications/read-all');
      this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
      this.unreadCount = 0;
    },
    async resolveTarget(id: number): Promise<string> {
      const { data } = await api.get(`/notifications/${id}/target`);
      return String(data.path ?? '/notifications');
    },
    clearNotifications() {
      this.notifications = [];
      this.unreadCount = 0;
    },
    startPolling(intervalMs = 8000) {
      this.stopPolling();
      this.pollTimer = window.setInterval(() => {
        void this.fetchNotifications().catch(() => {});
      }, intervalMs);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = 0 as unknown as number;
      }
    }
  }
});
