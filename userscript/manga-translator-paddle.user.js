// ==UserScript==
// @name         漫画翻译工具（PaddleOCR版）
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  使用PaddleOCR识别日文漫画并翻译，识别准确率高
// @author       You
// @match        https://www.wnacg.com/*
// @match        https://wnacg.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const DEFAULT_OCR_API = 'http://localhost:5000';  // PaddleOCR API地址
    const DEFAULT_TRANSLATE_API = 'https://orc-translate.vercel.app/api/ocr_translate';

    let OCR_API = GM_getValue('ocrApi', DEFAULT_OCR_API);
    let TRANSLATE_API = GM_getValue('translateApi', DEFAULT_TRANSLATE_API);
    let isProcessing = false;

    // ==================== UI 样式 ====================
    const style = document.createElement('style');
    style.textContent = `
        #paddle-ocr-panel {
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
            width: 360px;
            backdrop-filter: blur(10px);
        }

        #paddle-ocr-panel.minimized {
            width: 60px;
            height: 60px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        #paddle-ocr-panel.minimized * {
            display: none;
        }

        #paddle-ocr-panel.minimized::before {
            content: '🔍';
            font-size: 28px;
        }

        #paddle-ocr-panel h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
            text-align: center;
        }

        #paddle-ocr-panel label {
            display: block;
            font-size: 12px;
            margin-bottom: 4px;
            opacity: 0.9;
        }

        #paddle-ocr-panel input {
            width: 100%;
            padding: 8px;
            margin-bottom: 12px;
            border: none;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 13px;
        }

        #paddle-ocr-panel button {
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

        #paddle-ocr-panel .primary-btn {
            background: white;
            color: #667eea;
        }

        #paddle-ocr-panel .primary-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        #paddle-ocr-panel .primary-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #paddle-ocr-panel .secondary-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid white;
        }

        #paddle-ocr-panel #status {
            margin-top: 12px;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
            min-height: 20px;
        }

        #paddle-ocr-panel .close-btn {
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

        .translation-result {
            position: fixed;
            background: rgba(0,0,0,0.92);
            color: white;
            padding: 14px 18px;
            border-radius: 10px;
            max-width: 450px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.6);
            z-index: 999998;
            cursor: move;
            border: 2px solid #667eea;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .translation-result .original {
            color: #ffd700;
            font-size: 13px;
            margin-bottom: 8px;
            line-height: 1.5;
        }

        .translation-result .translated {
            font-size: 16px;
            font-weight: bold;
            line-height: 1.6;
            color: #fff;
        }

        .translation-result .confidence {
            font-size: 11px;
            color: #aaa;
            margin-top: 6px;
        }

        .translation-result .close {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 22px;
            height: 22px;
            background: rgba(255,59,48,0.9);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
        }

        .image-picker {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 40px 20px;
            overflow-y: auto;
        }

        .image-picker h2 {
            color: white;
            margin-bottom: 30px;
            font-size: 24px;
        }

        .image-picker .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 20px;
            max-width: 1200px;
            width: 100%;
        }

        .image-picker .item {
            cursor: pointer;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 10px;
            overflow: hidden;
            transition: all 0.3s;
            background: rgba(255,255,255,0.05);
        }

        .image-picker .item:hover {
            border-color: #667eea;
            transform: scale(1.05);
            box-shadow: 0 8px 24px rgba(102,126,234,0.4);
        }

        .image-picker .item img {
            width: 100%;
            height: auto;
            display: block;
        }

        .image-picker .cancel {
            margin-top: 30px;
            padding: 14px 40px;
            background: #ff3b30;
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    // ==================== UI 面板 ====================
    function createUI() {
        const panel = document.createElement('div');
        panel.id = 'paddle-ocr-panel';
        panel.innerHTML = `
            <button class="close-btn" id="minimize-btn">−</button>
            <h3>🔍 PaddleOCR 翻译</h3>

            <label>PaddleOCR API:</label>
            <input type="text" id="ocr-api-input" value="${OCR_API}" placeholder="http://localhost:5000">

            <label>翻译 API:</label>
            <input type="text" id="translate-api-input" value="${TRANSLATE_API}">

            <button class="primary-btn" id="save-btn">💾 保存配置</button>
            <button class="secondary-btn" id="start-btn">🎯 开始识别翻译</button>
            <button class="secondary-btn" id="clear-btn">🗑 清除结果</button>

            <div id="status"></div>
        `;
        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('save-btn').addEventListener('click', saveConfig);
        document.getElementById('start-btn').addEventListener('click', startProcess);
        document.getElementById('clear-btn').addEventListener('click', clearResults);
        document.getElementById('minimize-btn').addEventListener('click', toggleMinimize);

        panel.addEventListener('click', (e) => {
            if (panel.classList.contains('minimized') && e.target === panel) {
                toggleMinimize();
            }
        });
    }

    function toggleMinimize() {
        document.getElementById('paddle-ocr-panel').classList.toggle('minimized');
    }

    function saveConfig() {
        OCR_API = document.getElementById('ocr-api-input').value.trim();
        TRANSLATE_API = document.getElementById('translate-api-input').value.trim();

        if (!OCR_API || !TRANSLATE_API) {
            showStatus('❌ 请填写完整配置', 'error');
            return;
        }

        GM_setValue('ocrApi', OCR_API);
        GM_setValue('translateApi', TRANSLATE_API);
        showStatus('✅ 配置已保存', 'success');
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

    // ==================== 主流程 ====================
    async function startProcess() {
        if (isProcessing) {
            showStatus('⏳ 正在处理中...', 'info');
            return;
        }

        if (!OCR_API || !TRANSLATE_API) {
            showStatus('❌ 请先保存配置', 'error');
            return;
        }

        isProcessing = true;
        const btn = document.getElementById('start-btn');
        btn.disabled = true;
        btn.textContent = '⏳ 处理中...';

        try {
            showStatus('📷 正在查找图片...', 'info');

            const images = getVisibleImages();
            if (images.length === 0) {
                showStatus('❌ 未找到图片', 'error');
                return;
            }

            const selectedImage = await pickImage(images);
            if (!selectedImage) {
                showStatus('已取消', 'info');
                return;
            }

            showStatus('🔍 正在OCR识别...', 'info');

            // 转换图片为 base64
            const base64Image = await imageToBase64(selectedImage.src);

            // 调用 PaddleOCR API
            const ocrResult = await callOCRAPI(base64Image);

            if (!ocrResult.texts || ocrResult.texts.length === 0) {
                showStatus('❌ 未识别到日文', 'error');
                return;
            }

            showStatus(`📝 识别到 ${ocrResult.texts.length} 段文字，正在翻译...`, 'info');

            // 翻译
            const translations = await translateTexts(ocrResult.texts);

            // 显示结果
            displayResults(ocrResult.details, translations);

            showStatus(`✅ 完成！共 ${ocrResult.texts.length} 段`, 'success');

        } catch (error) {
            console.error('处理错误:', error);
            showStatus(`❌ 错误: ${error.message}`, 'error');
        } finally {
            isProcessing = false;
            btn.disabled = false;
            btn.textContent = '🎯 开始识别翻译';
        }
    }

    function getVisibleImages() {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width > 200 && rect.height > 200 && img.complete && img.naturalHeight > 0;
        }).map(img => ({ element: img, src: img.src }));
    }

    function pickImage(images) {
        return new Promise((resolve) => {
            const picker = document.createElement('div');
            picker.className = 'image-picker';

            const title = document.createElement('h2');
            title.textContent = '选择要识别的图片';
            picker.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'grid';

            images.forEach(imgData => {
                const item = document.createElement('div');
                item.className = 'item';

                const img = document.createElement('img');
                img.src = imgData.src;
                img.style.maxHeight = '250px';
                img.style.objectFit = 'contain';

                item.appendChild(img);
                item.addEventListener('click', () => {
                    picker.remove();
                    resolve(imgData);
                });

                grid.appendChild(item);
            });

            picker.appendChild(grid);

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel';
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', () => {
                picker.remove();
                resolve(null);
            });
            picker.appendChild(cancelBtn);

            document.body.appendChild(picker);
        });
    }

    async function imageToBase64(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function(response) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(response.response);
                },
                onerror: reject
            });
        });
    }

    function callOCRAPI(base64Image) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${OCR_API}/ocr`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ image: base64Image }),
                onload: function(response) {
                    if (response.status === 200) {
                        resolve(JSON.parse(response.responseText));
                    } else {
                        reject(new Error(`OCR API 错误: ${response.status}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error('OCR API 连接失败，请确认服务已启动'));
                }
            });
        });
    }

    function translateTexts(texts) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: TRANSLATE_API,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ texts_ja: texts }),
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        resolve(data.texts_zh);
                    } else {
                        reject(new Error(`翻译 API 错误: ${response.status}`));
                    }
                },
                onerror: () => reject(new Error('翻译 API 连接失败'))
            });
        });
    }

    function displayResults(details, translations) {
        let topOffset = 100;

        details.forEach((detail, index) => {
            const result = document.createElement('div');
            result.className = 'translation-result';
            result.style.top = `${topOffset}px`;
            result.style.left = '50%';
            result.style.transform = 'translateX(-50%)';

            result.innerHTML = `
                <button class="close">×</button>
                <div class="original">${detail.text}</div>
                <div class="translated">${translations[index]}</div>
                <div class="confidence">置信度: ${(detail.confidence * 100).toFixed(1)}%</div>
            `;

            makeDraggable(result);

            result.querySelector('.close').addEventListener('click', () => {
                result.remove();
            });

            document.body.appendChild(result);
            topOffset += 90;
        });
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = function(e) {
            if (e.target.className === 'close') return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDrag;
            document.onmousemove = dragElement;
        };

        function dragElement(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.transform = 'none';
        }

        function closeDrag() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function clearResults() {
        document.querySelectorAll('.translation-result').forEach(r => r.remove());
        showStatus('✅ 已清除', 'success');
    }

    // ==================== 初始化 ====================
    function init() {
        console.log('PaddleOCR 漫画翻译工具已加载');
        createUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
