javascript:(function(){
'use strict';

/**
 * ========== 清理舊工具 ==========
 * 確保每次執行前清除之前的工具實例，避免重複或衝突
 */
(function cleanup(){
  const oldModal=document.getElementById('planCodeQueryToolInstance');
  if(oldModal) oldModal.remove();
  const oldStyle=document.getElementById('planCodeToolStyle');
  if(oldStyle) oldStyle.remove();
  const oldMask=document.querySelector('.pct-modal-mask');
  if(oldMask) oldMask.remove();
  const oldToast=document.getElementById('pct-toast');
  if(oldToast) oldToast.remove();
})();

/**
 * ========== 模組：AppConfig ==========
 * 應用程式全域設定常數，包含工具 ID、API 端點、查詢模式、欄位對應等核心配置
 */
const AppConfig = Object.freeze({
  TOOL_ID: 'planCodeQueryToolInstance',
  STYLE_ID: 'planCodeToolStyle',
  VERSION: '2.1.0',
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
    PAGE_SIZE_MASTER: 1000,
    PAGE_SIZE_CHANNEL: 1000,
    PAGE_SIZE_DETAIL: 20,
    PAGE_SIZE_TABLE: 50
  }
});

/**
 * ========== 模組：Utils ==========
 * 通用工具函式集合，包含格式化、轉換、狀態判斷、複製等功能
 */
const Utils = {
  /** HTML 特殊字元轉義，防止 XSS 攻擊 */
  escapeHtml: t => typeof t === 'string' ? t.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])) : t,
  
  /** 取得今日日期字串 (YYYYMMDD 格式) */
  formatToday: () => { const d = new Date(); return `${d.getFullYear()}${('0'+(d.getMonth()+1)).slice(-2)}${('0'+d.getDate()).slice(-2)}`; },
  
  /** 格式化日期供 UI 顯示使用 (移除時間與連字號) */
  formatDateForUI: dt => !dt ? '' : String(dt).split(' ')[0].replace(/-/g,''),
  
  /** 格式化日期供比較使用 (統一為 YYYY-MM-DD 格式) */
  formatDateForComparison: dt => { if(!dt)return'';const p=String(dt).split(' ')[0];return/^\d{8}$/.test(p)?p.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'):p; },
  
  /** 根據日期範圍判斷銷售狀態 */
  getSaleStatus: (todayStr, saleStartStr, saleEndStr) => {
    if(!saleStartStr||!saleEndStr)return'';
    const today=new Date(Utils.formatDateForComparison(todayStr)),sS=new Date(Utils.formatDateForComparison(saleStartStr)),sE=new Date(Utils.formatDateForComparison(saleEndStr));
    if(isNaN(today)||isNaN(sS)||isNaN(sE))return'日期格式錯誤';
    if(sS.getTime()>sE.getTime())return AppConfig.SALE_STATUS.ABNORMAL;
    if(saleEndStr.includes('99991231')||saleEndStr.includes('9999-12-31'))return AppConfig.SALE_STATUS.CURRENT;
    if(today>sE)return AppConfig.SALE_STATUS.STOPPED;
    if(today<sS)return AppConfig.SALE_STATUS.PENDING;
    if(today>=sS&&today<=sE)return AppConfig.SALE_STATUS.CURRENT;
    return '';
  },
  
  /** 通路代碼轉換 (OT -> BK) */
  channelCodeConvert: code => code==='OT'?'BK':code,
  
  /** 幣別代碼轉換為顯示名稱 */
  currencyConvert: val => AppConfig.FIELD_MAPS.CURRENCY[String(val)]||val||'',
  
  /** 單位代碼轉換為顯示名稱 */
  unitConvert: val => AppConfig.FIELD_MAPS.UNIT[String(val)]||val||'',
  
  /** 承保類型代碼轉換為顯示名稱 */
  coverageTypeConvert: val => AppConfig.FIELD_MAPS.COVERAGE_TYPE[String(val)]||val||'',
  
  /** 複製文字到剪貼簿，支援新舊瀏覽器 */
  copyTextToClipboard: (text, showToast) => {
    if(!navigator.clipboard){
      const ta=document.createElement('textarea');
      ta.value=text;document.body.appendChild(ta);ta.select();
      document.execCommand('copy');document.body.removeChild(ta);
      showToast('已複製查詢結果 (舊版瀏覽器)','success');
    }else{
      navigator.clipboard.writeText(text).then(()=>showToast('已複製查詢結果','success')).catch(()=>showToast('複製失敗','error'));
    }
  },
  
  /** 檢查商品是否為特殊狀態 (主約與通路狀態不一致等) */
  checkSpecialStatus: item => {
    const todayStr=Utils.formatToday(),mainStatus=Utils.getSaleStatus(todayStr,item.saleStartDate,item.saleEndDate),channels=item.channels||[];
    if(mainStatus===AppConfig.SALE_STATUS.STOPPED&&channels.some(c=>c.status===AppConfig.SALE_STATUS.CURRENT))return true;
    if(mainStatus===AppConfig.SALE_STATUS.CURRENT&&channels.length>0&&channels.every(c=>[AppConfig.SALE_STATUS.STOPPED,AppConfig.SALE_STATUS.PENDING].includes(c.status)))return true;
    if(channels.some(c=>{const mE=new Date(Utils.formatDateForComparison(item.saleEndDate)),cE=new Date(Utils.formatDateForComparison(c.rawEnd));return!isNaN(mE)&&!isNaN(cE)&&mE<cE;}))return true;
    if(channels.some(c=>{const mS=new Date(Utils.formatDateForComparison(item.saleStartDate)),cS=new Date(Utils.formatDateForComparison(c.rawStart));return!isNaN(mS)&&!isNaN(cS)&&mS>cS;}))return true;
    if(mainStatus===AppConfig.SALE_STATUS.ABNORMAL)return true;
    return false;
  },
  
  /** 分割輸入字串為陣列 (支援多種分隔符) */
  splitInput: input => input.trim().split(/[\s,;，；、|\n\r]+/).filter(Boolean)
};

/**
 * ========== 樣式注入 ==========
 * 注入完整的 CSS 樣式定義，包含響應式設計與主題色彩
 */
const style=document.createElement('style');
style.id='planCodeToolStyle';
style.textContent=`
:root {
  --primary-color: #4A90E2;
  --primary-dark-color: #357ABD;
  --secondary-color: #6C757D;
  --secondary-dark-color: #5A6268;
  --success-color: #5CB85C;
  --success-dark-color: #4CAE4C;
  --error-color: #D9534F;
  --error-dark-color: #C9302C;
  --warning-color: #F0AD4E;
  --warning-dark-color: #EC971F;
  --info-color: #5BC0DE;
  --info-dark-color: #46B8DA;
  --background-light: #F8F8F8;
  --surface-color: #FFFFFF;
  --border-color: #E0E0E0;
  --text-color-dark: #333333;
  --text-color-light: #666666;
  --box-shadow-light: rgba(0, 0, 0, 0.08);
  --box-shadow-medium: rgba(0, 0, 0, 0.15);
  --box-shadow-strong: rgba(0, 0, 0, 0.3);
  --border-radius-base: 6px;
  --border-radius-lg: 10px;
  --transition-speed: 0.25s;
}
.pct-modal-mask { position:fixed;z-index:2147483646;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);opacity:0;transition:opacity var(--transition-speed) ease-out; }
.pct-modal-mask.show { opacity: 1; }
.pct-modal { font-family:'Microsoft JhengHei','Segoe UI','Roboto','Helvetica Neue',sans-serif;background:var(--surface-color);border-radius:var(--border-radius-lg);box-shadow:0 4px 24px var(--box-shadow-strong);padding:0;min-width:410px;max-width:95vw;position:fixed;transform:translateX(-50%) translateY(-20px);opacity:0;z-index:2147483647;transition:opacity var(--transition-speed) cubic-bezier(0.25,0.8,0.25,1),transform var(--transition-speed) cubic-bezier(0.25,0.8,0.25,1);display:flex;flex-direction:column; }
.pct-modal.show { opacity:1;transform:translateX(-50%) translateY(0); }
.pct-modal.dragging { transition:none; }
.pct-modal-header { padding:16px 20px 8px 20px;font-size:20px;font-weight:bold;border-bottom:1px solid var(--border-color);color:var(--text-color-dark);cursor:grab; }
.pct-modal-header.dragging { cursor:grabbing; }
.pct-modal-body { padding:16px 20px 8px 20px;flex-grow:1;overflow-y:auto;min-height:50px; }
.pct-modal-footer { padding:12px 20px 16px 20px;text-align:right;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap; }
.pct-btn { display:inline-flex;align-items:center;justify-content:center;margin:0;padding:8px 18px;font-size:15px;border-radius:var(--border-radius-base);border:none;background:var(--primary-color);color:#fff;cursor:pointer;transition:background var(--transition-speed),transform var(--transition-speed),box-shadow var(--transition-speed);font-weight:600;box-shadow:0 2px 5px var(--box-shadow-light);white-space:nowrap; }
.pct-btn:hover { background:var(--primary-dark-color);transform:translateY(-1px) scale(1.01);box-shadow:0 4px 8px var(--box-shadow-medium); }
.pct-btn:active { transform:translateY(0);box-shadow:0 1px 3px var(--box-shadow-light); }
.pct-btn:disabled { background:#CED4DA;color:#A0A0A0;cursor:not-allowed;transform:none;box-shadow:none; }
.pct-btn-secondary { background:var(--secondary-color);color:#fff; }
.pct-btn-secondary:hover { background:var(--secondary-dark-color); }
.pct-btn-info { background:var(--info-color); }
.pct-btn-info:hover { background:var(--info-dark-color); }
.pct-btn-success { background:var(--success-color); }
.pct-btn-success:hover { background:var(--success-dark-color); }
.pct-btn-retry { background:var(--warning-color);color:var(--text-color-dark);border:1px solid var(--warning-dark-color);font-size:13px;margin-left:10px; }
.pct-btn-retry:hover { background:var(--warning-dark-color);color:white; }
.pct-filter-btn { font-size:14px;padding:5px 12px;background:var(--warning-color);color:var(--text-color-dark);border:1px solid var(--warning-dark-color);border-radius:5px;cursor:pointer;transition:background .2s,transform .2s;font-weight:600;box-shadow:0 1px 3px var(--box-shadow-light);white-space:nowrap; }
.pct-filter-btn:hover { background:var(--warning-dark-color);transform:translateY(-1px); }
.pct-filter-btn-active { background:var(--warning-dark-color);color:white;box-shadow:0 2px 6px rgba(240,173,78,0.4); }
.pct-filter-btn-active:hover { background:var(--warning-color); }
.pct-input { width:100%;font-size:16px;padding:9px 12px;border-radius:5px;border:1px solid var(--border-color);box-sizing:border-box;margin-top:5px;transition:border-color var(--transition-speed),box-shadow var(--transition-speed); }
.pct-input:focus { border-color:var(--primary-color);box-shadow:0 0 0 2px rgba(74,144,226,0.2);outline:none; }
.pct-input:disabled { background:var(--background-light);color:var(--text-color-light);opacity:0.7;cursor:not-allowed; }
.pct-error { color:var(--error-color);font-size:13px;margin:8px 0 0 0;display:block; }
.pct-label { font-weight:bold;color:var(--text-color-dark);display:block;margin-bottom:5px; }
.pct-form-group { margin-bottom:20px; }
.pct-mode-card-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:20px; }
.pct-mode-card { background:var(--background-light);border:1px solid var(--border-color);border-radius:var(--border-radius-base);padding:18px 10px;text-align:center;cursor:pointer;transition:all var(--transition-speed) ease-out;font-weight:500;font-size:15px;color:var(--text-color-dark);display:flex;align-items:center;justify-content:center;min-height:65px;box-shadow:0 2px 6px var(--box-shadow-light); }
.pct-mode-card:hover { border-color:var(--primary-color);transform:translateY(-3px) scale(1.02);box-shadow:0 6px 15px rgba(74,144,226,0.2); }
.pct-mode-card.selected { background:var(--primary-color);color:white;border-color:var(--primary-color);transform:translateY(-1px);box-shadow:0 4px 10px var(--primary-dark-color);font-weight:bold; }
.pct-mode-card.selected:hover { background:var(--primary-dark-color); }
.pct-sub-option-grid,.pct-channel-option-grid { display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;margin-bottom:15px; }
.pct-sub-option,.pct-channel-option { background:var(--background-light);border:1px solid var(--border-color);border-radius:var(--border-radius-base);padding:8px 15px;cursor:pointer;transition:all var(--transition-speed) ease-out;font-weight:500;font-size:14px;color:var(--text-color-dark);white-space:nowrap;display:inline-flex;align-items:center;justify-content:center; }
.pct-sub-option:hover,.pct-channel-option:hover { border-color:var(--primary-color);transform:translateY(-1px);box-shadow:0 2px 6px var(--box-shadow-light); }
.pct-sub-option.selected,.pct-channel-option.selected { background:var(--primary-color);color:white;border-color:var(--primary-color);transform:translateY(0);box-shadow:0 1px 3px var(--primary-dark-color); }
.pct-sub-option.selected:hover,.pct-channel-option.selected:hover { background:var(--primary-dark-color); }
.pct-table-wrap { max-height:55vh;overflow:auto;margin:15px 0; }
.pct-table { border-collapse:collapse;width:100%;font-size:14px;background:var(--surface-color);min-width:800px; }
.pct-table th,.pct-table td { border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top;cursor:pointer; }
.pct-table th { background:#f8f8f8;color:var(--text-color-dark);font-weight:bold;cursor:pointer;position:sticky;top:0;z-index:1;white-space:nowrap; }
.pct-table th:hover { background:#e9ecef; }
.pct-table tr.special-row { background:#fffde7;border-left:4px solid var(--warning-color); }
.pct-table tr:hover { background:#e3f2fd; }
.pct-table td small { display:block;font-size:11px;color:var(--text-color-light);margin-top:2px; }
.pct-status-onsale { color:#1976d2;font-weight:bold; }
.pct-status-offsale { color:#e53935;font-weight:bold; }
.pct-status-pending { color:var(--info-color);font-weight:bold; }
.pct-status-abnormal { color:#8A2BE2;font-weight:bold; }
.pct-td-copy { cursor:pointer;transition:background .15s; }
.pct-td-copy:hover { background:#f0f7ff; }
.pct-toast { position:fixed;left:50%;top:30px;transform:translateX(-50%);background:var(--text-color-dark);color:#fff;padding:10px 22px;border-radius:var(--border-radius-base);font-size:16px;z-index:2147483647;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;box-shadow:0 4px 12px var(--box-shadow-medium);white-space:nowrap; }
.pct-toast.pct-toast-show { opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto; }
.pct-toast.success { background:var(--success-color); }
.pct-toast.error { background:var(--error-color); }
.pct-toast.warning { background:var(--warning-color);color:var(--text-color-dark); }
.pct-toast.info { background:var(--info-color); }
.pct-summary { font-size:15px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--text-color-dark); }
.pct-summary b { color:var(--warning-color); }
.pct-pagination { display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:15px;flex-wrap:wrap; }
.pct-pagination-info { margin-right:auto;font-size:14px;color:var(--text-color-light); }
@media (max-width:768px){
  .pct-modal{min-width:unset;width:98vw;top:20px;max-height:95vh;}
  .pct-modal-header{font-size:18px;padding:12px 15px 6px 15px;}
  .pct-modal-body{padding:12px 15px 6px 15px;}
  .pct-modal-footer{flex-direction:column;align-items:stretch;padding:10px 15px 12px 15px;}
  .pct-btn,.pct-btn-secondary,.pct-btn-info,.pct-btn-success{width:100%;margin:4px 0;padding:10px 15px;}
  .pct-mode-card-grid{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px;}
  .pct-mode-card{font-size:13px;padding:10px 8px;min-height:45px;}
  .pct-input{font-size:14px;padding:8px 10px;}
  .pct-table-wrap{max-height:40vh;margin:10px 0;}
  .pct-table th,.pct-table td{padding:6px 8px;font-size:12px;}
  .pct-toast{top:10px;width:90%;left:5%;transform:translateX(0);text-align:center;white-space:normal;}
  .pct-pagination{flex-direction:column;align-items:flex-start;gap:8px;}
  .pct-pagination-info{width:100%;text-align:center;}
  .pct-pagination .pct-btn{width:100%;}
}
`;
document.head.appendChild(style);

/**
 * ========== 狀態管理 ==========
 * 全域狀態變數，包含環境設定、查詢參數、快取等
 */
let env = (window.location.host.toLowerCase().includes('uat')||window.location.host.toLowerCase().includes('test'))?'UAT':'PROD';
let apiBase = env==='PROD'?AppConfig.API_ENDPOINTS.PROD:AppConfig.API_ENDPOINTS.UAT;
let token = localStorage.getItem('SSO-TOKEN')||'';
let tokenCheckEnabled = true;
let allProcessedData = [];
let queryMode = '';
let queryInput = '';
let querySubOption = [];
let queryChannels = [];
let pageNo = 1;
let pageSize = AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_TABLE;
let totalRecords = 0;
let filterSpecial = false;
let sortKey = '';
let sortAsc = true;
let detailQueryCount = 0;
let _allRawData = [];
let _cacheDetail = new Map();
let _cacheChannel = new Map();

/**
 * ========== UI 工具函式 ==========
 * 負責 Toast 訊息、錯誤顯示、彈窗管理等 UI 相關功能
 */
function showToast(msg, type='info', duration=1800){
  let el=document.getElementById('pct-toast');
  if(!el){el=document.createElement('div');el.id='pct-toast';document.body.appendChild(el);}
  el.className=`pct-toast ${type}`;el.textContent=msg;el.classList.add('pct-toast-show');
  setTimeout(()=>{el.classList.remove('pct-toast-show');el.addEventListener('transitionend',()=>el.remove(),{once:true});},duration);
}

function closeModal(){
  const modal=document.getElementById('planCodeQueryToolInstance');
  const mask=document.getElementById('pctModalMask');
  modal&&modal.remove();
  mask&&mask.remove();
  const toast=document.getElementById('pct-toast');
  if(toast) toast.remove();
}

function showError(msg,elementId='pct-token-err'){
  const el=document.getElementById(elementId);
  if(el){el.textContent=msg;el.style.display='block';}
  else showToast(msg,'error');
}

function hideError(elementId='pct-token-err'){
  const el=document.getElementById(elementId);
  if(el){el.style.display='none';el.textContent='';}
}

/**
 * ========== 彈窗管理 ==========
 * 負責模態彈窗的顯示、拖曳、ESC 關閉等功能
 */
function showModal(html, onOpen){
  closeModal();
  let mask=document.getElementById('pctModalMask');
  if(!mask){
    mask=document.createElement('div');
    mask.id='pctModalMask';
    mask.className='pct-modal-mask';
    document.body.appendChild(mask);
  }
  mask.onclick=e=>{if(e.target===mask)closeModal();};
  let modal=document.getElementById('planCodeQueryToolInstance');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.className='pct-modal';
  modal.id='planCodeQueryToolInstance';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','pct-modal-title');
  modal.innerHTML=html;
  document.body.appendChild(modal);
  modal.style.top='60px';modal.style.left='50%';modal.style.transform='translateX(-50%) translateY(-20px)';
  setTimeout(()=>{mask.classList.add('show');modal.classList.add('show');modal.style.transform='translateX(-50%) translateY(0)';},10);
  
  // 拖曳功能實作
  (function(){
    let isDragging=false,currentX,currentY,initialX,initialY;
    const header=modal.querySelector('.pct-modal-header');
    header&&header.addEventListener('mousedown',e=>{
      isDragging=true;
      initialX=e.clientX-modal.getBoundingClientRect().left;
      initialY=e.clientY-modal.getBoundingClientRect().top;
      modal.classList.add('dragging');header.classList.add('dragging');e.preventDefault();
    });
    document.addEventListener('mousemove',e=>{
      if(isDragging){
        currentX=e.clientX-initialX;currentY=e.clientY-initialY;
        const maxX=window.innerWidth-modal.offsetWidth,maxY=window.innerHeight-modal.offsetHeight;
        modal.style.left=`${Math.max(0,Math.min(currentX,maxX))}px`;
        modal.style.top=`${Math.max(0,Math.min(currentY,maxY))}px`;
        modal.style.transform='none';e.preventDefault();
      }
    });
    document.addEventListener('mouseup',()=>{isDragging=false;modal.classList.remove('dragging');header&&header.classList.remove('dragging');});
  })();
  
  // ESC 鍵關閉功能
  document.addEventListener('keydown',function escListener(e){
    if(e.key==='Escape'){closeModal();document.removeEventListener('keydown',escListener);}
  });
  if(onOpen) setTimeout(()=>onOpen(modal),50);
}

/**
 * ========== API 服務 ==========
 * 負責與後端 API 的通訊，包含 Token 驗證與資料查詢
 */
async function verifyToken(tokenVal,apiBaseUrl){
  try{
    const res=await fetch(`${apiBaseUrl}/planCodeController/query`,{
      method:'POST',
      headers:{'Content-Type':'application/json','SSO-TOKEN':tokenVal},
      body:JSON.stringify({planCode:'5105',currentPage:1,pageSize:1})
    });
    const data=await res.json();
    return res.ok&&!!data.records;
  }catch(e){return false;}
}

async function callApi(endpoint,params){
  const response=await fetch(`${endpoint}`,{
    method:'POST',
    headers:{'Content-Type':'application/json','SSO-TOKEN':token},
    body:JSON.stringify(params)
  });
  if(!response.ok){
    const errorText=await response.text();
    let errorMessage=errorText;
    try{const errorJson=JSON.parse(errorText);if(errorJson.message){errorMessage=errorJson.message;}else if(errorJson.error){errorMessage=errorJson.error;}}catch(e){}
    throw new Error(`API 請求失敗: ${response.status} ${response.statusText} - ${errorMessage}`);
  }
  return response.json();
}

/**
 * ========== 資料處理 ==========
 * 負責原始資料的轉換、快取管理、排序等功能
 */
function resetData(){_allRawData=[];_cacheDetail.clear();_cacheChannel.clear();}

async function processAllDataForTable(rawData,apiBaseUrl,forceFetch=false){
  _allRawData=rawData;
  const todayStr=Utils.formatToday();
  const promises=_allRawData.map(async item=>{
    if(item._isErrorRow){
      return {no:0,planCode:item.planCode||'-',shortName:'-',currency:'-',unit:'-',coverageType:'-',saleStartDate:'-',saleEndDate:`查詢狀態: ${Utils.escapeHtml(item._apiStatus)}`,mainStatus:'-',polpln:'-',channels:[],special:false,_isErrorRow:true};
    }
    let polpln=item.polpln||'';
    if(!polpln||forceFetch||!_cacheDetail.has(item.planCode)){
      try{
        const detail=await callApi(`${apiBaseUrl}/planCodeController/queryDetail`,{planCode:item.planCode,currentPage:1,pageSize:AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_DETAIL});
        polpln=(detail.records||[]).map(r=>r.polpln).filter(Boolean).join(', ');
        _cacheDetail.set(item.planCode,polpln);
      }catch(e){polpln='';}
    }else{polpln=_cacheDetail.get(item.planCode);}
    let channels=item.channels||[];
    if(channels.length===0||forceFetch||!_cacheChannel.has(item.planCode)){
      try{
        const sale=await callApi(`${apiBaseUrl}/planCodeSaleDateController/query`,{planCode:item.planCode,currentPage:1,pageSize:AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_CHANNEL});
        channels=(sale.planCodeSaleDates?.records||[]).map(r=>({
          channel:Utils.channelCodeConvert(r.channel),
          saleStartDate:Utils.formatDateForUI(r.saleStartDate),
          saleEndDate:Utils.formatDateForUI(r.saleEndDate),
          status:Utils.getSaleStatus(todayStr,r.saleStartDate,r.saleEndDate),
          rawStart:r.saleStartDate,rawEnd:r.saleEndDate
        }));
        _cacheChannel.set(item.planCode,channels);
      }catch(e){channels=[];}
    }else{channels=_cacheChannel.get(item.planCode);}
    const mainSaleStartDate=Utils.formatDateForUI(item.saleStartDate),mainSaleEndDate=Utils.formatDateForUI(item.saleEndDate),mainStatus=Utils.getSaleStatus(todayStr,item.saleStartDate,item.saleEndDate);
    const processedItem={no:0,planCode:item.planCode||'-',shortName:item.shortName||item.planName||'-',currency:Utils.currencyConvert(item.currency||item.cur),unit:Utils.unitConvert(item.reportInsuranceAmountUnit||item.insuranceAmountUnit),coverageType:Utils.coverageTypeConvert(item.coverageType||item.type),saleStartDate:mainSaleStartDate,saleEndDate:mainSaleEndDate,mainStatus,polpln,channels,special:false,_isErrorRow:false,_originalItem:item};
    processedItem.special=Utils.checkSpecialStatus(processedItem);
    return processedItem;
  });
  const results=await Promise.allSettled(promises),fulfilledData=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  fulfilledData.forEach((item,idx)=>item.no=idx+1);
  return fulfilledData;
}

function sortData(data,sortKey,sortAsc){
  if(!sortKey)return data;
  return [...data].sort((a,b)=>{
    const valA=a[sortKey],valB=b[sortKey];
    if(sortKey.includes('Date')){
      const dateA=new Date(Utils.formatDateForComparison(valA)),dateB=new Date(Utils.formatDateForComparison(valB));
      if(isNaN(dateA)&&isNaN(dateB))return 0;
      if(isNaN(dateA))return sortAsc?1:-1;
      if(isNaN(dateB))return sortAsc?-1:1;
      if(dateA>dateB)return sortAsc?1:-1;
      if(dateA<dateB)return sortAsc?-1:1;
      return 0;
    }
    if(valA===undefined||valA===null)return sortAsc?1:-1;
    if(valB===undefined||valB===null)return sortAsc?-1:1;
    if(typeof valA==='string'&&typeof valB==='string'){return sortAsc?valA.localeCompare(valB):valB.localeCompare(valA);}
    if(valA>valB)return sortAsc?1:-1;
    if(valA<valB)return sortAsc?-1:1;
    return 0;
  });
}

/**
 * ========== 查詢流程 ==========
 * 負責 Token 設定、查詢條件設定等對話框的顯示與處理
 */
function showTokenDialog(){
  showModal(`
    <div class="pct-modal-header"><span id="pct-modal-title">商品查詢小工具（${env==='PROD'?'正式環境':'測試環境'}）</span></div>
    <div class="pct-modal-body">
      <div class="pct-form-group"><label for="pct-token-input" class="pct-label">請輸入 SSO-TOKEN：</label>
      <textarea class="pct-input" id="pct-token-input" rows="4" placeholder="請貼上您的 SSO-TOKEN" autocomplete="off">${token||''}</textarea>
      <div class="pct-error" id="pct-token-err" style="display:none;"></div></div>
    </div>
    <div class="pct-modal-footer">
      <button class="pct-btn" id="pct-token-ok">確認</button>
      <button class="pct-btn pct-btn-secondary" id="pct-token-skip">略過驗證</button>
    </div>
  `, modal=>{
    const tokenInput=modal.querySelector('#pct-token-input'),confirmBtn=modal.querySelector('#pct-token-ok'),skipBtn=modal.querySelector('#pct-token-skip');
    tokenInput.focus();hideError('pct-token-err');
    confirmBtn.onclick=async()=>{
      const val=tokenInput.value.trim();
      if(!val){showError('請輸入 Token','pct-token-err');return;}
      showToast('檢查 Token 中...','info');
      token=val;localStorage.setItem('SSO-TOKEN',val);
      const isValid=await verifyToken(val,apiBase);
      if(tokenCheckEnabled){
        if(isValid){showToast('Token 驗證成功','success');showQueryDialog();}
        else{showError('Token 驗證失敗，請重新輸入','pct-token-err');}
      }else{showToast('Token 已儲存 (未驗證)','info');showQueryDialog();}
    };
    skipBtn.onclick=()=>{tokenCheckEnabled=false;showToast('已略過 Token 驗證','warning');showQueryDialog();};
  });
}

function showQueryDialog(){
  const primaryQueryModes=[AppConfig.QUERY_MODES.PLAN_CODE,AppConfig.QUERY_MODES.PLAN_NAME,AppConfig.QUERY_MODES.ALL_MASTER_PLANS,'masterDataCategory','channelDataCategory'];
  showModal(`
    <div class="pct-modal-header"><span id="pct-modal-title">查詢條件設定</span></div>
    <div class="pct-modal-body">
      <div class="pct-form-group"><div class="pct-label">查詢模式：</div>
        <div id="pct-mode-wrap" class="pct-mode-card-grid">
          ${primaryQueryModes.map(mode=>`<div class="pct-mode-card" data-mode="${mode}">${modeLabel(mode)}</div>`).join('')}
        </div>
      </div>
      <div id="pct-dynamic-query-content"></div>
      <div class="pct-form-group"><div class="pct-error" id="pct-query-err" style="display:none"></div></div>
    </div>
    <div class="pct-modal-footer">
      <button class="pct-btn" id="pct-query-ok">開始查詢</button>
      <button class="pct-btn pct-btn-secondary" id="pct-query-cancel">取消</button>
      <button class="pct-btn pct-btn-secondary" id="pct-query-clear-selection">清除選擇</button>
    </div>
  `, modal=>{
    let currentPrimaryMode=queryMode,currentQueryInput=queryInput,currentSubOptions=[...querySubOption],currentChannels=[...queryChannels];
    const dynamicContentArea=modal.querySelector('#pct-dynamic-query-content'),modeCards=modal.querySelectorAll('#pct-mode-wrap .pct-mode-card'),queryOkBtn=modal.querySelector('#pct-query-ok'),queryCancelBtn=modal.querySelector('#pct-query-cancel'),clearSelectionBtn=modal.querySelector('#pct-query-clear-selection');
    let debounceTimer=null;
    const updateDynamicContent=()=>{
      dynamicContentArea.innerHTML='';hideError('pct-query-err');
      let inputHtml='',subOptionHtml='',channelSelectionHtml='';
      switch(currentPrimaryMode){
        case AppConfig.QUERY_MODES.PLAN_CODE:
          inputHtml=`<div class="pct-form-group"><label for="pct-query-input" class="pct-label">輸入商品代碼：</label><textarea class="pct-input" id="pct-query-input" rows="3" placeholder="請輸入商品代碼 (多筆請用空格、逗號、分號或換行分隔)"></textarea></div>`;break;
        case AppConfig.QUERY_MODES.PLAN_NAME:
          inputHtml=`<div class="pct-form-group"><label for="pct-query-input" class="pct-label">輸入商品名稱：</label><textarea class="pct-input" id="pct-query-input" rows="3" placeholder="請輸入商品名稱"></textarea></div>`;break;
        case AppConfig.QUERY_MODES.ALL_MASTER_PLANS:
          inputHtml=`<div style="text-align: center; padding: 20px; color: var(--text-color-light);">將查詢所有主檔商品，無需輸入任何條件。</div>`;break;
        case 'masterDataCategory':
          subOptionHtml=`<div class="pct-form-group"><div class="pct-label">選擇主檔查詢範圍：</div><div class="pct-sub-option-grid"><div class="pct-sub-option" data-sub-option="${AppConfig.QUERY_MODES.MASTER_IN_SALE}">現售商品</div><div class="pct-sub-option" data-sub-option="${AppConfig.QUERY_MODES.MASTER_STOPPED}">停售商品</div></div></div>`;break;
        case 'channelDataCategory':
          channelSelectionHtml=`<div class="pct-form-group"><div class="pct-label">選擇通路：(可多選，不選則查詢所有通路)</div><div class="pct-channel-option-grid">${AppConfig.FIELD_MAPS.CHANNELS.map(ch=>`<div class="pct-channel-option" data-channel="${ch}">${ch}</div>`).join('')}</div></div>`;
          subOptionHtml=`<div class="pct-form-group"><div class="pct-label">選擇通路銷售範圍：</div><div class="pct-sub-option-grid"><div class="pct-sub-option" data-sub-option="${AppConfig.QUERY_MODES.CHANNEL_IN_SALE}">現售通路</div><div class="pct-sub-option" data-sub-option="${AppConfig.QUERY_MODES.CHANNEL_STOPPED}">停售通路</div></div></div>`;break;
      }
      dynamicContentArea.innerHTML=inputHtml+channelSelectionHtml+subOptionHtml;
      const newQueryInput=dynamicContentArea.querySelector('#pct-query-input');
      if(newQueryInput){
        newQueryInput.value=currentQueryInput;
        newQueryInput.addEventListener('input',e=>{
          currentQueryInput=e.target.value;hideError('pct-query-err');
          clearTimeout(debounceTimer);
          debounceTimer=setTimeout(()=>{if(currentPrimaryMode===AppConfig.QUERY_MODES.PLAN_CODE&&currentQueryInput.trim()){queryMode=currentPrimaryMode;queryInput=currentQueryInput;doQuery();}},500);
        });
      }
      dynamicContentArea.querySelectorAll('.pct-sub-option').forEach(option=>{
        if(currentSubOptions.includes(option.dataset.subOption))option.classList.add('selected');
        option.onclick=()=>{option.classList.toggle('selected');const optionValue=option.dataset.subOption,index=currentSubOptions.indexOf(optionValue);if(option.classList.contains('selected')){if(index===-1)currentSubOptions.push(optionValue);}else{if(index>-1)currentSubOptions.splice(index,1);}hideError('pct-query-err');};
      });
      dynamicContentArea.querySelectorAll('.pct-channel-option').forEach(option=>{
        if(currentChannels.includes(option.dataset.channel))option.classList.add('selected');
        option.onclick=()=>{option.classList.toggle('selected');const channelValue=option.dataset.channel,index=currentChannels.indexOf(channelValue);if(option.classList.contains('selected')){if(index===-1)currentChannels.push(channelValue);}else{if(index>-1)currentChannels.splice(index,1);}hideError('pct-query-err');};
      });
    };
    const updateModeCardUI=()=>{modeCards.forEach(card=>{card.classList.toggle('selected',card.dataset.mode===currentPrimaryMode);});};
    updateModeCardUI();updateDynamicContent();
    modeCards.forEach(card=>{card.onclick=()=>{currentPrimaryMode=card.dataset.mode;updateModeCardUI();currentQueryInput='';currentSubOptions=[];currentChannels=[];updateDynamicContent();};});
    clearSelectionBtn.onclick=()=>{currentPrimaryMode='';currentQueryInput='';currentSubOptions=[];currentChannels=[];updateModeCardUI();dynamicContentArea.innerHTML='';showToast('已清除所有查詢條件','info');};
    queryOkBtn.onclick=()=>{
      let finalMode=currentPrimaryMode,finalInput=currentQueryInput,finalSubOptions=currentSubOptions,finalChannels=currentChannels;
      if(currentPrimaryMode==='masterDataCategory'){if(currentSubOptions.length===0||currentSubOptions.length>1){showError('請選擇主檔查詢範圍 (現售/停售)','pct-query-err');return;}finalMode=currentSubOptions[0];}
      else if(currentPrimaryMode==='channelDataCategory'){if(currentSubOptions.length===0||currentSubOptions.length>1){showError('請選擇通路銷售範圍 (現售/停售)','pct-query-err');return;}finalMode=currentSubOptions[0];}
      else if(!currentPrimaryMode){showError('請選擇查詢模式','pct-query-err');return;}
      if([AppConfig.QUERY_MODES.PLAN_CODE,AppConfig.QUERY_MODES.PLAN_NAME].includes(finalMode)&&!finalInput){showError('請輸入查詢內容','pct-query-err');return;}
      queryMode=finalMode;queryInput=finalInput;querySubOption=finalSubOptions;queryChannels=finalChannels;pageNo=1;filterSpecial=false;detailQueryCount=0;
      doQuery();
    };
    queryCancelBtn.onclick=()=>closeModal();
    if(queryMode){
      const modeToSelect=primaryQueryModes.find(pm=>{if(pm===queryMode)return true;if(pm==='masterDataCategory'&&[AppConfig.QUERY_MODES.MASTER_IN_SALE,AppConfig.QUERY_MODES.MASTER_STOPPED].includes(queryMode))return true;if(pm==='channelDataCategory'&&[AppConfig.QUERY_MODES.CHANNEL_IN_SALE,AppConfig.QUERY_MODES.CHANNEL_STOPPED].includes(queryMode))return true;return false;});
      if(modeToSelect){currentPrimaryMode=modeToSelect;updateModeCardUI();updateDynamicContent();if(modeToSelect==='masterDataCategory'||modeToSelect==='channelDataCategory'){const subOptionElement=dynamicContentArea.querySelector(`[data-sub-option="${queryMode}"]`);if(subOptionElement)subOptionElement.classList.add('selected');}if(modeToSelect==='channelDataCategory'&&queryChannels.length>0){queryChannels.forEach(ch=>{const channelElement=dynamicContentArea.querySelector(`[data-channel="${ch}"]`);if(channelElement)channelElement.classList.add('selected');});}}
    }
  });
}

function modeLabel(mode){
  switch(mode){
    case AppConfig.QUERY_MODES.PLAN_CODE: return'商品代號';
    case AppConfig.QUERY_MODES.PLAN_NAME: return'商品名稱';
    case AppConfig.QUERY_MODES.ALL_MASTER_PLANS: return'查詢全部主檔';
    case 'masterDataCategory': return'主檔資料';
    case 'channelDataCategory': return'通路資料';
    case AppConfig.QUERY_MODES.MASTER_IN_SALE: return'主檔現售';
    case AppConfig.QUERY_MODES.MASTER_STOPPED: return'主檔停售';
    case AppConfig.QUERY_MODES.CHANNEL_IN_SALE: return'通路現售';
    case AppConfig.QUERY_MODES.CHANNEL_STOPPED: return'通路停售';
    default: return mode;
  }
}

/**
 * ========== 查詢 API ==========
 * 負責執行實際的資料查詢，包含單一與批量查詢
 */
async function doQuery(){
  closeModal();
  showToast('查詢中...','info');resetData();allProcessedData=[];totalRecords=0;
  let rawRecords=[],currentTotalRecords=0;
  const pageSizeMaster=AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_MASTER;
  try{
    if([AppConfig.QUERY_MODES.PLAN_CODE,AppConfig.QUERY_MODES.PLAN_NAME,AppConfig.QUERY_MODES.ALL_MASTER_PLANS,AppConfig.QUERY_MODES.MASTER_IN_SALE].includes(queryMode)){
      if(queryMode===AppConfig.QUERY_MODES.PLAN_CODE&&queryInput.includes(',')){
        const planCodes=Utils.splitInput(queryInput);
        showToast(`查詢 ${planCodes.length} 個商品代號中...`,'info',3000);
        const multiQueryResult=await queryMultiplePlanCodes(planCodes);
        rawRecords=multiQueryResult.records;currentTotalRecords=multiQueryResult.totalRecords;
      }else{
        const params=buildMasterQueryParams(queryMode,queryInput,1,pageSizeMaster);
        const result=await callApi(`${apiBase}/planCodeController/query`,params);
        rawRecords=result.records||[];currentTotalRecords=result.totalRecords||0;
      }
    }else if(queryMode===AppConfig.QUERY_MODES.MASTER_STOPPED){
      const params=buildMasterQueryParams(AppConfig.QUERY_MODES.ALL_MASTER_PLANS,'',1,pageSizeMaster);
      const result=await callApi(`${apiBase}/planCodeController/query`,params);
      rawRecords=(result.records||[]).filter(item=>Utils.getSaleStatus(Utils.formatToday(),item.saleStartDate,item.saleEndDate)===AppConfig.SALE_STATUS.STOPPED);
      currentTotalRecords=rawRecords.length;
    }else if([AppConfig.QUERY_MODES.CHANNEL_IN_SALE,AppConfig.QUERY_MODES.CHANNEL_STOPPED].includes(queryMode)){
      const channelsToQuery=queryChannels.length>0?queryChannels:AppConfig.FIELD_MAPS.CHANNELS;
      let allChannelRecords=[];
      for(const channel of channelsToQuery){
        const baseParams={"channel":channel,"saleEndDate":(queryMode===AppConfig.QUERY_MODES.CHANNEL_IN_SALE)?"9999-12-31 00:00:00":"","pageIndex":1,"size":AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_CHANNEL,"orderBys":["planCode asc"]};
        const result=await callApi(`${apiBase}/planCodeSaleDateController/query`,baseParams);
        let channelRecords=result.planCodeSaleDates?.records||[];
        if(queryMode===AppConfig.QUERY_MODES.CHANNEL_STOPPED){channelRecords=channelRecords.filter(item=>Utils.getSaleStatus(Utils.formatToday(),item.saleStartDate,item.saleEndDate)===AppConfig.SALE_STATUS.STOPPED);}
        channelRecords.forEach(r=>r._sourceChannel=channel);allChannelRecords.push(...channelRecords);
      }
      const uniqueChannelRecords=[],seenChannelEntries=new Set();
      for(const record of allChannelRecords){
        const identifier=record.planCode+(record._sourceChannel||'');
        if(!seenChannelEntries.has(identifier)){seenChannelEntries.add(identifier);uniqueChannelRecords.push(record);}
      }
      rawRecords=uniqueChannelRecords;currentTotalRecords=uniqueChannelRecords.length;
    }else{throw new Error('未知的查詢模式或條件不完整');}
    totalRecords=currentTotalRecords;
    allProcessedData=await processAllDataForTable(rawRecords,apiBase,false);
    if(sortKey){allProcessedData=sortData(allProcessedData,sortKey,sortAsc);}
    renderTable();
    showToast(`查詢完成，共 ${allProcessedData.length} 筆資料`,'success');
  }catch(e){showToast(`查詢 API 失敗：${e.message}`,'error');allProcessedData=[];totalRecords=0;renderTable();}
}

function buildMasterQueryParams(mode,input,pageNo,pageSize){
  const params={currentPage:pageNo,pageSize};
  switch(mode){
    case AppConfig.QUERY_MODES.PLAN_CODE:params.planCode=input;break;
    case AppConfig.QUERY_MODES.PLAN_NAME:params.planCodeName=input;break;
    case AppConfig.QUERY_MODES.ALL_MASTER_PLANS:params.planCodeName='';break;
    case AppConfig.QUERY_MODES.MASTER_IN_SALE:params.saleEndDate='9999-12-31 00:00:00';break;
    default:throw new Error('無效的主檔查詢模式');
  }
  return params;
}

async function queryMultiplePlanCodes(planCodes){
  const allRecords=[];
  for(let i=0;i<planCodes.length;i++){
    const planCode=planCodes[i];
    try{
      showToast(`查詢商品代號 ${planCode} (${i+1}/${planCodes.length})...`,'info',1000);
      const params={planCode,currentPage:1,pageSize:AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_DETAIL};
      const result=await callApi(`${apiBase}/planCodeController/query`,params);
      if(result.records&&result.records.length>0){result.records.forEach(record=>record._querySourcePlanCode=planCode);allRecords.push(...result.records);}
      else{allRecords.push({planCode:planCode,_apiStatus:'查無資料',_isErrorRow:true});}
    }catch(error){showToast(`查詢 ${planCode} 失敗: ${error.message}`,'error',3000);allRecords.push({planCode:planCode,_apiStatus:'查詢失敗',_isErrorRow:true});}
  }
  return {records:allRecords,totalRecords:allRecords.length};
}

async function querySinglePlanCode(planCode){
  try{
    showToast(`重新查詢 ${planCode}...`,'info');
    const params={planCode,currentPage:1,pageSize:AppConfig.DEFAULT_QUERY_PARAMS.PAGE_SIZE_DETAIL};
    const result=await callApi(`${apiBase}/planCodeController/query`,params);
    if(result.records&&result.records.length>0){
      const processed=await processAllDataForTable(result.records,apiBase,false);
      const idx=allProcessedData.findIndex(r=>r.planCode===planCode&&r._isErrorRow);
      if(idx>-1){allProcessedData.splice(idx,1,...processed);}
      else{allProcessedData.push(...processed);}
      renderTable();
      showToast(`${planCode} 查詢成功`,'success');
    }else{
      showToast(`${planCode} 查無資料`,'warning');
    }
  }catch(error){
    showToast(`${planCode} 查詢失敗: ${error.message}`,'error');
  }
}

async function handleDetailQuery(){
  detailQueryCount++;
  if(detailQueryCount===1){showToast('第一次查詢詳細資料，僅補齊尚未載入的數據...','info',3000);await updateAllDetailsAndRefreshTable(false);}
  else{
    const confirmReset=confirm('您已點擊過「查詢全部」。再次點擊將清空所有快取並重新查詢所有數據，這可能需要一些時間。您確定要繼續嗎？');
    if(confirmReset){showToast('清空快取並重新查詢所有詳細資料中...','info',3000);await updateAllDetailsAndRefreshTable(true);}
    else{showToast('已取消操作。','info');}
  }
}

async function updateAllDetailsAndRefreshTable(forceFetch=false){
  const rawData=_allRawData;
  if(rawData.length===0&&!forceFetch){showToast('沒有原始數據可供查詢詳細資訊','warning');return;}
  allProcessedData=await processAllDataForTable(rawData,apiBase,forceFetch);
  if(allProcessedData.length>0){
    if(sortKey){allProcessedData=sortData(allProcessedData,sortKey,sortAsc);}
    renderTable();showToast(‘全部資料完成','success');
  }else{renderTable();showToast('詳細查詢完成，但沒有可更新詳情的資料','warning');}
}

/**
 * ========== 表格渲染 ==========
 * 負責查詢結果的表格顯示、分頁、排序、篩選等功能
 */
function renderTable(){
  let displayedData=filterSpecial?allProcessedData.filter(r=>r.special):allProcessedData;
  const totalPages=Math.ceil(displayedData.length/pageSize),startIndex=(pageNo-1)*pageSize,endIndex=startIndex+pageSize,pageData=displayedData.slice(startIndex,endIndex),hasPrev=pageNo>1,hasNext=pageNo<totalPages,hasSpecialData=allProcessedData.some(r=>r.special);
  showModal(`
    <div class="pct-modal-header"><span id="pct-modal-title">查詢結果（${env==='PROD'?'正式環境':'測試環境'}）</span></div>
    <div class="pct-modal-body">
      ${renderSummary(displayedData,hasSpecialData)}
      ${renderTableHTML(pageData)}
    </div>
    <div class="pct-modal-footer">
      <button class="pct-btn pct-btn-secondary" id="pct-table-prev" ${!hasPrev?'disabled':''}>上一頁</button>
      <button class="pct-btn pct-btn-secondary" id="pct-table-next" ${!hasNext?'disabled':''}>下一頁</button>
      <div class="pct-pagination-info">第 ${pageNo} 頁 / 共 ${totalPages} 頁 (總計 ${displayedData.length} 筆)</div>
      <div style="flex-grow:1;"></div>
      <button class="pct-btn pct-btn-info" id="pct-table-detail">查詢詳細</button>
      <button class="pct-btn pct-btn-success" id="pct-table-copy">一鍵複製</button>
      ${hasSpecialData?`<button class="pct-btn ${filterSpecial?'pct-filter-btn-active':'pct-filter-btn'}" id="pct-table-filter">${filterSpecial?'顯示全部':'篩選特殊狀態'}</button>`:''}<button class="pct-btn" id="pct-table-requery">重新查詢</button>
      <button class="pct-btn pct-btn-secondary" id="pct-table-close">關閉</button>
    </div>
  `, modal=>{
    modal.querySelector('#pct-table-detail').onclick=()=>{handleDetailQuery();};
    modal.querySelector('#pct-table-copy').onclick=()=>{Utils.copyTextToClipboard(renderTableText(displayedData),showToast);};
    modal.querySelector('#pct-table-prev').onclick=()=>{if(pageNo>1){pageNo--;renderTable();}};
    modal.querySelector('#pct-table-next').onclick=()=>{if(pageNo<totalPages){pageNo++;renderTable();}};
    const filterBtn=modal.querySelector('#pct-table-filter');
    if(filterBtn){filterBtn.onclick=()=>{filterSpecial=!filterSpecial;pageNo=1;renderTable();};}
    modal.querySelector('#pct-table-requery').onclick=()=>{showQueryDialog();};
    modal.querySelector('#pct-table-close').onclick=()=>{closeModal();};
    modal.querySelectorAll('.pct-table th').forEach(th=>{th.onclick=()=>{const key=th.dataset.key;if(!key)return;if(sortKey===key){sortAsc=!sortAsc;}else{sortKey=key;sortAsc=true;}allProcessedData=sortData(allProcessedData,sortKey,sortAsc);pageNo=1;renderTable();};});
    modal.querySelectorAll('.pct-btn-retry').forEach(btn=>{
      btn.onclick=async()=>{const planCode=btn.getAttribute('data-plan');await querySinglePlanCode(planCode);}
    });
    modal.querySelectorAll('.pct-td-copy').forEach(td=>{
      td.onclick=()=>{Utils.copyTextToClipboard(td.getAttribute('data-raw'),showToast);}
    });
  });
}

function renderSummary(data,hasSpecialData){
  const specialCount=data.filter(r=>r.special).length;
  let html=`<div class="pct-summary">共 ${data.length} 筆`;
  if(hasSpecialData){html+=`，其中特殊狀態: <b style="color:var(--warning-color);">${specialCount}</b> 筆`;}
  html+=`</div>`;return html;
}

function renderTableHTML(data){
  if(!data||data.length===0){return`<div class="pct-table-wrap" style="height:150px; display:flex; align-items:center; justify-content:center; color:var(--text-color-light);">查無資料</div>`;}
  let html=`<div class="pct-table-wrap"><table class="pct-table"><thead><tr><th data-key="no">No</th><th data-key="planCode">代號</th><th data-key="shortName">商品名稱</th><th data-key="currency">幣別</th><th data-key="unit">單位</th><th data-key="coverageType">類型</th><th data-key="saleStartDate">銷售起日</th><th data-key="saleEndDate">銷售迄日</th><th data-key="mainStatus">主約狀態</th><th data-key="polpln">POLPLN</th><th>通路資訊</th></tr></thead><tbody>`;
  data.forEach(row=>{
    if(row._isErrorRow){
      html+=`<tr class="error-row"><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.planCode)}">${row.no}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.planCode)}">${Utils.escapeHtml(row.planCode)}</td><td colspan="8" style="color:#d9534f;">${row.saleEndDate}<button class="pct-btn pct-btn-info pct-btn-retry" data-plan="${Utils.escapeHtml(row.planCode)}">重新查詢</button></td><td></td></tr>`;
      return;
    }
    const channelHtml=(row.channels||[]).map(c=>{
      const statusClass=c.status===AppConfig.SALE_STATUS.CURRENT?'pct-status-onsale':(c.status===AppConfig.SALE_STATUS.STOPPED?'pct-status-offsale':(c.status===AppConfig.SALE_STATUS.ABNORMAL?'pct-status-abnormal':'pct-status-pending'));
      return`<span class="${statusClass}">${Utils.escapeHtml(c.channel)}:${Utils.escapeHtml(c.saleEndDate)}（${Utils.escapeHtml(c.status)}）</span>`;
    }).join('<br>');
    html+=`<tr${row.special?' class="special-row"':''}><td class="pct-td-copy" data-raw="${row.no}">${row.no}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.planCode)}">${Utils.escapeHtml(row.planCode)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.shortName)}">${Utils.escapeHtml(row.shortName)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.currency)}">${Utils.escapeHtml(row.currency)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.unit)}">${Utils.escapeHtml(row.unit)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.coverageType)}">${Utils.escapeHtml(row.coverageType)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.saleStartDate)}">${Utils.escapeHtml(row.saleStartDate)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.saleEndDate)}">${Utils.escapeHtml(row.saleEndDate)}</td><td class="pct-td-copy ${row.mainStatus===AppConfig.SALE_STATUS.CURRENT?'pct-status-onsale':row.mainStatus===AppConfig.SALE_STATUS.STOPPED?'pct-status-offsale':(row.mainStatus===AppConfig.SALE_STATUS.ABNORMAL?'pct-status-abnormal':'pct-status-pending')}" data-raw="${Utils.escapeHtml(row.mainStatus)}">${Utils.escapeHtml(row.mainStatus)}</td><td class="pct-td-copy" data-raw="${Utils.escapeHtml(row.polpln||'')}">${Utils.escapeHtml(row.polpln||'')}</td><td>${channelHtml}</td></tr>`;
  });
  html+=`</tbody></table></div>`;return html;
}

function renderTableText(data){
  let txt=`No\t代號\t商品名稱\t幣別\t單位\t類型\t銷售起日\t銷售迄日\t主約狀態\tPOLPLN\t通路資訊\n`;
  data.forEach(row=>{
    let channelStr=(row.channels||[]).map(c=>`${c.channel}:${c.saleEndDate}（${c.status}）`).join(' / ');
    txt+=`${row.no}\t${row.planCode}\t${row.shortName}\t${row.currency}\t${row.unit}\t${row.coverageType}\t${row.saleStartDate}\t${row.saleEndDate}\t${row.mainStatus}\t${row.polpln}\t${channelStr}\n`;
  });
  return txt;
}

/**
 * ========== 初始化啟動 ==========
 * 應用程式主要入口點，負責初始化與啟動流程
 */
if(!token){showTokenDialog();}
else{
  if(tokenCheckEnabled){
    showToast('正在驗證 Token，請稍候...','info');
    verifyToken(token,apiBase).then(isValid=>{
      if(isValid){showToast('Token 驗證成功，已自動登入。','success');showQueryDialog();}
      else{showToast('Token 無效，請重新設定。','warning');localStorage.removeItem('SSO-TOKEN');token='';showTokenDialog();}
    });
  }else{showQueryDialog();}
}

})();
