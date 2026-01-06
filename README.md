# 漫画日文翻译工具

一个完整的日文漫画翻译解决方案，包含翻译 API 后端和浏览器前端工具。

## 项目简介

在看日本漫画时，点击一个按钮即可自动翻译当前屏幕的日文内容为中文，支持滚动自动翻译。

## 项目结构

```
.
├── api/
│   └── ocr_translate.ts           # Vercel Serverless 翻译 API
├── extension/                     # Chrome 浏览器扩展
│   ├── manifest.json              # 扩展配置文件
│   ├── popup.html                 # 扩展弹窗页面
│   ├── popup.js                   # 弹窗逻辑
│   ├── content.js                 # 页面内容脚本
│   ├── content.css                # 内容脚本样式
│   └── icon.txt                   # 图标说明
├── userscript/                    # Tampermonkey 用户脚本
│   ├── manga-translator.user.js        # 完整版（带 OCR）
│   └── manga-translator-simple.user.js # 简化版（手动输入）
├── package.json                   # 项目依赖配置
├── tsconfig.json                  # TypeScript 配置
└── README.md                      # 项目说明文档
```

## 功能特性

### 翻译 API 后端
- ✅ 批量日文翻译（最多 30 条）
- ✅ 服务端缓存（相同文本不重复翻译）
- ✅ CORS 支持
- ✅ 向后兼容旧格式

### 浏览器前端
- ✅ 一键翻译当前屏幕
- ✅ 自动滚动翻译
- ✅ 可拖动的翻译气泡
- ✅ 简洁美观的 UI
- ✅ Chrome 扩展 + Tampermonkey 双版本

## POST /api/ocr_translate

支持两种请求格式：

#### 1. 批量翻译（推荐）

**请求格式：**
```json
{
  "texts_ja": ["おはようございます", "大丈夫ですか？", "ありがとう"]
}
```

**响应格式：**
```json
{
  "texts_zh": ["早上好", "没关系吗？", "谢谢"],
  "meta": {
    "count": 3,
    "translated": true,
    "cached": 0
  }
}
```

**限制：**
- 最多支持 30 条文本（超过会返回 400 错误）
- 所有元素必须是字符串

**curl 示例：**
```bash
curl -X POST https://your-project.vercel.app/api/ocr_translate \
  -H "Content-Type: application/json" \
  -H "Origin: https://wnacg.com" \
  -d '{"texts_ja": ["おはようございます", "大丈夫ですか？", "ありがとう"]}'
```

#### 2. 兼容旧格式（imageUrl）

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
      "bbox": {"x": 0.1, "y": 0.1, "w": 0.28, "h": 0.08},
      "text_ja": "おはようございます",
      "text_zh": "早上好"
    },
    {
      "bbox": {"x": 0.65, "y": 0.18, "w": 0.22, "h": 0.08},
      "text_ja": "大丈夫ですか？",
      "text_zh": "没关系吗？"
    },
    {
      "bbox": {"x": 0.18, "y": 0.70, "w": 0.30, "h": 0.08},
      "text_ja": "ありがとう",
      "text_zh": "谢谢"
    }
  ],
  "meta": {
    "mock": true,
    "translated": false
  }
}
```

**curl 示例：**
```bash
curl -X POST https://your-project.vercel.app/api/ocr_translate \
  -H "Content-Type: application/json" \
  -H "Origin: https://wnacg.com" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

**CORS 支持：**
- 允许的源：`https://wnacg.com`、`https://www.wnacg.com`（当前为 `*` 用于开发）
- 支持 OPTIONS 预检请求

**特性：**
- ✅ 服务端缓存：相同日文文本不会重复调用翻译接口
- ✅ 限流保护：批量翻译最多 30 条
- ✅ 向后兼容：旧的 `imageUrl` 请求仍然支持

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

**测试批量翻译：**
```bash
curl -X POST http://localhost:3000/api/ocr_translate \
  -H "Content-Type: application/json" \
  -d '{"texts_ja": ["おはようございます", "大丈夫ですか？", "ありがとう"]}'
```

**测试兼容旧格式：**
```bash
curl -X POST http://localhost:3000/api/ocr_translate \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

部署翻译 API 后端到 Vercel，获取 API 地址供前端使用。

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

**将这个 URL 配置到前端工具中**：
- Chrome 扩展：在弹窗中输入 `https://your-project.vercel.app/api/ocr_translate`
- Tampermonkey：在面板中输入相同的地址

**测试批量翻译：**
```bash
curl -X POST https://your-project.vercel.app/api/ocr_translate \
  -H "Content-Type: application/json" \
  -H "Origin: https://wnacg.com" \
  -d '{"texts_ja": ["おはようございます", "大丈夫ですか？", "ありがとう"]}'
```

**预期响应：**
```json
{
  "texts_zh": ["早上好", "没关系吗？", "谢谢"],
  "meta": {
    "count": 3,
    "translated": true,
    "cached": 0
  }
}
```

---

# 使用场景

## 漫画网站

适用于各种在线漫画阅读网站，如：
- https://www.pixiv.net/
- https://comic.pixiv.net/
- 其他日文漫画网站

### 使用流程

1. 打开漫画阅读页面
2. 启动翻译工具（点击扩展图标或 Tampermonkey 面板）
3. 选择翻译模式：
   - **简化版**：复制漫画中的日文文字，粘贴到输入框翻译
   - **完整版**：直接点击"翻译"按钮，自动识别图片中的文字
4. 翻译结果以气泡形式显示在页面上
5. 继续阅读，滚动到新内容时可重复翻译

## 本地图片

也可以用于本地保存的漫画图片：
1. 在浏览器中打开图片
2. 使用简化版手动输入文字翻译
3. 或使用完整版自动 OCR 识别

---

# API 接口文档

---

# 常见问题

## 1. OCR 识别不准确怎么办？

**解决方案**：
- 使用简化版用户脚本，手动输入日文文本
- 确保漫画图片清晰度足够高
- OCR 对于手写字体识别较差，建议手动输入

## 2. 翻译速度慢？

**原因**：
- Tesseract.js 首次加载需要下载模型（约 2MB）
- OCR 识别本身需要时间
- 网络请求延迟

**解决方案**：
- 使用简化版，跳过 OCR 步骤
- 使用更快的翻译 API
- 在本地网络环境下使用

## 3. 如何更换翻译服务？

修改 `api/ocr_translate.ts` 中的 `translateJaToZh` 函数：

```typescript
async function translateJaToZh(textJa: string): Promise<string> {
  // 替换为你的翻译 API 调用
  // 例如：调用 DeepL、百度翻译等
}
```

## 4. 支持哪些浏览器？

- **Chrome/Edge**: 支持扩展和 Tampermonkey
- **Firefox**: 支持 Tampermonkey（扩展需要修改为 Manifest V2）
- **Safari**: 支持 Tampermonkey

## 5. 能翻译其他语言吗？

可以！修改 API 中的语言参数：
- `sl=ja` 改为其他源语言代码
- `tl=zh-CN` 改为其他目标语言代码

---

# 技术细节

## 翻译 API 限制

- **批量翻译**：最多 30 条文本
- **单次请求大小**：建议不超过 10KB
- **频率限制**：无官方限制，但建议合理使用
- **服务端缓存**：相同文本自动使用缓存

## OCR 识别

### 使用 Tesseract.js

**优点**：
- 完全在浏览器端运行
- 无需服务器支持
- 支持多语言

**缺点**：
- 识别速度较慢（3-5 秒/图）
- 准确率依赖图片质量
- 首次加载需要下载模型

### 可选方案

1. **Google Cloud Vision API**
   - 识别准确率高
   - 速度快
   - 需要付费

2. **百度 OCR API**
   - 支持中文和日文
   - 有免费额度
   - 需要注册账号

3. **PaddleOCR**
   - 开源免费
   - 需要服务器部署
   - 识别效果好

## 安全性

- **CORS 配置**：建议在生产环境限制允许的域名
- **API 密钥**：如果使用付费翻译服务，请使用环境变量存储密钥
- **输入验证**：API 已包含基本的输入验证

---

# 贡献

欢迎提交 Issue 和 Pull Request！

## 开发计划

- [ ] 添加更多翻译服务支持（DeepL、百度等）
- [ ] 优化 OCR 识别速度和准确率
- [ ] 支持更多语言
- [ ] 添加翻译历史记录
- [ ] 支持自定义样式主题
- [ ] 添加快捷键支持

---

# 许可证

MIT License

---

# 注意事项

- **批量翻译**：支持最多 30 条文本，超过会返回 400 错误
- **服务端缓存**：相同日文文本会自动使用缓存，不会重复调用翻译接口
- **向后兼容**：旧的 `imageUrl` 请求格式仍然支持，返回 mock 数据
- **CORS 配置**：当前允许所有源（`*`），生产环境建议限制为特定域名
- **翻译服务**：使用 Google 翻译非官方接口，可能不稳定，建议替换为官方 API
- **OCR 服务**：Tesseract.js 识别速度较慢，适合小规模使用

## 技术栈

### 后端
- **Runtime**: Node.js (Vercel Serverless Functions)
- **Language**: TypeScript
- **Platform**: Vercel
- **翻译服务**: Google 翻译非官方 API

### 前端
- **Chrome Extension**: Manifest V3
- **Tampermonkey**: Userscript
- **OCR**: Tesseract.js（可选）

---

# 快速开始

## 方案一：Tampermonkey 用户脚本（推荐）

### 简化版（手动输入文本）

**优点**：简单易用，无需 OCR，适合快速翻译

**安装步骤**：

1. **安装 Tampermonkey**
   - Chrome: [Tampermonkey - Chrome 网上应用店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Tampermonkey – Firefox 附加组件](https://addons.mozilla.org/zh-CN/firefox/addon/tampermonkey/)

2. **安装脚本**
   - 打开 `userscript/manga-translator-simple.user.js`
   - 复制全部内容
   - 在 Tampermonkey 中点击"添加新脚本"
   - 粘贴脚本内容并保存

3. **配置 API**
   - 打开任意网页
   - 点击右下角的"📖"按钮
   - 输入你的翻译 API 地址（Vercel 部署后的地址）
   - 点击"保存 API 地址"

4. **使用**
   - 点击"✍️ 输入日文翻译"
   - 输入或粘贴日文文本（支持多行）
   - 点击"翻译"
   - 翻译结果会以气泡形式显示在页面上
   - 可以拖动气泡到任意位置
   - 点击气泡上的"×"关闭单个翻译

**使用示例**：
```
おはようございます
ありがとうございます
さようなら
```

### 完整版（自动 OCR）

**优点**：自动识别图片中的日文，支持自动滚动翻译

**安装步骤**：

1. 按照简化版的步骤 1-2 安装 `userscript/manga-translator.user.js`
2. 配置 API 地址
3. 打开漫画网页
4. 点击"📖"按钮打开控制面板
5. 点击"🔍 翻译当前屏幕"自动识别并翻译
6. 或点击"▶️ 开启自动翻译"，滚动页面时自动翻译

**注意**：
- OCR 识别需要加载 Tesseract.js 库（约 2MB）
- 首次识别会较慢，后续会更快
- 建议在网络较好的环境下使用

---

## 方案二：Chrome 浏览器扩展

### 安装步骤

1. **准备图标**
   - 创建一个 128x128 的 PNG 图标
   - 命名为 `icon.png`
   - 放入 `extension/` 目录
   - 或使用在线工具生成：https://favicon.io/emoji-favicons/open-book/

2. **加载扩展**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `extension` 文件夹

3. **配置**
   - 点击浏览器右上角的扩展图标
   - 输入翻译 API 地址
   - 点击"保存设置"

4. **使用**
   - 打开漫画网页
   - 点击扩展图标
   - 点击"开始翻译当前页面"
   - 页面上会出现"🔍 翻译"按钮
   - 点击即可翻译当前屏幕

### 扩展功能

- 📱 固定的翻译按钮
- 🎨 美观的渐变 UI
- 📍 翻译结果浮层显示
- 🔄 实时通知状态

---

# 翻译 API 部署

## 部署到 Vercel