# PaddleOCR API 服务器

基于 PaddleOCR 的日文 OCR 识别服务，专门用于漫画文字识别。

## 特点

- ✅ 使用 PaddleOCR，日文识别准确率高
- ✅ 支持多种部署方式（本地、Docker、云服务器）
- ✅ RESTful API 接口
- ✅ 支持 OCR + 翻译一体化
- ✅ 自动过滤非日文字符

## 快速开始

### 方法一：本地运行（推荐用于测试）

#### 1. 安装 Python 3.9+

确保已安装 Python 3.9 或更高版本。

#### 2. 安装依赖

```bash
cd paddle-ocr-server
pip install -r requirements.txt
```

#### 3. 启动服务

```bash
python app.py
```

服务将在 `http://localhost:5000` 启动。

#### 4. 测试服务

```bash
# 健康检查
curl http://localhost:5000/health

# 测试 OCR（需要准备一张图片转为 base64）
curl -X POST http://localhost:5000/ocr \
  -H "Content-Type: application/json" \
  -d '{"image_url": "图片URL"}'
```

---

### 方法二：Docker 部署（推荐用于生产）

#### 1. 构建 Docker 镜像

```bash
cd paddle-ocr-server
docker build -t paddle-ocr-api .
```

#### 2. 运行容器

```bash
docker run -d -p 5000:5000 --name paddle-ocr paddle-ocr-api
```

#### 3. 查看日志

```bash
docker logs -f paddle-ocr
```

---

### 方法三：部署到云服务器

#### Railway 部署

1. 注册 [Railway](https://railway.app/)
2. 创建新项目
3. 连接 GitHub 仓库
4. 选择 `paddle-ocr-server` 目录
5. Railway 会自动检测 Dockerfile 并部署

#### Render 部署

1. 注册 [Render](https://render.com/)
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 设置：
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
5. 点击 Deploy

#### Fly.io 部署

```bash
# 安装 flyctl
curl -L https://fly.io/install.sh | sh

# 登录
flyctl auth login

# 部署
cd paddle-ocr-server
flyctl launch
flyctl deploy
```

---

## API 接口文档

### 1. 健康检查

**GET** `/health`

响应：
```json
{
  "status": "ok",
  "service": "PaddleOCR API"
}
```

### 2. OCR 识别

**POST** `/ocr`

请求：
```json
{
  "image": "base64编码的图片"
}
```

或

```json
{
  "image_url": "https://example.com/image.jpg"
}
```

响应：
```json
{
  "texts": ["おはよう", "ありがとう"],
  "details": [
    {
      "text": "おはよう",
      "confidence": 0.95,
      "bbox": [[100, 100], [200, 100], [200, 150], [100, 150]]
    }
  ],
  "count": 2
}
```

### 3. OCR + 翻译

**POST** `/ocr-translate`

请求：
```json
{
  "image": "base64编码的图片",
  "translate_api": "https://orc-translate.vercel.app/api/ocr_translate"
}
```

响应：
```json
{
  "results": [
    {
      "original": "おはよう",
      "translated": "早上好",
      "confidence": 0.95,
      "bbox": [[100, 100], [200, 100], [200, 150], [100, 150]]
    }
  ],
  "count": 1
}
```

---

## 配置选项

### GPU 加速

如果服务器有 NVIDIA GPU，可以启用 GPU 加速：

1. 修改 `requirements.txt`：
   ```
   paddlepaddle-gpu==2.6.0
   ```

2. 修改 `app.py` 中的初始化：
   ```python
   ocr = PaddleOCR(
       use_angle_cls=True,
       lang='japan',
       use_gpu=True,  # 启用 GPU
       show_log=False
   )
   ```

### 支持更多语言

修改 `app.py` 中的语言设置：

```python
ocr = PaddleOCR(
    use_angle_cls=True,
    lang='ch',  # 中文: ch, 英文: en, 日文: japan, 韩文: korean
    use_gpu=False,
    show_log=False
)
```

---

## 性能优化

### 1. 使用 GPU

GPU 可以将识别速度提升 5-10 倍。

### 2. 调整进程数

使用 Gunicorn 运行多进程：

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 3. 启用缓存

添加 Redis 缓存相同图片的识别结果。

---

## 故障排除

### 问题 1: 安装失败

**错误**: `Could not find a version that satisfies the requirement paddlepaddle`

**解决**:
```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 问题 2: 内存不足

**解决**:
- 使用至少 2GB 内存的服务器
- 或者限制并发请求数量

### 问题 3: 识别速度慢

**解决**:
- 启用 GPU 加速
- 使用 Gunicorn 多进程
- 减小输入图片尺寸

---

## 许可证

MIT License
