/**
 * ===================================================================
 * 商品查詢小工具 v4.0.0 (完整模組化重構版)
 *
 * 架構師：Gemini
 * 重構目標：將原始腳本拆分為九個獨立的功能模組，採用 IIFE 封裝，
 * 提升程式碼的可讀性、可維護性與可擴展性。
 * 特點：
 * - 嚴格的模組化分離 (資料、狀態、UI、邏輯)
 * - IIFE 作用域保護，避免全域污染
 * - 引入 AbortController 實現查詢中止功能
 * - 保留背景載入、持續性 Toast 與效能最佳化機制
 * ===================================================================
 */
javascript:(function() {
  'use strict';

  // 清理可能存在的舊工具實例
  (() => {
    ['planCodeQueryToolInstance', 'planCodeToolStyle', 'pctModalMask', 'pct-toast']
      .forEach(id => document.getElementById(id)?.remove());
  })();

  /**
   * ===================================================================
   * 模組 1：ConfigModule - 配置管理模組
   * ===================================================================
   */
  const ConfigModule = (() => {
    const config = Object.freeze({
      TOOL_ID: 'planCodeQueryToolInstance',
      STYLE_ID: 'planCodeToolStyle',
      VERSION: '4.0.0',
      QUERY_MODES: {
        PLAN_CODE: 'planCode',
        PLAN_NAME: 'planCodeName',
        ALL_MASTER_PLANS: 'allMasterPlans',
        MASTER_IN_SALE: 'masterInSale',
        MASTER_STOPPED: 'masterStopped',
        CHANNEL_IN_SALE: 'channelInSale',
        CHANNEL_STOPPED: 'channelStopped'
      },
      API_ENDPOINTS: {
        UAT: 'https://euisv-uat.apps.tocp4.kgilife.com.tw/euisw/euisbq/api',
        PROD: 'https://euisv.apps.ocp4.kgilife.com.tw/euisw/euisbq/api'
      },
      SALE_STATUS: {
        CURRENT: '現售中',
        STOPPED: '停售',
        PENDING: '未開始',
        ABNORMAL: '日期異常'
      },
      FIELD_MAPS: {
        CURRENCY: {'1':'TWD','2':'USD','3':'AUD','4':'CNT','5':'USD_OIU','6':'EUR','7':'JPY'},
        UNIT: {'A1':'元','A3':'仟元','A4':'萬元','B1':'計畫','C1':'單位'},
        COVERAGE_TYPE: {'M':'主約','R':'附約'},
        CHANNELS: ['AG','BR','BK','WS','EC']
      },
      DEFAULT_QUERY_PARAMS: {
        PAGE_SIZE_MASTER: 10000,
        PAGE_SIZE_CHANNEL: 5000,
        PAGE_SIZE_DETAIL: 50,
        PAGE_SIZE_TABLE: 50,
        BATCH_SIZE: 10
      },
      UI_SETTINGS: {
        DEBOUNCE_DELAY: 300,
        TOAST_DURATION: 2000
      }
    });
    return { get: () => config };
  })();

  /**
   * ===================================================================
   * 模組 2：UtilsModule - 工具函式模組
   * ===================================================================
   */
  const UtilsModule = (() => {
    const config = ConfigModule.get();
    const escapeHtml = t => typeof t==='string'?t.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])):t;
    const copyToClipboard = async (text, showToastCallback) => {
      try {
        await navigator.clipboard.writeText(text);
        showToastCallback('已複製', 'success');
      } catch (err) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy');
          document.body.removeChild(ta);
          showToastCallback('已複製 (舊版)', 'success');
        } catch (e) {
          showToastCallback('複製失敗', 'error');
        }
      }
    };
    const formatToday = () => { const d=new Date(); return `${d.getFullYear()}${('0'+(d.getMonth()+1)).slice(-2)}${('0'+d.getDate()).slice(-2)}`; };
    const formatDateForUI = dt => !dt ? '' : String(dt).split(' ')[0].replace(/-/g,'');
    const formatDateForComparison = dt => { if(!dt)return''; const p=String(dt).split(' ')[0]; return /^\d{8}$/.test(p)?p.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'):p; };
    const getSaleStatus = (today, start, end) => {
      if(!start||!end)return''; if(end.includes('9999'))return config.SALE_STATUS.CURRENT;
      const t=new Date(formatDateForComparison(today)),s=new Date(formatDateForComparison(start)),e=new Date(formatDateForComparison(end));
      if(isNaN(t)||isNaN(s)||isNaN(e))return'日期格式錯誤'; if(s>e)return config.SALE_STATUS.ABNORMAL;
      if(t>e)return config.SALE_STATUS.STOPPED; if(t<s)return config.SALE_STATUS.PENDING;
      return config.SALE_STATUS.CURRENT;
    };
    const checkSpecialStatus = (item, today) => {
      const mainStatus = getSaleStatus(today, item._originalItem.saleStartDate, item._originalItem.saleEndDate);
      const channels = item.channels||[];
      if(mainStatus===config.SALE_STATUS.STOPPED && channels.some(c=>c.status===config.SALE_STATUS.CURRENT))return true;
      if(mainStatus===config.SALE_STATUS.CURRENT && channels.length>0 && channels.every(c=>[config.SALE_STATUS.STOPPED,config.SALE_STATUS.PENDING].includes(c.status)))return true;
      if(channels.some(c=>{const mE=new Date(formatDateForComparison(item.saleEndDate)),cE=new Date(formatDateForComparison(c.rawEnd)); return !isNaN(mE)&&!isNaN(cE)&&mE<cE;}))return true;
      if(mainStatus===config.SALE_STATUS.ABNORMAL)return true;
      return false;
    };
    return {
      escapeHtml, copyToClipboard, formatToday, formatDateForUI, formatDateForComparison, getSaleStatus, checkSpecialStatus,
      channelUIToAPI: c => c==='BK'?'OT':c, channelAPIToUI: c => c==='OT'?'BK':c,
      currencyConvert: v => config.FIELD_MAPS.CURRENCY[String(v)]||v||'',
      unitConvert: v => config.FIELD_MAPS.UNIT[String(v)]||v||'',
      coverageTypeConvert: v => config.FIELD_MAPS.COVERAGE_TYPE[String(v)]||v||'',
      splitInput: i => i.trim().split(/[\s,;，；、|\n\r]+/).filter(Boolean),
    };
  })();

  /**
   * ===================================================================
   * 模組 3：StyleModule - 樣式管理模組
   * ===================================================================
   */
  const StyleModule = (() => {
    const config = ConfigModule.get();
    const cssContent = `
      :root{--primary-color:#4A90E2;--primary-dark-color:#357ABD;--secondary-color:#6C757D;--secondary-dark-color:#5A6268;--success-color:#5CB85C;--error-color:#D9534F;--warning-color:#F0AD4E;--warning-dark-color:#EC971F;--info-color:#5BC0DE;--background-light:#F8F8F8;--surface-color:#FFFFFF;--border-color:#E0E0E0;--text-color-dark:#1a1a1a;--text-color-light:#333;--box-shadow-light:rgba(0,0,0,0.08);--box-shadow-medium:rgba(0,0,0,0.15);--border-radius-base:6px;--border-radius-lg:10px;--transition-speed:0.25s;}
      .pct-modal-mask{position:fixed;z-index:2147483646;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);opacity:0;transition:opacity var(--transition-speed) ease-out;} .pct-modal-mask.show{opacity:1;}
      .pct-modal{font-family:'Microsoft JhengHei','Segoe UI',Roboto,sans-serif;background:var(--surface-color);border-radius:var(--border-radius-lg);box-shadow:0 4px 24px var(--box-shadow-medium);padding:0;width:1200px;max-width:95vw;position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-20px);opacity:0;z-index:2147483647;transition:opacity var(--transition-speed) cubic-bezier(0.25,0.8,0.25,1),transform var(--transition-speed) cubic-bezier(0.25,0.8,0.25,1);display:flex;flex-direction:column;} .pct-modal.show{opacity:1;transform:translateX(-50%) translateY(0);} .pct-modal.dragging{transition:none;}
      .pct-modal-header{padding:16px 20px 8px;font-size:20px;font-weight:bold;border-bottom:1px solid var(--border-color);color:var(--text-color-dark);cursor:grab;} .pct-modal-header.dragging{cursor:grabbing;}
      .pct-modal-body{padding:16px 20px 8px;flex-grow:1;overflow-y:auto;min-height:50px;}
      .pct-modal-footer{padding:12px 20px 16px;text-align:right;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;}
      .pct-btn{display:inline-flex;align-items:center;justify-content:center;margin:0;padding:8px 18px;font-size:15px;border-radius:var(--border-radius-base);border:none;background:var(--primary-color);color:#fff;cursor:pointer;transition:all var(--transition-speed);font-weight:600;box-shadow:0 2px 5px var(--box-shadow-light);white-space:nowrap;} .pct-btn:hover{background:var(--primary-dark-color);transform:translateY(-1px) scale(1.01);box-shadow:0 4px 8px var(--box-shadow-medium);} .pct-btn:disabled{background:#CED4DA;color:#A0A0A0;cursor:not-allowed;transform:none;box-shadow:none;}
      .pct-btn-secondary{background:var(--secondary-color);} .pct-btn-secondary:hover{background:var(--secondary-dark-color);}
      .pct-btn-retry{background:var(--warning-color);color:var(--text-color-dark);border:1px solid var(--warning-dark-color);} .pct-btn-retry:hover{background:var(--warning-dark-color);color:white;}
      .pct-filter-btn{font-size:14px;padding:5px 12px;background:var(--warning-color);color:var(--text-color-dark);border:1px solid var(--warning-dark-color);border-radius:5px;cursor:pointer;transition:all .2s;font-weight:600;box-shadow:0 1px 3px var(--box-shadow-light);} .pct-filter-btn:hover{background:var(--warning-dark-color);transform:translateY(-1px);} .pct-filter-btn.active{background:var(--warning-dark-color);color:white;box-shadow:0 2px 6px rgba(240,173,78,0.4);}
      .pct-input{width:100%;font-size:16px;padding:9px 12px;border-radius:5px;border:1px solid var(--border-color);box-sizing:border-box;margin-top:5px;transition:all var(--transition-speed);} .pct-input:focus{border-color:var(--primary-color);box-shadow:0 0 0 2px rgba(74,144,226,0.2);outline:none;}
      .pct-error{color:var(--error-color);font-size:13px;margin:8px 0 0;display:block;} .pct-label{font-weight:bold;color:var(--text-color-dark);display:block;margin-bottom:5px;} .pct-form-group{margin-bottom:20px;}
      .pct-mode-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:20px;}
      .pct-mode-card{background:var(--background-light);border:1px solid var(--border-color);border-radius:var(--border-radius-base);padding:18px 10px;text-align:center;cursor:pointer;transition:all var(--transition-speed) ease-out;font-weight:500;font-size:15px;color:var(--text-color-dark);display:flex;align-items:center;justify-content:center;min-height:65px;box-shadow:0 2px 6px var(--box-shadow-light);} .pct-mode-card:hover{border-color:var(--primary-color);transform:translateY(-3px) scale(1.02);box-shadow:0 6px 15px rgba(74,144,226,0.2);} .pct-mode-card.selected{background:var(--primary-color);color:white;border-color:var(--primary-color);font-weight:bold;}
      .pct-sub-option-grid,.pct-channel-option-grid{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;margin-bottom:15px;}
      .pct-sub-option,.pct-channel-option{background:var(--background-light);border:1px solid var(--border-color);border-radius:var(--border-radius-base);padding:8px 15px;cursor:pointer;transition:all var(--transition-speed) ease-out;font-weight:500;font-size:14px;color:var(--text-color-dark);white-space:nowrap;} .pct-sub-option:hover,.pct-channel-option:hover{border-color:var(--primary-color);transform:translateY(-1px);box-shadow:0 2px 6px var(--box-shadow-light);} .pct-sub-option.selected,.pct-channel-option.selected{background:var(--primary-color);color:white;border-color:var(--primary-color);}
      .pct-search-container{margin-bottom:15px;position:relative;} .pct-search-input{width:100%;font-size:14px;padding:8px 35px 8px 12px;border-radius:5px;border:1px solid var(--border-color);box-sizing:border-box;transition:all var(--transition-speed);} .pct-search-input:focus{border-color:var(--primary-color);box-shadow:0 0 0 2px rgba(74,144,226,0.2);outline:none;} .pct-search-icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--text-color-light);pointer-events:none;} .pct-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-color-light);cursor:pointer;font-size:16px;padding:2px;display:none;}
      .pct-table-wrap{max-height:55vh;overflow:auto;margin:15px 0;} .pct-table{border-collapse:collapse;width:100%;font-size:14px;background:var(--surface-color);min-width:800px;}
      .pct-table th,.pct-table td{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top;} .pct-table th{background:#f8f8f8;color:var(--text-color-dark);font-weight:bold;cursor:pointer;position:sticky;top:0;z-index:1;white-space:nowrap;} .pct-table th:hover{background:#e9ecef;}
      .pct-table th[data-key]{position:relative;user-select:none;padding-right:25px;} .pct-table th[data-key]:after{content:'↕';position:absolute;right:8px;top:50%;transform:translateY(-50%);opacity:0.3;font-size:12px;} .pct-table th[data-key].sort-asc:after{content:'↑';opacity:1;color:var(--primary-color);} .pct-table th[data-key].sort-desc:after{content:'↓';opacity:1;color:var(--primary-color);}
      .pct-table tr.special-row{background:#fffde7;border-left:4px solid var(--warning-color);} .pct-table tr:hover{background:#e3f2fd;} .pct-table tr.error-row{background:#ffebee;}
      .pct-table td small{display:block;font-size:11px;color:var(--text-color-light);margin-top:2px;} .pct-td-copy{cursor:pointer;transition:background .15s;} .pct-td-copy:hover{background:#f0f7ff;}
      .pct-status-onsale{color:#1976d2;font-weight:bold;} .pct-status-offsale{color:#e53935;font-weight:bold;} .pct-status-pending{color:var(--info-color);font-weight:bold;} .pct-status-abnormal{color:#8A2BE2;font-weight:bold;}
      .pct-toast{position:fixed;left:50%;top:30px;transform:translateX(-50%);background:var(--text-color-dark);color:#fff;padding:10px 22px;border-radius:var(--border-radius-base);font-size:16px;z-index:2147483647;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;box-shadow:0 4px 12px var(--box-shadow-medium);white-space:nowrap;} .pct-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;}
      .pct-toast.success{background:var(--success-color);} .pct-toast.error{background:var(--error-color);} .pct-toast.warning{background:var(--warning-color);color:var(--text-color-dark);} .pct-toast.info{background:var(--info-color);}
      .pct-summary{font-size:15px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--text-color-dark);} .pct-summary b{color:var(--warning-color);}
      .pct-pagination{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:15px;flex-wrap:wrap;} .pct-pagination-info{margin-right:auto;font-size:14px;color:var(--text-color-light);} .pct-page-input{width:60px;text-align:center;padding:4px;border:1px solid var(--border-color);border-radius:3px;}
      @media(max-width:768px){.pct-modal{width:98vw;top:20px;max-height:95vh;} .pct-modal-header{font-size:18px;padding:12px 15px 6px;} .pct-modal-body{padding:12px 15px 6px;} .pct-modal-footer{flex-direction:column;align-items:stretch;padding:10px 15px 12px;} .pct-btn{width:100%;margin:4px 0;} .pct-mode-card-grid{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px;} .pct-mode-card{font-size:13px;padding:10px 8px;min-height:45px;} .pct-table-wrap{max-height:40vh;} .pct-toast{top:10px;width:90%;left:5%;transform:translateX(0);text-align:center;white-space:normal;} .pct-pagination{flex-direction:column;align-items:flex-start;gap:8px;} .pct-pagination-info{width:100%;text-align:center;}}
    `;
    return {
      inject: () => { if(document.getElementById(config.STYLE_ID))return; const s=document.createElement('style'); s.id=config.STYLE_ID; s.textContent=cssContent; document.head.appendChild(s); },
      remove: () => { document.getElementById(config.STYLE_ID)?.remove(); }
    };
  })();

  /**
   * ===================================================================
   * 模組 4：StateModule - 狀態管理模組
   * ===================================================================
   */
  const StateModule = (() => {
    const config = ConfigModule.get();
    const getInitialToken = () => {
      const sources=['SSO-TOKEN','euisToken'];
      for(const s of sources){
        const t=localStorage.getItem(s)||sessionStorage.getItem(s);
        if(t&&t.trim()&&t!=='null'&&t!=='undefined')return t.trim();
      } return '';
    };
    let state = {
      env: (window.location.host.toLowerCase().includes('uat') || window.location.host.toLowerCase().includes('test')) ? 'UAT' : 'PROD',
      token: getInitialToken(),
      currentQueryController: null,
      queryMode:'', queryInput:'', querySubOption:[], queryChannels:[],
      allRawData:[], allProcessedData:[], totalRecords:0, pageNo:1, pageSize:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_TABLE,
      filterSpecial:false, sortKey:'', sortAsc:true, searchKeyword:'', detailQueryCount:0,
      cacheDetail:new Map(), cacheChannel:new Map(),
    };
    return {
      get: () => ({ ...state }),
      set: (updates) => { state = { ...state, ...updates }; },
      resetQueryState: () => { state.queryMode=''; state.queryInput=''; state.querySubOption=[]; state.queryChannels=[]; state.pageNo=1; state.filterSpecial=false; state.detailQueryCount=0; state.searchKeyword=''; state.sortKey=''; state.sortAsc=true; },
      resetDataCache: () => { state.allRawData=[]; state.allProcessedData=[]; state.cacheDetail.clear(); state.cacheChannel.clear(); }
    };
  })();

  /**
   * ===================================================================
   * 模組 5：ApiModule - API 服務模組
   * ===================================================================
   */
  const ApiModule = (() => {
    const config = ConfigModule.get();
    const getApiBase = () => StateModule.get().env==='PROD'?config.API_ENDPOINTS.PROD:config.API_ENDPOINTS.UAT;
    const callApi = async (endpoint, params, signal) => {
      const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json','SSO-TOKEN':StateModule.get().token}, body:JSON.stringify(params), signal });
      if(!res.ok){ const txt=await res.text(); let msg=`API Error: ${res.status}`; try{const json=JSON.parse(txt);msg+=` - ${json.message||json.error||''}`}catch(e){msg+=` - ${txt}`} throw new Error(msg); }
      return res.json();
    };
    const verifyToken = async (token) => {
      try {
        const res = await callApi(`${getApiBase()}/planCodeController/query`, {planCode:'5105',currentPage:1,pageSize:1});
        return !!res.records;
      } catch (e) { return false; }
    };
    return { callApi, verifyToken, getApiBase };
  })();

  /**
   * ===================================================================
   * 模組 6：UIModule - UI 元件模組
   * ===================================================================
   */
  const UIModule = (() => {
    const config = ConfigModule.get();
    let toastTimer = null;
    const Toast = {
      show: (msg, type='info', duration=config.UI_SETTINGS.TOAST_DURATION, persistent=false) => {
        clearTimeout(toastTimer);
        let el = document.getElementById('pct-toast');
        if(!el){ el=document.createElement('div'); el.id='pct-toast'; document.body.appendChild(el); }
        el.className=`pct-toast ${type}`; el.textContent=msg; el.classList.add('show');
        if(!persistent){ toastTimer=setTimeout(()=>Toast.hide(), duration); }
      },
      hide: () => { const el=document.getElementById('pct-toast'); if(el){el.classList.remove('show'); el.addEventListener('transitionend',()=>el.remove(),{once:true});} }
    };
    const Modal = {
      show: (html, onOpen) => {
        Modal.close();
        const mask=document.createElement('div'); mask.id='pctModalMask'; mask.className='pct-modal-mask';
        mask.onclick=e=>{if(e.target===mask)ControllerModule.closeApp();}; document.body.appendChild(mask);
        const modal=document.createElement('div'); modal.id=config.TOOL_ID; modal.className='pct-modal'; modal.innerHTML=html; document.body.appendChild(modal);
        requestAnimationFrame(()=>{mask.classList.add('show'); modal.classList.add('show');});
        if(onOpen){setTimeout(()=>onOpen(modal),50);}
      },
      close: () => {
        StateModule.get().currentQueryController?.abort(); StateModule.set({currentQueryController:null});
        document.getElementById(config.TOOL_ID)?.remove(); document.getElementById('pctModalMask')?.remove();
        Toast.hide();
      }
    };
    const showError = (msg, elId) => { const el=document.getElementById(elId); if(el){el.textContent=msg;el.style.display='block';}else{Toast.show(msg,'error');} };
    const hideError = (elId) => { const el=document.getElementById(elId); if(el){el.style.display='none';el.textContent='';} };
    return { Toast, Modal, showError, hideError };
  })();

  /**
   * ===================================================================
   * 模組 7：EventModule - 事件處理模組
   * ===================================================================
   */
  const EventModule = (() => {
    const config = ConfigModule.get();
    const setupTokenDialogEvents = m => {
      m.querySelector('#pct-token-ok').onclick=ControllerModule.handleTokenVerification;
      m.querySelector('#pct-token-skip').onclick=ControllerModule.handleTokenSkip;
      m.querySelector('#pct-token-cancel').onclick=ControllerModule.closeApp;
    };
    const setupQueryDialogEvents = m => {
      m.querySelector('#pct-mode-wrap').onclick=e=>{if(e.target.classList.contains('pct-mode-card'))ControllerModule.handleQueryModeChange(e.target.dataset.mode);};
      m.querySelector('#pct-dynamic-query-content').onclick=e=>{
        if(e.target.classList.contains('pct-sub-option'))ControllerModule.handleSubOptionChange(e.target.dataset.subOption);
        if(e.target.classList.contains('pct-channel-option'))ControllerModule.handleChannelChange(e.target.dataset.channel);
      };
      m.querySelector('#pct-query-ok').onclick=ControllerModule.executeQuery;
      m.querySelector('#pct-query-cancel').onclick=ControllerModule.closeApp;
      m.querySelector('#pct-query-clear-selection').onclick=ControllerModule.handleClearSelection;
    };
    const setupResultsTableEvents = m => {
      m.querySelector('#pct-filter-special').onclick=ControllerModule.toggleSpecialFilter;
      m.querySelector('#pct-copy-result').onclick=ControllerModule.copyResults;
      m.querySelector('#pct-detail-query').onclick=()=>ControllerModule.handleDetailQuery(true);
      m.querySelector('#pct-refresh-data').onclick=ControllerModule.refreshData;
      m.querySelector('#pct-back-query').onclick=ControllerModule.showQueryDialog;
      m.querySelector('#pct-close-result').onclick=ControllerModule.closeApp;
      m.onclick=e=>{
        if(e.target.closest('th[data-key]'))ControllerModule.handleSort(e.target.closest('th[data-key]').dataset.key);
        if(e.target.classList.contains('pct-td-copy'))UtilsModule.copyToClipboard(e.target.dataset.copy,UIModule.Toast.show);
        if(e.target.id==='pct-prev-page')ControllerModule.changePage(-1);
        if(e.target.id==='pct-next-page')ControllerModule.changePage(1);
        if(e.target.id==='pct-search-clear')ControllerModule.clearSearch();
      };
      m.querySelector('#pct-page-input').onchange=e=>ControllerModule.goToPage(e.target.value);
      let timer; m.querySelector('#pct-search-input').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>ControllerModule.handleSearch(e.target.value),config.UI_SETTINGS.DEBOUNCE_DELAY);};
    };
    return { setupTokenDialogEvents, setupQueryDialogEvents, setupResultsTableEvents };
  })();

  /**
   * ===================================================================
   * 模組 8：DataModule - 資料處理模組
   * ===================================================================
   */
  const DataModule = (() => {
    const config = ConfigModule.get();
    const fetchAllData = async (signal) => {
        const state = StateModule.get();
        const apiBase = ApiModule.getApiBase();
        let rawData = [];
        switch(state.queryMode){
            case config.QUERY_MODES.PLAN_CODE:
                const codes = UtilsModule.splitInput(state.queryInput);
                if(codes.length===0) throw new Error('請輸入商品代碼');
                rawData = (await queryMultiplePlanCodes(codes, apiBase, signal)).records;
                break;
            case config.QUERY_MODES.PLAN_NAME:
                rawData = (await ApiModule.callApi(`${apiBase}/planCodeController/queryByPlanName`,{planName:state.queryInput,currentPage:1,pageSize:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_MASTER},signal)).records||[];
                break;
            case config.QUERY_MODES.ALL_MASTER_PLANS:
                rawData = (await ApiModule.callApi(`${apiBase}/planCodeController/query`,{planCode:'',currentPage:1,pageSize:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_MASTER},signal)).records||[];
                break;
            case config.QUERY_MODES.MASTER_IN_SALE:
                rawData = (await ApiModule.callApi(`${apiBase}/planCodeController/query`,{saleEndDate:'9999-12-31 00:00:00',currentPage:1,pageSize:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_MASTER},signal)).records||[];
                break;
            case config.QUERY_MODES.MASTER_STOPPED:
                const today=UtilsModule.formatToday(); const todayFmt=`${today.substring(0,4)}-${today.substring(4,6)}-${today.substring(6,8)} 23:59:59`;
                rawData = ((await ApiModule.callApi(`${apiBase}/planCodeController/query`,{saleEndDate:todayFmt,currentPage:1,pageSize:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_MASTER},signal)).records||[]).filter(i=>i.saleEndDate&&!i.saleEndDate.includes('9999'));
                break;
            case config.QUERY_MODES.CHANNEL_IN_SALE:
            case config.QUERY_MODES.CHANNEL_STOPPED:
                rawData = await queryChannelData(state.queryMode, state.queryChannels, apiBase, signal);
                break;
            default: throw new Error('未知的查詢模式');
        }
        return rawData;
    };
    const queryMultiplePlanCodes = async (codes, apiBase, signal) => {
        const BATCH=config.DEFAULT_QUERY_PARAMS.BATCH_SIZE, allRecords=[];
        UIModule.Toast.show(`開始批量查詢 ${codes.length} 個商品...`,'info',3000);
        for(let i=0;i<codes.length;i+=BATCH){
            const batch=codes.slice(i,i+BATCH);
            UIModule.Toast.show(`處理第 ${Math.floor(i/BATCH)+1}/${Math.ceil(codes.length/BATCH)} 批...`,'info',1500);
            const results=await Promise.all(batch.map(async code=>{try{const res=await ApiModule.callApi(`${apiBase}/planCodeController/query`,{planCode:code,currentPage:1,pageSize:1},signal);return res.records&&res.records.length>0?res.records:[{planCode:code,_apiStatus:'查無資料',_isErrorRow:true}]}catch(e){return[{planCode:code,_apiStatus:'查詢失敗',_isErrorRow:true}]}}));
            results.forEach(r=>allRecords.push(...r));
        }
        return {records:allRecords,totalRecords:allRecords.length};
    };
    const queryChannelData = async (mode, channels, apiBase, signal) => {
        const toQuery=channels.length>0?channels:config.FIELD_MAPS.CHANNELS;
        if(mode===config.QUERY_MODES.CHANNEL_STOPPED){
            UIModule.Toast.show(`查詢通路停售: 先查全部再排除現售...`,'info',2000);
            const [all,current]=await Promise.all([queryAllChannelData(toQuery,apiBase,signal),queryCurrentSaleChannelData(toQuery,apiBase,signal)]);
            const currentSet=new Set(current.map(i=>`${i.planCode}_${i.channel}`));
            return removeDuplicateChannelRecords(all.filter(i=>!currentSet.has(`${i.planCode}_${UtilsModule.channelAPIToUI(i.channel)}`)));
        }else{
            return removeDuplicateChannelRecords(await queryCurrentSaleChannelData(toQuery,apiBase,signal));
        }
    };
    const queryAllChannelData = async(channels,apiBase,signal)=>{
        const res=await Promise.all(channels.map(async c=>{try{const apiC=UtilsModule.channelUIToAPI(c);const params={channel:apiC,pageIndex:1,size:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_CHANNEL,orderBys:["planCode asc"]};const result=await ApiModule.callApi(`${apiBase}/planCodeSaleDateController/query`,params,signal);(result.planCodeSaleDates?.records||[]).forEach(r=>{r._sourceChannel=c;r.channel=UtilsModule.channelAPIToUI(r.channel)});return result.planCodeSaleDates?.records||[]}catch(e){return[]}}));
        return res.flat();
    };
    const queryCurrentSaleChannelData = async(channels,apiBase,signal)=>{
        const res=await Promise.all(channels.map(async c=>{try{const apiC=UtilsModule.channelUIToAPI(c);const params={channel:apiC,saleEndDate:"9999-12-31 00:00:00",pageIndex:1,size:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_CHANNEL,orderBys:["planCode asc"]};const result=await ApiModule.callApi(`${apiBase}/planCodeSaleDateController/query`,params,signal);(result.planCodeSaleDates?.records||[]).forEach(r=>{r._sourceChannel=c;r.channel=UtilsModule.channelAPIToUI(r.channel)});return result.planCodeSaleDates?.records||[]}catch(e){return[]}}));
        return res.flat();
    };
    const removeDuplicateChannelRecords=data=>{const unique=[],seen=new Set();for(const r of data){const id=r.planCode+(r._sourceChannel||'');if(!seen.has(id)){seen.add(id);unique.push(r)}}return unique};
    const processDataInBackground = async (rawData, forceFetch, onProgress) => {
        const today=UtilsModule.formatToday(),apiBase=ApiModule.getApiBase(),state=StateModule.get();
        const promises = rawData.map(async(item,idx)=>{
            if(item._isErrorRow)return{no:idx+1,planCode:item.planCode||'-',shortName:'-',currency:'-',unit:'-',coverageType:'-',saleStartDate:'-',saleEndDate:`狀態: ${UtilsModule.escapeHtml(item._apiStatus)}`,mainStatus:'-',polpln:'-',channels:[],special:false,_isErrorRow:true,_originalItem:item};
            let polpln=item.polpln||'',channels=item.channels||[];
            const detailPromise=(!polpln||forceFetch||!state.cacheDetail.has(item.planCode))?ApiModule.callApi(`${apiBase}/planCodeController/queryDetail`,{planCode:item.planCode,currentPage:1,pageSize:1},state.currentQueryController?.signal).then(d=>{const p=(d.records||[]).map(r=>r.polpln).filter(Boolean).join(', ');StateModule.set({cacheDetail:state.cacheDetail.set(item.planCode,p)});return p;}).catch(()=>''):Promise.resolve(state.cacheDetail.get(item.planCode));
            const channelPromise=(channels.length===0||forceFetch||!state.cacheChannel.has(item.planCode))?ApiModule.callApi(`${apiBase}/planCodeSaleDateController/query`,{planCode:item.planCode,currentPage:1,pageSize:config.DEFAULT_QUERY_PARAMS.PAGE_SIZE_CHANNEL},state.currentQueryController?.signal).then(s=>{const c=(s.planCodeSaleDates?.records||[]).map(r=>({channel:UtilsModule.channelAPIToUI(r.channel),saleStartDate:UtilsModule.formatDateForUI(r.saleStartDate),saleEndDate:UtilsModule.formatDateForUI(r.saleEndDate),status:UtilsModule.getSaleStatus(today,r.saleStartDate,r.saleEndDate),rawEnd:r.saleEndDate}));StateModule.set({cacheChannel:state.cacheChannel.set(item.planCode,c)});return c;}).catch(()=>[]):Promise.resolve(state.cacheChannel.get(item.planCode));
            const[finalPolpln,finalChannels]=await Promise.all([detailPromise,channelPromise]);
            onProgress(idx);
            const processed={no:idx+1,planCode:item.planCode||'-',shortName:item.shortName||item.planName||'-',currency:UtilsModule.currencyConvert(item.currency||item.cur),unit:UtilsModule.unitConvert(item.reportInsuranceAmountUnit||item.insuranceAmountUnit),coverageType:UtilsModule.coverageTypeConvert(item.coverageType||item.type),saleStartDate:UtilsModule.formatDateForUI(item.saleStartDate),saleEndDate:UtilsModule.formatDateForUI(item.saleEndDate),mainStatus:UtilsModule.getSaleStatus(today,item.saleStartDate,item.saleEndDate),polpln:finalPolpln||'無',channels:finalChannels,special:false,_isErrorRow:false,_originalItem:item};
            processed.special=UtilsModule.checkSpecialStatus(processed,today);
            return processed;
        });
        const results=await Promise.allSettled(promises);
        return results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    };
    const filterAndSortData = (data) => {
        const {searchKeyword,filterSpecial,sortKey,sortAsc}=StateModule.get(); let displayData=[...data];
        if(searchKeyword){const kw=searchKeyword.toLowerCase();displayData=displayData.filter(i=>Object.values(i).some(v=>String(v).toLowerCase().includes(kw)));}
        if(filterSpecial)displayData=displayData.filter(i=>i.special);
        if(sortKey){displayData.sort((a,b)=>{const vA=a[sortKey],vB=b[sortKey];if(sortKey.includes('Date')){const dA=new Date(UtilsModule.formatDateForComparison(vA)),dB=new Date(UtilsModule.formatDateForComparison(vB));if(isNaN(dA))return 1;if(isNaN(dB))return -1;return sortAsc?dA-dB:dB-dA}if(typeof vA==='string')return sortAsc?vA.localeCompare(vB):vB.localeCompare(vA);return sortAsc?vA-vB:vB-vA;});}
        return displayData;
    };
    return { fetchAllData, processDataInBackground, filterAndSortData };
  })();

  /**
   * ===================================================================
   * 模組 9：ControllerModule - 主控制器模組
   * ===================================================================
   */
  const ControllerModule = (() => {
    const config = ConfigModule.get();
    const initialize = async () => {
      StyleModule.inject(); const state=StateModule.get();
      if(!state.token){showTokenDialog();return;}
      UIModule.Toast.show('驗證 Token...','info',null,true);
      const isValid = await ApiModule.verifyToken(state.token);
      UIModule.Toast.hide();
      isValid ? showQueryDialog() : showTokenDialog();
    };
    const closeApp = () => { UIModule.Modal.close(); StyleModule.remove(); };
    const showTokenDialog = () => {
      const state=StateModule.get();
      const html=`<div class="pct-modal-header"><span id="pct-modal-title">商品查詢小工具 v${config.VERSION} (${state.env})</span></div><div class="pct-modal-body"><div class="pct-form-group"><label for="pct-token-input" class="pct-label">請輸入 SSO-TOKEN：</label><textarea class="pct-input" id="pct-token-input" rows="4" placeholder="貼上 SSO-TOKEN">${state.token||''}</textarea><div class="pct-error" id="pct-token-err" style="display:none;"></div></div></div><div class="pct-modal-footer"><button class="pct-btn" id="pct-token-ok">驗證並繼續</button><button class="pct-btn pct-btn-secondary" id="pct-token-skip">略過</button><button class="pct-btn pct-btn-secondary" id="pct-token-cancel">取消</button></div>`;
      UIModule.Modal.show(html,EventModule.setupTokenDialogEvents);
    };
    const handleTokenVerification = async () => {
      const token=document.getElementById('pct-token-input').value.trim();
      if(!token)return UIModule.showError('請輸入 Token','pct-token-err');
      UIModule.Toast.show('檢查 Token...','info',null,true); StateModule.set({token}); localStorage.setItem('SSO-TOKEN',token);
      const isValid=await ApiModule.verifyToken(token); UIModule.Toast.hide();
      if(isValid){UIModule.Toast.show('Token 驗證成功','success');showQueryDialog();}else{UIModule.showError('Token 驗證失敗','pct-token-err');}
    };
    const handleTokenSkip = () => {
      const token=document.getElementById('pct-token-input').value.trim(); if(token){StateModule.set({token});localStorage.setItem('SSO-TOKEN',token);}
      UIModule.Toast.show('已略過 Token 驗證','warning'); showQueryDialog();
    };
    const showQueryDialog = () => {
      const state=StateModule.get(); const {queryMode,queryInput,querySubOption,queryChannels}=state;
      const primaryModes=[config.QUERY_MODES.PLAN_CODE,config.QUERY_MODES.PLAN_NAME,config.QUERY_MODES.ALL_MASTER_PLANS,'masterDataCategory','channelDataCategory'];
      const modeLabel=m=>{const l={'planCode':'代碼','planCodeName':'名稱','allMasterPlans':'全部主檔','masterDataCategory':'主檔分類','channelDataCategory':'通路分類'};return l[m]||m};
      let dynamicHtml='';
      if(queryMode===config.QUERY_MODES.PLAN_CODE||queryMode===config.QUERY_MODES.PLAN_NAME)dynamicHtml=`<div class="pct-form-group"><label for="pct-query-input" class="pct-label">輸入${queryMode===config.QUERY_MODES.PLAN_CODE?'商品代碼':'名稱關鍵字'}：</label><textarea class="pct-input" id="pct-query-input" rows="3" placeholder="多筆請用空格、逗號或換行分隔">${queryInput}</textarea></div>`;
      else if(queryMode==='masterDataCategory')dynamicHtml=`<div class="pct-form-group"><div class="pct-label">選擇主檔查詢範圍：</div><div class="pct-sub-option-grid">${[config.QUERY_MODES.MASTER_IN_SALE,config.QUERY_MODES.MASTER_STOPPED].map(o=>`<div class="pct-sub-option ${querySubOption.includes(o)?'selected':''}" data-sub-option="${o}">${o===config.QUERY_MODES.MASTER_IN_SALE?'現售':'停售'}</div>`).join('')}</div></div>`;
      else if(queryMode==='channelDataCategory'){dynamicHtml=`<div class="pct-form-group"><div class="pct-label">選擇通路 (可多選)：</div><div class="pct-channel-option-grid">${config.FIELD_MAPS.CHANNELS.map(c=>`<div class="pct-channel-option ${queryChannels.includes(c)?'selected':''}" data-channel="${c}">${c}</div>`).join('')}</div></div><div class="pct-form-group"><div class="pct-label">選擇通路銷售範圍：</div><div class="pct-sub-option-grid">${[config.QUERY_MODES.CHANNEL_IN_SALE,config.QUERY_MODES.CHANNEL_STOPPED].map(o=>`<div class="pct-sub-option ${querySubOption.includes(o)?'selected':''}" data-sub-option="${o}">${o===config.QUERY_MODES.CHANNEL_IN_SALE?'現售':'停售'}</div>`).join('')}</div></div>`;}
      const html=`<div class="pct-modal-header"><span id="pct-modal-title">查詢條件設定 (${state.env})</span></div><div class="pct-modal-body"><div class="pct-form-group"><div class="pct-label">查詢模式：</div><div id="pct-mode-wrap" class="pct-mode-card-grid">${primaryModes.map(m=>`<div class="pct-mode-card ${queryMode===m?'selected':''}" data-mode="${m}">${modeLabel(m)}</div>`).join('')}</div></div><div id="pct-dynamic-query-content">${dynamicHtml}</div><div class="pct-error" id="pct-query-err" style="display:none"></div></div><div class="pct-modal-footer"><button class="pct-btn" id="pct-query-ok">開始查詢</button><button class="pct-btn pct-btn-secondary" id="pct-query-clear-selection">清除</button><button class="pct-btn pct-btn-secondary" id="pct-query-cancel">取消</button></div>`;
      UIModule.Modal.show(html,m=>{EventModule.setupQueryDialogEvents(m);const input=m.querySelector('#pct-query-input');if(input)input.oninput=e=>StateModule.set({queryInput:e.target.value});});
    };
    const handleQueryModeChange=mode=>{StateModule.set({queryMode:mode,queryInput:'',querySubOption:[],queryChannels:[]});showQueryDialog();};
    const handleSubOptionChange=opt=>{StateModule.set({querySubOption:[opt]});showQueryDialog();};
    const handleChannelChange=chan=>{const state=StateModule.get();const newChans=state.queryChannels.includes(chan)?state.queryChannels.filter(c=>c!==chan):[...state.queryChannels,chan];StateModule.set({queryChannels:newChans});showQueryDialog();};
    const handleClearSelection=()=>{StateModule.resetQueryState();showQueryDialog();};
    const executeQuery = async () => {
      StateModule.get().currentQueryController?.abort(); const controller=new AbortController(); StateModule.set({currentQueryController:controller});
      UIModule.Toast.show('查詢中...','info',null,true); StateModule.resetDataCache();
      try {
        let finalMode=StateModule.get().queryMode;
        if(finalMode==='masterDataCategory'||finalMode==='channelDataCategory'){
            const subOpt=StateModule.get().querySubOption;
            if(subOpt.length===0){UIModule.Toast.hide();UIModule.showError('請選擇查詢範圍','pct-query-err');return;}
            finalMode=subOpt[0]; StateModule.set({queryMode:finalMode});
        }
        const rawData = await DataModule.fetchAllData(controller.signal);
        if(rawData.length===0){UIModule.Toast.hide();UIModule.Toast.show('查無資料','warning');StateModule.set({allProcessedData:[]});renderResultsTable();return;}
        UIModule.Toast.show(`查詢到 ${rawData.length} 筆，背景處理中...`,'info',null,true);
        StateModule.set({allRawData:rawData});
        const processedData=await DataModule.processDataInBackground(rawData,false,(idx)=>{if((idx+1)%5===0)UIModule.Toast.show(`處理進度: ${idx+1}/${rawData.length}`,'info',1000,true);});
        StateModule.set({allProcessedData:processedData,totalRecords:processedData.length});
        UIModule.Toast.hide(); UIModule.Toast.show(`處理完成，共 ${processedData.length} 筆`,'success');
        renderResultsTable();
      }catch(error){UIModule.Toast.hide();if(error.name!=='AbortError')UIModule.Toast.show(`查詢失敗: ${error.message}`,'error');}
      finally{StateModule.set({currentQueryController:null});}
    };
    const renderResultsTable = () => {
      const state=StateModule.get(); const displayData=DataModule.filterAndSortData(state.allProcessedData);
      const totalPages=Math.ceil(displayData.length/state.pageSize)||1; const pageNo=Math.min(state.pageNo,totalPages);
      const startIndex=(pageNo-1)*state.pageSize; const pageData=displayData.slice(startIndex,startIndex+state.pageSize);
      const getStatusClass=s=>{switch(s){case config.SALE_STATUS.CURRENT:return'pct-status-onsale';case config.SALE_STATUS.STOPPED:return'pct-status-offsale';case config.SALE_STATUS.PENDING:return'pct-status-pending';case config.SALE_STATUS.ABNORMAL:return'pct-status-abnormal';default:return'';}};
      const renderChannelInfo=chans=>{if(!chans||chans.length===0)return'<small style="color:#999;">無</small>';return chans.map(c=>`<small><strong>${c.channel}</strong>: <span class="${getStatusClass(c.status)}">${c.status}</span><br>${c.saleStartDate}~${c.saleEndDate}</small>`).join('<br>')};
      const specialCount=state.allProcessedData.filter(i=>i.special).length;
      const html=`<div class="pct-modal-header"><span id="pct-modal-title">查詢結果</span></div><div class="pct-modal-body"><div class="pct-summary"><span>共 <b>${state.allProcessedData.length}</b> 筆</span>${specialCount>0?`<span>特殊 <b>${specialCount}</b></span>`:''} ${state.searchKeyword?`<span>搜尋結果 <b>${displayData.length}</b></span>`:''}<button class="pct-filter-btn ${state.filterSpecial?'active':''}" id="pct-filter-special">${state.filterSpecial?'顯示全部':'僅顯示特殊'}</button></div><div class="pct-search-container"><input type="text" class="pct-search-input" id="pct-search-input" placeholder="搜尋表格內容..." value="${UtilsModule.escapeHtml(state.searchKeyword)}"><span class="pct-search-icon">🔍</span><button class="pct-search-clear" id="pct-search-clear" style="display:${state.searchKeyword?'block':'none'}">✕</button></div><div class="pct-table-wrap"><table class="pct-table"><thead><tr>${[{k:'no',n:'#'},{k:'planCode',n:'代碼'},{k:'shortName',n:'名稱'},{k:'currency',n:'幣別'},{k:'unit',n:'單位'},{k:'coverageType',n:'主附約'},{k:'saleStartDate',n:'起日'},{k:'saleEndDate',n:'迄日'},{k:'mainStatus',n:'狀態'},{k:'polpln',n:'條款'},{k:'channels',n:'通路'}].map(h=>`<th data-key="${h.k}" class="${state.sortKey===h.k?`sort-${state.sortAsc?'asc':'desc'}`:''}">${h.n}</th>`).join('')}</tr></thead><tbody>${pageData.map(i=>`<tr class="${i.special?'special-row':''} ${i._isErrorRow?'error-row':''}"><td data-label="#">${i.no}</td><td data-label="代碼" class="pct-td-copy" data-copy="${i.planCode}">${UtilsModule.escapeHtml(i.planCode)}</td><td data-label="名稱" class="pct-td-copy" data-copy="${i.shortName}">${UtilsModule.escapeHtml(i.shortName)}</td><td data-label="幣別">${UtilsModule.escapeHtml(i.currency)}</td><td data-label="單位">${UtilsModule.escapeHtml(i.unit)}</td><td data-label="主附約">${UtilsModule.escapeHtml(i.coverageType)}</td><td data-label="起日">${UtilsModule.escapeHtml(i.saleStartDate)}</td><td data-label="迄日">${UtilsModule.escapeHtml(i.saleEndDate)}</td><td data-label="狀態" class="${getStatusClass(i.mainStatus)}">${UtilsModule.escapeHtml(i.mainStatus)}</td><td data-label="條款" class="pct-td-copy" data-copy="${i.polpln}">${UtilsModule.escapeHtml(i.polpln)}</td><td data-label="通路">${renderChannelInfo(i.channels)}</td></tr>`).join('')||'<tr><td colspan="11" style="text-align:center;padding:20px;">無資料</td></tr>'}</tbody></table></div><div class="pct-pagination"><div class="pct-pagination-info">第 ${startIndex+1}-${Math.min(startIndex+state.pageSize,displayData.length)} 筆, 共 ${displayData.length} 筆</div><div class="pct-page-controls"><button class="pct-btn pct-btn-secondary" id="pct-prev-page" ${pageNo<=1?'disabled':''}>‹</button><input type="number" class="pct-page-input" id="pct-page-input" value="${pageNo}" min="1" max="${totalPages}"><span>/ ${totalPages}</span><button class="pct-btn pct-btn-secondary" id="pct-next-page" ${pageNo>=totalPages?'disabled':''}>›</button></div></div></div><div class="pct-modal-footer"><button class="pct-btn" id="pct-copy-result">複製結果</button><button class="pct-btn pct-btn-retry" id="pct-detail-query">詳細重查</button><button class="pct-btn pct-btn-retry" id="pct-refresh-data">全新查詢</button><button class="pct-btn pct-btn-secondary" id="pct-back-query">返回</button><button class="pct-btn pct-btn-secondary" id="pct-close-result">關閉</button></div>`;
      UIModule.Modal.show(html,EventModule.setupResultsTableEvents);
    };
    const handleSort=(key)=>{const state=StateModule.get();const asc=state.sortKey===key?!state.sortAsc:true;StateModule.set({sortKey:key,sortAsc:asc,pageNo:1});renderResultsTable();};
    const changePage=d=>{const state=StateModule.get();const p=state.pageNo+d;if(p>=1&&p<=Math.ceil(DataModule.filterAndSortData(state.allProcessedData).length/state.pageSize)){StateModule.set({pageNo:p});renderResultsTable();}};
    const goToPage=p=>{const state=StateModule.get();const n=parseInt(p);if(n>=1&&n<=Math.ceil(DataModule.filterAndSortData(state.allProcessedData).length/state.pageSize)){StateModule.set({pageNo:n});renderResultsTable();}};
    const handleSearch=kw=>{StateModule.set({searchKeyword:kw.trim(),pageNo:1});renderResultsTable();};
    const clearSearch=()=>{StateModule.set({searchKeyword:'',pageNo:1});renderResultsTable();};
    const toggleSpecialFilter=()=>{const state=StateModule.get();StateModule.set({filterSpecial:!state.filterSpecial,pageNo:1});renderResultsTable();};
    const copyResults=()=>{const data=DataModule.filterAndSortData(StateModule.get().allProcessedData);const headers=['#','代碼','名稱','幣別','單位','主附約','起日','迄日','狀態','條款'];const rows=data.map(i=>[i.no,i.planCode,i.shortName,i.currency,i.unit,i.coverageType,i.saleStartDate,i.saleEndDate,i.mainStatus,i.polpln]);const text=[headers,...rows].map(r=>r.join('\t')).join('\n');UtilsModule.copyToClipboard(text,UIModule.Toast.show);};
    const handleDetailQuery=async(force)=>{
        const state=StateModule.get(); if(state.allRawData.length===0)return UIModule.Toast.show('無資料可重查','warning');
        StateModule.set({detailQueryCount:state.detailQueryCount+1});
        UIModule.Toast.show(`詳細重查中... (${state.detailQueryCount+1})`,'info',null,true);
        try{const processed=await DataModule.processDataInBackground(state.allRawData,true,(idx)=>{if((idx+1)%5===0)UIModule.Toast.show(`處理進度: ${idx+1}/${state.allRawData.length}`,'info',1000,true);});
        StateModule.set({allProcessedData:processed}); UIModule.Toast.hide(); UIModule.Toast.show('重查完成','success'); renderResultsTable();}
        catch(e){UIModule.Toast.hide();UIModule.Toast.show(`重查失敗: ${e.message}`,'error');}
    };
    const refreshData=async()=>{UIModule.Toast.show('全新查詢...','info');await executeQuery();};
    return {
      initialize, closeApp, showTokenDialog, handleTokenVerification, handleTokenSkip, showQueryDialog, handleQueryModeChange, handleSubOptionChange, handleChannelChange, handleClearSelection, executeQuery,
      handleSort, changePage, goToPage, handleSearch, clearSearch, toggleSpecialFilter, copyResults, handleDetailQuery, refreshData
    };
  })();

  ControllerModule.initialize();

})();

