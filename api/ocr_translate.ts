
// CORS 允许的源
const ALLOWED_ORIGINS = [
  'https://wnacg.com',
  'https://www.wnacg.com',
  '*', // 开发阶段允许所有源
];

// 设置 CORS 头
function setCorsHeaders(res: VercelResponse, origin: string | undefined): void {
  // 检查 origin 是否在允许列表中，或者使用通配符
  const allowedOrigin = ALLOWED_ORIGINS.includes('*') 
    ? '*' 
    : origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0]; // 默认使用第一个允许的源

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
}

// Mock 数据
function getMockResponse() {
  return {
    items: [
      {
        bbox: { x: 0.1, y: 0.1, w: 0.3, h: 0.08 },
        text_ja: 'これは日本語のテキストです',
        text_zh: '中文占位 1',
      },
      {
        bbox: { x: 0.6, y: 0.2, w: 0.25, h: 0.08 },
        text_ja: 'もう一つの日本語テキスト',
        text_zh: '中文占位 2',
      },
      {
        bbox: { x: 0.2, y: 0.7, w: 0.3, h: 0.08 },
        text_ja: '三つ目の日本語テキスト',
        text_zh: '中文占位 3',
      },
    ],
    meta: { mock: true },
  };
}

// 处理 OPTIONS 预检请求
function handleOptions(req: VercelRequest, res: VercelResponse): void {
  setCorsHeaders(res, req.headers.origin);
  res.status(200).end();
}

// 处理 POST 请求
function handlePost(req: VercelRequest, res: VercelResponse): void {
  setCorsHeaders(res, req.headers.origin);

  try {
    // 验证请求体
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      res.status(400).json({
        error: 'Invalid request. Expected { "imageUrl": "https://..." }',
      });
      return;
    }

    // 验证 URL 格式
    try {
      new URL(imageUrl);
    } catch {
      res.status(400).json({
        error: 'Invalid imageUrl format. Must be a valid URL.',
      });
      return;
    }

    // 返回 mock 数据
    const response = getMockResponse();
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

export default function handler(req: any, res: any) {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    handleOptions(req, res);
    return;
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    setCorsHeaders(res, req.headers.origin);
    res.status(405).json({
      error: 'Method not allowed. Only POST requests are supported.',
    });
    return;
  }

  // 处理 POST 请求
  handlePost(req, res);
}

