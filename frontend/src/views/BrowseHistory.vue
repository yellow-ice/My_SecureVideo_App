<template>
  <div class="page">
    <header class="head">
      <div class="head-title">
        <span class="head-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7" />
          </svg>
        </span>
        <h2>历史记录</h2>
      </div>
      <p class="muted">最近查看的内容</p>
      <div class="tools">
        <div class="tabs">
          <button class="tab" :class="{ on: activeType === 'all' }" @click="activeType = 'all'">综合</button>
          <button class="tab" :class="{ on: activeType === 'video' }" @click="activeType = 'video'">视频</button>
          <button class="tab" :class="{ on: activeType === 'image' }" @click="activeType = 'image'">插画</button>
          <button class="tab" :class="{ on: activeType === 'article' }" @click="activeType = 'article'">专栏</button>
        </div>
        <div class="ops">
          <el-input v-model="searchQ" placeholder="搜索标题/分区" clearable class="search-input" />
          <el-button @click="clearHistory">清空历史</el-button>
        </div>
      </div>
    </header>

    <section v-if="loading" class="empty">
      <el-empty description="加载中..." />
    </section>

    <section v-else-if="historyItems.length === 0" class="empty">
      <el-empty description="暂无浏览记录" />
    </section>

    <section v-else-if="filteredHistoryItems.length === 0" class="empty">
      <el-empty description="没有匹配的历史记录" />
    </section>

    <section v-else class="timeline-layout">
      <aside class="timeline-nav">
        <div class="timeline-line" aria-hidden="true"></div>
        <button
          v-for="g in groupedHistoryItems"
          :key="`nav-${g.key}`"
          type="button"
          class="timeline-node"
          @click="jumpToGroup(g.key)"
        >
          <span class="dot" aria-hidden="true"></span>
          <span class="label">{{ g.label }}</span>
        </button>
      </aside>

      <div class="timeline-content">
        <section v-for="g in groupedHistoryItems" :id="`history-group-${g.key}`" :key="g.key" class="group-block">
          <h3 class="group-title">{{ g.label }}</h3>
          <div class="grid">
            <article v-for="it in g.items" :key="it.id" class="card">
              <button type="button" class="cover-wrap" @click="go(it.id)">
                <img
                  v-if="it.cover_url"
                  :src="it.cover_url"
                  alt=""
                  class="cover"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="cover-ph">{{ typeLabel(it.type) }}</div>
                <span class="type">{{ typeLabel(it.type) }}</span>
                <span class="watch-cta" aria-hidden="true">
                  <svg class="watch-ic" viewBox="0 0 24 24">
                    <path
                      d="M8 5h8a3 3 0 0 1 3 3v11H5V8a3 3 0 0 1 3-3Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M9 9h6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                    <path
                      d="M10 13h4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                  </svg>
                  继续观看
                </span>
              </button>

              <div class="body">
                <h3 class="title" @click="go(it.id)">{{ it.title }}</h3>
                <div class="meta">
                  <span class="tag"># {{ it.category?.name || it.category?.slug || '未分区' }}</span>
                  <span class="time">{{ formatViewedAt(it.viewedAt) }}</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ContentItem } from '../types';
import api from '../services/api';
import { useUserStore } from '../stores/user';
import { ElMessageBox, ElMessage } from 'element-plus';

type HistoryEntry = { id: number; viewedAt: number };
type HistoryItem = ContentItem & { viewedAt: number };

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const historyItems = ref<HistoryItem[]>([]);
const activeType = ref<'all' | ContentItem['type']>('all');
const searchQ = ref('');
const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

const typeLabel = (t: ContentItem['type']) => ({ video: '视频', image: '插画', article: '专栏' } as const)[t] ?? t;

const getHistoryStorageKey = () => `sv_browse_history_${userStore.user?.id ?? 'guest'}`;

const readHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(getHistoryStorageKey());
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - fiveDaysMs;
    const cleaned = parsed
      .filter((x) => x && Number.isFinite(x.id) && Number.isFinite(Number(x.viewedAt)))
      .map((x) => ({ id: Number(x.id), viewedAt: Number(x.viewedAt) }))
      .filter((x) => x.viewedAt >= cutoff)
      .slice(0, 50);
    localStorage.setItem(getHistoryStorageKey(), JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return [];
  }
};

const formatViewedAt = (ms: number) => {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const m = d.getMonth() + 1;
  const dayNum = d.getDate();
  return `${m}-${dayNum} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const filteredHistoryItems = computed(() => {
  const q = searchQ.value.trim().toLowerCase();
  return historyItems.value.filter((it) => {
    if (activeType.value !== 'all' && it.type !== activeType.value) return false;
    if (!q) return true;
    const cat = String(it.category?.name || it.category?.slug || '').toLowerCase();
    return String(it.title || '').toLowerCase().includes(q) || cat.includes(q);
  });
});

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const daysAgo = (ts: number) => {
  const today = startOfDay(Date.now());
  const target = startOfDay(ts);
  return Math.floor((today - target) / (24 * 60 * 60 * 1000));
};

const groupLabel = (d: number) => {
  if (d <= 0) return '今天';
  if (d === 1) return '昨天';
  if (d === 2) return '前天';
  return `${d}天前`;
};

const groupedHistoryItems = computed(() => {
  const map = new Map<number, HistoryItem[]>();
  for (const it of filteredHistoryItems.value) {
    const d = daysAgo(it.viewedAt);
    if (d < 0 || d >= 5) continue;
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(it);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, items]) => ({ key: String(d), days: d, label: groupLabel(d), items }));
});

const load = async () => {
  loading.value = true;
  historyItems.value = [];

  const entries = readHistory();
  if (entries.length === 0) {
    loading.value = false;
    return;
  }

  const viewedAtMap = new Map(entries.map((e) => [e.id, e.viewedAt]));
  const ids = entries.map((e) => e.id).slice(0, 20);

  const results = await Promise.allSettled(ids.map((id) => api.get(`/contents/${id}`)));
  const next: HistoryItem[] = [];

  for (const [idx, r] of results.entries()) {
    const id = ids[idx]!;
    if (r.status !== 'fulfilled') continue;
    const it = r.value.data?.item as ContentItem | undefined;
    if (!it) continue;
    next.push({
      ...it,
      viewedAt: viewedAtMap.get(id) ?? Date.now()
    });
  }

  historyItems.value = next;
  loading.value = false;
};

const go = (id: number) => {
  void router.push(`/contents/${id}`);
};

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定清空当前账号的浏览历史吗？', '清空历史', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消'
    });
    localStorage.removeItem(getHistoryStorageKey());
    historyItems.value = [];
    ElMessage.success('浏览历史已清空');
  } catch {
    // cancel
  }
};

const jumpToGroup = (key: string) => {
  const el = document.getElementById(`history-group-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

onMounted(() => {
  void load();
});
</script>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 22px 18px 68px;
}
.head {
  margin-bottom: 14px;
}
.head-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.head-ic {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.12);
}
.head-ic svg { width: 16px; height: 16px; }
.head h2 {
  margin: 0 0 6px;
  font-size: 26px;
}
.muted {
  margin: 0;
  color: var(--muted);
}
.tools {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.tabs { display: inline-flex; gap: 8px; flex-wrap: wrap; }
.tab {
  border: 0;
  background: transparent;
  color: #64748b;
  padding: 6px 6px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color .15s ease, border-color .15s ease;
}
.tab.on {
  color: #0891b2;
  border-bottom-color: #0891b2;
  font-weight: 700;
}
.ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.search-input {
  width: min(300px, 58vw);
}
.empty {
  padding: 22px 0;
}
.timeline-layout {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.timeline-nav {
  position: sticky;
  top: 84px;
  padding: 6px 0;
}
.timeline-line {
  position: absolute;
  left: 14px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: rgba(100, 116, 139, 0.22);
}
.timeline-node {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  color: #475569;
  font-size: 14px;
  padding: 9px 2px;
  cursor: pointer;
}
.timeline-node .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #64748b;
  box-sizing: border-box;
}
.timeline-node:hover {
  color: #0f172a;
}
.timeline-node:hover .dot {
  border-color: #0891b2;
}
.timeline-content {
  min-width: 0;
}
.group-block + .group-block {
  margin-top: 16px;
}
.group-title {
  margin: 0 0 10px;
  font-size: 16px;
  color: #334155;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  overflow: hidden;
  transition: border-color .16s ease, transform .12s ease, box-shadow .16s ease;
}
.card:hover {
  border-color: rgba(8, 145, 178, 0.35);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}
.cover-wrap {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}
.cover {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  background: #f8fafc;
  display: block;
}
.cover-ph {
  width: 100%;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
  background: #f1f5f9;
  font-weight: 700;
}
.type {
  position: absolute;
  left: 10px;
  top: 10px;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
}
.watch-cta {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 161, 214, 0.25);
  color: var(--accent);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}
.watch-ic { width: 14px; height: 14px; }
.body {
  margin-top: 9px;
}
.title {
  margin: 0;
  cursor: pointer;
  font-size: 14px;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
}
.tag {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time {
  flex-shrink: 0;
}

@media (max-width: 1180px) {
  .timeline-layout { grid-template-columns: 90px minmax(0, 1fr); }
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .timeline-layout { grid-template-columns: 1fr; }
  .timeline-nav {
    position: relative;
    top: 0;
    display: flex;
    gap: 10px;
    overflow: auto;
    padding: 0 0 6px;
  }
  .timeline-line { display: none; }
  .timeline-node {
    width: auto;
    flex: 0 0 auto;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 999px;
    padding: 6px 10px;
  }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 620px) {
  .grid { grid-template-columns: 1fr; }
}
</style>

