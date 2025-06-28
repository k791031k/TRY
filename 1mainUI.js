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
        width: 420px;
        max-width: 90vw;
        max-height: 90vh;
        background: #fff;
        border: 1px solid #e0e6ef;
        border-radius: 10px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.08);
        z-index: 99999;
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        color: #222;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        resize: both;
        min-width: 320px;
        min-height: 60px;
    `;

    // 篩選與標題
    uiContainer.innerHTML = `
        <div class="header" style="
            padding: 8px 0 8px 0;
            background: #f9fbfd;
            border-bottom: 1px solid #e0e6ef;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            text-align: center;
            user-select: none;
            cursor: grab;
        ">
            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #246bfd; letter-spacing: 1px;">我的自動化工具</h2>
        </div>
        <div style="padding: 8px 16px 0 16px; background: #f9fbfd;">
            <select id="categoryFilter" style="
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #e0e6ef;
                border-radius: 6px;
                font-size: 14px;
                color: #246bfd;
                background: #fff;
                margin-bottom: 8px;
            ">
                <option value="">全部分類</option>
            </select>
        </div>
        <div class="content" style="
            padding: 6px 10px 10px 10px;
            overflow-y: auto;
            flex-grow: 1;
        ">
            <table id="functionTable" style="
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
                background: #fff;
            ">
                <thead>
                    <tr>
                        <th data-sort="index" style="padding: 6px 4px; border-bottom: 1px solid #e0e6ef; text-align: center; background: #f3f7fb; font-weight: 600; color: #246bfd; cursor: pointer;">#</th>
                        <th data-sort="id" style="padding: 6px 4px; border-bottom: 1px solid #e0e6ef; text-align: center; background: #f3f7fb; font-weight: 600; color: #246bfd; cursor: pointer;">功能名稱</th>
                        <th data-sort="description" style="padding: 6px 4px; border-bottom: 1px solid #e0e6ef; text-align: center; background: #f3f7fb; font-weight: 600; color: #246bfd; cursor: pointer;">說明</th>
                        <th style="padding: 6px 4px; border-bottom: 1px solid #e0e6ef; text-align: center; background: #f3f7fb; font-weight: 600; color: #246bfd;">操作</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        <button class="close-btn" style="
            position: absolute;
            top: 8px;
            right: 12px;
            background: none;
            border: none;
            font-size: 22px;
            color: #bbb;
            cursor: pointer;
        ">&times;</button>
    `;
    document.body.appendChild(uiContainer);

    // 關閉按鈕
    const closeBtn = uiContainer.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => uiContainer.remove());

    // 拖曳
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

    // 取得資料
    const functionTableBody = uiContainer.querySelector('#functionTable tbody');
    let allData = [];
    let currentSort = { key: 'index', asc: true };
    let currentCategory = '';

    fetch('https://cdn.jsdelivr.net/gh/k791031k/UAT_TOOL_R/functionss.json')
    .then(res => res.json())
    .then(data => {
        allData = data;
        renderCategoryOptions(data);
        renderTable();
    });

    // 篩選選單
    function renderCategoryOptions(data) {
        const select = uiContainer.querySelector('#categoryFilter');
        const categories = Array.from(new Set(data.map(f => f.category).filter(Boolean)));
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
        select.addEventListener('change', e => {
            currentCategory = e.target.value;
            renderTable();
        });
    }

    // 排序與渲染
    function renderTable() {
        let filtered = allData;
        if (currentCategory) {
            filtered = filtered.filter(f => f.category === currentCategory);
        }
        filtered = filtered.map((f, i) => ({...f, index: i + 1}));
        filtered.sort((a, b) => {
            const key = currentSort.key;
            if (a[key] < b[key]) return currentSort.asc ? -1 : 1;
            if (a[key] > b[key]) return currentSort.asc ? 1 : -1;
            return 0;
        });
        functionTableBody.innerHTML = '';
        if (filtered.length === 0) {
            functionTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#aaa; padding:16px;">無資料</td></tr>`;
            return;
        }
        filtered.forEach((func, idx) => {
            const tr = document.createElement('tr');
            tr.style.background = idx % 2 === 0 ? '#f7fafd' : '#fff';
            tr.innerHTML = `
                <td style="padding:4px 2px; text-align:center;">${idx + 1}</td>
                <td style="padding:4px 2px; text-align:center;">${escapeHtml(func.id || '')}</td>
                <td style="padding:4px 2px; text-align:center;">${escapeHtml(func.description || '')}</td>
                <td style="padding:4px 2px; text-align:center;">
                    <button class="execute-btn" data-script="${escapeHtml(func.action_script || '')}" style="
                        padding: 5px 14px;
                        color: #fff;
                        background: #246bfd;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        box-shadow: none;
                        outline: none;
                        transition: none;
                    ">執行</button>
                </td>
            `;
            functionTableBody.appendChild(tr);
        });
        // 綁定執行按鈕
        functionTableBody.querySelectorAll('.execute-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const scriptToExecute = event.target.dataset.script;
                if (scriptToExecute.startsWith('javascript:')) {
                    const jsCode = scriptToExecute.substring(11);
                    try {
                        (function() { eval(jsCode); })();
                    } catch (e) {
                        alert("執行功能腳本時發生錯誤，請檢查開發者工具控制台。");
                    }
                } else {
                    alert("無效的功能腳本格式。");
                }
                uiContainer.remove();
            });
        });
    }

    // 標題排序功能
    uiContainer.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            if (currentSort.key === key) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.key = key;
                currentSort.asc = true;
            }
            renderTable();
        });
    });

    // HTML escape
    function escapeHtml(unsafe) {
        return (unsafe || '').replace(/&/g, "&amp;")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
})();
