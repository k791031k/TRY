(function() {
    console.log('MainUI 開始載入...');
    
    // 防止重複加載 UI
    if (document.getElementById('myBookmarkletUI')) {
        document.getElementById('myBookmarkletUI').remove();
    }

    // --- 創建 UI 介面本身 ---
    const uiContainer = document.createElement('div');
    uiContainer.id = 'myBookmarkletUI';
    uiContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-width: 85vw;
        max-height: 85vh;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #d0d0d0;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 99999;
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        color: #333;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        resize: both;
        min-width: 500px;
        min-height: 60px;
        transition: height 0.3s ease-out, max-height 0.3s ease-out;
    `;

    uiContainer.innerHTML = `
        <div class="header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 20px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #e5e5e5;
            border-top-left-radius: 9px;
            border-top-right-radius: 9px;
            cursor: grab;
        ">
            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #555;">我的自動化工具</h2>
            <div style="display: flex; align-items: center;">
                <button class="clear-btn" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-right: 10px;
                    transition: background-color 0.2s ease-in-out;
                ">清除快取</button>
                <button class="refresh-btn" style="
                    background: #17a2b8;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-right: 10px;
                    transition: background-color 0.2s ease-in-out;
                ">重新載入</button>
                <button class="toggle-btn" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    line-height: 1;
                    color: #888;
                    cursor: pointer;
                    margin-right: 10px;
                    transition: transform 0.2s ease-in-out, color 0.2s ease-in-out;
                    transform: rotate(0deg);
                ">&#x2303;</button>
                <button class="close-btn" style="
                    background: none;
                    border: none;
                    font-size: 26px;
                    line-height: 1;
                    color: #888;
                    cursor: pointer;
                    transition: color 0.2s ease-in-out;
                ">&times;</button>
            </div>
        </div>
        <div class="content" style="
            padding: 15px 20px;
            overflow-y: auto;
            flex-grow: 1;
            transition: opacity 0.3s ease-out, max-height 0.3s ease-out;
        ">
            <div id="loadingStatus" style="text-align: center; padding: 20px; color: #666;">
                載入功能列表中...
            </div>
            <table id="functionTable" style="
                width: 100%;
                border-collapse: collapse;
                margin-top: 5px;
                font-size: 14px;
                display: none;
            ">
                <thead>
                    <tr>
                        <th class="sortable" data-column="index" style="padding: 10px 12px; border: 1px solid #e9e9e9; text-align: left; background-color: #f2f2f2; font-weight: 600; color: #666; cursor: pointer; user-select: none;">
                            # <span class="sort-indicator">↕</span>
                        </th>
                        <th class="sortable" data-column="id" style="padding: 10px 12px; border: 1px solid #e9e9e9; text-align: left; background-color: #f2f2f2; font-weight: 600; color: #666; cursor: pointer; user-select: none;">
                            功能名稱 <span class="sort-indicator">↕</span>
                        </th>
                        <th class="sortable" data-column="description" style="padding: 10px 12px; border: 1px solid #e9e9e9; text-align: left; background-color: #f2f2f2; font-weight: 600; color: #666; cursor: pointer; user-select: none;">
                            說明 <span class="sort-indicator">↕</span>
                        </th>
                        <th class="sortable" data-column="category" style="padding: 10px 12px; border: 1px solid #e9e9e9; text-align: left; background-color: #f2f2f2; font-weight: 600; color: #666; cursor: pointer; user-select: none;">
                            分類 <span class="sort-indicator">↕</span>
                        </th>
                        <th style="padding: 10px 12px; border: 1px solid #e9e9e9; text-align: left; background-color: #f2f2f2; font-weight: 600; color: #666;">操作</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>
    `;

    document.body.appendChild(uiContainer);

    // 定義 escapeHtml 函數
    function escapeHtml(unsafe) {
        if (unsafe === undefined || unsafe === null) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 全域變數
    const functionTableBody = document.querySelector('#functionTable tbody');
    const functionTable = document.getElementById('functionTable');
    const loadingStatus = document.getElementById('loadingStatus');
    let originalData = [];
    let currentSortColumn = null;
    let currentSortDirection = 'asc';

    // 載入資料函數
    function loadFunctionData() {
        const timestamp = Date.now();
        const jsonUrls = [
            `https://cdn.jsdelivr.net/gh/k791031k/UAT_TOOL_R/functions.json?v=${timestamp}`,
            `https://raw.githubusercontent.com/k791031k/UAT_TOOL_R/main/functions.json?v=${timestamp}`,
            // 備用測試資料
            'application/json,' + encodeURIComponent(JSON.stringify([
                {
                    "id": "測試功能1",
                    "description": "這是測試功能1",
                    "category": "測試",
                    "type": "action",
                    "action_script": "javascript:alert('測試功能1執行成功！');"
                },
                {
                    "id": "測試功能2",
                    "description": "這是測試功能2",
                    "category": "測試",
                    "type": "utility",
                    "action_script": "javascript:alert('測試功能2執行成功！');"
                }
            ]))
        ];

        loadingStatus.innerHTML = '載入功能列表中...';
        console.log('開始載入功能資料...');

        // 嘗試多個 URL
        async function tryLoadData() {
            for (let i = 0; i < jsonUrls.length; i++) {
                const url = jsonUrls[i];
                console.log(`嘗試載入 URL ${i + 1}:`, url);
                
                try {
                    loadingStatus.innerHTML = `載入中... (嘗試 ${i + 1}/${jsonUrls.length})`;
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    console.log('Response status:', response.status);
                    console.log('Response headers:', response.headers);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('成功載入資料:', data);

                    if (!Array.isArray(data)) {
                        throw new Error('資料格式錯誤：不是陣列格式');
                    }

                    if (data.length === 0) {
                        throw new Error('資料為空');
                    }

                    // 成功載入資料
                    originalData = data.map((item, index) => ({
                        ...item,
                        originalIndex: index + 1
                    }));

                    loadingStatus.style.display = 'none';
                    functionTable.style.display = 'table';
                    renderTable(originalData);
                    bindSortEvents();
                    
                    console.log('資料載入完成，共', originalData.length, '筆');
                    return; // 成功載入，退出函數

                } catch (error) {
                    console.error(`URL ${i + 1} 載入失敗:`, error);
                    
                    if (i === jsonUrls.length - 1) {
                        // 所有 URL 都失敗了
                        loadingStatus.innerHTML = `
                            <div style="color: red; text-align: center;">
                                <div style="font-weight: bold; margin-bottom: 10px;">載入功能資料失敗！</div>
                                <div style="margin-bottom: 10px;">已嘗試 ${jsonUrls.length} 個資料源</div>
                                <div style="font-size: 12px; color: #666;">
                                    最後錯誤：${error.message}
                                </div>
                                <button onclick="location.reload()" style="
                                    margin-top: 10px; padding: 5px 10px; 
                                    background: #007bff; color: white; 
                                    border: none; border-radius: 3px; cursor: pointer;
                                ">重新載入頁面</button>
                            </div>
                        `;
                    }
                }
            }
        }

        tryLoadData();
    }

    // 渲染表格
    function renderTable(data) {
        functionTableBody.innerHTML = '';
        
        data.forEach((func, index) => {
            const row = functionTableBody.insertRow();
            row.style.cssText = `
                background-color: ${index % 2 === 0 ? '#fdfdfd' : 'white'};
                transition: background-color 0.1s ease-in-out;
            `;
            row.onmouseover = () => row.style.backgroundColor = '#f0f0f0';
            row.onmouseout = () => row.style.backgroundColor = `${index % 2 === 0 ? '#fdfdfd' : 'white'}`;

            const buttonType = func.type && ['action', 'utility', 'dangerous'].includes(func.type) ? func.type : 'action';
            const buttonClass = `type-${buttonType}`;

            row.innerHTML = `
                <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${func.originalIndex}</td>
                <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${escapeHtml(func.id || '')}</td>
                <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${escapeHtml(func.description || '')}</td>
                <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${escapeHtml(func.category || '')}</td>
                <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">
                    <button class="execute-btn ${buttonClass}" data-script="${escapeHtml(func.action_script || '')}" style="
                        padding: 6px 12px;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        transition: background-color 0.2s ease-in-out, transform 0.1s ease;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    ">執行</button>
                </td>
            `;
        });

        bindButtonEvents();
    }

    // 綁定按鈕事件
    function bindButtonEvents() {
        functionTableBody.querySelectorAll('.execute-btn').forEach(button => {
            const buttonType = button.classList.contains('type-utility') ? 'utility' :
                                 (button.classList.contains('type-dangerous') ? 'dangerous' : 'action');

            const applyButtonStyles = (btn, type) => {
                let bgColorHover, bgColorActive, bgColorNormal;
                if (type === 'utility') {
                    bgColorNormal = '#007bff';
                    bgColorHover = '#0069d9';
                    bgColorActive = '#0056b3';
                } else if (type === 'dangerous') {
                    bgColorNormal = '#dc3545';
                    bgColorHover = '#c82333';
                    bgColorActive = '#bd2130';
                } else {
                    bgColorNormal = '#28a745';
                    bgColorHover = '#218838';
                    bgColorActive = '#1e7e34';
                }

                btn.style.backgroundColor = bgColorNormal;

                btn.addEventListener('mouseover', () => {
                    btn.style.backgroundColor = bgColorHover;
                    btn.style.transform = 'translateY(-1px)';
                });
                btn.addEventListener('mouseout', () => {
                    btn.style.backgroundColor = bgColorNormal;
                    btn.style.transform = 'translateY(0)';
                });
            };
            applyButtonStyles(button, buttonType);

            button.addEventListener('click', async (event) => {
                const scriptToExecute = event.target.dataset.script;
                
                try {
                    if (scriptToExecute.startsWith('javascript:')) {
                        const jsCode = scriptToExecute.substring(11);
                        (function() {
                            eval(jsCode);
                        })();
                    } else if (scriptToExecute.startsWith('external:')) {
                        const scriptUrl = scriptToExecute.substring(9);
                        const externalScript = document.createElement('script');
                        externalScript.src = scriptUrl + '?v=' + Date.now();
                        externalScript.onload = () => {
                            console.log('外部腳本載入成功:', scriptUrl);
                        };
                        externalScript.onerror = () => {
                            console.error('外部腳本載入失敗:', scriptUrl);
                            alert('載入外部腳本失敗，請檢查網路連線');
                        };
                        document.body.appendChild(externalScript);
                    } else {
                        throw new Error('不支援的腳本格式');
                    }
                } catch (e) {
                    console.error("執行功能腳本時發生錯誤:", e);
                    alert("執行功能腳本時發生錯誤，請檢查開發者工具控制台。");
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
        });
        
        const currentIndicator = document.querySelector(`[data-column="${column}"] .sort-indicator`);
        if (currentIndicator) {
            currentIndicator.textContent = currentSortDirection === 'asc' ? '↑' : '↓';
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
            header.addEventListener('mouseover', () => {
                header.style.backgroundColor = '#e8e8e8';
            });
            header.addEventListener('mouseout', () => {
                header.style.backgroundColor = '#f2f2f2';
            });
        });
    }

    // 按鈕事件綁定
    const closeBtn = document.querySelector('#myBookmarkletUI .close-btn');
    closeBtn.addEventListener('click', () => uiContainer.remove());

    const refreshBtn = document.querySelector('#myBookmarkletUI .refresh-btn');
    refreshBtn.addEventListener('click', () => {
        loadingStatus.style.display = 'block';
        functionTable.style.display = 'none';
        loadFunctionData();
    });

    const clearBtn = document.querySelector('#myBookmarkletUI .clear-btn');
    clearBtn.addEventListener('click', () => {
        // 清除快取功能
        try {
            localStorage.clear();
            sessionStorage.clear();
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        caches.delete(name);
                    });
                });
            }
            alert('快取清除完成！');
        } catch (e) {
            alert('清除快取時發生錯誤：' + e.message);
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
