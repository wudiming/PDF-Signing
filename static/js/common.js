// PDF签章系统 - 公共JavaScript函数

// 显示加载模态框
function showLoading() {
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadingModal.show();
}

// 隐藏加载模态框
function hideLoading() {
    const loadingModal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
    if (loadingModal) {
        loadingModal.hide();
    }
}

// 显示警告消息
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // 自动隐藏
    if (duration > 0) {
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                const alert = bootstrap.Alert.getInstance(alertElement);
                if (alert) {
                    alert.close();
                }
            }
        }, duration);
    }
}

// 获取警告图标
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 防抖函数
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 获取元素相对于页面的位置
function getElementOffset(element) {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.pageYOffset,
        left: rect.left + window.pageXOffset,
        width: rect.width,
        height: rect.height
    };
}

// 检查点是否在矩形内
function isPointInRect(point, rect) {
    return point.x >= rect.left && 
           point.x <= rect.left + rect.width && 
           point.y >= rect.top && 
           point.y <= rect.top + rect.height;
}

// 限制数值在指定范围内
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// 角度转弧度
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// 弧度转角度
function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

// 计算两点间距离
function distance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// 计算两点间角度
function angle(center, point) {
    return Math.atan2(point.y - center.y, point.x - center.x);
}

// 深拷贝对象
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 检查是否为移动设备
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 获取触摸或鼠标事件的坐标
function getEventCoordinates(event) {
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    } else {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }
}

// 添加事件监听器（支持移动端）
function addEventListeners(element, events, handler, options = {}) {
    events.forEach(event => {
        element.addEventListener(event, handler, options);
    });
}

// 移除事件监听器（支持移动端）
function removeEventListeners(element, events, handler, options = {}) {
    events.forEach(event => {
        element.removeEventListener(event, handler, options);
    });
}

// 获取鼠标/触摸事件名称
function getEventNames() {
    if (isMobile()) {
        return {
            start: 'touchstart',
            move: 'touchmove',
            end: 'touchend'
        };
    } else {
        return {
            start: 'mousedown',
            move: 'mousemove',
            end: 'mouseup'
        };
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化工具提示
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // 初始化弹出框
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});
