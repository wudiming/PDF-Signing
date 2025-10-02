# PDF-Signing - PDF签章系统

一个基于Python Flask的Web应用程序，用于在PDF文档上添加数字签章。支持多步骤交互界面，可以拖拽、缩放、旋转签章图片，并应用到PDF文档的指定页面或整个文档。

## 功能特性

- 📄 **PDF文档上传**: 支持上传PDF文档进行签章处理
- 🖼️ **多签章支持**: 可上传多张签章图片（建议PNG透明背景）
- 🎯 **精确定位**: 拖拽签章到PDF指定位置
- 🔄 **自由变换**: 支持签章的缩放、旋转操作
- ⚙️ **精确设置**: 双击签章可精确设置位置、大小和角度
- 📖 **多页面支持**: 可在不同PDF页面间切换编辑
- 🎲 **随机变化**: 应用到整个文档时可添加随机位移和旋转
- 💾 **灵活应用**: 支持仅应用到当前页或整个文档

## 技术栈

- **后端**: Python 3.7+, Flask 2.3+
- **PDF处理**: PyMuPDF (fitz)
- **图像处理**: Pillow
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **UI框架**: Bootstrap 5
- **图标**: Font Awesome 6

## 安装说明

### 1. 克隆项目

```bash
git clone <repository-url>
cd PDF-Signing
```

### 2. 创建虚拟环境（推荐）

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 运行应用

```bash
python app.py
```

应用将在 `http://localhost:5000` 启动。

## 使用指南

### 步骤1: 上传文件
1. 选择需要签章的PDF文档
2. 选择一张或多张签章图片（支持PNG、JPG格式，建议使用透明背景PNG）
3. 点击"下一步"进入编辑界面

### 步骤2: 编辑签章
1. **添加签章**: 从左侧签章列表拖拽图片到PDF页面上
2. **调整位置**: 拖拽签章到合适位置
3. **调整大小**: 拖拽签章四角的控制点进行缩放
4. **旋转签章**: 拖拽签章顶部的绿色圆点进行旋转
5. **精确设置**: 双击签章打开精确设置对话框
6. **页面切换**: 使用页面导航在不同页面间切换

### 步骤3: 应用签章
1. **选择应用模式**:
   - 仅当前页: 只在当前查看的页面应用签章
   - 整个文档: 在所有页面应用签章
2. **随机变化**: 应用到整个文档时，可启用随机位移和旋转
3. 点击"应用签章"生成最终PDF
4. 下载签章后的PDF文档

## 项目结构

```
PDF-Signing/
├── app.py                 # Flask主应用
├── requirements.txt       # Python依赖
├── README.md             # 项目说明
├── templates/            # HTML模板
│   ├── base.html         # 基础模板
│   ├── upload.html       # 文件上传页面
│   └── editor.html       # 签章编辑页面
├── static/               # 静态资源
│   ├── css/
│   │   └── style.css     # 样式文件
│   └── js/
│       ├── common.js     # 公共JavaScript函数
│       └── editor.js     # 签章编辑器
└── uploads/              # 文件上传目录
    ├── pdfs/             # PDF文件
    ├── stamps/           # 签章图片
    └── results/          # 处理结果
```

## API接口

### 文件上传
- `POST /upload` - 上传PDF和签章文件

### PDF操作
- `GET /api/pdf/<session_id>/page/<page_num>` - 获取PDF页面图片
- `GET /api/stamp/<session_id>/<stamp_id>` - 获取签章图片

### 签章处理
- `POST /api/apply_stamps` - 应用签章到PDF
- `GET /download/<session_id>` - 下载处理后的PDF

## 配置说明

### 环境变量
- `SECRET_KEY`: Flask密钥（生产环境请修改）
- `MAX_CONTENT_LENGTH`: 最大文件上传大小（默认50MB）

### 文件格式支持
- **PDF**: .pdf
- **签章图片**: .png, .jpg, .jpeg（推荐PNG透明背景）

## 开发建议

### 针对不同页面尺寸的处理方案

对于您提到的不同页面尺寸问题，我建议以下解决方案：

1. **标准化坐标系统**: 使用相对坐标而非绝对像素坐标
2. **智能识别**: 可以集成OCR技术识别签章位置标识
3. **模板匹配**: 为常见文档类型创建签章位置模板
4. **比例缩放**: 根据页面尺寸自动调整签章大小和位置

### 扩展功能建议

- 批量处理多个PDF文档
- 签章模板管理
- 用户权限管理
- 签章历史记录
- 水印添加功能

## 故障排除

### 常见问题

1. **上传失败**: 检查文件大小是否超过限制
2. **PDF显示异常**: 确保PDF文件未损坏且格式正确
3. **签章不显示**: 检查图片格式是否支持
4. **应用失败**: 查看控制台错误信息

### 日志查看

应用运行时会在控制台输出详细日志，有助于问题诊断。

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者

---

**注意**: 这是一个基础版本，适合快速部署和测试。生产环境使用时请考虑安全性、性能优化和错误处理等方面的改进。
