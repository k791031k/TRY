(function() {
    console.log('MainUI 開始載入...');
    
    // 防止重複加載 UI
    if (document.getElementById('myBookmarkletUI')) {
        document.getElementById('myBookmarkletUI').remove();
    }

    // --- 創建 UI 介面 ---
    const uiContainer = document.createElement('div');
    uiContainer.id = 'myBookmarkletUI';
    uiContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 800px;
        max-width: 95vw;
        max-height: 90vh;
        background: #ffffff;
        border: none;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05);
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #1a1a1a;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        resize: both;
        min-width: 600px;
        min-height: 100px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(20px);
    `;

    uiContainer.innerHTML = `
        <div class="header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            cursor: grab;
            position: relative;
            overflow: hidden;
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"50\" cy=\"10\" r=\"0.5\" fill=\"white\" opacity=\"0.05\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>');
                pointer-events: none;
            "></div>
            <h2 style="
                margin: 0; 
                font-size: 24px; 
                font-weight: 700; 
                color: white; 
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 12px;
                position: relative;
                z-index: 1;
            ">
                <span style="font-size: 28px;">🛠️</span>
                自動化工具箱
            </h2>
            <div style="display: flex; align-items: center; gap: 12px; position: relative; z-index: 1;">
                <!-- 功能按鈕組 -->
                <div style="
                    display: flex; 
                    gap: 8px; 
                    margin-right: 20px; 
                    padding-right: 20px; 
                    border-right: 2px solid rgba(255,255,255,0.2);
                ">
                    <button class="clear-btn" style="
                        background: rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        padding: 10px 16px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    " title="清除頁面 Cookie 和快取">
                        <span>🧹</span> 清除
                    </button>
                    
                    <button class="import-btn" style="
                        background: rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        padding: 10px 16px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    " title="匯入 JSON 檔案">
                        <span>📁</span> 匯入
                    </button>
                    
                    <button class="refresh-btn" style="
                        background: rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        padding: 10px 16px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    " title="重新載入資料">
                        <span>🔄</span> 重載
                    </button>
                </div>
                
                <!-- 控制按鈕組 -->
                <div style="display: flex; gap: 8px;">
                    <button class="toggle-btn" style="
                        background: rgba(255, 255, 255, 0.15);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: white;
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 8px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        transform: rotate(0deg);
                        font-size: 16px;
                    " title="收折/展開">&#x2303;</button>
                    
                    <button class="close-btn" style="
                        background: rgba(255, 255, 255, 0.15);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: white;
                        cursor: pointer;
                        padding: 8px 10px;
                        border-radius: 8px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        font-size: 18px;
                        line-height: 1;
                    " title="關閉工具">&times;</button>
                </div>
            </div>
        </div>
        
        <div class="content" style="
            padding: 30px;
            overflow-y: auto;
            flex-grow: 1;
            background: #fafbfc;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
        ">
            <div id="loadingStatus" style="
                text-align: center; 
                padding: 60px 30px; 
                color: #6b7280;
                font-size: 16px;
                font-weight: 500;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e5e7eb;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                載入功能列表中...
            </div>
            
            <div id="statsBar" style="
                display: none;
                background: white;
                padding: 15px 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                border: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
            ">
                <div style="display: flex; gap: 20px;">
                    <span style="color: #059669; font-weight: 600;">
                        ✅ 正常: <span id="successCount">0</span>
                    </span>
                    <span style="color: #dc2626; font-weight: 600;">
                        ❌ 錯誤: <span id="errorCount">0</span>
                    </span>
                    <span style="color: #6b7280; font-weight: 600;">
                        📊 總計: <span id="totalCount">0</span>
                    </span>
                </div>
                <button id="showErrorsBtn" style="
                    background: #fee2e2;
                    color: #dc2626;
                    border: 1px solid #fecaca;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    display: none;
                ">查看錯誤詳情</button>
            </div>
            
            <table id="functionTable" style="
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin-top: 5px;
                font-size: 14px;
                display: none;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                border: 1px solid #e5e7eb;
            ">
                <thead>
                    <tr style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
                        <th class="sortable" data-column="index" style="
                            padding: 18px 16px; 
                            text-align: left; 
                            color: #374151; 
                            font-weight: 700; 
                            cursor: pointer; 
                            user-select: none;
                            transition: all 0.2s ease;
                            border-bottom: 2px solid #e5e7eb;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        " title="點擊排序">
                            # <span class="sort-indicator" style="margin-left: 8px; color: #9ca3af;">↕</span>
                        </th>
                        <th class="sortable" data-column="id" style="
                            padding: 18px 16px; 
                            text-align: left; 
                            color: #374151; 
                            font-weight: 700; 
                            cursor: pointer; 
                            user-select: none;
                            transition: all 0.2s ease;
                            border-bottom: 2px solid #e5e7eb;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        " title="點擊排序">
                            功能名稱 <span class="sort-indicator" style="margin-left: 8px; color: #9ca3af;">↕</span>
                        </th>
                        <th class="sortable" data-column="description" style="
                            padding: 18px 16px; 
                            text-align: left; 
                            color: #374151; 
                            font-weight: 700; 
                            cursor: pointer; 
                            user-select: none;
                            transition: all 0.2s ease;
                            border-bottom: 2px solid #e5e7eb;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        " title="點擊排序">
                            說明 <span class="sort-indicator" style="margin-left: 8px; color: #9ca3af;">↕</span>
                        </th>
                        <th class="sortable" data-column="category" style="
                            padding: 18px 16px; 
                            text-align: left; 
                            color: #374151; 
                            font-weight: 700; 
                            cursor: pointer; 
                            user-select: none;
                            transition: all 0.2s ease;
                            border-bottom: 2px solid #e5e7eb;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        " title="點擊排序">
                            分類 <span class="sort-indicator" style="margin-left: 8px; color: #9ca3af;">↕</span>
                        </th>
                        <th style="
                            padding: 18px 16px; 
                            text-align: left; 
                            color: #374151; 
                            font-weight: 700;
                            border-bottom: 2px solid #e5e7eb;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">狀態</th>
                        <th style="
                            padding: 18px 16px; 
                            text-align: left; 
                            color: #374151; 
                            font-weight: 700;
                            border-bottom: 2px solid #e5e7eb;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">操作</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>
        
        <!-- 檔案匯入對話框 -->
        <input type="file" id="fileInput" accept=".json" style="display: none;">
        
        <!-- 錯誤詳情對話框 -->
        <div id="errorDialog" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: none;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 20px;
                width: 700px;
                max-width: 90vw;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            ">
                <h3 style="margin: 0 0 20px 0; color: #dc2626; font-size: 20px; font-weight: 700;">
                    ⚠️ 載入錯誤詳情
                </h3>
                <div id="errorList" style="
                    max-height: 400px;
                    overflow-y: auto;
                    margin-bottom: 20px;
                "></div>
                <div style="display: flex; justify-content: flex-end;">
                    <button id="closeErrorDialog" style="
                        padding: 12px 24px;
                        background: #6b7280;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: background-color 0.2s ease;
                    ">關閉</button>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .header button:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .sortable:hover {
                background: rgba(102, 126, 234, 0.1) !important;
            }
        </style>
    `;

    document.body.appendChild(uiContainer);

    // 定義工具函數
    function escapeHtml(unsafe) {
        if (unsafe === undefined || unsafe === null) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            padding: 16px 20px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 9999999;
            max-width: 350px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateX(100%);
            backdrop-filter: blur(10px);
            font-size: 14px;
            line-height: 1.4;
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }

    // 全域變數
    const functionTableBody = document.querySelector('#functionTable tbody');
    const functionTable = document.getElementById('functionTable');
    const loadingStatus = document.getElementById('loadingStatus');
    const statsBar = document.getElementById('statsBar');
    const fileInput = document.getElementById('fileInput');
    const errorDialog = document.getElementById('errorDialog');
    
    let originalData = [];
    let errorItems = [];
    let currentSortColumn = null;
    let currentSortDirection = 'asc';

    // 本地儲存管理
    const STORAGE_KEY = 'autoToolFunctions';
    
    function saveToLocalStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('儲存到 localStorage 失敗:', e);
            return false;
        }
    }
    
    function loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('從 localStorage 載入失敗:', e);
            return null;
        }
    }

    // 驗證單個功能項目
    function validateFunctionItem(item, index) {
        const errors = [];
        
        if (!item || typeof item !== 'object') {
            errors.push('項目格式錯誤');
            return { isValid: false, errors, item: null };
        }
        
        if (!item.id || typeof item.id !== 'string') {
            errors.push('缺少或無效的 id 欄位');
        }
        
        if (!item.action_script || typeof item.action_script !== 'string') {
            errors.push('缺少或無效的 action_script 欄位');
        } else {
            // 檢查腳本格式
            if (!item.action_script.startsWith('javascript:') && !item.action_script.startsWith('external:')) {
                errors.push('action_script 格式錯誤（應以 javascript: 或 external: 開頭）');
            }
        }
        
        // 補充預設值
        const validatedItem = {
            id: item.id || `未命名功能_${index + 1}`,
            description: item.description || '無說明',
            category: item.category || '未分類',
            type: item.type || 'action',
            action_script: item.action_script || '',
            originalIndex: index + 1,
            hasErrors: errors.length > 0,
            errors: errors
        };
        
        return {
            isValid: errors.length === 0,
            errors,
            item: validatedItem
        };
    }

    // 載入資料函數
    function loadFunctionData() {
        const timestamp = Date.now();
        const jsonUrls = [
            `https://cdn.jsdelivr.net/gh/k791031k/UAT/functions.js?v=${timestamp}`,
            `https://raw.githubusercontent.com/k791031k/UAT/main/functions.js?v=${timestamp}`
        ];

        loadingStatus.innerHTML = `
            <div style="
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            載入功能列表中...
        `;
        loadingStatus.style.display = 'block';
        functionTable.style.display = 'none';
        statsBar.style.display = 'none';
        
        console.log('開始載入功能資料...');

        async function tryLoadData() {
            // 先嘗試從本地儲存載入
            const localData = loadFromLocalStorage();
            if (localData && Array.isArray(localData) && localData.length > 0) {
                console.log('從本地儲存載入資料:', localData);
                processData(localData, '本地儲存');
                
                // 背景更新遠端資料
                tryRemoteLoad(true);
                return;
            }
            
            // 嘗試遠端載入
            await tryRemoteLoad(false);
        }
        
        async function tryRemoteLoad(isBackground = false) {
            for (let i = 0; i < jsonUrls.length; i++) {
                const url = jsonUrls[i];
                console.log(`嘗試載入 URL ${i + 1}:`, url);
                
                try {
                    if (!isBackground) {
                        loadingStatus.innerHTML = `
                            <div style="
                                width: 40px;
                                height: 40px;
                                border: 3px solid #e5e7eb;
                                border-top: 3px solid #667eea;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                                margin: 0 auto 20px;
                            "></div>
                            載入中... (嘗試 ${i + 1}/${jsonUrls.length})
                        `;
                    }
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('成功載入遠端資料:', data);

                    if (!Array.isArray(data)) {
                        throw new Error('資料格式錯誤：不是陣列格式');
                    }

                    // 儲存到本地
                    if (saveToLocalStorage(data)) {
                        if (isBackground) {
                            showNotification('資料已在背景更新', 'info');
                        } else {
                            showNotification('資料載入成功並已儲存', 'success');
                        }
                    }
                    
                    if (!isBackground) {
                        processData(data, '遠端載入');
                    }
                    return;

                } catch (error) {
                    console.error(`URL ${i + 1} 載入失敗:`, error);
                    
                    if (i === jsonUrls.length - 1 && !isBackground) {
                        // 所有遠端 URL 都失敗，檢查是否有本地資料
                        const localData = loadFromLocalStorage();
                        if (localData && Array.isArray(localData) && localData.length > 0) {
                            processData(localData, '本地備份');
                            showNotification('使用本地備份資料', 'info');
                        } else {
                            showLoadError(error.message);
                        }
                    }
                }
            }
        }

        tryLoadData();
    }
    
    function processData(rawData, source = '未知') {
        console.log(`開始處理資料，來源：${source}，原始資料:`, rawData);
        
        originalData = [];
        errorItems = [];
        
        if (!Array.isArray(rawData)) {
            showLoadError('資料格式錯誤：不是陣列格式');
            return;
        }
        
        // 逐項驗證和處理
        rawData.forEach((item, index) => {
            const validation = validateFunctionItem(item, index);
            
            if (validation.isValid) {
                originalData.push(validation.item);
            } else {
                // 即使有錯誤也加入列表，但標記為錯誤狀態
                originalData.push(validation.item);
                errorItems.push({
                    index: index + 1,
                    id: item.id || `項目_${index + 1}`,
                    errors: validation.errors
                });
            }
        });

        // 更新統計
        updateStats();
        
        // 顯示資料
        loadingStatus.style.display = 'none';
        functionTable.style.display = 'table';
        statsBar.style.display = 'flex';
        
        renderTable(originalData);
        bindSortEvents();
        
        console.log(`資料處理完成，正常：${originalData.length - errorItems.length}，錯誤：${errorItems.length}`);
        
        if (errorItems.length > 0) {
            showNotification(`載入完成，但有 ${errorItems.length} 個項目存在問題`, 'error', 5000);
        } else {
            showNotification(`成功載入 ${originalData.length} 個功能`, 'success');
        }
    }
    
    function updateStats() {
        const successCount = originalData.length - errorItems.length;
        const errorCount = errorItems.length;
        const totalCount = originalData.length;
        
        document.getElementById('successCount').textContent = successCount;
        document.getElementById('errorCount').textContent = errorCount;
        document.getElementById('totalCount').textContent = totalCount;
        
        const showErrorsBtn = document.getElementById('showErrorsBtn');
        if (errorCount > 0) {
            showErrorsBtn.style.display = 'block';
            showErrorsBtn.textContent = `查看 ${errorCount} 個錯誤`;
        } else {
            showErrorsBtn.style.display = 'none';
        }
    }
    
    function showLoadError(errorMessage) {
        loadingStatus.innerHTML = `
            <div style="color: #dc2626; text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <div style="font-weight: bold; margin-bottom: 15px; font-size: 20px;">載入失敗</div>
                <div style="margin-bottom: 15px; color: #6b7280;">無法載入功能資料</div>
                <div style="font-size: 13px; color: #9ca3af; margin-bottom: 30px; font-family: monospace;">
                    ${errorMessage}
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="document.querySelector('.import-btn').click()" style="
                        padding: 12px 24px; 
                        background: linear-gradient(135deg, #10b981, #059669); 
                        color: white; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: 600;
                    ">匯入檔案</button>
                    <button onclick="document.querySelector('.refresh-btn').click()" style="
                        padding: 12px 24px; 
                        background: linear-gradient(135deg, #3b82f6, #2563eb); 
                        color: white; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: 600;
                    ">重新嘗試</button>
                </div>
            </div>
        `;
    }

    // 渲染表格
    function renderTable(data) {
        functionTableBody.innerHTML = '';
        
        data.forEach((func, index) => {
            const row = functionTableBody.insertRow();
            const isError = func.hasErrors;
            
            row.style.cssText = `
                background-color: ${isError ? '#fef2f2' : (index % 2 === 0 ? '#fafbfc' : 'white')};
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border-bottom: 1px solid #f3f4f6;
            `;
            
            if (!isError) {
                row.onmouseover = () => {
                    row.style.backgroundColor = '#f0f9ff';
                    row.style.transform = 'scale(1.005)';
                    row.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                };
                row.onmouseout = () => {
                    row.style.backgroundColor = index % 2 === 0 ? '#fafbfc' : 'white';
                    row.style.transform = 'scale(1)';
                    row.style.boxShadow = 'none';
                };
            }

            const buttonType = func.type && ['action', 'utility', 'dangerous'].includes(func.type) ? func.type : 'action';
            
            // 狀態指示器
            const statusIndicator = isError 
                ? `<span style="
                    background: #fee2e2;
                    color: #dc2626;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                " title="${func.errors.join(', ')}">❌ 錯誤</span>`
                : `<span style="
                    background: #d1fae5;
                    color: #059669;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">✅ 正常</span>`;

            row.innerHTML = `
                <td style="padding: 16px; font-weight: 600; color: #6b7280;">${func.originalIndex}</td>
                <td style="padding: 16px; font-weight: 600; color: ${isError ? '#dc2626' : '#1f2937'};">
                    ${escapeHtml(func.id || '')}
                    ${isError ? '<br><small style="color: #dc2626; font-weight: 400;">⚠️ 配置錯誤</small>' : ''}
                </td>
                <td style="padding: 16px; color: #4b5563; line-height: 1.5;">
                    ${escapeHtml(func.description || '')}
                    ${isError ? `<br><small style="color: #dc2626; font-size: 12px;">錯誤：${func.errors.join(', ')}</small>` : ''}
                </td>
                <td style="padding: 16px;">
                    <span style="
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 16px;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">${escapeHtml(func.category || '')}</span>
                </td>
                <td style="padding: 16px;">
                    ${statusIndicator}
                </td>
                <td style="padding: 16px;">
                    <button class="execute-btn type-${buttonType}" 
                            data-script="${escapeHtml(func.action_script || '')}" 
                            ${isError ? 'disabled' : ''}
                            style="
                        padding: 10px 20px;
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: ${isError ? 'not-allowed' : 'pointer'};
                        font-size: 13px;
                        font-weight: 600;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        opacity: ${isError ? '0.5' : '1'};
                        ${isError ? 'background: #9ca3af;' : ''}
                    ">${isError ? '❌ 無法執行' : '▶️ 執行'}</button>
                </td>
            `;
        });

        bindButtonEvents();
    }

    // 綁定按鈕事件
    function bindButtonEvents() {
        functionTableBody.querySelectorAll('.execute-btn:not([disabled])').forEach(button => {
            const buttonType = button.classList.contains('type-utility') ? 'utility' :
                                 (button.classList.contains('type-dangerous') ? 'dangerous' : 'action');

            // 設定按鈕顏色
            let bgGradient;
            if (buttonType === 'utility') {
                bgGradient = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            } else if (buttonType === 'dangerous') {
                bgGradient = 'linear-gradient(135deg, #ef4444, #dc2626)';
            } else {
                bgGradient = 'linear-gradient(135deg, #10b981, #059669)';
            }
            
            button.style.background = bgGradient;

            button.addEventListener('mouseover', () => {
                button.style.transform = 'translateY(-2px) scale(1.05)';
                button.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
            });
            
            button.addEventListener('mouseout', () => {
                button.style.transform = 'translateY(0) scale(1)';
                button.style.boxShadow = 'none';
            });

            button.addEventListener('click', async (event) => {
                const scriptToExecute = event.target.dataset.script;
                
                try {
                    if (scriptToExecute.startsWith('javascript:')) {
                        const jsCode = scriptToExecute.substring(11);
                        (function() {
                            eval(jsCode);
                        })();
                        showNotification('功能執行成功', 'success');
                    } else if (scriptToExecute.startsWith('external:')) {
                        const scriptUrl = scriptToExecute.substring(9);
                        const externalScript = document.createElement('script');
                        externalScript.src = scriptUrl + '?v=' + Date.now();
                        externalScript.onload = () => {
                            console.log('外部腳本載入成功:', scriptUrl);
                            showNotification('外部腳本載入成功', 'success');
                        };
                        externalScript.onerror = () => {
                            console.error('外部腳本載入失敗:', scriptUrl);
                            showNotification('外部腳本載入失敗', 'error');
                        };
                        document.body.appendChild(externalScript);
                    } else {
                        throw new Error('不支援的腳本格式');
                    }
                } catch (e) {
                    console.error("執行功能腳本時發生錯誤:", e);
                    showNotification('執行失敗：' + e.message, 'error');
                }
                
                uiContainer.remove();
            });
        });
    }

    // 排序功能
    function sortTable(column) {
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc';
        }

        document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.textContent = '↕';
            indicator.style.color = '#9ca3af';
        });
        
        const currentIndicator = document.querySelector(`[data-column="${column}"] .sort-indicator`);
        if (currentIndicator) {
            currentIndicator.textContent = currentSortDirection === 'asc' ? '↑' : '↓';
            currentIndicator.style.color = '#667eea';
        }

        const sortedData = [...originalData].sort((a, b) => {
            let aVal = column === 'index' ? a.originalIndex : a[column] || '';
            let bVal = column === 'index' ? b.originalIndex : b[column] || '';
            
            if (column === 'index') {
                aVal = parseInt(aVal);
                bVal = parseInt(bVal);
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        renderTable(sortedData);
    }

    // 綁定排序事件
    function bindSortEvents() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                sortTable(header.dataset.column);
            });
        });
    }

    // 按鈕事件綁定
    
    // 關閉按鈕
    const closeBtn = document.querySelector('#myBookmarkletUI .close-btn');
    closeBtn.addEventListener('click', () => uiContainer.remove());

    // 重新載入按鈕
    const refreshBtn = document.querySelector('#myBookmarkletUI .refresh-btn');
    refreshBtn.addEventListener('click', () => {
        loadingStatus.style.display = 'block';
        functionTable.style.display = 'none';
        statsBar.style.display = 'none';
        loadFunctionData();
    });

    // 清除按鈕
    const clearBtn = document.querySelector('#myBookmarkletUI .clear-btn');
    clearBtn.addEventListener('click', () => {
        let clearedItems = [];
        let failedItems = [];
        
        try {
            document.cookie.split(';').forEach(c => {
                let i = c.indexOf('='), n = i > -1 ? c.substr(0, i) : c;
                document.cookie = n.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
            clearedItems.push('Cookies');
        } catch(e) { 
            failedItems.push('Cookies'); 
        }
        
        try { 
            localStorage.clear(); 
            clearedItems.push('localStorage'); 
        } catch(e) { 
            failedItems.push('localStorage'); 
        }
        
        try { 
            sessionStorage.clear(); 
            clearedItems.push('sessionStorage'); 
        } catch(e) { 
            failedItems.push('sessionStorage'); 
        }
        
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
                clearedItems.push('快取');
            });
        }
        
        const message = clearedItems.length > 0 
            ? `已清除：${clearedItems.join(', ')}` 
            : '清除失敗';
        const type = failedItems.length > 0 ? 'error' : 'success';
        
        showNotification(message, type);
    });

    // 匯入按鈕
    const importBtn = document.querySelector('#myBookmarkletUI .import-btn');
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // 檔案匯入處理
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.json')) {
            showNotification('請選擇 JSON 檔案', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) {
                    throw new Error('檔案內容必須是陣列格式');
                }

                if (saveToLocalStorage(data)) {
                    processData(data, '檔案匯入');
                    showNotification(`成功匯入 ${file.name}`, 'success');
                } else {
                    throw new Error('儲存失敗');
                }
            } catch (error) {
                showNotification('檔案格式錯誤：' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            showNotification('檔案讀取失敗', 'error');
        };
        
        reader.readAsText(file);
        
        // 清空檔案選擇
        fileInput.value = '';
    });

    // 錯誤詳情對話框
    document.getElementById('showErrorsBtn').addEventListener('click', () => {
        const errorList = document.getElementById('errorList');
        errorList.innerHTML = errorItems.map(error => `
            <div style="
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            ">
                <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px;">
                    項目 ${error.index}: ${escapeHtml(error.id)}
                </div>
                <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
                    ${error.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                </ul>
            </div>
        `).join('');
        
        errorDialog.style.display = 'flex';
    });

    document.getElementById('closeErrorDialog').addEventListener('click', () => {
        errorDialog.style.display = 'none';
    });

    errorDialog.addEventListener('click', (e) => {
        if (e.target === errorDialog) {
            errorDialog.style.display = 'none';
        }
    });

    // 收折功能
    const toggleBtn = document.querySelector('#myBookmarkletUI .toggle-btn');
    const contentDiv = document.querySelector('#myBookmarkletUI .content');
    let isContentVisible = true;

    toggleBtn.addEventListener('click', () => {
        if (isContentVisible) {
            contentDiv.style.display = 'none';
            toggleBtn.style.transform = 'rotate(180deg)';
            uiContainer.style.height = 'auto';
        } else {
            contentDiv.style.display = 'block';
            toggleBtn.style.transform = 'rotate(0deg)';
        }
        isContentVisible = !isContentVisible;
    });

    // 拖曳功能
    const header = uiContainer.querySelector('.header');
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        offsetX = e.clientX - uiContainer.getBoundingClientRect().left;
        offsetY = e.clientY - uiContainer.getBoundingClientRect().top;
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        newX = Math.max(0, Math.min(newX, window.innerWidth - uiContainer.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - uiContainer.offsetHeight));
        uiContainer.style.left = `${newX}px`;
        uiContainer.style.top = `${newY}px`;
        uiContainer.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        header.style.cursor = 'grab';
    });

    // 開始載入資料
    loadFunctionData();

    console.log('MainUI 載入完成');
})();
