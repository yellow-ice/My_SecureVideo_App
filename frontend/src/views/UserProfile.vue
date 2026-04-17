<template>
  <div class="page">
    <header class="head">
      <h1 class="title">个人资料</h1>
      <p class="sub">{{ isEditing ? '编辑模式：修改后点击保存。' : '资料展示模式：点击“编辑资料”后可修改。' }}</p>
    </header>

    <section class="panel">
      <div class="avatar-row">
        <div class="avatar">
          <img v-if="avatarPreview && !avatarLoadError" :src="avatarPreview" alt="" @error="avatarLoadError = true" />
          <div v-else class="avatar-ph">{{ (form.username || 'U').slice(0, 1).toUpperCase() }}</div>
        </div>

        <div class="avatar-form">
          <div class="avatar-top-actions">
            <el-button v-if="!isEditing" type="primary" @click="startEdit">编辑资料</el-button>
            <template v-else>
              <el-button @click="cancelEdit">取消</el-button>
              <el-button :loading="saving" type="primary" @click="save">提交资料</el-button>
            </template>
          </div>
          <template v-if="isEditing">
            <p class="label">头像上传（支持 jpg/png/webp/gif）</p>
            <div class="upload-row">
              <input ref="avatarInput" type="file" accept="image/*" class="file-hidden" @change="onPickAvatar" />
              <button type="button" class="file-btn" @click="avatarInput?.click()">
                <svg class="file-ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 16.5v1A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
                选择头像
              </button>
              <span v-if="pickedAvatar" class="picked-tip">已选择：{{ pickedAvatar.name }}（保存时自动上传）</span>
              <span v-else class="picked-tip muted">未选择文件</span>
            </div>
            <el-input v-model="form.avatar" placeholder="或直接输入头像 URL，例如 https://..." />
          </template>
          <template v-else>
            <p class="label">头像地址</p>
            <p class="readonly">{{ form.avatar || '未设置' }}</p>
          </template>
        </div>
      </div>

      <div class="grid">
        <div class="item">
          <p class="label">UID</p>
          <p class="read-line">{{ uidText }}</p>
        </div>
        <div class="item">
          <p class="label">邮箱</p>
          <el-input v-if="isEditing" :model-value="form.email" disabled />
          <p v-else class="read-line">{{ form.email || '未设置' }}</p>
        </div>
        <div class="item">
          <p class="label">角色</p>
          <el-input v-if="isEditing" :model-value="form.role" disabled />
          <p v-else class="read-line">{{ form.role || '未设置' }}</p>
        </div>
        <div class="item">
          <p class="label">用户名</p>
          <el-input v-if="isEditing" v-model="form.username" maxlength="40" show-word-limit />
          <p v-else class="read-line">{{ form.username || '未设置' }}</p>
        </div>
        <div class="item span2">
          <p class="label">个人简介</p>
          <el-input
            v-if="isEditing"
            v-model="form.bio"
            type="textarea"
            :rows="3"
            maxlength="300"
            show-word-limit
            placeholder="介绍一下自己（300字以内）"
          />
          <p v-else class="bio-readonly">{{ form.bio || '这个人很神秘，还没有简介。' }}</p>
        </div>
      </div>

    </section>

    <section class="danger-lite">
      <span class="danger-note">注销后将无法登录，历史评论显示“该用户已注销”。</span>
      <el-button :loading="deactivating" type="danger" plain @click="deactivate">注销账号</el-button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const form = reactive({
  email: '',
  role: '',
  username: '',
  avatar: '',
  bio: '',
});

const isEditing = ref(false);
const saving = ref(false);
const deactivating = ref(false);
const avatarLoadError = ref(false);
const pickedAvatar = ref<File | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const previewDataUrl = ref('');

const resolveAvatar = (src?: string | null) => {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  return `http://localhost:3000${src.startsWith('/') ? src : `/${src}`}`;
};

const avatarPreview = computed(() => previewDataUrl.value || resolveAvatar(form.avatar?.trim() || ''));
const uidText = computed(() => String(userStore.user?.id ?? '—'));

const fillFormFromStore = () => {
  const u = userStore.user;
  form.email = u?.email ?? '';
  form.role = u?.role ?? '';
  form.username = u?.username ?? '';
  form.avatar = u?.avatar ?? '';
  form.bio = u?.bio ?? '';
  avatarLoadError.value = false;
};

const init = async () => {
  await userStore.fetchProfile();
  fillFormFromStore();
};

const startEdit = () => {
  isEditing.value = true;
  pickedAvatar.value = null;
  previewDataUrl.value = '';
};

const cancelEdit = () => {
  isEditing.value = false;
  pickedAvatar.value = null;
  previewDataUrl.value = '';
  if (avatarInput.value) avatarInput.value.value = '';
  fillFormFromStore();
};

const onPickAvatar = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  pickedAvatar.value = f;
  if (!f) {
    previewDataUrl.value = '';
    return;
  }
  previewDataUrl.value = URL.createObjectURL(f);
  form.avatar = previewDataUrl.value;
  avatarLoadError.value = false;
};

const save = async () => {
  const username = form.username.trim();
  if (!username) return ElMessage.warning('用户名不能为空');
  saving.value = true;
  try {
    if (pickedAvatar.value) {
      const fd = new FormData();
      fd.append('username', username);
      fd.append('bio', form.bio.trim());
      fd.append('avatar', pickedAvatar.value);
      const { data } = await api.put('/auth/update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      userStore.user = data.user;
    } else {
      const { data } = await api.put('/auth/update', { username, avatar: form.avatar.trim(), bio: form.bio.trim() });
      userStore.user = data.user;
    }
    fillFormFromStore();
    isEditing.value = false;
    pickedAvatar.value = null;
    previewDataUrl.value = '';
    if (avatarInput.value) avatarInput.value.value = '';
    ElMessage.success('资料已更新');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '更新失败');
  } finally {
    saving.value = false;
  }
};

const deactivate = async () => {
  await ElMessageBox.confirm('确认注销账号？此操作不可恢复。', '危险操作', {
    type: 'warning',
    confirmButtonText: '确认注销',
    cancelButtonText: '取消'
  });
  deactivating.value = true;
  try {
    await api.post('/auth/deactivate');
    userStore.logout();
    ElMessage.success('账号已注销');
    await router.replace('/login');
  } finally {
    deactivating.value = false;
  }
};

void init();
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 28px 22px 48px; }
.head { margin-bottom: 16px; }
.title { margin: 0 0 6px; font-size: 1.45rem; font-weight: 700; }
.sub { margin: 0; color: var(--muted); }
.panel { border: 0; background: transparent; border-radius: 0; padding: 10px 4px; margin-bottom: 14px; }
.avatar-top-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.avatar-row { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
.avatar { width: 84px; height: 84px; border-radius: 999px; overflow: hidden; border: 0; background: #f3f4f6; flex: 0 0 auto; }
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-ph { width: 100%; height: 100%; display: grid; place-items: center; font-weight: 800; color: #334155; }
.avatar-form { flex: 1; min-width: 0; }
.upload-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.file-hidden { display: none; }
.file-btn {
  border: 1px solid rgba(14,165,233,.35);
  background: rgba(14,165,233,.08);
  color: #0284c7;
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.file-btn:hover {
  border-color: rgba(14,165,233,.55);
  background: rgba(14,165,233,.14);
}
.file-ic { width: 14px; height: 14px; }
.picked-tip { font-size: 12px; color: #334155; }
.picked-tip.muted { color: #94a3b8; }
.readonly { margin: 0; color: #475569; font-size: 13px; line-height: 1.5; word-break: break-all; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.item { min-width: 0; }
.span2 { grid-column: 1 / -1; }
.label { margin: 0 0 8px; font-size: 12px; color: var(--muted); }
.read-line {
  margin: 0;
  min-height: 34px;
  padding: 6px 2px;
  border-bottom: 0;
  color: #334155;
  display: flex;
  align-items: center;
}
.bio-readonly {
  margin: 0;
  min-height: 64px;
  border: 0;
  border-bottom: 0;
  border-radius: 0;
  background: transparent;
  padding: 8px 2px;
  color: #334155;
  white-space: pre-wrap;
  line-height: 1.7;
}
.danger-lite {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 0;
  border-top: 1px solid rgba(239,68,68,.24);
  border-radius: 0;
  padding: 12px 2px;
  background: transparent;
}
.danger-note { font-size: 13px; color: #7f1d1d; }

.panel :deep(.el-input__wrapper),
.panel :deep(.el-textarea__inner) {
  border-radius: 10px;
  box-shadow: none;
  border: 1px solid rgba(148,163,184,.26);
  background: rgba(255,255,255,.9);
}
.panel :deep(.el-input__wrapper.is-focus),
.panel :deep(.el-textarea__inner:focus) {
  border-color: rgba(14,165,233,.56);
}
@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
  .danger-lite { flex-direction: column; align-items: flex-start; }
}
</style>
