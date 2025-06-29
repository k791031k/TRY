(function() {
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
        width: 500px;
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
            <table id="functionTable" style="
                width: 100%;
                border-collapse: collapse;
                margin-top: 5px;
                font-size: 14px;
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

    // 清除快取功能
    const clearBtn = document.querySelector('#myBookmarkletUI .clear-btn');
    clearBtn.addEventListener('click', () => {
        // 執行您的清除快取程式碼
        let s = {cookies:0, localStorage:0, sessionStorage:0, serviceWorkers:0};
        
        try {
            document.cookie.split(';').forEach(c => {
                let i = c.indexOf('='), n = i > -1 ? c.substr(0, i) : c;
                document.cookie = n.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
            s.cookies = 1;
        } catch(e) { s.fail = (s.fail || '') + 'Cookies '; }
        
        try { localStorage.clear(); s.localStorage = 1; } 
        catch(e) { s.fail = (s.fail || '') + 'localStorage '; }
        
        try { sessionStorage.clear(); s.sessionStorage = 1; } 
        catch(e) { s.fail = (s.fail || '') + 'sessionStorage '; }
        
        // 顯示清除結果
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px;
            background: ${s.fail ? '#ffebee' : '#e8f5e9'};
            border: 1px solid ${s.fail ? '#ef9a9a' : '#a5d6a7'};
            border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 99999; max-width: 300px; font-family: Arial;
        `;
        resultDiv.innerHTML = `
            <div style="margin-bottom:10px;font-weight:bold">清理完成！${s.fail ? ' (部分失敗)' : ''}</div>
            <div style="margin-bottom:8px">✅ 成功：${['Cookies','localStorage','sessionStorage'].filter(k=>s[k]).join(', ')}</div>
            ${s.fail ? `<div style="color:#d32f2f;margin-bottom:8px">❌ 失敗：${s.fail}</div>` : ''}
            <button style="padding:5px 10px;background:#2196f3;color:white;border:none;border-radius:3px;cursor:pointer;" onclick="this.parentNode.remove()">關閉</button>
        `;
        document.body.appendChild(resultDiv);
        setTimeout(() => resultDiv.remove(), 5000);
    });

    clearBtn.addEventListener('mouseover', () => clearBtn.style.backgroundColor = '#c82333');
    clearBtn.addEventListener('mouseout', () => clearBtn.style.backgroundColor = '#dc3545');

    // 關閉按鈕事件
    const closeBtn = document.querySelector('#myBookmarkletUI .close-btn');
    closeBtn.addEventListener('click', () => {
        uiContainer.remove();
    });
    closeBtn.addEventListener('mouseover', () => closeBtn.style.color = '#333');
    closeBtn.addEventListener('mouseout', () => closeBtn.style.color = '#888');

    // --- 收折功能事件 ---
    const toggleBtn = document.querySelector('#myBookmarkletUI .toggle-btn');
    const contentDiv = document.querySelector('#myBookmarkletUI .content');
    let isContentVisible = true;

    toggleBtn.addEventListener('click', () => {
        if (isContentVisible) {
            contentDiv.style.opacity = '0';
            contentDiv.style.maxHeight = '0';
            contentDiv.style.paddingTop = '0';
            contentDiv.style.paddingBottom = '0';
            uiContainer.style.maxHeight = `${uiContainer.querySelector('.header').offsetHeight}px`;
            uiContainer.style.overflow = 'hidden';
            uiContainer.style.resize = 'none';
            toggleBtn.style.transform = 'rotate(180deg)';
        } else {
            contentDiv.style.opacity = '1';
            contentDiv.style.maxHeight = 'unset';
            contentDiv.style.paddingTop = '15px';
            contentDiv.style.paddingBottom = '15px';
            uiContainer.style.maxHeight = '85vh';
            uiContainer.style.overflow = 'hidden';
            uiContainer.style.resize = 'both';
            toggleBtn.style.transform = 'rotate(0deg)';
        }
        isContentVisible = !isContentVisible;
    });

    toggleBtn.addEventListener('mouseover', () => toggleBtn.style.color = '#333');
    toggleBtn.addEventListener('mouseout', () => toggleBtn.style.color = '#888');

    const functionTableBody = document.querySelector('#functionTable tbody');
    let originalData = []; // 儲存原始資料
    let currentSortColumn = null;
    let currentSortDirection = 'asc';

    // 排序功能
    function sortTable(column) {
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc';
        }

        // 更新排序指示器
        document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.textContent = '↕';
        });
        
        const currentIndicator = document.querySelector(`[data-column="${column}"] .sort-indicator`);
        currentIndicator.textContent = currentSortDirection === 'asc' ? '↑' : '↓';

        // 排序資料
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

        // 重新渲染表格
        renderTable(sortedData);
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

        // 重新綁定按鈕事件
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
                btn.addEventListener('mousedown', () => {
                    btn.style.backgroundColor = bgColorActive;
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.2)';
                });
                btn.addEventListener('mouseup', () => {
                    btn.style.backgroundColor = bgColorHover;
                    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
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

    // 綁定排序事件
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

    // 獲取功能數據（添加版本參數避免快取）
    const timestamp = Date.now();
    fetch(`https://cdn.jsdelivr.net/gh/k791031k/UAT_TOOL_R/functionss.json?v=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                functionTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; font-size: 14px;">目前沒有可用的功能。</td></tr>`;
                return;
            }

            // 儲存原始資料並添加原始索引
            originalData = data.map((item, index) => ({
                ...item,
                originalIndex: index + 1
            }));

            // 初始渲染
            renderTable(originalData);
        })
        .catch(error => {
            console.error('載入功能資料失敗:', error);
            functionTableBody.innerHTML = `
                <tr><td colspan="5" style="text-align: center; padding: 20px; font-size: 14px; color: red;">
                    載入功能資料失敗！<br>
                    請檢查 <code style="background-color:#ffebee; padding: 2px 4px; border-radius: 3px;">functionss.json</code> 路徑或網路連線。<br>
                    錯誤訊息: ${error.message}
                </td></tr>
            `;
        });

    // --- 拖曳功能實現 ---
    const header = uiContainer.querySelector('.header');
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return; // 避免拖曳按鈕
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

})();
