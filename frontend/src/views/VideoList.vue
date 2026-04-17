<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1 class="hero-title">
          <svg class="hero-title-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 14.4 9.6 21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" fill="currentColor" />
          </svg>
          搜索即内容
        </h1>
        <p>视频、插画、专栏统一信息流。只展示与你搜索相关的结果。</p>
      </div>
      <router-link to="/upload" class="publish">
        <svg class="publish-ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
        </svg>
        发布内容
      </router-link>
    </header>

    <section class="filters">
      <div class="bar">
        <div class="bar-left">
          <span class="bar-hint">
            <svg class="bar-hint-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M7 12h10m-7 6h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            筛选
          </span>
          <el-popover v-model:visible="typeOpen" placement="bottom-start" :width="240" trigger="click" popper-class="type-pop">
            <template #reference>
              <button type="button" class="chip chip-dd" :class="{ on: Boolean(type) }">
                类型<span v-if="currentTypeLabel !== '全部'"> · {{ currentTypeLabel }}</span>
                <span class="chev" aria-hidden="true">▾</span>
              </button>
            </template>
            <div class="type-panel">
              <button type="button" class="type-item" :class="{ on: type === '' }" @click="pickType('')">综合</button>
              <button type="button" class="type-item" :class="{ on: type === 'video' }" @click="pickType('video')">视频</button>
              <button type="button" class="type-item" :class="{ on: type === 'image' }" @click="pickType('image')">插画</button>
              <button type="button" class="type-item" :class="{ on: type === 'article' }" @click="pickType('article')">专栏</button>
            </div>
          </el-popover>

          <el-popover v-model:visible="catOpen" placement="bottom-start" :width="340" trigger="click" popper-class="cat-pop">
            <template #reference>
              <button type="button" class="chip chip-dd" :class="{ on: Boolean(category) }">
                分区<span v-if="currentCategoryLabel !== '全部'"> · {{ currentCategoryLabel }}</span>
                <span class="chev" aria-hidden="true">▾</span>
              </button>
            </template>
            <div class="cat-panel">
              <button type="button" class="cat-item" :class="{ on: category === '' }" @click="pickCategory('')">全部分区</button>
              <button v-for="c in categories" :key="c.slug" type="button" class="cat-item" :class="{ on: category === c.slug }" @click="pickCategory(c.slug)">
                {{ c.name }}
              </button>
            </div>
          </el-popover>
        </div>

        <div class="bar-right">
          <el-tooltip
            content="支持标签搜索：输入 #标签 或多个 #标签（如 #二创 #教程）"
            placement="top"
          >
            <span class="search-tip" role="note" aria-label="标签搜索提示">
              <svg class="search-tip-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h4.38a3.5 3.5 0 0 1 2.47 1.03l5.62 5.62a3.5 3.5 0 0 1 0 4.95l-4.7 4.7a3.5 3.5 0 0 1-4.95 0L4.7 14.68a3.5 3.5 0 0 1 0-4.95L8.4 6.03" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="10" cy="9.5" r="1.2" fill="currentColor" />
              </svg>
              标签搜索
            </span>
          </el-tooltip>
          <div class="seg" role="tablist" aria-label="排序">
            <button
              type="button"
              class="seg-btn"
              role="tab"
              :aria-selected="sort === 'latest'"
              :class="{ on: sort === 'latest' }"
              @click="
                sort = 'latest';
                page = 1;
                void load(true);
              "
            >
              最新
            </button>
            <button
              type="button"
              class="seg-btn"
              role="tab"
              :aria-selected="sort === 'hot'"
              :class="{ on: sort === 'hot' }"
              @click="
                sort = 'hot';
                page = 1;
                void load(true);
              "
            >
              最热
            </button>
          </div>
        </div>
      </div>
    </section>

    <transition name="fade" mode="out-in">
      <section v-if="false" class="featured">
        <header class="featured-head">
          <div>
            <h2>今日推荐</h2>
            <p>按当前排序挑选最值得一看的内容</p>
          </div>
          <span class="featured-badge">{{ sort === 'hot' ? '最热' : '最新' }}</span>
        </header>

        <div v-if="featuredLoading" class="featured-grid skel-grid">
          <div v-for="n in 4" :key="`feat-skel-${n}`" class="card skel-card">
            <div class="skel-cover"></div>
            <div class="skel-body">
              <div class="skel-line l1"></div>
              <div class="skel-line l2"></div>
              <div class="skel-meta"></div>
            </div>
          </div>
        </div>

        <el-empty v-else-if="featuredItems.length === 0" description="暂无推荐" />

        <div v-else class="featured-grid">
          <article v-for="it in featuredItems" :key="it.id" class="card featured-card">
            <button type="button" class="cover-wrap" @click="openItem(it)">
              <img v-if="it.cover_url" :src="it.cover_url" alt="" class="cover" />
              <div v-else class="cover-ph">{{ typeLabel(it.type) }}</div>
              <span class="type">{{ typeLabel(it.type) }}</span>
            </button>
            <div class="body featured-body">
              <h3 class="title" @click="openItem(it)">{{ it.title }}</h3>
              <p class="desc">
                {{
                  it.type === 'article' ? formatArticleDesc(it.body || it.summary || '') : it.summary || it.body || '暂无描述'
                }}
              </p>
              <div class="meta">
                <span class="tag"># {{ it.category?.name || '未分区' }}</span>
                <span class="views">
                  <svg class="ic-eye" viewBox="0 0 24 24" aria-hidden="true">
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
                  {{ it.views }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </transition>

    <transition name="fade" mode="out-in">
      <section
        v-if="gridLoading"
        key="loading"
        class="grid skel-grid"
        :class="{ 'fixed-grid': fixedGrid }"
        :style="gridStyle"
      >
        <article v-for="n in skeletonCount" :key="`grid-skel-${n}`" class="card skel-card">
          <div class="skel-cover"></div>
          <div class="skel-body">
            <div class="skel-line l1"></div>
            <div class="skel-line l2"></div>
            <div class="skel-meta"></div>
            <div class="skel-ops"></div>
          </div>
        </article>
      </section>

      <section v-else-if="items.length === 0" key="empty" class="empty">
        <el-empty description="暂无内容" />
      </section>

      <section v-else key="grid" class="grid" :class="{ 'fixed-grid': fixedGrid }" :style="gridStyle">
        <article v-for="it in items" :key="it.id" class="card">
          <button type="button" class="cover-wrap" @click="openItem(it)">
            <img v-if="it.cover_url" :src="it.cover_url" alt="" class="cover" />
            <div v-else class="cover-ph">{{ typeLabel(it.type) }}</div>
            <span class="type">{{ typeLabel(it.type) }}</span>
            <div class="video-overlay" aria-hidden="true">
              <div class="video-stats">
                <span class="video-stat">
                  <svg class="video-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 7v10l10-5-10-5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                  </svg>
                  {{ formatWan(it.views) }}
                </span>
                <span class="video-stat">
                  <svg class="video-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M21 14a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                  </svg>
                  {{ it._count?.comments ?? 0 }}
                </span>
              </div>
            </div>
          </button>
          <div class="body">
            <h3 class="title compact-title" @click="openItem(it)">{{ it.title }}</h3>
            <div class="card-meta-row">
              <span v-if="isFriend(it.author?.id)" class="follow-pill">已关注</span>
              <el-popover
                placement="bottom-start"
                :width="220"
                trigger="hover"
                popper-class="author-popover"
              >
                <template #reference>
                  <button type="button" class="author-name-btn" @click="goHome(it.author?.id)">
                    {{ it.author?.username || '匿名作者' }}
                  </button>
                </template>
                <div class="author-pop">
                  <p class="author-pop-name">{{ it.author?.username || '匿名作者' }}</p>
                  <div class="author-pop-actions">
                    <button type="button" class="author-pop-btn" @click="goHome(it.author?.id)">
                      主页
                    </button>
                    <button
                      v-if="!isSelf(it.author?.id) && !isFriend(it.author?.id)"
                      type="button"
                      class="author-pop-btn primary"
                      @click="openUserAction(it.author?.id, it.author?.username, it.author?.avatar)"
                    >
                      加好友
                    </button>
                    <span v-else-if="isSelf(it.author?.id)" class="author-pop-tip">自己</span>
                    <span v-else class="author-pop-tip">已关注</span>
                  </div>
                </div>
              </el-popover>
              <span class="video-date">{{ formatPublishDate(it) }}</span>
            </div>
          </div>
        </article>
      </section>
    </transition>

    <div ref="sentinelRef" class="infinite-sentinel" />

    <div v-if="infiniteEnabled && infiniteLoading" class="infinite-loading-wrap">
      <div class="infinite-text">加载中...</div>
      <section
        class="grid skel-grid infinite-skel-grid"
        :class="{ 'fixed-grid': fixedGrid }"
        :style="gridStyle"
      >
        <article v-for="n in skeletonCount" :key="`infinite-skel-${n}`" class="card skel-card">
          <div class="skel-cover"></div>
          <div class="skel-body">
            <div class="skel-line l1"></div>
            <div class="skel-line l2"></div>
            <div class="skel-meta"></div>
            <div class="skel-ops"></div>
          </div>
        </article>
      </section>
    </div>

    <div class="pager">
      <div class="layout-mode">
        <span class="lt-label">开启无限滚动</span>
        <el-switch v-model="infiniteEnabled" />
      </div>

      <el-pagination
        v-if="!infiniteEnabled"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        background
        @current-change="() => void load(true)"
      />
    </div>

    <el-dialog v-model="userActionOpen" title="用户操作" width="460px">
      <div class="ua-head">
        <div class="ua-avatar">
          <img v-if="uaAvatar && resolveAvatar(uaAvatar)" :src="resolveAvatar(uaAvatar)" alt="" />
          <div v-else class="ua-ph">{{ (uaUsername || '?').slice(0, 1).toUpperCase() }}</div>
        </div>
        <div>
          <p class="ua-name">{{ uaUsername || '用户' }}</p>
          <p class="ua-sub muted">
            {{ isFriend(uaUserId) ? '你们已经是好友（本页不处理聊天）' : '还不是好友：输入一句打招呼并自动发起好友申请' }}
          </p>
        </div>
      </div>

      <div class="ua-body">
        <el-input
          v-if="!isFriend(uaUserId)"
          v-model="helloDraft"
          type="textarea"
          :rows="4"
          placeholder="输入一句打招呼…"
          :disabled="uaSentOnce || uaSending"
        />
        <div v-else class="ua-hint muted">你们已经是好友</div>
      </div>

      <template #footer>
        <el-button @click="userActionOpen = false">取消</el-button>
        <el-button
          v-if="!isFriend(uaUserId)"
          type="primary"
          :loading="uaSending"
          :disabled="uaSentOnce || uaSending || !helloDraft.trim()"
          @click="sendHelloOrApply(uaUserId)"
        >
          {{ uaSentOnce ? '已发送' : '发送（自动发起好友申请）' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../services/api';
import type { CategoryItem, ContentItem } from '../types';
import { useUserStore } from '../stores/user';

const router = useRouter();
const route = useRoute();
const items = ref<ContentItem[]>([]);
const total = ref(0);
const page = ref(1);
const infiniteEnabled = ref(false);
const gridCols = 4;
const pageSize = computed(() => (infiniteEnabled.value ? 12 : 8));
const gridLoading = ref(false);
const infiniteLoading = ref(false);
const sentinelRef = ref<HTMLElement | null>(null);
const type = ref('');
const category = ref('');
const sort = ref<'latest' | 'hot'>('latest');
const categories = ref<CategoryItem[]>([]);
const typeOpen = ref(false);
const catOpen = ref(false);

const userStore = useUserStore();
const friendIdSet = ref<Set<number>>(new Set());

const userActionOpen = ref(false);
const uaUserId = ref(0);
const uaUsername = ref('');
const uaAvatar = ref<string | null>(null);
const helloDraft = ref('');
const uaSending = ref(false);
const uaSentOnce = ref(false);
const uaChatItems = ref<Array<{ id: number; text: string; status: 'sent' | 'failed' }>>([]);

const q = computed(() => String(route.query.q ?? '').trim());
const skeletonCount = computed(() => pageSize.value);
const hasMore = computed(() => items.value.length < total.value);

const fixedGrid = computed(() => false);
const gridStyle = computed(() => undefined);

const currentTypeLabel = computed(() => {
  if (!type.value) return '全部';
  return ({ video: '视频', image: '插画', article: '专栏' } as Record<string, string>)[type.value] ?? '全部';
});

const currentCategoryLabel = computed(() => {
  if (!category.value) return '全部';
  const hit = categories.value.find((c) => c.slug === category.value);
  return hit?.name ?? '全部';
});

const typeLabel = (t: string) => ({ video: '视频', image: '插画', article: '专栏' } as Record<string, string>)[t] ?? t;

const formatArticleDesc = (raw: string) => {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '暂无内容';
  return cleaned.length > 130 ? `${cleaned.slice(0, 130)}…` : cleaned;
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

const formatMonthDay = (iso?: string | null) => {
  const d = new Date(String(iso ?? ''));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatPublishDate = (it: ContentItem) => formatMonthDay(it.reviewed_at || it.created_at);

const resolveAvatar = (src?: string | null) => {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
};

const ensureFriendsLoaded = async () => {
  if (friendIdSet.value.size) return;
  try {
    const { data } = await api.get('/friends');
    const ids = new Set<number>(
      (data.items ?? [])
        .map((x: any) => Number(x.friend?.id ?? 0))
        .filter((n: number) => n > 0)
    );
    friendIdSet.value = ids;
  } catch {
    // ignore
  }
};

const isFriend = (uid?: number | null) => {
  if (!uid) return false;
  return friendIdSet.value.has(uid);
};

const isSelf = (uid?: number | null) => Number(uid ?? 0) > 0 && Number(uid) === Number(userStore.user?.id ?? 0);

const pushUa = (text: string, status: 'sent' | 'failed') => {
  uaChatItems.value.push({ id: Date.now() + Math.random(), text, status });
};

const openUserAction = async (id?: number, username?: string, avatar?: string | null) => {
  if (!id) return;
  const meId = Number(userStore.user?.id ?? 0);
  if (id === meId) return;

  if (!userStore.user) await userStore.fetchProfile();
  await ensureFriendsLoaded();

  uaUserId.value = id;
  uaUsername.value = username || '用户';
  uaAvatar.value = avatar ?? null;
  helloDraft.value = `你好，我是 ${String(userStore.user?.username ?? '我')}～`;
  uaSending.value = false;
  uaSentOnce.value = false;
  uaChatItems.value = [];
  userActionOpen.value = true;
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

const goHome = (userId?: number | null) => {
  if (!userId) return;
  userActionOpen.value = false;
  void router.push(`/users/${userId}`);
};

const pickCategory = (slug: string) => {
  category.value = slug;
  catOpen.value = false;
  page.value = 1;
  void load(true);
};

const pickType = (t: string) => {
  type.value = t;
  typeOpen.value = false;
  page.value = 1;
  void load(true);
};

const loadCategories = async () => {
  const { data } = await api.get('/categories');
  categories.value = (data.items ?? []) as CategoryItem[];
};

const listVersion = ref(0);

const load = async (reset = true) => {
  const version = reset ? ++listVersion.value : listVersion.value;

  if (reset) {
    gridLoading.value = true;
    infiniteLoading.value = false;
  } else {
    if (infiniteLoading.value) return;
    infiniteLoading.value = true;
  }

  try {
    const { data } = await api.get('/contents', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        q: q.value,
        type: type.value || undefined,
        category: category.value || undefined,
        sort: sort.value
      }
    });

    if (version !== listVersion.value) return; // 旧请求结果丢弃

    const nextItems = (data.items ?? []) as ContentItem[];
    items.value = reset ? nextItems : [...items.value, ...nextItems];
    total.value = Number(data.total ?? 0);
  } catch (e: any) {
    if (version !== listVersion.value) return;
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
    if (reset) {
      items.value = [];
      total.value = 0;
    }
  } finally {
    if (version !== listVersion.value) return;
    if (reset) gridLoading.value = false;
    else infiniteLoading.value = false;
    if (infiniteEnabled.value && hasMore.value) void refreshObserver();
  }
};

const openItem = (it: ContentItem) => {
  void router.push(`/contents/${it.id}`);
};

watch(
  () => route.query.q,
  () => {
    page.value = 1;
    void load(true);
  }
);

watch(infiniteEnabled, () => {
  page.value = 1;
  void load(true);
  void refreshObserver();
});

let observer: IntersectionObserver | null = null;

const refreshObserver = async () => {
  await nextTick();
  const el = sentinelRef.value;
  if (!observer || !el) return;
  observer.unobserve(el);
  observer.observe(el);
};

onMounted(async () => {
  await Promise.all([loadCategories(), load(), userStore.fetchProfile().catch(() => {}), ensureFriendsLoaded()]);
  await nextTick();

  const el = sentinelRef.value;
  if (!el) return;

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      if (!infiniteEnabled.value) return;
      if (gridLoading.value || infiniteLoading.value) return;
      if (!hasMore.value) return;

      page.value += 1;
      void load(false);
    },
    {
      root: null,
      rootMargin: '240px 0px'
    }
  );

  observer.observe(el);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<style scoped>
.page { max-width: 1180px; margin: 0 auto; padding: 22px; }
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 6px 2px 10px;
  margin-bottom: 6px;
  gap: 12px;
}
.hero-title {
  margin: 0 0 4px;
  font-size: 28px;
  letter-spacing: -.01em;
  font-weight: 780;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.hero-title-ic {
  width: 16px;
  height: 16px;
  color: rgba(14, 116, 144, .9);
  flex: 0 0 auto;
}
.hero p { margin: 0; color: #64748b; font-weight: 500; }
.publish {
  text-decoration: none;
  color: #fff;
  background: var(--accent);
  border-radius: 10px;
  padding: 9px 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.publish-ic { width: 14px; height: 14px; flex: 0 0 auto; }
.filters {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 8px 0 10px;
  margin-bottom: 12px;
  position: relative;
}
.filters::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(148,163,184,.42);
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-radius: 0;
}
.bar-left, .bar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.bar-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #64748b;
  font-weight: 650;
  padding-right: 2px;
}
.bar-hint-ic { width: 14px; height: 14px; color: #0891b2; flex: 0 0 auto; }
.search-tip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #64748b;
  border: 1px solid rgba(148,163,184,.32);
  background: rgba(255,255,255,.9);
  border-radius: 999px;
  padding: 5px 10px;
  line-height: 1;
  cursor: help;
}
.search-tip-ic { width: 13px; height: 13px; color: #0e7490; flex: 0 0 auto; }
.chip {
  border: 1px solid rgba(148,163,184,.35);
  background: rgba(255,255,255,.92);
  border-radius: 999px;
  padding: 6px 11px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  color: #475569;
  transition: border-color .14s ease, background-color .14s ease, color .14s ease, transform .14s ease;
}
.chip:hover { border-color: rgba(0,161,214,.28); color: #0369a1; background: rgba(240,249,255,.9); transform: translateY(-1px); }
.chip.on { border-color: rgba(0,161,214,.34); color: #0369a1; background: rgba(224,242,254,.86); }
.chip-dd { display: inline-flex; align-items: center; gap: 6px; }
.chev { font-size: 12px; opacity: .75; }
.type-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 4px; }
.type-item {
  border: 1px solid rgba(148,163,184,.34);
  background: rgba(255,255,255,.92);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  text-align: left;
  transition: border-color .14s ease, background-color .14s ease, color .14s ease, transform .14s ease;
}
.type-item:hover { border-color: rgba(0,161,214,.3); background: rgba(240,249,255,.88); color: #0369a1; transform: translateY(-1px); }
.type-item.on { border-color: rgba(0,161,214,.38); background: rgba(224,242,254,.82); color: #0369a1; font-weight: 700; }
.seg { display: inline-flex; border: 1px solid rgba(148,163,184,.34); border-radius: 999px; background: rgba(255,255,255,.92); padding: 2px; gap: 2px; }
.seg-btn {
  border: 0;
  background: transparent;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  color: #64748b;
  line-height: 1;
  transition: background-color .14s ease, color .14s ease, transform .14s ease;
}
.seg-btn:hover { color: #0369a1; background: rgba(240,249,255,.86); transform: translateY(-1px); }
.seg-btn.on { background: rgba(224,242,254,.86); color: #0369a1; font-weight: 700; }
.seg-btn:focus-visible { outline: 2px solid rgba(0,161,214,.45); outline-offset: 2px; }
.cat-panel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 4px; }
.cat-item {
  border: 1px solid rgba(148,163,184,.34);
  background: rgba(255,255,255,.92);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  text-align: left;
  transition: border-color .14s ease, background-color .14s ease, color .14s ease, transform .14s ease;
}
.cat-item:hover { border-color: rgba(0,161,214,.3); background: rgba(240,249,255,.88); color: #0369a1; transform: translateY(-1px); }
.cat-item.on { border-color: rgba(0,161,214,.38); background: rgba(224,242,254,.82); color: #0369a1; font-weight: 700; }

.grid { display: grid; grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr)); gap: 12px; }
.card {
  border: 1px solid rgba(148, 163, 184, .2);
  border-radius: 12px;
  background: rgba(255,255,255,.96);
  overflow: hidden;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background-color .15s ease;
}
.card:hover {
  transform: translateY(-2px);
  border-color: rgba(0,161,214,.24);
  background: #fff;
  box-shadow: 0 8px 18px rgba(15,23,42,.06);
}
.cover-wrap { border: 0; padding: 0; background: transparent; width: 100%; position: relative; cursor: pointer; }
.cover { width: 100%; aspect-ratio: 16/8.1; object-fit: cover; display: block; }
.cover-ph { width: 100%; aspect-ratio: 16/8.1; display: grid; place-items: center; color: var(--muted); background: #f1f5f9; }
.type { position: absolute; left: 10px; top: 10px; border-radius: 999px; background: rgba(15,23,42,.65); color: #fff; font-size: 12px; padding: 3px 8px; }
.body { padding: 8px 10px 9px; display: flex; flex-direction: column; gap: 5px; min-height: 74px; }
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 720;
  color: #0f172a;
  cursor: pointer;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: calc(1.45em * 2);
}
.title:hover { color: #0284c7; }
.desc { margin: 0; color: var(--muted); min-height: 34px; font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 12px; color: #64748b; }
.tag { color: #475569; }
.views { color: #64748b; display: inline-flex; align-items: center; gap: 6px; }
.ic-eye, .ic-like, .ic-fav { width: 14px; height: 14px; flex: 0 0 auto; display: block; }

.video-overlay { position: absolute; inset: 0; pointer-events: none; }
.video-stats { position: absolute; left: 8px; bottom: 8px; display: flex; gap: 8px; }
.video-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.94);
  background: rgba(15, 23, 42, 0.42);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}
.video-ic { width: 14px; height: 14px; color: #fff; display: block; flex: 0 0 auto; }
.cover-corner-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.48);
  color: rgba(255,255,255,.92);
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1;
}
.compact-title { font-size: 16px; font-weight: 850; letter-spacing: -.01em; }
.card-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  min-width: 0;
  margin-top: auto;
  padding-top: 4px;
  border-top: 1px solid rgba(148,163,184,.16);
}
.follow-pill {
  border: 1px solid rgba(234,88,12,.18);
  background: rgba(234,88,12,.08);
  color: #ea580c;
  border-radius: 999px;
  padding: 4px 10px;
  font-weight: 800;
  line-height: 1;
  flex: 0 0 auto;
}
.author-name-btn {
  border: 0;
  background: transparent;
  padding: 0;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.2;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.author-name-btn:hover { color: var(--accent); }
.video-date { color: #94a3b8; margin-left: auto; flex: 0 0 auto; font-weight: 500; }

.author-pop { display: grid; gap: 10px; }
.author-pop-name { margin: 0; font-weight: 800; color: #0f172a; }
.author-pop-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.author-pop-btn {
  border: 1px solid rgba(15,23,42,.12);
  background: #fff;
  color: #334155;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}
.author-pop-btn.primary {
  border-color: rgba(0,161,214,.22);
  background: rgba(0,161,214,.08);
  color: var(--accent);
}
.author-pop-tip { font-size: 12px; color: #94a3b8; }

/* 关注弹窗（最小样式） */
.ua-head { display: flex; align-items: center; gap: 10px; }
.ua-avatar { width: 44px; height: 44px; border-radius: 999px; overflow: hidden; border: 1px solid rgba(15,23,42,.12); background: #f3f4f6; display: grid; place-items: center; flex: 0 0 auto; }
.ua-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ua-ph { width: 100%; height: 100%; display: grid; place-items: center; font-weight: 900; color: #334155; }
.ua-name { margin: 0 0 4px; font-weight: 900; color: #0f172a; }
.ua-sub { margin: 0; font-size: 12px; line-height: 1.5; }
.ua-body { margin-top: 14px; }
.ua-hint { font-size: 12px; }

.featured { border: 1px solid rgba(0,161,214,.22); border-radius: 12px; background: rgba(0,161,214,.04); padding: 14px; margin-bottom: 12px; }
.featured-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 10px; }
.featured-head h2 { margin: 0; font-size: 18px; }
.featured-head p { margin: 0; color: var(--muted); font-size: 13px; }
.featured-badge { font-size: 12px; color: var(--accent); background: var(--accent-soft); border: 1px solid rgba(0,161,214,.18); padding: 3px 10px; border-radius: 999px; }
.featured-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.featured-card { border-color: rgba(0,161,214,.2); }
.featured-body { padding: 12px 10px; }

.featured-grid.skel-grid { gap: 12px; }

.skel-grid { min-height: 520px; }
.skel-card { border-color: rgba(15,23,42,.10); }
.skel-cover { width: 100%; aspect-ratio: 16/8.1; background: #eef2f7; }
.skel-body { padding: 10px; display: grid; gap: 8px; }
.skel-line { height: 12px; border-radius: 8px; background: #eef2f7; }
.skel-line.l1 { width: 72%; }
.skel-line.l2 { width: 100%; }
.skel-meta { height: 12px; border-radius: 8px; background: #eef2f7; }
.skel-ops { height: 34px; border-radius: 999px; background: #eef2f7; }

.fade-enter-active, .fade-leave-active { transition: opacity .22s ease, transform .22s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(4px); }
.fade-enter-to, .fade-leave-from { opacity: 1; transform: translateY(0); }

.skel-grid .skel-ops { width: 70%; }

.card.featured-card:hover { box-shadow: 0 10px 20px rgba(0,161,214,.08); }

.empty { border: 1px dashed var(--line); border-radius: 12px; background: #fff; margin-bottom: 12px; }
.pager { margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.infinite-sentinel { height: 1px; width: 100%; }
.infinite-loading-wrap { width: 100%; display: grid; place-items: center; padding: 8px 0 0; }
.infinite-text { font-size: 12px; color: var(--muted); padding: 2px 10px; border-radius: 999px; border: 1px solid rgba(15,23,42,.10); background: rgba(255,255,255,.65); margin-bottom: 8px; }
.infinite-skel-grid { min-height: 0; }
.layout-mode { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lt-label { font-size: 12px; color: var(--muted); font-weight: 700; }
.lt-hint { font-size: 12px; color: var(--muted); padding: 3px 10px; border: 1px solid rgba(15,23,42,.10); border-radius: 999px; background: rgba(255,255,255,.7); }

@media (max-width: 1120px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1120px) { .featured-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 980px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 980px) { .featured-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) {
  .page { padding: 14px; }
  .hero { flex-direction: column; align-items: flex-start; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .featured-grid { grid-template-columns: 1fr; }
  .cat-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active { transition: none; }
  .fade-enter-from, .fade-leave-to { opacity: 1; transform: none; }
  .card { transition: none; }
  .card:hover { transform: none; box-shadow: none; }
}
</style>
