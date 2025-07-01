(function() {
    if (document.getElementById('myBookmarkletUI')) {
        document.getElementById('myBookmarkletUI').remove();
    }

    const uiContainer = document.createElement('div');
    uiContainer.id = 'myBookmarkletUI';
    uiContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 450px;
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
                <button class="toggle-btn" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #888;
                    cursor: pointer;
                    margin-right: 10px;
                    transform: rotate(0deg);
                ">&#x2303;</button>
                <button class="close-btn" style="
                    background: none;
                    border: none;
                    font-size: 26px;
                    color: #888;
                    cursor: pointer;
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
                        <th style="padding: 10px 12px; border: 1px solid #e9e9e9;">#</th>
                        <th style="padding: 10px 12px; border: 1px solid #e9e9e9;">功能名稱</th>
                        <th style="padding: 10px 12px; border: 1px solid #e9e9e9;">說明</th>
                        <th style="padding: 10px 12px; border: 1px solid #e9e9e9;">操作</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    document.body.appendChild(uiContainer);

    const closeBtn = uiContainer.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => uiContainer.remove());
    closeBtn.addEventListener('mouseover', () => closeBtn.style.color = '#333');
    closeBtn.addEventListener('mouseout', () => closeBtn.style.color = '#888');

    const toggleBtn = uiContainer.querySelector('.toggle-btn');
    const contentDiv = uiContainer.querySelector('.content');
    let isContentVisible = true;

    toggleBtn.addEventListener('click', () => {
        if (isContentVisible) {
            contentDiv.style.opacity = '0';
            contentDiv.style.maxHeight = '0';
            contentDiv.style.paddingTop = '0';
            contentDiv.style.paddingBottom = '0';
            uiContainer.style.maxHeight = `${uiContainer.querySelector('.header').offsetHeight}px`;
            uiContainer.style.resize = 'none';
            toggleBtn.style.transform = 'rotate(180deg)';
        } else {
            contentDiv.style.opacity = '1';
            contentDiv.style.maxHeight = 'unset';
            contentDiv.style.paddingTop = '15px';
            contentDiv.style.paddingBottom = '15px';
            uiContainer.style.maxHeight = '85vh';
            uiContainer.style.resize = 'both';
            toggleBtn.style.transform = 'rotate(0deg)';
        }
        isContentVisible = !isContentVisible;
    });

    toggleBtn.addEventListener('mouseover', () => toggleBtn.style.color = '#333');
    toggleBtn.addEventListener('mouseout', () => toggleBtn.style.color = '#888');

    const functionTableBody = document.querySelector('#functionTable tbody');
    functionTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; font-size: 14px;">載入中...</td></tr>`;

    // ✅ 加入 timestamp 防快取
    fetch('https://cdn.jsdelivr.net/gh/k791031k/TRY/test.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                functionTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">目前沒有可用的功能。</td></tr>`;
                return;
            }

            const buttonTypeClasses = {
                'action': 'type-action',
                'utility': 'type-utility',
                'dangerous': 'type-dangerous'
            };

            functionTableBody.innerHTML = '';
            data.forEach((func, index) => {
                const row = functionTableBody.insertRow();
                row.style.backgroundColor = index % 2 === 0 ? '#fdfdfd' : 'white';
                row.onmouseover = () => row.style.backgroundColor = '#f0f0f0';
                row.onmouseout = () => row.style.backgroundColor = index % 2 === 0 ? '#fdfdfd' : 'white';

                const buttonType = func.type && buttonTypeClasses[func.type] ? func.type : 'action';
                const buttonClass = buttonTypeClasses[buttonType];

                row.innerHTML = `
                    <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${index + 1}</td>
                    <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${escapeHtml(func.id || '')}</td>
                    <td style="padding: 10px 12px; border: 1px solid #e9e9e9;">${escapeHtml(func.description || '')}</td>
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

            functionTableBody.querySelectorAll('.execute-btn').forEach(button => {
                const buttonType = button.classList.contains('type-utility') ? 'utility' :
                                   (button.classList.contains('type-dangerous') ? 'dangerous' : 'action');

                const applyButtonStyles = (btn, type) => {
                    let bgColorNormal, bgColorHover, bgColorActive;
                    if (type === 'utility') {
                        bgColorNormal = '#007bff'; bgColorHover = '#0069d9'; bgColorActive = '#0056b3';
                    } else if (type === 'dangerous') {
                        bgColorNormal = '#dc3545'; bgColorHover = '#c82333'; bgColorActive = '#bd2130';
                    } else {
                        bgColorNormal = '#28a745'; bgColorHover = '#218838'; bgColorActive = '#1e7e34';
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
                        btn.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.2)';
                    });
                    btn.addEventListener('mouseup', () => {
                        btn.style.backgroundColor = bgColorHover;
                        btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                    });
                };

                applyButtonStyles(button, buttonType);

                button.addEventListener('click', (event) => {
                    const scriptToExecute = event.target.dataset.script;

                    if (buttonType === 'dangerous') {
                        if (!confirm("⚠️ 此操作具有風險，確定要執行嗎？")) return;
                    }

                    if (scriptToExecute.startsWith('javascript:')) {
                        const jsCode = scriptToExecute.substring(11);
                        try {
                            (function() { eval(jsCode); })();
                        } catch (e) {
                            console.error("執行功能腳本時發生錯誤:", e);
                            alert("執行功能腳本時發生錯誤，請檢查控制台。");
                        }
                    } else {
                        console.error("無效的 action_script 格式:", scriptToExecute);
                        alert("無效的功能腳本格式。");
                    }
                    uiContainer.remove();
                });
            });
        })
        .catch(error => {
            console.error('載入功能資料失敗:', error);
            uiContainer.querySelector('.content').innerHTML = `
                <p style="color: red; text-align: center; margin-top: 20px; font-size: 14px;">
                    載入功能資料失敗！<br>
                    請檢查 <code>test.json</code> 路徑或網路連線。<br>
                    錯誤訊息: ${error.message}
                </p>
            `;
        });

    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
    }

    // 拖曳功能
    const header = uiContainer.querySelector('.header');
    let isDragging = false, offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
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
