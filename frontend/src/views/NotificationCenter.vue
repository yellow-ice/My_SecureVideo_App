<template>
  <div class="page">
    <section class="left panel">
      <div class="toolbar">
        <div class="menu-scroll">
          <button class="menu-item" :class="{ on: view === 'inbox' }" @click="switchView('inbox')">
            <span class="menu-item-inner">
              <svg class="mi-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8l-4 3v-13a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              消息
            </span>
          </button>
          <button class="menu-item" :class="{ on: view === 'chat' }" @click="switchView('chat')">
            <span class="menu-item-inner">
              <svg class="mi-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-11a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              聊天
            </span>
          </button>
          <button class="menu-item" :class="{ on: view === 'friends' }" @click="switchView('friends')">
            <span class="menu-item-inner">
              <svg class="mi-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 1.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 18.5c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4M13.5 18.5c.2-1.7 1.8-2.8 3.8-2.8 2 0 3.6 1.1 3.8 2.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              好友
            </span>
            <span v-if="incoming.length" class="badge">{{ incoming.length }}</span>
          </button>
        </div>
        <el-button text @click="markAll">全部已读</el-button>
      </div>

      <div ref="listWrapEl" class="list-wrap" :class="{ 'friends-mode': view === 'friends' }">
        <div v-if="view === 'chat'" class="search-row">
          <el-input v-model="chatSearchQ" placeholder="搜索已添加好友" clearable />
        </div>

        <div v-if="view === 'friends'" class="search-row">
          <el-input v-model="addUserSearchQ" placeholder="搜索新用户（用户名/邮箱）" @keyup.enter="searchUsers" />
          <el-button @click="searchUsers">搜索</el-button>
        </div>

        <div v-if="view === 'friends' && userResults.length" class="result-list">
          <div v-for="u in userResults" :key="u.id" class="result-item">
            <div class="user-row">
              <img :src="avatarUrl(u.avatar)" class="avatar sm" @error="onAvatarError" />
              <div>
                <p class="name">{{ u.username }}</p>
                <p class="preview">{{ u.email || '-' }}</p>
              </div>
            </div>
            <el-button size="small" @click="sendRequest(u.id)">加好友</el-button>
          </div>
        </div>

        <template v-if="view === 'chat'">
          <button
            v-for="f in filteredChatFriends"
            :key="f.id"
            type="button"
            class="session-item"
            :class="{ on: activeFriendId === f.friend.id }"
            @click="selectFriend(f.friend.id)"
          >
            <span class="avatar-wrap">
              <img :src="avatarUrl(f.friend.avatar)" class="avatar" @error="onAvatarError" />
              <el-tooltip :content="presenceOnline[f.friend.id] ? '在线' : '离线'" placement="top" :show-after="350">
                <span class="presence-dot" :class="{ on: presenceOnline[f.friend.id] }" aria-hidden="true"></span>
              </el-tooltip>
            </span>
            <div class="session-text">
              <p class="name">{{ f.friend.username }}</p>
              <p class="preview">
                <span v-if="presenceTyping[f.friend.id]" class="typing">正在输入…</span>
                <span v-else>{{ f.lastMessage?.content || '点击开始聊天' }}</span>
              </p>
            </div>
          </button>
          <div v-if="filteredChatFriends.length === 0" class="empty-line">未找到已添加好友</div>
        </template>

        <template v-else-if="view === 'friends'">
          <div class="friends-sections">
            <section class="friends-pane">
              <h4 class="sub-title friends-pane-title"><span class="title-mark"></span>收到的申请</h4>
              <div class="friends-scroll-group">
                <div v-if="incoming.length === 0" class="empty-line">暂无收到的申请</div>
                <button
                  v-for="r in incoming"
                  :key="r.id"
                  type="button"
                  class="session-item"
                  :class="{ on: activeRequestId === r.id }"
                  @click="activeRequestId = r.id"
                >
                  <img :src="avatarUrl(r.sender.avatar)" class="avatar" @error="onAvatarError" />
                  <div class="session-text">
                    <p class="name">{{ r.sender.username }}</p>
                    <p class="preview">{{ r.message || '请求添加你为好友' }}</p>
                  </div>
                </button>
              </div>
            </section>

            <section class="friends-pane">
              <h4 class="sub-title friends-pane-title"><span class="title-mark"></span>已添加好友</h4>
              <div class="friends-scroll-group">
                <div v-if="friends.length === 0" class="empty-line">暂未添加好友</div>
                <button
                  v-for="f in friends"
                  :key="`added-${f.id}`"
                  type="button"
                  class="session-item"
                  @click="switchView('chat'); selectFriend(f.friend.id)"
                >
                  <span class="avatar-wrap">
                    <img :src="avatarUrl(f.friend.avatar)" class="avatar" @error="onAvatarError" />
                    <el-tooltip :content="presenceOnline[f.friend.id] ? '在线' : '离线'" placement="top" :show-after="350">
                      <span class="presence-dot" :class="{ on: presenceOnline[f.friend.id] }" aria-hidden="true"></span>
                    </el-tooltip>
                  </span>
                  <div class="session-text">
                    <p class="name">{{ f.friend.username }}</p>
                    <p class="preview" :class="{ typing: presenceTyping[f.friend.id] }">
                      {{ presenceTyping[f.friend.id] ? '正在输入…' : (f.lastMessage?.content || '已添加好友，可开始聊天') }}
                    </p>
                  </div>
                  <el-button class="remove-friend-btn" size="small" text type="danger" @click.stop="removeFriend(f.friend.id)">
                    取消关注
                  </el-button>
                </button>
              </div>
            </section>
          </div>
        </template>

        <template v-else>
          <button
            v-for="n in filteredNotifications"
            :key="n.id"
            type="button"
            class="session-item"
            :class="resolveStateClass(n, activeNotification?.id === n.id)"
            @click="selectNotification(n.id)"
          >
            <div class="session-text">
              <p class="name-row">
                <span class="name">{{ n.title }}</span>
                <span class="state-tags">
                  <span v-if="resolvePriority(n)" class="state-tag priority">高优</span>
                  <span v-if="resolveHandled(n)" class="state-tag handled">已处理</span>
                </span>
              </p>
              <p class="preview">{{ n.body || '无附加信息' }}</p>
            </div>
            <span class="time">{{ pretty(n.created_at) }}</span>
          </button>
          <div v-if="filteredNotifications.length === 0" class="empty-line">暂无消息</div>
        </template>
      </div>
    </section>

    <section class="right panel">
      <template v-if="view === 'chat'">
        <header class="right-head">
          <div class="user-row" v-if="activeFriend">
            <img :src="avatarUrl(activeFriend.avatar)" class="avatar" @error="onAvatarError" />
            <h3>{{ activeFriend.username }}</h3>
          </div>
          <div v-if="activeFriendId" class="head-actions">
            <el-button size="small" plain @click="clearCurrentChat">删除当前聊天</el-button>
            <el-button size="small" type="danger" plain @click="removeFriend(activeFriendId)">删除好友</el-button>
          </div>
          <h3 v-else>聊天窗口</h3>
        </header>
        <div v-if="!activeFriendId" class="empty-line">
          请选择左侧会话，或先在左侧搜索用户并加好友。
          <div class="hint-block" v-if="incoming.length">
            你还有 <b>{{ incoming.length }}</b> 条好友申请待处理（切换到“好友申请”即可处理）。
          </div>
        </div>
        <template v-else>
          <div class="chat-stage">
            <div ref="chatBoxEl" class="chat-box">
              <template v-if="messagesLoading">
                <div class="chat-loading">
                  <el-empty description="加载中..." />
                </div>
              </template>
              <template v-else>
                <div
                  v-for="m in messages"
                  :key="m.id"
                  class="msg"
                  :data-msg-id="m.id"
                  :class="{ mine: m.sender_id === meId, targeted: targetedMsgId === m.id }"
                >
                  <img :src="messageAvatar(m)" class="avatar sm" @error="onAvatarError" />
                  <div class="bubble-wrap">
                    <p class="sender">{{ messageSenderName(m) }}</p>
                    <div class="bubble">{{ m.content }}</div>
                  </div>
                </div>
              </template>
            </div>
            <div class="chat-input chat-input-overlay">
              <el-input
                v-model="chatDraft"
                type="textarea"
                :rows="2"
                placeholder="请输入消息内容（Enter 发送，Shift+Enter 换行）"
                @input="onDraftInput"
                @blur="() => void setTyping(false)"
                @keydown.enter.exact.prevent="sendChat"
              />
              <el-button class="chat-send-btn" type="primary" :loading="sending" @click="sendChat">发送</el-button>
            </div>
          </div>
        </template>
      </template>

      <template v-else-if="view === 'friends'">
          <h3><span class="title-mark"></span>{{ activeRequest?.sender.username || '好友申请' }}</h3>
        <div v-if="!activeRequest" class="empty-line">选择左侧申请查看</div>
        <template v-else>
          <div class="request-box">
            <div class="user-row">
              <img :src="avatarUrl(activeRequest.sender.avatar)" class="avatar" @error="onAvatarError" />
              <div>
                <p class="name">{{ activeRequest.sender.username }}</p>
                <p class="preview">{{ activeRequest.message || '请求添加你为好友' }}</p>
              </div>
            </div>
            <div class="ops">
              <el-button type="success" @click="respond(activeRequest.id, 'accept')">同意</el-button>
              <el-button @click="respond(activeRequest.id, 'reject')">拒绝</el-button>
            </div>
          </div>
          <h4 class="sub-title"><span class="title-mark"></span>我发出的申请</h4>
          <div v-if="outgoing.length === 0" class="empty-line">暂无</div>
          <div v-for="r in outgoing" :key="r.id" class="out-item">
            <img :src="avatarUrl(r.receiver.avatar)" class="avatar sm" @error="onAvatarError" />
            <div>
              <p class="name">{{ r.receiver.username }}</p>
              <p class="preview">{{ r.message || '等待对方处理' }}</p>
            </div>
          </div>
        </template>
      </template>

      <template v-else>
        <div class="right-stack">
          <section class="card">
            <h3>{{ activeNotification?.title || '消息详情' }}</h3>
            <div v-if="!activeNotification" class="empty-line">选择左侧消息查看详情</div>
            <template v-else>
              <p class="detail-tags">
                <span v-if="resolvePriority(activeNotification)" class="state-tag priority">高优消息</span>
                <span v-if="resolveHandled(activeNotification)" class="state-tag handled">已处理</span>
                <span v-if="!activeNotification.is_read" class="state-tag unread">未读</span>
                <span v-else class="state-tag read">已读</span>
              </p>
              <p class="detail-body">{{ activeNotification.body || '无附加信息' }}</p>
              <p class="detail-time">{{ pretty(activeNotification.created_at) }}</p>
              <div class="ops">
                <el-button type="primary" plain @click="goNotificationTarget(activeNotification.id)">前往查看</el-button>
                <el-button @click="markOne(activeNotification.id)">标记已读</el-button>
              </div>
            </template>
          </section>

          <section class="card">
            <h4 class="sub-title"><span class="title-mark"></span>快捷入口</h4>
            <div class="quick">
              <button type="button" class="quick-btn" @click="switchView('chat')">去聊天</button>
              <button type="button" class="quick-btn" @click="switchView('friends')">处理好友申请<span v-if="incoming.length" class="badge">{{ incoming.length }}</span></button>
              <button type="button" class="quick-btn" @click="switchView('inbox')">消息收件箱</button>
            </div>
          </section>

          <section class="card">
            <h4 class="sub-title"><span class="title-mark"></span>最近会话</h4>
            <div v-if="recentFriends.length === 0" class="empty-line">暂无会话</div>
            <button
              v-for="f in recentFriends"
              :key="f.id"
              type="button"
              class="mini-row"
              @click="switchView('chat'); selectFriend(f.friend.id)"
            >
              <img :src="avatarUrl(f.friend.avatar)" class="avatar sm" @error="onAvatarError" />
              <div class="mini-copy">
                <p class="name">{{ f.friend.username }}</p>
                <p class="preview">{{ f.lastMessage?.content || '点击开始聊天' }}</p>
              </div>
            </button>
          </section>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';
import { useContentStore, type NotificationItem } from '../stores/content';
import { useUserStore } from '../stores/user';

type UserLite = { id: number; username: string; email?: string; avatar?: string | null };
type FriendItem = { id: number; friend: UserLite; lastMessage?: { id: number; content: string } | null };
type ReqIncoming = { id: number; sender: UserLite; message?: string | null };
type ReqOutgoing = { id: number; receiver: UserLite; message?: string | null };
type ReqHandled = { id: number; status: 'accepted' | 'rejected'; sender: UserLite; handled_at?: string | null };
type ChatMsg = { id: number; sender_id: number; content: string; created_at: string; sender?: { id: number; username: string; avatar?: string | null } };
type ViewKind = 'inbox' | 'friends' | 'chat';
type NotificationWithMeta = NotificationItem & {
  priority?: 'low' | 'normal' | 'high' | string;
  handled_at?: string | null;
};

const route = useRoute();
const router = useRouter();
const store = useContentStore();
const userStore = useUserStore();
const view = ref<ViewKind>('inbox');
const activeNotificationId = ref(0);
const activeRequestId = ref(0);
const friends = ref<FriendItem[]>([]);
const incoming = ref<ReqIncoming[]>([]);
const outgoing = ref<ReqOutgoing[]>([]);
const handledIncoming = ref<ReqHandled[]>([]);
const activeFriendId = ref(0);
const messages = ref<ChatMsg[]>([]);
const messagesLoading = ref(false);
const chatDraft = ref('');
const sending = ref(false);
const timer = ref(0);
const meId = ref(0);
const chatSearchQ = ref('');
const addUserSearchQ = ref('');
const userResults = ref<UserLite[]>([]);
const listWrapEl = ref<HTMLElement | null>(null);
const chatBoxEl = ref<HTMLElement | null>(null);
const presenceOnline = ref<Record<number, boolean>>({});
const presenceTyping = ref<Record<number, boolean>>({});
const hbTimer = ref(0);
const pendingMsgId = ref(0);
const targetedMsgId = ref(0);
const isLocatingTarget = ref(false);
let targetFlashTimer = 0 as unknown as number;
const HANDLED_STORAGE_KEY = 'notification_handled_map_v1';
const handledMap = ref<Record<number, true>>({});
const priorityTypes = new Set(['security', 'risk', 'system_urgent']);

const preserveScrollTop = async (el: HTMLElement | null, run: () => Promise<void>) => {
  if (!el) return run();
  const top = el.scrollTop;
  await run();
  await nextTick();
  if (el) el.scrollTop = top;
};

const preserveChatPosition = async (run: () => Promise<void>) => {
  const el = chatBoxEl.value;
  if (!el) return run();
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
  await run();
  await nextTick();
  const el2 = chatBoxEl.value;
  if (!el2) return;
  if (nearBottom) el2.scrollTop = el2.scrollHeight;
};

const scrollChatToBottom = async () => {
  await nextTick();
  if (chatBoxEl.value) chatBoxEl.value.scrollTop = chatBoxEl.value.scrollHeight;
};

const scrollToTargetMessage = async (msgId: number) => {
  if (!msgId || !chatBoxEl.value) return false;
  await nextTick();
  const selector = `.msg[data-msg-id="${msgId}"]`;
  const box = chatBoxEl.value;
  const el = box.querySelector(selector) as HTMLElement | null;
  if (!el) return false;

  // 强制把目标消息滚到聊天可视区域正中央（而不是仅可见即可）。
  const targetTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
  const maxTop = Math.max(0, box.scrollHeight - box.clientHeight);
  const clampedTop = Math.min(Math.max(0, targetTop), maxTop);
  box.scrollTo({ top: clampedTop, behavior: 'smooth' });
  // 二次校准：等待平滑滚动后再精确对齐中心，避免被布局更新或动画中断。
  await new Promise<void>((resolve) => window.setTimeout(resolve, 260));
  const boxRect = box.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const delta = elRect.top + elRect.height / 2 - (boxRect.top + boxRect.height / 2);
  box.scrollTop = Math.min(Math.max(0, box.scrollTop + delta), maxTop);

  targetedMsgId.value = msgId;
  if (targetFlashTimer) clearTimeout(targetFlashTimer);
  targetFlashTimer = window.setTimeout(() => {
    targetedMsgId.value = 0;
  }, 1600);
  return true;
};

const isSameMessages = (a: ChatMsg[], b: ChatMsg[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) return false;
    if (x.id !== y.id) return false;
    if (x.sender_id !== y.sender_id) return false;
    if (x.created_at !== y.created_at) return false;
    if (x.content !== y.content) return false;
  }
  return true;
};

const activeNotification = computed(() => store.notifications.find((n) => n.id === activeNotificationId.value) || null);
const activeRequest = computed(() => incoming.value.find((r) => r.id === activeRequestId.value) || null);
const activeFriend = computed(() => friends.value.find((f) => f.friend.id === activeFriendId.value)?.friend || null);
const recentFriends = computed(() => friends.value.slice(0, 4));
const filteredChatFriends = computed(() => {
  const q = chatSearchQ.value.trim().toLowerCase();
  const base = !q ? friends.value : friends.value.filter((f) => String(f.friend.username ?? '').toLowerCase().includes(q));
  const getLastTs = (f: FriendItem) => (f.lastMessage ? Number(new Date((f.lastMessage as any).created_at ?? 0).getTime()) : 0);
  const isOn = (id: number) => presenceOnline.value[id] === true;
  return [...base].sort((a, b) => {
    const ao = isOn(a.friend.id) ? 1 : 0;
    const bo = isOn(b.friend.id) ? 1 : 0;
    if (ao !== bo) return bo - ao;
    return getLastTs(b) - getLastTs(a);
  });
});

const getSessionPreview = (f: FriendItem) => {
  if (presenceTyping.value[f.friend.id]) return '正在输入…';
  return f.lastMessage?.content || '点击开始聊天';
};

const syncPresence = async () => {
  try {
    const ids = friends.value.map((f) => f.friend.id).filter((n) => n > 0);
    if (!ids.length) return (presenceOnline.value = {});
    const { data } = await api.get('/presence/online', { params: { ids: ids.join(','), ttlMs: 60000 } });
    presenceOnline.value = (data?.online ?? {}) as Record<number, boolean>;
  } catch {
    // ignore presence errors
  }
};

const syncTyping = async () => {
  try {
    const ids = friends.value.map((f) => f.friend.id).filter((n) => n > 0);
    if (!ids.length) return (presenceTyping.value = {});
    const { data } = await api.get('/presence/typing', { params: { ids: ids.join(','), ttlMs: 6000 } });
    presenceTyping.value = (data?.typing ?? {}) as Record<number, boolean>;
  } catch {
    // ignore
  }
};

let typingIdleTimer = 0 as unknown as number;
let typingSendTimer = 0 as unknown as number;
const setTyping = async (typing: boolean) => {
  if (!activeFriendId.value) return;
  try {
    await api.post('/presence/typing', { toUserId: activeFriendId.value, typing });
  } catch {
    // ignore
  }
};

const onDraftInput = () => {
  if (!activeFriendId.value) return;
  if (typingSendTimer) return;
  typingSendTimer = window.setTimeout(() => {
    typingSendTimer = 0;
  }, 1200);
  void setTyping(true);
  if (typingIdleTimer) clearTimeout(typingIdleTimer);
  typingIdleTimer = window.setTimeout(() => {
    void setTyping(false);
  }, 2500);
};

const heartbeat = async () => {
  try {
    await api.post('/presence/heartbeat');
  } catch {
    // ignore
  }
};

const pretty = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const normalizeType = (t: NotificationItem['type']) => {
  if (t === 'reply') return 'reply';
  if (t === 'mention') return 'mention';
  if (t === 'favorite') return 'favorite';
  return 'system';
};

const loadHandledMap = () => {
  try {
    const raw = localStorage.getItem(HANDLED_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<number, true> = {};
    for (const [k, v] of Object.entries(parsed ?? {})) {
      const id = Number(k);
      if (Number.isFinite(id) && id > 0 && v === true) next[id] = true;
    }
    handledMap.value = next;
  } catch {
    handledMap.value = {};
  }
};

const saveHandledMap = () => {
  localStorage.setItem(HANDLED_STORAGE_KEY, JSON.stringify(handledMap.value));
};

const resolvePriority = (n: NotificationItem) => {
  const meta = n as NotificationWithMeta;
  if (meta.priority === 'high') return true;
  return priorityTypes.has(String((meta as Record<string, unknown>).type ?? '').toLowerCase());
};

const resolveHandled = (n: NotificationItem) => {
  const meta = n as NotificationWithMeta;
  if (meta.handled_at) return true;
  return handledMap.value[n.id] === true;
};

const markHandledLocal = (id: number) => {
  if (handledMap.value[id]) return;
  handledMap.value = { ...handledMap.value, [id]: true };
  saveHandledMap();
};

const resolveStateClass = (n: NotificationItem, isActive = false) => ({
  on: isActive,
  'is-unread': !n.is_read,
  'is-read': n.is_read && !resolveHandled(n),
  'is-priority': resolvePriority(n),
  'is-handled': resolveHandled(n)
});

const filteredNotifications = computed(() => {
  const base = store.notifications ?? [];
  if (view.value !== 'inbox') return [];
  return base;
});

const resolveAvatar = (src?: string | null) => {
  if (!src) return '/favicon.ico';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
};
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#e2e8f0"/><text x="32" y="38" text-anchor="middle" font-size="24" fill="#64748b" font-family="Arial">U</text></svg>');
const avatarUrl = (src?: string | null) => resolveAvatar(src) || DEFAULT_AVATAR;
const onAvatarError = (e: Event) => {
  const el = e.target as HTMLImageElement | null;
  if (el) el.src = DEFAULT_AVATAR;
};
const messageAvatar = (m: ChatMsg) => {
  if (m.sender_id === meId.value) return avatarUrl(userStore.user?.avatar);
  return avatarUrl(activeFriend.value?.avatar ?? m.sender?.avatar ?? null);
};
const messageSenderName = (m: ChatMsg) => {
  if (m.sender_id === meId.value) return userStore.user?.username || '我';
  return activeFriend.value?.username || m.sender?.username || '好友';
};

const switchView = (next: ViewKind) => {
  if (view.value === 'chat' && next !== 'chat') void setTyping(false);
  view.value = next;
  if (next !== 'chat') activeFriendId.value = 0;
  if (next !== 'friends') activeRequestId.value = 0;
  if (next === 'friends' && incoming.value.length) activeRequestId.value = incoming.value[0]!.id;
  if (next !== 'friends') userResults.value = [];
  if (next !== 'chat') chatSearchQ.value = '';
  if (filteredNotifications.value.length) activeNotificationId.value = filteredNotifications.value[0]!.id;
  if (next === 'chat' && activeFriendId.value) {
    void loadMessages(true, true);
  }
};

const selectNotification = (id: number) => {
  activeNotificationId.value = id;
};

const goNotificationTarget = async (id: number) => {
  const path = await store.resolveTarget(id);
  await store.markRead(id);
  markHandledLocal(id);
  await router.push(path);
};

const markOne = async (id: number) => {
  await store.markRead(id);
};

const markAll = async () => {
  try {
    await store.markAllRead();
    ElMessage.success('已全部标记为已读');
  } catch {
    ElMessage.error('操作失败');
  }
};

const loadFriends = async () => {
  await preserveScrollTop(listWrapEl.value, async () => {
    const { data } = await api.get('/friends');
    friends.value = (data.items ?? []) as FriendItem[];
  });
  void syncPresence();
};

const loadRequests = async () => {
  await preserveScrollTop(listWrapEl.value, async () => {
    const { data } = await api.get('/friends/requests');
    incoming.value = (data.incoming ?? []) as ReqIncoming[];
    outgoing.value = (data.outgoing ?? []) as ReqOutgoing[];
    handledIncoming.value = (data.handledIncoming ?? []) as ReqHandled[];
    if (activeRequestId.value && !incoming.value.some((r) => r.id === activeRequestId.value)) {
      activeRequestId.value = 0;
    }
    if (view.value === 'friends' && !activeRequestId.value && incoming.value.length) activeRequestId.value = incoming.value[0]!.id;
  });
};

const loadMessages = async (forceBottom = false, silent = false) => {
  if (!activeFriendId.value) return;
  if (!silent) messagesLoading.value = true;
  try {
    const friendId = activeFriendId.value;
    const clearedBeforeId = (() => {
      const me = Number(meId.value ?? 0);
      if (!me) return 0;
      try {
        const raw = localStorage.getItem(`sv_chat_cleared_${me}`);
        const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        return Number(parsed[String(friendId)] ?? 0);
      } catch {
        return 0;
      }
    })();
    const fetchChunk = async (beforeId?: number) => {
      const params: Record<string, number> = { take: 80 };
      if (beforeId && beforeId > 0) params.beforeId = beforeId;
      const { data } = await api.get(`/friends/${friendId}/messages`, { params });
      const items = (data.items ?? []) as ChatMsg[];
      return clearedBeforeId > 0 ? items.filter((m) => Number(m.id ?? 0) > clearedBeforeId) : items;
    };

    const ensureTargetLoaded = async (targetId: number) => {
      let found = messages.value.some((m) => m.id === targetId);
      let guard = 0;
      while (!found && guard < 20) {
        guard += 1;
        const oldestId = messages.value[0]?.id ?? 0;
        if (!oldestId) break;
        const older = await fetchChunk(oldestId);
        if (!older.length) break;
        const known = new Set(messages.value.map((m) => m.id));
        const prepend = older.filter((m) => !known.has(m.id));
        if (!prepend.length) break;
        messages.value = [...prepend, ...messages.value];
        found = messages.value.some((m) => m.id === targetId);
      }
      return found;
    };

    const run = async () => {
      const nextItems = await fetchChunk();
      if (!isSameMessages(messages.value, nextItems)) {
        messages.value = nextItems;
      }
      if (pendingMsgId.value) {
        await ensureTargetLoaded(pendingMsgId.value);
      }
    };
    if (forceBottom) {
      await run();
    } else {
      await preserveChatPosition(run);
    }
  } finally {
    if (!silent) messagesLoading.value = false;
    if (pendingMsgId.value) {
      isLocatingTarget.value = true;
      const targetId = pendingMsgId.value;
      pendingMsgId.value = 0;
      const ok = await scrollToTargetMessage(targetId);
      if (!ok) await scrollChatToBottom();
      isLocatingTarget.value = false;
    } else if (forceBottom) {
      // 确保在 loading 结束并渲染真实消息节点后再滚到底部。
      await scrollChatToBottom();
    }
  }
};

const selectFriend = async (friendId: number) => {
  if (activeFriendId.value && activeFriendId.value !== friendId) {
    void setTyping(false);
  }
  activeFriendId.value = friendId;
  await loadMessages(true, false);
};

const sendChat = async () => {
  const content = chatDraft.value.trim();
  if (!content || !activeFriendId.value) return;
  sending.value = true;
  try {
    void setTyping(false);
    await api.post(`/friends/${activeFriendId.value}/messages`, { content });
    chatDraft.value = '';
    await loadMessages(true, true);
    await Promise.all([loadFriends(), store.fetchNotifications()]);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发送失败');
  } finally {
    sending.value = false;
  }
};

const searchUsers = async () => {
  const q = addUserSearchQ.value.trim();
  if (!q) return (userResults.value = []);
  const { data } = await api.get('/friends/search-users', { params: { q } });
  userResults.value = (data.items ?? []) as UserLite[];
};

const sendRequest = async (receiverId: number) => {
  try {
    await api.post('/friends/requests', { receiverId });
    ElMessage.success('申请已发送');
    await Promise.all([loadRequests(), store.fetchNotifications()]);
  } catch (e: any) {
    ElMessage.info(e?.response?.data?.message ?? '发送失败');
  }
};

const respond = async (id: number, action: 'accept' | 'reject') => {
  try {
    await api.post(`/friends/requests/${id}/respond`, { action });
    ElMessage.success(action === 'accept' ? '已同意' : '已拒绝');
    await Promise.all([loadFriends(), loadRequests(), store.fetchNotifications()]);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '操作失败');
  }
};

const clearCurrentChat = async () => {
  if (!activeFriendId.value) return;
  try {
    await ElMessageBox.confirm('确定删除当前聊天记录吗？该操作不可恢复。', '删除当前聊天', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    const me = Number(meId.value ?? 0);
    if (!me) return ElMessage.error('请先登录');
    const key = `sv_chat_cleared_${me}`;
    const currentMax = Math.max(0, ...messages.value.map((m) => Number(m.id ?? 0)));
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[String(activeFriendId.value)] = currentMax;
    localStorage.setItem(key, JSON.stringify(parsed));
    messages.value = [];
    await loadFriends();
    ElMessage.success('已从本地删除当前聊天（对方不受影响）');
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.response?.data?.message ?? '删除聊天失败');
    }
  }
};

const removeFriend = async (friendId: number) => {
  if (!friendId) return;
  try {
    await ElMessageBox.confirm('确定取消关注并删除该好友吗？聊天记录也会被删除。', '删除好友', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await api.delete(`/friends/${friendId}`);
    if (activeFriendId.value === friendId) {
      activeFriendId.value = 0;
      messages.value = [];
    }
    await Promise.all([loadFriends(), loadRequests(), store.fetchNotifications()]);
    ElMessage.success('已删除好友');
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.response?.data?.message ?? '删除好友失败');
    }
  }
};

const applyRouteState = () => {
  const viewParam = String(route.query.view ?? '').trim();
  if (['inbox', 'friends', 'chat'].includes(viewParam)) view.value = viewParam as ViewKind;
  const friendId = Number(route.query.friendId ?? 0);
  const messageId = Number(route.query.messageId ?? 0);
  pendingMsgId.value = Number.isFinite(messageId) && messageId > 0 ? messageId : 0;
  if (view.value === 'chat' && Number.isFinite(friendId) && friendId > 0) {
    activeFriendId.value = friendId;
    void loadMessages(pendingMsgId.value === 0, false);
  }
};

watch(
  () => route.fullPath,
  () => applyRouteState()
);

onMounted(async () => {
  loadHandledMap();
  await userStore.fetchProfile();
  meId.value = Number(userStore.user?.id ?? 0);
  void heartbeat();
  hbTimer.value = window.setInterval(() => {
    void heartbeat();
  }, 25_000);
  await Promise.all([store.fetchNotifications(), loadFriends(), loadRequests()]);
  if (store.notifications.length) activeNotificationId.value = store.notifications[0]!.id;
  applyRouteState();
  timer.value = window.setInterval(() => {
    void (async () => {
      try {
        const tasks: Array<Promise<unknown>> = [];

        // `notifications` 本身由 `contentStore.startPolling(8000)` 定时刷新，
        // 避免这里重复拉取造成请求/渲染压力。
        if (view.value === 'chat') {
          if (activeFriendId.value && !isLocatingTarget.value) tasks.push(loadMessages(false, true));
          tasks.push(loadFriends());
          tasks.push(syncPresence());
          tasks.push(syncTyping());
        } else if (view.value === 'friends') {
          tasks.push(loadRequests());
          tasks.push(loadFriends());
          tasks.push(syncPresence());
          tasks.push(syncTyping());
        } else {
          // inbox：左侧是通知列表，右侧“最近会话/快捷入口”需要 friends/requests 数据
          tasks.push(loadFriends());
          tasks.push(loadRequests());
          tasks.push(syncPresence());
          tasks.push(syncTyping());
        }

        await Promise.all(tasks);
      } catch {
        // ignore periodic errors
      }
    })();
  }, 8000);
});

onBeforeUnmount(() => {
  void setTyping(false);
  if (typingIdleTimer) clearTimeout(typingIdleTimer);
  if (typingSendTimer) clearTimeout(typingSendTimer);
  if (targetFlashTimer) clearTimeout(targetFlashTimer);
  if (timer.value) clearInterval(timer.value);
  if (hbTimer.value) clearInterval(hbTimer.value);
});
</script>

<style scoped>
.page {
  --bg-page: #f8fbfc;
  --bg-panel: #fcfeff;
  --line-soft: rgba(15, 23, 42, 0.09);
  --line-strong: rgba(15, 23, 42, 0.15);
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-dim: #94a3b8;
  --accent-cyan: #0891b2;
  --accent-cyan-soft: rgba(8, 145, 178, 0.10);
  --accent-cyan-hover: rgba(8, 145, 178, 0.14);
  --focus-ring: rgba(8, 145, 178, 0.32);
  --radius-xs: 6px;
  --dur-fast: 120ms;
  --dur-mid: 160ms;

  --state-unread-dot: #ef4444;
  --state-unread-bg: rgba(8, 145, 178, 0.08);
  --state-read-text: #64748b;
  --state-pri-bar: #f59e0b;
  --state-pri-bg: rgba(245, 158, 11, 0.1);
  --state-handled-text: #94a3b8;
  --state-handled-line: rgba(148, 163, 184, 0.35);
  width: 100%;
  max-width: 1760px;
  margin: 0 auto;
  padding: 12px 14px 18px;
  display: grid;
  grid-template-columns: clamp(280px, 26vw, 360px) minmax(0, 1fr);
  gap: 12px;
  height: calc(100vh - 74px);
  overflow: hidden;
  background: var(--bg-page);
}
.panel {
  border: 0;
  border-radius: var(--radius-xs);
  background: var(--bg-panel);
  padding: 12px;
  min-height: 0;
  height: 100%;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
}
.left { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.menu-scroll { display: flex; gap: 6px; overflow: auto; padding-bottom: 4px; }
.menu-item-inner { display: inline-flex; align-items: center; gap: 6px; }
.mi-ic { width: 14px; height: 14px; flex: 0 0 auto; opacity: .76; transition: opacity var(--dur-mid) ease, transform var(--dur-fast) ease; }
.menu-item {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-sub);
  border-radius: 0;
  padding: 6px 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--dur-mid) ease, border-color var(--dur-mid) ease, transform var(--dur-fast) ease, background-color var(--dur-mid) ease;
}
.menu-item:hover { color: var(--text-main); border-bottom-color: rgba(8,145,178,.30); background: var(--accent-cyan-soft); }
.menu-item:hover .mi-ic { opacity: 1; }
.menu-item:active { transform: translateY(1px); }
.menu-item:active .mi-ic { transform: translateY(1px); }
.menu-item:focus-visible { outline: none; box-shadow: inset 0 -2px 0 rgba(8,145,178,.55); }
.menu-item.on {
  color: var(--accent-cyan);
  border-bottom-color: var(--accent-cyan);
  font-weight: 700;
}
.subtabs { display: flex; gap: 8px; margin: 6px 0 10px; }
.subtab { border: 1px solid rgba(15,23,42,.10); background: #fff; color: #64748b; border-radius: 999px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
.subtab.on { border-color: rgba(0,161,214,.35); color: var(--accent); background: var(--accent-soft); font-weight: 700; }
.list-wrap { overflow: auto; padding-right: 2px; min-height: 0; }
.list-wrap.friends-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}
.search-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 10px; }
.result-list { display: grid; gap: 8px; margin-bottom: 10px; }
.result-item {
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  border-radius: 0;
  padding: 8px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.session-item {
  width: 100%;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(247,251,253,.90));
  text-align: left;
  padding: 10px 10px;
  margin-bottom: 8px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.045);
  transition: border-color var(--dur-mid) ease, background-color var(--dur-mid) ease, transform var(--dur-fast) ease, color var(--dur-mid) ease, box-shadow var(--dur-mid) ease, filter var(--dur-mid) ease;
}
.session-item.on {
  background:
    linear-gradient(180deg, rgba(236, 252, 255, 0.98), rgba(233, 248, 252, 0.95));
  box-shadow: 0 10px 22px rgba(8,145,178,.12);
}
.session-item:hover {
  background: linear-gradient(180deg, rgba(239,252,255,.98), rgba(236,250,253,.96));
  box-shadow: 0 12px 24px rgba(8,145,178,.10);
}
.session-item:active { transform: translateY(1px) scale(0.998); }
.session-item:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring), 0 10px 22px rgba(8,145,178,.10); }
.session-item.is-unread {
  background:
    linear-gradient(180deg, rgba(248, 253, 255, 0.98), rgba(243, 251, 255, 0.95)),
    var(--state-unread-bg);
}
.session-item.is-unread .name {
  font-weight: 800;
}
.session-item.is-unread .name::before { content: '• '; color: var(--state-unread-dot); margin-right: 2px; }
.session-item.is-read .name,
.session-item.is-read .preview,
.session-item.is-read .time {
  color: var(--state-read-text);
}
.session-item.is-priority {
  position: relative;
  background:
    linear-gradient(0deg, var(--state-pri-bg), var(--state-pri-bg)),
    transparent;
}
.session-item.is-priority::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: var(--state-pri-bar);
}
.session-item.is-priority.is-unread {
  background:
    linear-gradient(0deg, rgba(245, 158, 11, 0.13), rgba(245, 158, 11, 0.13)),
    linear-gradient(0deg, var(--state-unread-bg), var(--state-unread-bg));
}
.session-item.is-handled .name,
.session-item.is-handled .preview,
.session-item.is-handled .time {
  color: var(--state-handled-text);
}
.session-item.is-handled:not(.is-priority) {
  filter: saturate(.78);
}
.name-row {
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.state-tags {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.state-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.45;
  border: 1px solid rgba(15,23,42,.12);
  color: var(--text-sub);
  background: rgba(255,255,255,.92);
  box-shadow: 0 2px 6px rgba(15,23,42,.05);
}
.state-tag.unread {
  color: #b91c1c;
  border-color: rgba(239,68,68,.25);
  background: rgba(239,68,68,.08);
}
.state-tag.read {
  color: #64748b;
  border-color: rgba(148,163,184,.35);
  background: rgba(148,163,184,.09);
}
.state-tag.priority {
  color: #92400e;
  border-color: rgba(245,158,11,.38);
  background: rgba(245,158,11,.16);
}
.state-tag.handled {
  color: var(--state-handled-text);
  border-color: rgba(148,163,184,.45);
  background: rgba(148,163,184,.12);
}
.session-text { min-width: 0; flex: 1; }
.name { margin: 0 0 4px; font-weight: 700; color: var(--text-main); }
.preview { margin: 0; color: var(--text-sub); font-size: 13px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.typing {
  color: var(--accent-cyan);
  font-weight: 700;
}
.time {
  color: var(--text-dim);
  font-size: 12px;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148,163,184,.10);
}
.empty-line { color: var(--text-dim); font-size: 13px; padding: 8px 0; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #e2e8f0; flex: 0 0 36px; border: 1px solid rgba(15,23,42,.1); }
.avatar.sm { width: 28px; height: 28px; flex-basis: 28px; }
.avatar-wrap { position: relative; display: inline-block; width: 36px; height: 36px; flex: 0 0 36px; }
.avatar-wrap .avatar { width: 100%; height: 100%; flex: 0 0 auto; }
.presence-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.55);
  border: 2px solid var(--bg-panel);
  box-sizing: border-box;
  right: -1px;
  bottom: -1px;
}
.presence-dot.on {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}
.user-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
h3 { margin: 0 0 10px; font-size: 18px; color: var(--text-main); }
.title-mark {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
  background: linear-gradient(135deg, #38bdf8, #06b6d4);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
}
.right-head {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.head-actions { display: inline-flex; align-items: center; gap: 8px; }
.remove-friend-btn { margin-left: auto; flex: 0 0 auto; }
.right { display: flex; flex-direction: column; min-height: 0; }
.chat-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
.chat-box {
  border: 0;
  border-bottom: 1px solid rgba(15,23,42,.12);
  border-radius: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 0;
  background: #fff;
}
.chat-stage .chat-box {
  height: 100%;
  padding-bottom: 132px;
}
.chat-loading { height: 100%; min-height: 80px; display: flex; align-items: center; justify-content: center; }
.msg { display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-end; }
.msg.mine { flex-direction: row-reverse; }
.msg.targeted .bubble {
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.42);
  background: rgba(56, 189, 248, 0.12);
}
.bubble-wrap { max-width: calc(100% - 46px); display: flex; flex-direction: column; }
.msg.mine .bubble-wrap { align-items: flex-end; }
.sender { margin: 0 0 4px; color: #64748b; font-size: 12px; }
.msg.mine .sender { text-align: right; }
.bubble {
  border-radius: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 0;
  color: #0f172a;
  line-height: 1.6;
  word-break: break-word;
}
.msg.mine .bubble { background: rgba(0,161,214,.10); }
.chat-input { margin-top: 8px; position: relative; }
.chat-input-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin-top: 0;
  border: 0;
  border-top: 1px solid rgba(15,23,42,.14);
  border-radius: 0;
  background: #fff;
  box-shadow: none;
  padding: 8px 0 0;
}
.chat-input :deep(.el-textarea__inner) {
  min-height: 78px;
  padding-right: 90px;
  padding-bottom: 16px;
  border: 0;
  border-bottom: 1px solid rgba(15,23,42,.14);
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}
.chat-send-btn {
  position: absolute;
  right: 18px;
  bottom: 18px;
  transition: transform .12s ease, filter .18s ease;
}
.chat-send-btn:hover { filter: brightness(1.03); }
.chat-send-btn:active { transform: translateY(1px); }
.hint-block { margin-top: 10px; padding: 10px; border: 1px dashed rgba(15,23,42,.14); border-radius: 10px; background: #fff; color: #475569; font-size: 13px; }
.right-stack { display: grid; gap: 10px; height: 100%; overflow: auto; padding-right: 2px; }
.card {
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  border-radius: 0;
  background: #fff;
  padding: 12px 0;
}
.quick { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.quick-btn {
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  background: transparent;
  border-radius: 0;
  padding: 10px 0;
  cursor: pointer;
  color: var(--text-main);
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  transition: border-color var(--dur-mid) ease, color var(--dur-mid) ease, transform var(--dur-fast) ease, background-color var(--dur-mid) ease;
}
.quick-btn:hover { border-bottom-color: rgba(8,145,178,.42); background: var(--accent-cyan-soft); }
.quick-btn:active { transform: translateY(1px); }
.badge { min-width: 18px; height: 18px; padding: 0 6px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 11px; display: grid; place-items: center; }
.mini-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  border-radius: 0;
  background: transparent;
  text-align: left;
  padding: 10px 0;
  margin-bottom: 0;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
  transition: border-color var(--dur-mid) ease, background-color var(--dur-mid) ease, transform var(--dur-fast) ease;
}
.mini-row:hover { border-bottom-color: rgba(8,145,178,.42); background: var(--accent-cyan-soft); }
.mini-row:active { transform: translateY(1px); }
.mini-copy { min-width: 0; }
.request-box { border: 0; border-bottom: 1px solid var(--line-soft); border-radius: 0; padding: 10px 0; }
.sub-title {
  margin: 12px 0 8px;
  font-size: 14px;
  color: #334155;
  letter-spacing: .1px;
}
.friends-sections {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}
.friends-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.friends-pane-title { margin: 6px 0 6px; }
.friends-scroll-group {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}
.list-wrap,
.friends-scroll-group,
.chat-box,
.right-stack,
.menu-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.list-wrap::-webkit-scrollbar,
.friends-scroll-group::-webkit-scrollbar,
.chat-box::-webkit-scrollbar,
.right-stack::-webkit-scrollbar,
.menu-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.list-wrap::-webkit-scrollbar-thumb,
.friends-scroll-group::-webkit-scrollbar-thumb,
.chat-box::-webkit-scrollbar-thumb,
.right-stack::-webkit-scrollbar-thumb,
.menu-scroll::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
}
.list-wrap::-webkit-scrollbar-track,
.friends-scroll-group::-webkit-scrollbar-track,
.chat-box::-webkit-scrollbar-track,
.right-stack::-webkit-scrollbar-track,
.menu-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.list-wrap:hover,
.friends-scroll-group:hover,
.chat-box:hover,
.right-stack:hover,
.menu-scroll:hover {
  scrollbar-color: rgba(148, 163, 184, 0.7) transparent;
}
.list-wrap:hover::-webkit-scrollbar-thumb,
.friends-scroll-group:hover::-webkit-scrollbar-thumb,
.chat-box:hover::-webkit-scrollbar-thumb,
.right-stack:hover::-webkit-scrollbar-thumb,
.menu-scroll:hover::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.72);
}
.added-tip { margin: 10px 0 4px; font-size: 13px; color: #16a34a; font-weight: 700; }
.out-item { border: 0; border-bottom: 1px solid var(--line-soft); border-radius: 0; padding: 8px 0; display: flex; gap: 8px; align-items: center; margin-bottom: 0; }
.ops { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
.ops :deep(.el-button) {
  transition: transform var(--dur-fast) ease, filter var(--dur-mid) ease, box-shadow var(--dur-mid) ease;
}
.ops :deep(.el-button:hover) {
  filter: brightness(1.02);
}
.ops :deep(.el-button:active) {
  transform: translateY(1px);
}
.ops :deep(.el-button:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 2px var(--focus-ring);
}
.detail-body {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #334155;
  margin: 0 0 8px;
}
.detail-time { color: var(--text-dim); font-size: 12px; margin: 0 0 10px; }
.detail-tags {
  margin: 4px 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
@media (max-width: 980px) {
  .page { width: 100%; grid-template-columns: 1fr; padding: 14px; }
  .panel { min-height: auto; }
  .chat-box { min-height: 320px; }
  .quick { grid-template-columns: 1fr; }
}
</style>
