// ==UserScript==
// @name         CodeHub检视统计显示
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在CodeHub检视页面显示特定检视人的当月检视意见数量
// @author       You
// @match        https://codehub-g.huawei.com/groups/CBC-CRM/group_merge_review*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置
    const CONFIG = {
        PROPOSER_ID: '736', // 固定的检视人ID
        GROUP_ID: '17645',  // 从URL中提取的组ID
        AUTO_CLOSE_DELAY: 10000 // 10秒后自动关闭
    };
    
    // 获取当前月份的开始和结束时间
    function getCurrentMonthDateRange() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // 当月开始时间
        const startDate = new Date(year, month, 1, 0, 0, 0);
        // 当月结束时间
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        
        return {
            startDate: startDate.toString(),
            endDate: endDate.toString()
        };
    }
    
    // 创建弹层
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'review-stats-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            text-align: center;
            min-width: 400px;
            position: relative;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const title = document.createElement('h2');
        title.textContent = '检视统计';
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
            font-size: 24px;
        `;
        
        const loadingText = document.createElement('p');
        loadingText.textContent = '正在获取检视数据...';
        loadingText.style.cssText = `
            margin: 0;
            color: #666;
            font-size: 16px;
        `;
        
        content.appendChild(closeButton);
        content.appendChild(title);
        content.appendChild(loadingText);
        modal.appendChild(content);
        
        // 关闭事件
        const closeModal = () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        return { modal, content, loadingText, closeModal };
    }
    
    // 获取必要的请求头
    function getRequestHeaders() {
        // 从页面的cookie中获取必要的认证信息
        const cookies = document.cookie;
        
        // 尝试从页面中获取cftk token
        let cftkToken = '';
        const cftkMeta = document.querySelector('meta[name="csrf-token"]');
        if (cftkMeta) {
            cftkToken = cftkMeta.content;
        } else {
            // 从cookie中提取cftk
            const cftkMatch = cookies.match(/prod_cftk=([^;]+)/);
            if (cftkMatch) {
                cftkToken = cftkMatch[1];
            }
        }
        
        return {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json; charset=UTF-8',
            'Language': 'zh-cn',
            'Pragma': 'no-cache',
            'Request_From': 'PORTAL',
            'X-Language': 'zh-cn',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': window.location.href,
            ...(cftkToken && { 'cftk': cftkToken })
        };
    }
    
    // 调用API获取检视数据
    async function fetchReviewStats() {
        const dateRange = getCurrentMonthDateRange();
        const headers = getRequestHeaders();
        
        // 构建API URL
        const apiUrl = new URL(`https://codehub-g.huawei.com/codehub/v1/groups/${CONFIG.GROUP_ID}/reviews`);
        apiUrl.searchParams.set('noteable_type', 'MergeRequest');
        apiUrl.searchParams.set('proposer_id', CONFIG.PROPOSER_ID);
        apiUrl.searchParams.set('search', '');
        apiUrl.searchParams.set('start_date', dateRange.startDate);
        apiUrl.searchParams.set('end_date', dateRange.endDate);
        apiUrl.searchParams.set('include_reply', 'false');
        apiUrl.searchParams.set('review_categories', '');
        apiUrl.searchParams.set('resolved_status', 'all');
        apiUrl.searchParams.set('page', '1');
        apiUrl.searchParams.set('per_page', '10');
        apiUrl.searchParams.set('target_branch', '');
        apiUrl.searchParams.set('_', Date.now().toString());
        
        try {
            const response = await fetch(apiUrl.toString(), {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // 从响应头中获取总数
            const totalCount = response.headers.get('x-total') || '0';
            
            return {
                success: true,
                total: parseInt(totalCount, 10),
                month: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
            };
        } catch (error) {
            console.error('获取检视数据失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 更新弹层内容
    function updateModalContent(content, loadingText, result) {
        // 清除加载文本
        if (loadingText.parentNode) {
            loadingText.parentNode.removeChild(loadingText);
        }
        
        if (result.success) {
            const statsText = document.createElement('div');
            statsText.innerHTML = `
                <p style="margin: 0 0 15px 0; color: #333; font-size: 18px;">
                    <strong>检视人ID:</strong> ${CONFIG.PROPOSER_ID}
                </p>
                <p style="margin: 0 0 15px 0; color: #333; font-size: 18px;">
                    <strong>统计月份:</strong> ${result.month}
                </p>
                <p style="margin: 0 0 20px 0; color: #007bff; font-size: 24px; font-weight: bold;">
                    检视意见数量: ${result.total}
                </p>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    此弹层将在10秒后自动关闭
                </p>
            `;
            content.appendChild(statsText);
        } else {
            const errorText = document.createElement('div');
            errorText.innerHTML = `
                <p style="margin: 0 0 15px 0; color: #dc3545; font-size: 18px;">
                    <strong>获取数据失败</strong>
                </p>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                    错误信息: ${result.error}
                </p>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    请检查网络连接或权限设置
                </p>
            `;
            content.appendChild(errorText);
        }
    }
    
    // 主函数
    async function showReviewStats() {
        // 创建弹层
        const { modal, content, loadingText, closeModal } = createModal();
        document.body.appendChild(modal);
        
        // 获取数据
        const result = await fetchReviewStats();
        
        // 更新弹层内容
        updateModalContent(content, loadingText, result);
        
        // 设置自动关闭
        setTimeout(() => {
            closeModal();
        }, CONFIG.AUTO_CLOSE_DELAY);
    }
    
    // 页面加载完成后执行
    function init() {
        // 确保页面完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showReviewStats);
        } else {
            // 稍微延迟以确保页面元素都已渲染
            setTimeout(showReviewStats, 1000);
        }
    }
    
    // 启动脚本
    init();
    
})();