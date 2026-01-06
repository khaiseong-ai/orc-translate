// content.js - 页面内容脚本

(function() {
  'use strict';

  let isTranslating = false;
  let apiUrl = '';
  let translationOverlay = null;

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startTranslate') {
      apiUrl = request.apiUrl;
      startTranslationMode();
      sendResponse({ success: true });
    }
  });

  // 启动翻译模式
  function startTranslationMode() {
    if (isTranslating) {
      alert('翻译模式已激活');
      return;
    }

    isTranslating = true;
    createTranslateButton();
    showNotification('翻译模式已激活！点击"翻译"按钮开始识别');
  }

  // 创建翻译按钮
  function createTranslateButton() {
    const button = document.createElement('div');
    button.id = 'manga-translate-btn';
    button.innerHTML = '🔍 翻译';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    });

    button.addEventListener('click', () => {
      captureAndTranslate();
    });

    document.body.appendChild(button);
  }

  // 显示通知
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ff3b30' : type === 'success' ? '#34c759' : '#007aff'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    // 添加动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 截取并翻译当前可见区域
  async function captureAndTranslate() {
    showNotification('正在截取屏幕...', 'info');

    try {
      // 使用 html2canvas 截取当前可见区域
      // 由于我们不能在 content script 中直接导入库，我们使用简化的方法
      // 直接使用现成的图片元素进行 OCR
      const images = await getVisibleImages();

      if (images.length === 0) {
        showNotification('未找到图片，请在漫画页面上使用', 'error');
        return;
      }

      showNotification(`找到 ${images.length} 张图片，开始识别...`, 'info');

      // 对每张图片进行 OCR
      const results = await performOCR(images);

      if (results.length === 0) {
        showNotification('未识别到日文文字', 'error');
        return;
      }

      showNotification(`识别到 ${results.length} 段文字，正在翻译...`, 'info');

      // 翻译识别到的文字
      const translations = await translateTexts(results);

      // 显示翻译结果
      displayTranslations(translations);

      showNotification('翻译完成！', 'success');
    } catch (error) {
      console.error('翻译错误:', error);
      showNotification('翻译失败: ' + error.message, 'error');
    }
  }

  // 获取当前可见区域的图片
  async function getVisibleImages() {
    const images = Array.from(document.querySelectorAll('img'));
    const visibleImages = [];

    for (const img of images) {
      const rect = img.getBoundingClientRect();
      const isVisible = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0 &&
        img.complete &&
        img.naturalHeight > 0
      );

      if (isVisible && img.naturalWidth > 100 && img.naturalHeight > 100) {
        visibleImages.push({
          element: img,
          rect: rect,
          src: img.src
        });
      }
    }

    return visibleImages;
  }

  // 简化版 OCR - 使用 Tesseract.js（需要在页面中加载）
  async function performOCR(images) {
    // 由于在 content script 中加载大型库比较困难
    // 这里我们提供一个简化的实现，使用浏览器自带的功能

    // 实际上，对于漫画翻译，最好的方案是：
    // 1. 让用户手动选择文本区域
    // 2. 或者使用服务端 OCR

    // 这里我们暂时返回一些模拟数据以展示流程
    // 实际使用时需要集成真正的 OCR 服务

    showNotification('提示：完整版需要 OCR 服务，当前为演示模式', 'info');

    // 模拟识别结果
    return [
      { text: 'おはようございます', position: { top: 100, left: 100 } },
      { text: 'ありがとう', position: { top: 200, left: 150 } },
      { text: 'さようなら', position: { top: 300, left: 120 } }
    ];
  }

  // 翻译文本
  async function translateTexts(ocrResults) {
    const textsJa = ocrResults.map(result => result.text);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texts_ja: textsJa })
      });

      if (!response.ok) {
        throw new Error(`翻译 API 返回错误: ${response.status}`);
      }

      const data = await response.json();

      // 组合原文、译文和位置信息
      return ocrResults.map((result, index) => ({
        original: result.text,
        translated: data.texts_zh[index],
        position: result.position
      }));
    } catch (error) {
      console.error('翻译 API 调用失败:', error);
      throw error;
    }
  }

  // 显示翻译结果
  function displayTranslations(translations) {
    // 移除旧的翻译覆盖层
    if (translationOverlay) {
      translationOverlay.remove();
    }

    // 创建新的覆盖层
    translationOverlay = document.createElement('div');
    translationOverlay.id = 'manga-translation-overlay';
    translationOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999998;
    `;

    // 添加每个翻译结果
    translations.forEach(translation => {
      const item = document.createElement('div');
      item.style.cssText = `
        position: absolute;
        top: ${translation.position.top}px;
        left: ${translation.position.left}px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      item.innerHTML = `
        <div style="color: #ffcc00; font-size: 12px; margin-bottom: 4px;">
          ${translation.original}
        </div>
        <div style="font-weight: bold;">
          ${translation.translated}
        </div>
      `;

      item.addEventListener('mouseenter', () => {
        item.style.transform = 'scale(1.05)';
        item.style.background = 'rgba(0, 0, 0, 0.95)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.transform = 'scale(1)';
        item.style.background = 'rgba(0, 0, 0, 0.8)';
      });

      item.addEventListener('click', () => {
        item.remove();
      });

      translationOverlay.appendChild(item);
    });

    document.body.appendChild(translationOverlay);

    // 添加关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✖ 清除翻译';
    closeBtn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 999999;
      padding: 10px 20px;
      background: #ff3b30;
      color: white;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: auto;
    `;

    closeBtn.addEventListener('click', () => {
      if (translationOverlay) {
        translationOverlay.remove();
        translationOverlay = null;
      }
      closeBtn.remove();
    });

    document.body.appendChild(closeBtn);
  }

  // 初始化
  console.log('漫画翻译扩展已加载');
})();
