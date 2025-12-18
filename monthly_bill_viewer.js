// ==UserScript==
// @name         本月账单查看器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  查看本月的账单信息
// @author       You
// @match        https://codehub-g.huawei.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置
    const CONFIG = {
        AUTO_CLOSE_DELAY: 5000 // 5秒后自动关闭
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
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            startDateStr: startDate.toLocaleDateString('zh-CN'),
            endDateStr: endDate.toLocaleDateString('zh-CN')
        };
    }
    
    // 创建弹层
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'bill-viewer-modal';
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
            max-width: 600px;
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
        title.textContent = '本月账单';
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
            font-size: 24px;
        `;
        
        const loadingText = document.createElement('p');
        loadingText.textContent = '正在获取账单数据...';
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
    
    // 获取账单信息
    async function fetchBillInfo() {
        const dateRange = getCurrentMonthDateRange();
        
        // 这里可以根据实际需求调用相应的API
        // 目前返回模拟数据作为示例
        try {
            // TODO: 替换为实际的账单API调用
            // const response = await fetch('实际的账单API地址', {
            //     method: 'GET',
            //     headers: getRequestHeaders(),
            //     credentials: 'include'
            // });
            
            // 模拟数据
            return {
                success: true,
                month: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
                startDate: dateRange.startDateStr,
                endDate: dateRange.endDateStr,
                totalAmount: 0,
                items: []
            };
        } catch (error) {
            console.error('获取账单数据失败:', error);
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
            const billInfo = document.createElement('div');
            billInfo.innerHTML = `
                <div style="text-align: left; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
                        <strong>账单月份:</strong> ${result.month}
                    </p>
                    <p style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
                        <strong>统计周期:</strong> ${result.startDate} 至 ${result.endDate}
                    </p>
                    <p style="margin: 0 0 20px 0; color: #007bff; font-size: 24px; font-weight: bold; text-align: center; padding-top: 10px; border-top: 1px solid #eee;">
                        总金额: ¥${result.totalAmount.toFixed(2)}
                    </p>
                </div>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    此弹层将在5秒后自动关闭
                </p>
            `;
            content.appendChild(billInfo);
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
    async function showBillInfo() {
        // 创建弹层
        const { modal, content, loadingText, closeModal } = createModal();
        document.body.appendChild(modal);
        
        // 获取数据
        const result = await fetchBillInfo();
        
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
            document.addEventListener('DOMContentLoaded', showBillInfo);
        } else {
            // 稍微延迟以确保页面元素都已渲染
            setTimeout(showBillInfo, 1000);
        }
    }
    
    // 启动脚本
    init();
    
})();
