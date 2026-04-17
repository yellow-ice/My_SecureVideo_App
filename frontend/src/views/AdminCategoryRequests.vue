<template>
  <div class="page">
    <header class="head">
      <h1 class="page-title">
        <svg class="head-ic" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 5h10v14H9V5Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path
            d="M5 8h4v10H5V8Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path d="M7 11h1M7 14h1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        投稿审核
      </h1>
      <p class="sub">审核用户投稿，支持类型筛选、检索与分页。</p>
    </header>

    <section class="top-bar">
      <div class="top-left">
        <div class="type-tabs" aria-label="内容类型">
          <button
            v-for="t in typeTabs"
            :key="t.value"
            type="button"
            class="type-tab"
            :class="{ on: typeFilter === t.value }"
            @click="onTypeChange(t.value)"
          >
            <svg class="type-tab-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                v-if="t.value === 'video'"
                d="M5 7.5A2.5 2.5 0 0 1 7.5 5h7A2.5 2.5 0 0 1 17 7.5v9A2.5 2.5 0 0 1 14.5 19h-7A2.5 2.5 0 0 1 5 16.5v-9Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                v-if="t.value === 'video'"
                d="M17 10.5 20 9v6l-3-1.5v-3Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                v-else-if="t.value === 'image'"
                d="M5.5 7A2.5 2.5 0 0 1 8 4.5h8A2.5 2.5 0 0 1 18.5 7v10A2.5 2.5 0 0 1 16 19.5H8A2.5 2.5 0 0 1 5.5 17V7Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                v-else-if="t.value === 'image'"
                d="M8 15l2.1-2.1a1 1 0 0 1 1.4 0L13 14a1 1 0 0 0 1.4 0L18 10.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-else-if="t.value === 'image'"
                cx="9"
                cy="9"
                r="1.2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                v-else-if="t.value === 'article'"
                d="M8 4.5h8A2.5 2.5 0 0 1 18.5 7v13H10A2.5 2.5 0 0 1 7.5 17.5V7A2.5 2.5 0 0 1 10 4.5Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                v-else
                d="M4 7h16M7 12h10M9 17h6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
            {{ t.label }}
          </button>
        </div>

        <div class="status-row">
          <div class="seg" aria-label="审核状态">
            <button
              v-for="s in statusOptions"
              :key="s.value"
              type="button"
              class="seg-btn"
              :class="{ on: currentStatus === s.value }"
              @click="onStatusChange(s.value)"
            >
              {{ s.label }}<span v-if="countFor(s.value) > 0" class="cnt">{{ countFor(s.value) }}</span>
            </button>
          </div>
          <div class="stats">
            <span class="stat-pill">
              <span class="dot pending"></span>待审核 {{ counts.pending }}
            </span>
            <span class="stat-pill">
              <span class="dot ok"></span>已发布 {{ counts.published }}
            </span>
            <span class="stat-pill">
              <span class="dot rejected"></span>已驳回 {{ counts.rejected }}
            </span>
          </div>
        </div>
      </div>

      <div class="top-right">
        <el-input v-model="searchQ" placeholder="搜索（标题 / 分区 / 驳回原因 / 作者）" clearable class="search-input" @clear="onSearchClear">
          <template #prefix>
            <svg class="search-ic" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M15 15l4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </template>
        </el-input>
        <el-select v-model="sortKey" class="sort-select" size="small" @change="onSortChange">
          <el-option label="按更新时间" value="updated" />
          <el-option label="按创建时间" value="created" />
        </el-select>
        <button type="button" class="view-toggle" @click="viewMode = viewMode === 'card' ? 'table' : 'card'">
          <svg class="view-ic" viewBox="0 0 24 24" aria-hidden="true">
            <template v-if="viewMode === 'card'">
              <path d="M4 6h7v6H4Z" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M13 6h7v4H13Z" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M13 12h7v6H13Z" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M4 14h7v4H4Z" fill="none" stroke="currentColor" stroke-width="1.6" />
            </template>
            <template v-else>
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </template>
          </svg>
          {{ viewMode === 'card' ? '表格视图' : '卡片视图' }}
        </button>
      </div>
    </section>

    <section v-if="viewMode === 'card'" class="card-list">
      <article v-for="row in items" :key="row.id" class="item-card">
        <button type="button" class="thumb" @click="openPreview(row)">
          <img v-if="row.cover_url" :src="row.cover_url" alt="" loading="lazy" decoding="async" />
          <div v-else class="thumb-ph">{{ typeLabel(row.type) }}</div>
          <span class="tag-pill">{{ row.category?.name || '未分区' }}</span>
        </button>
        <div class="info">
          <h3 class="title" @click="openPreview(row)">{{ row.title }}</h3>
          <div class="meta-line">
            <span class="meta-type">{{ typeLabel(row.type) }}</span>
            <span class="meta-time">{{ formatUpdatedAt(row) }}</span>
            <span class="meta-status" :class="`st-${row.status}`">{{ statusLabel(row.status) }}</span>
          </div>
          <p class="meta-author">
            <svg class="inline-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path
                d="M5.5 20.5v-1A6.5 6.5 0 0 1 12 13a6.5 6.5 0 0 1 6.5 6.5v1"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
            {{ row.author?.username || '未知' }}
          </p>
          <p v-if="row.reject_reason" class="reject">驳回：{{ row.reject_reason }}</p>
          <div class="stats-line">
            <span class="stat">
              <svg class="stat-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6" />
              </svg>
              {{ row.views ?? 0 }}
            </span>
            <span v-if="row._count?.likes" class="stat">
              <svg class="stat-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 20.5 4.8 13.8a4.3 4.3 0 0 1 6-6.1L12 8l1.2-1.3a4.3 4.3 0 0 1 6 6.1Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
              </svg>
              {{ row._count.likes }}
            </span>
            <span v-if="row._count?.comments != null" class="stat">
              <svg class="stat-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-4 4Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
              {{ row._count.comments }}
            </span>
          </div>
        </div>
        <div class="ops">
          <button type="button" class="op-btn" @click="openPreview(row)">
            <svg class="op-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.7" />
            </svg>
            查看
          </button>
          <button
            type="button"
            class="op-btn ok"
            :disabled="row.status !== 'pending'"
            @click="reviewContent(row.id, 'published')"
          >
            <svg class="op-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12.5 10 16.5 18 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            通过
          </button>
          <button type="button" class="op-btn" :disabled="row.status !== 'pending'" @click="reject(row.id)">
            <svg class="op-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            驳回
          </button>
          <button type="button" class="op-btn danger" @click="removeContent(row.id)">
            <svg class="op-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 7h14M10 11v7M14 11v7M8 7l1 11h6l1-11M9 5h6l1 2H8Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            删除
          </button>
        </div>
      </article>
      <div v-if="!items.length && !loading" class="empty-tip">暂无匹配的投稿</div>
    </section>

    <el-table v-else :data="items" size="small" class="review-table" :empty-text="loading ? '加载中…' : '暂无数据'">
      <el-table-column prop="id" label="ID" width="72" />
      <el-table-column label="类型" width="88">
        <template #default="{ row }">
          <span class="cell-muted">{{ typeLabel(row.type) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="作者" width="120">
        <template #default="{ row }">
          <span class="cell-muted">{{ row.author?.username || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="分区" width="120">
        <template #default="{ row }">
          <span class="cell-muted">{{ row.category?.name || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新" width="148">
        <template #default="{ row }">
          <span class="cell-muted">{{ formatUpdatedAt(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="数据" width="108" align="right">
        <template #default="{ row }">
          <span class="cell-muted">{{ row.views ?? 0 }} / {{ row._count?.comments ?? 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <span class="meta-status" :class="`st-${row.status}`">{{ statusLabel(row.status) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="驳回原因" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.reject_reason || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="248" fixed="right" align="right">
        <template #default="{ row }">
          <div class="tbl-ops">
            <button type="button" class="tbl-link" @click="openPreview(row)">
              <svg class="tbl-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.7" />
              </svg>
              查看
            </button>
            <button
              type="button"
              class="tbl-link ok"
              :disabled="row.status !== 'pending'"
              @click="reviewContent(row.id, 'published')"
            >
              <svg class="tbl-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 12.5 10 16.5 18 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              通过
            </button>
            <button type="button" class="tbl-link" :disabled="row.status !== 'pending'" @click="reject(row.id)">驳回</button>
            <button type="button" class="tbl-link danger" @click="removeContent(row.id)">删除</button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="onPageChange"
      />
    </div>

    <el-dialog v-model="previewOpen" :width="'92vw'" :style="{ maxWidth: '760px' }" title="审核预览" class="preview-dlg">
      <div v-if="previewItem" class="preview">
        <h3 class="p-title">{{ previewItem.title }}</h3>
        <p class="p-meta">{{ typeLabel(previewItem.type) }} · {{ previewItem.category?.name || '未分区' }} · {{ previewItem.author?.username || '未知作者' }}</p>
        <div v-if="previewItem.type === 'video' && previewItem.media_url" class="p-media">
          <video :src="previewItem.media_url" controls />
        </div>
        <div v-else-if="previewItem.type === 'image' && previewGalleryUrls.length" class="p-media image">
          <el-carousel
            class="p-carousel"
            indicator-position="none"
            arrow="always"
            height="100%"
            :initial-index="previewGalleryIndex"
            @change="onPreviewGalleryChange"
          >
            <el-carousel-item v-for="(src, idx) in previewGalleryUrls" :key="`${src}-${idx}`">
              <el-image
                class="p-image"
                :src="src"
                fit="contain"
                :preview-src-list="previewGalleryUrls"
                :initial-index="idx"
                preview-teleported
              />
            </el-carousel-item>
          </el-carousel>
          <div class="p-dot">{{ previewGalleryIndex + 1 }} / {{ previewGalleryUrls.length }}</div>
        </div>
        <div v-else-if="previewItem.cover_url" class="p-media image">
          <img :src="previewItem.cover_url" alt="" />
        </div>
        <article v-if="previewItem.type === 'article'" class="p-text">
          <div class="markdown-body" v-html="previewArticleHtml" />
        </article>
        <article v-else class="p-text">{{ previewItem.summary || previewItem.body || '暂无内容' }}</article>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';

type ReviewItem = {
  id: number;
  type: 'video' | 'image' | 'article';
  title: string;
  status: 'pending' | 'published' | 'rejected';
  reject_reason?: string | null;
  cover_url?: string | null;
  summary?: string | null;
  body?: string | null;
  media_url?: string | null;
  views?: number;
  updated_at?: string;
  created_at?: string;
  author?: { id: number; username: string; email?: string };
  category?: { id: number; name: string; slug: string };
  _count?: { likes: number; comments: number };
};

const items = ref<ReviewItem[]>([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = 8;
const counts = ref({ pending: 0, published: 0, rejected: 0 });
const typeFilter = ref<'all' | 'video' | 'image' | 'article'>('all');
const searchQ = ref('');
const sortKey = ref<'updated' | 'created'>('updated');
const viewMode = ref<'card' | 'table'>('card');
const previewOpen = ref(false);
const previewItem = ref<any | null>(null);
const previewGalleryIndex = ref(0);

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已发布', value: 'published' },
  { label: '已驳回', value: 'rejected' }
] as const;
const currentStatus = ref<(typeof statusOptions)[number]['value']>('pending');
const typeTabs = [
  { label: '全部', value: 'all' as const },
  { label: '视频', value: 'video' as const },
  { label: '插画', value: 'image' as const },
  { label: '专栏', value: 'article' as const }
];
const typeLabel = (type: string) => ({ video: '视频', image: '插画', article: '专栏' } as Record<string, string>)[type] ?? type;
const statusLabel = (st: string) =>
  ({ pending: '待审核', published: '已发布', rejected: '已驳回' } as Record<string, string>)[st] ?? st;

const countFor = (v: (typeof statusOptions)[number]['value']) => {
  if (v === 'all') return counts.value.pending + counts.value.published + counts.value.rejected;
  return counts.value[v];
};

const formatUpdatedAt = (row: ReviewItem) => {
  const iso = row.updated_at ?? row.created_at;
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/contents', {
      params: {
        status: currentStatus.value,
        page: currentPage.value,
        pageSize,
        sort: sortKey.value,
        ...(typeFilter.value !== 'all' ? { type: typeFilter.value } : {}),
        ...(searchQ.value.trim() ? { q: searchQ.value.trim() } : {})
      }
    });
    items.value = (data.items ?? []) as ReviewItem[];
    total.value = Number(data.total) || 0;
    const c = data.counts;
    if (c && typeof c === 'object') {
      counts.value = {
        pending: Number(c.pending) || 0,
        published: Number(c.published) || 0,
        rejected: Number(c.rejected) || 0
      };
    }
  } finally {
    loading.value = false;
  }
};

const resetPageAndLoad = () => {
  currentPage.value = 1;
  void load();
};

const onTypeChange = (v: (typeof typeTabs)[number]['value']) => {
  typeFilter.value = v;
  resetPageAndLoad();
};

const onStatusChange = (v: (typeof statusOptions)[number]['value']) => {
  currentStatus.value = v;
  resetPageAndLoad();
};

const onSortChange = () => {
  resetPageAndLoad();
};

const onPageChange = () => {
  void load();
};

const onSearchClear = () => {
  resetPageAndLoad();
};

watch(searchQ, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    resetPageAndLoad();
  }, 360);
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

const previewGalleryUrls = computed(() => {
  if (previewItem.value?.type !== 'image') return [] as string[];
  const base = [String(previewItem.value?.cover_url ?? ''), String(previewItem.value?.media_url ?? '')]
    .map((x) => x.trim())
    .filter(Boolean);
  const raw = String(previewItem.value?.body ?? '').trim();
  if (!raw) return Array.from(new Set(base));
  try {
    const parsed = JSON.parse(raw) as { gallery?: string[] } | string[];
    const list = Array.isArray(parsed)
      ? parsed.map((x) => String(x ?? '').trim()).filter(Boolean)
      : Array.isArray((parsed as { gallery?: string[] })?.gallery)
        ? ((parsed as { gallery?: string[] }).gallery ?? []).map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    if (list.length) return Array.from(new Set([...list, ...base]));
  } catch {
    const legacy = raw
      .split(/\r?\n|,/g)
      .map((x) => x.trim())
      .filter((x) => /^https?:\/\//.test(x) || x.startsWith('/uploads/'));
    if (legacy.length) return Array.from(new Set([...legacy, ...base]));
  }
  return Array.from(new Set(base));
});

const previewArticleHtml = computed(() => {
  if (previewItem.value?.type !== 'article') return '';
  const raw = String(previewItem.value?.body ?? previewItem.value?.summary ?? '').trim();
  if (!raw) return '';
  return marked.parse(raw, { breaks: true }) as string;
});

const onPreviewGalleryChange = (current: number) => {
  previewGalleryIndex.value = Number.isFinite(current) ? current : 0;
};

const reviewContent = async (id: number, action: 'published' | 'rejected', reject_reason?: string) => {
  try {
    await api.post(`/admin/contents/${id}/review`, { action, reject_reason });
    ElMessage.success(action === 'published' ? '已通过' : '已驳回');
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '操作失败');
  }
};

const reject = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因（可留空）', '驳回投稿', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：标题不规范/内容违规/低质…',
    inputType: 'textarea'
  });
  await reviewContent(id, 'rejected', String(value ?? '').trim());
};

const removeContent = async (id: number) => {
  await ElMessageBox.confirm('确认删除该投稿？删除后不可恢复。', '删除确认', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消'
  });
  try {
    await api.delete(`/contents/${id}`);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '删除失败');
  }
};

const openPreview = async (row: ReviewItem) => {
  previewGalleryIndex.value = 0;
  previewItem.value = {
    ...row,
    summary: '',
    body: '',
    cover_url: '',
    media_url: ''
  };
  previewOpen.value = true;
  try {
    const { data } = await api.get(`/contents/${row.id}`);
    previewItem.value = data.item ?? previewItem.value;
  } catch {
    // keep basic table data as fallback
  }
};

onMounted(() => {
  void load();
});
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 22px 60px;
}
.head {
  margin-bottom: 14px;
  padding-bottom: 10px;
  position: relative;
}
.head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(148, 163, 184, 0.42);
}
.page-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.head-ic {
  width: 18px;
  height: 18px;
  color: #0891b2;
  flex: 0 0 auto;
}
.sub {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.55;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  margin: 10px 0 16px;
  gap: 16px;
  flex-wrap: wrap;
}
.top-left {
  display: grid;
  gap: 8px;
}
.top-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.type-tabs {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
}
.type-tab {
  border: 0;
  background: transparent;
  padding: 4px 2px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.type-tab.on {
  color: #0f172a;
  border-bottom-color: #0ea5e9;
  font-weight: 700;
}
.type-tab-ic {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.seg {
  display: inline-flex;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.9);
  padding: 2px;
  gap: 2px;
}
.seg-btn {
  border: 0;
  background: transparent;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  color: var(--muted);
  line-height: 1;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.12s ease;
}
.seg-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}
.seg-btn.on {
  background: rgba(224, 242, 254, 0.96);
  color: var(--accent);
}
.seg-btn .cnt {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.88;
  font-weight: 600;
}
.stats {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #64748b;
}
.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.9);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.pending {
  background: #f97316;
}
.dot.ok {
  background: #22c55e;
}
.dot.rejected {
  background: #ef4444;
}
.search-input {
  width: min(260px, 72vw);
}
.search-ic {
  width: 14px;
  height: 14px;
}
.sort-select {
  width: 130px;
}
.view-toggle {
  border: 0;
  background: rgba(248, 250, 252, 0.9);
  border-radius: 999px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
}
.view-ic {
  width: 14px;
  height: 14px;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}
.item-card {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.88);
  align-items: center;
}
.thumb {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}
.thumb img,
.thumb-ph {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.thumb-ph {
  display: grid;
  place-items: center;
  background: #e2e8f0;
  color: #475569;
  font-weight: 700;
}
.tag-pill {
  position: absolute;
  left: 8px;
  top: 8px;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  background: rgba(15, 23, 42, 0.7);
  color: #e5e7eb;
}
.info {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta-line {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
}
.meta-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}
.meta-status.st-pending {
  background: rgba(250, 204, 21, 0.14);
  color: #92400e;
}
.meta-status.st-published {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
}
.meta-status.st-rejected {
  background: rgba(248, 113, 113, 0.14);
  color: #b91c1c;
}
.meta-author {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #64748b;
}
.inline-ic {
  width: 13px;
  height: 13px;
  opacity: 0.85;
}
.reject {
  margin: 0;
  font-size: 12px;
  color: #b91c1c;
}
.stats-line {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.stat-ic {
  width: 13px;
  height: 13px;
}
.ops {
  display: grid;
  gap: 8px;
  align-content: start;
}
.op-btn {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.86);
  padding: 5px 11px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.12s ease;
}
.op-btn:hover:not(:disabled) {
  border-color: rgba(56, 189, 248, 0.32);
  background: rgba(240, 249, 255, 0.9);
  transform: translateY(-1px);
}
.op-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.op-btn.ok {
  border-color: rgba(34, 197, 94, 0.35);
  color: #166534;
}
.op-btn.ok:hover:not(:disabled) {
  background: rgba(240, 253, 244, 0.95);
  border-color: rgba(34, 197, 94, 0.5);
}
.op-ic {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}
.op-btn.danger {
  border-color: rgba(239, 68, 68, 0.26);
  color: #b91c1c;
}
.op-btn.danger:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(254, 242, 242, 0.94);
}
.empty-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
}

.review-table {
  --el-table-border-color: transparent;
  --el-table-header-bg-color: rgba(248, 250, 252, 0.75);
}
.review-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}
.review-table :deep(.el-table__cell) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}
.review-table :deep(thead .el-table__cell) {
  font-weight: 600;
  color: #475569;
  font-size: 12px;
}
.cell-muted {
  font-size: 12px;
  color: #64748b;
}
.tbl-ops {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.tbl-link {
  border: 0;
  background: transparent;
  padding: 4px 6px;
  font-size: 12px;
  color: #0ea5e9;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
}
.tbl-link:hover:not(:disabled) {
  background: rgba(224, 242, 254, 0.65);
}
.tbl-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tbl-link.ok {
  color: #15803d;
}
.tbl-link.danger {
  color: #b91c1c;
}
.tbl-ic {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.pager {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.preview {
  display: grid;
  gap: 10px;
  max-height: 72vh;
  overflow: auto;
  padding-right: 2px;
}
.p-title {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}
.p-meta {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
.p-media {
  border-radius: 12px;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 16 / 9;
  position: relative;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
}
.p-carousel {
  width: 100%;
  height: 100%;
}
.p-image {
  width: 100%;
  height: 100%;
  display: block;
}
:deep(.p-image .el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
:deep(.p-carousel .el-carousel__arrow) {
  width: 34px;
  height: 34px;
  background: rgba(15, 23, 42, 0.55);
}
:deep(.p-carousel .el-carousel__arrow:hover) {
  background: rgba(15, 23, 42, 0.72);
}
.p-media video,
.p-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.p-dot {
  position: absolute;
  right: 10px;
  bottom: 10px;
  border-radius: 999px;
  padding: 4px 9px;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  font-size: 12px;
  line-height: 1;
}
.p-text {
  margin: 0;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.92);
  padding: 12px 14px;
  color: #334155;
  white-space: normal;
  word-break: break-word;
  line-height: 1.75;
}

.preview-dlg :deep(.el-dialog__header) {
  padding-bottom: 8px;
}

.markdown-body :deep(p) {
  margin: 10px 0;
  line-height: 1.9;
  color: #334155;
}
.markdown-body :deep(h1) {
  margin: 16px 0 10px;
  line-height: 1.3;
  font-size: 26px;
  font-weight: 900;
}
.markdown-body :deep(h2) {
  margin: 14px 0 10px;
  line-height: 1.3;
  font-size: 20px;
  font-weight: 800;
}
.markdown-body :deep(h3) {
  margin: 12px 0 8px;
  line-height: 1.3;
  font-size: 16px;
  font-weight: 800;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
  color: #334155;
  line-height: 1.9;
}
.markdown-body :deep(code) {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
}
.markdown-body :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px;
  border-radius: 8px;
  overflow: auto;
}
.markdown-body :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 3px solid #94a3b8;
  background: #f8fafc;
  color: #475569;
}
.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  margin: 10px 0;
}

@media (max-width: 980px) {
  .card-list {
    grid-template-columns: 1fr;
  }
  .item-card {
    grid-template-columns: 170px minmax(0, 1fr);
    grid-template-rows: auto auto;
  }
  .ops {
    grid-column: 1 / -1;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, max-content);
    gap: 8px;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
  }
}
@media (max-width: 680px) {
  .item-card {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .thumb {
    max-width: 100%;
  }
  .search-input {
    width: min(280px, 88vw);
  }
}
</style>
