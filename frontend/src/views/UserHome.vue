<template>
  <div class="page">
    <header class="head">
      <h1 class="title">主页</h1>
      <p class="sub">用户公开资料展示</p>
    </header>

    <section class="panel" v-if="profile">
      <div class="avatar-row">
        <div class="avatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="" />
          <div v-else class="avatar-ph">{{ (profile.username || 'U').slice(0, 1).toUpperCase() }}</div>
        </div>
        <div class="base">
          <h2>
            <svg class="name-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 20v-1.2a4.8 4.8 0 0 0-4.8-4.8H8.8A4.8 4.8 0 0 0 4 18.8V20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <circle cx="12" cy="8.4" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6" />
            </svg>
            {{ profile.username }}
          </h2>
          <p class="bio">{{ profile.bio || '这个人很神秘，还没有简介。' }}</p>
          <div class="meta-list">
            <p><span class="k">UID</span><span class="v">{{ profile.id }}</span></p>
            <p><span class="k">角色</span><span class="v">{{ profile.role }}</span></p>
            <p><span class="k">状态</span><span class="v">{{ profile.status }}</span></p>
            <p><span class="k">加入时间</span><span class="v">{{ formatTime(profile.created_at) }}</span></p>
            <p><span class="k">最近登录</span><span class="v">{{ profile.last_login ? formatTime(profile.last_login) : '暂无' }}</span></p>
          </div>
        </div>
      </div>

      <div class="actions">
        <el-button @click="goBack">返回</el-button>
        <el-button v-if="isSelf" type="primary" @click="goEdit">编辑资料</el-button>
        <el-button v-else-if="friendState === 'none'" :loading="adding" type="primary" @click="addFriend">加好友</el-button>
        <el-button v-else-if="friendState === 'friend'" type="primary" @click="goChat">去聊天</el-button>
        <el-button v-else-if="friendState === 'pending_incoming'" @click="goFriendRequests">去处理申请</el-button>
        <el-button v-else disabled>已申请</el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../services/api';
import { useUserStore } from '../stores/user';

type HomeUser = {
  id: number;
  username: string;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login?: string | null;
};
type FriendState = 'none' | 'friend' | 'pending_outgoing' | 'pending_incoming';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const profile = ref<HomeUser | null>(null);
const friendState = ref<FriendState>('none');
const adding = ref(false);

const userId = computed(() => Number(route.params.id));
const isSelf = computed(() => Number(userStore.user?.id ?? 0) === Number(profile.value?.id ?? 0));
const avatarUrl = computed(() => {
  const src = profile.value?.avatar;
  if (!src) return '';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
});

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const goBack = () => router.back();
const goEdit = () => router.push('/me');
const goChat = () => router.push({ path: '/notifications', query: { view: 'chat', friendId: userId.value } });
const goFriendRequests = () => router.push({ path: '/notifications', query: { view: 'friends' } });

const loadFriendState = async () => {
  if (!userId.value || isSelf.value) {
    friendState.value = 'none';
    return;
  }
  try {
    const [{ data: friendsData }, { data: reqData }] = await Promise.all([api.get('/friends'), api.get('/friends/requests')]);
    const inFriends = (friendsData.items ?? []).some((x: any) => Number(x.friend?.id ?? 0) === userId.value);
    if (inFriends) {
      friendState.value = 'friend';
      return;
    }
    const inOutgoing = (reqData.outgoing ?? []).some((x: any) => Number(x.receiver?.id ?? 0) === userId.value);
    if (inOutgoing) {
      friendState.value = 'pending_outgoing';
      return;
    }
    const inIncoming = (reqData.incoming ?? []).some((x: any) => Number(x.sender?.id ?? 0) === userId.value);
    if (inIncoming) {
      friendState.value = 'pending_incoming';
      return;
    }
    friendState.value = 'none';
  } catch {
    friendState.value = 'none';
  }
};

const addFriend = async () => {
  if (!userId.value) return;
  adding.value = true;
  try {
    await api.post('/friends/requests', { receiverId: userId.value });
    friendState.value = 'pending_outgoing';
    ElMessage.success('好友申请已发送');
  } catch (e: any) {
    ElMessage.info(e?.response?.data?.message ?? '发送失败');
  } finally {
    adding.value = false;
  }
};

onMounted(async () => {
  if (!Number.isFinite(userId.value) || userId.value <= 0) {
    ElMessage.error('用户 ID 无效');
    return;
  }
  try {
    const { data } = await api.get(`/auth/users/${userId.value}`);
    profile.value = data.user as HomeUser;
    await loadFriendState();
  } catch (e: any) {
    if (e?.response?.status === 401) {
      ElMessage.error('登录已失效，请重新登录');
    } else {
      ElMessage.error(e?.response?.data?.message ?? '加载主页失败');
    }
  }
});
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 28px 22px 48px; }
.head { margin-bottom: 16px; }
.title { margin: 0 0 6px; font-size: 1.45rem; font-weight: 700; }
.sub { margin: 0; color: var(--muted); }
.panel { border: 0; background: transparent; border-radius: 0; padding: 12px 6px; box-shadow: none; }
.avatar-row { display: flex; gap: 16px; align-items: flex-start; }
.avatar { width: 96px; height: 96px; border-radius: 999px; overflow: hidden; border: 0; background: #f3f4f6; flex: 0 0 auto; }
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-ph { width: 100%; height: 100%; display: grid; place-items: center; font-weight: 800; color: #334155; font-size: 20px; }
.base { min-width: 0; flex: 1; }
.base h2 { margin: 0 0 10px; display: inline-flex; align-items: center; gap: 6px; }
.name-ic { width: 16px; height: 16px; color: #0ea5e9; flex: 0 0 auto; }
.bio {
  margin: 0 0 10px !important;
  color: #334155 !important;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.34);
  border-radius: 0;
  padding: 6px 0 8px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.meta-list { display: grid; gap: 0; }
.meta-list p {
  margin: 0;
  padding: 8px 2px;
  border-bottom: 1px solid rgba(148,163,184,.24);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.meta-list p:last-child { border-bottom: 0; }
.meta-list .k { font-size: 12px; color: #64748b; }
.meta-list .v { color: #0f172a; font-weight: 600; text-align: right; }
.actions { margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end; }
@media (max-width: 760px) {
  .avatar-row { flex-direction: column; align-items: flex-start; }
  .meta-list p { align-items: flex-start; flex-direction: column; gap: 4px; }
  .meta-list .v { text-align: left; }
}
</style>
