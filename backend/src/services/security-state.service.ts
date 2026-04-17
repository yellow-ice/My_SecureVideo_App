type InternalSecurityState = {
  userProtectionEnabled: boolean;
  antiCrawlerEnabled: boolean;
  chatEncryptionEnabled: boolean;
  idorProtectionEnabled: boolean;
  ssrfProtectionEnabled: boolean;
  traversalProtectionEnabled: boolean;
  configLeakProtectionEnabled: boolean;
  wafBlockEnabled: boolean;
};

export type SecurityState = InternalSecurityState & {
  // 兼容旧字段：历史“防御开关”语义 -> WAF 是否拦截
  defenseEnabled: boolean;
};

const state: InternalSecurityState = {
  userProtectionEnabled: true,
  antiCrawlerEnabled: true,
  chatEncryptionEnabled: true,
  idorProtectionEnabled: true,
  ssrfProtectionEnabled: true,
  traversalProtectionEnabled: true,
  configLeakProtectionEnabled: true,
  wafBlockEnabled: true
};

export const getSecurityState = (): SecurityState => ({
  ...state,
  defenseEnabled: state.wafBlockEnabled
});

export const setDefenseEnabled = (enabled: boolean): void => {
  state.wafBlockEnabled = enabled;
};

export const setSecuritySwitches = (patch: Partial<InternalSecurityState>): void => {
  if (typeof patch.userProtectionEnabled === 'boolean') state.userProtectionEnabled = patch.userProtectionEnabled;
  if (typeof patch.antiCrawlerEnabled === 'boolean') state.antiCrawlerEnabled = patch.antiCrawlerEnabled;
  if (typeof patch.chatEncryptionEnabled === 'boolean') state.chatEncryptionEnabled = patch.chatEncryptionEnabled;
  if (typeof patch.idorProtectionEnabled === 'boolean') state.idorProtectionEnabled = patch.idorProtectionEnabled;
  if (typeof patch.ssrfProtectionEnabled === 'boolean') state.ssrfProtectionEnabled = patch.ssrfProtectionEnabled;
  if (typeof patch.traversalProtectionEnabled === 'boolean') state.traversalProtectionEnabled = patch.traversalProtectionEnabled;
  if (typeof patch.configLeakProtectionEnabled === 'boolean') state.configLeakProtectionEnabled = patch.configLeakProtectionEnabled;
};
