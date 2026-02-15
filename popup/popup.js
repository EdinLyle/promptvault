// 弹出窗口管理器
import storageManager from '../shared/storage-manager.js';
import utils from '../shared/utils.js';

class PopupManager {
  constructor() {
    this.currentPrompts = [];
    this.currentCategory = 'all';
    this.currentSearch = '';
    this.editingPromptId = null;
    
    this.init();
  }

  async init() {
    await storageManager.init();
    await this.loadPrompts();
    await this.loadCategories();
    this.bindEvents();
  }

  async loadPrompts() {
    this.currentPrompts = await storageManager.getAllPrompts();
    this.renderPromptList();
  }

  async loadCategories() {
    const categories = await storageManager.getAllCategories();
    const categoryTabs = document.querySelector('.category-tabs');
    
    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'category-tab';
      button.dataset.category = category.id;
      button.textContent = category.icon + ' ' + category.name;
      categoryTabs.appendChild(button);
    });
    
    // 绑定分类标签点击事件
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchCategory(tab.dataset.category);
      });
    });
    
    // 填充分类下拉框
    const categorySelect = document.getElementById('prompt-category');
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.icon + ' ' + category.name;
      categorySelect.appendChild(option);
    });
  }

  bindEvents() {
    try {
      // 创建提示词按钮
      const createPromptButton = document.getElementById('create-prompt');
      if (createPromptButton) {
        createPromptButton.addEventListener('click', () => {
          this.openCreateModal();
        });
      }
      
      // 导入导出按钮
      const importExportButton = document.getElementById('import-export');
      if (importExportButton) {
        importExportButton.addEventListener('click', () => {
          const importExportModal = document.getElementById('import-export-modal');
          if (importExportModal) {
            importExportModal.classList.add('show');
            // 重新绑定导入导出模态框中的事件
            this.bindImportExportEvents();
          }
        });
      }
      
      // 关闭提示词模态框
      const closeModalButton = document.getElementById('close-modal');
      if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
          this.closeModal();
        });
      }
      
      // 关闭导入导出模态框
      const closeImportExportModalButton = document.getElementById('close-import-export-modal');
      if (closeImportExportModalButton) {
        closeImportExportModalButton.addEventListener('click', () => {
          const importExportModal = document.getElementById('import-export-modal');
          if (importExportModal) {
            importExportModal.classList.remove('show');
          }
        });
      }
      
      // 保存提示词
      const savePromptButton = document.getElementById('save-prompt');
      if (savePromptButton) {
        savePromptButton.addEventListener('click', () => {
          this.savePrompt();
        });
      }
      
      // 取消按钮
      const cancelPromptButton = document.getElementById('cancel-prompt');
      if (cancelPromptButton) {
        cancelPromptButton.addEventListener('click', () => {
          this.closeModal();
        });
      }
      
      // 搜索功能
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.currentSearch = e.target.value;
          this.renderPromptList();
        });
      }
    } catch (error) {
      console.error('绑定事件监听器时出错:', error);
    }
  }

  bindImportExportEvents() {
    try {
      // 导入导出标签切换
      const importExportTabs = document.querySelectorAll('.import-export-tabs .tab');
      importExportTabs.forEach(tab => {
        // 移除旧的事件监听器
        tab.replaceWith(tab.cloneNode(true));
      });
      
      // 重新绑定标签切换事件
      document.querySelectorAll('.import-export-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.import-export-tabs .tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          const tabContent = tab.dataset.tab;
          const exportContent = document.getElementById('export-content');
          const importContent = document.getElementById('import-content');
          if (exportContent) {
            exportContent.style.display = tabContent === 'export' ? 'block' : 'none';
          }
          if (importContent) {
            importContent.style.display = tabContent === 'import' ? 'block' : 'none';
          }
        });
      });
      
      // 导出按钮
      const exportButton = document.getElementById('export-button');
      if (exportButton) {
        // 移除旧的事件监听器
        exportButton.replaceWith(exportButton.cloneNode(true));
        const newExportButton = document.getElementById('export-button');
        newExportButton.addEventListener('click', () => {
          this.exportPrompts();
        });
      }
      
      // 导入按钮
      const importButton = document.getElementById('import-button');
      if (importButton) {
        // 移除旧的事件监听器
        importButton.replaceWith(importButton.cloneNode(true));
        const newImportButton = document.getElementById('import-button');
        newImportButton.addEventListener('click', () => {
          const importFile = document.getElementById('import-file');
          if (importFile && importFile.files.length > 0) {
            const file = importFile.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const result = await storageManager.importPrompts(e.target.result);
                utils.showNotification('成功导入 ' + result.imported + ' 个提示词', 'success');
                await this.loadPrompts();
                const importExportModal = document.getElementById('import-export-modal');
                if (importExportModal) {
                  importExportModal.classList.remove('show');
                }
              } catch (error) {
                utils.showNotification('导入失败: ' + error.message, 'error');
              }
            };
            reader.readAsText(file);
          } else {
            utils.showNotification('请选择要导入的文件', 'error');
          }
        });
      }
    } catch (error) {
      console.error('绑定导入导出事件监听器时出错:', error);
    }
  }

  switchCategory(category) {
    this.currentCategory = category;
    
    // 更新分类标签状态
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.category === category) {
        tab.classList.add('active');
      }
    });
    
    this.renderPromptList();
  }

  renderPromptList() {
    const promptList = document.getElementById('prompt-list');
    const emptyState = document.getElementById('empty-state');
    
    let filteredPrompts = [...this.currentPrompts];
    
    // 应用分类过滤
    if (this.currentCategory === 'favorite') {
      filteredPrompts = filteredPrompts.filter(prompt => prompt.metadata.isFavorite);
    } else if (this.currentCategory !== 'all') {
      filteredPrompts = filteredPrompts.filter(prompt => prompt.metadata.category === this.currentCategory);
    }
    
    // 应用搜索过滤
    if (this.currentSearch) {
      filteredPrompts = utils.searchPrompts(filteredPrompts, this.currentSearch);
    }
    
    // 排序
    filteredPrompts = utils.sortPrompts(filteredPrompts, 'recentlyUsed');
    
    // 清空提示词列表
    promptList.innerHTML = '';
    
    if (filteredPrompts.length === 0) {
      // 创建新的空状态元素
      const newEmptyState = document.createElement('div');
      newEmptyState.className = 'empty-state';
      newEmptyState.id = 'empty-state';
      newEmptyState.innerHTML = `
        <div class="empty-icon">📝</div>
        <h3>还没有提示词</h3>
        <p>点击下方按钮创建第一个提示词</p>
        <button id="create-first-prompt">创建提示词</button>
      `;
      promptList.appendChild(newEmptyState);
      
      // 重新绑定创建按钮事件
      newEmptyState.querySelector('#create-first-prompt').addEventListener('click', () => {
        this.openCreateModal();
      });
    } else {
      filteredPrompts.forEach(prompt => {
        const promptItem = this.createPromptItem(prompt);
        promptList.appendChild(promptItem);
      });
    }
  }

  createPromptItem(prompt) {
    const item = document.createElement('div');
    item.className = 'prompt-item';
    
    const tagsHtml = prompt.metadata.tags ? prompt.metadata.tags.map(tag => 
      '<span class="prompt-item-tag">' + tag + '</span>'
    ).join('') : '';
    
    const platformsHtml = prompt.metadata.platform ? prompt.metadata.platform.map(platform => 
      '<span class="prompt-item-platform">' + platform + '</span>'
    ).join('') : '';
    
    item.innerHTML = '<div class="prompt-item-header">' +
      '<div class="prompt-item-title">' + prompt.metadata.title + '</div>' +
      '<div class="prompt-item-actions">' +
        '<button class="prompt-item-action" data-action="copy" data-id="' + prompt.id + '">复制</button>' +
        '<button class="prompt-item-action" data-action="edit" data-id="' + prompt.id + '">编辑</button>' +
        '<button class="prompt-item-action" data-action="delete" data-id="' + prompt.id + '">删除</button>' +
      '</div>' +
    '</div>' +
    (prompt.metadata.description ? '<div class="prompt-item-description">' + prompt.metadata.description + '</div>' : '') +
    '<div class="prompt-item-meta">' +
      '<span class="prompt-item-category">' + prompt.metadata.category + '</span>' +
      (tagsHtml ? '<div class="prompt-item-tags">' + tagsHtml + '</div>' : '') +
    '</div>' +
    (platformsHtml ? '<div class="prompt-item-platforms">' + platformsHtml + '</div>' : '');
    
    // 绑定操作按钮事件
    item.querySelectorAll('.prompt-item-action').forEach(action => {
      action.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionType = action.dataset.action;
        const promptId = action.dataset.id;
        
        if (actionType === 'copy') {
          this.copyPrompt(promptId);
        } else if (actionType === 'edit') {
          this.editPrompt(promptId);
        } else if (actionType === 'delete') {
          this.deletePrompt(promptId);
        }
      });
    });
    
    return item;
  }

  openCreateModal() {
    this.editingPromptId = null;
    document.getElementById('modal-title').textContent = '创建提示词';
    document.getElementById('prompt-form').reset();
    document.getElementById('prompt-modal').classList.add('show');
    
    // 确保保存和取消按钮的事件监听器正确绑定
    this.bindModalEvents();
  }

  async editPrompt(id) {
    console.log('编辑提示词，ID:', id);
    try {
      const prompt = await storageManager.getPromptById(id);
      console.log('获取到的提示词:', prompt);
      if (!prompt) {
        console.log('未找到提示词');
        return;
      }
      
      this.editingPromptId = id;
      document.getElementById('modal-title').textContent = '编辑提示词';
      document.getElementById('prompt-title').value = prompt.metadata.title;
      document.getElementById('prompt-description').value = prompt.metadata.description || '';
      document.getElementById('prompt-category').value = prompt.metadata.category;
      document.getElementById('prompt-tags').value = prompt.metadata.tags ? prompt.metadata.tags.join(', ') : '';
      document.getElementById('prompt-content').value = prompt.content.rawText;
      document.getElementById('prompt-favorite').checked = prompt.metadata.isFavorite || false;
      
      // 选中平台复选框
      document.querySelectorAll('.platform-selector input').forEach(checkbox => {
        checkbox.checked = prompt.metadata.platform && prompt.metadata.platform.includes(checkbox.value);
      });
      
      console.log('显示模态框');
      document.getElementById('prompt-modal').classList.add('show');
      
      // 确保保存和取消按钮的事件监听器正确绑定
      this.bindModalEvents();
    } catch (error) {
      console.error('编辑提示词时出错:', error);
    }
  }

  closeModal() {
    document.getElementById('prompt-modal').classList.remove('show');
    this.editingPromptId = null;
  }

  bindModalEvents() {
    // 保存提示词
    const saveButton = document.getElementById('save-prompt');
    if (saveButton) {
      // 移除旧的事件监听器，避免重复绑定
      saveButton.replaceWith(saveButton.cloneNode(true));
      const newSaveButton = document.getElementById('save-prompt');
      newSaveButton.addEventListener('click', () => {
        this.savePrompt();
      });
    }
    
    // 取消按钮
    const cancelButton = document.getElementById('cancel-prompt');
    if (cancelButton) {
      // 移除旧的事件监听器，避免重复绑定
      cancelButton.replaceWith(cancelButton.cloneNode(true));
      const newCancelButton = document.getElementById('cancel-prompt');
      newCancelButton.addEventListener('click', () => {
        this.closeModal();
      });
    }
    
    // 关闭按钮
    const closeButton = document.getElementById('close-modal');
    if (closeButton) {
      // 移除旧的事件监听器，避免重复绑定
      closeButton.replaceWith(closeButton.cloneNode(true));
      const newCloseButton = document.getElementById('close-modal');
      newCloseButton.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  async savePrompt() {
    console.log('开始保存提示词，editingPromptId:', this.editingPromptId);
    
    try {
      const title = document.getElementById('prompt-title').value.trim();
      const content = document.getElementById('prompt-content').value.trim();
      
      if (!title || !content) {
        utils.showNotification('标题和内容不能为空', 'error');
        return;
      }
      
      const platformCheckboxes = document.querySelectorAll('.platform-selector input:checked');
      const platform = Array.from(platformCheckboxes).map(cb => cb.value);
      
      const promptData = {
        metadata: {
          title: title,
          description: document.getElementById('prompt-description').value.trim(),
          category: document.getElementById('prompt-category').value,
          tags: document.getElementById('prompt-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
          platform: platform.length > 0 ? platform : ['universal'],
          language: 'zh-CN',
          isFavorite: document.getElementById('prompt-favorite').checked
        },
        content: {
          rawText: content,
          variables: utils.parseTemplateVariables(content),
          previewText: content
        },
        execution: {
          targetSelector: '',
          autoSubmit: false,
          injectMode: 'append',
          hotkey: ''
        }
      };
      
      console.log('保存数据:', promptData);
      
      if (this.editingPromptId) {
        console.log('更新提示词，ID:', this.editingPromptId);
        await storageManager.updatePrompt(this.editingPromptId, promptData);
        utils.showNotification('提示词更新成功', 'success');
      } else {
        console.log('创建新提示词');
        await storageManager.createPrompt(promptData);
        utils.showNotification('提示词创建成功', 'success');
      }
      
      console.log('保存成功，重新加载提示词');
      await this.loadPrompts();
      this.closeModal();
    } catch (error) {
      console.error('保存提示词时出错:', error);
      utils.showNotification('保存失败: ' + error.message, 'error');
    }
  }

  async deletePrompt(id) {
    if (confirm('确定要删除这个提示词吗？')) {
      try {
        await storageManager.deletePrompt(id);
        utils.showNotification('提示词已删除', 'success');
        // 重新加载提示词列表，避免访问已删除元素
        setTimeout(() => {
          this.loadPrompts();
        }, 100);
      } catch (error) {
        console.error('删除提示词时出错:', error);
        utils.showNotification('删除失败: ' + error.message, 'error');
      }
    }
  }

  async usePrompt(id) {
    const prompt = await storageManager.getPromptById(id);
    if (!prompt) return;
    
    await storageManager.incrementUsageCount(id);
    
    // 检查是否需要填写变量
    if (prompt.content.variables && prompt.content.variables.length > 0) {
      this.showVariableForm(prompt);
    } else {
      this.injectPrompt(prompt);
    }
  }

  showVariableForm(prompt) {
    // 简单的变量填写表单
    let variableHTML = '<div style="padding: 16px;">';
    variableHTML += '<h3>' + prompt.metadata.title + '</h3>';
    variableHTML += '<form id="variable-form">';
    
    prompt.content.variables.forEach(variable => {
      variableHTML += '<div style="margin-bottom: 12px;">';
      variableHTML += '<label style="display: block; margin-bottom: 4px;">' + variable.label + (variable.required ? '*' : '') + '</label>';
      variableHTML += '<input type="text" name="' + variable.name + '" placeholder="' + (variable.defaultValue || '') + '" ' + (variable.required ? 'required' : '') + ' style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
      variableHTML += '</div>';
    });
    
    variableHTML += '</form>';
    variableHTML += '</div>';
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    
    modal.innerHTML = '<div style="background: white; border-radius: 8px; padding: 20px; width: 90%; max-width: 400px;">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">' +
        '<h2>填写变量</h2>' +
        '<button onclick="this.closest(\'.modal\').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>' +
      '</div>' +
      variableHTML +
      '<div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">' +
        '<button onclick="this.closest(\'.modal\').remove()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">取消</button>' +
        '<button onclick="document.getElementById(\'variable-form\').dispatchEvent(new Event(\'submit\'))" style="padding: 8px 16px; background: #6366F1; color: white; border: none; border-radius: 4px; cursor: pointer;">确定</button>' +
      '</div>' +
    '</div>';
    
    document.body.appendChild(modal);
    
    // 绑定表单提交事件
    document.getElementById('variable-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const variables = prompt.content.variables.map(variable => {
        return {
          name: variable.name,
          value: formData.get(variable.name) || variable.defaultValue
        };
      });
      
      const renderedContent = utils.renderTemplate(prompt.content.rawText, variables);
      const renderedPrompt = {
        ...prompt,
        content: {
          ...prompt.content,
          rawText: renderedContent
        }
      };
      
      this.injectPrompt(renderedPrompt);
      modal.remove();
    });
  }

  async copyPrompt(id) {
    try {
      const prompt = await storageManager.getPromptById(id);
      if (!prompt) {
        utils.showNotification('未找到提示词', 'error');
        return;
      }
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(prompt.content.rawText);
      utils.showNotification('提示词内容已复制到剪贴板', 'success');
      
      // 增加使用次数
      await storageManager.incrementUsageCount(id);
    } catch (error) {
      console.error('复制提示词时出错:', error);
      utils.showNotification('复制失败: ' + error.message, 'error');
    }
  }

  async injectPrompt(prompt) {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        // 向内容脚本发送消息
        chrome.tabs.sendMessage(tab.id, {
          type: 'INJECT_PROMPT',
          prompt: prompt.content.rawText
        });
        
        utils.showNotification('提示词已注入到当前页面', 'success');
      }
    } catch (error) {
      utils.showNotification('注入失败: ' + error.message, 'error');
    }
  }

  async exportPrompts() {
    try {
      const exportData = await storageManager.exportPrompts();
      utils.downloadFile(exportData, 'promptvault-export-' + new Date().toISOString().split('T')[0] + '.json', 'application/json');
      utils.showNotification('导出成功', 'success');
    } catch (error) {
      utils.showNotification('导出失败: ' + error.message, 'error');
    }
  }
}

// 初始化
new PopupManager();