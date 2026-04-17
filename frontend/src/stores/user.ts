import { defineStore } from 'pinia';
import api from '../services/api';
import type { User } from '../types';
import { clearToken, setToken } from '../utils/authToken';

interface UserState {
  user: User | null;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null
  }),
  actions: {
    async login(email: string, password: string) {
      // Always clear stale session first to avoid role leakage.
      clearToken();
      this.user = null;
      const { data } = await api.post('/auth/login', { email, password });
      setToken(String(data.token ?? ''));
      this.user = data.user as User;
    },
    async fetchProfile() {
      const { data } = await api.get('/auth/profile');
      this.user = data.user as User;
    },
    logout() {
      clearToken();
      this.user = null;
    }
  }
});
