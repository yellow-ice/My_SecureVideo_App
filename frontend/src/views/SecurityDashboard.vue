<template>
  <div class="page">
    <header class="head">
      <h1 class="title">安全态势</h1>
      <p class="sub">实时图表与攻击流（需后端与 WebSocket）</p>
    </header>

    <section class="topbar">
      <div class="mode">
        <span class="mode-label">防御</span>
        <router-link to="/attack-lab" class="link-quiet">去攻防演练统一管理防护开关</router-link>
        <el-button size="small" :loading="loadingBase" @click="refreshAll">刷新</el-button>
      </div>
      <div class="impact">
        <router-link to="/attack-lab" class="link-quiet">去攻防演练查看影响报告</router-link>
      </div>
    </section>

    <div class="kpi-row">
      <div class="kpi"><span class="num">{{ attackCount24h }}</span><span class="lbl">24h 攻击</span></div>
      <div class="kpi"><span class="num">{{ riskScore }}</span><span class="lbl">风险分</span></div>
      <div class="kpi kpi-tag">
        <el-tag :type="riskTag" size="small">{{ riskLevel }}</el-tag>
        <span class="lbl">等级</span>
      </div>
      <div class="kpi"><span class="num mono">{{ topIp }}</span><span class="lbl">TOP 源 IP</span></div>
    </div>

    <div class="charts">
      <div class="chart-panel">
        <v-chart :option="mapOption" autoresize class="chart" />
      </div>
      <div class="chart-panel">
        <v-chart :option="trendOption" autoresize class="chart" />
      </div>
    </div>

    <div class="charts">
      <div class="chart-panel">
        <v-chart :option="typeOption" autoresize class="chart sm" />
      </div>
      <section class="stream-section">
        <h2 class="h2">实时事件</h2>
        <div class="stream">
          <div v-for="(item, idx) in liveEvents" :key="idx" class="line">
            {{ item.timestamp }} | {{ item.type }} | {{ item.location ?? '-' }} | {{ item.ip }} | {{ item.detail }}
          </div>
          <div v-if="liveEvents.length === 0" class="empty">
            <template v-if="wsStatus === 'connecting'">WebSocket 连接中…</template>
            <template v-else-if="wsStatus === 'open'">已连接，等待事件推送…</template>
            <template v-else-if="wsStatus === 'closed'">连接已关闭（后端未启动或被拦截）</template>
            <template v-else>连接错误（检查 ws://localhost:3000/ws/security-events）</template>
          </div>
        </div>
      </section>
    </div>

    <section class="table-section">
      <h2 class="h2">攻击记录</h2>
      <div class="table-wrap">
        <el-table :data="attacksView" size="small" class="tbl" table-layout="fixed">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            <span class="mono">{{ prettyTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTag(String(row.attack_type))">
              {{ typeLabel[String(row.attack_type)] ?? row.attack_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="dark" type="info">{{ row.location ?? '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="150">
          <template #default="{ row }">
            <span class="mono">{{ row.ip_address }}</span>
          </template>
        </el-table-column>
        <el-table-column label="路径" width="170">
          <template #default="{ row }">
            <span class="mono">{{ row.path }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Payload" min-width="240">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.payload"
              effect="dark"
              placement="top-start"
              :content="String(row.payload)"
              :show-after="250"
            >
              <span :class="['payload', `sev-${row.severity ?? 'unknown'}`]">
                {{ String(row.payload).slice(0, 56) }}<span v-if="String(row.payload).length > 56">…</span>
              </span>
            </el-tooltip>
            <span v-else class="muted-inline">-</span>
          </template>
        </el-table-column>
        <el-table-column label="动作" width="170">
          <template #default="{ row }">
            <span class="muted-inline">{{ row.mitigation_action ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'blocked' ? 'danger' : 'info'">
              {{ row.status === 'blocked' ? '拦截' : '记录' }}
            </el-tag>
          </template>
        </el-table-column>
        </el-table>
      </div>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, LineChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import api from '../services/api';

use([CanvasRenderer, PieChart, LineChart, BarChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent]);

const riskScore = ref(0);
const attackCount24h = ref(0);
const attacks = ref<Array<Record<string, any>>>([]);
const typeStats = ref<Array<{ name: string; value: number }>>([]);
const liveEvents = ref<Array<Record<string, string>>>([]);
const topLocations = ref<Array<{ name: string; value: number }>>([]);
const trendLabels = ref<string[]>([]);
const trend = ref<number[]>([]);
const wsStatus = ref<'connecting' | 'open' | 'closed' | 'error'>('connecting');
const topIp = computed(() => (attacks.value[0]?.ip_address ? attacks.value[0].ip_address : '-'));
const page = ref(1);
const pageSize = ref(10);
const loadingBase = ref(false);

const total = computed(() => attacks.value.length);
const attacksView = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return attacks.value.slice(start, start + pageSize.value);
});

const prettyTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const typeLabel: Record<string, string> = {
  sql_injection: 'SQL 注入',
  xss: 'XSS',
  csrf: 'CSRF',
  bruteforce: '暴破',
  crawler: '爬虫',
  path_traversal: '目录穿越',
  honeypot_hit: '蜜罐',
  malicious_upload: '恶意上传',
  admin_action: '后台操作',
  batch: '批次',
};

const typeTag = (t: string) => {
  if (t.includes('sql') || t.includes('xss') || t.includes('brute')) return 'danger';
  if (t.includes('csrf') || t.includes('crawler') || t.includes('honeypot')) return 'warning';
  return 'info';
};
const riskLevel = computed(() => (riskScore.value >= 70 ? '高' : riskScore.value >= 40 ? '中' : '低'));
const riskTag = computed(() => (riskScore.value >= 70 ? 'danger' : riskScore.value >= 40 ? 'warning' : 'success'));

const typeOption = computed(() => ({
  title: { text: '攻击类型分布（24h）', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: '65%', data: typeStats.value }],
}));

const trendOption = computed(() => ({
  title: { text: '24 小时趋势（按小时）', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: trendLabels.value.length ? trendLabels.value : [] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', smooth: true, data: trend.value }],
}));

const mapOption = computed(() => ({
  title: { text: '来源地 Top（24h，GeoIP）', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 20, right: 18, top: 56, bottom: 18, containLabel: true },
  xAxis: { type: 'value' },
  yAxis: { type: 'category', data: topLocations.value.map((i) => i.name), inverse: true },
  series: [
    {
      type: 'bar',
      data: topLocations.value.map((i) => i.value),
      barWidth: 14,
    }
  ],
}));

const loadBase = async () => {
  loadingBase.value = true;
  try {
    const [overview, attackList, settings] = await Promise.all([
      api.get('/admin/security/overview'),
      api.get('/admin/security/attacks'),
      api.get('/admin/security/settings'),
    ]);
  riskScore.value = overview.data.riskScore;
  attackCount24h.value = overview.data.attackCount24h;
  typeStats.value = overview.data.typeStats24h ?? overview.data.typeStats ?? [];
  topLocations.value = overview.data.topLocations24h ?? [];
  trendLabels.value = overview.data.trend24h?.labels ?? [];
  trend.value = overview.data.trend24h?.values ?? [];
  attacks.value = attackList.data.items ?? [];
  } finally {
    loadingBase.value = false;
  }
};

const refreshAll = async () => {
  await loadBase();
};

const connectSocket = () => {
  const ws = new WebSocket('ws://localhost:3000/ws/security-events');
  wsStatus.value = 'connecting';
  ws.onopen = () => {
    wsStatus.value = 'open';
  };
  ws.onerror = () => {
    wsStatus.value = 'error';
  };
  ws.onclose = () => {
    wsStatus.value = 'closed';
  };
  ws.onmessage = (evt) => {
    const data = JSON.parse(evt.data) as Record<string, any>;
    liveEvents.value.unshift(data);
    if (liveEvents.value.length > 40) liveEvents.value = liveEvents.value.slice(0, 40);
  };
};

onMounted(async () => {
  await loadBase();
  connectSocket();
});
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 22px 48px;
}
.head {
  margin-bottom: 20px;
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
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.55;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}
.reveal-tip {
  margin: 0 0 10px;
  font-size: 13px;
  color: rgba(236, 238, 244, 0.85);
}
.mode {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mode-label {
  color: var(--muted);
  font-size: 13px;
}
.table-wrap {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: auto;
  max-height: 520px;
  background: #fff;
}
.tbl {
  margin-top: 0;
}
.tbl :deep(.el-table__header-wrapper th) {
  background: #f7f8fa;
  color: #111827;
  font-weight: 650;
}
.tbl :deep(.el-table) {
  --el-table-bg-color: #fff;
  --el-table-text-color: #111827;
  --el-table-header-text-color: #111827;
  --el-table-row-hover-bg-color: rgba(0, 161, 214, 0.06);
  background: #fff;
}
.tbl :deep(.el-table__body-wrapper) {
  background: #fff;
}
.tbl :deep(.el-table__row) {
  background: #fff;
}
/* 取消交替底色，靠分割线与 hover 强调 */
.tbl :deep(.el-table__row--striped) {
  background: #fff;
}
.tbl :deep(.el-table__cell) {
  background: transparent;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  color: #111827;
}
.tbl :deep(.el-table__body tr:hover > td) {
  background: rgba(0, 161, 214, 0.06) !important;
}
.tbl :deep(.el-table__body tr:hover) {
  filter: none !important;
  opacity: 1 !important;
}
.payload {
  font-family: ui-monospace, Consolas, monospace;
  color: #0f172a;
  background: #eef6ff;
  border: 1px solid #cfe6ff;
  padding: 2px 6px;
  border-radius: 6px;
  display: inline-block;
  max-width: 100%;
}
.payload.sev-high {
  background: #ffecec;
  border-color: #ffc7c7;
}
.payload.sev-medium {
  background: #fff3e8;
  border-color: #ffd7b7;
}
.payload.sev-low {
  background: #fff7db;
  border-color: #ffe6a8;
  color: #0f172a;
}
.payload.sev-unknown {
  background: #f3f4f6;
  border-color: #e5e7eb;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 24px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--line);
}
@media (max-width: 720px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: #fff;
}
.kpi-tag {
  justify-content: center;
}
.num {
  font-size: 1.25rem;
  font-weight: 700;
}
.mono {
  font-size: 0.95rem;
  font-weight: 600;
  word-break: break-all;
}
.lbl {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
@media (max-width: 900px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
.chart-panel {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px;
  background: #fff;
}
.chart {
  height: 300px;
}
.chart.sm {
  height: 260px;
}
.stream-section {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 16px;
  background: #fff;
}
.h2 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}
.stream {
  max-height: 240px;
  overflow: auto;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
  color: #0f172a;
}
.line {
  border-bottom: 1px dashed rgba(15, 23, 42, 0.12);
  padding: 4px 0;
}
.empty {
  color: var(--muted);
  padding: 12px 0;
}
.table-section {
  padding-top: 8px;
  border-top: 1px solid var(--line);
  margin-top: 8px;
}
.tbl {
  margin-top: 10px;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.mono {
  font-family: ui-monospace, Consolas, monospace;
}
.payload {
  font-family: ui-monospace, Consolas, monospace;
  color: #0f172a;
}
.muted-inline {
  color: var(--muted);
}
.loc {
  color: rgba(236, 238, 244, 0.9);
}
</style>
