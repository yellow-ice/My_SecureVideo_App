import { createRouter, createWebHistory } from 'vue-router';
import UserAuth from '../views/UserAuth.vue';
import VideoList from '../views/VideoList.vue';
import VideoPlayer from '../views/VideoPlayer.vue';
import ContentPlayer from '../views/ContentPlayer.vue';
import VideoUpload from '../views/VideoUpload.vue';
import CreatorCenter from '../views/CreatorCenter.vue';
import FavoritesView from '../views/FavoritesView.vue';
import BrowseHistory from '../views/BrowseHistory.vue';
import NotificationCenter from '../views/NotificationCenter.vue';
import UserProfile from '../views/UserProfile.vue';
import UserHome from '../views/UserHome.vue';
import SecurityDashboard from '../views/SecurityDashboard.vue';
import AttackLab from '../views/AttackLab.vue';
import AdminUsers from '../views/AdminUsers.vue';
import AdminCategoryRequests from '../views/AdminCategoryRequests.vue';
import { useUserStore } from '../stores/user';
import { getToken } from '../utils/authToken';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/videos' },
    { path: '/login', component: UserAuth },
    { path: '/register', component: UserAuth },
    { path: '/videos', component: VideoList, meta: { userOnly: true } },
    { path: '/upload', component: VideoUpload, meta: { userOnly: true } },
    { path: '/creator', component: CreatorCenter, meta: { userOnly: true } },
    { path: '/favorites', component: FavoritesView, meta: { userOnly: true } },
    { path: '/history', component: BrowseHistory, meta: { userOnly: true, allowAdmin: true } },
    { path: '/notifications', component: NotificationCenter, meta: { userOnly: true } },
    { path: '/me', component: UserProfile, meta: { userOnly: true } },
    { path: '/users/:id', component: UserHome, meta: { userOnly: true } },
    { path: '/contents/:id', component: ContentPlayer, meta: { userOnly: true, allowAdmin: true } },
    { path: '/videos/:id', component: VideoPlayer, meta: { userOnly: true, allowAdmin: true } },
    { path: '/admin/users', component: AdminUsers, meta: { adminOnly: true } },
    { path: '/admin/categories', component: AdminCategoryRequests, meta: { adminOnly: true } },
    { path: '/security', component: SecurityDashboard, meta: { adminOnly: true } },
    { path: '/attack-lab', component: AttackLab, meta: { adminOnly: true } }
  ]
});

router.beforeEach(async (to) => {
  const store = useUserStore();
  const token = getToken();
  const needsAuth = Boolean(to.meta.adminOnly || to.meta.userOnly);
  if (needsAuth && !token) return '/login';

  if (needsAuth && token && !store.user) {
    try {
      await store.fetchProfile();
    } catch {
      store.logout();
      return '/login';
    }
  }

  const role = store.user?.role;

  if (to.meta.adminOnly) {
    if (role !== 'admin') return '/videos';
    return true;
  }

  if (to.meta.userOnly) {
    if (role && role === 'admin' && !to.meta.allowAdmin) return '/security';
    return true;
  }

  // 访问根路径时：根据角色分流
  if (to.path === '/') {
    if (role === 'admin') return '/security';
    return '/videos';
  }

  return true;
});

export default router;
