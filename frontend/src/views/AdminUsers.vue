<template>
  <div class="page">
    <header class="head">
      <h1 class="title">用户管理</h1>
      <p class="sub">禁用/启用账号，升权/降权（管理员专用）</p>
    </header>

    <nav class="tabs" aria-label="用户列表视图">
      <button
        v-for="t in userTabs"
        :key="t.key"
        type="button"
        class="tab"
        :class="{ on: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        <span class="tab-inner">
          <svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true">
            <template v-if="t.key === 'all'">
              <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.65" />
              <circle cx="16" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.65" />
              <path
                d="M4.5 19.5v-.5a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v.5M11.5 19.5v-.5a4 4 0 0 1 4-4h.5a4 4 0 0 1 4 4v.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.65"
                stroke-linecap="round"
              />
            </template>
            <template v-else-if="t.key === 'admin'">
              <path
                d="M12 3.5 14.5 9l6 .9-4.5 4.4L17.5 21 12 18l-5.5 3 1.5-6.7L3.5 9.9 9.5 9Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.65"
                stroke-linejoin="round"
              />
            </template>
            <template v-else-if="t.key === 'active'">
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.65" />
              <path d="M8.5 12.2 11 14.7 15.5 9.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" />
            </template>
            <template v-else>
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.65" />
              <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" />
            </template>
          </svg>
          {{ t.label }}
          <span v-if="tabCount(t.key) > 0" class="tab-badge">{{ tabCount(t.key) }}</span>
        </span>
      </button>
    </nav>

    <section class="panel">
      <div class="tools">
        <el-input v-model="q" placeholder="搜索邮箱/用户名" clearable class="search">
          <template #prefix>
            <svg class="search-ic" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M15 15l4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </template>
        </el-input>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-table :data="filteredForTab" size="small" class="tbl" :row-class-name="rowClassName">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <span class="pill" :class="row.role === 'admin' ? 'pill-warn' : 'pill-muted'">{{ row.role }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <span class="pill" :class="row.status === 'active' ? 'pill-ok' : 'pill-bad'">
              {{ row.status === 'active' ? '正常' : '已禁用' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column prop="last_login" label="最近登录" width="180" />
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 'active' ? 'danger' : 'success'"
              :loading="busyId === row.id && busyAction === 'status'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button
              size="small"
              :type="row.role === 'admin' ? 'info' : 'warning'"
              :loading="busyId === row.id && busyAction === 'role'"
              @click="toggleRole(row)"
            >
              {{ row.role === 'admin' ? '降为用户' : '升为管理员' }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :loading="busyId === row.id && busyAction === 'delete'"
              @click="removeUser(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';

type Role = 'admin' | 'user';
type Status = 'active' | 'suspended';

type AdminUserRow = {
  id: number;
  email: string;
  username: string;
  role: Role;
  status: Status;
  created_at: string;
  last_login: string | null;
};

const userTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'admin' as const, label: '管理员' },
  { key: 'active' as const, label: '正常' },
  { key: 'suspended' as const, label: '已禁用' }
];
const activeTab = ref<(typeof userTabs)[number]['key']>('all');

const items = ref<AdminUserRow[]>([]);
const loading = ref(false);
const q = ref('');
const busyId = ref<number | null>(null);
const busyAction = ref<'status' | 'role' | 'delete' | null>(null);

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/users');
    items.value = (data.items ?? []) as AdminUserRow[];
  } finally {
    loading.value = false;
  }
};

const tabCount = (key: (typeof userTabs)[number]['key']) => {
  if (key === 'all') return items.value.length;
  if (key === 'admin') return items.value.filter((u) => u.role === 'admin').length;
  if (key === 'active') return items.value.filter((u) => u.status === 'active').length;
  return items.value.filter((u) => u.status === 'suspended').length;
};

const filteredForTab = computed(() => {
  const kw = q.value.trim().toLowerCase();
  let list = items.value.slice();
  if (activeTab.value === 'admin') list = list.filter((u) => u.role === 'admin');
  else if (activeTab.value === 'active') list = list.filter((u) => u.status === 'active');
  else if (activeTab.value === 'suspended') list = list.filter((u) => u.status === 'suspended');
  if (!kw) return list;
  return list.filter((u) => `${u.email} ${u.username}`.toLowerCase().includes(kw));
});

const rowClassName = ({ row }: { row: AdminUserRow }) => (row.status === 'suspended' ? 'row-suspended' : '');

const update = async (id: number, patch: Partial<Pick<AdminUserRow, 'role' | 'status'>>) => {
  const { data } = await api.put(`/admin/users/${id}`, patch);
  const updated = data.user as AdminUserRow;
  const idx = items.value.findIndex((u) => u.id === id);
  if (idx >= 0) items.value[idx] = updated;
};

const toggleStatus = async (row: AdminUserRow) => {
  const next: Status = row.status === 'active' ? 'suspended' : 'active';
  await ElMessageBox.confirm(
    `确定要将用户「${row.username}」设置为「${next === 'active' ? '启用' : '禁用'}」吗？`,
    '确认操作',
    { type: 'warning' }
  );
  busyId.value = row.id;
  busyAction.value = 'status';
  try {
    await update(row.id, { status: next });
    ElMessage.success('已更新');
  } finally {
    busyId.value = null;
    busyAction.value = null;
  }
};

const toggleRole = async (row: AdminUserRow) => {
  const next: Role = row.role === 'admin' ? 'user' : 'admin';
  await ElMessageBox.confirm(`确定要将用户「${row.username}」角色设置为「${next}」吗？`, '确认操作', {
    type: 'warning'
  });
  busyId.value = row.id;
  busyAction.value = 'role';
  try {
    await update(row.id, { role: next });
    ElMessage.success('已更新');
  } finally {
    busyId.value = null;
    busyAction.value = null;
  }
};

const removeUser = async (row: AdminUserRow) => {
  await ElMessageBox.confirm(
    `确定删除用户「${row.username}」吗？该操作不可恢复。`,
    '危险操作确认',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  );
  busyId.value = row.id;
  busyAction.value = 'delete';
  try {
    await api.delete(`/admin/users/${row.id}`);
    items.value = items.value.filter((u) => u.id !== row.id);
    ElMessage.success('已删除');
  } finally {
    busyId.value = null;
    busyAction.value = null;
  }
};

void load();
</script>

<style scoped>
.page {
  max-width: 1200px;
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
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin: 14px 0 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
  padding-bottom: 0;
}
.tab {
  border: 0;
  background: transparent;
  padding: 8px 2px 10px;
  margin-bottom: -1px;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  border-bottom: 2px solid transparent;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}
.tab.on {
  color: #0f172a;
  font-weight: 700;
  border-bottom-color: #0ea5e9;
}
.tab-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-ic {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.tab-badge {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: rgba(241, 245, 249, 0.95);
  padding: 1px 6px;
  border-radius: 999px;
}
.tab.on .tab-badge {
  color: #0369a1;
  background: rgba(224, 242, 254, 0.95);
}
.panel {
  margin-bottom: 8px;
}
.tools {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 0 0 12px;
}
.search {
  max-width: 360px;
}
.search-ic {
  width: 14px;
  height: 14px;
}
.tbl {
  margin-top: 0;
  --el-table-border-color: transparent;
  --el-table-header-bg-color: rgba(248, 250, 252, 0.75);
}
.tbl :deep(.el-table__inner-wrapper::before) {
  display: none;
}
.tbl :deep(.el-table__cell) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}
.tbl :deep(thead .el-table__cell) {
  font-weight: 600;
  color: #475569;
  font-size: 12px;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.pill-muted {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}
.pill-warn {
  background: rgba(251, 191, 36, 0.18);
  color: #92400e;
}
.pill-ok {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
}
.pill-bad {
  background: rgba(248, 113, 113, 0.16);
  color: #b91c1c;
}
:deep(.row-suspended td) {
  opacity: 0.72;
}
</style>
