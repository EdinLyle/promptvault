// 简单的存储管理器
class StorageManager {
  constructor() {
    this.promptsKey = 'promptvault_prompts';
    this.categoriesKey = 'promptvault_categories';
    this.trashKey = 'promptvault_trash';
  }

  async init() {
    const storage = await chrome.storage.local.get();
    
    if (!storage[this.promptsKey]) {
      await chrome.storage.local.set({[this.promptsKey]: []});
    }
    
    if (!storage[this.categoriesKey]) {
      await chrome.storage.local.set({[this.categoriesKey]: this.getDefaultCategories()});
    }
    
    if (!storage[this.trashKey]) {
      await chrome.storage.local.set({[this.trashKey]: []});
    }
  }

  getDefaultCategories() {
    return [
      {id: 'writing', name: '写作', icon: '📝'},
      {id: 'programming', name: '编程', icon: '💻'},
      {id: 'translation', name: '翻译', icon: '🌐'},
      {id: 'analysis', name: '分析', icon: '📊'},
      {id: 'creative', name: '创意', icon: '🎨'},
      {id: 'office', name: '办公', icon: '🏢'},
      {id: 'learning', name: '学习', icon: '📚'},
      {id: 'custom', name: '自定义', icon: '📁'}
    ];
  }

  async getAllPrompts() {
    const storage = await chrome.storage.local.get(this.promptsKey);
    return storage[this.promptsKey] || [];
  }

  async getPromptById(id) {
    const prompts = await this.getAllPrompts();
    for (let i = 0; i < prompts.length; i++) {
      if (prompts[i].id === id) {
        return prompts[i];
      }
    }
    return null;
  }

  async createPrompt(prompt) {
    const prompts = await this.getAllPrompts();
    const newPrompt = {
      ...prompt,
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      metadata: {
        ...prompt.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      }
    };
    
    prompts.push(newPrompt);
    await chrome.storage.local.set({[this.promptsKey]: prompts});
    return newPrompt;
  }

  async updatePrompt(id, updates) {
    const prompts = await this.getAllPrompts();
    let index = -1;
    for (let i = 0; i < prompts.length; i++) {
      if (prompts[i].id === id) {
        index = i;
        break;
      }
    }
    
    if (index === -1) {
      throw new Error('Prompt not found');
    }
    
    prompts[index] = {
      ...prompts[index],
      ...updates,
      metadata: {
        ...prompts[index].metadata,
        ...(updates.metadata || {}),
        updatedAt: new Date().toISOString()
      }
    };
    
    await chrome.storage.local.set({[this.promptsKey]: prompts});
    return prompts[index];
  }

  async deletePrompt(id) {
    const prompts = await this.getAllPrompts();
    let promptToDelete = null;
    let updatedPrompts = [];
    
    for (let i = 0; i < prompts.length; i++) {
      if (prompts[i].id === id) {
        promptToDelete = prompts[i];
      } else {
        updatedPrompts.push(prompts[i]);
      }
    }
    
    if (!promptToDelete) {
      throw new Error('Prompt not found');
    }
    
    await chrome.storage.local.set({[this.promptsKey]: updatedPrompts});
    await this.addToTrash(promptToDelete);
    return true;
  }

  async addToTrash(prompt) {
    const trash = await this.getTrash();
    trash.push({
      ...prompt,
      deletedAt: new Date().toISOString()
    });
    await chrome.storage.local.set({[this.trashKey]: trash});
  }

  async getTrash() {
    const storage = await chrome.storage.local.get(this.trashKey);
    return storage[this.trashKey] || [];
  }

  async getAllCategories() {
    const storage = await chrome.storage.local.get(this.categoriesKey);
    return storage[this.categoriesKey] || [];
  }

  async exportPrompts() {
    const prompts = await this.getAllPrompts();
    const categories = await this.getAllCategories();
    
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      prompts: prompts,
      categories: categories
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  async importPrompts(data) {
    let importData;
    try {
      importData = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
    
    if (!importData.prompts) {
      throw new Error('Invalid import data format');
    }
    
    const existingPrompts = await this.getAllPrompts();
    const existingIds = new Set();
    for (let i = 0; i < existingPrompts.length; i++) {
      existingIds.add(existingPrompts[i].id);
    }
    
    const newPrompts = [];
    for (let i = 0; i < importData.prompts.length; i++) {
      if (!existingIds.has(importData.prompts[i].id)) {
        newPrompts.push(importData.prompts[i]);
      }
    }
    
    const mergedPrompts = [...existingPrompts, ...newPrompts];
    await chrome.storage.local.set({[this.promptsKey]: mergedPrompts});
    
    return {imported: newPrompts.length, existing: existingPrompts.length};
  }

  async incrementUsageCount(id) {
    const prompt = await this.getPromptById(id);
    if (prompt) {
      await this.updatePrompt(id, {
        metadata: {
          ...prompt.metadata,
          usageCount: (prompt.metadata.usageCount || 0) + 1,
          lastUsed: new Date().toISOString()
        }
      });
    }
  }
}

const storageManager = new StorageManager();

export default storageManager;