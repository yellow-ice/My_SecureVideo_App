<template>
  <div class="page">
    <section class="left panel">
      <h3>好友</h3>
      <div class="search-row">
        <el-input v-model="q" placeholder="搜索用户（用户名/邮箱）" @keyup.enter="searchUsers" />
        <el-button @click="searchUsers">搜索</el-button>
      </div>
      <div v-if="searchResults.length" class="search-list">
        <div v-for="u in searchResults" :key="u.id" class="search-item">
          <span>{{ u.username }}（{{ u.email }}）</span>
          <el-button size="small" @click="sendRequest(u.id)">加好友</el-button>
        </div>
      </div>

      <div class="section-title">我的好友</div>
      <button
        v-for="f in friends"
        :key="f.id"
        type="button"
        class="friend-item"
        :class="{ on: activeFriendId === f.friend.id }"
        @click="selectFriend(f.friend.id)"
      >
        <span class="name">{{ f.friend.username }}</span>
        <span class="muted">{{ f.lastMessage?.content || '暂无消息' }}</span>
      </button>
    </section>

    <section class="mid panel">
      <h3>好友申请</h3>
      <div class="section-title">收到的申请</div>
      <div v-if="incoming.length === 0" class="muted">暂无</div>
      <div v-for="r in incoming" :key="r.id" class="req-item">
        <div class="name">{{ r.sender.username }}</div>
        <div class="muted">{{ r.message || '请求添加你为好友' }}</div>
        <div class="ops">
          <el-button size="small" type="success" @click="respond(r.id, 'accept')">同意</el-button>
          <el-button size="small" @click="respond(r.id, 'reject')">拒绝</el-button>
        </div>
      </div>

      <div class="section-title">我发出的申请</div>
      <div v-if="outgoing.length === 0" class="muted">暂无</div>
      <div v-for="r in outgoing" :key="r.id" class="req-item">
        <div class="name">{{ r.receiver.username }}</div>
        <div class="muted">{{ r.message || '等待对方处理' }}</div>
      </div>
    </section>

    <section class="right panel">
      <h3>聊天</h3>
      <div v-if="!activeFriendId" class="muted">请选择左侧好友开始聊天</div>
      <template v-else>
        <div class="chat-box">
          <div v-for="m in messages" :key="m.id" class="msg" :class="{ mine: m.sender_id === meId }">
            <div class="bubble">{{ m.content }}</div>
          </div>
        </div>
        <div class="chat-input">
          <el-input v-model="chatDraft" type="textarea" :rows="2" placeholder="输入消息..." />
          <el-button type="primary" :loading="sending" @click="sendChat">发送</el-button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../services/api';
import { useContentStore } from '../stores/content';
import { useUserStore } from '../stores/user';

type UserLite = { id: number; username: string; email?: string; avatar?: string | null; status?: string };
type FriendItem = { id: number; friend: UserLite; lastMessage?: { id: number; content: string } | null };
type ReqIncoming = { id: number; sender: UserLite; message?: string | null };
type ReqOutgoing = { id: number; receiver: UserLite; message?: string | null };
type ChatMsg = { id: number; sender_id: number; content: string; created_at: string };

const userStore = useUserStore();
const contentStore = useContentStore();
const meId = ref(0);
const q = ref('');
const searchResults = ref<UserLite[]>([]);
const friends = ref<FriendItem[]>([]);
const incoming = ref<ReqIncoming[]>([]);
const outgoing = ref<ReqOutgoing[]>([]);
const activeFriendId = ref(0);
const messages = ref<ChatMsg[]>([]);
const chatDraft = ref('');
const sending = ref(false);
const pollTimer = ref(0);

const loadFriends = async () => {
  const { data } = await api.get('/friends');
  friends.value = (data.items ?? []) as FriendItem[];
};

const loadRequests = async () => {
  const { data } = await api.get('/friends/requests');
  incoming.value = (data.incoming ?? []) as ReqIncoming[];
  outgoing.value = (data.outgoing ?? []) as ReqOutgoing[];
};

const loadMessages = async () => {
  if (!activeFriendId.value) return;
  const { data } = await api.get(`/friends/${activeFriendId.value}/messages`, { params: { take: 80 } });
  messages.value = (data.items ?? []) as ChatMsg[];
};

const searchUsers = async () => {
  const kw = q.value.trim();
  if (!kw) {
    searchResults.value = [];
    return;
  }
  const { data } = await api.get('/friends/search-users', { params: { q: kw } });
  searchResults.value = (data.items ?? []) as UserLite[];
};

const sendRequest = async (receiverId: number) => {
  try {
    await api.post('/friends/requests', { receiverId });
    ElMessage.success('申请已发送');
    await loadRequests();
    await contentStore.fetchNotifications();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发送失败');
  }
};

const respond = async (id: number, action: 'accept' | 'reject') => {
  try {
    await api.post(`/friends/requests/${id}/respond`, { action });
    ElMessage.success(action === 'accept' ? '已同意' : '已拒绝');
    await Promise.all([loadRequests(), loadFriends(), contentStore.fetchNotifications()]);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '操作失败');
  }
};

const selectFriend = async (friendId: number) => {
  activeFriendId.value = friendId;
  await loadMessages();
};

const sendChat = async () => {
  const content = chatDraft.value.trim();
  if (!content || !activeFriendId.value) return;
  sending.value = true;
  try {
    await api.post(`/friends/${activeFriendId.value}/messages`, { content });
    chatDraft.value = '';
    await Promise.all([loadMessages(), loadFriends()]);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发送失败');
  } finally {
    sending.value = false;
  }
};

onMounted(async () => {
  await userStore.fetchProfile();
  meId.value = Number(userStore.user?.id ?? 0);
  await Promise.all([loadFriends(), loadRequests()]);
  pollTimer.value = window.setInterval(() => {
    void Promise.all([loadFriends(), loadRequests(), loadMessages(), contentStore.fetchNotifications()]).catch(() => {});
  }, 5000);
});

onBeforeUnmount(() => {
  if (pollTimer.value) clearInterval(pollTimer.value);
});
</script>

<style scoped>
.page { max-width: 1280px; margin: 0 auto; padding: 22px; display: grid; grid-template-columns: 1.1fr 1fr 1.4fr; gap: 12px; }
.panel { border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 12px; min-height: 560px; }
h3 { margin: 0 0 10px; font-size: 18px; }
.search-row { display: flex; gap: 8px; margin-bottom: 10px; }
.search-list { display: grid; gap: 8px; margin-bottom: 10px; }
.search-item { border: 1px solid rgba(15,23,42,.12); border-radius: 8px; padding: 8px; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.section-title { margin: 10px 0 8px; color: #64748b; font-size: 12px; }
.friend-item { width: 100%; border: 1px solid rgba(15,23,42,.12); border-radius: 8px; background: #fff; text-align: left; padding: 8px; margin-bottom: 8px; cursor: pointer; display: grid; gap: 4px; }
.friend-item.on { border-color: rgba(0,161,214,.36); background: rgba(236,254,255,.6); }
.name { font-weight: 700; color: #0f172a; }
.muted { color: #64748b; font-size: 12px; }
.req-item { border: 1px solid rgba(15,23,42,.12); border-radius: 8px; padding: 8px; margin-bottom: 8px; }
.ops { margin-top: 8px; display: flex; gap: 8px; }
.chat-box { border: 1px solid rgba(15,23,42,.12); border-radius: 10px; min-height: 430px; max-height: 430px; overflow: auto; padding: 10px; background: #f8fafc; }
.msg { display: flex; margin-bottom: 8px; }
.msg.mine { justify-content: flex-end; }
.bubble { max-width: 76%; border-radius: 10px; padding: 8px 10px; background: #fff; border: 1px solid rgba(15,23,42,.1); color: #0f172a; line-height: 1.6; }
.msg.mine .bubble { background: rgba(0,161,214,.12); border-color: rgba(0,161,214,.28); }
.chat-input { margin-top: 8px; display: grid; gap: 8px; }
@media (max-width: 1100px) { .page { grid-template-columns: 1fr; } .panel { min-height: auto; } .chat-box { min-height: 280px; max-height: 280px; } }
</style>
