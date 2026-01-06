// ==UserScript==
// @name         漫画日文翻译工具（改进OCR版）
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  自动OCR识别漫画日文并翻译，优化识别效果
// @author       You
// @match        https://www.wnacg.com/*
// @match        https://wnacg.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      orc-translate.vercel.app
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const DEFAULT_API_URL = 'https://orc-translate.vercel.app/api/ocr_translate';
    let API_URL = GM_getValue('apiUrl', DEFAULT_API_URL);
    let isTranslating = false;
    let translationOverlay = null;
    let worker = null; // Tesseract worker

    // ==================== UI 样式 ====================
    const style = document.createElement('style');
    style.textContent = `
        #manga-ocr-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: 320px;
            backdrop-filter: blur(10px);
        }

        #manga-ocr-panel.minimized {
            width: 60px;
            height: 60px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        #manga-ocr-panel.minimized * {
            display: none;
        }

        #manga-ocr-panel.minimized::before {
            content: '📖';
            font-size: 28px;
            display: block;
        }

        #manga-ocr-panel h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
            text-align: center;
        }

        #manga-ocr-panel input {
            width: 100%;
            padding: 10px;
            margin-bottom: 12px;
            border: none;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
        }

        #manga-ocr-panel button {
            width: 100%;
            padding: 12px;
            margin-bottom: 8px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        #manga-ocr-panel .primary-btn {
            background: white;
            color: #667eea;
        }

        #manga-ocr-panel .primary-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        #manga-ocr-panel .secondary-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid white;
        }

        #manga-ocr-panel .secondary-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        #manga-ocr-panel #status {
            margin-top: 12px;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
            min-height: 20px;
        }

        #manga-ocr-panel .close-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 28px;
            height: 28px;
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            font-size: 16px;
        }

        .translation-bubble {
            position: fixed;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            z-index: 999998;
            cursor: move;
            border: 2px solid #667eea;
        }

        .translation-bubble .original {
            color: #ffcc00;
            font-size: 12px;
            margin-bottom: 6px;
        }

        .translation-bubble .translated {
            font-size: 15px;
            font-weight: bold;
            line-height: 1.5;
        }

        .translation-bubble .close {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 20px;
            height: 20px;
            background: rgba(255,59,48,0.8);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            font-size: 12px;
        }

        .image-selector {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .image-selector h2 {
            margin-bottom: 20px;
        }

        .image-selector .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            max-width: 90%;
            max-height: 70%;
            overflow-y: auto;
            padding: 20px;
        }

        .image-selector .image-item {
            cursor: pointer;
            border: 3px solid transparent;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.2s;
        }

        .image-selector .image-item:hover {
            border-color: #667eea;
            transform: scale(1.05);
        }

        .image-selector .image-item img {
            width: 100%;
            height: auto;
            display: block;
        }

        .image-selector .cancel-btn {
            margin-top: 20px;
            padding: 12px 30px;
            background: #ff3b30;
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }

        #progress-info {
            font-size: 11px;
            color: rgba(255,255,255,0.8);
            margin-top: 4px;
        }
    `;
    document.head.appendChild(style);

    // ==================== 创建UI ====================
    function createUI() {
        const panel = document.createElement('div');
        panel.id = 'manga-ocr-panel';
        panel.innerHTML = `
            <button class="close-btn" id="minimize-btn">−</button>
            <h3>📖 漫画OCR翻译</h3>
            <input type="text" id="api-url" placeholder="API 地址" value="${API_URL}">
            <button class="primary-btn" id="save-api-btn">💾 保存</button>
            <button class="secondary-btn" id="ocr-translate-btn">🔍 OCR识别并翻译</button>
            <button class="secondary-btn" id="clear-btn">🗑 清除翻译</button>
            <div id="status"></div>
            <div id="progress-info"></div>
        `;
        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('save-api-btn').addEventListener('click', saveApiUrl);
        document.getElementById('ocr-translate-btn').addEventListener('click', startOCRTranslation);
        document.getElementById('clear-btn').addEventListener('click', clearTranslations);
        document.getElementById('minimize-btn').addEventListener('click', toggleMinimize);

        panel.addEventListener('click', function(e) {
            if (panel.classList.contains('minimized') && e.target === panel) {
                toggleMinimize();
            }
        });
    }

    function toggleMinimize() {
        document.getElementById('manga-ocr-panel').classList.toggle('minimized');
    }

    function saveApiUrl() {
        const input = document.getElementById('api-url');
        API_URL = input.value.trim();
        if (!API_URL) {
            showStatus('请输入API地址', 'error');
            return;
        }
        GM_setValue('apiUrl', API_URL);
        showStatus('✅ 已保存', 'success');
    }

    function showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.style.background = type === 'error' ? 'rgba(255,59,48,0.3)' :
                                 type === 'success' ? 'rgba(52,199,89,0.3)' :
                                 'rgba(255,204,0,0.3)';

        if (type === 'success') {
            setTimeout(() => {
                status.textContent = '';
                status.style.background = 'rgba(255,255,255,0.1)';
            }, 2000);
        }
    }

    function showProgress(message) {
        const progress = document.getElementById('progress-info');
        progress.textContent = message;
    }

    // ==================== OCR 功能 ====================
    async function initOCRWorker() {
        if (worker) return worker;

        showProgress('正在加载OCR引擎...');
        worker = await Tesseract.createWorker('jpn', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    showProgress(`识别进度: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1',
        });

        showProgress('OCR引擎已就绪');
        return worker;
    }

    async function startOCRTranslation() {
        if (isTranslating) {
            showStatus('正在处理中...', 'info');
            return;
        }

        if (!API_URL) {
            showStatus('❌ 请先设置API地址', 'error');
            return;
        }

        isTranslating = true;
        showStatus('🔍 正在查找图片...', 'info');

        try {
            // 获取所有可见图片
            const images = getVisibleImages();

            if (images.length === 0) {
                showStatus('❌ 未找到图片', 'error');
                isTranslating = false;
                return;
            }

            // 让用户选择要识别的图片
            const selectedImage = await selectImage(images);

            if (!selectedImage) {
                showStatus('已取消', 'info');
                isTranslating = false;
                return;
            }

            showStatus('🔄 正在OCR识别...', 'info');

            // 初始化OCR
            await initOCRWorker();

            // 执行OCR识别
            const { data } = await worker.recognize(selectedImage.src);

            // 提取文本
            const japaneseTexts = extractJapaneseText(data);

            if (japaneseTexts.length === 0) {
                showStatus('❌ 未识别到日文', 'error');
                isTranslating = false;
                return;
            }

            showStatus(`📝 识别到 ${japaneseTexts.length} 段文字，正在翻译...`, 'info');
            showProgress(`找到 ${japaneseTexts.length} 段日文`);

            // 翻译
            const translations = await translateTexts(japaneseTexts.map(t => t.text));

            // 显示翻译结果
            let topOffset = 100;
            japaneseTexts.forEach((item, index) => {
                createTranslationBubble(item.text, translations[index], topOffset);
                topOffset += 80;
            });

            showStatus(`✅ 翻译完成！共 ${translations.length} 段`, 'success');
            showProgress('');

        } catch (error) {
            console.error('OCR错误:', error);
            showStatus(`❌ 错误: ${error.message}`, 'error');
            showProgress('');
        } finally {
            isTranslating = false;
        }
    }

    function getVisibleImages() {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => {
            const rect = img.getBoundingClientRect();
            return (
                rect.width > 200 &&
                rect.height > 200 &&
                img.complete &&
                img.naturalHeight > 0
            );
        }).map(img => ({
            element: img,
            src: img.src,
            rect: img.getBoundingClientRect()
        }));
    }

    function selectImage(images) {
        return new Promise((resolve) => {
            const selector = document.createElement('div');
            selector.className = 'image-selector';

            const title = document.createElement('h2');
            title.textContent = '选择要识别的图片';
            selector.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'images-grid';

            images.forEach(imgData => {
                const item = document.createElement('div');
                item.className = 'image-item';

                const img = document.createElement('img');
                img.src = imgData.src;
                img.style.maxHeight = '200px';
                img.style.objectFit = 'contain';

                item.appendChild(img);
                item.addEventListener('click', () => {
                    selector.remove();
                    resolve(imgData);
                });

                grid.appendChild(item);
            });

            selector.appendChild(grid);

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', () => {
                selector.remove();
                resolve(null);
            });
            selector.appendChild(cancelBtn);

            document.body.appendChild(selector);
        });
    }

    function extractJapaneseText(ocrData) {
        const results = [];
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g;

        if (ocrData.lines) {
            ocrData.lines.forEach(line => {
                const text = line.text.trim();
                if (text && japaneseRegex.test(text)) {
                    // 只保留日文字符
                    const matches = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+/g);
                    if (matches) {
                        matches.forEach(match => {
                            const cleaned = match.trim();
                            if (cleaned.length >= 2) { // 至少2个字符
                                results.push({
                                    text: cleaned,
                                    confidence: line.confidence
                                });
                            }
                        });
                    }
                }
            });
        }

        // 如果识别结果太少，尝试从words中提取
        if (results.length === 0 && ocrData.words) {
            const allText = ocrData.words
                .map(w => w.text)
                .join(' ')
                .match(japaneseRegex);

            if (allText) {
                allText.forEach(text => {
                    if (text.trim().length >= 2) {
                        results.push({
                            text: text.trim(),
                            confidence: 1
                        });
                    }
                });
            }
        }

        return results;
    }

    function translateTexts(textsJa) {
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
                            resolve(data.texts_zh);
                        } catch (error) {
                            reject(new Error('解析翻译结果失败'));
                        }
                    } else {
                        reject(new Error(`API错误: ${response.status}`));
                    }
                },
                onerror: function() {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    }

    function createTranslationBubble(original, translated, top = 100) {
        const bubble = document.createElement('div');
        bubble.className = 'translation-bubble';
        bubble.style.top = `${top}px`;
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%)';
        bubble.innerHTML = `
            <button class="close">×</button>
            <div class="original">${original}</div>
            <div class="translated">${translated}</div>
        `;

        makeDraggable(bubble);

        bubble.querySelector('.close').addEventListener('click', () => {
            bubble.remove();
        });

        document.body.appendChild(bubble);
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            if (e.target.className === 'close') return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.transform = 'none';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function clearTranslations() {
        const bubbles = document.querySelectorAll('.translation-bubble');
        bubbles.forEach(b => b.remove());
        showStatus('✅ 已清除', 'success');
    }

    // ==================== 初始化 ====================
    function init() {
        console.log('漫画OCR翻译工具已加载');
        createUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
