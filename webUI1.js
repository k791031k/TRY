javascript:(function() {
    /**
     * =================================================================================
     * ！網頁助理！ (Web Assistant!)
     *
     * 版本: 2.1 (Final Release)
     * 描述: 整合所有使用者回饋的最終版本，包含 UI 優化、筆記、進階截圖等功能。
     * =================================================================================
     */
    if (window.webAssistantInstance) {
        window.webAssistantInstance.destroy();
        return;
    }

    const WebAssistant = {
        state: {
            isEditing: false, activeMode: null, highlightedElement: null,
            panelPosition: { x: 20, y: 20 }, isMinimized: false,
            isMonitoringNetwork: false, originalXHR: window.XMLHttpRequest, originalFetch: window.fetch,
            noteSize: null,
        },
        prefix: 'webAssistant_notes_',

        core: {
            tableToTSV(table) {
                const getCellText = (cell) => `"${cell.innerText.trim().replace(/\s+/g, ' ').replace(/"/g, '""')}"`;
                let tsv = [];
                for (const row of table.rows) {
                    let rowData = [];
                    for (const cell of row.cells) { rowData.push(getCellText(cell)); }
                    tsv.push(rowData.join('\t'));
                }
                return tsv.join('\n');
            },
            copyToClipboard(text, successMsg, fallbackMsg, fallbackTitle) {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text)
                        .then(() => WebAssistant.ui.showToast(successMsg))
                        .catch(() => WebAssistant.ui.showFallbackWindow(text, fallbackMsg, fallbackTitle));
                } else {
                    WebAssistant.ui.showFallbackWindow(text, fallbackMsg, fallbackTitle);
                }
            },
            unlockPage() {
                const eventsToClear = ['contextmenu', 'selectstart', 'copy', 'dragstart', 'mousedown', 'keydown', 'mouseup'];
                eventsToClear.forEach(evt => {
                    document.addEventListener(evt, e => { e.stopPropagation(); return true; }, { capture: true });
                    window[`on${evt}`] = null; document.body[`on${evt}`] = null;
                });
                document.body.style.cssText += 'user-select: auto !important; -webkit-user-select: auto !important;';
                WebAssistant.ui.showToast('已嘗試解除頁面封鎖！');
            },
            togglePageEditing() {
                WebAssistant.state.isEditing = !WebAssistant.state.isEditing;
                document.body.contentEditable = WebAssistant.state.isEditing;
                document.body.spellcheck = false;
                const button = document.getElementById('wa-edit-btn');
                if (WebAssistant.state.isEditing) {
                    WebAssistant.ui.showToast('已進入網頁編輯模式', 'info');
                    button.textContent = '退出編輯模式'; button.style.backgroundColor = '#c82333';
                } else {
                    WebAssistant.ui.showToast('已退出網頁編輯模式');
                    button.textContent = '進入編輯模式'; button.style.backgroundColor = '#5a6268';
                }
            },
            activateReaderMode() {
                let bestCandidate = null, maxScore = -1;
                document.querySelectorAll('div, main, article').forEach(el => {
                    if (el.offsetParent === null || el.clientHeight < 200 || el.id.startsWith('wa-')) return;
                    const textLength = el.innerText.trim().length;
                    const pCount = el.getElementsByTagName('p').length;
                    const score = textLength + (pCount * 100);
                    if (score > 1000 && score > maxScore) { maxScore = score; bestCandidate = el; }
                });
                if (!bestCandidate) { WebAssistant.ui.showToast('無法自動偵測主要內容區塊', 'error'); return; }
                WebAssistant.ui.showReaderView(bestCandidate.cloneNode(true));
            },
            showImageGallery() {
                const images = Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth > 150 && img.naturalHeight > 150);
                if (images.length === 0) { WebAssistant.ui.showToast('頁面上未找到足夠大的圖片', 'error'); return; }
                WebAssistant.ui.showImageGalleryView(images);
            },
            promptScreenshotOptions() {
                WebAssistant.ui.showScreenshotOptionsDialog();
            },
            captureScreenshot(format = 'png', quality = 0.92) {
                WebAssistant.ui.showToast('正在載入截圖程式庫...', 'info');
                const doCapture = () => {
                    WebAssistant.ui.toggleMainPanel(false);
                    WebAssistant.ui.showToast('截圖中，請稍候...');
                    html2canvas(document.body, { useCORS: true, allowTaint: true, logging: false }).then(canvas => {
                        WebAssistant.ui.toggleMainPanel(true);
                        WebAssistant.ui.showScreenshotPreview(canvas, format, quality);
                    });
                };
                if (typeof html2canvas !== 'undefined') { doCapture(); return; }
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                document.head.appendChild(script);
                script.onload = doCapture;
                script.onerror = () => { WebAssistant.ui.toggleMainPanel(true); WebAssistant.ui.showToast('截圖程式庫載入失敗', 'error'); };
            },
            toggleNetworkMonitor() {
                this.state.isMonitoringNetwork = !this.state.isMonitoringNetwork;
                const btn = document.getElementById('wa-network-btn');
                if (this.state.isMonitoringNetwork) {
                    btn.textContent = '停止監控'; btn.style.backgroundColor = '#c82333';
                    document.getElementById('wa-network-log').innerHTML = '<li style="color:#888;">監控已啟動...</li>';
                    this.patchNetworkFunctions();
                } else {
                    btn.textContent = '啟動網路監控'; btn.style.backgroundColor = '#0069d9';
                    this.unpatchNetworkFunctions();
                }
            },
            patchNetworkFunctions() {
                const self = this;
                window.XMLHttpRequest = function() {
                    const xhr = new WebAssistant.state.originalXHR();
                    xhr.addEventListener('loadend', function() {
                        try {
                            WebAssistant.ui.addNetworkLog({ url: this.responseURL, status: this.status, response: this.responseText, method: 'XHR' });
                        } catch (e) {}
                    });
                    return xhr;
                };
                window.fetch = async (...args) => {
                    const response = await WebAssistant.state.originalFetch(...args);
                    response.clone().text().then(text => {
                        WebAssistant.ui.addNetworkLog({ url: response.url, status: response.status, response: text, method: 'Fetch' });
                    });
                    return response;
                };
            },
            unpatchNetworkFunctions() {
                window.XMLHttpRequest = WebAssistant.state.originalXHR;
                window.fetch = WebAssistant.state.originalFetch;
            },
            saveNote(text) { try { localStorage.setItem(WebAssistant.prefix + location.hostname, text); } catch (e) { console.error('WA Error:', e); } },
            loadNote() { return localStorage.getItem(WebAssistant.prefix + location.hostname) || ''; },
            saveNoteSize(width, height) { try { localStorage.setItem(WebAssistant.prefix + 'size', JSON.stringify({ width, height })); } catch (e) {} },
            loadNoteSize() { try { const size = JSON.parse(localStorage.getItem(WebAssistant.prefix + 'size')); if (size) WebAssistant.state.noteSize = size; } catch(e) {} },
            exportAllNotes() {
                let content = `# ！網頁助理！筆記匯出 (${new Date().toLocaleString()})\n\n`;
                let count = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith(WebAssistant.prefix) && !key.startsWith(WebAssistant.prefix + 'size')) {
                        count++;
                        content += `---\n\n## 網站: ${key.replace(WebAssistant.prefix, '')}\n\n${localStorage.getItem(key)}\n\n`;
                    }
                }
                if(count === 0) { WebAssistant.ui.showToast('沒有任何已儲存的筆記可匯出', 'error'); return; }
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = '網頁助理筆記匯出.txt'; a.click();
                URL.revokeObjectURL(url);
                WebAssistant.ui.showToast('所有筆記已匯出！');
            }
        },
        ui: {
            state: { highlightedElement: null, activeTab: 'common', probeTooltip: null },
            createMainPanel() {
                const panel = document.createElement('div'); panel.id = 'web-assistant-panel-v2';
                panel.style.cssText = `position:fixed; top:${WebAssistant.state.panelPosition.y}px; left:${WebAssistant.state.panelPosition.x}px; width:280px; background:#f8f9fa; border-radius:8px; box-shadow:0 8px 25px rgba(0,0,0,0.2); z-index:2147483647; border:1px solid #dee2e6; font-family:"Segoe UI", "Microsoft JhengHei", Arial, sans-serif; display:flex; flex-direction:column;`;
                const header = document.createElement('div'); header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; background:#343a40; color:white; border-top-left-radius:7px; border-top-right-radius:7px; cursor:move; user-select:none;';
                const title = document.createElement('span'); title.textContent = '！網頁助理！ v2.1'; title.style.fontWeight = 'bold';
                const controls = document.createElement('div'); const createHeaderBtn = (text, id) => { const btn = document.createElement('button'); btn.id = id; btn.innerHTML = text; btn.style.cssText = 'border:none; background:transparent; color:white; font-size:18px; cursor:pointer; margin-left:8px; font-weight:bold; line-height:1; padding: 0 4px;'; return btn; };
                controls.append(createHeaderBtn('_', 'wa-minimize-btn'), createHeaderBtn('&times;', 'wa-close-btn')); header.append(title, controls);
                const tabContainer = document.createElement('div'); tabContainer.style.cssText = 'display:flex; background:#e9ecef; padding: 5px 5px 0 5px; gap: 5px;';
                ['common', 'capture', 'dev', 'notes'].forEach(id => { const text = {'common':'常用','capture':'擷取','dev':'分析','notes':'筆記'}[id]; const tab = document.createElement('button'); tab.dataset.tabId = id; tab.textContent = text; tab.style.cssText = 'flex:1; padding:10px 5px; border:none; background: #e9ecef; cursor:pointer; font-size:13px; border-radius: 4px 4px 0 0; border: 1px solid transparent; border-bottom: none;'; tabContainer.appendChild(tab); });
                const body = document.createElement('div'); body.style.padding = '10px'; const createTabContent = (id) => { const c = document.createElement('div'); c.dataset.contentId = id; c.style.cssText = 'display:none; flex-direction:column; gap:8px;'; return c; };
                const commonContent = createTabContent('common'), captureContent = createTabContent('capture'), devContent = createTabContent('dev'), notesContent = createTabContent('notes');
                const createButton = (id, text, color='#6c757d') => { const btn = document.createElement('button'); btn.id = id; btn.textContent = text; btn.style.cssText = `width:100%; padding:12px; border:none; border-radius:5px; color:white; background:${color}; cursor:pointer; font-size:14px; transition:all 0.2s;`; btn.onmouseover = () => btn.style.filter = 'brightness(90%)'; btn.onmouseout = () => btn.style.filter = 'brightness(100%)'; return btn; };
                commonContent.append(createButton('wa-unlock-btn', '解除右鍵封鎖', '#007bff'), createButton('wa-edit-btn', '進入編輯模式', '#5a6268'), createButton('wa-copy-table-btn', '複製表格', '#17a2b8'), createButton('wa-copy-text-btn', '複製段落', '#28a745'));
                captureContent.append(createButton('wa-reader-btn', '沉浸式閱讀'), createButton('wa-gallery-btn', '圖片總覽'), createButton('wa-screenshot-btn', '網頁截圖'));
                devContent.append(createButton('wa-probe-btn', '元素探測器'), createButton('wa-network-btn', '啟動網路監控', '#007bff'));
                const networkLog = document.createElement('ul'); networkLog.id = 'wa-network-log'; networkLog.style.cssText = 'height:200px; overflow-y:auto; background:#212529; color:#e9ecef; font-family:monospace; font-size:11px; list-style:none; padding:8px; margin-top:10px; border-radius:4px;'; devContent.appendChild(networkLog);
                const exportBtnContainer = document.createElement('div'); exportBtnContainer.style.textAlign = 'right'; const exportNotesBtn = createButton('wa-export-notes-btn', '匯出所有筆記', '#007bff'); exportNotesBtn.style.width = 'auto'; exportBtnContainer.appendChild(exportNotesBtn); notesContent.appendChild(exportBtnContainer);
                const noteArea = document.createElement('textarea'); noteArea.id = 'wa-note-area'; noteArea.placeholder = '在此輸入筆記，內容將自動與網站綁定並儲存...';
                WebAssistant.core.loadNoteSize();
                noteArea.style.cssText = `box-sizing: border-box; width: ${WebAssistant.state.noteSize?.width || '100%'}; height: ${WebAssistant.state.noteSize?.height || '200px'}; border:1px solid #ccc; border-radius:4px; padding:8px; resize:both; margin-top:8px;`; noteArea.value = WebAssistant.core.loadNote(); notesContent.appendChild(noteArea);
                body.append(commonContent, captureContent, devContent, notesContent);
                panel.append(header, tabContainer, body); document.body.appendChild(panel);
                this.attachDragHandler(panel, header); this.switchTab('common');
            },
            switchTab(tabId) { this.state.activeTab = tabId; const panel = document.getElementById('web-assistant-panel-v2'); panel.querySelectorAll('[data-tab-id]').forEach(t => { const isActive = t.dataset.tabId === tabId; t.style.background = isActive ? 'white' : '#e9ecef'; t.style.fontWeight = isActive ? 'bold' : 'normal'; t.style.borderTop = isActive ? '1px solid #dee2e6' : '1px solid transparent'; t.style.borderLeft = isActive ? '1px solid #dee2e6' : '1px solid transparent'; t.style.borderRight = isActive ? '1px solid #dee2e6' : '1px solid transparent'; }); panel.querySelectorAll('[data-content-id]').forEach(c => { c.style.display = c.dataset.contentId === tabId ? 'flex' : 'none'; }); },
            attachDragHandler(panel, header) { let dragging = false, pos; header.onmousedown = e => { if (e.target.tagName === 'BUTTON') return; dragging = true; pos = { x: e.clientX - panel.offsetLeft, y: e.clientY - panel.offsetTop }; e.preventDefault(); }; document.onmouseup = () => dragging = false; document.onmousemove = e => { if (dragging) { panel.style.left = `${e.clientX - pos.x}px`; panel.style.top = `${e.clientY - pos.y}px`; }}; },
            showToast(message, type = 'success') { const toast = document.createElement('div'); Object.assign(toast.style, { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '6px', color: 'white', backgroundColor: type === 'info' ? '#17a2b8' : (type === 'success' ? '#28a745' : '#dc3545'), zIndex: '2147483647', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: 'opacity 0.5s, top 0.5s', opacity: '0' }); toast.textContent = message; document.body.appendChild(toast); setTimeout(() => { toast.style.opacity = '1'; }, 10); setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000); },
            showFallbackWindow(data, message, title) { const newWin = window.open('', '_blank'); if (newWin) { newWin.document.write(`<html><head><title>${title}</title><meta charset="UTF-8"><style>body{font-family:sans-serif;margin:20px;}textarea{box-sizing:border-box; width:98%;height:80vh;}</style></head><body><p>${message}</p><textarea readonly>${data}</textarea></body></html>`); newWin.document.close(); newWin.document.querySelector('textarea').select(); newWin.focus(); } else { this.showToast('無法開啟新分頁', 'error'); } },
            toggleOverlay(show, text) { let overlay = document.getElementById('wa-overlay'); if (show) { if (!overlay) { overlay = document.createElement('div'); overlay.id = 'wa-overlay'; Object.assign(overlay.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 2147483646, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '24px' }); document.body.appendChild(overlay); } overlay.innerHTML = `${text}<br><br><small>按 Esc 鍵可返回</small>`; overlay.style.display = 'flex'; } else { if (overlay) overlay.style.display = 'none'; } },
            highlightElement(element, color = '#007bff') { if (this.state.highlightedElement === element) return; this.unhighlightElement(); this.state.highlightedElement = element; element.style.outline = `3px dashed ${color}`; element.style.cursor = 'pointer'; },
            unhighlightElement() { if (this.state.highlightedElement) { this.state.highlightedElement.style.outline = ''; this.state.highlightedElement.style.cursor = ''; } this.state.highlightedElement = null; },
            showReaderView(content) { const container = document.createElement('div'); container.id = 'wa-reader-view'; container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background: #fdfdfd; z-index: 2147483647; overflow-y:auto;'; const article = document.createElement('div'); article.style.cssText = 'max-width:800px; margin: 80px auto; padding: 20px; font-family: Georgia, serif; line-height: 1.8; font-size: 18px; color: #333;'; article.innerHTML = content.innerHTML; const closeBtn = document.createElement('button'); closeBtn.textContent = '[ 退出閱讀模式 (Esc) ]'; closeBtn.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background: #333; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;'; const closeReader = () => { container.remove(); this.toggleMinimize(false); document.removeEventListener('keydown', keyHandler); }; const keyHandler = (e) => { if(e.key === 'Escape') closeReader(); }; closeBtn.onclick = closeReader; document.addEventListener('keydown', keyHandler); container.append(closeBtn, article); document.body.appendChild(container); this.toggleMinimize(true); },
            showImageGalleryView(images) { const container = document.createElement('div'); container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); z-index: 2147483647; overflow-y:auto; padding:50px 20px 20px; box-sizing:border-box; text-align:center;'; const grid = document.createElement('div'); grid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;'; images.forEach(img => { const item = document.createElement('div'); const thumb = document.createElement('img'); thumb.src = img.src; thumb.style.cssText = 'max-width:100%; height:150px; object-fit:cover; border-radius:4px; border: 2px solid white;'; const link = document.createElement('a'); link.href = img.src; link.download = img.src.split('/').pop() || 'image.jpg'; link.textContent = '下載'; link.style.cssText = 'display:block; color:white; text-decoration:none; margin-top:5px; background: #007bff; padding: 5px; border-radius: 4px;'; item.append(thumb, link); grid.appendChild(item); }); const closeBtn = document.createElement('button'); closeBtn.textContent = '×'; closeBtn.style.cssText = 'position:fixed; top:10px; right:20px; font-size:30px; border:none; background:transparent; cursor:pointer; font-weight:bold; color:white;'; const closeGallery = () => { container.remove(); this.toggleMinimize(false); }; closeBtn.onclick = closeGallery; container.append(closeBtn, grid); document.body.appendChild(container); this.toggleMinimize(true); },
            showScreenshotOptionsDialog() { const id = 'wa-ss-options'; if (document.getElementById(id)) return; const container = document.createElement('div'); container.id = id; container.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:20px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.3); z-index:2147483647;'; container.innerHTML = '<h4>截圖選項</h4><p><label>格式: <select id="wa-ss-format"><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label></p><p><label>品質 (JPEG): <input type="range" id="wa-ss-quality" min="0.1" max="1" step="0.1" value="0.9"></label></p><div style="text-align:right; margin-top:20px;"><button id="wa-ss-cancel" style="margin-right:10px;">取消</button><button id="wa-ss-start" style="background:#007bff;color:white;border:none;padding:8px 12px;border-radius:4px;">開始截圖</button></div>'; document.body.appendChild(container); document.getElementById('wa-ss-start').onclick = () => { const format = document.getElementById('wa-ss-format').value; const quality = parseFloat(document.getElementById('wa-ss-quality').value); WebAssistant.core.captureScreenshot(format, quality); container.remove(); }; document.getElementById('wa-ss-cancel').onclick = () => container.remove(); },
            showScreenshotPreview(canvas, format, quality) { const container = document.createElement('div'); container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); z-index: 2147483647; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:20px;'; const img = document.createElement('img'); img.src = canvas.toDataURL(`image/${format}`, quality); img.style.cssText = 'max-width:90%; max-height:80vh; border: 2px solid white;'; const link = document.createElement('a'); link.href = img.src; link.download = `screenshot.${format}`; link.textContent = '下載截圖'; link.style.cssText = 'color:white; background:#28a745; padding:10px 20px; border-radius:5px; text-decoration:none; font-size:16px;'; const closeBtn = document.createElement('button'); closeBtn.textContent = '×'; closeBtn.style.cssText = 'position:absolute; top:10px; right:20px; font-size:30px; border:none; background:transparent; cursor:pointer; font-weight:bold; color:white;'; closeBtn.onclick = () => container.remove(); container.append(closeBtn, img, link); document.body.appendChild(container); },
            addNetworkLog(log) { const item = document.createElement('li'); item.style.cssText = 'border-bottom: 1px solid #444; padding: 5px; cursor:pointer;'; const statusColor = log.status >= 400 ? '#ff8a80' : (log.status >= 300 ? '#ffd180' : '#b9f6ca'); item.innerHTML = `<div><strong style="color:${statusColor};">[${log.status}]</strong> <span style="color:#80cbc4;">${log.method}</span>: ${log.url.substring(0, 100)}...</div>`; const details = document.createElement('pre'); details.style.cssText = 'display:none; background:#111; padding:8px; margin-top:5px; border-radius:3px; word-break:break-all; white-space:pre-wrap; max-height:150px; overflow-y:auto;'; details.textContent = log.response; item.onclick = () => details.style.display = details.style.display === 'none' ? 'block' : 'none'; item.appendChild(details); document.getElementById('wa-network-log').prepend(item); },
            createProbeTooltip() { this.state.probeTooltip = document.createElement('div'); this.state.probeTooltip.style.cssText = 'position:fixed; background: #212529; color:white; padding:8px; border-radius:4px; font-size:12px; font-family:monospace; z-index:2147483647; pointer-events:none; max-width:300px;'; document.body.appendChild(this.state.probeTooltip); },
            removeProbeTooltip() { if(this.state.probeTooltip) { this.state.probeTooltip.remove(); this.state.probeTooltip = null; } },
            toggleMainPanel(show) { const panel = document.getElementById('web-assistant-panel-v2'); if(panel) panel.style.display = show ? 'flex' : 'none'; },
            createMinimizedIcon() { if (document.getElementById('wa-minimized-icon')) return; const icon = document.createElement('div'); icon.id = 'wa-minimized-icon'; icon.textContent = '！'; icon.style.cssText = 'position:fixed; bottom:20px; right:20px; width:50px; height:50px; background:#007bff; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:24px; font-weight:bold; cursor:pointer; z-index:2147483646; box-shadow: 0 4px 10px rgba(0,0,0,0.3);'; icon.onclick = () => this.toggleMinimize(false); document.body.appendChild(icon); },
            toggleMinimize(minimize) { this.toggleMainPanel(!minimize); const icon = document.getElementById('wa-minimized-icon'); if(minimize) { if(!icon) this.createMinimizedIcon(); } else { if(icon) icon.remove(); } WebAssistant.state.isMinimized = minimize; }
        },
        modes: {
            enter(mode) {
                if (WebAssistant.state.activeMode) this.exit();
                WebAssistant.state.activeMode = mode;
                const btn = document.getElementById({'copy-table':'wa-copy-table-btn', 'copy-text':'wa-copy-text-btn', 'probe':'wa-probe-btn'}[mode]);
                if (btn) { btn.style.filter = 'brightness(70%)'; btn.style.fontWeight = 'bold'; }
                const text = { 'copy-table': '表格', 'copy-text': '段落', 'probe': '元素' }[mode];
                WebAssistant.ui.toggleOverlay(true, `請點擊您想${mode==='probe' ? '探測' : '複製'}的${text}`);
                document.addEventListener('mousemove', this.handleMouseMove); document.addEventListener('click', this.handleMouseClick, { capture: true }); document.addEventListener('keydown', this.handleKeyDown);
                if (mode === 'probe') WebAssistant.ui.createProbeTooltip();
            },
            exit() {
                const mode = WebAssistant.state.activeMode;
                if (!mode) return;
                const btn = document.getElementById({'copy-table':'wa-copy-table-btn', 'copy-text':'wa-copy-text-btn', 'probe':'wa-probe-btn'}[mode]);
                if (btn) { btn.style.filter = 'brightness(100%)'; btn.style.fontWeight = 'normal'; }
                WebAssistant.ui.toggleOverlay(false); WebAssistant.ui.unhighlightElement();
                if (mode === 'probe') WebAssistant.ui.removeProbeTooltip();
                document.removeEventListener('mousemove', this.handleMouseMove); document.removeEventListener('click', this.handleMouseClick, { capture: true }); document.removeEventListener('keydown', this.handleKeyDown);
                WebAssistant.state.activeMode = null;
            },
            handleMouseMove(event) {
                let element = null; const mode = WebAssistant.state.activeMode; const panel = document.getElementById('web-assistant-panel-v2');
                if (panel && panel.contains(event.target)) return;
                if (mode === 'copy-table') { element = event.target.closest('table'); }
                else if (mode === 'copy-text') { const target = event.target.closest('p, div, li, h1, h2, h3, blockquote, span, td, a'); if (target && target.innerText.trim().length > 20 && !target.closest('#web-assistant-panel-v2')) { element = target; } }
                else if (mode === 'probe') {
                    element = event.target; if (element.id.startsWith('wa-')) return;
                    WebAssistant.ui.highlightElement(element, '#f0ad4e');
                    const tooltip = WebAssistant.ui.state.probeTooltip;
                    if(tooltip) {
                        tooltip.style.left = `${event.clientX + 15}px`; tooltip.style.top = `${event.clientY + 15}px`;
                        const id = element.id ? `#${element.id}` : ''; const classes = element.className && typeof element.className ==='string' ? `.${element.className.trim().split(' ').join('.')}` : '';
                        tooltip.innerHTML = `<strong>${element.tagName.toLowerCase()}</strong>${id}${classes}<br>Size: ${element.offsetWidth} x ${element.offsetHeight}px`;
                    }
                }
                if(mode !== 'probe') { if (element) WebAssistant.ui.highlightElement(element); else WebAssistant.ui.unhighlightElement(); }
            },
            handleMouseClick(event) {
                const panel = document.getElementById('web-assistant-panel-v2'); if(panel && panel.contains(event.target)) return;
                event.preventDefault(); event.stopPropagation();
                const element = WebAssistant.ui.state.highlightedElement; const mode = WebAssistant.state.activeMode;
                if (!element) { WebAssistant.ui.showToast('未選取任何目標。', 'error'); WebAssistant.modes.exit(); return; }
                if (mode === 'copy-table') { WebAssistant.core.copyToClipboard(WebAssistant.core.tableToTSV(element), '表格已複製!', '自動複製失敗', '手動複製表格'); }
                else if (mode === 'copy-text') { WebAssistant.core.copyToClipboard(element.innerText, '段落已複製!', '自動複製失敗', '手動複製段落'); }
                else if (mode === 'probe') { WebAssistant.ui.showToast('已探測元素 (資訊顯示於 Console)'); console.log('探測元素:', element); }
                WebAssistant.modes.exit();
            },
            handleKeyDown(event) { if (event.key === 'Escape') { if(WebAssistant.state.activeMode) { WebAssistant.modes.exit(); } else { WebAssistant.destroy(); } } }
        },
        init() {
            this.ui.createMainPanel();
            document.querySelectorAll('#web-assistant-panel-v2 [data-tab-id]').forEach(tab => { tab.onclick = () => this.ui.switchTab(tab.dataset.tabId); });
            document.getElementById('wa-close-btn').onclick = () => this.destroy();
            document.getElementById('wa-minimize-btn').onclick = () => this.ui.toggleMinimize(true);
            document.getElementById('wa-unlock-btn').onclick = () => this.core.unlockPage();
            document.getElementById('wa-edit-btn').onclick = () => this.core.togglePageEditing();
            document.getElementById('wa-copy-table-btn').onclick = () => this.modes.enter('copy-table');
            document.getElementById('wa-copy-text-btn').onclick = () => this.modes.enter('copy-text');
            document.getElementById('wa-reader-btn').onclick = () => this.core.activateReaderMode();
            document.getElementById('wa-gallery-btn').onclick = () => this.core.showImageGallery();
            document.getElementById('wa-screenshot-btn').onclick = () => this.core.promptScreenshotOptions();
            document.getElementById('wa-probe-btn').onclick = () => this.modes.enter('probe');
            document.getElementById('wa-network-btn').onclick = () => this.core.toggleNetworkMonitor();
            const noteArea = document.getElementById('wa-note-area');
            noteArea.addEventListener('input', (e) => this.core.saveNote(e.target.value));
            new ResizeObserver(() => { if(noteArea.style.width && noteArea.style.height) this.core.saveNoteSize(noteArea.style.width, noteArea.style.height); }).observe(noteArea);
            document.getElementById('wa-export-notes-btn').onclick = () => this.core.exportAllNotes();
        },
        destroy() {
            if (this.state.isMonitoringNetwork) { this.core.unpatchNetworkFunctions(); }
            if (this.state.activeMode) { this.modes.exit(); }
            const panel = document.getElementById('web-assistant-panel-v2');
            if (panel) panel.remove();
            const minIcon = document.getElementById('wa-minimized-icon');
            if (minIcon) minIcon.remove();
            window.webAssistantInstance = null;
        }
    };
    window.webAssistantInstance = WebAssistant;
    WebAssistant.init();
})();