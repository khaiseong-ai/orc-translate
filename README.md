# OCR Translate API

Vercel Serverless Function 项目，提供 OCR 翻译 API 接口。

## 项目结构

```
.
├── api/
│   └── ocr_translate.ts    # API 路由处理文件
├── package.json            # 项目依赖配置
├── tsconfig.json           # TypeScript 配置
├── .gitignore             # Git 忽略文件
└── README.md              # 项目说明文档
```

## API 接口

### POST /api/ocr_translate

**请求格式：**
```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

**响应格式：**
```json
{
  "items": [
    {
      "bbox": {"x": 0.1, "y": 0.1, "w": 0.3, "h": 0.08},
      "text_ja": "これは日本語のテキストです",
      "text_zh": "中文占位 1"
    },
    {
      "bbox": {"x": 0.6, "y": 0.2, "w": 0.25, "h": 0.08},
      "text_ja": "もう一つの日本語テキスト",
      "text_zh": "中文占位 2"
    },
    {
      "bbox": {"x": 0.2, "y": 0.7, "w": 0.3, "h": 0.08},
      "text_ja": "三つ目の日本語テキスト",
      "text_zh": "中文占位 3"
    }
  ],
  "meta": {
    "mock": true
  }
}
```

**CORS 支持：**
- 允许的源：`https://wnacg.com`、`https://www.wnacg.com`
- 支持 OPTIONS 预检请求

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 运行本地开发服务器

```bash
npm run dev
```

或者使用 Vercel CLI：

```bash
npx vercel dev
```

本地服务器将在 `http://localhost:3000` 启动。

### 3. 测试 API

使用 curl 或 Postman 测试：

```bash
curl -X POST http://localhost:3000/api/ocr_translate \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

## 部署到 Vercel

### 方法一：使用 Vercel CLI（推荐）

1. **安装 Vercel CLI**（如果还没有安装）：
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**：
   ```bash
   vercel login
   ```

3. **部署项目**：
   ```bash
   vercel
   ```
   
   首次部署会提示：
   - 是否链接到现有项目？选择 `N`（新建项目）
   - 项目名称：输入项目名称（或直接回车使用默认）
   - 目录：直接回车（使用当前目录）
   - 是否覆盖设置：直接回车（使用默认）

4. **生产环境部署**：
   ```bash
   vercel --prod
   ```

### 方法二：通过 GitHub 部署

1. **创建 GitHub 仓库**：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **在 Vercel 中导入项目**：
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库
   - Vercel 会自动检测项目类型
   - 点击 "Deploy"

3. **自动部署**：
   - 每次推送到 main 分支会自动触发生产环境部署
   - 推送到其他分支会创建预览部署

## 环境变量（可选）

如果需要配置环境变量（如 API 密钥），可以在 Vercel 项目设置中添加：

1. 进入 Vercel 项目 Dashboard
2. 点击 "Settings" → "Environment Variables"
3. 添加所需的变量

## 测试部署后的 API

部署完成后，Vercel 会提供一个 URL，例如：`https://your-project.vercel.app`

测试 API：

```bash
curl -X POST https://your-project.vercel.app/api/ocr_translate \
  -H "Content-Type: application/json" \
  -H "Origin: https://wnacg.com" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

## Tampermonkey 使用示例

```javascript
// ==UserScript==
// @name         OCR Translate Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @match        https://wnacg.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    
    const imageUrl = 'https://example.com/image.jpg';
    const apiUrl = 'https://your-project.vercel.app/api/ocr_translate';
    
    GM_xmlhttpRequest({
        method: 'POST',
        url: apiUrl,
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({ imageUrl: imageUrl }),
        onload: function(response) {
            if (response.status === 200) {
                const data = JSON.parse(response.responseText);
                console.log('OCR Result:', data);
            } else {
                console.error('Error:', response.status, response.responseText);
            }
        },
        onerror: function(error) {
            console.error('Request failed:', error);
        }
    });
})();
```

## 注意事项

- 当前版本返回的是 mock 数据，用于验证端到端流程
- CORS 配置中暂时允许所有源（`*`），生产环境建议限制为特定域名
- 后续需要集成实际的 OCR 和翻译服务

## 技术栈

- **Runtime**: Node.js (Vercel Serverless Functions)
- **Language**: TypeScript
- **Platform**: Vercel

