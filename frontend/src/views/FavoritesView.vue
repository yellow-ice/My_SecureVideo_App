<template>
  <div class="page">
    <aside class="left panel">
      <h3>
        <svg class="head-ic group-ic" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 8a2 2 0 0 1 2-2h3l1.4 1.6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path d="M8 12h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        我创建的收藏夹
      </h3>
      <div class="new-row">
        <el-input v-model="folderName" placeholder="新建收藏夹名称" @keyup.enter="createFolder" />
        <el-button @click="createFolder">新建</el-button>
      </div>
      <button
        v-for="f in folders"
        :key="f.id"
        type="button"
        class="folder-item"
        :class="{ on: activeFolderId === f.id }"
        @click="selectFolder(f.id)"
      >
        <span class="folder-main">
          <svg class="folder-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
          </svg>
          {{ f.name }}
        </span>
        <span class="count">
          <svg class="count-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21s-7-4.35-7-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6.65-7 11-7 11Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ f._count?.items ?? 0 }}
        </span>
      </button>
    </aside>

    <section class="right panel">
      <header class="head">
        <div>
          <h2>
            <svg class="head-ic active-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4.5 8A2.5 2.5 0 0 1 7 5.5h4.6l1.6 1.9H17A2.5 2.5 0 0 1 19.5 10v6.5A2.5 2.5 0 0 1 17 19H7a2.5 2.5 0 0 1-2.5-2.5V8Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <circle cx="16.8" cy="15.8" r="2" fill="none" stroke="currentColor" stroke-width="1.6" />
            </svg>
            {{ activeFolder?.name || '默认收藏夹' }}
          </h2>
          <p>
            已展示 {{ items.length }} / {{ favoritesTotal || items.length }} 个收藏
          </p>
        </div>
      </header>

      <div v-if="items.length === 0" class="empty">
        <el-empty description="该收藏夹暂无内容" />
      </div>

      <div v-else>
        <div class="grid">
          <article v-for="it in items" :key="it.id" class="card">
          <button class="cover-wrap" type="button" @click="openContent(it.content.id)">
            <img
              v-if="it.content.cover_url"
              :src="it.content.cover_url"
              alt=""
              class="cover"
              loading="lazy"
              decoding="async"
            />
            <div v-else class="cover-ph">{{ typeLabel(it.content.type) }}</div>
          </button>
          <div class="body">
            <p class="title">{{ it.content.title }}</p>
            <p class="meta">
              <svg class="meta-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M3 12l9-9 9 9-9 9-9-9Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
              </svg>
              {{ it.content.category?.name || '-' }} · {{ typeLabel(it.content.type) }}
            </p>
            <div class="ops">
              <el-select v-model="moveTargets[it.id]" size="small" class="move-select">
                <el-option v-for="f in moveFolderOptions(it.folder.id)" :key="f.id" :label="f.name" :value="f.id" />
              </el-select>
              <div class="op-row">
                <el-button size="small" class="op-btn" @click="moveItem(it.id)">
                  <svg class="btn-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M5 12h12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                    <path
                      d="M13 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  移动
                </el-button>
                <el-button size="small" class="op-btn" @click="removeItem(it.id)">
                  <svg class="btn-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M4 7h16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                    <path
                      d="M10 11v7"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                    <path
                      d="M14 11v7"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                    <path
                      d="M6 7l1 14h10l1-14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M9 7V4h6v3"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                    />
                  </svg>
                  移除
                </el-button>
              </div>
            </div>
          </div>
          </article>
        </div>

        <div v-if="items.length < favoritesTotal" class="load-more">
          <el-button :loading="favoritesLoading" @click="loadMore">加载更多</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../services/api';

type FolderItem = { id: number; name: string; is_default: boolean; _count?: { items: number } };
type FavoriteItem = {
  id: number;
  folder: { id: number; name: string };
  content: {
    id: number;
    type: 'video' | 'image' | 'article';
    title: string;
    summary?: string | null;
    body?: string | null;
    cover_url?: string | null;
    category?: { name: string };
  };
};

const router = useRouter();
const folders = ref<FolderItem[]>([]);
const items = ref<FavoriteItem[]>([]);
const activeFolderId = ref(0);
const folderName = ref('');
const moveTargets = reactive<Record<number, number>>({});
const favoritesPage = ref(1);
const favoritesPageSize = ref(24);
const favoritesTotal = ref(0);
const favoritesLoading = ref(false);

const activeFolder = computed(() => folders.value.find((f) => f.id === activeFolderId.value) || null);
const typeLabel = (t: string) => ({ video: '视频', image: '插画', article: '专栏' } as any)[t] ?? t;

const loadFolders = async () => {
  const { data } = await api.get('/contents/favorites/folders');
  folders.value = (data.items ?? []) as FolderItem[];
  if (!activeFolderId.value && folders.value.length) activeFolderId.value = folders.value[0]!.id;
};

const resetMoveTargets = () => {
  for (const k of Object.keys(moveTargets)) delete moveTargets[Number(k)];
};

const loadItems = async (reset = false) => {
  if (!activeFolderId.value) return;
  if (reset) {
    favoritesPage.value = 1;
    favoritesTotal.value = 0;
    items.value = [];
    resetMoveTargets();
  }

  favoritesLoading.value = true;
  try {
    const { data } = await api.get('/contents/favorites/items', {
      params: {
        folderId: activeFolderId.value,
        page: favoritesPage.value,
        pageSize: favoritesPageSize.value
      }
    });
    const next = (data.items ?? []) as FavoriteItem[];
    favoritesTotal.value = Number(data.total ?? 0);
    items.value = reset ? next : [...items.value, ...next];

    next.forEach((it) => {
      moveTargets[it.id] = folders.value.find((f) => f.id !== it.folder.id)?.id ?? it.folder.id;
    });
  } finally {
    favoritesLoading.value = false;
  }
};

const selectFolder = (id: number) => {
  activeFolderId.value = id;
  void loadItems(true);
};

const loadMore = async () => {
  if (favoritesLoading.value) return;
  if (!favoritesTotal.value) return;
  if (items.value.length >= favoritesTotal.value) return;
  favoritesPage.value += 1;
  await loadItems(false);
};

const createFolder = async () => {
  const name = folderName.value.trim();
  if (!name) return;
  try {
    await api.post('/contents/favorites/folders', { name });
    folderName.value = '';
    await loadFolders();
    await loadItems(true);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '创建失败');
  }
};

const moveFolderOptions = (currentFolderId: number) => folders.value.filter((f) => f.id !== currentFolderId);

const moveItem = async (id: number) => {
  const targetFolderId = Number(moveTargets[id]);
  if (!targetFolderId) return ElMessage.warning('请选择目标收藏夹');
  try {
    await api.patch(`/contents/favorites/items/${id}`, { targetFolderId });
    ElMessage.success('已移动');
    await loadFolders();
    await loadItems(true);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '移动失败');
  }
};

const removeItem = async (id: number) => {
  await api.delete(`/contents/favorites/items/${id}`);
  await loadFolders();
  await loadItems(true);
};

const openContent = (id: number) => {
  void router.push(`/contents/${id}`);
};

onMounted(async () => {
  await loadFolders();
  await loadItems(true);
});
</script>

<style scoped>
.page { max-width: 1300px; margin: 0 auto; padding: 22px; display: grid; grid-template-columns: minmax(230px, 280px) minmax(0, 1fr); gap: 12px; }
.panel { border: 0; border-radius: 12px; background: rgba(255,255,255,.92); }
.left { padding: 12px; }
.left h3 {
  margin: 0 0 10px;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.head-ic { width: 16px; height: 16px; color: #0891b2; flex: 0 0 auto; }
.group-ic { color: #0ea5e9; }
.active-ic { color: #0891b2; }
.new-row { display: flex; gap: 8px; margin-bottom: 10px; }
.new-row :deep(.el-input__wrapper) {
  border-radius: 0;
  box-shadow: none;
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.3);
  background: transparent;
}
.new-row :deep(.el-input__wrapper.is-focus) {
  border-bottom-color: rgba(14,165,233,.55);
}
.folder-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.22);
  background: transparent;
  padding: 10px 4px 10px 2px;
  margin-bottom: 2px;
  cursor: pointer;
}
.folder-item.on { border-bottom-color: rgba(14,165,233,.5); color: var(--accent); }
.folder-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.folder-ic { width: 14px; height: 14px; color: #0891b2; flex: 0 0 auto; }
.count { color: #64748b; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }
.count-ic { width: 14px; height: 14px; color: var(--accent); }
.right { padding: 12px; }
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 6px;
  position: relative;
}
.head h2 {
  margin: 0 0 4px;
  font-size: 24px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.head p { margin: 0; color: var(--muted); font-size: 13px; }
.head::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(148,163,184,.42);
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; align-items: stretch; }
.card {
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(248,250,252,.86);
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.76);
}
.cover-wrap { width: 100%; border: 0; background: transparent; padding: 0; cursor: pointer; }
.cover { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
.cover-ph { width: 100%; aspect-ratio: 16/9; display: grid; place-items: center; color: #64748b; background: #f1f5f9; }
.body { padding: 8px; display: grid; gap: 8px; }
.title { margin: 0 0 4px; color: #0f172a; font-weight: 700; font-size: 14px; line-height: 1.4; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.meta { margin: 0; color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.meta-ic { width: 14px; height: 14px; color: var(--accent); flex: 0 0 auto; }
.ops {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  padding-top: 4px;
  border-top: 1px solid rgba(148,163,184,.14);
}
.op-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.move-select { width: 100%; min-width: 0; }
.move-select :deep(.el-select__wrapper) {
  border-radius: 0;
  box-shadow: none;
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.26);
  background: transparent;
}
.move-select :deep(.is-focused.el-select__wrapper),
.move-select :deep(.el-select__wrapper.is-focused) {
  border-bottom-color: rgba(14,165,233,.55);
}
.op-btn {
  width: 100%;
  padding: 6px 0;
  margin: 0;
  border: 0;
  border-bottom: 1px solid rgba(148,163,184,.24);
  border-radius: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #475569;
}
.op-btn:hover {
  color: #0284c7;
  border-bottom-color: rgba(14,165,233,.45);
}
.btn-ic { width: 14px; height: 14px; flex: 0 0 auto; color: var(--accent); }
.load-more { margin-top: 12px; display: flex; justify-content: center; }
.empty { border: 0; border-radius: 10px; background: rgba(248,250,252,.72); }
@media (max-width: 900px) {
  .page { grid-template-columns: 1fr; padding: 14px; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
}
@media (max-width: 620px) {
  .grid { grid-template-columns: 1fr; }
  .new-row { grid-template-columns: 1fr auto; display: grid; }
}
</style>
