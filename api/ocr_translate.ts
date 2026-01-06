// api/ocr_translate.ts
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
  
    // 你现在先不需要 imageUrl；后面接 OCR 才会用到
    // const { imageUrl } = req.body || {};
  
    // ---- 写死的日文（先用来验证翻译链路）----
    const fixed = [
      { bbox: { x: 0.10, y: 0.10, w: 0.28, h: 0.08 }, text_ja: "おはようございます" },
      { bbox: { x: 0.65, y: 0.18, w: 0.22, h: 0.08 }, text_ja: "大丈夫ですか？" },
      { bbox: { x: 0.18, y: 0.70, w: 0.30, h: 0.08 }, text_ja: "ありがとう" },
    ];
  
    try {
      const items = await Promise.all(
        fixed.map(async (it) => {
          const text_zh = await translateJaToZh(it.text_ja);
          return { ...it, text_zh };
        })
      );
  
      return res.status(200).json({
        items,
        meta: { mock: true, translated: true }
      });
    } catch (e: any) {
      // 翻译接口挂了也不要让前端崩
      return res.status(200).json({
        items: fixed.map(it => ({ ...it, text_zh: `（翻译失败）${it.text_ja}` })),
        meta: { mock: true, translated: false, error: String(e?.message || e) }
      });
    }
  }
  
  /**
   * 免费翻译（非官方 Google 翻译接口）
   * 返回：中文字符串
   */
  const _cache = new Map<string, string>();
  
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
  