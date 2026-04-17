<template>
  <div class="page">
    <div v-if="video" class="shell">
      <div class="left">
        <div class="player-box">
          <video controls :src="video.url" class="video-el" @ended="onVideoEnded" />
          <div class="glow" />
        </div>

        <article class="detail">
          <h1 class="title">{{ video.title }}</h1>
          <p class="meta">
            <span class="chip">{{ catLabel(video.category) }}</span>
            <span class="dot">·</span>
            <span class="muted meta-views">
              <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ video.views }} 次播放
            </span>
            <span class="dot">·</span>
            <span class="muted meta-duration">
              <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 7v5l3 2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              时长 {{ formatDuration(video.duration) }}
            </span>
          </p>
          <p class="desc">{{ video.description || '暂无简介' }}</p>
        </article>

        <section class="section">
          <div class="sec-head">
            <h2 class="h2">评论</h2>
            <span class="muted small">共 {{ commentTotal }} 条</span>
          </div>

          <div class="composer">
            <div class="me-row">
              <div class="avatar sm">
                <img v-if="userStore.user?.avatar" :src="resolveAvatar(userStore.user.avatar)" alt="" />
                <div v-else class="ph">{{ (userStore.user?.username || 'U').slice(0, 1).toUpperCase() }}</div>
              </div>
              <el-input v-model="commentDraft" type="textarea" :rows="3" placeholder="发一条友善的评论…" />
            </div>
            <div class="composer-actions">
              <el-button @click="commentDraft = ''">清空</el-button>
              <el-button type="primary" :loading="sending" @click="sendComment">发布</el-button>
            </div>
          </div>

          <div class="c-list">
            <div v-for="c in comments" :id="`comment-${c.id}`" :key="c.id" class="c-item">
              <button type="button" class="avatar avatar-btn" @click="openUserAction(c.user?.id, c.user?.username, c.user?.avatar)">
                <img v-if="c.user?.avatar" :src="resolveAvatar(c.user.avatar)" alt="" />
                <div v-else class="ph">{{ (c.user?.username || '?').slice(0, 1).toUpperCase() }}</div>
              </button>
              <div class="c-body">
                <div class="c-meta">
                  <span class="name">{{ c.user?.username || '匿名用户' }}</span>
                  <span class="dot">·</span>
                  <span class="time mono">{{ prettyTime(c.created_at) }}</span>
                </div>
                <div class="c-text">{{ c.content }}</div>
                <button type="button" class="reply-btn" @click="startReply(c.id, c.user?.id, c.user?.username || '')">回复</button>
                <div v-if="replyTargetId === c.id" class="reply-box">
                  <el-input v-model="replyDraft" type="textarea" :rows="2" placeholder="回复，支持 @用户名" />
                  <div class="composer-actions">
                    <el-button size="small" @click="cancelReply">取消</el-button>
                    <el-button size="small" type="primary" :loading="replySending" @click="sendReply">发送回复</el-button>
                  </div>
                </div>
                <div v-for="r in c.replies || []" :id="`reply-${r.id}`" :key="r.id" class="reply-item">
                  <button type="button" class="avatar sm avatar-btn" @click="openUserAction(r.user?.id, r.user?.username, r.user?.avatar)">
                    <img v-if="r.user?.avatar" :src="resolveAvatar(r.user.avatar)" alt="" />
                    <div v-else class="ph">{{ (r.user?.username || '?').slice(0, 1).toUpperCase() }}</div>
                  </button>
                  <div class="reply-copy">
                    <span class="name">{{ r.user?.username || '匿名用户' }}</span>
                    <span v-if="r.replyToUser" class="muted"> 回复 {{ r.replyToUser.username }}</span>
                    <span class="muted"> · {{ prettyTime(r.created_at) }}</span>
                    <div class="c-text">{{ r.content }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="comments.length === 0" class="empty">暂无评论，来抢沙发吧</div>

            <div class="pager">
              <el-pagination
                v-model:current-page="commentPage"
                v-model:page-size="commentPageSize"
                :page-sizes="[10, 20, 50]"
                :total="commentTotal"
                layout="total, sizes, prev, pager, next"
                background
                @change="loadComments"
              />
            </div>
          </div>
        </section>
      </div>

      <aside class="right">
        <div class="side-head">
          <div class="side-head-left">
            <h2 class="h2">接下来播放</h2>
          </div>
          <div class="side-head-right">
            <span class="muted small">自动连播</span>
            <el-switch v-model="autoplayNext" size="small" />
          </div>
        </div>
        <button v-for="v in related" :key="v.id" type="button" class="rel" @click="go(v.id)">
          <div class="thumb">
            <img v-if="v.cover_url" :src="v.cover_url" alt="" />
            <div v-else class="thumb-ph" />
            <span class="dur">{{ formatDuration(v.duration) }}</span>
          </div>
          <div class="r-copy">
            <div class="r-title">{{ v.title }}</div>
            <div class="r-author muted">
              <span class="up-badge">UP</span>
              <span class="r-author-name">{{ v.user?.username || '未知UP' }}</span>
            </div>
            <div class="r-meta muted">
              <span class="r-meta-item">
                <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ formatWan(v.views) }}
              </span>
              <span class="r-meta-item">
                <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M21 11.5c0 4.2-4.03 7.6-9 7.6-1.2 0-2.35-.2-3.4-.55L3 20l1.25-4.1C3.47 14.78 3 13.2 3 11.5 3 7.3 7.03 3.9 12 3.9s9 3.4 9 7.6Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                </svg>
                {{ v._count?.comments ?? 0 }}
              </span>
            </div>
          </div>
        </button>
      </aside>
    </div>

    <div v-else class="loading">加载中…</div>
  </div>

  <el-dialog v-model="userActionOpen" width="460px" title="用户操作">
    <div v-if="uaUserId" class="ua">
      <div class="ua-head">
        <div class="ua-avatar">
          <img v-if="uaAvatar && resolveAvatar(uaAvatar)" :src="resolveAvatar(uaAvatar)" alt="" />
          <div v-else class="ph">{{ (uaUsername || '?').slice(0, 1).toUpperCase() }}</div>
        </div>
        <div>
          <p class="ua-name">{{ uaUsername || '用户' }}</p>
          <p class="ua-sub">{{ isFriend(uaUserId) ? '已是好友，可直接聊天' : '还不是好友：只能发送一句打招呼（作为好友申请附言）' }}</p>
        </div>
      </div>
      <div class="ua-chat">
        <div v-if="uaChatItems.length === 0" class="ua-tip">
          {{ isFriend(uaUserId) ? '你们已经是好友了，可以直接去聊天。' : '你可以先发一句打招呼；对方同意好友后才能继续聊天。' }}
        </div>
        <div v-for="m in uaChatItems" :key="m.id" class="ua-msg" :class="{ failed: m.status === 'failed' }">
          <div class="ua-msg-meta">
            <img :src="resolveAvatar(userStore.user?.avatar || '')" class="ua-ava" />
          </div>
          <div class="ua-msg-bubble">
            <div class="ua-bubble">
              <span class="ua-text">{{ m.text }}</span>
              <span v-if="m.status === 'failed'" class="ua-bang">!</span>
            </div>
            <p v-if="m.status === 'failed'" class="ua-fail-hint">需要对方通过好友申请后才能继续发送</p>
          </div>
        </div>
      </div>

      <div class="ua-foot">
        <el-button @click="goHome(uaUserId)">主页</el-button>
        <el-button @click="userActionOpen = false">取消</el-button>
        <el-button v-if="!isFriend(uaUserId)" :disabled="uaSentOnce" @click="helloDraft = `你好，我是 ${String(userStore.user?.username ?? '我')}～`">重写一句</el-button>
        <el-button v-if="!isFriend(uaUserId)" type="primary" :loading="uaSending" @click="sendHelloOrApply(uaUserId)">
          {{ uaSentOnce ? '已发送' : '发送（自动申请好友）' }}
        </el-button>
        <el-button v-else type="primary" @click="goChat(uaUserId)">去聊天</el-button>
      </div>

      <el-input
        v-if="!isFriend(uaUserId)"
        v-model="helloDraft"
        type="textarea"
        :rows="2"
        class="ua-input"
        :disabled="uaSentOnce"
        placeholder="输入一句打招呼…"
        @keydown.enter.exact.prevent="sendHelloOrApply(uaUserId)"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import type { CommentItem, Video } from '../types';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const video = ref<Video | null>(null);
const related = ref<Video[]>([]);
const autoplayNext = ref(false);

const comments = ref<CommentItem[]>([]);
const commentTotal = ref(0);
const commentPage = ref(1);
const commentPageSize = ref(20);
const commentDraft = ref('');
const sending = ref(false);
const replyTargetId = ref(0);
const replyToUserId = ref<number | null>(null);
const replyDraft = ref('');
const replySending = ref(false);

const userActionOpen = ref(false);
const uaUserId = ref(0);
const uaUsername = ref('');
const uaAvatar = ref<string | null>(null);
const helloDraft = ref('');
const uaSending = ref(false);
const friendIdSet = ref<Set<number>>(new Set());
const uaSentOnce = ref(false);
const uaChatItems = ref<Array<{ id: number; text: string; status: 'sent' | 'failed' }>>([]);

const videoId = computed(() => Number(route.params.id));

const catLabel = (c: string) => ({ tech: '科技', security: '安全', entertainment: '娱乐' } as any)[c] ?? c;

const prettyTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const resolveAvatar = (src?: string | null) => {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
};

const ensureFriendsLoaded = async () => {
  if (friendIdSet.value.size) return;
  try {
    const { data } = await api.get('/friends');
    const ids = new Set<number>((data.items ?? []).map((x: any) => Number(x.friend?.id ?? 0)).filter((n: number) => n > 0));
    friendIdSet.value = ids;
  } catch {
    // ignore
  }
};

const isFriend = (uid: number) => friendIdSet.value.has(uid);

const openUserAction = async (id?: number, username?: string, avatar?: string | null) => {
  const me = Number(userStore.user?.id ?? 0);
  if (!id || id === me) return;
  await ensureFriendsLoaded();
  uaUserId.value = id;
  uaUsername.value = username || '用户';
  uaAvatar.value = avatar ?? null;
  helloDraft.value = `你好，我是 ${String(userStore.user?.username ?? '我')}～`;
  uaSentOnce.value = false;
  uaChatItems.value = [];
  userActionOpen.value = true;
};

const pushUa = (text: string, status: 'sent' | 'failed') => {
  uaChatItems.value.push({ id: Date.now() + Math.random(), text, status });
};

const sendHelloOrApply = async (receiverId: number) => {
  const msg = helloDraft.value.trim();
  if (!msg) return ElMessage.warning('请输入一句话');
  if (uaSentOnce.value) {
    pushUa(msg, 'failed');
    return;
  }
  uaSending.value = true;
  try {
    await api.post('/friends/requests', { receiverId, message: msg.slice(0, 80) });
    pushUa(msg, 'sent');
    uaSentOnce.value = true;
    ElMessage.success('已发送（已自动发起好友申请）');
  } catch (e: any) {
    const status = Number(e?.response?.status ?? 0);
    if (status === 409) {
      uaSentOnce.value = true;
      pushUa(msg, 'failed');
      ElMessage.info(e?.response?.data?.message ?? '申请已存在，等待对方处理');
    } else {
      ElMessage.info(e?.response?.data?.message ?? '发送失败');
    }
  } finally {
    uaSending.value = false;
  }
};

const goChat = (friendId: number) => {
  userActionOpen.value = false;
  void router.push({ path: '/notifications', query: { view: 'chat', friendId } });
};

const goHome = (userId: number) => {
  userActionOpen.value = false;
  void router.push(`/users/${userId}`);
};

const loadVideo = async () => {
  const { data } = await api.get(`/videos/${videoId.value}`);
  video.value = data.video as Video;
};

const loadRelated = async () => {
  if (!video.value) return;
  const { data } = await api.get('/videos', { params: { category: video.value.category, page: 1, pageSize: 10 } });
  related.value = (data.items as Video[]).filter((v) => v.id !== videoId.value).slice(0, 10);
};

const loadComments = async () => {
  const { data } = await api.get(`/videos/${videoId.value}/comments`, {
    params: { page: commentPage.value, pageSize: commentPageSize.value }
  });
  comments.value = data.items as CommentItem[];
  commentTotal.value = Number(data.total ?? 0);
};

const sendComment = async () => {
  const content = commentDraft.value.trim();
  if (!content) {
    ElMessage.warning('评论不能为空');
    return;
  }
  sending.value = true;
  try {
    await api.post(`/videos/${videoId.value}/comments`, { content });
    commentDraft.value = '';
    commentPage.value = 1;
    await loadComments();
    ElMessage.success('已发布');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发布失败（需要登录）');
  } finally {
    sending.value = false;
  }
};

const startReply = (commentId: number, userId?: number, username = '') => {
  replyTargetId.value = commentId;
  replyToUserId.value = userId ?? null;
  replyDraft.value = username ? `@${username} ` : '';
};

const cancelReply = () => {
  replyTargetId.value = 0;
  replyToUserId.value = null;
  replyDraft.value = '';
};

const sendReply = async () => {
  const content = replyDraft.value.trim();
  if (!content || !replyTargetId.value) {
    ElMessage.warning('回复不能为空');
    return;
  }
  replySending.value = true;
  try {
    await api.post(`/videos/${videoId.value}/comments`, {
      content,
      parent_id: replyTargetId.value,
      reply_to_user_id: replyToUserId.value ?? undefined
    });
    cancelReply();
    await loadComments();
    ElMessage.success('回复成功');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '回复失败');
  } finally {
    replySending.value = false;
  }
};

// avatar click -> openUserAction

const focusAnchorFromQuery = async () => {
  const replyId = Number(route.query.replyId ?? 0);
  const commentId = Number(route.query.commentId ?? 0);
  const target = replyId > 0 ? `reply-${replyId}` : commentId > 0 ? `comment-${commentId}` : '';
  if (!target) return;
  await nextTick();
  const el = document.getElementById(target);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('anchor-hit');
  setTimeout(() => el.classList.remove('anchor-hit'), 1500);
};

const go = (id: number) => router.push(`/videos/${id}`);

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const autoplayNextKey = 'sv_autoplay_next';

const formatWan = (n: number) => {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return '0';
  if (num >= 10000) {
    const w = num / 10000;
    const s = w.toFixed(1).replace(/\.0$/, '');
    return `${s}万`;
  }
  return String(num);
};

const onVideoEnded = () => {
  if (!autoplayNext.value) return;
  const next = related.value[0];
  if (!next) return;
  go(next.id);
};

onMounted(() => {
  autoplayNext.value = localStorage.getItem(autoplayNextKey) === '1';
});

watch(autoplayNext, (v) => {
  localStorage.setItem(autoplayNextKey, v ? '1' : '0');
});

watch(
  () => route.params.id,
  async () => {
    video.value = null;
    comments.value = [];
    commentTotal.value = 0;
    commentPage.value = 1;
    await loadVideo();
    await Promise.all([loadRelated(), loadComments()]);
    await focusAnchorFromQuery();
  },
  { immediate: true }
);

watch(
  () => route.fullPath,
  () => {
    void focusAnchorFromQuery();
  }
);
</script>

<style scoped>
.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 26px 22px 64px;
}
.shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
}
.player-box {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}
.video-el {
  width: 100%;
  display: block;
  max-height: 72vh;
}
.glow { display: none; }
.detail {
  padding-top: 14px;
}
.title {
  margin: 0 0 10px;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.meta {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.meta-ic { width: 14px; height: 14px; color: #64748b; flex: 0 0 auto; }
.meta-views,
.meta-duration {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.desc {
  margin: 0;
  font-size: 15px;
  color: var(--muted);
  line-height: 1.65;
}
.loading {
  padding: 48px 0;
  text-align: center;
  color: var(--muted);
}
.section {
  padding-top: 24px;
  border-top: 1px solid var(--line);
  margin-top: 14px;
}
.h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--text);
}
.sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.small {
  font-size: 12px;
}
.composer {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  border-radius: 12px;
  padding: 12px;
}
.me-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.avatar.sm {
  width: 34px;
  height: 34px;
}
.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.c-list {
  margin-top: 14px;
}
.c-item {
  display: flex;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  flex: 0 0 auto;
  background: #f3f4f6;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-btn {
  cursor: pointer;
  padding: 0;
  transition: border-color .18s, transform .18s;
}
.avatar-btn:hover {
  border-color: rgba(0,161,214,.45);
  transform: translateY(-1px);
}
.ph {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #334155;
}
.c-body {
  min-width: 0;
}
.c-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}
.name {
  color: #0f172a;
  font-weight: 650;
}
.c-text {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: #111827;
  white-space: pre-wrap;
  word-break: break-word;
}
.reply-btn {
  margin-top: 6px;
  border: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
}
.reply-box {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}
.reply-item {
  margin-top: 8px;
  margin-left: 14px;
  padding-left: 10px;
  border-left: 2px solid rgba(15, 23, 42, 0.1);
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 8px;
  align-items: start;
}
.reply-copy {
  min-width: 0;
}
.ua { display: grid; gap: 10px; }
.ua-head { display: grid; grid-template-columns: 44px 1fr; gap: 10px; align-items: center; }
.ua-avatar { width: 44px; height: 44px; border-radius: 999px; overflow: hidden; border: 1px solid rgba(15,23,42,.12); background: #f3f4f6; display: grid; place-items: center; }
.ua-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ua-name { margin: 0 0 4px; font-weight: 800; color: #0f172a; }
.ua-sub { margin: 0; color: #64748b; font-size: 12px; line-height: 1.5; }
.ua-foot { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.ua-chat { border: 1px solid rgba(15,23,42,.10); border-radius: 12px; background: #f8fafc; padding: 10px; max-height: 220px; overflow: auto; }
.ua-tip { color: #64748b; font-size: 12px; line-height: 1.6; }
.ua-msg { display: flex; gap: 8px; margin-top: 10px; align-items: flex-start; }
.ua-ava { width: 28px; height: 28px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(15,23,42,.10); background: #e2e8f0; }
.ua-msg-bubble { min-width: 0; }
.ua-bubble { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(15,23,42,.10); border-radius: 12px; padding: 8px 10px; background: rgba(0,161,214,.12); }
.ua-text { color: #0f172a; line-height: 1.6; word-break: break-word; }
.ua-bang { width: 16px; height: 16px; border-radius: 999px; background: #ef4444; color: #fff; font-weight: 900; display: grid; place-items: center; font-size: 12px; }
.ua-fail-hint { margin: 4px 0 0; color: #ef4444; font-size: 12px; }
.ua-input { margin-top: 10px; }
.anchor-hit {
  background: rgba(0, 161, 214, 0.08);
  border-radius: 8px;
}
.empty {
  padding: 18px 0 6px;
  color: var(--muted);
  font-size: 13px;
}
.pager {
  padding-top: 14px;
}
.right {
  position: sticky;
  top: 70px;
  height: fit-content;
  padding-left: 6px;
}
.side-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.side-head-left {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}
.side-head-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.rel {
  width: 100%;
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-radius: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.rel:hover {
  background: rgba(0, 161, 214, 0.04);
}
.thumb {
  width: 128px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  position: relative;
  flex: 0 0 auto;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb-ph {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 161, 214, 0.12), rgba(43, 108, 255, 0.10));
}
.dur {
  position: absolute;
  right: 6px;
  bottom: 6px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.9);
  font-family: ui-monospace, Consolas, monospace;
}
.r-copy {
  min-width: 0;
}
.r-title {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.r-author {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.r-author-name {
  font-size: 12px;
  font-weight: 800;
}
.up-badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(0, 161, 214, 0.08);
  border: 1px solid rgba(0, 161, 214, 0.28);
  color: var(--accent);
  font-weight: 800;
  line-height: 1;
}
.r-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.r-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.chip {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(0, 161, 214, 0.28);
  background: rgba(0, 161, 214, 0.08);
  color: #0f172a;
}
.dot {
  opacity: 0.55;
}
.muted {
  color: var(--muted);
}
.mono {
  font-family: ui-monospace, Consolas, monospace;
}
@media (max-width: 980px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .right {
    position: static;
    padding-left: 0;
    margin-top: 14px;
  }
  .thumb {
    width: 160px;
    height: 90px;
  }
}
</style>
