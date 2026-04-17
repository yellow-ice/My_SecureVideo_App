<template>
  <div class="page">
    <header class="head">
      <h1 class="title">攻防演练</h1>
      <p class="muted intro">按攻击脚本展示行为链：攻击方式、拦截结果、入侵成功后数据泄露动作。</p>
    </header>

    <section class="panel">
      <div class="section-title">防护开关</div>
      <div class="switch-row">
        <el-switch v-model="securitySwitches.defenseEnabled" active-text="WAF拦截开关" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.userProtectionEnabled" active-text="保护用户信息开关" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.antiCrawlerEnabled" active-text="反爬虫开关" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.chatEncryptionEnabled" active-text="对话加密开关" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.configLeakProtectionEnabled" active-text="配置泄露保护" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.idorProtectionEnabled" active-text="越权(IDOR)保护" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.ssrfProtectionEnabled" active-text="SSRF保护" @change="saveSwitches" />
        <el-switch v-model="securitySwitches.traversalProtectionEnabled" active-text="路径遍历保护" @change="saveSwitches" />
      </div>
    </section>

    <nav class="tabs">
      <button class="tab" :class="{ on: activePane === 'crack' }" @click="activePane = 'crack'">
        <span class="tab-inner">
          <svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            <path d="M7 10h10v9H7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          </svg>
          用户账号密码
        </span>
      </button>
      <button class="tab" :class="{ on: activePane === 'crawler' }" @click="activePane = 'crawler'">
        <span class="tab-inner">
          <svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
          爬虫与对话
        </span>
      </button>
    </nav>

    <section v-show="activePane === 'crack'" class="panel">
      <div class="section-title">用户账号密码破解</div>
      <div class="crack-toolbar">
        <div class="crack-row crack-row-top">
          <el-select v-model="crackMode" size="small" class="mode-sel">
            <el-option label="字典破解" value="dictionary" />
            <el-option label="暴力破解" value="bruteforce" />
          </el-select>
          <template v-if="crackMode === 'dictionary'">
            <div class="mode-config">
              <input id="dict-file-input" class="dict-file-input" type="file" accept=".txt,text/plain" @change="onPickDictionaryFile" />
              <label class="dict-file-btn" for="dict-file-input">选择字典（txt）</label>
              <button type="button" class="icon-btn subtle" :disabled="!customDictionary.length" @click="clearDictionary">清空</button>
              <span class="muted-inline">{{ customDictionary.length ? `已加载 ${customDictionary.length} 行` : '未导入字典，使用系统默认字典' }}</span>
            </div>
          </template>
          <template v-else>
            <div class="mode-config">
              <el-switch v-model="bruteUseRange" size="small" active-text="启用范围" inactive-text="不跑范围" />
              <span class="muted-inline">范围</span>
              <el-input v-model="bruteStart" :disabled="!bruteUseRange" size="small" class="range-inp" placeholder="000000" />
              <span class="muted-inline">-</span>
              <el-input v-model="bruteEnd" :disabled="!bruteUseRange" size="small" class="range-inp" placeholder="999999" />
              <el-switch v-model="bruteUsePreset" size="small" active-text="启用预设" inactive-text="仅范围" />
              <span class="muted-inline">字符集</span>
              <el-input v-model="bruteCharset" size="small" class="charset-inp" placeholder="abc123!@#" />
            </div>
          </template>
        </div>
        <div class="crack-row">
          <button type="button" class="icon-btn primary" :disabled="crackLoading" @click="generateCrack">
            <svg class="ib-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
            生成并播放
          </button>
          <button type="button" class="icon-btn danger" :disabled="!crackPlaying" @click="stopCrack">
            <svg class="ib-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8h8v8H8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
            停止
          </button>
          <el-switch v-model="onlyShowCrackSuccess" size="small" active-text="仅显示成功" inactive-text="显示全部" />
          <span class="muted-inline">{{ crackSummaryText }}</span>
          <span class="muted-inline">阶段进度 {{ crackStageProgress }}%</span>
        </div>
      </div>
      <div class="log-panel">
        <div v-for="(line, idx) in crackLogs" :key="idx" class="log-line">{{ line }}</div>
        <div v-if="crackLogs.length === 0" class="log-empty">点击“播放”查看破解阶段日志动画</div>
      </div>
      <el-table v-if="crackDemo?.results?.length" :data="crackResultRows" size="small" stripe style="margin-top: 10px">
        <el-table-column prop="email" label="账号" min-width="190" />
        <el-table-column prop="attempts" label="次数" width="90" />
        <el-table-column label="结果" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.found ? 'danger' : 'info'">{{ row.found ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="密码" min-width="150">
          <template #default="{ row }">
            <span v-if="row.found" class="mono">{{ row.foundPassword }}</span>
            <span v-else class="muted-inline">-</span>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-show="activePane === 'crawler'" class="panel">
      <div class="section-title">爬虫信息与未加密对话</div>
      <div class="acquire-row">
        <button type="button" class="icon-btn primary" :disabled="acquiring" @click="acquireSelectedData">
          <svg class="ib-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          执行攻击脚本
        </button>
        <!-- 导出对话移入资产筛选栏「对话」 -->
      </div>
      <div v-if="assetsAll.length" class="asset-section">
        <div class="asset-head">
          <span class="asset-title">
            <svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            已获取资产
          </span>
          <span class="muted-inline">视频 {{ assetsVideo.length }} · 插画 {{ assetsImage.length }}（{{ imageCountTotal }} 张） · 专栏 {{ assetsArticle.length }}</span>
        </div>

        <div class="asset-filter">
          <button type="button" class="chip" :class="{ on: assetFilter === 'all' }" @click="assetFilter = 'all'">全部</button>
          <button type="button" class="chip" :class="{ on: assetFilter === 'video' }" @click="assetFilter = 'video'">视频</button>
          <button type="button" class="chip" :class="{ on: assetFilter === 'image' }" @click="assetFilter = 'image'">插画</button>
          <button type="button" class="chip" :class="{ on: assetFilter === 'article' }" @click="assetFilter = 'article'">专栏</button>
          <button
            type="button"
            class="chip"
            :class="{ on: assetFilter === 'chat' }"
            :disabled="!chatRows.length"
            @click="assetFilter = 'chat'"
          >
            对话
          </button>
        </div>

        <div class="asset-cards">
          <div v-for="a in assetsPageView" :key="`${a.kind}:${a.id}`" class="asset-card">
            <div v-if="a.kind !== 'chat'" class="thumb">
              <img v-if="a.thumbUrl" :src="a.thumbUrl" :alt="a.title" />
              <div v-else class="thumb-ph">
                <svg class="ph-ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                  <path d="M7 15l3-3 3 3 2-2 2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="badge"><span class="pill">{{ a.kindLabel }}</span></div>
              <div class="hover-actions">
                <button type="button" class="hbtn" :disabled="!a.downloadUrl" @click="downloadAsset(a)">
                  <svg class="h-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v10m0 0 4-4m-4 4-4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                  下载
                </button>
                <button v-if="a.kind === 'image' && (a.imageUrls?.length ?? 0) > 1" type="button" class="hbtn" @click="downloadAllImages(a)">
                  <svg class="h-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 7h12v12H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M5 5h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M5 5v12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                  全部
                </button>
                <button type="button" class="hbtn" :disabled="!a.downloadUrl" @click="copyAssetLink(a)">
                  <svg class="h-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10 14a4 4 0 0 1 0-6l1-1a4 4 0 0 1 6 6l-1 1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    <path d="M14 10a4 4 0 0 1 0 6l-1 1a4 4 0 0 1-6-6l1-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                  复制链接
                </button>
                <button v-if="a.kind === 'article'" type="button" class="hbtn" @click="exportArticle(a)">
                  <svg class="h-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                    <path d="M9 12h6M9 15h6M9 9h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                  导出
                </button>
                <button v-if="a.kind === 'chat'" type="button" class="hbtn" @click="exportChatTxt">
                  <svg class="h-ic" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h12v11H9l-3 3V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M9 8h6M9 11h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                  导出
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="card-title" :title="a.title">{{ a.title }}</div>
              <div class="card-meta">
                <span class="muted-inline">ID {{ a.id }}</span>
                <span v-if="a.kind === 'image'" class="muted-inline">图片 {{ a.imageCount }} 张</span>
                <span v-if="a.kind === 'article'" class="muted-inline">约 {{ a.wordLikePages }} 页</span>
                <span v-if="a.kind === 'chat'" class="muted-inline">{{ chatRows.length }} 条</span>
              </div>
              <div v-if="a.kind === 'chat'" class="chat-link-row">
                <button type="button" class="chat-link" @click="exportChatTxt">下载对话 txt</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="assetsTotal > pageSize" class="pager">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="assetsTotal"
            layout="prev, pager, next, total"
            background
            small
          />
        </div>
      </div>
      <div class="log-panel">
        <div v-for="(line, idx) in acquireLogs" :key="idx" class="log-line">{{ line }}</div>
        <div v-if="acquireLogs.length === 0" class="log-empty">执行后将显示攻击脚本、拦截状态、泄露明细</div>
      </div>
      <div v-if="chatRows.length" class="chat-preview">对话已截取：{{ chatRows.length }} 条（切换到「对话」查看并导出）</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../services/api';

const activePane = ref<'crack' | 'crawler'>('crack');
const crackPlaying = ref(false);
const crackLoading = ref(false);
const crackLogs = ref<string[]>([]);
const crackTimer = ref<number | null>(null);
const crackMode = ref<'dictionary' | 'bruteforce'>('dictionary');
const onlyShowCrackSuccess = ref(true);
const customDictionary = ref<string[]>([]);
const customDictMeta = ref<{ name: string; fingerprint: string; loadedAt: number } | null>(null);
// 默认不强塞超大范围，避免把尝试次数用完导致“自定义字符集没参与”
const bruteStart = ref('');
const bruteEnd = ref('');
const bruteCharset = ref('');
const bruteUsePreset = ref(false);
const bruteUseRange = ref(false);
const crackDemoLocal = ref<any | null>(null);
const crackStageProgress = ref(0);
const crackTimelineIdx = ref(0);
const securitySwitches = ref({
  defenseEnabled: true,
  userProtectionEnabled: true,
  antiCrawlerEnabled: true,
  chatEncryptionEnabled: true,
  configLeakProtectionEnabled: true,
  idorProtectionEnabled: true,
  ssrfProtectionEnabled: true,
  traversalProtectionEnabled: true
});
const acquireLogs = ref<string[]>([]);
const acquiring = ref(false);
const acquiredData = ref<{ crawler?: any; chat?: any }>({});
const assetFilter = ref<'all' | 'video' | 'image' | 'article' | 'chat'>('all');
const page = ref(1);
const pageSize = 6;

const fetchState = async () => {
  const { data } = await api.get('/admin/security/settings');
  securitySwitches.value.defenseEnabled = Boolean(data.defenseEnabled ?? data.wafBlockEnabled ?? true);
  securitySwitches.value.userProtectionEnabled = Boolean(data.userProtectionEnabled ?? true);
  securitySwitches.value.antiCrawlerEnabled = Boolean(data.antiCrawlerEnabled ?? true);
  securitySwitches.value.chatEncryptionEnabled = Boolean(data.chatEncryptionEnabled ?? true);
  securitySwitches.value.configLeakProtectionEnabled = Boolean(data.configLeakProtectionEnabled ?? true);
  securitySwitches.value.idorProtectionEnabled = Boolean(data.idorProtectionEnabled ?? true);
  securitySwitches.value.ssrfProtectionEnabled = Boolean(data.ssrfProtectionEnabled ?? true);
  securitySwitches.value.traversalProtectionEnabled = Boolean(data.traversalProtectionEnabled ?? true);
};

const saveSwitches = async () => {
  await api.post('/admin/security/switches', {
    userProtectionEnabled: securitySwitches.value.userProtectionEnabled,
    antiCrawlerEnabled: securitySwitches.value.antiCrawlerEnabled,
    chatEncryptionEnabled: securitySwitches.value.chatEncryptionEnabled,
    configLeakProtectionEnabled: securitySwitches.value.configLeakProtectionEnabled,
    idorProtectionEnabled: securitySwitches.value.idorProtectionEnabled,
    ssrfProtectionEnabled: securitySwitches.value.ssrfProtectionEnabled,
    traversalProtectionEnabled: securitySwitches.value.traversalProtectionEnabled
  });
  await api.post('/admin/security/toggle-defense', { enabled: securitySwitches.value.defenseEnabled });
  ElMessage.success('防护开关已更新');
};

const crackDemo = computed(() => {
  if (!crackDemoLocal.value) return null;
  const mode = crackDemoLocal.value?.mode === 'bruteforce' ? 'bruteforce' : 'dictionary';
  return mode === crackMode.value ? crackDemoLocal.value : null;
});
const crawlerVideos = computed<any[]>(() => acquiredData.value.crawler?.groups?.video ?? []);
const crawlerImages = computed<any[]>(() => acquiredData.value.crawler?.groups?.image ?? []);
const crawlerArticles = computed<any[]>(() => acquiredData.value.crawler?.groups?.article ?? []);
const chatRows = computed<any[]>(() => acquiredData.value.chat?.items ?? []);
const imageCountTotal = computed(() => crawlerImages.value.reduce((acc, x) => acc + Number(x?.imageCount ?? 0), 0));

type AssetKind = 'video' | 'image' | 'article' | 'chat';
type AssetCard = {
  kind: AssetKind;
  kindLabel: string;
  id: number | string;
  title: string;
  thumbUrl: string;
  downloadUrl: string;
  imageUrls?: string[];
  imageCount: number;
  wordLikePages: number;
  summary?: string;
  body?: string;
};

const toAbsoluteAssetUrl = (raw: string): string => {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads')) return `http://localhost:3000${raw}`;
  return `http://localhost:3000/uploads/${raw.replace(/^\/+/, '')}`;
};

const normAsset = (kind: AssetKind, raw: any): AssetCard => {
  const id = raw?.id ?? '';
  const title = String(raw?.title ?? `未命名-${kind}-${id}`).trim() || `未命名-${kind}-${id}`;
  const downloadUrl = toAbsoluteAssetUrl(String(raw?.downloadUrl ?? raw?.media_url ?? raw?.cover_url ?? ''));
  const thumbUrl = toAbsoluteAssetUrl(String(raw?.cover_url ?? raw?.media_url ?? raw?.downloadUrl ?? ''));
  const imageUrls = Array.isArray(raw?.imageUrls) ? raw.imageUrls.map((u: any) => toAbsoluteAssetUrl(String(u ?? ''))).filter(Boolean) : [];
  return {
    kind,
    kindLabel: kind === 'video' ? '视频' : kind === 'image' ? '插画' : kind === 'article' ? '专栏' : '对话',
    id,
    title,
    thumbUrl,
    downloadUrl,
    imageUrls,
    imageCount: Number(raw?.imageCount ?? 0),
    wordLikePages: Number(raw?.wordLikePages ?? 0),
    summary: raw?.summary ?? '',
    body: raw?.body ?? ''
  };
};

const assetsVideo = computed<AssetCard[]>(() => crawlerVideos.value.map((x) => normAsset('video', x)));
const assetsImage = computed<AssetCard[]>(() => crawlerImages.value.map((x) => normAsset('image', x)));
const assetsArticle = computed<AssetCard[]>(() => crawlerArticles.value.map((x) => normAsset('article', x)));
const assetsChat = computed<AssetCard[]>(() =>
  chatRows.value.length
    ? [
        {
          kind: 'chat',
          kindLabel: '对话',
          id: 'chat',
          title: '对话数据（导出 txt）',
          thumbUrl: '',
          downloadUrl: '',
          imageUrls: [],
          imageCount: 0,
          wordLikePages: 0
        }
      ]
    : []
);
const assetsAll = computed<AssetCard[]>(() => [...assetsVideo.value, ...assetsImage.value, ...assetsArticle.value, ...assetsChat.value]);
const assetsView = computed<AssetCard[]>(() => {
  if (assetFilter.value === 'video') return assetsVideo.value;
  if (assetFilter.value === 'image') return assetsImage.value;
  if (assetFilter.value === 'article') return assetsArticle.value;
  if (assetFilter.value === 'chat') return assetsChat.value;
  return assetsAll.value;
});
const assetsTotal = computed(() => assetsView.value.length);
const assetsPageView = computed(() => {
  const start = (page.value - 1) * pageSize;
  return assetsView.value.slice(start, start + pageSize);
});

watch(assetFilter, () => {
  page.value = 1;
});

watch(crackMode, () => {
  crackDemoLocal.value = null;
  crackLogs.value = [];
  crackStageProgress.value = 0;
});

const playCrack = () => {
  if (!crackDemo.value) {
    ElMessage.warning('暂无破解结果，请先点击“生成结果”（或启动一次演练）');
    return;
  }
  stopCrack();
  crackPlaying.value = true;
  crackTimelineIdx.value = 0;
  const demo = crackDemo.value;
  const timeline = (demo?.timeline ?? []) as Array<{ kind?: string; msg: string }>;
  const total = timeline.length || 1;
  crackTimer.value = window.setInterval(() => {
    if (crackTimelineIdx.value >= timeline.length) {
      stopCrack();
      return;
    }
    const row = timeline[crackTimelineIdx.value]!;
    const prefix = row?.kind === 'hit' ? '✅' : row?.kind === 'miss' ? '✖' : row?.kind === 'done' ? '■' : '·';
    crackStageProgress.value = Math.min(100, Math.round(((crackTimelineIdx.value + 1) / total) * 100));
    crackLogs.value.push(`${new Date().toLocaleTimeString()} ${prefix} [${crackStageProgress.value}%] ${row.msg}`);
    if (crackLogs.value.length > 60) crackLogs.value = crackLogs.value.slice(-60);
    crackTimelineIdx.value += 1;
  }, 220);
};

const crackResultRows = computed(() => {
  const rows = ((crackDemo.value?.results ?? []) as Array<any>).slice();
  rows.sort((a, b) => Number(Boolean(b?.found)) - Number(Boolean(a?.found)));
  if (onlyShowCrackSuccess.value) return rows.filter((r) => Boolean(r?.found));
  return rows;
});

const crackSummaryText = computed(() => {
  const demo = crackDemo.value;
  if (!demo) return '';
  const success = Number(demo?.successCount ?? (Array.isArray(demo?.results) ? demo.results.filter((r: any) => r?.found).length : 0));
  const total = Number(demo?.targetCount ?? (Array.isArray(demo?.results) ? demo.results.length : 0));
  if (!total) return '暂无破解结果';
  return `成功 ${success} / ${total}`;
});

const normalizeRange = (v: string) => String(v ?? '').trim();

const pushCrackLog = (line: string) => {
  crackLogs.value.push(`${new Date().toLocaleTimeString()} ${line}`);
  if (crackLogs.value.length > 80) crackLogs.value = crackLogs.value.slice(-80);
};

const fmtSwitches = () =>
  `WAF拦截=${securitySwitches.value.defenseEnabled ? 'ON' : 'OFF'}，保护用户信息=${securitySwitches.value.userProtectionEnabled ? 'ON' : 'OFF'}，反爬虫=${securitySwitches.value.antiCrawlerEnabled ? 'ON' : 'OFF'}，对话加密=${securitySwitches.value.chatEncryptionEnabled ? 'ON' : 'OFF'}，配置泄露保护=${securitySwitches.value.configLeakProtectionEnabled ? 'ON' : 'OFF'}，IDOR保护=${securitySwitches.value.idorProtectionEnabled ? 'ON' : 'OFF'}，SSRF保护=${securitySwitches.value.ssrfProtectionEnabled ? 'ON' : 'OFF'}，路径遍历保护=${securitySwitches.value.traversalProtectionEnabled ? 'ON' : 'OFF'}`;

const generateCrack = async () => {
  crackLoading.value = true;
  crackLogs.value = [];
  crackStageProgress.value = 0;
  try {
    pushCrackLog(`开始生成破解结果（${fmtSwitches()}）`);

    pushCrackLog('Step#1 请求 GET /api/leak/users（目标：外带用户 password_hash）');
    const leakResp = await api.get('/leak/users', { validateStatus: () => true });
    pushCrackLog(`Step#1 响应：HTTP ${leakResp.status}`);
    if (leakResp.status >= 400) {
      const msg = String(leakResp.data?.message ?? 'unknown');
      pushCrackLog(`Step#1 失败：${msg}`);
      if (leakResp.status === 403) {
        pushCrackLog('Step#1 阻断命中：保护用户信息开关（userProtectionEnabled=ON）');
        pushCrackLog('Step#2 跳过：未拿到 password_hash，无法进入破解阶段');
      }
      ElMessage.error(`外带失败：HTTP ${leakResp.status}（${msg}）`);
      return;
    }

    const data = leakResp.data;
    const items = (data.items ?? []) as Array<{ id?: number; email?: string; username?: string; password_hash: string }>;
    const targets = items
      .map((u, idx) => ({
        email: String(u.email ?? '').trim() || String(u.username ?? '').trim() || `target-${u.id ?? idx + 1}`,
        hash: String(u.password_hash ?? '').trim()
      }))
      .filter((u) => u.hash);
    if (!targets.length) {
      pushCrackLog('Step#1 失败：返回数据中没有可用 hash（targets=0）');
      ElMessage.warning('未拿到可破解目标（未获得 password_hash）');
      return;
    }
    pushCrackLog(`Step#1 成功：拿到目标 ${targets.length} 个（含 password_hash）`);

    pushCrackLog(`Step#2 请求 POST /api/leak/crack（mode=${crackMode.value}）`);
    const crack = await api.post(
      '/leak/crack',
      {
        mode: crackMode.value,
        targets,
        dictionary: crackMode.value === 'dictionary' && customDictionary.value.length ? customDictionary.value : undefined,
        dictionaryMeta: crackMode.value === 'dictionary' && customDictMeta.value ? customDictMeta.value : undefined,
        bruteLen: 6,
        bruteStart: crackMode.value === 'bruteforce' && bruteUseRange.value ? normalizeRange(bruteStart.value) : undefined,
        bruteEnd: crackMode.value === 'bruteforce' && bruteUseRange.value ? normalizeRange(bruteEnd.value) : undefined,
        bruteCharset: crackMode.value === 'bruteforce' ? normalizeRange(bruteCharset.value) : undefined,
        usePreset: crackMode.value === 'bruteforce' ? bruteUsePreset.value : undefined,
        maxAttemptsPerTarget: crackMode.value === 'bruteforce' ? 200000 : undefined
      },
      { timeout: 180000 }
    );
    crackDemoLocal.value = crack.data;
    pushCrackLog(`Step#2 成功：已生成结果 success=${crack.data.successCount ?? 0}/${crack.data.targetCount ?? 0}`);
    ElMessage.success(`已生成：成功 ${crack.data.successCount ?? 0} / ${crack.data.targetCount ?? 0}`);
    // 生成即开始播放，且随时可停止
    playCrack();
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 403) {
      pushCrackLog('失败：HTTP 403（可能被保护用户信息拦截或后端策略拒绝）');
      ElMessage.error('请求被拦截：请检查“保护用户信息开关”是否开启');
      return;
    }
    if (e?.code === 'ECONNABORTED') {
      pushCrackLog('失败：请求超时（建议缩小范围/精简字符集）');
      ElMessage.error('生成超时：请缩小范围或简化字符集后重试');
      return;
    }
    pushCrackLog(`失败：${String(e?.response?.data?.message ?? e?.message ?? 'unknown error')}`);
    ElMessage.error(e?.response?.data?.message ?? e?.message ?? '生成破解结果失败');
  } finally {
    crackLoading.value = false;
  }
};

const onPickDictionaryFile = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const raw = await file.text();
    const lines = raw
      .split(/\r?\n/g)
      .map((x) => x.trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(lines)).slice(0, 5000);
    customDictionary.value = uniq;
    const fp = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(uniq.join('\n')));
    const hex = Array.from(new Uint8Array(fp)).map((b) => b.toString(16).padStart(2, '0')).join('');
    customDictMeta.value = { name: file.name, fingerprint: hex.slice(0, 10), loadedAt: Date.now() };
    crackDemoLocal.value = null;
    crackLogs.value = [];
    ElMessage.success(`字典已导入：${customDictionary.value.length} 行`);
  } catch {
    ElMessage.error('读取字典文件失败');
  } finally {
    input.value = '';
  }
};

const clearDictionary = () => {
  customDictionary.value = [];
  customDictMeta.value = null;
  crackDemoLocal.value = null;
  crackLogs.value = [];
};
const stopCrack = () => {
  if (crackTimer.value) window.clearInterval(crackTimer.value);
  crackTimer.value = null;
  crackPlaying.value = false;
};

const pushAcquireLog = (line: string) => {
  acquireLogs.value.unshift(`${new Date().toLocaleTimeString()} ${line}`);
  if (acquireLogs.value.length > 120) acquireLogs.value = acquireLogs.value.slice(0, 120);
};

const listNames = (arr: string[], limit = 10) => {
  const names = (arr ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
  const head = names.slice(0, limit);
  const rest = names.length - head.length;
  return `${head.join('、')}${rest > 0 ? ` …(+${rest})` : ''}`;
};

const acquireSelectedData = async () => {
  acquiring.value = true;
  acquireLogs.value = [];
  acquiredData.value = {};
  assetFilter.value = 'all';
  try {
    pushAcquireLog(`开始执行攻击脚本（${fmtSwitches()}）`);

    pushAcquireLog('Step#1 crawler_exfil.js  请求 GET /api/leak/crawler-info（目标：视频/插画/专栏内容）');
    try {
      const resp = await api.get('/leak/crawler-info', { validateStatus: () => true });
      pushAcquireLog(`Step#1 响应：HTTP ${resp.status}`);
      if (resp.status >= 400) {
        pushAcquireLog(`Step#1 阻断原因：${String(resp.data?.message ?? 'unknown')}`);
      } else {
        const data = resp.data;
        acquiredData.value.crawler = data;
        pushAcquireLog(
          `Step#1 入侵成功动作：枚举内容 -> 视频 ${data.counts?.video ?? 0} 条，插画 ${data.counts?.image ?? 0} 条，专栏 ${data.counts?.article ?? 0} 条`
        );
        pushAcquireLog(`Step#1 视频清单：${listNames(data.detail?.videoNames ?? []) || '无'}`);
        pushAcquireLog(`Step#1 插画清单：${listNames(data.detail?.imageNames ?? []) || '无'}`);
        pushAcquireLog(`Step#1 专栏清单：${listNames(data.detail?.articleNames ?? []) || '无'}`);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      pushAcquireLog(`Step#1 脚本异常：${status ? `HTTP ${status}` : ''} ${e?.message ?? 'unknown error'}`.trim());
    }

    pushAcquireLog('Step#2 chat_sniffer.py  请求 GET /api/leak/chat-plaintext（目标：截取对话流：明文/密文）');
    try {
      const resp = await api.get('/leak/chat-plaintext', { validateStatus: () => true });
      pushAcquireLog(`Step#2 响应：HTTP ${resp.status}`);
      if (resp.status >= 400) {
        pushAcquireLog(`Step#2 阻断原因：${String(resp.data?.message ?? 'unknown')}`);
      } else {
        const data = resp.data;
        acquiredData.value.chat = data;
        if (data.encryptionEnabled) {
          pushAcquireLog(`Step#2 获取成功动作：抓包对话流 ${data.total ?? 0} 条（加密开启：展示密文 storedContent）`);
        } else {
          pushAcquireLog(`Step#2 入侵成功动作：截取明文对话 ${data.total ?? 0} 条`);
        }
        const sample = (data.items ?? [])
          .slice(0, 3)
          .map((x: any) => String(x.plaintext || x.storedContent || '').slice(0, 28))
          .filter(Boolean);
        if (sample.length) pushAcquireLog(`Step#2 示例片段：${sample.join(' / ')}`);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      pushAcquireLog(`Step#2 脚本异常：${status ? `HTTP ${status}` : ''} ${e?.message ?? 'unknown error'}`.trim());
    }

    pushAcquireLog('Step#3 config_leak.py  请求 GET /api/leak/config-secrets（目标：配置密钥与凭据）');
    try {
      const resp = await api.get('/leak/config-secrets', { validateStatus: () => true });
      pushAcquireLog(`Step#3 响应：HTTP ${resp.status}`);
      if (resp.status >= 400) {
        pushAcquireLog(`Step#3 阻断原因：${String(resp.data?.message ?? 'unknown')}`);
      } else {
        const sec = resp.data?.secrets ?? {};
        pushAcquireLog(
          `Step#3 入侵成功动作：泄露配置 -> dbPassword=${String(sec.dbPassword ?? '-').slice(0, 16)}..., apiKey=${String(sec.apiKey ?? '-').slice(0, 12)}...`
        );
      }
    } catch (e: any) {
      const status = e?.response?.status;
      pushAcquireLog(`Step#3 脚本异常：${status ? `HTTP ${status}` : ''} ${e?.message ?? 'unknown error'}`.trim());
    }

    pushAcquireLog('Step#4 idor_exfil.js  请求 GET /api/leak/idor-profile?userId=1（目标：越权读取用户信息）');
    try {
      const resp = await api.get('/leak/idor-profile', { params: { userId: 1 }, validateStatus: () => true });
      pushAcquireLog(`Step#4 响应：HTTP ${resp.status}`);
      if (resp.status >= 400) {
        pushAcquireLog(`Step#4 阻断原因：${String(resp.data?.message ?? 'unknown')}`);
      } else {
        const user = resp.data?.user ?? {};
        const token = String(resp.data?.simulatedSensitive?.resetToken ?? '');
        pushAcquireLog(
          `Step#4 入侵成功动作：越权读取 -> user=${String(user.username ?? user.email ?? 'unknown')}, resetToken=${token ? `${token.slice(0, 18)}...` : '-'}`
        );
      }
    } catch (e: any) {
      const status = e?.response?.status;
      pushAcquireLog(`Step#4 脚本异常：${status ? `HTTP ${status}` : ''} ${e?.message ?? 'unknown error'}`.trim());
    }

    pushAcquireLog('Step#5 ssrf_probe.py  请求 GET /api/leak/ssrf?url=169.254.169.254（目标：云元数据）');
    try {
      const resp = await api.get('/leak/ssrf', {
        params: { url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/' },
        validateStatus: () => true
      });
      pushAcquireLog(`Step#5 响应：HTTP ${resp.status}`);
      if (resp.status >= 400) {
        pushAcquireLog(`Step#5 阻断原因：${String(resp.data?.message ?? 'unknown')}`);
      } else {
        const internal = resp.data?.internal ?? {};
        pushAcquireLog(
          `Step#5 入侵成功动作：读取云元数据 -> instanceId=${String(internal.instanceId ?? '-')}, accessKeyId=${String(internal.accessKeyId ?? '-').slice(0, 12)}...`
        );
      }
    } catch (e: any) {
      const status = e?.response?.status;
      pushAcquireLog(`Step#5 脚本异常：${status ? `HTTP ${status}` : ''} ${e?.message ?? 'unknown error'}`.trim());
    }

    pushAcquireLog('Step#6 traversal_read.sh  请求 GET /api/leak/file-read?path=../../.env（目标：配置文件）');
    try {
      const resp = await api.get('/leak/file-read', { params: { path: '../../.env' }, validateStatus: () => true });
      pushAcquireLog(`Step#6 响应：HTTP ${resp.status}`);
      if (resp.status >= 400) {
        pushAcquireLog(`Step#6 阻断原因：${String(resp.data?.message ?? 'unknown')}`);
      } else {
        const file = String(resp.data?.file ?? '.env');
        const content = String(resp.data?.content ?? '');
        pushAcquireLog(`Step#6 入侵成功动作：读取文件 ${file} -> ${content.slice(0, 48).replace(/\s+/g, ' ')}...`);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      pushAcquireLog(`Step#6 脚本异常：${status ? `HTTP ${status}` : ''} ${e?.message ?? 'unknown error'}`.trim());
    }

    ElMessage.success('攻击脚本执行完成');
  } finally {
    acquiring.value = false;
  }
};

const triggerDownload = (url: string, filename?: string) => {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
};

const downloadAsset = (a: AssetCard) => {
  if (!a.downloadUrl) {
    ElMessage.warning('该条目没有可下载的资源链接');
    return;
  }
  triggerDownload(a.downloadUrl);
  pushAcquireLog(`下载：${a.kindLabel}《${a.title}》 -> ${a.downloadUrl}`);
};

const downloadAllImages = (a: AssetCard) => {
  if (a.kind !== 'image') return;
  const urls = (a.imageUrls ?? []).filter(Boolean);
  if (!urls.length) {
    ElMessage.warning('该插画没有可下载的图片列表');
    return;
  }
  urls.forEach((u) => triggerDownload(u));
  pushAcquireLog(`下载插画全部图片：《${a.title}》 x ${urls.length}`);
};

const copyAssetLink = async (a: AssetCard) => {
  if (!a.downloadUrl) {
    ElMessage.warning('该条目没有可复制的链接');
    return;
  }
  try {
    await navigator.clipboard.writeText(a.downloadUrl);
    ElMessage.success('链接已复制');
    pushAcquireLog(`复制链接：${a.kindLabel}《${a.title}》`);
  } catch {
    ElMessage.error('复制失败（浏览器权限限制）');
  }
};

const exportArticle = (a: AssetCard) => {
  const content = `${a.title}\n\n${a.summary ?? ''}\n\n${a.body ?? ''}`;
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${String(a.title).replace(/[\\/:*?"<>|]/g, '_') || 'article'}.doc`);
  URL.revokeObjectURL(url);
  pushAcquireLog(`导出：专栏《${a.title}》（类 Word 文档）`);
};

const exportChatTxt = () => {
  if (!chatRows.value.length) {
    ElMessage.warning('暂无可导出的对话');
    return;
  }
  const lines = chatRows.value.map((x) => {
    const who = x.sender?.username ?? 'unknown';
    const ts = new Date(x.created_at).toLocaleString();
    const content = x.plaintext ? x.plaintext : `【密文】${x.storedContent ?? ''}`;
    return `[${ts}] ${who}: ${content}`;
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `chat-plaintext-${Date.now()}.txt`);
  URL.revokeObjectURL(url);
  pushAcquireLog(`导出对话 txt：${chatRows.value.length} 条`);
};

void fetchState();
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 22px 48px;
}
.head {
  margin-bottom: 12px;
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
.title {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.muted {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  max-width: 52rem;
}
.muted.intro {
  margin: 0;
}
.muted.small {
  font-size: 13px;
}
.muted-inline {
  font-size: 12px;
  color: var(--muted);
}
.panel {
  margin-bottom: 14px;
  min-height: 90px;
}
.placeholder {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  padding: 8px 4px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}
.log-panel {
  max-height: 240px;
  overflow: auto;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.92);
  color: #0f172a;
  box-shadow: none;
}
.log-line {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 3px 0;
}
.log-empty {
  font-size: 13px;
  color: var(--muted);
  padding: 8px 0;
}
.tabs {
  display: flex;
  gap: 12px;
  margin: 10px 0 14px;
}
.tab {
  border: 0;
  background: transparent;
  padding: 8px 4px 10px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #64748b;
}
.tab.on {
  color: #0f172a;
  border-bottom-color: #0ea5e9;
  font-weight: 700;
}
.tab-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.tab-ic {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}
.switch-row,
.acquire-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 10px;
  align-items: center;
}
.crack-toolbar {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}
.crack-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.crack-row-top {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.6);
  min-height: 42px;
}
.crack-row-actions {
  gap: 10px;
}
.mode-sel {
  width: 132px;
}
.mode-config {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 620px;
}
.dict-file-input {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
  pointer-events: none;
}
.dict-file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.72);
  color: #334155;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.12s ease;
}
.dict-file-btn:hover {
  background: rgba(240, 249, 255, 0.95);
  transform: translateY(-1px);
}
.icon-btn {
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.72);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #334155;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.12s ease;
}
.icon-btn:hover:not(:disabled) {
  background: rgba(240, 249, 255, 0.95);
  transform: translateY(-1px);
}
.icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.icon-btn.subtle {
  background: rgba(241, 245, 249, 0.7);
  color: #475569;
}
.icon-btn.primary {
  background: rgba(224, 242, 254, 0.78);
  color: #0369a1;
}
.icon-btn.danger {
  background: rgba(254, 226, 226, 0.85);
  color: #991b1b;
}
.ib-ic {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}
.brute-range {
  width: 100%;
}
.range-inp {
  width: 108px;
}
.charset-inp {
  width: 220px;
}
.dict-hint {
  max-width: 320px;
}
.stat-hint {
  white-space: nowrap;
}
.asset-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}
.asset-col {
  background: rgba(248, 250, 252, 0.7);
  border-radius: 10px;
  padding: 10px;
}
.asset-col h3 {
  margin: 0 0 8px;
  font-size: 13px;
}
.asset-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 6px;
}
.asset-section {
  margin-bottom: 10px;
}
.asset-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 6px 0 10px;
}
.asset-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 650;
  color: #0f172a;
  font-size: 14px;
}
.asset-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.chip {
  border: 0;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
  font-size: 12px;
  transition: background 0.15s ease, transform 0.12s ease;
}
.chip:hover {
  background: rgba(224, 242, 254, 0.85);
  transform: translateY(-1px);
}
.chip.on {
  background: rgba(224, 242, 254, 0.92);
  color: #0369a1;
  font-weight: 650;
}
.asset-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.asset-card {
  border-radius: 12px;
  overflow: hidden;
  background: rgba(248, 250, 252, 0.92);
}
.thumb {
  position: relative;
  height: 132px;
  background: rgba(226, 232, 240, 0.7);
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
  display: grid;
  place-items: center;
  color: rgba(100, 116, 139, 0.9);
}
.ph-ic {
  width: 34px;
  height: 34px;
}
.badge {
  position: absolute;
  left: 10px;
  top: 10px;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.55);
  color: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}
.hover-actions {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.asset-card:hover .hover-actions {
  opacity: 1;
  transform: translateY(0);
}
.hbtn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: #0f172a;
  font-size: 12px;
}
.hbtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.h-ic {
  width: 14px;
  height: 14px;
}
.card-body {
  padding: 10px 12px 12px;
}
.card-title {
  font-size: 13px;
  font-weight: 650;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 34px;
}
.card-meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.chat-link-row {
  margin-top: 10px;
}
.chat-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #0369a1;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}
.chat-preview {
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
}
.mono { font-family: ui-monospace, Consolas, monospace; }
@media (max-width: 900px) {
  .asset-cards {
    grid-template-columns: 1fr;
  }
  .mode-config {
    min-width: 0;
    width: 100%;
  }
  .charset-inp {
    width: min(220px, 60vw);
  }
}
</style>
