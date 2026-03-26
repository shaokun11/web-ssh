import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
const enTranslations = {
  app: {
    title: 'Web SSH',
    welcome: 'Welcome to Web SSH',
    privacyNotice: 'All data is stored locally in your browser',
    newConnection: '+ New Connection',
  },
  header: {
    sshConnection: 'SSH Connection',
    settings: 'Settings',
  },
  sidebar: {
    saved: 'Saved',
    noConnections: 'No saved connections',
    addServerHint: 'Click "New Connection" to add a server',
    edit: 'Edit',
    copy: 'Copy',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this connection?',
  },
  connection: {
    name: 'Connection Name',
    host: 'Host',
    port: 'Port',
    username: 'Username',
    authType: 'Authentication',
    password: 'Password',
    privateKey: 'Private Key',
    selectKeyFile: 'Select Key File',
    connect: 'Connect',
    save: 'Save',
    cancel: 'Cancel',
    editConnection: 'Edit Connection',
    newConnection: 'New Connection',
    copyConnection: 'Copy Connection',
    testing: 'Testing...',
    testSuccess: 'Connection successful!',
    testFailed: 'Connection failed: ',
    connectFailed: 'Connection failed',
  },
  terminal: {
    disconnectAll: 'Disconnect All',
    quickCommands: 'Quick Commands',
    commandHistory: 'Command History',
    allServers: 'All Servers',
    fileOperations: 'File Operations',
    systemMonitor: 'System Monitor',
    network: 'Network',
    textProcessing: 'Text Processing',
    permissions: 'Permissions',
    compression: 'Compression',
    noHistory: 'No history yet',
  },
  status: {
    connected: 'Connected',
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    error: 'Error',
  },
  preferences: {
    settings: 'Settings',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    fontSize: 'Font Size',
    close: 'Close',
  },
};

// Chinese translations
const zhTranslations = {
  app: {
    title: 'Web SSH',
    welcome: '欢迎使用 Web SSH',
    privacyNotice: '所有数据均保存在本地浏览器，不会上传到任何服务器',
    newConnection: '+ 新建连接',
  },
  header: {
    sshConnection: 'SSH 连接',
    settings: '设置',
  },
  sidebar: {
    saved: '已保存',
    noConnections: '暂无保存的连接',
    addServerHint: '点击"新建连接"添加服务器',
    edit: '编辑',
    copy: '复制',
    delete: '删除',
    confirmDelete: '确定要删除这个连接配置吗？',
  },
  connection: {
    name: '连接名称',
    host: '主机地址',
    port: '端口',
    username: '用户名',
    authType: '认证方式',
    password: '密码',
    privateKey: '私钥',
    selectKeyFile: '选择密钥文件',
    connect: '连接',
    save: '保存',
    cancel: '取消',
    editConnection: '编辑连接',
    newConnection: '新建连接',
    copyConnection: '复制连接',
    testing: '正在测试...',
    testSuccess: '连接成功！',
    testFailed: '连接失败：',
    connectFailed: '连接失败',
  },
  terminal: {
    disconnectAll: '断开全部',
    quickCommands: '快捷命令',
    commandHistory: '命令历史',
    allServers: '全部服务器',
    fileOperations: '文件操作',
    systemMonitor: '系统监控',
    network: '网络相关',
    textProcessing: '文本处理',
    permissions: '权限管理',
    compression: '压缩解压',
    noHistory: '暂无历史记录',
  },
  status: {
    connected: '已连接',
    disconnected: '已断开',
    connecting: '连接中...',
    error: '错误',
  },
  preferences: {
    settings: '设置',
    theme: '主题',
    dark: '深色',
    light: '浅色',
    language: '语言',
    fontSize: '字体大小',
    close: '关闭',
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
    },
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
