export const PLATFORMS = {
  CHATGPT: 'chatgpt',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  UNIVERSAL: 'universal'
};

export const INJECT_MODES = {
  APPEND: 'append',
  REPLACE: 'replace',
  INSERT: 'insert',
  NEW_CHAT: 'newChat'
};

export const VARIABLE_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  DATE: 'date',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DYNAMIC: 'dynamic'
};

export const SORT_OPTIONS = {
  RECENTLY_USED: 'recentlyUsed',
  CREATED_AT: 'createdAt',
  TITLE: 'title',
  USAGE_COUNT: 'usageCount',
  FAVORITE: 'favorite'
};

export const FILTER_OPTIONS = {
  CATEGORY: 'category',
  TAG: 'tag',
  PLATFORM: 'platform',
  DATE_RANGE: 'dateRange',
  FAVORITE: 'favorite'
};

export const DEFAULT_CATEGORIES = [
  { id: 'writing', name: '写作', icon: '📝' },
  { id: 'programming', name: '编程', icon: '💻' },
  { id: 'translation', name: '翻译', icon: '🌐' },
  { id: 'analysis', name: '分析', icon: '📊' },
  { id: 'creative', name: '创意', icon: '🎨' },
  { id: 'office', name: '办公', icon: '🏢' },
  { id: 'learning', name: '学习', icon: '📚' },
  { id: 'custom', name: '自定义', icon: '📁' }
];

export const COLORS = {
  PRIMARY: '#6366F1',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
  LIGHT: '#F3F4F6',
  DARK: '#1F2937'
};

export const PLATFORM_URLS = {
  [PLATFORMS.CHATGPT]: 'https://chat.openai.com',
  [PLATFORMS.CLAUDE]: 'https://claude.ai',
  [PLATFORMS.GEMINI]: 'https://gemini.google.com'
};

export const STORAGE_KEYS = {
  PROMPTS: 'promptvault_prompts',
  CATEGORIES: 'promptvault_categories',
  TRASH: 'promptvault_trash',
  SETTINGS: 'promptvault_settings'
};