<template>
  <div class="auth-view">
    <div class="split">
      <div class="col col-left">
        <div class="col-pad">
          <transition name="auth-L" mode="out-in">
            <div v-if="!isRegister" key="login-form" class="block">
              <p class="brand">SecureVideo</p>
              <h2 class="h2">欢迎回来</h2>
              <p class="lead">登录后继续浏览与创作。</p>
              <el-form label-position="top" class="form" @submit.prevent="onLogin">
                <el-form-item label="邮箱">
                  <el-input v-model="loginEmail" type="email" autocomplete="username" size="large" placeholder="name@example.com" />
                </el-form-item>
                <el-form-item label="密码">
                  <el-input
                    v-model="loginPassword"
                    type="password"
                    show-password
                    autocomplete="current-password"
                    size="large"
                    placeholder="输入密码"
                  />
                </el-form-item>
                <el-button type="primary" size="large" class="btn-main" native-type="submit">登录</el-button>
                <p class="switch">
                  还没有账号？
                  <button type="button" class="link" @click="goRegister">注册账号</button>
                </p>
              </el-form>
              <div class="demo">
                <p class="demo-t">体验演示</p>
                <div class="chips">
                  <button type="button" class="chip" @click="fillAdmin">管理员</button>
                  <button type="button" class="chip" @click="fillUser">普通用户</button>
                </div>
                <p class="hint mono">admin@securevideo.com · Admin@123456</p>
                <p class="hint mono">user@securevideo.com · User@123456</p>
              </div>
            </div>
            <div v-else key="login-intro" class="block intro">
              <p class="brand">SecureVideo</p>
              <h1 class="headline">发现、创作与分享<br /><span class="hl">你的内容宇宙</span></h1>
              <p class="tag">已有账号？左侧曾是登录区，现在先看站点的核心价值。</p>
              <ul class="feat">
                <li>视频 · 插画 · 专栏一站浏览</li>
                <li>投稿与创作中心</li>
                <li>收藏、历史与消息</li>
              </ul>
              <button type="button" class="ghost" @click="goLogin">去登录</button>
            </div>
          </transition>
        </div>
      </div>

      <div class="col col-right">
        <div class="col-pad">
          <transition name="auth-R" mode="out-in">
            <div v-if="!isRegister" key="reg-intro" class="block intro">
              <p class="brand">SecureVideo</p>
              <h1 class="headline">加入即可<br /><span class="hl">开启创作与互动</span></h1>
              <p class="tag">注册后可投稿、写专栏、用消息与好友互动。</p>
              <ul class="feat">
                <li>同一账号：浏览、投稿、资料与消息</li>
                <li>邮箱登录 · 用户名将公开展示</li>
                <li>演示环境也可完整体验流程</li>
              </ul>
              <button type="button" class="ghost" @click="goRegister">去注册</button>
            </div>
            <div v-else key="reg-form" class="block">
              <p class="brand">SecureVideo</p>
              <h2 class="h2">创建账号</h2>
              <p class="lead">填写后注册成功将跳转登录。</p>
              <el-form label-position="top" class="form" @submit.prevent="onRegister">
                <el-form-item label="邮箱">
                  <el-input v-model="regEmail" type="email" autocomplete="email" size="large" placeholder="name@example.com" />
                </el-form-item>
                <el-form-item label="用户名">
                  <el-input v-model="regUsername" autocomplete="username" size="large" placeholder="2～40 字" maxlength="40" show-word-limit />
                </el-form-item>
                <el-form-item label="密码">
                  <el-input v-model="regPassword" type="password" show-password autocomplete="new-password" size="large" placeholder="至少 6 位" />
                </el-form-item>
                <el-button type="primary" size="large" class="btn-main" native-type="submit">注册并前往登录</el-button>
                <p class="switch">
                  已有账号？
                  <button type="button" class="link" @click="goLogin">前往登录</button>
                </p>
              </el-form>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user';
import api from '../services/api';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isRegister = computed(() => route.path === '/register');

const loginEmail = ref('');
const loginPassword = ref('');
const regEmail = ref('');
const regUsername = ref('');
const regPassword = ref('');

const goLogin = () => void router.push('/login');
const goRegister = () => void router.push('/register');

watch(
  isRegister,
  (reg) => {
    if (reg) {
      document.title = '注册 · SecureVideo';
    } else {
      document.title = '登录 · SecureVideo';
    }
  },
  { immediate: true }
);

const onLogin = async () => {
  try {
    await userStore.login(loginEmail.value, loginPassword.value);
    ElMessage.success('登录成功');
    await router.push(userStore.user?.role === 'admin' ? '/security' : '/videos');
  } catch (error: any) {
    userStore.logout();
    ElMessage.error(error?.response?.data?.message ?? '登录失败，请检查账号密码');
  }
};

const fillAdmin = () => {
  loginEmail.value = 'admin@securevideo.com';
  loginPassword.value = 'Admin@123456';
};

const fillUser = () => {
  loginEmail.value = 'user@securevideo.com';
  loginPassword.value = 'User@123456';
};

const onRegister = async () => {
  if (regPassword.value.length < 6) {
    ElMessage.warning('密码至少 6 位');
    return;
  }
  const name = regUsername.value.trim();
  if (name.length < 2) {
    ElMessage.warning('用户名至少 2 个字符');
    return;
  }
  try {
    await api.post('/auth/register', { email: regEmail.value.trim(), username: name, password: regPassword.value });
    ElMessage.success('注册成功，请登录');
    await router.push('/login');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '注册失败');
  }
};
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(165deg, #f0f9ff 0%, #f8fafc 40%, #f1f5f9 100%);
}

.split {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

.col {
  flex: 1 1 50%;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.col-left {
  border-right: 1px solid rgba(148, 163, 184, 0.35);
}

.col-pad {
  width: 100%;
  max-width: 420px;
  padding: 0 clamp(20px, 4vw, 48px);
}

.block {
  width: 100%;
}

.brand {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.h2 {
  margin: 0 0 6px;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.lead {
  margin: 0 0 20px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.55;
}

.form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
}

.form :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(0, 161, 214, 0.55);
}

.btn-main {
  width: 100%;
  margin-top: 4px;
  font-weight: 700;
}

.switch {
  margin: 14px 0 0;
  text-align: center;
  font-size: 14px;
  color: #64748b;
}

.link {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

.demo {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
}

.demo-t {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.chip {
  border: 1px solid rgba(0, 161, 214, 0.35);
  background: rgba(0, 161, 214, 0.08);
  color: #0284c7;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.chip:hover {
  border-color: rgba(0, 161, 214, 0.55);
  background: rgba(0, 161, 214, 0.14);
}

.hint {
  margin: 4px 0 0;
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.4;
}

.hint.mono {
  font-family: ui-monospace, Consolas, monospace;
}

.intro .headline {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.22;
  color: #0f172a;
}

.hl {
  color: var(--accent);
}

.tag {
  margin: 0 0 16px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.65;
}

.feat {
  margin: 0 0 20px;
  padding-left: 1.15em;
  font-size: 14px;
  color: #475569;
  line-height: 1.75;
}

.ghost {
  border: 1px solid rgba(0, 161, 214, 0.4);
  background: rgba(255, 255, 255, 0.7);
  color: #0284c7;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.ghost:hover {
  background: rgba(0, 161, 214, 0.1);
}

/* 左栏：进入时从左侧滑入，离开时向右淡出 */
.auth-L-enter-active,
.auth-L-leave-active {
  transition: opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1), transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-L-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}

.auth-L-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* 右栏：对称 */
.auth-R-enter-active,
.auth-R-leave-active {
  transition: opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1), transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-R-enter-from {
  opacity: 0;
  transform: translateX(28px);
}

.auth-R-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

@media (max-width: 860px) {
  .split {
    flex-direction: column;
    min-height: auto;
  }

  .col-left {
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  }

  .col {
    padding: 28px 0;
  }
}
</style>
