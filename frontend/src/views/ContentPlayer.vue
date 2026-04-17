<template>
  <div class="page" v-if="item">
    <div class="layout">
      <section class="main" :class="`main-${item.type}`">
        <article class="detail">
          <h1>{{ item.title }}</h1>
          <p class="detail-meta">
            <span class="meta-item">
              <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ formatWan(item.views) }}
            </span>
            <span class="meta-item">
              <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 11.5c0 4.2-4.03 7.6-9 7.6-1.2 0-2.35-.2-3.4-.55L3 20l1.25-4.1C3.47 14.78 3 13.2 3 11.5 3 7.3 7.03 3.9 12 3.9s9 3.4 9 7.6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
              </svg>
              {{ commentTotal }}
            </span>
            <span class="meta-item">{{ fmt(item.created_at) }}</span>
            <span class="meta-item warn">
              <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M7.5 7.5 16.5 16.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              未经作者授权，禁止转载
            </span>
          </p>
        </article>

        <div v-if="item.type === 'video' && item.media_url" class="media">
          <video controls :src="item.media_url" />
        </div>
        <section v-if="item.type === 'image'" class="illustration-panel">
          <div v-if="galleryUrls.length" class="media image">
            <el-carousel
              class="gallery-carousel"
              indicator-position="none"
              arrow="always"
              height="100%"
              :initial-index="galleryIndex"
              @change="onGalleryChange"
            >
              <el-carousel-item v-for="(src, idx) in galleryUrls" :key="`${src}-${idx}`">
                <el-image
                  class="gallery-main"
                  :src="src"
                  fit="contain"
                  :preview-src-list="galleryUrls"
                  :initial-index="idx"
                  preview-teleported
                />
              </el-carousel-item>
            </el-carousel>
            <div class="gallery-dot">{{ galleryIndex + 1 }} / {{ galleryUrls.length }}</div>
          </div>
        </section>
        <article v-if="item.type === 'article'" class="article">
          <div class="markdown-body" v-html="renderedBody" />
        </article>
        <section v-else class="intro-block" :class="{ expanded: introExpanded }">
          <p class="intro-text">{{ introText }}</p>
          <button
            v-if="showIntroToggle"
            type="button"
            class="intro-toggle"
            @click="introExpanded = !introExpanded"
          >
            {{ introExpanded ? '收起' : '展开' }}
          </button>
        </section>
        <div v-if="item.tags?.length" class="tags-row">
          <span v-for="t in item.tags" :key="t.tag.id" class="tag">#{{ t.tag.name }}</span>
        </div>
        <div class="action-row">
          <button class="action-btn" :class="{ on: item.liked }" :disabled="likeBusy || isReadonlyPreview" @click="toggleLike">
            <svg class="btn-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 21s-7-4.35-7-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6.65-7 11-7 11Z"
                :fill="item.liked ? 'currentColor' : 'none'"
                fill-rule="evenodd"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="btn-text"> {{ item._count?.likes ?? 0 }}</span>
          </button>
          <button class="action-btn" :class="{ on: item.favored }" :disabled="favBusy || isReadonlyPreview" @click="toggleFavorite">
            <svg class="btn-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
                :fill="item.favored ? 'currentColor' : 'none'"
                fill-rule="evenodd"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="btn-text">
              {{ item.favored ? '已收藏' : '收藏' }} {{ item._count?.favoriteItems ?? 0 }}
            </span>
          </button>
        </div>
        <p v-if="isReadonlyPreview" class="readonly-tip">当前内容未审核通过，仅支持预览，不可点赞、收藏或评论。</p>

        <section ref="commentsEl" class="comments">
          <div class="comments-head">
            <h3>评论 {{ commentTotal }}</h3>
            <div class="comment-tabs">
              <button class="tab" :class="{ on: commentSort === 'hot' }" @click="commentSort = 'hot'">最热</button>
              <button class="tab" :class="{ on: commentSort === 'latest' }" @click="commentSort = 'latest'">最新</button>
            </div>
          </div>

          <div v-if="!isReadonlyPreview" class="composer-row">
            <div class="avatar lg">
              <img v-if="currentAvatar" :src="currentAvatar" alt="" />
              <div v-else class="ph">{{ (currentUsername || 'U').slice(0, 1).toUpperCase() }}</div>
            </div>
            <div class="composer">
              <el-input v-model="draft" type="textarea" :rows="3" placeholder="新的风景已经出现，你的妙评何时再现" />
              <div class="composer-foot">
                <span class="hint">支持 @用户名</span>
                <el-button type="primary" :loading="sending" @click="send">发布</el-button>
              </div>
            </div>
          </div>

          <div v-for="c in sortedComments" :id="`comment-${c.id}`" :key="c.id" class="comment-card">
            <button v-if="!isReadonlyPreview" type="button" class="avatar md avatar-btn" @click="openUserAction(c.user)">
              <img v-if="resolveAvatar(c.user?.avatar)" :src="resolveAvatar(c.user?.avatar)" alt="" />
              <div v-else class="ph">{{ (c.user?.username || '?').slice(0, 1).toUpperCase() }}</div>
            </button>
            <div v-else class="avatar md">
              <img v-if="resolveAvatar(c.user?.avatar)" :src="resolveAvatar(c.user?.avatar)" alt="" />
              <div v-else class="ph">{{ (c.user?.username || '?').slice(0, 1).toUpperCase() }}</div>
            </div>
            <div class="comment-main">
              <p class="uname">{{ c.user?.username || '匿名用户' }}</p>
              <p class="c-text">{{ c.comment_text }}</p>
              <div class="actions">
                <span class="time">{{ fmt(c.created_at) }}</span>
                <button v-if="!isReadonlyPreview" class="reply" @click="beginReply(c)">回复</button>
              </div>

              <div v-for="r in visibleReplies(c)" :id="`reply-${r.id}`" :key="r.id" class="reply-row">
                <button v-if="!isReadonlyPreview" type="button" class="avatar sm avatar-btn" @click="openUserAction(r.user)">
                  <img v-if="resolveAvatar(r.user?.avatar)" :src="resolveAvatar(r.user?.avatar)" alt="" />
                  <div v-else class="ph">{{ (r.user?.username || '?').slice(0, 1).toUpperCase() }}</div>
                </button>
                <div v-else class="avatar sm">
                  <img v-if="resolveAvatar(r.user?.avatar)" :src="resolveAvatar(r.user?.avatar)" alt="" />
                  <div v-else class="ph">{{ (r.user?.username || '?').slice(0, 1).toUpperCase() }}</div>
                </div>
                <div class="reply-body">
                  <p class="r-line">
                    <span class="name">{{ r.user?.username || '匿名用户' }}</span>
                    <span class="to" v-if="r.replyToUser"> 回复 {{ r.replyToUser.username }}</span>
                    <span>：{{ r.comment_text }}</span>
                  </p>
                  <p class="r-time">
                    <span>{{ fmt(r.created_at) }}</span>
                    <button v-if="!isReadonlyPreview" class="reply" @click="beginReplyToReply(c, r)">回复</button>
                  </p>
                </div>
              </div>

              <div v-if="hasMoreReplies(c)" class="reply-more-row">
                <button type="button" class="reply-more-btn" @click="toggleReplyExpand(c.id)">
                  {{ isReplyExpanded(c.id) ? '收起回复' : `查看剩余 ${hiddenReplyCount(c)} 条回复` }}
                </button>
              </div>

              <div v-if="replyTargetId === c.id" class="reply-box">
                <div v-if="hasMoreReplies(c)" class="reply-divider" />
                <el-input v-model="replyDraft" type="textarea" :rows="2" />
                <div class="composer-foot">
                  <span class="hint">支持 @用户名</span>
                  <el-button size="small" type="primary" :loading="sendingReply" @click="sendReply(c)">发送回复</el-button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <aside class="side">
        <div class="side-card uploader-card">
          <div class="uploader-head">
            <button type="button" class="uploader-avatar avatar-btn" @click="openUserAction(item.author)">
              <img v-if="resolveAvatar(item.author?.avatar)" :src="resolveAvatar(item.author?.avatar)" alt="" />
              <div v-else class="ph">{{ (item.author?.username || '?').slice(0, 1).toUpperCase() }}</div>
            </button>
            <div class="uploader-copy">
              <div class="uploader-topline">
                <p class="uploader-name">
                  <svg class="name-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 20v-1.2a4.8 4.8 0 0 0-4.8-4.8H8.8A4.8 4.8 0 0 0 4 18.8V20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    <circle cx="12" cy="8.4" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6" />
                    <path d="M16.9 4.1h2.9M18.35 2.7v2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                  {{ item.author?.username || '匿名作者' }}
                </p>
              </div>
              <button
                type="button"
                class="uploader-follow"
                :class="{ on: isFollowingAuthor, disabled: isAuthorSelf }"
                :disabled="isAuthorSelf"
                @click="toggleFollowAuthor(item.author)"
              >
                <svg v-if="isFollowingAuthor" class="u-ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <svg v-else-if="!isAuthorSelf" class="u-ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
                {{ isAuthorSelf ? '自己' : (isFollowingAuthor ? '已关注' : '关注') }} {{ formatWan(authorFansCount) }}
              </button>
            </div>
          </div>
        </div>

        <div class="side-card related-card">
          <h3>相关推荐</h3>
          <button v-for="r in related" :key="r.id" type="button" class="rel" @click="goContent(r.id)">
            <div class="rel-media">
              <img v-if="r.cover_url" :src="r.cover_url" alt="" />
              <div v-else class="ph">{{ typeLabel(r.type) }}</div>
            </div>
            <div class="info">
              <p class="t">{{ r.title }}</p>
              <p class="rel-author">{{ r.author?.username || '匿名作者' }}</p>
              <p class="s">
                <span class="rel-stat">
                  <svg class="rel-ic" viewBox="0 0 24 24" aria-hidden="true">
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
                  {{ formatWan(r.views) }}
                </span>
                <span class="rel-stat">
                  <svg class="rel-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M21 11.5c0 4.2-4.03 7.6-9 7.6-1.2 0-2.35-.2-3.4-.55L3 20l1.25-4.1C3.47 14.78 3 13.2 3 11.5 3 7.3 7.03 3.9 12 3.9s9 3.4 9 7.6Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                  </svg>
                  {{ r._count?.comments ?? 0 }}
                </span>
              </p>
            </div>
          </button>
        </div>
      </aside>
    </div>
  </div>
  <div v-else class="loading">加载中…</div>
  <div v-if="isAdminViewer && item" class="audit-watermark">审核预览</div>

  <el-dialog v-model="userActionOpen" width="460px" title="用户操作" :lock-scroll="false">
    <div v-if="userActionTarget" class="ua">
      <div class="ua-head">
        <div class="ua-avatar">
          <img v-if="resolveAvatar(userActionTarget.avatar)" :src="resolveAvatar(userActionTarget.avatar)" alt="" />
          <div v-else class="ph">{{ (userActionTarget.username || '?').slice(0, 1).toUpperCase() }}</div>
        </div>
        <div class="ua-meta">
          <p class="ua-name">{{ userActionTarget.username }}</p>
          <p class="ua-sub">{{ isFriend(userActionTarget.id) ? '已是好友，可直接聊天' : '还不是好友：只能发送一句打招呼（作为好友申请附言）' }}</p>
        </div>
      </div>

      <div class="ua-chat">
        <div v-if="uaChatItems.length === 0" class="ua-tip">
          {{ isFriend(userActionTarget.id) ? '你们已经是好友了，可以直接去聊天。' : '你可以先发一句打招呼；对方同意好友后才能继续聊天。' }}
        </div>
        <div v-for="m in uaChatItems" :key="m.id" class="ua-msg" :class="{ failed: m.status === 'failed' }">
          <div class="ua-msg-meta">
            <img :src="currentAvatar || ''" class="ua-ava" />
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
        <el-button @click="goHome(userActionTarget.id)">主页</el-button>
        <el-button @click="userActionOpen = false">取消</el-button>
        <el-button v-if="!isFriend(userActionTarget.id)" :disabled="uaSentOnce" @click="helloDraft = `你好，我是 ${String(userStore.user?.username ?? '我')}～`">重写一句</el-button>
        <el-button v-if="!isFriend(userActionTarget.id)" type="primary" :loading="uaSending" @click="sendHelloOrApply(userActionTarget.id)">
          {{ uaSentOnce ? '已发送' : '发送（自动申请好友）' }}
        </el-button>
        <el-button v-else type="primary" @click="goChat(userActionTarget.id)">去聊天</el-button>
        <el-button v-if="isFriend(userActionTarget.id)" type="danger" plain @click="removeFriend(userActionTarget.id)">
          取消关注
        </el-button>
      </div>

      <el-input
        v-if="!isFriend(userActionTarget.id)"
        v-model="helloDraft"
        type="textarea"
        :rows="2"
        class="ua-input"
        :disabled="uaSentOnce"
        placeholder="输入一句打招呼…"
        @keydown.enter.exact.prevent="sendHelloOrApply(userActionTarget.id)"
      />
    </div>
  </el-dialog>

  <el-dialog v-model="favDialogOpen" width="420px" title="收藏到">
    <div class="fav-create-row">
      <el-input
        v-model="newFolderName"
        placeholder="新建收藏夹名称"
        @keyup.enter="createFavoriteFolder"
      />
      <el-button :loading="creatingFolder" @click="createFavoriteFolder">新建</el-button>
    </div>
    <el-select v-model="favTargetFolderId" style="width: 100%">
      <el-option
        v-for="f in favoriteFolders"
        :key="f.id"
        :label="`${f.name}（${f._count?.items ?? 0}）`"
        :value="f.id"
      />
    </el-select>
    <template #footer>
      <el-button @click="favDialogOpen = false">取消</el-button>
      <el-button type="primary" :loading="favBusy" @click="confirmFavorite">
        确认收藏
      </el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="editOpen" width="620px" title="编辑投稿">
    <div v-if="item" class="edit-grid">
      <el-input v-model="editForm.title" maxlength="60" placeholder="标题" />
      <el-select v-model="editForm.categorySlug" style="width: 100%" filterable @change="onEditCategoryChange">
        <el-option v-for="c in editCategories" :key="c.id" :label="`${c.name}${c.status === 'pending' ? '（待审核）' : ''}`" :value="c.slug" />
      </el-select>
      <template v-if="item.type !== 'article'">
        <el-input v-model="editForm.summary" type="textarea" :rows="4" maxlength="2000" placeholder="摘要" />
      </template>
      <template v-else>
        <MarkdownEditor v-model="editForm.body" />
      </template>
      <el-select
        v-model="editForm.tags"
        style="width: 100%"
        multiple
        filterable
        allow-create
        default-first-option
        :reserve-keyword="false"
        collapse-tags
        :max-collapse-tags="3"
        collapse-tags-tooltip
        placeholder="输入标签后按 Enter 添加（最多 12 个）"
      />
    </div>
    <template #footer>
      <el-button @click="editOpen = false">取消</el-button>
      <el-button type="primary" :loading="editSaving" @click="saveEdit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { marked } from 'marked';
import api from '../services/api';
import type { ContentItem } from '../types';
import { useUserStore } from '../stores/user';
import MarkdownEditor from '../components/MarkdownEditor.vue';

type ContentComment = {
  id: number;
  comment_text: string;
  created_at: string;
  user?: { id: number; username: string; avatar?: string | null };
  replyToUser?: { id: number; username: string; avatar?: string | null } | null;
  replies?: ContentComment[];
};

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const item = ref<ContentItem | null>(null);
const related = ref<ContentItem[]>([]);
const comments = ref<ContentComment[]>([]);
const commentTotal = ref(0);
const commentSort = ref<'hot' | 'latest'>('hot');
const introExpanded = ref(false);
const draft = ref('');
const sending = ref(false);
const replyTargetId = ref(0);
const replyParentCommentId = ref(0);
const replyToUserId = ref<number | null>(null);
const replyExpandedMap = ref<Record<number, boolean>>({});
const replyDraft = ref('');
const sendingReply = ref(false);
const editOpen = ref(false);
const editSaving = ref(false);
const editCategories = ref<Array<{ id: number; name: string; slug: string; status?: string }>>([]);
const editForm = ref({ title: '', summary: '', body: '', categorySlug: '', tags: [] as string[] });

const id = () => Number(route.params.id);
const typeLabel = (t: string) => ({ video: '视频', image: '插画', article: '专栏' } as any)[t] ?? t;
const getHistoryStorageKey = () => `sv_browse_history_${userStore.user?.id ?? 'guest'}`;

const recordBrowseHistory = () => {
  if (!item.value) return;
  const contentId = item.value.id;
  const key = getHistoryStorageKey();
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as Array<{ id: number; viewedAt: number }>) : [];
    const safeList = Array.isArray(list) ? list : [];
    const next = safeList.filter((x) => x && Number(x.id) !== contentId);
    next.unshift({ id: contentId, viewedAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(next.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
};

const resolveAvatar = (src?: string | null) => {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
};
const currentUsername = computed(() => String(userStore.user?.username ?? ''));
const currentAvatar = computed(() => resolveAvatar(userStore.user?.avatar ?? ''));
const isAdminViewer = computed(() => String(userStore.user?.role ?? '') === 'admin');
const isReadonlyPreview = computed(() => String(item.value?.status ?? 'published') !== 'published');
const isAuthorSelf = computed(() => Number(item.value?.author?.id ?? 0) === Number(userStore.user?.id ?? 0));
const isFollowingAuthor = computed(() => isFriend(Number(item.value?.author?.id ?? 0)));
const canManage = computed(() => {
  if (!item.value || !userStore.user) return false;
  return Number(item.value.author?.id ?? 0) === Number(userStore.user.id) || userStore.user.role === 'admin';
});
const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const userActionOpen = ref(false);
const userActionTarget = ref<{ id: number; username: string; avatar?: string | null } | null>(null);
const helloDraft = ref('');
const uaSending = ref(false);
const friendIdSet = ref<Set<number>>(new Set());
const uaSentOnce = ref(false);
const uaChatItems = ref<Array<{ id: number; text: string; status: 'sent' | 'failed' }>>([]);
const commentsEl = ref<HTMLElement | null>(null);
const likeBusy = ref(false);
const favBusy = ref(false);
const galleryIndex = ref(0);
const authorFansCount = ref(0);
const favoriteFolders = ref<Array<{ id: number; name: string; _count?: { items: number } }>>([]);
const favDialogOpen = ref(false);
const favTargetFolderId = ref(0);
const newFolderName = ref('');
const creatingFolder = ref(false);

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

const openUserAction = async (u?: { id: number; username: string; avatar?: string | null } | null) => {
  if (isAdminViewer.value) return;
  if (!u?.id) return;
  if (Number(userStore.user?.id ?? 0) === u.id) return;
  await ensureFriendsLoaded();
  userActionTarget.value = { id: u.id, username: u.username, avatar: u.avatar ?? null };
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

const removeFriend = async (friendId: number) => {
  try {
    await ElMessageBox.confirm('确定取消关注并删除该好友吗？', '取消关注', {
      type: 'warning',
      confirmButtonText: '取消关注',
      cancelButtonText: '返回'
    });
    await api.delete(`/friends/${friendId}`);
    const next = new Set(friendIdSet.value);
    next.delete(friendId);
    friendIdSet.value = next;
    userActionOpen.value = false;
    ElMessage.success('已取消关注');
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.response?.data?.message ?? '取消失败');
    }
  }
};

const toggleFollowAuthor = async (u?: { id: number; username: string; avatar?: string | null } | null) => {
  if (isAdminViewer.value) return;
  if (!u?.id || Number(userStore.user?.id ?? 0) === u.id) return;
  await ensureFriendsLoaded();
  if (isFriend(u.id)) {
    await removeFriend(u.id);
    return;
  }
  await openUserAction(u);
};

const goHome = (userId: number) => {
  userActionOpen.value = false;
  void router.push(`/users/${userId}`);
};

const loadFavoriteFolders = async () => {
  const { data } = await api.get('/contents/favorites/folders');
  favoriteFolders.value = data.items ?? [];
  if (!favTargetFolderId.value && favoriteFolders.value.length) {
    favTargetFolderId.value = favoriteFolders.value[0]!.id;
  }
};

const createFavoriteFolder = async () => {
  const name = newFolderName.value.trim();
  if (!name || creatingFolder.value) return;
  creatingFolder.value = true;
  try {
    await api.post('/contents/favorites/folders', { name });
    newFolderName.value = '';
    await loadFavoriteFolders();
    const created = favoriteFolders.value.find((f) => f.name === name);
    if (created) favTargetFolderId.value = created.id;
    ElMessage.success('收藏夹已创建');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '创建失败');
  } finally {
    creatingFolder.value = false;
  }
};

const renderedBody = computed(() => {
  const raw = item.value?.body || item.value?.summary || '暂无内容';
  return marked.parse(raw, { breaks: true }) as string;
});
const introText = computed(() => {
  if (!item.value) return '暂无简介';
  return String(item.value.summary ?? item.value.body ?? '暂无简介').trim() || '暂无简介';
});
const showIntroToggle = computed(() => introText.value.length > 96);
const getReplies = (c: ContentComment) => c.replies ?? [];
const isReplyExpanded = (commentId: number) => Boolean(replyExpandedMap.value[commentId]);
const hasMoreReplies = (c: ContentComment) => getReplies(c).length > 2;
const hiddenReplyCount = (c: ContentComment) => Math.max(getReplies(c).length - 2, 0);
const visibleReplies = (c: ContentComment) => {
  const list = getReplies(c);
  return isReplyExpanded(c.id) ? list : list.slice(0, 2);
};
const toggleReplyExpand = (commentId: number) => {
  replyExpandedMap.value = {
    ...replyExpandedMap.value,
    [commentId]: !isReplyExpanded(commentId)
  };
};
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
const loadAuthorFansCount = async () => {
  const uid = Number(item.value?.author?.id ?? 0);
  if (!uid) {
    authorFansCount.value = 0;
    return;
  }
  try {
    const { data } = await api.get(`/auth/users/${uid}`);
    authorFansCount.value = Number(data?.user?.follower_count ?? 0);
  } catch {
    authorFansCount.value = 0;
  }
};
const galleryUrls = computed(() => {
  if (item.value?.type !== 'image') return [] as string[];
  const base = [String(item.value?.cover_url ?? ''), String(item.value?.media_url ?? '')].map((x) => x.trim()).filter(Boolean);
  const raw = String(item.value?.body ?? '').trim();
  if (!raw) return Array.from(new Set(base));
  try {
    const parsed = JSON.parse(raw) as { gallery?: string[] } | string[];
    const list =
      Array.isArray(parsed)
        ? parsed.map((x) => String(x ?? '').trim()).filter(Boolean)
        : Array.isArray((parsed as { gallery?: string[] })?.gallery)
          ? ((parsed as { gallery?: string[] }).gallery ?? []).map((x) => String(x ?? '').trim()).filter(Boolean)
          : [];
    if (list.length) return Array.from(new Set([...list, ...base]));
  } catch {
    // fallback: allow newline/comma separated legacy body urls
    const legacy = raw
      .split(/\r?\n|,/g)
      .map((x) => x.trim())
      .filter((x) => /^https?:\/\//.test(x) || x.startsWith('/uploads/'));
    if (legacy.length) return Array.from(new Set([...legacy, ...base]));
  }
  return Array.from(new Set(base));
});
const onGalleryChange = (current: number) => {
  galleryIndex.value = Number.isFinite(current) ? current : 0;
};

const focusAnchorFromQuery = async () => {
  if (String(route.query.view ?? '') === 'comments') {
    await nextTick();
    commentsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

const load = async () => {
  const [{ data: detail }, { data: cmt }] = await Promise.all([
    api.get(`/contents/${id()}`),
    api.get(`/contents/${id()}/comments`, { params: { page: 1, pageSize: 50 } })
  ]);
  item.value = detail.item as ContentItem;
  introExpanded.value = false;
  replyExpandedMap.value = {};
  galleryIndex.value = 0;
  comments.value = (cmt.items ?? []) as ContentComment[];
  commentTotal.value = Number(cmt.total ?? comments.value.length);
  if (item.value?.category?.slug) {
    const { data: rel } = await api.get('/contents', {
      params: { page: 1, pageSize: 8, category: item.value.category.slug, sort: 'hot' }
    });
    related.value = ((rel.items ?? []) as ContentItem[]).filter((x) => x.id !== item.value!.id).slice(0, 6);
  } else {
    related.value = [];
  }
  await Promise.all([loadAuthorFansCount(), ensureFriendsLoaded()]);
  await focusAnchorFromQuery();
  recordBrowseHistory();
};

const loadEditCategories = async (force = false) => {
  const mine = await api.get('/categories/mine', {
    params: force ? { _t: Date.now() } : undefined
  });
  editCategories.value = mine.data.items ?? [];
};

const onEditCategoryChange = async (value: string) => {
  const v = String(value ?? '').trim();
  if (!v) return;
  const hit = editCategories.value.find((c) => c.slug === v);
  if (hit) {
    editForm.value.categorySlug = hit.slug;
    return;
  }
  ElMessage.warning('分区为固定大类，请从列表中选择');
  editForm.value.categorySlug = editCategories.value.find((c) => c.slug === 'default')?.slug ?? editCategories.value[0]?.slug ?? '';
};

const openEdit = async () => {
  if (!item.value) return;
  await loadEditCategories();
  if (item.value.type === 'article') {
    editForm.value = {
      title: item.value.title,
      summary: '',
      body: String(item.value.body ?? item.value.summary ?? ''),
      categorySlug: item.value.category?.slug ?? '',
      tags: (item.value.tags ?? []).map((t) => String(t.tag?.name ?? '')).filter(Boolean)
    };
  } else {
    editForm.value = {
      title: item.value.title,
      summary: String(item.value.summary ?? item.value.body ?? ''),
      body: '',
      categorySlug: item.value.category?.slug ?? '',
      tags: (item.value.tags ?? []).map((t) => String(t.tag?.name ?? '')).filter(Boolean)
    };
  }
  editOpen.value = true;
};

const saveEdit = async () => {
  if (!item.value) return;
  const title = editForm.value.title.trim();
  if (!title) return ElMessage.warning('标题不能为空');
  if (!editForm.value.categorySlug) return ElMessage.warning('请选择分区');
  editSaving.value = true;
  try {
    const { data } = await api.patch(`/contents/${item.value.id}`, {
      title,
      summary: item.value.type === 'article' ? undefined : editForm.value.summary.trim() || undefined,
      body: item.value.type === 'article' ? editForm.value.body.trim() || undefined : undefined,
      category_slug: editForm.value.categorySlug,
      tags: editForm.value.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    });
    item.value = data.item as ContentItem;
    editOpen.value = false;
    ElMessage.success(data?.repending ? '已更新，稿件已重新进入审核' : '已更新');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '更新失败');
  } finally {
    editSaving.value = false;
  }
};

const toggleLike = async () => {
  if (!item.value || likeBusy.value) return;
  likeBusy.value = true;
  try {
    if (item.value.liked) {
      const { data } = await api.delete(`/contents/${item.value.id}/likes`);
      item.value.liked = false;
      item.value._count = { ...(item.value._count ?? { likes: 0, favoriteItems: 0, comments: 0 }), likes: Number(data.likeCount ?? 0) };
    } else {
      const { data } = await api.post(`/contents/${item.value.id}/likes`);
      item.value.liked = true;
      item.value._count = { ...(item.value._count ?? { likes: 0, favoriteItems: 0, comments: 0 }), likes: Number(data.likeCount ?? 0) };
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '点赞操作失败');
  } finally {
    likeBusy.value = false;
  }
};

const toggleFavorite = async () => {
  if (!item.value || favBusy.value) return;
  try {
    if (item.value.favored) {
      favBusy.value = true;
      const { data } = await api.delete(`/contents/${item.value.id}/favorites`);
      item.value.favored = false;
      item.value._count = { ...(item.value._count ?? { likes: 0, favoriteItems: 0, comments: 0 }), favoriteItems: Number(data.favoriteCount ?? 0) };
    } else {
      if (!favoriteFolders.value.length) await loadFavoriteFolders();
      if (!favoriteFolders.value.length) return ElMessage.warning('请先创建收藏夹');
      favDialogOpen.value = true;
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '收藏操作失败');
  } finally {
    favBusy.value = false;
  }
};

const confirmFavorite = async () => {
  if (!item.value || !favTargetFolderId.value || favBusy.value) return;
  favBusy.value = true;
  try {
    const { data } = await api.post(`/contents/${item.value.id}/favorites`, { folder_id: favTargetFolderId.value });
    item.value.favored = true;
    item.value._count = {
      ...(item.value._count ?? { likes: 0, favoriteItems: 0, comments: 0 }),
      favoriteItems: Number(data.favoriteCount ?? item.value._count?.favoriteItems ?? 0)
    };
    favDialogOpen.value = false;
    ElMessage.success('收藏成功');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '收藏失败');
  } finally {
    favBusy.value = false;
  }
};

const removeContent = async () => {
  if (!item.value) return;
  await ElMessageBox.confirm('确认删除该投稿？删除后不可恢复。', '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  });
  await api.delete(`/contents/${item.value.id}`);
  ElMessage.success('已删除');
  await router.replace('/videos');
};

const sortedComments = computed(() => {
  const arr = [...comments.value];
  if (commentSort.value === 'latest') {
    return arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return arr.sort((a, b) => (b.replies?.length ?? 0) - (a.replies?.length ?? 0) || (+new Date(b.created_at) - +new Date(a.created_at)));
});

const send = async () => {
  const text = draft.value.trim();
  if (!text) return ElMessage.warning('评论不能为空');
  sending.value = true;
  try {
    await api.post(`/contents/${id()}/comments`, { content: text });
    draft.value = '';
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发布失败');
  } finally {
    sending.value = false;
  }
};

const beginReply = (c: ContentComment) => {
  replyTargetId.value = c.id;
  replyParentCommentId.value = c.id;
  replyToUserId.value = c.user?.id ?? null;
  replyDraft.value = `@${c.user?.username || ''} `;
};

const beginReplyToReply = (parent: ContentComment, target: ContentComment) => {
  replyTargetId.value = parent.id;
  replyParentCommentId.value = parent.id;
  replyToUserId.value = target.user?.id ?? null;
  replyDraft.value = `@${target.user?.username || ''} `;
};

const sendReply = async (c: ContentComment) => {
  const text = replyDraft.value.trim();
  if (!text) return ElMessage.warning('回复不能为空');
  sendingReply.value = true;
  try {
    const parentId = Number(replyParentCommentId.value || c.id || 0);
    if (!parentId) return ElMessage.warning('回复目标无效');
    await api.post(`/contents/${id()}/comments`, {
      content: text,
      parent_id: parentId,
      reply_to_user_id: replyToUserId.value ?? c.user?.id
    });
    replyTargetId.value = 0;
    replyParentCommentId.value = 0;
    replyToUserId.value = null;
    replyDraft.value = '';
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '回复失败');
  } finally {
    sendingReply.value = false;
  }
};

// avatar click -> openUserAction

const goContent = (contentId: number) => {
  void router.push(`/contents/${contentId}`);
};

watch(
  () => route.params.id,
  () => {
    void load();
  }
);

watch(
  () => route.fullPath,
  () => {
    void focusAnchorFromQuery();
  }
);

onMounted(() => {
  void loadFavoriteFolders().catch(() => {});
  void load();
});
</script>

<style scoped>
.page { max-width: 1220px; margin: 0 auto; padding: 22px; }
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}
.detail {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148,163,184,.34);
}
.detail h1 { margin: 0 0 8px; font-size: 28px; }
.detail-meta {
  margin: 0;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 13px;
}
.meta-ic { width: 14px; height: 14px; flex: 0 0 auto; color: #94a3b8; }
.meta-item.warn { color: #7c8593; }
.edit-grid { display: grid; gap: 10px; }
.media {
  margin-top: 12px;
  border: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  width: 100%;
  aspect-ratio: 16 / 9;
}
.media video, .media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
.media.image {
  max-width: 900px;
  margin: 12px auto 0;
  position: relative;
}
.gallery-carousel { width: 100%; height: 100%; }
.gallery-main { width: 100%; height: 100%; display: block; }
:deep(.gallery-main .el-image__inner) { width: 100%; height: 100%; object-fit: contain; }
:deep(.gallery-carousel .el-carousel__arrow) {
  width: 34px;
  height: 34px;
  background: rgba(15,23,42,.55);
}
:deep(.gallery-carousel .el-carousel__arrow:hover) { background: rgba(15,23,42,.72); }
.gallery-dot {
  position: absolute;
  right: 10px;
  bottom: 10px;
  border-radius: 999px;
  padding: 4px 9px;
  background: rgba(15,23,42,.62);
  color: #fff;
  font-size: 12px;
  line-height: 1;
}
.fav-create-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 10px;
}
.article {
  margin-top: 12px;
  background: rgba(255,255,255,.82);
  border: 0;
  border-radius: 10px;
  padding: 16px;
  min-width: 0;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
}
.intro-block {
  margin-top: 12px;
  padding: 10px 0 2px;
  border-bottom: 1px solid rgba(148,163,184,.34);
}
.intro-text {
  margin: 0;
  color: #334155;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.intro-block.expanded .intro-text {
  display: block;
}
.intro-toggle {
  margin-top: 8px;
  border: 0;
  border-bottom: 1px solid rgba(14,165,233,.34);
  background: transparent;
  color: #0284c7;
  font-size: 12px;
  line-height: 1.2;
  padding: 2px 0;
  cursor: pointer;
}
.intro-toggle:hover { border-bottom-color: rgba(14,165,233,.55); }
.illustration-panel { display: grid; gap: 10px; }
.tags-row { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.tag { padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(15,23,42,.14); background: #f8fafc; color: #334155; font-size: 12px; }
.action-row { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
.action-btn {
  border: 1px solid rgba(15,23,42,.14);
  border-radius: 999px;
  padding: 6px 12px;
  background: #fff;
  cursor: pointer;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.action-btn.on { border-color: rgba(0,161,214,.45); color: var(--accent); background: var(--accent-soft); }
.action-btn:disabled { opacity: .55; cursor: not-allowed; }
.btn-ic { width: 16px; height: 16px; flex: 0 0 auto; }
.btn-text { font-weight: 700; }
.readonly-tip {
  margin: 10px 0 0;
  border: 1px dashed rgba(245,158,11,.4);
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  padding: 8px 10px;
}
.markdown-body :deep(h1) { margin: 14px 0 8px; line-height: 1.3; font-size: 26px; font-weight: 900; }
.markdown-body :deep(h2) { margin: 14px 0 8px; line-height: 1.3; font-size: 20px; font-weight: 800; }
.markdown-body :deep(h3) { margin: 14px 0 8px; line-height: 1.3; font-size: 16px; font-weight: 800; }
.markdown-body { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.markdown-body :deep(*) { max-width: 100%; }
.markdown-body :deep(p) { margin: 10px 0; line-height: 1.9; color: #334155; overflow-wrap: anywhere; word-break: break-word; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 20px; color: #334155; line-height: 1.9; overflow-wrap: anywhere; word-break: break-word; }
.markdown-body :deep(li) { overflow-wrap: anywhere; word-break: break-word; }
.markdown-body :deep(code) { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-size: 12px; overflow-wrap: anywhere; word-break: break-word; white-space: break-spaces; }
.markdown-body :deep(pre) { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 8px; overflow: auto; }
.markdown-body :deep(blockquote) { margin: 10px 0; padding: 8px 12px; border-left: 3px solid #94a3b8; background: #f8fafc; color: #475569; overflow-wrap: anywhere; word-break: break-word; }
.markdown-body :deep(img) { max-width: 100%; border-radius: 8px; border: 1px solid rgba(15,23,42,.1); margin: 8px 0; }
.comments {
  margin-top: 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 14px 0;
}
.comments-head {
  padding: 0 0 10px;
  border-bottom: 0;
}
.composer-row,
.comment-card {
  padding-left: 2px;
  padding-right: 2px;
}
.comments h3 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
.comment-tabs { display: flex; gap: 12px; }
.tab { border: 0; background: transparent; color: #94a3b8; cursor: pointer; font-weight: 600; }
.tab.on { color: #0f172a; }
.composer-row { display: grid; grid-template-columns: 44px 1fr; gap: 12px; margin-bottom: 14px; }
.composer { display: grid; gap: 8px; }
.composer-foot { display: flex; justify-content: space-between; align-items: center; }
.hint { color: #94a3b8; font-size: 12px; }
.comment-card {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  padding: 12px 0;
  border-top: 0;
  transition: background-color .2s;
}
.comment-main { min-width: 0; }
.uname { margin: 0 0 6px; color: #64748b; font-size: 14px; }
.c-text { margin: 0 0 8px; color: #0f172a; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
.actions { display: flex; gap: 14px; align-items: center; }
.time { color: #94a3b8; font-size: 12px; }
.reply { border: none; background: transparent; color: var(--accent); cursor: pointer; padding: 0; }
.reply-box { margin: 10px 0; display: grid; gap: 8px; }
.reply-divider {
  width: 100%;
  height: 1px;
  background: rgba(148,163,184,.5);
  margin-bottom: 6px;
}
.reply-row {
  margin-top: 8px;
  padding: 8px 2px 6px;
  border-radius: 0;
  border-bottom: 0;
  background: transparent;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 8px;
}
.reply-more-row {
  margin-top: 8px;
}
.reply-more-btn {
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.38);
  background: transparent;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 0;
}
.reply-more-btn:hover {
  color: #0284c7;
  border-bottom-color: rgba(14,165,233,.5);
}
.reply-body { min-width: 0; }
.r-line { margin: 0; font-size: 14px; color: #334155; line-height: 1.7; }
.r-time {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.name { font-weight: 700; color: #0f172a; }
.to { color: #64748b; }
.avatar { border-radius: 999px; overflow: hidden; border: 0; background: #f3f4f6; display: grid; place-items: center; }
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar .ph { color: #64748b; font-weight: 700; font-size: 12px; }
.avatar-btn { border: 0; cursor: pointer; padding: 0; transition: box-shadow .18s, transform .18s; }
.avatar-btn:hover { box-shadow: 0 0 0 1px rgba(0,161,214,.35); transform: translateY(-1px); }
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
.avatar.lg { width: 44px; height: 44px; }
.avatar.md { width: 44px; height: 44px; }
.avatar.sm { width: 32px; height: 32px; }
.side {
  position: sticky;
  top: 0;
  align-self: start;
  height: fit-content;
  display: grid;
  gap: 12px;
}
.side-card {
  border: 0;
  border-radius: 10px;
  background: rgba(255,255,255,.84);
  padding: 12px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
}
.uploader-card {
  border-bottom: 0;
  background: transparent;
  box-shadow: none;
  padding: 0 0 8px;
}
.side h3 { margin: 0 0 10px; font-size: 16px; }
.uploader-head { display: grid; grid-template-columns: 48px 1fr; gap: 12px; align-items: center; }
.uploader-avatar { width: 48px; height: 48px; border-radius: 999px; overflow: hidden; }
.uploader-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.uploader-avatar .ph { width: 100%; height: 100%; }
.uploader-copy { min-width: 0; }
.uploader-topline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.u-ic { width: 14px; height: 14px; color: #94a3b8; flex: 0 0 auto; }
.uploader-name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.name-ic { width: 14px; height: 14px; color: #0ea5e9; flex: 0 0 auto; }
.uploader-follow {
  width: 100%;
  margin-top: 10px;
  border: 0;
  background: #0ea5e9;
  color: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.uploader-follow.on {
  background: #0284c7;
}
.uploader-follow.disabled {
  background: #cbd5e1;
  color: #475569;
  cursor: default;
}
.uploader-follow .u-ic { color: #fff; }
.uploader-follow.disabled .u-ic { color: #475569; }
.related-card {
  background: transparent;
  box-shadow: none;
  padding: 4px 0 4px;
}
.rel { width: 100%; border: 0; border-bottom: 1px solid rgba(15,23,42,.08); background: transparent; padding: 10px 0; text-align: left; cursor: pointer; display: grid; grid-template-columns: 104px 1fr; gap: 10px; }
.rel:last-child { border-bottom: 0; }
.rel-media img, .rel-media .ph { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
.ph { display: grid; place-items: center; color: #64748b; background: #f1f5f9; }
.info { min-width: 0; }
.t { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rel-author { margin: 0 0 6px; font-size: 12px; color: #64748b; }
.s { margin: 0; font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rel-stat { display: inline-flex; align-items: center; gap: 6px; }
.rel-ic { width: 14px; height: 14px; color: #94a3b8; flex: 0 0 auto; }
.anchor-hit { background: rgba(0, 161, 214, 0.08); border-radius: 8px; }
.loading { max-width: 980px; margin: 0 auto; padding: 40px 22px; color: var(--muted); }
.audit-watermark {
  position: fixed;
  right: 18px;
  bottom: 18px;
  pointer-events: none;
  user-select: none;
  border: 1px dashed rgba(239,68,68,.35);
  color: rgba(239,68,68,.72);
  background: rgba(255,255,255,.76);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  z-index: 60;
}
.main-video .media,
.main-image .illustration-panel,
.main-article .article,
.main .comments,
.main-video .intro-block,
.main-image .intro-block,
.main-video .tags-row,
.main-image .tags-row,
.main-video .action-row,
.main-image .action-row,
.main-video .readonly-tip,
.main-image .readonly-tip,
.main-article .tags-row,
.main-article .action-row,
.main-article .readonly-tip {
  max-width: 920px;
}
.main-video .intro-block,
.main-image .intro-block,
.main-video .tags-row,
.main-image .tags-row,
.main-video .action-row,
.main-image .action-row,
.main-video .readonly-tip,
.main-image .readonly-tip,
.main .comments,
.main-article .tags-row,
.main-article .action-row,
.main-article .readonly-tip {
  padding-left: 12px;
  padding-right: 12px;
}
@media (max-width: 980px) { .layout { grid-template-columns: 1fr; } .side { position: static; } }
@media (max-width: 680px) {
  .comments h3 { font-size: 22px; }
  .composer-row, .comment-card { grid-template-columns: 36px 1fr; gap: 10px; }
  .avatar.lg, .avatar.md { width: 36px; height: 36px; }
  .rel { grid-template-columns: 92px 1fr; }
  .main-video .intro-block,
  .main-image .intro-block,
  .main-video .tags-row,
  .main-image .tags-row,
  .main-video .action-row,
  .main-image .action-row,
  .main-video .readonly-tip,
  .main-image .readonly-tip,
  .main .comments,
  .main-article .tags-row,
  .main-article .action-row,
  .main-article .readonly-tip {
    padding-left: 6px;
    padding-right: 6px;
  }
}
</style>
