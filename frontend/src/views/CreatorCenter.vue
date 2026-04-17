<template>
  <div class="page">
    <header class="head">
      <h1>
        <svg class="head-ic" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 4.5h10a2 2 0 0 1 2 2v13H9a2 2 0 0 0-2 2V6.5a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path d="M10 9h6M10 12.5h6M10 16h4.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        创作中心
      </h1>
      <p>管理你的投稿作品，支持二次编辑、删除和重新送审。</p>
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
            @click="typeFilter = t.value"
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
              v-for="s in statusTabs"
              :key="s.value"
              type="button"
              class="seg-btn"
              :class="{ on: statusFilter === s.value }"
              @click="statusFilter = s.value"
            >
              {{ s.label }}
            </button>
          </div>
          <div class="stats">
            <span class="stat-pill">
              <span class="dot pending"></span> 待审核 {{ stats.pending }}
            </span>
            <span class="stat-pill">
              <span class="dot ok"></span> 已发布 {{ stats.published }}
            </span>
            <span class="stat-pill">
              <span class="dot rejected"></span> 已驳回 {{ stats.rejected }}
            </span>
          </div>
        </div>
      </div>

      <div class="top-right">
        <el-input
          v-model="searchQ"
          placeholder="搜索稿件（标题/分区/驳回原因）"
          clearable
          class="search-input"
        >
          <template #prefix>
            <svg class="search-ic" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M15 15l4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </template>
        </el-input>
        <el-select v-model="sortKey" class="sort-select" size="small">
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
        <el-button type="primary" @click="goPublish">去投稿</el-button>
      </div>
    </section>

    <section v-if="viewMode === 'card'" class="card-list">
      <article v-for="row in pagedItems" :key="row.id" class="item-card">
        <button type="button" class="thumb" @click="goDetail(row.id)">
          <img v-if="row.cover_url" :src="row.cover_url" alt="" loading="lazy" decoding="async" />
          <div v-else class="thumb-ph">{{ typeLabel(row.type) }}</div>
          <span class="tag-pill">{{ row.category?.name || '未分区' }}</span>
        </button>
        <div class="info">
          <h3 class="title" @click="goDetail(row.id)">{{ row.title }}</h3>
          <div class="meta-line">
            <span class="meta-type">{{ typeLabel(row.type) }}</span>
            <span class="meta-time">{{ formatUpdatedAt(row) }}</span>
            <span class="meta-status" :class="`st-${row.status}`">{{ statusLabel(row.status) }}</span>
          </div>
          <p v-if="row.reject_reason" class="reject">驳回：{{ row.reject_reason }}</p>
          <div class="stats-line">
            <span v-if="row.views != null" class="stat">
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
              {{ row.views }}
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
            <span v-if="row._count?.comments" class="stat">
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
            <span v-if="row._count?.favoriteItems" class="stat">
              <svg class="stat-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 4h12v15l-6-3-6 3Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
              {{ row._count.favoriteItems }}
            </span>
          </div>
        </div>
        <div class="ops">
          <button type="button" class="op-btn" @click="goDetail(row.id)">
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
          <button type="button" class="op-btn" @click="openEdit(row)">
            <svg class="op-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 19h4l9-9-4-4-9 9Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path d="m13 6 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            </svg>
            编辑
          </button>
          <button
            type="button"
            class="op-btn"
            :disabled="row.status === 'pending'"
            @click="row.status === 'pending' ? undefined : resubmit(row.id)"
          >
            <svg class="op-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12a7 7 0 0 1 11.9-4.9L19 4m-2 6 3.5 3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            重新送审
          </button>
          <button type="button" class="op-btn danger" @click="remove(row.id)">
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
      <div v-if="!filteredItems.length" class="empty-tip">暂无匹配的稿件</div>
    </section>

    <el-table v-else :data="pagedItems" size="small">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="240" />
      <el-table-column label="分区" width="140">
        <template #default="{ row }">{{ row.category?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'published' ? 'success' : 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="驳回原因" min-width="200">
        <template #default="{ row }">{{ row.reject_reason || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text @click="goDetail(row.id)">查看</el-button>
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="warning" plain :disabled="row.status === 'pending'" @click="resubmit(row.id)">重新送审</el-button>
          <el-button size="small" type="danger" plain @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="filteredItems.length > pageSize" class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredItems.length"
        layout="prev, pager, next"
        background
      />
    </div>

    <el-dialog v-model="editOpen" title="编辑作品" width="760px" class="edit-dialog">
      <el-form v-if="editing" label-position="top" class="edit-form">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" maxlength="60" show-word-limit />
        </el-form-item>
        <div class="edit-meta-grid">
          <el-form-item label="分区">
            <el-select
              v-model="editForm.category_slug"
              style="width: 100%"
              filterable
              placeholder="选择分区"
            >
              <el-option v-for="c in categories" :key="c.id" :value="c.slug" :label="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
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
          </el-form-item>
        </div>
        <el-form-item v-if="editing.type !== 'article'" :label="editing.type === 'image' ? '插画简介' : '摘要'">
          <el-input v-model="editForm.summary" type="textarea" :rows="5" maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item v-if="editing.type === 'article'" label="正文">
          <MarkdownEditor v-model="editForm.body" />
        </el-form-item>

        <section class="edit-media-block">
          <h4 class="edit-media-title">当前媒体</h4>
          <el-form-item v-if="editing.type === 'video'" label="当前视频">
            <div v-if="currentVideoUrl" class="current-media video">
              <video :src="currentVideoUrl" controls />
            </div>
            <p v-else class="media-tip">暂无视频文件</p>
          </el-form-item>
          <el-form-item v-if="editing.type === 'image'" label="当前插画">
            <div v-if="currentGalleryUrls.length" class="current-gallery">
              <div class="current-main">
                <img :src="currentGalleryUrls[0]" alt="" />
                <span class="badge">当前首图</span>
              </div>
              <div v-if="currentGalleryUrls.length > 1" class="current-strip">
                <img v-for="(src, idx) in currentGalleryUrls.slice(1)" :key="`${src}-${idx}`" :src="src" alt="" />
              </div>
            </div>
            <p v-else class="media-tip">暂无插画文件</p>
          </el-form-item>
          <el-form-item label="当前封面">
            <div v-if="currentCoverUrl" class="current-media image">
              <img :src="currentCoverUrl" alt="" />
            </div>
            <p v-else class="media-tip">暂无封面图</p>
          </el-form-item>
        </section>

        <section class="edit-media-block">
          <h4 class="edit-media-title">替换媒体（可选）</h4>
          <el-form-item v-if="editing.type === 'video'" label="替换视频文件">
            <input id="edit-video-file" class="edit-file-input" type="file" accept="video/*" @change="pickEditVideo" />
            <label class="edit-file-btn" for="edit-video-file">
              <svg class="edit-file-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v12M7 9l5-5 5 5M6 18h12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              选择视频文件
            </label>
            <p class="media-tip">{{ editVideoFile?.name || '未选择新视频，默认保留原视频' }}</p>
          </el-form-item>
          <el-form-item v-if="editing.type === 'image'" label="替换插画组">
            <input id="edit-image-files" class="edit-file-input" type="file" accept="image/*" multiple @change="pickEditImages" />
            <label class="edit-file-btn" for="edit-image-files">
              <svg class="edit-file-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                <path d="M8 14l2.1-2.1a1 1 0 0 1 1.4 0L13 13a1 1 0 0 0 1.4 0L18 9.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              选择插画组
            </label>
            <p class="media-tip">{{ editGalleryCountText }}</p>
            <div v-if="editImagePreviews.length" class="edit-gallery">
              <button
                v-for="(src, idx) in editImagePreviews"
                :key="`${src}-${idx}`"
                type="button"
                class="edit-thumb"
                :class="{ on: idx === editPrimaryImageIndex }"
                @click="setEditPrimaryImage(idx)"
              >
                <img :src="src" alt="" />
                <span class="badge">{{ idx === editPrimaryImageIndex ? '首图' : '设为首图' }}</span>
              </button>
            </div>
          </el-form-item>
          <el-form-item label="替换封面图">
            <input id="edit-cover-file" class="edit-file-input" type="file" accept="image/*" @change="pickEditCover" />
            <label class="edit-file-btn" for="edit-cover-file">
              <svg class="edit-file-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7.5A2.5 2.5 0 0 1 9.5 5h7A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-7A2.5 2.5 0 0 1 7 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                <path d="M8 14.2 10.3 12a1 1 0 0 1 1.4 0l1 1a1 1 0 0 0 1.4 0L18 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              选择封面图
            </label>
            <p class="media-tip">{{ editCoverFile?.name || '未选择新封面，默认保留原封面' }}</p>
          </el-form-item>
        </section>
      </el-form>
      <template #footer>
        <el-button class="dlg-btn" @click="editOpen = false">
          <svg class="dlg-btn-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          取消
        </el-button>
        <el-button class="dlg-btn primary" type="primary" :loading="saving" @click="saveEdit">
          <svg class="dlg-btn-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 13.5 9.5 18 19 7.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          保存并重新送审
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';
import type { CategoryItem, ContentItem } from '../types';
import MarkdownEditor from '../components/MarkdownEditor.vue';

const router = useRouter();
const items = ref<ContentItem[]>([]);
const categories = ref<CategoryItem[]>([]);
const status = ref<'pending' | 'published' | 'rejected'>('pending');
const typeFilter = ref<'all' | 'video' | 'image' | 'article'>('all');
const statusFilter = ref<'all' | 'pending' | 'published' | 'rejected'>('all');
const searchQ = ref('');
const sortKey = ref<'updated' | 'created'>('updated');
const viewMode = ref<'card' | 'table'>('card');
const pageSize = 8;
const currentPage = ref(1);
const editOpen = ref(false);
const editing = ref<ContentItem | null>(null);
const saving = ref(false);
const editForm = reactive({
  title: '',
  summary: '',
  body: '',
  category_slug: '',
  tags: [] as string[]
});
const editVideoFile = ref<File | null>(null);
const editCoverFile = ref<File | null>(null);
const editImageFiles = ref<File[]>([]);
const editImagePreviews = ref<string[]>([]);
const editPrimaryImageIndex = ref(0);

const statusOptions = [
  { label: '待审核', value: 'pending' },
  { label: '已发布', value: 'published' },
  { label: '已驳回', value: 'rejected' }
] as const;

const typeTabs = [
  { label: '全部稿件', value: 'all' as const },
  { label: '视频', value: 'video' as const },
  { label: '插画', value: 'image' as const },
  { label: '专栏', value: 'article' as const }
];

const statusTabs = [
  { label: '全部', value: 'all' as const },
  ...statusOptions
];

const typeLabel = (type: string) => ({ video: '视频', image: '插画', article: '专栏' } as Record<string, string>)[type] ?? type;
const statusLabel = (st: string) =>
  ({ pending: '待审核', published: '已发布', rejected: '已驳回' } as Record<string, string>)[st] ?? st;

const formatUpdatedAt = (row: ContentItem) => {
  const iso = (row as any).updated_at ?? (row as any).created_at;
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const filteredItems = computed(() => {
  let list = items.value.slice();
  if (typeFilter.value !== 'all') {
    list = list.filter((it) => it.type === typeFilter.value);
  }
  if (statusFilter.value !== 'all') {
    list = list.filter((it) => it.status === statusFilter.value);
  }
  const q = searchQ.value.trim().toLowerCase();
  if (q) {
    list = list.filter((it) => {
      const cat = String(it.category?.name || '').toLowerCase();
      const reason = String((it as any).reject_reason ?? '').toLowerCase();
      return it.title.toLowerCase().includes(q) || cat.includes(q) || reason.includes(q);
    });
  }
  list.sort((a: any, b: any) => {
    const ak = sortKey.value === 'created' ? a.created_at : a.updated_at;
    const bk = sortKey.value === 'created' ? b.created_at : b.updated_at;
    return String(bk ?? '').localeCompare(String(ak ?? ''));
  });
  return list;
});

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredItems.value.slice(start, start + pageSize);
});

const stats = computed(() => {
  const base = { pending: 0, published: 0, rejected: 0 };
  for (const it of items.value) {
    if (it.status === 'pending') base.pending += 1;
    else if (it.status === 'published') base.published += 1;
    else if (it.status === 'rejected') base.rejected += 1;
  }
  return base;
});
const editGalleryCountText = computed(() => {
  if (!editImageFiles.value.length) return '未选择插画';
  return `已选择 ${editImageFiles.value.length} 张（首图第 ${editPrimaryImageIndex.value + 1} 张）`;
});
const resolveMediaUrl = (src?: string | null) => {
  const value = String(src ?? '').trim();
  if (!value) return '';
  if (/^(https?:|blob:|data:)/.test(value)) return value;
  return `http://localhost:3000${value.startsWith('/') ? value : `/${value}`}`;
};
const currentVideoUrl = computed(() => resolveMediaUrl(editing.value?.media_url));
const currentCoverUrl = computed(() => resolveMediaUrl(editing.value?.cover_url));
const currentGalleryUrls = computed(() => {
  if (editing.value?.type !== 'image') return [] as string[];
  const base = [resolveMediaUrl(editing.value?.media_url), resolveMediaUrl(editing.value?.cover_url)].filter(Boolean);
  const raw = String(editing.value?.body ?? '').trim();
  if (!raw) return Array.from(new Set(base));
  try {
    const parsed = JSON.parse(raw) as { gallery?: string[] } | string[];
    const list =
      Array.isArray(parsed)
        ? parsed.map((x) => resolveMediaUrl(String(x ?? '').trim())).filter(Boolean)
        : Array.isArray((parsed as { gallery?: string[] })?.gallery)
          ? ((parsed as { gallery?: string[] }).gallery ?? []).map((x) => resolveMediaUrl(String(x ?? '').trim())).filter(Boolean)
          : [];
    if (list.length) return Array.from(new Set(list));
  } catch {
    const legacy = raw
      .split(/\r?\n|,/g)
      .map((x) => resolveMediaUrl(x.trim()))
      .filter(Boolean);
    if (legacy.length) return Array.from(new Set(legacy));
  }
  return Array.from(new Set(base));
});

const uploadFile = async (file: File, kind: 'video' | 'cover') => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/videos/upload', fd, {
    params: { kind },
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return String(data.url ?? '');
};

const clearEditImages = () => {
  editImagePreviews.value.forEach((u) => URL.revokeObjectURL(u));
  editImagePreviews.value = [];
  editImageFiles.value = [];
  editPrimaryImageIndex.value = 0;
};

const resetEditMedia = () => {
  editVideoFile.value = null;
  editCoverFile.value = null;
  clearEditImages();
};

const pickEditVideo = (e: Event) => {
  editVideoFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
};

const pickEditCover = (e: Event) => {
  editCoverFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
};

const pickEditImages = (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files ?? []).slice(0, 12);
  clearEditImages();
  editImageFiles.value = files;
  editImagePreviews.value = files.map((f) => URL.createObjectURL(f));
};

const setEditPrimaryImage = (idx: number) => {
  if (idx < 0 || idx >= editImageFiles.value.length) return;
  editPrimaryImageIndex.value = idx;
};

const load = async () => {
  const { data } = await api.get('/contents/mine', { params: { pageSize: 300 } });
  items.value = (data.items ?? []) as ContentItem[];
};

watch([typeFilter, statusFilter, searchQ, sortKey, viewMode], () => {
  currentPage.value = 1;
});

const loadCategories = async (force = false) => {
  const { data } = await api.get('/categories/mine', {
    params: force ? { _t: Date.now() } : undefined
  });
  categories.value = (data.items ?? []) as CategoryItem[];
};

const goDetail = (id: number) => {
  void router.push(`/contents/${id}`);
};

const goPublish = () => {
  void router.push('/upload');
};

const openEdit = (row: ContentItem) => {
  resetEditMedia();
  editing.value = row;
  editForm.title = row.title;
  if (row.type === 'article') {
    editForm.summary = '';
    editForm.body = String(row.body ?? row.summary ?? '');
  } else {
    editForm.summary = String(row.summary ?? '');
    editForm.body = '';
  }
  editForm.category_slug = row.category?.slug ?? '';
  editForm.tags = (row.tags ?? []).map((t) => String(t.tag?.name ?? '')).filter(Boolean);
  editOpen.value = true;
};

const saveEdit = async () => {
  if (!editing.value) return;
  const title = editForm.title.trim();
  if (!title) return ElMessage.warning('标题不能为空');
  if (!editForm.category_slug) return ElMessage.warning('请选择分区');
  if (editing.value?.type === 'article' && editForm.body.trim().length < 20) return ElMessage.warning('正文至少输入 20 个字（Markdown 正文）');
  saving.value = true;
  try {
    let nextMediaUrl: string | undefined;
    let nextCoverUrl: string | undefined;
    let nextBody: string | undefined;

    if (editing.value.type === 'video' && editVideoFile.value) {
      nextMediaUrl = await uploadFile(editVideoFile.value, 'video');
    }
    if (editCoverFile.value) {
      nextCoverUrl = await uploadFile(editCoverFile.value, 'cover');
    }
    if (editing.value.type === 'image' && editImageFiles.value.length) {
      const orderedFiles = [...editImageFiles.value];
      if (editPrimaryImageIndex.value > 0 && editPrimaryImageIndex.value < orderedFiles.length) {
        const [primary] = orderedFiles.splice(editPrimaryImageIndex.value, 1);
        if (primary) orderedFiles.unshift(primary);
      }
      const galleryUrls = await Promise.all(orderedFiles.map((f) => uploadFile(f, 'cover')));
      nextMediaUrl = galleryUrls[0] ?? undefined;
      if (!nextCoverUrl) nextCoverUrl = nextMediaUrl;
      nextBody = JSON.stringify({ gallery: galleryUrls });
    }

    const payload = {
      title,
      summary: editing.value.type === 'article' ? undefined : editForm.summary.trim() || undefined,
      body: editing.value.type === 'article' ? editForm.body.trim() || undefined : editing.value.type === 'image' ? nextBody : undefined,
      category_slug: editForm.category_slug,
      tags: editForm.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12),
      media_url: nextMediaUrl,
      cover_url: nextCoverUrl
    };
    await api.patch(`/contents/${editing.value.id}`, payload);
    ElMessage.success('已保存，稿件已重新进入审核');
    editOpen.value = false;
    resetEditMedia();
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
};

const resubmit = async (id: number) => {
  try {
    await api.post(`/contents/${id}/resubmit`);
    ElMessage.success('已重新提交审核');
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '提交失败');
  }
};

const remove = async (id: number) => {
  await ElMessageBox.confirm('确认删除该作品？删除后不可恢复。', '删除确认', {
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

onMounted(async () => {
  await loadCategories();
  await load();
});
</script>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 24px 22px 60px; }
.head {
  margin-bottom: 14px;
  padding-bottom: 6px;
  position: relative;
}
.head h1 { margin: 0 0 6px; font-size: 26px; }
.head h1 { display: inline-flex; align-items: center; gap: 8px; }
.head-ic { width: 16px; height: 16px; color: #0891b2; flex: 0 0 auto; }
.head p { margin: 0; color: var(--muted); }
.head::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(148,163,184,.42);
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
.type-tabs { display: inline-flex; gap: 10px; flex-wrap: wrap; }
.type-tab {
  border: 0;
  background: transparent;
  padding: 4px 2px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color .15s ease, border-color .15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.type-tab.on {
  color: #0f172a;
  border-bottom-color: #0ea5e9;
  font-weight: 700;
}
.type-tab-ic { width: 14px; height: 14px; flex: 0 0 auto; }
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.seg {
  display: inline-flex;
  border: 1px solid rgba(148,163,184,.26);
  border-radius: 999px;
  background: rgba(248,250,252,.9);
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
  transition: background-color .15s ease, color .15s ease, transform .12s ease;
}
.seg-btn:hover {
  color: var(--text);
  background: rgba(255,255,255,.9);
  transform: translateY(-1px);
}
.seg-btn.on {
  background: rgba(224,242,254,.96);
  color: var(--accent);
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
  background: rgba(248,250,252,.9);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.pending { background: #f97316; }
.dot.ok { background: #22c55e; }
.dot.rejected { background: #ef4444; }
.search-input { width: 220px; }
.search-ic { width: 14px; height: 14px; }
.sort-select { width: 130px; }
.view-toggle {
  border: 0;
  background: rgba(248,250,252,.9);
  border-radius: 999px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
}
.view-ic { width: 14px; height: 14px; }

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
  background: rgba(248,250,252,.88);
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
  background: rgba(15,23,42,.7);
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
.meta-status.st-pending { background: rgba(250,204,21,.14); color: #92400e; }
.meta-status.st-published { background: rgba(34,197,94,.14); color: #166534; }
.meta-status.st-rejected { background: rgba(248,113,113,.14); color: #b91c1c; }
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
.stat-ic { width: 13px; height: 13px; }
.ops {
  display: grid;
  gap: 8px;
  align-content: start;
}
.op-btn {
  border-radius: 999px;
  border: 1px solid rgba(148,163,184,.2);
  background: rgba(255,255,255,.86);
  padding: 5px 11px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: border-color .15s ease, background-color .15s ease, transform .12s ease;
}
.op-btn:hover {
  border-color: rgba(56,189,248,.32);
  background: rgba(240,249,255,.9);
  transform: translateY(-1px);
}
.op-btn:disabled { opacity: .55; cursor: not-allowed; }
.op-ic { width: 13px; height: 13px; flex: 0 0 auto; }
.op-btn.danger {
  border-color: rgba(239,68,68,.26);
  color: #b91c1c;
}
.op-btn.danger:hover {
  border-color: rgba(239,68,68,.4);
  background: rgba(254,242,242,.94);
}
.empty-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
}
.edit-form {
  display: grid;
  gap: 12px;
}
.edit-form :deep(.el-form-item) { margin-bottom: 6px; }
.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-select .el-select__wrapper),
.edit-form :deep(.el-textarea__inner) {
  border-radius: 0;
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.34);
  background: rgba(255,255,255,.6);
  box-shadow: none;
}
.edit-form :deep(.el-input__wrapper.is-focus),
.edit-form :deep(.el-select.is-focused .el-select__wrapper),
.edit-form :deep(.el-select .el-select__wrapper.is-focused),
.edit-form :deep(.el-textarea__inner:focus) {
  border-bottom-color: #0ea5e9;
}
.edit-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.edit-media-block {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(248,250,252,.85);
  box-shadow: 0 0 0 1px rgba(148,163,184,.18);
}
.edit-media-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: #334155;
  font-weight: 700;
}
.edit-file-input {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
  pointer-events: none;
}
.edit-file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148,163,184,.3);
  background: rgba(255,255,255,.78);
  font-size: 12px;
  color: #334155;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease, transform .12s ease;
}
.edit-file-btn:hover {
  border-color: rgba(56,189,248,.45);
  background: rgba(240,249,255,.92);
  transform: translateY(-1px);
}
.edit-file-ic { width: 13px; height: 13px; flex: 0 0 auto; }
.dlg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dlg-btn-ic { width: 14px; height: 14px; flex: 0 0 auto; }
.pager {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}
.toolbar { display: flex; justify-content: space-between; margin: 10px 0 12px; gap: 8px; flex-wrap: wrap; }
.seg {
  display: inline-flex;
  border: 1px solid rgba(148,163,184,.26);
  border-radius: 999px;
  background: rgba(248,250,252,.9);
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
  transition: background-color .15s ease, color .15s ease, transform .12s ease;
}
.seg-btn:hover {
  color: var(--text);
  background: rgba(255,255,255,.9);
  transform: translateY(-1px);
}
.seg-btn.on {
  background: rgba(224,242,254,.96);
  color: var(--accent);
}
.media-tip { margin: 6px 0 0; color: #64748b; font-size: 12px; }
.current-media {
  border-radius: 10px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 0 1px rgba(15,23,42,.18);
}
.current-media.video { width: 100%; max-width: 480px; aspect-ratio: 16 / 9; }
.current-media.image { width: 100%; max-width: 280px; aspect-ratio: 4 / 3; background: #0f172a; }
.current-media video, .current-media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
.current-gallery { display: grid; gap: 8px; }
.current-main {
  position: relative;
  width: 100%;
  max-width: 420px;
  border-radius: 10px;
  overflow: hidden;
  background: #0f172a;
  box-shadow: 0 0 0 1px rgba(15,23,42,.18);
}
.current-main img { width: 100%; aspect-ratio: 16 / 9; object-fit: contain; display: block; }
.current-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  gap: 8px;
  max-width: 420px;
}
.current-strip img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1px solid rgba(15,23,42,.14);
  border-radius: 8px;
}
.edit-gallery {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}
.edit-thumb {
  border: 1px solid rgba(15,23,42,.14);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  padding: 0;
  cursor: pointer;
  position: relative;
}
.edit-thumb.on { border-color: rgba(0,161,214,.45); }
.edit-thumb img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  border-radius: 999px;
  background: rgba(15,23,42,.7);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
}

@media (max-width: 980px) {
  .card-list { grid-template-columns: 1fr; }
  .item-card { grid-template-columns: 170px minmax(0, 1fr); grid-template-rows: auto auto; }
  .ops {
    grid-column: 1 / -1;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, max-content);
    gap: 8px;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .edit-meta-grid { grid-template-columns: 1fr; }
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
    width: min(280px, 66vw);
  }
}
</style>

