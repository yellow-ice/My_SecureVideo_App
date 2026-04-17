<template>
  <div class="page">
    <header class="head">
      <h1>分区中心</h1>
      <p>浏览已上线分区，或提交你想新增的分区（需管理员审核）。</p>
    </header>

    <section class="panel">
      <div class="toolbar">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
      </div>
      <div class="chips">
        <span v-for="c in categories" :key="c.id" class="chip">{{ c.name }}（{{ c.slug }}）</span>
      </div>
    </section>

    <section class="panel">
      <h3 class="sec-title">申请新分区</h3>
      <el-form label-position="top">
        <el-form-item label="分区名">
          <el-input v-model="form.name" maxlength="30" placeholder="例如：摄影 / 机器学习 / 轻小说" />
        </el-form-item>
        <el-form-item label="分区别名（slug，可选）">
          <el-input v-model="form.slug" maxlength="40" placeholder="例如：photography" />
        </el-form-item>
        <el-form-item label="简介（可选）">
          <el-input v-model="form.description" maxlength="200" />
        </el-form-item>
        <el-form-item label="申请理由">
          <el-input v-model="form.reason" type="textarea" :rows="3" maxlength="300" show-word-limit />
        </el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../services/api';
import type { CategoryItem } from '../types';

const categories = ref<CategoryItem[]>([]);
const loading = ref(false);
const submitting = ref(false);
const form = reactive({
  name: '',
  slug: '',
  description: '',
  reason: ''
});

const loadAll = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/categories');
    categories.value = (data.items ?? []) as CategoryItem[];
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  const name = form.name.trim();
  if (!name) return ElMessage.warning('请填写分区名');
  submitting.value = true;
  try {
    await api.post('/categories/requests', {
      name,
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      reason: form.reason.trim() || undefined
    });
    ElMessage.success('申请已提交，等待管理员审核');
    form.name = '';
    form.slug = '';
    form.description = '';
    form.reason = '';
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  void loadAll();
});
</script>

<style scoped>
.page { max-width: 980px; margin: 0 auto; padding: 24px 22px 60px; }
.head { margin-bottom: 14px; }
.head h1 { margin: 0 0 6px; font-size: 28px; }
.head p { margin: 0; color: var(--muted); }
.panel { border: 1px solid var(--line); border-radius: 12px; padding: 14px; background: #fff; margin-bottom: 12px; }
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { border: 1px solid rgba(15, 23, 42, .14); border-radius: 999px; padding: 6px 10px; font-size: 13px; color: #334155; }
.sec-title { margin: 0 0 12px; font-size: 16px; }
</style>
