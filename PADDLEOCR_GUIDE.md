# PaddleOCR 漫画翻译 - 完整部署指南

本指南帮助你快速部署 PaddleOCR 日文识别服务，实现高准确率的漫画翻译。

---

## 🎯 方案选择

根据你的情况选择合适的部署方案：

| 方案 | 适用场景 | 难度 | 成本 |
|------|---------|------|------|
| **本地运行** | 个人使用，有电脑 | ⭐ 简单 | 免费 |
| **Render 免费部署** | 想要公网访问 | ⭐⭐ 中等 | 免费 |
| **Railway/Fly.io** | 更稳定的服务 | ⭐⭐ 中等 | $5/月 |

---

## 📦 方案一：本地运行（推荐新手）

### 前提条件
- Windows/Mac/Linux 电脑
- 已安装 Python 3.9+（[下载链接](https://www.python.org/downloads/)）

### 步骤

#### 1. 安装 Python（如果还没安装）

**Windows:**
- 访问 https://www.python.org/downloads/
- 下载 Python 3.9+ 安装包
- 安装时勾选"Add Python to PATH"

**Mac:**
```bash
brew install python@3.9
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install python3.9 python3-pip
```

#### 2. 下载项目代码

从 GitHub 下载：
```bash
git clone https://github.com/khaiseong-ai/orc-translate.git
cd orc-translate/paddle-ocr-server
```

或者直接下载 ZIP 并解压。

#### 3. 安装依赖

```bash
# 进入 paddle-ocr-server 目录
cd paddle-ocr-server

# 安装依赖（国内推荐使用清华镜像源）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**注意**：首次安装会下载 PaddleOCR 模型（约 100-200MB），需要几分钟。

#### 4. 启动服务

```bash
python app.py
```

看到以下输出表示成功：
```
PaddleOCR API 服务器启动中...
访问 http://localhost:5000/health 检查服务状态
 * Running on http://0.0.0.0:5000
```

#### 5. 测试服务

打开新终端，测试：
```bash
curl http://localhost:5000/health
```

应该返回：
```json
{"status":"ok","service":"PaddleOCR API"}
```

#### 6. 安装浏览器脚本

1. **安装 Tampermonkey**
   - Chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

2. **安装翻译脚本**
   - 复制 `userscript/manga-translator-paddle.user.js` 的内容
   - Tampermonkey → 添加新脚本
   - 粘贴并保存

3. **配置**
   - 打开漫画网站（如 https://www.wnacg.com）
   - 点击右下角"🔍 PaddleOCR 翻译"面板
   - PaddleOCR API: `http://localhost:5000`
   - 翻译 API: `https://orc-translate.vercel.app/api/ocr_translate`
   - 点击"保存配置"

#### 7. 开始使用

1. 打开漫画页面
2. 点击"🎯 开始识别翻译"
3. 选择要识别的图片
4. 等待几秒，翻译结果会自动显示

---

## ☁️ 方案二：Render 免费部署（推荐远程使用）

### 优点
- ✅ 完全免费
- ✅ 公网可访问
- ✅ 自动部署

### 缺点
- ⚠️ 免费版性能有限
- ⚠️ 15分钟无请求会休眠（首次访问会慢）

### 步骤

#### 1. 准备 GitHub 仓库

确保你的代码已经推送到 GitHub。

#### 2. 注册 Render

访问 https://render.com/ 并注册账号（可以用 GitHub 账号登录）。

#### 3. 创建 Web Service

1. 点击 **"New +"** → **"Web Service"**

2. 连接 GitHub 仓库：
   - 选择 `khaiseong-ai/orc-translate`
   - 或者输入仓库 URL

3. 配置服务：
   - **Name**: `paddle-ocr-api`（任意名称）
   - **Region**: `Singapore` 或 `Oregon`
   - **Branch**: `claude/manga-translation-tool-CGVJ5`
   - **Root Directory**: `paddle-ocr-server`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     python app.py
     ```

4. 选择 **Free** 方案

5. 点击 **"Create Web Service"**

#### 4. 等待部署

首次部署需要 5-10 分钟（下载 PaddleOCR 模型）。

部署成功后，你会得到一个 URL，类似：
```
https://paddle-ocr-api.onrender.com
```

#### 5. 测试服务

```bash
curl https://你的服务地址.onrender.com/health
```

#### 6. 配置浏览器脚本

在 Tampermonkey 脚本中修改：
```
PaddleOCR API: https://你的服务地址.onrender.com
```

---

## 🚀 方案三：Railway 部署（更稳定）

### 优点
- ✅ 不休眠
- ✅ 性能更好
- ✅ 一键部署

### 成本
- 前 5 美元免费
- 之后约 $5/月

### 步骤

#### 1. 访问 Railway

https://railway.app/ 并用 GitHub 登录。

#### 2. 创建新项目

1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择 `orc-translate` 仓库
4. 选择分支 `claude/manga-translation-tool-CGVJ5`

#### 3. 配置

Railway 会自动检测到 Dockerfile 并部署。

#### 4. 获取 URL

部署成功后：
1. 点击服务
2. 点击 **"Settings"**
3. 点击 **"Generate Domain"**
4. 得到类似 `https://paddle-ocr-xxx.railway.app` 的地址

---

## 🐳 方案四：Docker 本地运行

如果你熟悉 Docker：

```bash
cd paddle-ocr-server

# 构建镜像
docker build -t paddle-ocr-api .

# 运行容器
docker run -d -p 5000:5000 --name paddle-ocr paddle-ocr-api

# 查看日志
docker logs -f paddle-ocr
```

---

## 🔧 常见问题

### 问题 1: pip 安装失败

**错误**：`Could not find a version that satisfies...`

**解决**：使用国内镜像源
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 问题 2: 内存不足

**错误**：`Killed` 或内存错误

**解决**：
- 本地运行：确保至少有 2GB 可用内存
- Render：免费版内存有限，考虑升级或使用本地

### 问题 3: OCR 识别不出日文

**可能原因**：
1. 图片质量太低
2. 文字太小
3. 图片包含太多背景干扰

**解决**：
- 选择清晰的图片
- 尝试不同的图片
- 检查 OCR 日志查看详细错误

### 问题 4: Render 服务休眠

**现象**：首次访问很慢（15-30秒）

**解决**：这是 Render 免费版特性，等待服务唤醒即可。或升级到付费版。

### 问题 5: CORS 错误

**错误**：`Access to fetch blocked by CORS policy`

**解决**：
- 确保 Flask 已安装 `flask-cors`
- 检查 `app.py` 中是否有 `CORS(app)`

---

## 📊 性能优化

### 启用 GPU 加速（如果有 NVIDIA GPU）

1. 修改 `requirements.txt`：
   ```
   paddlepaddle-gpu==2.6.0  # 替换原来的 paddlepaddle
   ```

2. 修改 `app.py`：
   ```python
   ocr = PaddleOCR(
       use_angle_cls=True,
       lang='japan',
       use_gpu=True,  # 改为 True
       show_log=False
   )
   ```

GPU 可将识别速度提升 5-10 倍！

### 使用 Gunicorn 多进程

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## 🎉 完成！

现在你可以：
1. 打开任意漫画网站
2. 点击"🎯 开始识别翻译"
3. 选择图片
4. 享受高准确率的日文翻译！

---

## 💡 使用技巧

1. **选择清晰的图片** - OCR 对图片质量敏感
2. **首次识别会慢** - PaddleOCR 需要加载模型
3. **翻译结果可拖动** - 点击并拖动气泡到合适位置
4. **置信度参考** - 低于 80% 的识别可能不准确

---

## 📝 许可证

MIT License

有问题请在 GitHub 提 Issue：https://github.com/khaiseong-ai/orc-translate/issues
