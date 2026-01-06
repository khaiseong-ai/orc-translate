"""
PaddleOCR API 服务器
用于识别日文漫画文字
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
import base64
import io
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化 PaddleOCR（日文+英文）
ocr = PaddleOCR(
    use_angle_cls=True,  # 使用方向分类器
    lang='japan',        # 日文识别
    use_gpu=False,       # 如果有GPU设为True
    show_log=False
)

@app.route('/health', methods=['GET'])
def health():
    """健康检查接口"""
    return jsonify({'status': 'ok', 'service': 'PaddleOCR API'})

@app.route('/ocr', methods=['POST'])
def ocr_image():
    """
    OCR 识别接口

    请求格式:
    {
        "image": "base64编码的图片"
    }
    或
    {
        "image_url": "图片URL"
    }

    响应格式:
    {
        "texts": ["识别到的文本1", "识别到的文本2", ...],
        "details": [
            {
                "text": "文本内容",
                "confidence": 0.95,
                "bbox": [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()

        # 获取图片
        if 'image' in data:
            # Base64 编码的图片
            image_data = base64.b64decode(data['image'])
            img = Image.open(io.BytesIO(image_data))
        elif 'image_url' in data:
            # URL 图片
            import requests
            response = requests.get(data['image_url'])
            img = Image.open(io.BytesIO(response.content))
        else:
            return jsonify({'error': 'Missing image or image_url'}), 400

        # 转换为 numpy 数组
        img_array = np.array(img)

        # 执行 OCR
        result = ocr.ocr(img_array, cls=True)

        if not result or not result[0]:
            return jsonify({
                'texts': [],
                'details': [],
                'message': '未识别到文字'
            })

        # 提取文本
        texts = []
        details = []

        for line in result[0]:
            bbox = line[0]  # 边界框坐标
            text_info = line[1]  # (文本, 置信度)
            text = text_info[0]
            confidence = text_info[1]

            # 过滤：只保留日文字符
            if contains_japanese(text):
                texts.append(text)
                details.append({
                    'text': text,
                    'confidence': float(confidence),
                    'bbox': bbox
                })

        return jsonify({
            'texts': texts,
            'details': details,
            'count': len(texts)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def contains_japanese(text):
    """检查文本是否包含日文字符"""
    for char in text:
        code = ord(char)
        # 平假名、片假名、日文汉字
        if (0x3040 <= code <= 0x309F) or \
           (0x30A0 <= code <= 0x30FF) or \
           (0x4E00 <= code <= 0x9FFF):
            return True
    return False

@app.route('/ocr-translate', methods=['POST'])
def ocr_and_translate():
    """
    OCR + 翻译一体化接口

    请求格式:
    {
        "image": "base64编码的图片",
        "translate_api": "翻译API地址"
    }

    响应格式:
    {
        "results": [
            {
                "original": "日文文本",
                "translated": "中文翻译",
                "confidence": 0.95,
                "bbox": [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        translate_api = data.get('translate_api')

        # 先执行 OCR
        ocr_result = ocr_image()
        ocr_data = ocr_result.get_json()

        if not ocr_data.get('texts'):
            return jsonify({
                'results': [],
                'message': '未识别到文字'
            })

        # 调用翻译 API
        if translate_api:
            import requests
            response = requests.post(
                translate_api,
                json={'texts_ja': ocr_data['texts']},
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                translate_data = response.json()
                translations = translate_data.get('texts_zh', [])

                # 组合结果
                results = []
                for i, detail in enumerate(ocr_data['details']):
                    results.append({
                        'original': detail['text'],
                        'translated': translations[i] if i < len(translations) else detail['text'],
                        'confidence': detail['confidence'],
                        'bbox': detail['bbox']
                    })

                return jsonify({
                    'results': results,
                    'count': len(results)
                })

        # 如果没有翻译API，只返回OCR结果
        results = [{
            'original': d['text'],
            'translated': '',
            'confidence': d['confidence'],
            'bbox': d['bbox']
        } for d in ocr_data['details']]

        return jsonify({
            'results': results,
            'count': len(results)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("PaddleOCR API 服务器启动中...")
    print("访问 http://localhost:5000/health 检查服务状态")
    app.run(host='0.0.0.0', port=5000, debug=True)
