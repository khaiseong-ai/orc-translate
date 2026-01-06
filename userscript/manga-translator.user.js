// ==UserScript==
// @name         漫画日文翻译工具
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  一键翻译漫画中的日文为中文，支持实时翻译和滚动自动翻译
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const DEFAULT_API_URL = 'https://your-project.vercel.app/api/ocr_translate';
    let API_URL = GM_getValue('apiUrl', DEFAULT_API_URL);
    let isTranslating = false;
    let translationOverlay = null;
    let autoTranslateEnabled = false;
    let lastScrollY = window.scrollY;

    // ==================== UI 组件 ====================

    // 创建主控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'manga-translate-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <span>📖 漫画翻译</span>
                <button id="panel-close-btn">✖</button>
            </div>
            <div class="panel-body">
                <div class="setting-item">
                    <label>API 地址：</label>
                    <input type="text" id="api-url-input" value="${API_URL}" placeholder="${DEFAULT_API_URL}">
                    <button id="save-api-btn">保存</button>
                </div>
                <div class="button-group">
                    <button id="translate-btn" class="primary-btn">🔍 翻译当前屏幕</button>
                    <button id="auto-translate-btn" class="secondary-btn">
                        ${autoTranslateEnabled ? '⏸ 停止自动翻译' : '▶️ 开启自动翻译'}
                    </button>
                    <button id="clear-translation-btn" class="danger-btn">🗑 清除翻译</button>
                </div>
                <div id="status-message" class="status-message"></div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #manga-translate-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 360px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: white;
                backdrop-filter: blur(10px);
            }

            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                font-weight: bold;
                font-size: 16px;
            }

            #panel-close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }

            #panel-close-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }

            .panel-body {
                padding: 16px;
            }

            .setting-item {
                margin-bottom: 16px;
            }

            .setting-item label {
                display: block;
                margin-bottom: 8px;
                font-size: 13px;
                font-weight: 500;
            }

            .setting-item input[type="text"] {
                width: 100%;
                padding: 8px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                margin-bottom: 8px;
            }

            .button-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .button-group button {
                width: 100%;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .primary-btn {
                background: white;
                color: #667eea;
            }

            .primary-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .secondary-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid white;
            }

            .secondary-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            .secondary-btn.active {
                background: #34c759;
                border-color: #34c759;
            }

            .danger-btn {
                background: #ff3b30;
                color: white;
            }

            .danger-btn:hover {
                background: #ff1f15;
            }

            #save-api-btn {
                width: 100%;
                padding: 8px;
                background: rgba(255,255,255,0.2);
                border: 1px solid white;
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
            }

            #save-api-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            .status-message {
                margin-top: 12px;
                padding: 8px;
                border-radius: 6px;
                font-size: 12px;
                text-align: center;
                min-height: 20px;
                transition: all 0.3s;
            }

            .status-message.info {
                background: rgba(0,122,255,0.3);
            }

            .status-message.success {
                background: rgba(52,199,89,0.3);
            }

            .status-message.error {
                background: rgba(255,59,48,0.3);
            }

            #manga-translate-float-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 999998;
                transition: all 0.3s;
            }

            #manga-translate-float-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(0,0,0,0.4);
            }

            #manga-translation-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999997;
            }

            .translation-item {
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 10px 14px;
                border-radius: 8px;
                font-size: 14px;
                max-width: 300px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                pointer-events: auto;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid rgba(255,255,255,0.2);
            }

            .translation-item:hover {
                transform: scale(1.05);
                background: rgba(0, 0, 0, 0.95);
                border-color: #667eea;
            }

            .translation-item .original {
                color: #ffcc00;
                font-size: 12px;
                margin-bottom: 6px;
                font-weight: normal;
            }

            .translation-item .translated {
                font-weight: bold;
                line-height: 1.4;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(panel);

        // 绑定事件
        bindPanelEvents();
    }

    // 创建悬浮按钮
    function createFloatButton() {
        const btn = document.createElement('button');
        btn.id = 'manga-translate-float-btn';
        btn.innerHTML = '📖';
        btn.title = '打开漫画翻译面板';
        btn.addEventListener('click', togglePanel);
        document.body.appendChild(btn);
    }

    // 绑定面板事件
    function bindPanelEvents() {
        document.getElementById('panel-close-btn').addEventListener('click', togglePanel);
        document.getElementById('save-api-btn').addEventListener('click', saveApiUrl);
        document.getElementById('translate-btn').addEventListener('click', translateCurrentScreen);
        document.getElementById('auto-translate-btn').addEventListener('click', toggleAutoTranslate);
        document.getElementById('clear-translation-btn').addEventListener('click', clearTranslations);
    }

    // 切换面板显示
    function togglePanel() {
        const panel = document.getElementById('manga-translate-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    // 保存 API 地址
    function saveApiUrl() {
        const input = document.getElementById('api-url-input');
        API_URL = input.value.trim();

        if (!API_URL) {
            showStatus('请输入 API 地址', 'error');
            return;
        }

        GM_setValue('apiUrl', API_URL);
        showStatus('API 地址已保存', 'success');
    }

    // 显示状态消息
    function showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status-message');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;

        if (type === 'success') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }, 3000);
        }
    }

    // ==================== 翻译功能 ====================

    // 翻译当前屏幕
    async function translateCurrentScreen() {
        if (isTranslating) {
            showStatus('正在翻译中，请稍候...', 'info');
            return;
        }

        if (!API_URL) {
            showStatus('请先设置 API 地址', 'error');
            return;
        }

        isTranslating = true;
        showStatus('正在获取可见图片...', 'info');

        try {
            const images = await getVisibleImages();

            if (images.length === 0) {
                showStatus('未找到可见的图片', 'error');
                isTranslating = false;
                return;
            }

            showStatus(`找到 ${images.length} 张图片，开始 OCR 识别...`, 'info');

            // 对图片进行 OCR 识别
            const ocrResults = await performOCROnImages(images);

            if (ocrResults.length === 0) {
                showStatus('未识别到日文文字', 'error');
                isTranslating = false;
                return;
            }

            showStatus(`识别到 ${ocrResults.length} 段文字，正在翻译...`, 'info');

            // 翻译识别到的文字
            const translations = await translateTexts(ocrResults);

            // 显示翻译结果
            displayTranslations(translations);

            showStatus(`翻译完成！共 ${translations.length} 段`, 'success');
        } catch (error) {
            console.error('翻译错误:', error);
            showStatus(`翻译失败: ${error.message}`, 'error');
        } finally {
            isTranslating = false;
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

    // 使用 Tesseract.js 进行 OCR 识别
    async function performOCROnImages(images) {
        const allResults = [];

        // 由于 Tesseract.js 比较慢，我们限制只处理前 3 张图片
        const imagesToProcess = images.slice(0, 3);

        for (const imgData of imagesToProcess) {
            try {
                showStatus(`正在识别图片 ${allResults.length + 1}/${imagesToProcess.length}...`, 'info');

                const { data } = await Tesseract.recognize(
                    imgData.src,
                    'jpn',
                    {
                        logger: (m) => {
                            if (m.status === 'recognizing text') {
                                console.log(`OCR 进度: ${Math.round(m.progress * 100)}%`);
                            }
                        }
                    }
                );

                // 提取识别到的文本
                const lines = data.lines.filter(line => {
                    const text = line.text.trim();
                    // 过滤掉太短的文本
                    return text.length > 0 && hasJapanese(text);
                });

                lines.forEach(line => {
                    allResults.push({
                        text: line.text.trim(),
                        bbox: line.bbox,
                        imageRect: imgData.rect
                    });
                });
            } catch (error) {
                console.error('OCR 识别失败:', error);
            }
        }

        return allResults;
    }

    // 检测文本中是否包含日文字符
    function hasJapanese(text) {
        // 平假名、片假名、日文汉字
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        return japaneseRegex.test(text);
    }

    // 翻译文本
    async function translateTexts(ocrResults) {
        const textsJa = ocrResults.map(result => result.text);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: API_URL,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ texts_ja: textsJa }),
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            const translations = ocrResults.map((result, index) => ({
                                original: result.text,
                                translated: data.texts_zh[index],
                                bbox: result.bbox,
                                imageRect: result.imageRect
                            }));
                            resolve(translations);
                        } catch (error) {
                            reject(new Error('解析翻译结果失败'));
                        }
                    } else {
                        reject(new Error(`API 返回错误: ${response.status}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    }

    // 显示翻译结果
    function displayTranslations(translations) {
        // 移除旧的翻译覆盖层
        clearTranslations();

        // 创建新的覆盖层
        translationOverlay = document.createElement('div');
        translationOverlay.id = 'manga-translation-overlay';
        document.body.appendChild(translationOverlay);

        // 添加每个翻译结果
        translations.forEach(translation => {
            const item = document.createElement('div');
            item.className = 'translation-item';

            // 计算位置（基于图片位置和 OCR 识别的边界框）
            const top = translation.imageRect.top + (translation.bbox.y0 || 50);
            const left = translation.imageRect.left + (translation.bbox.x0 || 50);

            item.style.top = `${top}px`;
            item.style.left = `${left}px`;

            item.innerHTML = `
                <div class="original">${translation.original}</div>
                <div class="translated">${translation.translated}</div>
            `;

            // 点击删除
            item.addEventListener('click', () => {
                item.remove();
            });

            translationOverlay.appendChild(item);
        });
    }

    // 清除翻译结果
    function clearTranslations() {
        if (translationOverlay) {
            translationOverlay.remove();
            translationOverlay = null;
        }
    }

    // 切换自动翻译
    function toggleAutoTranslate() {
        autoTranslateEnabled = !autoTranslateEnabled;
        const btn = document.getElementById('auto-translate-btn');

        if (autoTranslateEnabled) {
            btn.textContent = '⏸ 停止自动翻译';
            btn.classList.add('active');
            showStatus('自动翻译已开启', 'success');
            startAutoTranslate();
        } else {
            btn.textContent = '▶️ 开启自动翻译';
            btn.classList.remove('active');
            showStatus('自动翻译已关闭', 'info');
        }
    }

    // 开始自动翻译（监听滚动）
    function startAutoTranslate() {
        if (!autoTranslateEnabled) return;

        window.addEventListener('scroll', handleAutoTranslate);
    }

    // 处理自动翻译
    let autoTranslateTimeout;
    function handleAutoTranslate() {
        if (!autoTranslateEnabled) {
            window.removeEventListener('scroll', handleAutoTranslate);
            return;
        }

        const currentScrollY = window.scrollY;
        const scrollDiff = Math.abs(currentScrollY - lastScrollY);

        // 如果滚动距离超过 300px，触发翻译
        if (scrollDiff > 300) {
            lastScrollY = currentScrollY;

            // 防抖：等待滚动停止后 500ms 再翻译
            clearTimeout(autoTranslateTimeout);
            autoTranslateTimeout = setTimeout(() => {
                if (!isTranslating) {
                    translateCurrentScreen();
                }
            }, 500);
        }
    }

    // ==================== 初始化 ====================

    function init() {
        console.log('漫画翻译工具已加载');

        // 创建 UI
        createFloatButton();
        createControlPanel();

        // 默认隐藏面板
        document.getElementById('manga-translate-panel').style.display = 'none';
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
