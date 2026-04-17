<template>
  <div class="page">
    <header class="head">
      <h1 class="title">后台概览</h1>
      <p class="sub">安全开关与演示数据一览</p>
    </header>

    <div class="kpi-row">
      <div class="kpi"><span class="num">{{ stats.users }}</span><span class="lbl">用户</span></div>
      <div class="kpi"><span class="num">{{ stats.videos }}</span><span class="lbl">视频</span></div>
      <div class="kpi"><span class="num">{{ stats.alerts }}</span><span class="lbl">24h 告警</span></div>
      <div class="kpi"><span class="num mono">{{ stats.topIp }}</span><span class="lbl">活跃 IP</span></div>
    </div>

    <section class="section">
      <h2 class="h2">安全模式</h2>
      <p class="muted">开启后启用 WAF、防爬与暴破拦截；关闭则仅记录。</p>
      <div class="row">
        <el-switch
          v-model="defenseEnabled"
          active-text="已开启"
          inactive-text="仅记录"
          @change="toggleDefense"
        />
        <el-button @click="refresh">刷新</el-button>
      </div>
    </section>

    <div class="two-col">
      <section class="section">
        <h2 class="h2">封禁 IP</h2>
        <div v-if="stats.bannedIps.length === 0" class="muted">暂无</div>
        <div v-else class="tags">
          <el-tag v-for="ip in stats.bannedIps" :key="ip" size="small">{{ ip }}</el-tag>
        </div>
      </section>
      <section class="section">
        <h2 class="h2">答辩演示顺序</h2>
        <ol class="list">
          <li>正常浏览视频与搜索</li>
          <li>提交 XSS / SQL 类 payload 观察 WAF</li>
          <li>脚本高频请求、错误密码观察防爬与锁定</li>
        </ol>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { ElMessage } from 'element-plus';

const stats = reactive({ users: 2, videos: 3, alerts: 0, risk: 0, topIp: '-', bannedIps: [] as string[] });
const defenseEnabled = ref(true);

const refresh = async () => {
  const { data } = await api.get('/admin/security/overview');
  stats.alerts = data.attackCount24h;
  stats.risk = data.riskScore;
  stats.topIp = data.topIps?.[0]?.ip ?? '-';
  stats.bannedIps = data.bannedIps ?? [];
  defenseEnabled.value = Boolean(data.defenseEnabled);
};

const toggleDefense = async (value: boolean) => {
  await api.post('/admin/security/toggle-defense', { enabled: value });
  ElMessage.success(`安全模式已${value ? '开启' : '关闭'}`);
  await refresh();
};

onMounted(async () => {
  await refresh();
});
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 22px 48px;
}
.head {
  margin-bottom: 28px;
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
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 32px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--line);
}
@media (max-width: 640px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  background: var(--bg);
}
.num {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.mono {
  font-size: 1rem;
  font-weight: 600;
}
.lbl {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.section {
  padding: 22px 0;
  border-top: 1px solid var(--line);
}
.h2 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}
.muted {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.55;
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 32px;
}
@media (max-width: 720px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.75;
}
</style>
