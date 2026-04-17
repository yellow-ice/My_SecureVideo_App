<template>
  <div class="md-editor">
    <div class="toolbar">
      <button type="button" class="t-btn" @click="insertHeader(1)">H1</button>
      <button type="button" class="t-btn" @click="insertHeader(2)">H2</button>
      <button type="button" class="t-btn" @click="insertHeader(3)">H3</button>
      <span class="sep" />
      <button type="button" class="t-btn" @click="wrapSelection('**', '**')">加粗</button>
      <button type="button" class="t-btn" @click="wrapSelection('*', '*')">斜体</button>
      <button type="button" class="t-btn" @click="wrapSelection('`', '`')">代码</button>
      <button type="button" class="t-btn" @click="wrapQuote()">引用</button>
      <button type="button" class="t-btn" @click="wrapList()">列表</button>
      <span class="sep" />
      <button type="button" class="t-btn" @click="chooseImage">插入图片</button>
      <input ref="fileEl" type="file" class="hidden-file" accept="image/*" @change="onPickImage" />
    </div>

    <textarea
      ref="textareaEl"
      v-model="localValue"
      class="md-textarea"
      rows="12"
      @input="syncToParent"
      @click="updateSelection"
      @keyup="updateSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import api from '../services/api';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const localValue = ref(props.modelValue ?? '');
watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v ?? '';
  }
);

const textareaEl = ref<HTMLTextAreaElement | null>(null);
const fileEl = ref<HTMLInputElement | null>(null);

// Cache selection offsets for toolbar actions.
const lastSelection = ref({ start: 0, end: 0 });
const updateSelection = () => {
  const el = textareaEl.value;
  if (!el) return;
  lastSelection.value = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
};

const syncToParent = () => {
  emit('update:modelValue', localValue.value);
};

const setCursor = async (start: number, end: number) => {
  await nextTick();
  const el = textareaEl.value;
  if (!el) return;
  el.focus();
  el.setSelectionRange(start, end);
};

const insertAt = async (start: number, end: number, insertText: string, newCursor?: { start: number; end: number }) => {
  const before = localValue.value.slice(0, start);
  const after = localValue.value.slice(end);
  localValue.value = before + insertText + after;
  emit('update:modelValue', localValue.value);
  if (newCursor) {
    await setCursor(newCursor.start, newCursor.end);
  } else {
    await setCursor(start + insertText.length, start + insertText.length);
  }
};

const wrapSelection = async (left: string, right: string) => {
  const el = textareaEl.value;
  if (!el) return;
  updateSelection();
  const { start, end } = lastSelection.value;
  const selected = localValue.value.slice(start, end);
  if (!selected) {
    // Insert placeholder and place cursor between marks.
    await insertAt(start, end, `${left}${right}`, { start: start + left.length, end: start + left.length });
    return;
  }
  await insertAt(start, end, `${left}${selected}${right}`, { start: start + left.length, end: start + left.length + selected.length });
};

const insertHeader = async (level: 1 | 2 | 3) => {
  const prefix = '#'.repeat(level);
  updateSelection();
  const { start, end } = lastSelection.value;
  const selected = localValue.value.slice(start, end);
  if (!selected) {
    const insertText = `${prefix} `;
    await insertAt(start, end, insertText);
    return;
  }
  const lines = selected.split('\n');
  const wrapped = lines.map((l) => `${prefix} ${l}`.trimEnd()).join('\n');
  await insertAt(start, end, wrapped);
};

const wrapQuote = async () => {
  updateSelection();
  const { start, end } = lastSelection.value;
  const selected = localValue.value.slice(start, end);
  if (!selected) {
    await insertAt(start, end, `> `);
    return;
  }
  const lines = selected.split('\n').map((l) => `> ${l}`.trimEnd());
  await insertAt(start, end, lines.join('\n'));
};

const wrapList = async () => {
  updateSelection();
  const { start, end } = lastSelection.value;
  const selected = localValue.value.slice(start, end);
  if (!selected) {
    await insertAt(start, end, `- `);
    return;
  }
  const lines = selected.split('\n').map((l) => `- ${l}`.trimEnd());
  await insertAt(start, end, lines.join('\n'));
};

const chooseImage = () => {
  fileEl.value?.click();
};

const onPickImage = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  // allow selecting the same file again
  input.value = '';
  if (!file) return;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/videos/upload', fd, {
      params: { kind: 'cover' },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const url = String(data?.url ?? '').trim();
    if (!url) return;
    updateSelection();
    const { start, end } = lastSelection.value;
    const insertText = `![](${url})`;
    await insertAt(start, end, insertText);
  } catch {
    // swallow and let user continue typing
  }
};

// initialize selection
watch(
  () => localValue.value,
  () => {
    // keep lastSelection
  }
);
</script>

<style scoped>
.md-editor { display: grid; gap: 10px; }
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.t-btn {
  border: 1px solid rgba(15,23,42,.14);
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  color: #334155;
  font-size: 13px;
}
.t-btn:hover { border-color: rgba(0,161,214,.35); background: var(--accent-soft); color: var(--accent); }
.sep { width: 1px; height: 22px; background: rgba(15,23,42,.10); }
.hidden-file { display: none; }
.md-textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  line-height: 1.7;
  resize: vertical;
  background: #fff;
  color: #0f172a;
}
</style>

