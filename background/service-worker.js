import storageManager from '../shared/storage-manager.js';

class BackgroundManager {
  constructor() {
    this.init();
  }

  async init() {
    await storageManager.init();
    this.createContextMenus();
    this.bindEvents();
  }

  createContextMenus() {
    // 创建主菜单
    chrome.contextMenus.create({
      id: 'promptvault-main',
      title: 'PromptVault',
      contexts: ['editable', 'selection']
    });

    // 从选中文本创建提示词
    chrome.contextMenus.create({
      id: 'promptvault-create-from-selection',
      parentId: 'promptvault-main',
      title: '从选中文本创建提示词',
      contexts: ['selection']
    });

    // 分隔线
    chrome.contextMenus.create({
      id: 'promptvault-separator-1',
      parentId: 'promptvault-main',
      type: 'separator',
      contexts: ['editable', 'selection']
    });

    // 最近使用的提示词（动态添加）
    chrome.contextMenus.create({
      id: 'promptvault-recent',
      parentId: 'promptvault-main',
      title: '最近使用',
      contexts: ['editable']
    });

    // 收藏的提示词（动态添加）
    chrome.contextMenus.create({
      id: 'promptvault-favorites',
      parentId: 'promptvault-main',
      title: '收藏的提示词',
      contexts: ['editable']
    });

    // 分隔线
    chrome.contextMenus.create({
      id: 'promptvault-separator-2',
      parentId: 'promptvault-main',
      type: 'separator',
      contexts: ['editable', 'selection']
    });

    // 打开提示词管理器
    chrome.contextMenus.create({
      id: 'promptvault-open-manager',
      parentId: 'promptvault-main',
      title: '打开提示词管理器',
      contexts: ['editable', 'selection']
    });
  }

  async updateContextMenus() {
    // 清除现有的动态菜单项
    chrome.contextMenus.removeAll(() => {
      this.createContextMenus();
      this.addDynamicMenuItems();
    });
  }

  async addDynamicMenuItems() {
    const prompts = await storageManager.getAllPrompts();
    
    // 添加最近使用的提示词
    const recentPrompts = [...prompts]
      .filter(prompt => prompt.metadata.lastUsed)
      .sort((a, b) => new Date(b.metadata.lastUsed) - new Date(a.metadata.lastUsed))
      .slice(0, 5);

    recentPrompts.forEach(prompt => {
      chrome.contextMenus.create({
        id: `promptvault-use-${prompt.id}`,
        parentId: 'promptvault-recent',
        title: prompt.metadata.title,
        contexts: ['editable'],
        onclick: (info, tab) => {
          this.usePrompt(prompt.id, tab);
        }
      });
    });

    // 添加收藏的提示词
    const favoritePrompts = prompts.filter(prompt => prompt.metadata.isFavorite);

    favoritePrompts.forEach(prompt => {
      chrome.contextMenus.create({
        id: `promptvault-use-${prompt.id}`,
        parentId: 'promptvault-favorites',
        title: prompt.metadata.title,
        contexts: ['editable'],
        onclick: (info, tab) => {
          this.usePrompt(prompt.id, tab);
        }
      });
    });
  }

  bindEvents() {
    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });

    // 监听消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
    });

    // 监听存储变化
    chrome.storage.onChanged.addListener(() => {
      this.updateContextMenus();
    });

    // 监听扩展安装/更新
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onInstall();
      } else if (details.reason === 'update') {
        this.onUpdate();
      }
    });

    // 监听扩展启动
    chrome.runtime.onStartup.addListener(() => {
      this.onStartup();
    });
  }

  async handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'promptvault-create-from-selection':
        await this.createFromSelection(info.selectionText, tab);
        break;
      case 'promptvault-open-manager':
        this.openManager();
        break;
      default:
        if (info.menuItemId.startsWith('promptvault-use-')) {
          const promptId = info.menuItemId.replace('promptvault-use-', '');
          await this.usePrompt(promptId, tab);
        }
        break;
    }
  }

  async createFromSelection(text, tab) {
    if (!text) return;

    const newPrompt = {
      metadata: {
        title: '从选中文本创建',
        description: '从网页选中的文本创建',
        category: 'custom',
        tags: [],
        platform: ['universal'],
        language: 'zh-CN',
        isFavorite: false
      },
      content: {
        rawText: text,
        variables: [],
        previewText: text
      },
      execution: {
        targetSelector: '',
        autoSubmit: false,
        injectMode: 'append',
        hotkey: ''
      }
    };

    try {
      await storageManager.createPrompt(newPrompt);
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: '提示词创建成功',
        type: 'success'
      });
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: `创建失败: ${error.message}`,
        type: 'error'
      });
    }
  }

  async usePrompt(promptId, tab) {
    try {
      const prompt = await storageManager.getPromptById(promptId);
      if (!prompt) return;

      await storageManager.incrementUsageCount(promptId);

      chrome.tabs.sendMessage(tab.id, {
        type: 'INJECT_PROMPT',
        prompt: prompt.content.rawText
      });
    } catch (error) {
      console.error('使用提示词失败:', error);
    }
  }

  openManager() {
    chrome.action.openPopup();
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_PROMPTS':
        const prompts = await storageManager.getAllPrompts();
        sendResponse({ prompts });
        return true;
      case 'GET_PROMPT_BY_ID':
        const prompt = await storageManager.getPromptById(message.id);
        sendResponse({ prompt });
        return true;
      case 'CREATE_PROMPT':
        const newPrompt = await storageManager.createPrompt(message.prompt);
        sendResponse({ prompt: newPrompt });
        return true;
      case 'UPDATE_PROMPT':
        const updatedPrompt = await storageManager.updatePrompt(message.id, message.updates);
        sendResponse({ prompt: updatedPrompt });
        return true;
      case 'DELETE_PROMPT':
        await storageManager.deletePrompt(message.id);
        sendResponse({ success: true });
        return true;
      case 'EXPORT_PROMPTS':
        const exportData = await storageManager.exportPrompts();
        sendResponse({ data: exportData });
        return true;
      case 'IMPORT_PROMPTS':
        const importResult = await storageManager.importPrompts(message.data);
        sendResponse({ result: importResult });
        return true;
      default:
        sendResponse({ error: 'Unknown message type' });
        return true;
    }
  }

  onInstall() {
    console.log('PromptVault 扩展安装成功');
    // 可以在这里添加欢迎页面或初始化逻辑
  }

  onUpdate() {
    console.log('PromptVault 扩展更新成功');
    // 可以在这里添加更新通知或迁移逻辑
  }

  onStartup() {
    console.log('PromptVault 扩展启动');
    // 可以在这里添加启动逻辑
  }
}

// 初始化后台管理器
const backgroundManager = new BackgroundManager();

// 导出后台管理器（用于其他模块调用）
export default backgroundManager;