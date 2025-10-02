// PDF签章编辑器类
class PDFEditor {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.currentPage = 1;
        this.totalPages = 0;
        this.pdfInfo = null;
        this.stamps = [];
        this.stampsOnPdf = [];
        this.selectedStamp = null;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.rotationCenter = null;
        this.initialRotation = 0;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadPdfInfo();
            await this.loadStamps();
            await this.loadPdfPage(this.currentPage);
            this.setupEventListeners();
            this.updatePageNavigation();
        } catch (error) {
            console.error('初始化失败:', error);
            showAlert('初始化失败: ' + error.message, 'danger');
        }
    }
    
    async loadPdfInfo() {
        try {
            // 从后端获取PDF信息
            const response = await fetch(`/api/pdf/${this.sessionId}/info`);
            if (response.ok) {
                const data = await response.json();
                this.pdfInfo = data.pdf_info;
                this.totalPages = this.pdfInfo.page_count;
            } else {
                // 如果API不存在，使用默认值
                this.pdfInfo = {
                    page_count: 1,
                    pages: [{
                        page_num: 1,
                        width: 595,
                        height: 842
                    }]
                };
                this.totalPages = 1;
            }
        } catch (error) {
            console.warn('无法获取PDF信息，使用默认值:', error);
            // 使用默认值
            this.pdfInfo = {
                page_count: 1,
                pages: [{
                    page_num: 1,
                    width: 595,
                    height: 842
                }]
            };
            this.totalPages = 1;
        }
    }
    
    async loadStamps() {
        try {
            // 从后端获取签章信息
            const response = await fetch(`/api/stamps/${this.sessionId}`);
            if (response.ok) {
                const data = await response.json();
                this.stamps = data.stamps || [];
            } else {
                // 如果API不存在，使用默认的签章数据
                this.stamps = [
                    {
                        id: 'stamp_0',
                        filename: 'stamp1.png',
                        url: '/api/stamp/' + this.sessionId + '/0',
                        width: 100,
                        height: 100
                    },
                    {
                        id: 'stamp_1',
                        filename: 'stamp2.png',
                        url: '/api/stamp/' + this.sessionId + '/1',
                        width: 120,
                        height: 80
                    }
                ];
            }
        } catch (error) {
            console.warn('无法获取签章信息，使用默认值:', error);
            // 使用默认签章数据
            this.stamps = [
                {
                    id: 'stamp_0',
                    filename: 'stamp1.png',
                    url: '/api/stamp/' + this.sessionId + '/0',
                    width: 100,
                    height: 100
                }
            ];
        }
        
        this.renderStampList();
    }
    
    renderStampList() {
        const stampList = document.getElementById('stampList');
        stampList.innerHTML = '';
        
        this.stamps.forEach(stamp => {
            const stampDiv = document.createElement('div');
            stampDiv.className = 'stamp-item p-2 border rounded';
            stampDiv.draggable = true;
            stampDiv.dataset.stampId = stamp.id;
            
            stampDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${stamp.url}" alt="${stamp.filename}" 
                         style="width: 40px; height: 40px; object-fit: contain;" class="me-2">
                    <div class="flex-grow-1">
                        <div class="small fw-bold">${stamp.filename}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">
                            ${stamp.width} × ${stamp.height}
                        </div>
                    </div>
                </div>
            `;
            
            // 添加拖拽事件
            stampDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', stamp.id);
                stampDiv.classList.add('dragging');
            });
            
            stampDiv.addEventListener('dragend', () => {
                stampDiv.classList.remove('dragging');
            });
            
            stampList.appendChild(stampDiv);
        });
    }
    
    async loadPdfPage(pageNum) {
        try {
            showLoading();
            
            // 模拟PDF页面加载
            const response = await fetch(`/api/pdf/${this.sessionId}/page/${pageNum}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const pdfPage = document.getElementById('pdfPage');
            pdfPage.innerHTML = `
                <img src="${data.image}" alt="PDF Page ${pageNum}" 
                     style="width: 100%; height: auto; display: block;">
            `;
            
            // 设置页面尺寸信息
            pdfPage.dataset.pageWidth = data.page_width;
            pdfPage.dataset.pageHeight = data.page_height;
            pdfPage.dataset.displayWidth = data.width;
            pdfPage.dataset.displayHeight = data.height;
            
            // 重新渲染当前页面上的签章
            this.renderStampsOnPage();
            
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error('加载PDF页面失败:', error);
            showAlert('加载PDF页面失败: ' + error.message, 'danger');
        }
    }
    
    setupEventListeners() {
        // 页面导航
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadPdfPage(this.currentPage);
                this.updatePageNavigation();
            }
        });
        
        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadPdfPage(this.currentPage);
                this.updatePageNavigation();
            }
        });
        
        // 页码输入跳转
        const pageInput = document.getElementById('pageInput');
        pageInput.addEventListener('change', () => {
            const targetPage = parseInt(pageInput.value);
            if (targetPage >= 1 && targetPage <= this.totalPages && targetPage !== this.currentPage) {
                this.currentPage = targetPage;
                this.loadPdfPage(this.currentPage);
                this.updatePageNavigation();
            } else {
                // 恢复当前页码
                pageInput.value = this.currentPage;
            }
        });
        
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                pageInput.blur(); // 触发change事件
            }
        });
        
        // PDF容器拖放事件
        const pdfContainer = document.getElementById('pdfContainer');
        
        pdfContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            pdfContainer.classList.add('drop-zone', 'drag-over');
        });
        
        pdfContainer.addEventListener('dragleave', (e) => {
            if (!pdfContainer.contains(e.relatedTarget)) {
                pdfContainer.classList.remove('drop-zone', 'drag-over');
            }
        });
        
        pdfContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            pdfContainer.classList.remove('drop-zone', 'drag-over');
            
            const stampId = e.dataTransfer.getData('text/plain');
            const stamp = this.stamps.find(s => s.id === stampId);
            
            if (stamp) {
                const rect = pdfContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.addStampToPdf(stamp, x, y);
            }
        });
        
        // 应用签章按钮
        document.getElementById('applyStamps').addEventListener('click', () => {
            this.applyStamps();
        });
        
        // 清除所有按钮
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllStamps();
        });
        
        // 下载PDF按钮
        document.getElementById('downloadPdf').addEventListener('click', () => {
            if (this.downloadUrl) {
                window.location.href = this.downloadUrl;
            }
        });
        
        // 精确设置模态框
        this.setupPreciseSettingsModal();
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedStamp) {
                this.removeStampFromPdf(this.selectedStamp);
            }
        });
    }
    
    updatePageNavigation() {
        document.getElementById('pageInput').value = this.currentPage;
        document.getElementById('pageInput').max = this.totalPages;
        document.getElementById('totalPages').textContent = this.totalPages;
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= this.totalPages;
        
        const progress = (this.currentPage / this.totalPages) * 100;
        document.getElementById('pageProgress').style.width = progress + '%';
    }
    
    addStampToPdf(stamp, x, y) {
        const stampOnPdf = {
            id: generateId(),
            stampId: stamp.id,
            stamp: stamp,
            page: this.currentPage,
            x: x,
            y: y,
            width: stamp.width, // 保持原始大小
            height: stamp.height, // 保持原始大小
            rotation: 0,
            maintainAspectRatio: true // 默认保持纵横比
        };
        
        this.stampsOnPdf.push(stampOnPdf);
        this.renderStampOnPdf(stampOnPdf);
    }
    
    renderStampOnPdf(stampOnPdf) {
        const pdfPage = document.getElementById('pdfPage');
        
        const stampElement = document.createElement('div');
        stampElement.className = 'stamp-on-pdf';
        stampElement.dataset.stampId = stampOnPdf.id;
        
        stampElement.style.left = stampOnPdf.x + 'px';
        stampElement.style.top = stampOnPdf.y + 'px';
        stampElement.style.width = stampOnPdf.width + 'px';
        stampElement.style.height = stampOnPdf.height + 'px';
        stampElement.style.transform = `rotate(${stampOnPdf.rotation}deg)`;
        
        stampElement.innerHTML = `
            <img src="${stampOnPdf.stamp.url}" alt="${stampOnPdf.stamp.filename}" 
                 style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
            <div class="resize-handle nw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle se"></div>
            <div class="rotate-handle"></div>
        `;
        
        // 添加事件监听器
        this.setupStampEvents(stampElement, stampOnPdf);
        
        pdfPage.appendChild(stampElement);
    }
    
    renderStampsOnPage() {
        // 清除现有的签章元素
        const existingStamps = document.querySelectorAll('.stamp-on-pdf');
        existingStamps.forEach(stamp => stamp.remove());
        
        // 渲染当前页面的签章
        const pageStamps = this.stampsOnPdf.filter(stamp => stamp.page === this.currentPage);
        pageStamps.forEach(stamp => this.renderStampOnPdf(stamp));
    }
    
    setupStampEvents(stampElement, stampOnPdf) {
        const eventNames = getEventNames();
        
        // 选择事件
        stampElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectStamp(stampOnPdf);
        });
        
        // 双击精确设置
        stampElement.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.showPreciseSettings(stampOnPdf);
        });
        
        // 拖拽事件
        stampElement.addEventListener(eventNames.start, (e) => {
            e.preventDefault();
            const coords = getEventCoordinates(e);
            
            if (e.target.classList.contains('resize-handle')) {
                this.startResize(stampOnPdf, e.target.classList[1], coords);
            } else if (e.target.classList.contains('rotate-handle')) {
                this.startRotation(stampOnPdf, coords);
            } else {
                this.startDrag(stampOnPdf, coords);
            }
        });
        
        // 全局移动和结束事件
        document.addEventListener(eventNames.move, (e) => {
            if (this.isDragging || this.isResizing || this.isRotating) {
                e.preventDefault();
                const coords = getEventCoordinates(e);
                
                if (this.isDragging) {
                    this.updateDrag(coords);
                } else if (this.isResizing) {
                    this.updateResize(coords);
                } else if (this.isRotating) {
                    this.updateRotation(coords);
                }
            }
        });
        
        document.addEventListener(eventNames.end, () => {
            this.endInteraction();
        });
    }
    
    selectStamp(stampOnPdf) {
        // 取消之前的选择
        document.querySelectorAll('.stamp-on-pdf.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 选择当前签章
        const stampElement = document.querySelector(`[data-stamp-id="${stampOnPdf.id}"]`);
        if (stampElement) {
            stampElement.classList.add('selected');
            this.selectedStamp = stampOnPdf;
        }
    }
    
    startDrag(stampOnPdf, coords) {
        this.isDragging = true;
        this.selectedStamp = stampOnPdf;
        
        const stampElement = document.querySelector(`[data-stamp-id="${stampOnPdf.id}"]`);
        const rect = stampElement.getBoundingClientRect();
        
        this.dragOffset = {
            x: coords.x - rect.left,
            y: coords.y - rect.top
        };
    }
    
    updateDrag(coords) {
        if (!this.selectedStamp) return;
        
        const pdfContainer = document.getElementById('pdfContainer');
        const containerRect = pdfContainer.getBoundingClientRect();
        
        const newX = coords.x - containerRect.left - this.dragOffset.x;
        const newY = coords.y - containerRect.top - this.dragOffset.y;
        
        // 限制在容器内
        const clampedX = clamp(newX, 0, containerRect.width - this.selectedStamp.width);
        const clampedY = clamp(newY, 0, containerRect.height - this.selectedStamp.height);
        
        this.selectedStamp.x = clampedX;
        this.selectedStamp.y = clampedY;
        
        const stampElement = document.querySelector(`[data-stamp-id="${this.selectedStamp.id}"]`);
        stampElement.style.left = clampedX + 'px';
        stampElement.style.top = clampedY + 'px';
    }
    
    startResize(stampOnPdf, handle, coords) {
        this.isResizing = true;
        this.selectedStamp = stampOnPdf;
        this.resizeHandle = handle;
        this.initialCoords = coords;
        this.initialSize = {
            width: stampOnPdf.width,
            height: stampOnPdf.height,
            x: stampOnPdf.x,
            y: stampOnPdf.y
        };
    }
    
    updateResize(coords) {
        if (!this.selectedStamp || !this.resizeHandle) return;
        
        const dx = coords.x - this.initialCoords.x;
        const dy = coords.y - this.initialCoords.y;
        
        let newWidth = this.initialSize.width;
        let newHeight = this.initialSize.height;
        let newX = this.initialSize.x;
        let newY = this.initialSize.y;
        
        // 计算原始纵横比
        const aspectRatio = this.initialSize.width / this.initialSize.height;
        const maintainAspectRatio = this.selectedStamp.maintainAspectRatio !== false;
        
        switch (this.resizeHandle) {
            case 'se': // 右下角
                if (maintainAspectRatio) {
                    const avgDelta = (dx + dy) / 2;
                    newWidth = Math.max(20, this.initialSize.width + avgDelta);
                    newHeight = Math.max(20, newWidth / aspectRatio);
                } else {
                    newWidth = Math.max(20, this.initialSize.width + dx);
                    newHeight = Math.max(20, this.initialSize.height + dy);
                }
                break;
            case 'sw': // 左下角
                if (maintainAspectRatio) {
                    const avgDelta = (-dx + dy) / 2;
                    newWidth = Math.max(20, this.initialSize.width + avgDelta);
                    newHeight = Math.max(20, newWidth / aspectRatio);
                    newX = this.initialSize.x + (this.initialSize.width - newWidth);
                } else {
                    newWidth = Math.max(20, this.initialSize.width - dx);
                    newHeight = Math.max(20, this.initialSize.height + dy);
                    newX = this.initialSize.x + dx;
                }
                break;
            case 'ne': // 右上角
                if (maintainAspectRatio) {
                    const avgDelta = (dx - dy) / 2;
                    newWidth = Math.max(20, this.initialSize.width + avgDelta);
                    newHeight = Math.max(20, newWidth / aspectRatio);
                    newY = this.initialSize.y + (this.initialSize.height - newHeight);
                } else {
                    newWidth = Math.max(20, this.initialSize.width + dx);
                    newHeight = Math.max(20, this.initialSize.height - dy);
                    newY = this.initialSize.y + dy;
                }
                break;
            case 'nw': // 左上角
                if (maintainAspectRatio) {
                    const avgDelta = (-dx - dy) / 2;
                    newWidth = Math.max(20, this.initialSize.width + avgDelta);
                    newHeight = Math.max(20, newWidth / aspectRatio);
                    newX = this.initialSize.x + (this.initialSize.width - newWidth);
                    newY = this.initialSize.y + (this.initialSize.height - newHeight);
                } else {
                    newWidth = Math.max(20, this.initialSize.width - dx);
                    newHeight = Math.max(20, this.initialSize.height - dy);
                    newX = this.initialSize.x + dx;
                    newY = this.initialSize.y + dy;
                }
                break;
        }
        
        this.selectedStamp.width = newWidth;
        this.selectedStamp.height = newHeight;
        this.selectedStamp.x = newX;
        this.selectedStamp.y = newY;
        
        const stampElement = document.querySelector(`[data-stamp-id="${this.selectedStamp.id}"]`);
        stampElement.style.width = newWidth + 'px';
        stampElement.style.height = newHeight + 'px';
        stampElement.style.left = newX + 'px';
        stampElement.style.top = newY + 'px';
    }
    
    startRotation(stampOnPdf, coords) {
        this.isRotating = true;
        this.selectedStamp = stampOnPdf;
        
        const stampElement = document.querySelector(`[data-stamp-id="${stampOnPdf.id}"]`);
        const rect = stampElement.getBoundingClientRect();
        
        this.rotationCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        this.initialRotation = stampOnPdf.rotation;
        this.initialAngle = angle(this.rotationCenter, coords);
    }
    
    updateRotation(coords) {
        if (!this.selectedStamp || !this.rotationCenter) return;
        
        const currentAngle = angle(this.rotationCenter, coords);
        const deltaAngle = radToDeg(currentAngle - this.initialAngle);
        
        this.selectedStamp.rotation = this.initialRotation + deltaAngle;
        
        const stampElement = document.querySelector(`[data-stamp-id="${this.selectedStamp.id}"]`);
        stampElement.style.transform = `rotate(${this.selectedStamp.rotation}deg)`;
    }
    
    endInteraction() {
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.resizeHandle = null;
        this.rotationCenter = null;
    }
    
    setupPreciseSettingsModal() {
        const modal = document.getElementById('preciseSettingsModal');
        const applyBtn = document.getElementById('applyPreciseSettings');
        const rotationSlider = document.getElementById('stampRotation');
        const rotationValue = document.getElementById('rotationValue');
        
        rotationSlider.addEventListener('input', () => {
            rotationValue.textContent = rotationSlider.value + '°';
        });
        
        applyBtn.addEventListener('click', () => {
            if (!this.selectedStamp) return;
            
            const x = parseFloat(document.getElementById('stampX').value);
            const y = parseFloat(document.getElementById('stampY').value);
            const width = parseFloat(document.getElementById('stampWidth').value);
            const height = parseFloat(document.getElementById('stampHeight').value);
            const rotation = parseFloat(rotationSlider.value);
            const maintainAspectRatio = document.getElementById('maintainAspectRatio').checked;
            
            this.selectedStamp.x = x;
            this.selectedStamp.y = y;
            this.selectedStamp.width = width;
            this.selectedStamp.height = height;
            this.selectedStamp.rotation = rotation;
            this.selectedStamp.maintainAspectRatio = maintainAspectRatio;
            
            const stampElement = document.querySelector(`[data-stamp-id="${this.selectedStamp.id}"]`);
            stampElement.style.left = x + 'px';
            stampElement.style.top = y + 'px';
            stampElement.style.width = width + 'px';
            stampElement.style.height = height + 'px';
            stampElement.style.transform = `rotate(${rotation}deg)`;
            
            bootstrap.Modal.getInstance(modal).hide();
        });
    }
    
    showPreciseSettings(stampOnPdf) {
        this.selectStamp(stampOnPdf);
        
        document.getElementById('stampX').value = stampOnPdf.x.toFixed(1);
        document.getElementById('stampY').value = stampOnPdf.y.toFixed(1);
        document.getElementById('stampWidth').value = stampOnPdf.width.toFixed(1);
        document.getElementById('stampHeight').value = stampOnPdf.height.toFixed(1);
        document.getElementById('stampRotation').value = stampOnPdf.rotation;
        document.getElementById('rotationValue').textContent = stampOnPdf.rotation + '°';
        document.getElementById('maintainAspectRatio').checked = stampOnPdf.maintainAspectRatio !== false;
        
        const modal = new bootstrap.Modal(document.getElementById('preciseSettingsModal'));
        modal.show();
    }
    
    removeStampFromPdf(stampOnPdf) {
        const index = this.stampsOnPdf.findIndex(s => s.id === stampOnPdf.id);
        if (index > -1) {
            this.stampsOnPdf.splice(index, 1);
            
            const stampElement = document.querySelector(`[data-stamp-id="${stampOnPdf.id}"]`);
            if (stampElement) {
                stampElement.remove();
            }
            
            if (this.selectedStamp === stampOnPdf) {
                this.selectedStamp = null;
            }
        }
    }
    
    clearAllStamps() {
        if (confirm('确定要清除所有签章吗？')) {
            this.stampsOnPdf = [];
            document.querySelectorAll('.stamp-on-pdf').forEach(el => el.remove());
            this.selectedStamp = null;
        }
    }
    
    async applyStamps() {
        if (this.stampsOnPdf.length === 0) {
            showAlert('请先添加签章到PDF上', 'warning');
            return;
        }
        
        const applyMode = document.querySelector('input[name="applyMode"]:checked').value;
        const randomVariation = document.getElementById('randomVariation').checked;
        
        const stampsData = this.stampsOnPdf.map(stamp => ({
            stamp_id: stamp.stampId,
            x: stamp.x,
            y: stamp.y,
            width: stamp.width,
            height: stamp.height,
            rotation: stamp.rotation
        }));
        
        try {
            showLoading();
            
            const response = await fetch('/api/apply_stamps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    stamps: stampsData,
                    apply_mode: applyMode,
                    current_page: this.currentPage,
                    random_variation: randomVariation
                })
            });
            
            const data = await response.json();
            
            hideLoading();
            
            if (data.success) {
                showAlert('签章应用成功！正在更新预览...', 'success');
                
                // 保存下载链接
                this.downloadUrl = data.download_url;
                
                // 显示下载按钮
                document.getElementById('downloadPdf').style.display = 'block';
                
                // 更新会话ID为签章后的版本
                this.originalSessionId = this.sessionId;
                this.sessionId = this.sessionId + '_signed_preview';
                
                // 清除当前页面上的签章元素（因为现在PDF本身已包含签章）
                this.stampsOnPdf = [];
                document.querySelectorAll('.stamp-on-pdf').forEach(el => el.remove());
                
                // 重新加载当前页面以显示签章后的PDF
                setTimeout(() => {
                    this.loadPdfPage(this.currentPage);
                }, 500);
                
            } else {
                showAlert(data.error || '应用签章失败', 'danger');
            }
        } catch (error) {
            hideLoading();
            console.error('应用签章失败:', error);
            showAlert('应用签章失败: ' + error.message, 'danger');
        }
    }
}
