// ==UserScript==
// @name         漫画日文翻译工具（简化版）
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  在漫画页面上手动选择文本区域进行翻译
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const DEFAULT_API_URL = 'https://your-project.vercel.app/api/ocr_translate';
    let API_URL = GM_getValue('apiUrl', DEFAULT_API_URL);

    // ==================== 创建主界面 ====================
    function createUI() {
        const style = document.createElement('style');
        style.textContent = `
            #manga-translator-panel {
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

            #manga-translator-panel h3 {
                margin: 0 0 16px 0;
                font-size: 18px;
                text-align: center;
            }

            #manga-translator-panel input {
                width: 100%;
                padding: 10px;
                margin-bottom: 12px;
                border: none;
                border-radius: 6px;
                box-sizing: border-box;
                font-size: 14px;
            }

            #manga-translator-panel button {
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

            #manga-translator-panel button:last-child {
                margin-bottom: 0;
            }

            #manga-translator-panel .primary-btn {
                background: white;
                color: #667eea;
            }

            #manga-translator-panel .primary-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            #manga-translator-panel .secondary-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid white;
            }

            #manga-translator-panel .secondary-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            #manga-translator-panel #status {
                margin-top: 12px;
                padding: 10px;
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                font-size: 13px;
                text-align: center;
                min-height: 20px;
            }

            #manga-translator-panel .close-btn {
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
                line-height: 1;
            }

            #manga-translator-panel .close-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            #manga-translator-panel .minimize {
                width: 60px;
                height: 60px;
                padding: 0;
                border-radius: 50%;
            }

            #manga-translator-panel.minimized {
                width: 60px;
                height: 60px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }

            #manga-translator-panel.minimized * {
                display: none;
            }

            #manga-translator-panel.minimized::before {
                content: '📖';
                font-size: 28px;
                display: block;
            }

            .translation-overlay {
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

            .translation-overlay .original {
                color: #ffcc00;
                font-size: 13px;
                margin-bottom: 8px;
            }

            .translation-overlay .translated {
                font-size: 16px;
                font-weight: bold;
                line-height: 1.5;
            }

            .translation-overlay .close {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 24px;
                height: 24px;
                background: rgba(255,59,48,0.8);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                font-size: 14px;
                line-height: 1;
            }

            .translation-overlay .close:hover {
                background: #ff3b30;
            }

            .input-mode-overlay {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.95);
                color: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 40px rgba(0,0,0,0.6);
                z-index: 1000000;
                min-width: 400px;
                border: 2px solid #667eea;
            }

            .input-mode-overlay h3 {
                margin: 0 0 16px 0;
                text-align: center;
                color: #667eea;
            }

            .input-mode-overlay textarea {
                width: 100%;
                min-height: 150px;
                padding: 12px;
                border: 2px solid #667eea;
                border-radius: 8px;
                font-size: 14px;
                font-family: sans-serif;
                resize: vertical;
                box-sizing: border-box;
                background: #1a1a1a;
                color: white;
            }

            .input-mode-overlay .button-group {
                display: flex;
                gap: 12px;
                margin-top: 16px;
            }

            .input-mode-overlay button {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .input-mode-overlay .translate-btn {
                background: #667eea;
                color: white;
            }

            .input-mode-overlay .translate-btn:hover {
                background: #5568d3;
            }

            .input-mode-overlay .cancel-btn {
                background: #666;
                color: white;
            }

            .input-mode-overlay .cancel-btn:hover {
                background: #555;
            }

            .backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999999;
            }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'manga-translator-panel';
        panel.innerHTML = `
            <button class="close-btn" id="minimize-btn">−</button>
            <h3>📖 漫画翻译</h3>
            <input type="text" id="api-url" placeholder="API 地址" value="${API_URL}">
            <button class="primary-btn" id="save-api-btn">💾 保存 API 地址</button>
            <button class="secondary-btn" id="translate-btn">✍️ 输入日文翻译</button>
            <button class="secondary-btn" id="clear-all-btn">🗑 清除所有翻译</button>
            <div id="status"></div>
        `;
        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('save-api-btn').addEventListener('click', saveApiUrl);
        document.getElementById('translate-btn').addEventListener('click', showInputDialog);
        document.getElementById('clear-all-btn').addEventListener('click', clearAllTranslations);
        document.getElementById('minimize-btn').addEventListener('click', toggleMinimize);

        // 点击最小化后的面板恢复
        panel.addEventListener('click', function() {
            if (panel.classList.contains('minimized')) {
                toggleMinimize();
            }
        });
    }

    // 切换最小化
    function toggleMinimize() {
        const panel = document.getElementById('manga-translator-panel');
        panel.classList.toggle('minimized');
    }

    // 保存 API 地址
    function saveApiUrl() {
        const input = document.getElementById('api-url');
        API_URL = input.value.trim();

        if (!API_URL) {
            showStatus('请输入 API 地址', 'error');
            return;
        }

        GM_setValue('apiUrl', API_URL);
        showStatus('✅ API 地址已保存', 'success');
    }

    // 显示状态
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

    // 显示输入对话框
    function showInputDialog() {
        if (!API_URL) {
            showStatus('❌ 请先设置 API 地址', 'error');
            return;
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop';

        const dialog = document.createElement('div');
        dialog.className = 'input-mode-overlay';
        dialog.innerHTML = `
            <h3>✍️ 输入日文文本</h3>
            <textarea id="japanese-input" placeholder="请输入或粘贴日文文本（每行一段）..."></textarea>
            <div class="button-group">
                <button class="cancel-btn" id="cancel-input-btn">取消</button>
                <button class="translate-btn" id="do-translate-btn">🔄 翻译</button>
            </div>
        `;

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        // 聚焦到文本框
        setTimeout(() => {
            document.getElementById('japanese-input').focus();
        }, 100);

        // 绑定事件
        document.getElementById('cancel-input-btn').addEventListener('click', () => {
            backdrop.remove();
        });

        document.getElementById('do-translate-btn').addEventListener('click', async () => {
            const textarea = document.getElementById('japanese-input');
            const text = textarea.value.trim();

            if (!text) {
                alert('请输入日文文本');
                return;
            }

            // 按行分割
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            if (lines.length === 0) {
                alert('请输入有效的日文文本');
                return;
            }

            backdrop.remove();
            await translateAndDisplay(lines);
        });

        // 点击背景关闭
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.remove();
            }
        });
    }

    // 翻译并显示
    async function translateAndDisplay(textsJa) {
        showStatus('🔄 正在翻译...', 'info');

        try {
            const textsZh = await translateTexts(textsJa);

            // 显示翻译结果
            let topOffset = 100;
            textsJa.forEach((ja, index) => {
                createTranslationBubble(ja, textsZh[index], topOffset);
                topOffset += 100;
            });

            showStatus(`✅ 翻译完成！共 ${textsZh.length} 段`, 'success');
        } catch (error) {
            console.error('翻译失败:', error);
            showStatus(`❌ 翻译失败: ${error.message}`, 'error');
        }
    }

    // 调用翻译 API
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
                        reject(new Error(`API 返回错误: ${response.status}`));
                    }
                },
                onerror: function() {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    }

    // 创建翻译气泡
    let bubbleCount = 0;
    function createTranslationBubble(original, translated, top = 100) {
        const bubble = document.createElement('div');
        bubble.className = 'translation-overlay';
        bubble.style.top = `${top}px`;
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%)';
        bubble.innerHTML = `
            <button class="close">×</button>
            <div class="original">${original}</div>
            <div class="translated">${translated}</div>
        `;

        // 可拖动
        makeDraggable(bubble);

        // 关闭按钮
        bubble.querySelector('.close').addEventListener('click', () => {
            bubble.remove();
        });

        document.body.appendChild(bubble);
        bubbleCount++;
    }

    // 使元素可拖动
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            // 如果点击的是关闭按钮，不触发拖动
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

    // 清除所有翻译
    function clearAllTranslations() {
        const bubbles = document.querySelectorAll('.translation-overlay');
        bubbles.forEach(bubble => bubble.remove());
        bubbleCount = 0;
        showStatus('✅ 已清除所有翻译', 'success');
    }

    // 初始化
    function init() {
        console.log('漫画翻译工具（简化版）已加载');
        createUI();
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
