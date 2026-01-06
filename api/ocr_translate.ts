// api/ocr_translate.ts

// 类型声明：Vercel Serverless Functions 环境支持 fetch 和 URL
declare const fetch: typeof globalThis.fetch;
declare const URL: typeof globalThis.URL;

/**
 * 翻译缓存（服务端缓存，避免重复调用翻译接口）
 */
const _cache = new Map<string, string>();

/**
 * 免费翻译（非官方 Google 翻译接口）
 * 返回：中文字符串
 */
async function translateJaToZh(textJa: string): Promise<string> {
  if (!textJa) return "";
  if (_cache.has(textJa)) return _cache.get(textJa)!;

  const url =
    "https://translate.googleapis.com/translate_a/single" +
    "?client=gtx" +
    "&sl=ja" +
    "&tl=zh-CN" +
    "&dt=t" +
    "&q=" + encodeURIComponent(textJa);

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      // 有时加个 UA 更稳一点（不是必须）
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!resp.ok) throw new Error(`translate http ${resp.status}`);

  const data = await resp.json();
  // data[0] 是分句数组：[[translated, original, ...], ...]
  const translated = Array.isArray(data?.[0])
    ? data[0].map((seg: any[]) => seg?.[0]).filter(Boolean).join("")
    : "";

  const out = (translated || "").trim();
  _cache.set(textJa, out || textJa);
  return out || textJa;
}

/**
 * 批量翻译日文到中文
 */
async function batchTranslate(textsJa: string[]): Promise<string[]> {
  return Promise.all(textsJa.map(text => translateJaToZh(text)));
}

/**
 * 返回兼容旧格式的 mock items（用于 imageUrl 请求）
 */
function getMockItems() {
  return [
    { bbox: { x: 0.10, y: 0.10, w: 0.28, h: 0.08 }, text_ja: "おはようございます", text_zh: "早上好" },
    { bbox: { x: 0.65, y: 0.18, w: 0.22, h: 0.08 }, text_ja: "大丈夫ですか？", text_zh: "没关系吗？" },
    { bbox: { x: 0.18, y: 0.70, w: 0.30, h: 0.08 }, text_ja: "ありがとう", text_zh: "谢谢" },
  ];
}

export default async function handler(req: any, res: any) {
  // ---- CORS（先宽松，后面再收紧）----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST requests are supported." });
  }

  const body = req.body || {};

  // 新格式：批量翻译 { texts_ja: string[] }
  if (body.texts_ja) {
    if (!Array.isArray(body.texts_ja)) {
      return res.status(400).json({ error: "texts_ja must be an array of strings." });
    }

    // 限流保护：超过 30 条返回 400
    if (body.texts_ja.length > 30) {
      return res.status(400).json({ 
        error: `Too many texts. Maximum 30 texts allowed, got ${body.texts_ja.length}.` 
      });
    }

    // 验证所有元素都是字符串
    if (!body.texts_ja.every((text: any) => typeof text === "string")) {
      return res.status(400).json({ error: "All elements in texts_ja must be strings." });
    }

    try {
      const texts_zh = await batchTranslate(body.texts_ja);
      return res.status(200).json({
        texts_zh,
        meta: { 
          count: texts_zh.length,
          translated: true,
          cached: body.texts_ja.filter((text: string) => _cache.has(text)).length
        }
      });
    } catch (e: any) {
      // 翻译失败时返回原始文本
      return res.status(200).json({
        texts_zh: body.texts_ja.map((text: string) => `（翻译失败）${text}`),
        meta: { 
          count: body.texts_ja.length,
          translated: false, 
          error: String(e?.message || e) 
        }
      });
    }
  }

  // 兼容旧格式：{ imageUrl } - 返回 mock items
  if (body.imageUrl) {
    // 验证 URL 格式（可选）
    try {
      if (typeof body.imageUrl === "string") {
        new URL(body.imageUrl);
      }
    } catch {
      // URL 格式错误也不报错，直接返回 mock
    }

    // 返回兼容旧格式的响应
    return res.status(200).json({
      items: getMockItems(),
      meta: { mock: true, translated: false }
    });
  }

  // 既没有 texts_ja 也没有 imageUrl
  return res.status(400).json({ 
    error: "Invalid request. Expected { texts_ja: string[] } or { imageUrl: string }." 
  });
}
  