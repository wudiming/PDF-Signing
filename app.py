#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF签章系统 - Flask后端应用
"""

import os
import uuid
import json
import random
import math
from flask import Flask, render_template, request, jsonify, send_file, url_for
from werkzeug.utils import secure_filename
from PIL import Image
import fitz  # PyMuPDF
import io
import base64

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# 确保上传文件夹存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs'), exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'stamps'), exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'results'), exist_ok=True)

ALLOWED_PDF_EXTENSIONS = {'pdf'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

@app.route('/')
def index():
    """首页 - 文件上传页面"""
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """处理文件上传"""
    try:
        # 检查是否有文件上传
        if 'pdf_file' not in request.files:
            return jsonify({'error': '没有选择PDF文件'}), 400
        
        pdf_file = request.files['pdf_file']
        stamp_files = request.files.getlist('stamp_files')
        
        if pdf_file.filename == '':
            return jsonify({'error': '没有选择PDF文件'}), 400
            
        if not allowed_file(pdf_file.filename, ALLOWED_PDF_EXTENSIONS):
            return jsonify({'error': 'PDF文件格式不正确'}), 400
        
        # 生成唯一的会话ID
        session_id = str(uuid.uuid4())
        
        # 保存PDF文件
        pdf_filename = secure_filename(pdf_file.filename)
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs', f"{session_id}_{pdf_filename}")
        pdf_file.save(pdf_path)
        
        # 保存签章图片
        stamp_info = []
        for i, stamp_file in enumerate(stamp_files):
            if stamp_file.filename != '' and allowed_file(stamp_file.filename, ALLOWED_IMAGE_EXTENSIONS):
                stamp_filename = secure_filename(stamp_file.filename)
                stamp_path = os.path.join(app.config['UPLOAD_FOLDER'], 'stamps', f"{session_id}_{i}_{stamp_filename}")
                stamp_file.save(stamp_path)
                
                # 获取图片信息
                with Image.open(stamp_path) as img:
                    width, height = img.size
                
                stamp_info.append({
                    'id': f"stamp_{i}",
                    'filename': stamp_filename,
                    'path': stamp_path,
                    'url': url_for('get_stamp', session_id=session_id, stamp_id=i),
                    'width': width,
                    'height': height
                })
        
        # 获取PDF信息
        pdf_doc = None
        try:
            pdf_doc = fitz.open(pdf_path)
            pdf_info = {
                'page_count': pdf_doc.page_count,
                'pages': []
            }
            
            for page_num in range(pdf_doc.page_count):
                page = pdf_doc[page_num]
                rect = page.rect
                pdf_info['pages'].append({
                    'page_num': page_num + 1,
                    'width': rect.width,
                    'height': rect.height
                })
            
            pdf_doc.close()
            pdf_doc = None
        except Exception as pdf_error:
            if pdf_doc:
                try:
                    pdf_doc.close()
                except:
                    pass
            raise pdf_error
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'pdf_info': pdf_info,
            'stamps': stamp_info,
            'redirect_url': url_for('editor', session_id=session_id)
        })
        
    except Exception as e:
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

@app.route('/editor/<session_id>')
def editor(session_id):
    """签章编辑页面"""
    return render_template('editor.html', session_id=session_id)

@app.route('/api/pdf/<session_id>/info')
def get_pdf_info(session_id):
    """获取PDF信息"""
    pdf_doc = None
    try:
        # 查找PDF文件
        pdf_files = [f for f in os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs')) 
                    if f.startswith(session_id)]
        
        if not pdf_files:
            return jsonify({'error': 'PDF文件未找到'}), 404
            
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs', pdf_files[0])
        
        # 检查文件是否存在
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF文件不存在'}), 404
        
        # 打开PDF获取信息
        pdf_doc = fitz.open(pdf_path)
        pdf_info = {
            'page_count': pdf_doc.page_count,
            'pages': []
        }
        
        for page_num in range(pdf_doc.page_count):
            page = pdf_doc[page_num]
            rect = page.rect
            pdf_info['pages'].append({
                'page_num': page_num + 1,
                'width': rect.width,
                'height': rect.height
            })
        
        pdf_doc.close()
        pdf_doc = None
        
        return jsonify({
            'success': True,
            'pdf_info': pdf_info
        })
        
    except Exception as e:
        # 确保资源被正确释放
        if pdf_doc:
            try:
                pdf_doc.close()
            except:
                pass
        return jsonify({'error': f'获取PDF信息失败: {str(e)}'}), 500

@app.route('/api/pdf/<session_id>/page/<int:page_num>')
def get_pdf_page(session_id, page_num):
    """获取PDF页面图片"""
    pdf_doc = None
    try:
        # 查找PDF文件
        pdf_files = [f for f in os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs')) 
                    if f.startswith(session_id)]
        
        if not pdf_files:
            return jsonify({'error': 'PDF文件未找到'}), 404
            
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs', pdf_files[0])
        
        # 检查文件是否存在
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF文件不存在'}), 404
        
        # 打开PDF并渲染页面
        pdf_doc = fitz.open(pdf_path)
        
        if page_num < 1 or page_num > pdf_doc.page_count:
            return jsonify({'error': '页面号无效'}), 400
            
        page = pdf_doc[page_num - 1]
        
        # 获取页面尺寸信息
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height
        
        # 渲染为图片
        mat = fitz.Matrix(2.0, 2.0)  # 2倍缩放以提高清晰度
        pix = page.get_pixmap(matrix=mat)
        
        # 转换为PNG字节数据
        img_data = pix.tobytes("png")
        
        # 获取渲染后的图片尺寸
        img_width = pix.width
        img_height = pix.height
        
        # 清理资源
        pix = None
        page = None
        pdf_doc.close()
        pdf_doc = None
        
        # 返回base64编码的图片
        img_base64 = base64.b64encode(img_data).decode('utf-8')
        
        return jsonify({
            'image': f"data:image/png;base64,{img_base64}",
            'width': img_width,
            'height': img_height,
            'page_width': page_width,
            'page_height': page_height
        })
        
    except Exception as e:
        # 确保资源被正确释放
        if pdf_doc:
            try:
                pdf_doc.close()
            except:
                pass
        return jsonify({'error': f'获取PDF页面失败: {str(e)}'}), 500

@app.route('/api/stamps/<session_id>')
def get_stamps_info(session_id):
    """获取签章信息"""
    try:
        stamps_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'stamps')
        if not os.path.exists(stamps_dir):
            return jsonify({'stamps': []})
        
        stamp_files = [f for f in os.listdir(stamps_dir) if f.startswith(session_id)]
        stamps = []
        
        for stamp_file in stamp_files:
            # 解析文件名格式: session_id_stamp_id_filename
            parts = stamp_file.split('_', 2)
            if len(parts) >= 3:
                stamp_id = parts[1]
                original_filename = parts[2]
                stamp_path = os.path.join(stamps_dir, stamp_file)
                
                # 获取图片尺寸
                try:
                    with Image.open(stamp_path) as img:
                        width, height = img.size
                except:
                    width, height = 100, 100  # 默认尺寸
                
                stamps.append({
                    'id': f'stamp_{stamp_id}',
                    'filename': original_filename,
                    'url': url_for('get_stamp', session_id=session_id, stamp_id=int(stamp_id)),
                    'width': width,
                    'height': height
                })
        
        # 按stamp_id排序
        stamps.sort(key=lambda x: int(x['id'].split('_')[1]))
        
        return jsonify({'stamps': stamps})
        
    except Exception as e:
        return jsonify({'error': f'获取签章信息失败: {str(e)}'}), 500

@app.route('/api/stamp/<session_id>/<int:stamp_id>')
def get_stamp(session_id, stamp_id):
    """获取签章图片"""
    try:
        stamp_files = [f for f in os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], 'stamps')) 
                      if f.startswith(f"{session_id}_{stamp_id}_")]
        
        if not stamp_files:
            return jsonify({'error': '签章图片未找到'}), 404
            
        stamp_path = os.path.join(app.config['UPLOAD_FOLDER'], 'stamps', stamp_files[0])
        
        if not os.path.exists(stamp_path):
            return jsonify({'error': '签章图片文件不存在'}), 404
            
        return send_file(stamp_path)
        
    except Exception as e:
        return jsonify({'error': f'获取签章图片失败: {str(e)}'}), 500

@app.route('/api/apply_stamps', methods=['POST'])
def apply_stamps():
    """应用签章到PDF"""
    try:
        data = request.json
        session_id = data.get('session_id')
        stamps_data = data.get('stamps', [])
        apply_mode = data.get('apply_mode', 'current_page')  # current_page 或 all_pages
        current_page = data.get('current_page', 1)
        random_variation = data.get('random_variation', False)
        
        # 查找PDF文件
        pdf_files = [f for f in os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs')) 
                    if f.startswith(session_id)]
        
        if not pdf_files:
            return jsonify({'error': 'PDF文件未找到'}), 404
            
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs', pdf_files[0])
        
        # 打开PDF文档
        pdf_doc = None
        try:
            pdf_doc = fitz.open(pdf_path)
            
            # 根据应用模式处理
            if apply_mode == 'current_page':
                pages_to_process = [current_page - 1]
            else:  # all_pages
                pages_to_process = list(range(pdf_doc.page_count))
            
            # 处理每个页面
            for page_idx in pages_to_process:
                page = pdf_doc[page_idx]
                
                for stamp_data in stamps_data:
                    # 获取签章图片
                    stamp_id = stamp_data['stamp_id'].split('_')[1]
                    stamp_files = [f for f in os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], 'stamps')) 
                                  if f.startswith(f"{session_id}_{stamp_id}_")]
                    
                    if not stamp_files:
                        continue
                        
                    stamp_path = os.path.join(app.config['UPLOAD_FOLDER'], 'stamps', stamp_files[0])
                    
                    # 检查签章文件是否存在
                    if not os.path.exists(stamp_path):
                        continue
                    
                    # 计算位置和大小
                    x = stamp_data['x']
                    y = stamp_data['y']
                    width = stamp_data['width']
                    height = stamp_data['height']
                    rotation = stamp_data.get('rotation', 0)
                    
                    # 如果是应用到所有页面且启用了随机变化
                    if apply_mode == 'all_pages' and random_variation and page_idx > pages_to_process[0]:
                        # 添加随机位移 (±5像素)
                        x += random.uniform(-5, 5)
                        y += random.uniform(-5, 5)
                        # 添加随机旋转 (±3度)
                        rotation += random.uniform(-3, 3)
                    
                    # 创建矩形区域
                    rect = fitz.Rect(x, y, x + width, y + height)
                    
                    # 插入图片
                    try:
                        page.insert_image(rect, filename=stamp_path, rotate=rotation)
                    except Exception as img_error:
                        print(f"插入图片失败: {img_error}")
                        continue
            
        # 保存结果PDF
        result_filename = f"{session_id}_signed.pdf"
        result_path = os.path.join(app.config['UPLOAD_FOLDER'], 'results', result_filename)
        pdf_doc.save(result_path)
        
        # 同时保存到pdfs目录以便预览
        signed_pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs', f"{session_id}_signed_preview.pdf")
        pdf_doc.save(signed_pdf_path)
        
        pdf_doc.close()
        pdf_doc = None
            
        except Exception as pdf_error:
            if pdf_doc:
                try:
                    pdf_doc.close()
                except:
                    pass
            raise pdf_error
        
        # 生成新的会话ID用于签章后的PDF
        signed_session_id = f"{session_id}_signed"
        
        return jsonify({
            'success': True,
            'signed_session_id': signed_session_id,
            'download_url': url_for('download_result', session_id=session_id)
        })
        
    except Exception as e:
        return jsonify({'error': f'应用签章失败: {str(e)}'}), 500

@app.route('/download/<session_id>')
def download_result(session_id):
    """下载签章后的PDF"""
    try:
        result_filename = f"{session_id}_signed.pdf"
        result_path = os.path.join(app.config['UPLOAD_FOLDER'], 'results', result_filename)
        
        if not os.path.exists(result_path):
            return jsonify({'error': '结果文件未找到'}), 404
            
        return send_file(result_path, as_attachment=True, download_name='signed_document.pdf')
        
    except Exception as e:
        return jsonify({'error': f'下载失败: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
