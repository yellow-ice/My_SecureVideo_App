<template>
  <div class="page">
    <header class="head">
      <h1>
        <svg class="head-ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
        </svg>
        发布中心
      </h1>
      <p>同一流程，不同主任务：视频重素材，插画重画面，专栏重正文。</p>
    </header>

    <section class="panel">
      <div class="type-row">
        <button
          v-for="o in typeOptions"
          :key="o.value"
          class="chip"
          :class="{ on: form.type === o.value }"
          @click="form.type = o.value"
        >
          <svg class="chip-ic" viewBox="0 0 24 24" aria-hidden="true">
            <template v-if="o.value === 'video'">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v9A2.5 2.5 0 0 1 13.5 19h-7A2.5 2.5 0 0 1 4 16.5v-9Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                d="M16 10.5 20 8v8l-4-2.5v-3Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
            </template>
            <template v-else-if="o.value === 'image'">
              <path
                d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5v-11Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                d="M8 14.5 10.4 12.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 0 1.4 0L18 9.8"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="9" cy="9" r="1.3" fill="none" stroke="currentColor" stroke-width="1.7" />
            </template>
            <template v-else>
              <path
                d="M7 4h10a2 2 0 0 1 2 2v14H9a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path d="M9.5 8h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              <path d="M9.5 12h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              <path d="M9.5 16h5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </template>
          </svg>
          <span class="chip-label">{{ o.label }}</span>
        </button>
        <span class="type-tip">{{ activeTypeHint }}</span>
      </div>

      <section class="meta-row">
        <div class="meta-item title-item">
          <label>
            <svg class="meta-label-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 7h12M9 12h6M8 17h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            标题
          </label>
          <el-input v-model="form.title" maxlength="60" show-word-limit />
        </div>
        <div class="meta-item category-item">
          <label>
            <svg class="meta-label-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M5 12h10M5 17h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            分区
          </label>
          <el-select v-model="form.categorySlug" class="cat-select" filterable placeholder="选择分区">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.slug" />
          </el-select>
        </div>
        <div class="meta-item tags-item">
          <label>
            <svg class="meta-label-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 8A2.5 2.5 0 0 1 7 5.5h5.1a2 2 0 0 1 1.4.6l4.4 4.4a2 2 0 0 1 0 2.8l-4 4a2 2 0 0 1-2.8 0l-6-6A2.5 2.5 0 0 1 4.5 8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <circle cx="9" cy="9" r="1.1" fill="currentColor" />
            </svg>
            标签
          </label>
          <el-select
            v-model="form.tags"
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
        </div>
      </section>

      <transition name="panel-swap" mode="out-in">
        <section :key="form.type" class="type-panel">
          <div v-if="form.type === 'video'" class="card main-card">
          <div class="card-head">
            <h3 class="card-title">视频主文件</h3>
            <span class="tip">必填：用于播放的原始视频文件</span>
          </div>
          <div class="upload-row">
            <input id="video-file" class="file" type="file" accept="video/*" @change="pickVideo" />
            <label class="file-btn" for="video-file">
              <svg class="file-btn-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v12M7 9l5-5 5 5M6 18h12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              选择文件
            </label>
            <div class="tip tip-ic">
              <svg class="action-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 17a4 4 0 1 1 0-8 5 5 0 0 1 10 1 3 3 0 1 1 1 6H7Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="tip-text">{{ videoFile?.name ?? '未选择视频文件' }}</span>
            </div>
          </div>
          <div v-if="progress > 0" class="progress"><div class="bar" :style="{ width: `${progress}%` }" /></div>
          <div v-if="progress > 0" class="progress-text">上传中 · {{ progress }}%</div>
          <el-form-item label="摘要" class="desc-item">
            <el-input v-model="form.summary" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="一句话告诉观众视频看点" />
          </el-form-item>
          </div>

          <div v-else-if="form.type === 'image'" class="card main-card">
          <div class="card-head">
            <h3 class="card-title">插画组</h3>
            <span class="tip">必填：至少 1 张图，可设置首图（首图将作为封面）</span>
          </div>
          <div class="upload-row">
            <input id="image-files" class="file" type="file" accept="image/*" multiple @change="pickImages" />
            <label class="file-btn" for="image-files">
              <svg class="file-btn-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                <path d="M8 14l2.1-2.1a1 1 0 0 1 1.4 0L13 13a1 1 0 0 0 1.4 0L18 9.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              选择插画
            </label>
            <div class="tip tip-ic">
              <svg class="action-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4.5 9.5A2.5 2.5 0 0 1 7 7h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 20H7a2.5 2.5 0 0 1-2.5-2.5v-8Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
                <path
                  d="M8 15l2.1-2.1a1 1 0 0 1 1.4 0L13 14a1 1 0 0 0 1.4 0L18 11"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="9" cy="10" r="1.2" fill="none" stroke="currentColor" stroke-width="1.7" />
              </svg>
              <span class="tip-text">
                {{ imageFiles.length ? `已选择 ${imageFiles.length} 张（首图第 ${primaryImageIndex + 1} 张）` : '未选择插画' }}
              </span>
            </div>
          </div>
          <div v-if="imagePreviews.length" class="image-grid">
            <button
              v-for="(src, idx) in imagePreviews"
              :key="`${src}-${idx}`"
              type="button"
              class="image-item"
              :class="{ primary: idx === primaryImageIndex }"
              @click="setPrimaryImage(idx)"
            >
              <img :src="src" alt="" />
              <span class="badge">{{ idx === primaryImageIndex ? '首图' : '设为首图' }}</span>
              <span class="remove" @click.stop="removeImage(idx)">×</span>
            </button>
          </div>
          <el-form-item label="插画简介" class="desc-item">
            <el-input v-model="form.summary" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="补充插画说明（可选）" />
          </el-form-item>
          </div>

          <div v-else class="card main-card">
          <div class="card-head">
            <h3 class="card-title">专栏正文</h3>
            <span class="tip">必填：正文（支持标题/加粗/代码/插入图片）</span>
          </div>
          <el-form-item label="正文" class="desc-item">
            <MarkdownEditor v-model="form.body" />
          </el-form-item>
          </div>

          <div v-if="form.type !== 'image'" class="card cover-card">
          <div class="card-head">
            <h3 class="card-title">封面图（可选）</h3>
            <span class="tip">未上传则自动使用默认封面</span>
          </div>
          <div class="upload-row">
            <input id="cover-file" class="file" type="file" accept="image/*" @change="pickCover" />
            <label class="file-btn" for="cover-file">
              <svg class="file-btn-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7.5A2.5 2.5 0 0 1 9.5 5h7A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-7A2.5 2.5 0 0 1 7 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                <path d="M8 14.2 10.3 12a1 1 0 0 1 1.4 0l1 1a1 1 0 0 0 1.4 0L18 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              选择封面
            </label>
            <div class="tip tip-ic">
              <svg class="action-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 7.5A2.5 2.5 0 0 1 9.5 5h6A2.5 2.5 0 0 1 18 7.5v9A2.5 2.5 0 0 1 15.5 19h-6A2.5 2.5 0 0 1 7 16.5v-9Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
                <path
                  d="M7.6 13.3 10 11a1 1 0 0 1 1.4 0l1 1a1 1 0 0 0 1.4 0l2.3-2.3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="tip-text">{{ coverFile?.name ?? '未选择封面图' }}</span>
            </div>
          </div>
          <img v-if="coverPreview" :src="coverPreview" alt="" class="preview" />
          </div>
        </section>
      </transition>

      <div class="submit-bar">
        <div class="status">
          <span class="type">
            <svg class="status-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path d="M8 11h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              <path d="M8 14h5.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            {{ activeTypeLabel }}
          </span>
          <span class="sep">·</span>
          <span>{{ completionText }}</span>
        </div>
        <div class="actions">
          <el-button @click="reset">清空</el-button>
          <el-button type="primary" :loading="submitting" :disabled="submitting || progress > 0" @click="submit">
            发布
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../services/api';
import type { CategoryItem } from '../types';
import MarkdownEditor from '../components/MarkdownEditor.vue';

const router = useRouter();
const categories = ref<CategoryItem[]>([]);
const submitting = ref(false);
const progress = ref(0);
const videoFile = ref<File | null>(null);
const coverFile = ref<File | null>(null);
const coverPreview = ref('');

const form = reactive({
  type: 'video' as 'video' | 'image' | 'article',
  title: '',
  summary: '',
  body: '',
  categorySlug: '',
  tags: [] as string[]
});

const typeOptions = [
  { label: '视频', value: 'video' },
  { label: '插画', value: 'image' },
  { label: '专栏', value: 'article' }
];

const activeTypeLabel = computed(() => typeOptions.find((o) => o.value === form.type)?.label ?? '视频');
const activeTypeHint = computed(() => {
  if (form.type === 'video') return '视频：上传视频并设置封面';
  if (form.type === 'image') return '插画：上传多图并选择首图（无需额外封面）';
  return '专栏：先写正文再补封面';
});

const imageFiles = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const primaryImageIndex = ref(0);

const loadCategories = async (force = false) => {
  const { data } = await api.get('/categories/mine', {
    params: force ? { _t: Date.now() } : undefined
  });
  categories.value = (data.items ?? []) as CategoryItem[];
  if (!form.categorySlug) {
    const preferred = categories.value.find((c) => c.slug === 'default') ?? categories.value[0];
    form.categorySlug = preferred?.slug ?? '';
  }
};

const uploadFile = async (file: File, kind: 'video' | 'cover') => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/videos/upload', fd, {
    params: { kind },
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (kind !== 'video') return;
      const total = evt.total ?? 0;
      if (total > 0) progress.value = Math.round((evt.loaded / total) * 100);
    }
  });
  return String(data.url ?? '');
};

const pickVideo = (e: Event) => {
  videoFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
  progress.value = 0;
};

const revokeImagePreviews = () => {
  imagePreviews.value.forEach((url) => URL.revokeObjectURL(url));
  imagePreviews.value = [];
};

const clearImages = () => {
  imageFiles.value = [];
  primaryImageIndex.value = 0;
  revokeImagePreviews();
};

const pickImages = (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files ?? []).slice(0, 12);
  clearImages();
  imageFiles.value = files;
  imagePreviews.value = files.map((f) => URL.createObjectURL(f));
};

const setPrimaryImage = (idx: number) => {
  if (idx < 0 || idx >= imageFiles.value.length) return;
  primaryImageIndex.value = idx;
};

const removeImage = (idx: number) => {
  if (idx < 0 || idx >= imageFiles.value.length) return;
  const prevPrimary = primaryImageIndex.value;
  const nextFiles = imageFiles.value.filter((_, i) => i !== idx);
  clearImages();
  imageFiles.value = nextFiles;
  imagePreviews.value = nextFiles.map((f) => URL.createObjectURL(f));
  if (nextFiles.length < 1) {
    primaryImageIndex.value = 0;
    return;
  }
  if (idx < prevPrimary) primaryImageIndex.value = prevPrimary - 1;
  else if (prevPrimary >= nextFiles.length) primaryImageIndex.value = nextFiles.length - 1;
  else primaryImageIndex.value = prevPrimary;
};

const pickCover = (e: Event) => {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value);
  coverFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
  coverPreview.value = coverFile.value ? URL.createObjectURL(coverFile.value) : '';
};

const reset = () => {
  form.title = '';
  form.summary = '';
  form.body = '';
  form.type = 'video';
  form.tags = [];
  videoFile.value = null;
  coverFile.value = null;
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value);
  coverPreview.value = '';
  progress.value = 0;
  clearImages();
};

watch(
  () => form.type,
  (next) => {
    if (next !== 'video') {
      videoFile.value = null;
      progress.value = 0;
    }
    if (next !== 'image') clearImages();
    if (next !== 'article') form.body = '';
    if (next === 'article') form.summary = '';
  }
);

const completionText = computed(() => {
  const checks = [
    Boolean(form.title.trim()),
    Boolean(form.categorySlug),
    form.type === 'video' ? Boolean(videoFile.value) : form.type === 'image' ? imageFiles.value.length > 0 : form.body.trim().length >= 20
  ];
  const done = checks.filter(Boolean).length;
  return `必填完成度 ${done}/${checks.length}`;
});

const submit = async () => {
  if (!form.title.trim()) return ElMessage.warning('标题不能为空');
  if (!form.categorySlug) return ElMessage.warning('请选择分区');
  if (form.type === 'video' && !videoFile.value) return ElMessage.warning('请先选择视频文件');
  if (form.type === 'image' && imageFiles.value.length < 1) return ElMessage.warning('请至少上传 1 张插画');
  if (form.type === 'article' && form.body.trim().length < 20) return ElMessage.warning('正文至少输入 20 个字（建议包含标题或图片）');
  submitting.value = true;
  try {
    let mediaUrl = '';
    if (form.type === 'video' && videoFile.value) mediaUrl = await uploadFile(videoFile.value, 'video');
    let galleryUrls: string[] = [];
    if (form.type === 'image' && imageFiles.value.length) {
      // Move the selected primary image to the first position.
      const orderedFiles = [...imageFiles.value];
      if (primaryImageIndex.value > 0 && primaryImageIndex.value < orderedFiles.length) {
        const [primary] = orderedFiles.splice(primaryImageIndex.value, 1);
        if (primary) orderedFiles.unshift(primary);
      }
      // Upload all illustrations so detail page can preview the full gallery.
      galleryUrls = await Promise.all(orderedFiles.map((f) => uploadFile(f, 'cover')));
      mediaUrl = galleryUrls[0] ?? '';
    }
    let coverUrl = '';
    if (coverFile.value) coverUrl = await uploadFile(coverFile.value, 'cover');
    if (form.type === 'image' && !coverUrl) coverUrl = mediaUrl;

    const payload = {
      type: form.type,
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      body:
        form.type === 'article'
          ? form.body.trim()
          : form.type === 'image'
            ? JSON.stringify({ gallery: galleryUrls })
            : undefined,
      category_slug: form.categorySlug,
      tags: form.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12),
      media_url: mediaUrl || undefined,
      cover_url: coverUrl || undefined
    };
    const { data } = await api.post('/contents', payload);
    ElMessage.success('发布成功，稿件已进入审核队列');
    await router.push(`/contents/${data.item.id}`);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发布失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  void loadCategories();
});
</script>

<style scoped>
.page { max-width: 1140px; margin: 0 auto; padding: 24px 18px 68px; }
.head {
  margin-bottom: 12px;
  padding-bottom: 8px;
  position: relative;
}
.head h1 {
  margin: 0 0 6px;
  font-size: 30px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -.01em;
}
.head-ic { width: 18px; height: 18px; color: #0891b2; flex: 0 0 auto; }
.head p { margin: 0; color: #64748b; }
.head::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(148,163,184,.42);
}
.panel {
  border: 1px solid rgba(148,163,184,.2);
  border-radius: 14px;
  background: rgba(255,255,255,.92);
  padding: 14px;
  box-shadow: 0 6px 18px rgba(15,23,42,.035);
}
.type-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148,163,184,.26);
}
.chip {
  border: 1px solid rgba(148,163,184,.34);
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  padding: 7px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: border-color .15s ease, color .15s ease, background-color .15s ease, transform .15s ease;
}
.chip:hover { border-color: rgba(0,161,214,.3); color: #0369a1; background: rgba(240,249,255,.88); transform: translateY(-1px); }
.chip.on { border-color: rgba(0,161,214,.38); color: #0369a1; background: rgba(224,242,254,.82); }
.type-tip { color: #64748b; font-size: 13px; }
.chip-ic { width: 16px; height: 16px; flex: 0 0 auto; }
.chip-label { font-size: 13px; font-weight: 600; }
.meta-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.5fr) minmax(160px, .8fr) minmax(260px, 1.2fr);
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 4px 4px;
}
.meta-item label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #475569;
  margin-bottom: 4px;
  font-weight: 650;
}
.meta-label-ic {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
  color: #0891b2;
}
.meta-item :deep(.el-input__wrapper),
.meta-item :deep(.el-select .el-select__wrapper) {
  background-color: rgba(248,250,252,.72);
  box-shadow: 0 0 0 1px rgba(148,163,184,.16) inset;
}
.meta-item :deep(.el-input__wrapper.is-focus),
.meta-item :deep(.el-select.is-focused .el-select__wrapper),
.meta-item :deep(.el-select .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px rgba(56,189,248,.85) inset;
}
.type-panel { display: grid; gap: 12px; }
.card {
  border-radius: 12px;
  padding: 10px 10px 12px;
  background: rgba(248,250,252,.48);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.78);
}
.card-title { margin: 0 0 10px; font-size: 14px; color: #0f172a; font-weight: 760; }
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148,163,184,.14);
  flex-wrap: wrap;
}
.upload-row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: center; }
.file {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
  pointer-events: none;
}
.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(148,163,184,.42);
  background: rgba(248,250,252,.96);
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color .15s ease, background-color .15s ease, transform .15s ease;
}
.file-btn:hover {
  border-color: rgba(56,189,248,.85);
  background: rgba(240,249,255,.96);
  transform: translateY(-1px);
}
.file-btn-ic {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}
.tip { margin: 0; color: #64748b; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tip-ic {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  padding-right: 6px;
  min-height: 34px;
}
.tip-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.action-ic { width: 16px; height: 16px; flex: 0 0 auto; color: var(--accent); }
.preview { margin-top: 10px; width: 100%; max-width: 100%; border-radius: 10px; border: 1px solid rgba(148,163,184,.18); display: block; }
.progress { margin-top: 8px; height: 8px; border-radius: 999px; overflow: hidden; background: rgba(148,163,184,.24); }
.bar { height: 100%; background: #06b6d4; }
.progress-text { margin-top: 8px; font-size: 12.5px; color: #64748b; }
.cat-select { width: 100%; }
.desc-item { margin-top: 10px; margin-bottom: 0; }
.image-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}
.image-item {
  position: relative;
  border: 1px solid rgba(148,163,184,.18);
  border-radius: 10px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  background: rgba(255,255,255,.92);
  transition: transform .15s ease, border-color .15s ease;
}
.image-item:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.34); }
.image-item.primary { border-color: rgba(0,161,214,.45); }
.image-item img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  font-size: 12px;
  color: #fff;
  background: rgba(15,23,42,.72);
  border-radius: 999px;
  padding: 2px 8px;
}
.remove {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  line-height: 20px;
  text-align: center;
  background: rgba(15,23,42,.7);
  color: #fff;
  font-size: 14px;
}
.submit-bar {
  position: sticky;
  bottom: 8px;
  margin-top: 12px;
  border: 1px solid rgba(148,163,184,.16);
  border-radius: 12px;
  background: rgba(248,250,252,.9);
  backdrop-filter: blur(4px);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.status { display: flex; align-items: center; gap: 6px; color: #334155; font-size: 13px; }
.status .type { color: #0284c7; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.status-ic { width: 16px; height: 16px; }
.status .sep { color: #94a3b8; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.actions :deep(.el-button:not(.el-button--primary)) {
  border-color: rgba(148,163,184,.18);
  background: rgba(255,255,255,.72);
}

.panel-swap-enter-active,
.panel-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.panel-swap-enter-from,
.panel-swap-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .panel-swap-enter-active,
  .panel-swap-leave-active {
    transition: none;
  }
  .panel-swap-enter-from,
  .panel-swap-leave-to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 980px) {
  .meta-row { grid-template-columns: 1fr; gap: 8px; }
  .file { width: 210px; }
  .submit-bar { position: static; background: #fff; backdrop-filter: none; }
}
@media (max-width: 640px) {
  .page { padding: 16px 12px 42px; }
  .head h1 { font-size: 26px; }
  .upload-row { grid-template-columns: 1fr; }
  .file { width: 100%; }
  .actions { width: 100%; justify-content: flex-end; }
  .submit-bar { flex-direction: column; align-items: flex-start; }
}
</style>
