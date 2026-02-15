// 工具函数
const utils = {
  parseTemplateVariables(text) {
    const variables = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const variableStr = match[1].trim();
      let name = variableStr;
      let defaultValue = '';
      
      if (variableStr.includes(':')) {
        const parts = variableStr.split(':');
        name = parts[0].trim();
        defaultValue = parts.slice(1).join(':').trim();
      }
      
      if (!variables.some(v => v.name === name)) {
        variables.push({
          name: name,
          type: 'text',
          label: name,
          defaultValue: defaultValue,
          required: true
        });
      }
    }
    
    return variables;
  },

  renderTemplate(text, variables) {
    let renderedText = text;
    
    variables.forEach(variable => {
      const regex = new RegExp('\\{\\{' + variable.name + '(.*?)?\\}\\}', 'g');
      renderedText = renderedText.replace(regex, variable.value || variable.defaultValue || '');
    });
    
    return renderedText;
  },

  formatDate(date, format) {
    if (!date) return '';
    if (!format) format = 'YYYY-MM-DD HH:mm:ss';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  sortPrompts(prompts, sortBy) {
    if (!sortBy) sortBy = 'recentlyUsed';
    
    return [...prompts].sort((a, b) => {
      if (sortBy === 'recentlyUsed') {
        return new Date(b.metadata.lastUsed || b.metadata.createdAt) - new Date(a.metadata.lastUsed || a.metadata.createdAt);
      } else if (sortBy === 'createdAt') {
        return new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt);
      } else if (sortBy === 'title') {
        return a.metadata.title.localeCompare(b.metadata.title);
      } else if (sortBy === 'usageCount') {
        return (b.metadata.usageCount || 0) - (a.metadata.usageCount || 0);
      } else if (sortBy === 'favorite') {
        if (a.metadata.isFavorite && !b.metadata.isFavorite) return -1;
        if (!a.metadata.isFavorite && b.metadata.isFavorite) return 1;
        return 0;
      } else {
        return 0;
      }
    });
  },

  filterPrompts(prompts, filters) {
    return prompts.filter(prompt => {
      if (filters.category && prompt.metadata.category !== filters.category) {
        return false;
      }
      if (filters.tag && !prompt.metadata.tags?.includes(filters.tag)) {
        return false;
      }
      if (filters.platform && !prompt.metadata.platform?.includes(filters.platform)) {
        return false;
      }
      if (filters.favorite && !prompt.metadata.isFavorite) {
        return false;
      }
      return true;
    });
  },

  searchPrompts(prompts, query) {
    if (!query) return prompts;
    
    const lowerQuery = query.toLowerCase();
    return prompts.filter(prompt => {
      return (
        prompt.metadata.title.toLowerCase().includes(lowerQuery) ||
        prompt.metadata.description?.toLowerCase().includes(lowerQuery) ||
        prompt.content.rawText.toLowerCase().includes(lowerQuery) ||
        prompt.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  },

  detectPlatform(url) {
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('gemini.google.com')) return 'gemini';
    return 'universal';
  },

  getPlatformSelector(platformName) {
    if (platformName === 'chatgpt') {
      return 'textarea[placeholder*="Message ChatGPT"]';
    } else if (platformName === 'claude') {
      return 'textarea[placeholder*="Message Claude"]';
    } else if (platformName === 'gemini') {
      return 'textarea[placeholder*="Message Gemini"]';
    } else {
      return 'textarea';
    }
  },

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  uploadFile(accept, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          callback(event.target.result, file);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  },

  showNotification(message, type) {
    if (!type) type = 'info';
    
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.textContent = message;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; color: white; font-size: 14px; font-weight: 500; z-index: 9999; animation: slideIn 0.3s ease-out;';
    
    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
};

// 添加动画样式
const style = document.createElement('style');
style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
document.head.appendChild(style);

export default utils;