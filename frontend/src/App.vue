<template>
  <el-container class="layout">
    <el-header v-if="userStore.user" class="header">
      <router-link :to="userStore.user?.role === 'admin' ? '/security' : '/videos'" class="brand">SecureVideo</router-link>
      <nav class="nav">
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: isNavActive(item.to) }"
        >
          <svg v-if="isNavActive(item.to) && item.to === '/videos'" class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-7.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="isNavActive(item.to) && item.to === '/upload'" class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <svg v-else-if="isNavActive(item.to) && item.to === '/creator'" class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <svg v-else-if="isNavActive(item.to) && item.to === '/favorites'" class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.5 4.8 13.8a4.8 4.8 0 1 1 6.8-6.8L12 7.4l.4-.4a4.8 4.8 0 1 1 6.8 6.8L12 20.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="isNavActive(item.to) && item.to === '/history'" class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4M12 8v4l2.8 1.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="isNavActive(item.to) && item.to === '/notifications'" class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 8.5a7 7 0 0 1 14 0V15l2 2H3l2-2V8.5Zm5 11h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ item.label }}
          <span v-if="item.to === '/notifications' && contentStore.unreadCount > 0" class="dot">
            {{ contentStore.unreadCount > 99 ? '99+' : contentStore.unreadCount }}
          </span>
        </router-link>
      </nav>

      <form v-if="userStore.user?.role !== 'admin'" class="search" @submit.prevent="submitSearch">
        <el-input v-model="searchQ" placeholder="搜索内容（视频/插画/专栏）" clearable class="search-input" />
        <el-button type="primary" class="search-btn" native-type="submit">搜索</el-button>
      </form>

      <div class="user-box">
        <template v-if="userStore.user">
          <button type="button" class="avatar-btn" @click="goProfile" title="个人资料">
            <img v-if="userStore.user.avatar" :src="resolveAvatar(userStore.user.avatar)" alt="" class="avatar-img" />
            <span v-else class="avatar-ph">{{ (userStore.user.username || 'U').slice(0, 1).toUpperCase() }}</span>
          </button>
          <span class="who">{{ userStore.user.username }}</span>
          <button type="button" class="logout-btn" title="退出登录" @click="logout" aria-label="退出登录">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M7.4 5.6a9 9 0 1 0 9.2 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </template>
        <template v-else>
          <el-button size="small" type="primary" @click="goLogin">登录</el-button>
        </template>
      </div>
    </el-header>
    <el-main class="main">
      <router-view />
    </el-main>
    <footer v-if="userStore.user" class="site-footer">
      <div class="footer-inner">
        <span>© SecureVideo</span>
        <span class="sep">·</span>
        <a href="#" class="link-quiet">关于</a>
        <a href="#" class="link-quiet">帮助</a>
        <a href="#" class="link-quiet">隐私</a>
      </div>
    </footer>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from './stores/user';
import { useContentStore } from './stores/content';
import { getToken } from './utils/authToken';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const contentStore = useContentStore();
const searchQ = ref('');

const nav = computed(() => {
  if (userStore.user?.role === 'admin') {
    return [
      { to: '/security', label: '安全态势' },
      { to: '/attack-lab', label: '攻防演练' },
      { to: '/admin/users', label: '用户管理' },
      { to: '/admin/categories', label: '投稿审核' },
    ];
  }
  return [
    { to: '/videos', label: '首页' },
    { to: '/upload', label: '投稿' },
    { to: '/creator', label: '创作中心' },
    { to: '/favorites', label: '收藏夹' },
    { to: '/history', label: '浏览历史' },
    { to: '/notifications', label: '消息' },
  ];
});

onMounted(async () => {
  if (getToken()) {
    try {
      await userStore.fetchProfile();
      await contentStore.fetchNotifications();
      contentStore.startPolling(8000);
    } catch {
      userStore.logout();
    }
  }
});

onBeforeUnmount(() => {
  contentStore.stopPolling();
});

watch(
  () => userStore.user?.id,
  (id) => {
    if (id) {
      void contentStore.fetchNotifications();
      contentStore.startPolling(8000);
    } else {
      contentStore.stopPolling();
      contentStore.clearNotifications();
    }
  }
);

watch(
  () => route.fullPath,
  () => {
    if (route.path === '/videos') searchQ.value = String(route.query.q ?? '');
  },
  { immediate: true }
);

const submitSearch = () => {
  const q = searchQ.value.trim();
  void router.push({ path: '/videos', query: q ? { q } : {} });
};
const isNavActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`);

const resolveAvatar = (src?: string | null) => {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
};

const goLogin = () => router.push('/login');
const goProfile = () => router.push('/me');
const logout = () => {
  contentStore.stopPolling();
  contentStore.clearNotifications();
  userStore.logout();
  ElMessage.success('已退出登录');
  void router.push('/login');
};
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 22px;
  height: 56px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  text-decoration: none;
}
.brand:hover {
  color: var(--accent);
}
.nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 6px;
  flex: 1;
  max-width: 520px;
}
.search :deep(.el-input) {
  flex: 1;
}
.search-btn {
  flex: 0 0 auto;
}
.nav-link {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.nav-ic {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}
.nav-link:hover {
  color: var(--text);
  background: rgba(15, 23, 42, 0.06);
}
.nav-link.active {
  color: var(--text);
  background: var(--accent-soft);
}
.dot {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  padding: 0 3px;
}
.user-box {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.who {
  font-size: 13px;
  color: var(--muted);
}
.avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: #f3f4f6;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.avatar-btn:hover {
  border-color: rgba(0, 161, 214, 0.35);
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-ph {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}
.logout-btn {
  border: 0;
  background: transparent;
  color: #64748b;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
}
.logout-btn svg {
  width: 15px;
  height: 15px;
}
.logout-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
@media (max-width: 980px) {
  .header {
    height: auto;
    min-height: 56px;
    padding: 8px 12px;
    gap: 10px;
    flex-wrap: wrap;
  }
  .search {
    order: 2;
    flex: 1 1 240px;
    margin-left: 0;
    max-width: none;
    min-width: 220px;
  }
  .user-box {
    order: 2;
    margin-left: 0;
  }
  .nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }
  .nav-link {
    white-space: nowrap;
  }
}
.main {
  flex: 1;
  padding: 0;
  --el-main-padding: 0;
}
.site-footer {
  border-top: 1px solid var(--line);
  padding: 20px 22px 28px;
  margin-top: auto;
}
.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  font-size: 13px;
  color: var(--muted);
}
.sep {
  opacity: 0.5;
}
.footer-inner .link-quiet {
  margin-right: 4px;
}
</style>
