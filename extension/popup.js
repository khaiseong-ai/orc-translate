// popup.js - 扩展弹窗逻辑

document.addEventListener('DOMContentLoaded', function() {
  const apiUrlInput = document.getElementById('apiUrl');
  const saveBtn = document.getElementById('saveBtn');
  const translateBtn = document.getElementById('translateBtn');
  const status = document.getElementById('status');

  // 加载保存的设置
  chrome.storage.sync.get(['apiUrl'], function(result) {
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
  });

  // 保存设置
  saveBtn.addEventListener('click', function() {
    const apiUrl = apiUrlInput.value.trim();

    if (!apiUrl) {
      status.textContent = '❌ 请输入 API 地址';
      status.style.background = 'rgba(255,59,48,0.2)';
      return;
    }

    chrome.storage.sync.set({ apiUrl }, function() {
      status.textContent = '✅ 设置已保存';
      status.style.background = 'rgba(52,199,89,0.2)';
      setTimeout(() => {
        status.textContent = '';
        status.style.background = '';
      }, 2000);
    });
  });

  // 开始翻译
  translateBtn.addEventListener('click', async function() {
    const apiUrl = apiUrlInput.value.trim();

    if (!apiUrl) {
      status.textContent = '❌ 请先设置 API 地址';
      status.style.background = 'rgba(255,59,48,0.2)';
      return;
    }

    status.textContent = '🔄 正在激活翻译模式...';
    status.style.background = 'rgba(255,204,0,0.2)';

    // 向当前标签页注入并执行翻译
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, {
      action: 'startTranslate',
      apiUrl: apiUrl
    }, function(response) {
      if (chrome.runtime.lastError) {
        status.textContent = '❌ 激活失败，请刷新页面后重试';
        status.style.background = 'rgba(255,59,48,0.2)';
      } else {
        status.textContent = '✅ 翻译模式已激活';
        status.style.background = 'rgba(52,199,89,0.2)';

        // 关闭弹窗
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    });
  });
});
