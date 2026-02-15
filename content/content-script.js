class ContentScriptManager {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // 监听来自扩展的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'INJECT_PROMPT':
        this.injectPrompt(message.prompt, message.options);
        sendResponse({ success: true });
        return true;
      case 'SHOW_NOTIFICATION':
        this.showNotification(message.message, message.type);
        sendResponse({ success: true });
        return true;
      default:
        sendResponse({ error: 'Unknown message type' });
        return true;
    }
  }

  injectPrompt(prompt, options = {}) {
    const { injectMode = 'append' } = options;
    
    // 检测当前平台
    const platform = this.detectPlatform();
    
    // 获取目标输入框
    const inputElement = this.getInputElement(platform);
    
    if (inputElement) {
      switch (injectMode) {
        case 'append':
          this.appendToInput(inputElement, prompt);
          break;
        case 'replace':
          this.replaceInput(inputElement, prompt);
          break;
        case 'insert':
          this.insertAtCursor(inputElement, prompt);
          break;
        default:
          this.appendToInput(inputElement, prompt);
          break;
      }
      
      // 触发输入事件，确保AI平台能检测到内容变化
      this.triggerInputEvent(inputElement);
      
      return true;
    } else {
      console.error('未找到可注入的输入框');
      this.showNotification('未找到可注入的输入框', 'error');
      return false;
    }
  }

  detectPlatform() {
    const url = window.location.href;
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('gemini.google.com')) return 'gemini';
    return 'unknown';
  }

  getInputElement(platform) {
    switch (platform) {
      case 'chatgpt':
        return this.findChatGPTInput();
      case 'claude':
        return this.findClaudeInput();
      case 'gemini':
        return this.findGeminiInput();
      default:
        return this.findGenericInput();
    }
  }

  findChatGPTInput() {
    // ChatGPT web 界面的输入框
    return document.querySelector('textarea[placeholder*="Message ChatGPT"]') ||
           document.querySelector('textarea[data-testid="chat-input"]') ||
           document.querySelector('.text-base');
  }

  findClaudeInput() {
    // Claude 界面的输入框
    return document.querySelector('textarea[placeholder*="Message Claude"]') ||
           document.querySelector('textarea[data-testid="message-input"]') ||
           document.querySelector('[data-testid="chat-input"]');
  }

  findGeminiInput() {
    // Gemini 界面的输入框
    return document.querySelector('textarea[placeholder*="Message Gemini"]') ||
           document.querySelector('textarea[aria-label*="Message"]') ||
           document.querySelector('[aria-label="输入消息"]');
  }

  findGenericInput() {
    // 通用输入框查找
    return document.activeElement.tagName === 'TEXTAREA' ? document.activeElement :
           document.querySelector('textarea') ||
           document.querySelector('input[type="text"]') ||
           document.querySelector('input');
  }

  appendToInput(inputElement, text) {
    inputElement.value += text;
  }

  replaceInput(inputElement, text) {
    inputElement.value = text;
  }

  insertAtCursor(inputElement, text) {
    const startPos = inputElement.selectionStart;
    const endPos = inputElement.selectionEnd;
    const scrollTop = inputElement.scrollTop;
    
    inputElement.value = inputElement.value.substring(0, startPos) + text + inputElement.value.substring(endPos, inputElement.value.length);
    
    inputElement.focus();
    inputElement.selectionStart = inputElement.selectionEnd = startPos + text.length;
    inputElement.scrollTop = scrollTop;
  }

  triggerInputEvent(element) {
    // 触发多种事件以确保所有平台都能检测到变化
    const events = ['input', 'change', 'keyup'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    });
    
    // 对于一些特殊平台，可能需要触发额外的事件
    if (this.detectPlatform() === 'chatgpt') {
      const compositionEvent = new Event('compositionend', {
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(compositionEvent);
    }
  }

  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `promptvault-notification promptvault-notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      animation: promptvaultSlideIn 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;
    
    // 根据类型设置颜色
    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes promptvaultSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes promptvaultSlideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
      notification.style.animation = 'promptvaultSlideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化内容脚本管理器
const contentScriptManager = new ContentScriptManager();

// 导出管理器（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = contentScriptManager;
}