javascript:(function(){
'use strict';

/**
 * ===================================================================
 * 商品查詢小工具 Enterprise Edition v4.0.0
 * 企業級優化版本 - 整合所有高級功能
 * - 依賴注入容器
 * - 事件驅動架構  
 * - 響應式狀態管理
 * - 虛擬滾動
 * - Web Workers
 * - 智能快取
 * - 效能監控
 * - 錯誤邊界
 * ===================================================================
 */

// 清理舊工具實例
(() => {
  ['planCodeQueryToolInstance', 'planCodeToolStyle', 'pctModalMask', 'pct-toast-container']
    .forEach(id => document.getElementById(id)?.remove());
  document.querySelectorAll('.pct-modal-mask').forEach(el => el.remove());
})();

/**
 * ========== 模組 1：依賴注入容器 (DIContainer) ==========
 */
const DIContainer = (() => {
  const dependencies = new Map();
  const singletons = new Map();
  
  return {
    register: (name, factory, options = {}) => {
      dependencies.set(name, { factory, options });
    },
    
    resolve: (name) => {
      if (!dependencies.has(name)) {
        throw new Error(`依賴 ${name} 未註冊`);
      }
      
      const { factory, options } = dependencies.get(name);
      
      if (options.singleton) {
        if (!singletons.has(name)) {
          singletons.set(name, factory(this));
        }
        return singletons.get(name);
      }
      
      return factory(this);
    },
    
    inject: (dependencies) => (target) => {
      const resolvedDeps = {};
      dependencies.forEach(dep => {
        resolvedDeps[dep] = this.resolve(dep);
      });
      return target(resolvedDeps);
    }
  };
})();

/**
 * ========== 模組 2：事件驅動架構 (EventBus) ==========
 */
const EventBus = (() => {
  const events = new Map();
  const middlewares = [];
  
  return {
    use: (middleware) => middlewares.push(middleware),
    
    emit: async (eventName, payload) => {
      let context = { eventName, payload, cancelled: false };
      
      for (const middleware of middlewares) {
        context = await middleware(context);
        if (context.cancelled) return;
      }
      
      const handlers = events.get(eventName) || [];
      await Promise.all(handlers.map(handler => handler(context.payload)));
    },
    
    on: (eventName, handler) => {
      if (!events.has(eventName)) events.set(eventName, []);
      events.get(eventName).push(handler);
      
      return () => {
        const handlers = events.get(eventName);
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      };
    },
    
    once: (eventName, handler) => {
      const unsubscribe = this.on(eventName, (payload) => {
        handler(payload);
        unsubscribe();
      });
      return unsubscribe;
    }
  };
})();

/**
 * ========== 模組 3：配置管理 (ConfigModule) ==========
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
      CURRENCY: new Map([
        ['1', 'TWD'], ['2', 'USD'], ['3', 'AUD'], 
        ['4', 'CNT'], ['5', 'USD_OIU'], ['6', 'EUR'], ['7', 'JPY']
      ]),
      UNIT: new Map([
        ['A1', '元'], ['A3', '仟元'], ['A4', '萬元'],
        ['B1', '計畫'], ['C1', '單位']
      ]),
      COVERAGE_TYPE: new Map([['M', '主約'], ['R', '附約']]),
      CHANNELS: ['AG','BR','BK','WS','EC']
    },
    
    DEFAULT_QUERY_PARAMS: {
      PAGE_SIZE_MASTER: 10000,
      PAGE_SIZE_CHANNEL: 5000,
      PAGE_SIZE_DETAIL: 50,
      PAGE_SIZE_TABLE: 50
    },
    
    UI_SETTINGS: {
      MODAL_WIDTH: '1200px',
      VIRTUAL_SCROLL_ITEM_HEIGHT: 40,
      DEBOUNCE_DELAY: 300,
      TOAST_DURATION: 2000,
      BATCH_SIZE: 10
    },
    
    PERFORMANCE: {
      CACHE_TTL: 300000, // 5分鐘
      MAX_CACHE_SIZE: 1000,
      WORKER_ENABLED: true,
      VIRTUAL_SCROLL_THRESHOLD: 100
    }
  });
  
  return {
    get: () => config,
    getQueryModes: () => config.QUERY_MODES,
    getApiEndpoints: () => config.API_ENDPOINTS,
    getSaleStatus: () => config.SALE_STATUS,
    getFieldMaps: () => config.FIELD_MAPS,
    getDefaultParams: () => config.DEFAULT_QUERY_PARAMS,
    getUISettings: () => config.UI_SETTINGS,
    getPerformanceSettings: () => config.PERFORMANCE
  };
})();

/**
 * ========== 模組 4：響應式狀態管理 (ReactiveStateModule) ==========
 */
const ReactiveStateModule = (() => {
  const createReactive = (obj) => {
    const listeners = new Map();
    
    const notify = (path, newValue, oldValue) => {
      const pathListeners = listeners.get(path) || [];
      pathListeners.forEach(callback => callback(newValue, oldValue, path));
      
      const parentPath = path.split('.').slice(0, -1).join('.');
      if (parentPath) notify(parentPath, obj, obj);
    };
    
    const createProxy = (target, path = '') => {
      return new Proxy(target, {
        get(obj, prop) {
          const value = obj[prop];
          const currentPath = path ? `${path}.${prop}` : prop;
          
          if (typeof value === 'object' && value !== null) {
            return createProxy(value, currentPath);
          }
          return value;
        },
        
        set(obj, prop, value) {
          const currentPath = path ? `${path}.${prop}` : prop;
          const oldValue = obj[prop];
          
          if (oldValue !== value) {
            obj[prop] = value;
            notify(currentPath, value, oldValue);
            EventBus.emit('state.changed', { path: currentPath, value, oldValue });
          }
          return true;
        }
      });
    };
    
    const proxy = createProxy(obj);
    
    return {
      state: proxy,
      watch: (path, callback) => {
        if (!listeners.has(path)) listeners.set(path, []);
        listeners.get(path).push(callback);
        
        return () => {
          const pathListeners = listeners.get(path);
          const index = pathListeners.indexOf(callback);
          if (index > -1) pathListeners.splice(index, 1);
        };
      },
      computed: (fn) => {
        let cachedValue;
        let isDirty = true;
        
        return () => {
          if (isDirty) {
            cachedValue = fn(proxy);
            isDirty = false;
          }
          return cachedValue;
        };
      }
    };
  };
  
  return { createReactive };
})();

/**
 * ========== 模組 5：智能快取系統 (SmartCacheModule) ==========
 */
const SmartCacheModule = (() => {
  class SmartCache {
    constructor(options = {}) {
      this.maxSize = options.maxSize || ConfigModule.getPerformanceSettings().MAX_CACHE_SIZE;
      this.ttl = options.ttl || ConfigModule.getPerformanceSettings().CACHE_TTL;
      this.cache = new Map();
      this.accessTimes = new Map();
      this.hitCount = 0;
      this.missCount = 0;
    }
    
    set(key, value, ttl = this.ttl) {
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      
      this.cache.set(key, {
        value,
        expires: Date.now() + ttl,
        created: Date.now()
      });
      this.accessTimes.set(key, Date.now());
    }
    
    get(key) {
      const item = this.cache.get(key);
      
      if (!item) {
        this.missCount++;
        return null;
      }
      
      if (Date.now() > item.expires) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        this.missCount++;
        return null;
      }
      
      this.accessTimes.set(key, Date.now());
      this.hitCount++;
      return item.value;
    }
    
    evictLRU() {
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [key, time] of this.accessTimes) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessTimes.delete(oldestKey);
      }
    }
    
    getStats() {
      return {
        size: this.cache.size,
        hitRate: this.hitCount / (this.hitCount + this.missCount),
        hitCount: this.hitCount,
        missCount: this.missCount
      };
    }
    
    async preload(keys, fetcher) {
      const promises = keys.map(async (key) => {
        if (!this.get(key)) {
          try {
            const value = await fetcher(key);
            this.set(key, value);
          } catch (error) {
            console.warn(`預載入失敗: ${key}`, error);
          }
        }
      });
      
      await Promise.allSettled(promises);
    }
  }
  
  return { SmartCache };
})();

/**
 * ========== 模組 6：Web Workers 整合 (WorkerModule) ==========
 */
const WorkerModule = (() => {
  const workers = new Map();
  
  const createWorker = (name, script) => {
    const blob = new Blob([script], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workers.set(name, worker);
    return worker;
  };
  
  const dataProcessingWorker = createWorker('dataProcessor', `
    self.onmessage = function(e) {
      const { type, data } = e.data;
      
      switch(type) {
        case 'PROCESS_DATA':
          const processed = data.map(item => ({
            ...item,
            processed: true,
            timestamp: Date.now()
          }));
          self.postMessage({ type: 'DATA_PROCESSED', data: processed });
          break;
          
        case 'SORT_DATA':
          const sorted = data.sort((a, b) => {
            const aVal = a[e.data.sortKey];
            const bVal = b[e.data.sortKey];
            if (aVal > bVal) return e.data.sortAsc ? 1 : -1;
            if (aVal < bVal) return e.data.sortAsc ? -1 : 1;
            return 0;
          });
          self.postMessage({ type: 'DATA_SORTED', data: sorted });
          break;
          
        case 'FILTER_DATA':
          const filtered = data.filter(item => {
            const searchFields = ['planCode', 'shortName', 'polpln'];
            return searchFields.some(field => 
              String(item[field] || '').toLowerCase().includes(e.data.keyword.toLowerCase())
            );
          });
          self.postMessage({ type: 'DATA_FILTERED', data: filtered });
          break;
      }
    };
  `);
  
  return {
    processData: (data) => {
      return new Promise((resolve) => {
        dataProcessingWorker.postMessage({ type: 'PROCESS_DATA', data });
        dataProcessingWorker.onmessage = (e) => {
          if (e.data.type === 'DATA_PROCESSED') {
            resolve(e.data.data);
          }
        };
      });
    },
    
    sortData: (data, sortKey, sortAsc) => {
      return new Promise((resolve) => {
        dataProcessingWorker.postMessage({ type: 'SORT_DATA', data, sortKey, sortAsc });
        dataProcessingWorker.onmessage = (e) => {
          if (e.data.type === 'DATA_SORTED') {
            resolve(e.data.data);
          }
        };
      });
    },
    
    filterData: (data, keyword) => {
      return new Promise((resolve) => {
        dataProcessingWorker.postMessage({ type: 'FILTER_DATA', data, keyword });
        dataProcessingWorker.onmessage = (e) => {
          if (e.data.type === 'DATA_FILTERED') {
            resolve(e.data.data);
          }
        };
      });
    }
  };
})();

/**
 * ========== 模組 7：虛擬滾動 (VirtualScrollModule) ==========
 */
const VirtualScrollModule = (() => {
  class VirtualScroll {
    constructor(container, options = {}) {
      this.container = container;
      this.itemHeight = options.itemHeight || ConfigModule.getUISettings().VIRTUAL_SCROLL_ITEM_HEIGHT;
      this.buffer = options.buffer || 5;
      this.data = [];
      this.visibleItems = [];
      this.startIndex = 0;
      this.endIndex = 0;
      this.renderItem = options.renderItem || this.defaultRenderItem;
      
      this.init();
    }
    
    init() {
      this.container.style.overflow = 'auto';
      this.container.style.position = 'relative';
      
      this.viewport = document.createElement('div');
      this.viewport.style.position = 'absolute';
      this.viewport.style.top = '0';
      this.viewport.style.left = '0';
      this.viewport.style.right = '0';
      
      this.container.appendChild(this.viewport);
      this.container.addEventListener('scroll', this.handleScroll.bind(this));
    }
    
    setData(data) {
      this.data = data;
      this.container.style.height = `${data.length * this.itemHeight}px`;
      this.render();
    }
    
    handleScroll() {
      const scrollTop = this.container.scrollTop;
      const containerHeight = this.container.clientHeight;
      
      this.startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
      this.endIndex = Math.min(
        this.data.length,
        Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.buffer
      );
      
      this.render();
    }
    
    render() {
      const fragment = document.createDocumentFragment();
      
      for (let i = this.startIndex; i < this.endIndex; i++) {
        const item = this.renderItem(this.data[i], i);
        item.style.position = 'absolute';
        item.style.top = `${i * this.itemHeight}px`;
        item.style.height = `${this.itemHeight}px`;
        fragment.appendChild(item);
      }
      
      this.viewport.innerHTML = '';
      this.viewport.appendChild(fragment);
    }
    
    defaultRenderItem(data, index) {
      const div = document.createElement('div');
      div.textContent = `Item ${index}: ${JSON.stringify(data)}`;
      return div;
    }
  }
  
  return { VirtualScroll };
})();

/**
 * ========== 模組 8：性能監控 (PerformanceModule) ==========
 */
const PerformanceModule = (() => {
  class PerformanceMonitor {
    constructor() {
      this.metrics = new Map();
      this.observers = [];
    }
    
    startTiming(name) {
      performance.mark(`${name}-start`);
    }
    
    endTiming(name) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name)[0];
      this.recordMetric(name, measure.duration);
      
      return measure.duration;
    }
    
    recordMetric(name, value) {
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      
      const values = this.metrics.get(name);
      values.push({ value, timestamp: Date.now() });
      
      if (values.length > 100) {
        values.shift();
      }
      
      this.notifyObservers(name, value);
    }
    
    getMetrics(name) {
      const values = this.metrics.get(name) || [];
      if (values.length === 0) return null;
      
      const nums = values.map(v => v.value);
      return {
        count: nums.length,
        avg: nums.reduce((a, b) => a + b, 0) / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
        recent: nums.slice(-10)
      };
    }
    
    observe(callback) {
      this.observers.push(callback);
      return () => {
        const index = this.observers.indexOf(callback);
        if (index > -1) this.observers.splice(index, 1);
      };
    }
    
    notifyObservers(name, value) {
      this.observers.forEach(callback => {
        try {
          callback(name, value, this.getMetrics(name));
        } catch (error) {
          console.error('性能監控回調錯誤:', error);
        }
      });
    }
  }
  
  return { PerformanceMonitor };
})();

/**
 * ========== 模組 9：錯誤邊界 (ErrorBoundaryModule) ==========
 */
const ErrorBoundaryModule = (() => {
  class ErrorBoundary {
    constructor() {
      this.errors = [];
      this.recoveryStrategies = new Map();
    }
    
    registerRecovery(errorType, strategy) {
      this.recoveryStrategies.set(errorType, strategy);
    }
    
    async handleError(error, context = {}) {
      const errorInfo = {
        error,
        context,
        timestamp: Date.now(),
        stack: error.stack
      };
      
      this.errors.push(errorInfo);
      
      const strategy = this.recoveryStrategies.get(error.constructor.name);
      if (strategy) {
        try {
          await strategy(error, context);
          return true;
        } catch (recoveryError) {
          console.error('恢復策略失敗:', recoveryError);
        }
      }
      
      this.reportError(errorInfo);
      return false;
    }
    
    async reportError(errorInfo) {
      try {
        console.error('錯誤報告:', errorInfo);
        EventBus.emit('error.occurred', errorInfo);
      } catch (e) {
        console.error('錯誤回報失敗:', e);
      }
    }
    
    getErrorStats() {
      const errorCounts = {};
      this.errors.forEach(({ error }) => {
        const type = error.constructor.name;
        errorCounts[type] = (errorCounts[type] || 0) + 1;
      });
      return errorCounts;
    }
  }
  
  return { ErrorBoundary };
})();

/**
 * ========== 模組 10：工具函式 (UtilsModule) ==========
 */
const UtilsModule = (() => {
  const config = ConfigModule.get();
  
  const entityMap = new Map([
    ['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], 
    ['"', '&quot;'], ["'", '&#039;']
  ]);
  
  const escapeHtml = text => 
    typeof text === 'string' ? 
      text.replace(/[&<>"']/g, match => entityMap.get(match)) : text;
  
  const dateUtils = {
    _todayCache: null,
    _todayDate: null,
    
    formatToday() {
      const now = new Date();
      const today = now.toDateString();
      
      if (this._todayDate !== today) {
        this._todayDate = today;
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        this._todayCache = `${year}${month}${day}`;
      }
      
      return this._todayCache;
    },
    
    formatDateForUI: dateStr => 
      dateStr ? String(dateStr).split(' ')[0].replace(/-/g, '') : '',
    
    formatDateForComparison(dateStr) {
      if (!dateStr) return '';
      const cleanDate = String(dateStr).split(' ')[0];
      return /^\d{8}$/.test(cleanDate) 
        ? cleanDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
        : cleanDate;
    }
  };

  const getSaleStatus = (todayStr, saleStartStr, saleEndStr) => {
    if (!saleStartStr || !saleEndStr) return '';
    if (saleEndStr.includes('99991231') || saleEndStr.includes('9999-12-31')) {
      return config.SALE_STATUS.CURRENT;
    }
    
    const today = new Date(dateUtils.formatDateForComparison(todayStr));
    const saleStart = new Date(dateUtils.formatDateForComparison(saleStartStr));
    const saleEnd = new Date(dateUtils.formatDateForComparison(saleEndStr));
    
    if ([today, saleStart, saleEnd].some(d => isNaN(d))) {
      return '日期格式錯誤';
    }
    
    if (saleStart > saleEnd) return config.SALE_STATUS.ABNORMAL;
    if (today > saleEnd) return config.SALE_STATUS.STOPPED;
    if (today < saleStart) return config.SALE_STATUS.PENDING;
    return config.SALE_STATUS.CURRENT;
  };
  
  const channelMap = new Map([['BK', 'OT'], ['OT', 'BK']]);
  const channelUtils = {
    uiToApi: code => channelMap.get(code) || code,
    apiToUi: code => channelMap.get(code) || code
  };

  const fieldConverters = {
    currency: val => config.FIELD_MAPS.CURRENCY.get(String(val)) || val || '',
    unit: val => config.FIELD_MAPS.UNIT.get(String(val)) || val || '',
    coverageType: val => config.FIELD_MAPS.COVERAGE_TYPE.get(String(val)) || val || ''
  };
  
  const inputUtils = {
    normalizeInput(str, maxLength = null) {
      if (typeof str !== 'string') return str;
      let result = str.replace(/[\uff01-\uff5e]/g, char => 
        String.fromCharCode(char.charCodeAt(0) - 0xfee0)
      ).replace(/\u3000/g, ' ').toUpperCase();
      
      return maxLength && result.length > maxLength ? 
        result.substring(0, maxLength) : result;
    },
    
    splitInput: input => input.trim().split(/[\s,;，；、|\n\r]+/).filter(Boolean)
  };

  const copyToClipboard = async (text, showToastCallback) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToastCallback('已複製查詢結果', 'success');
      } else {
        const textarea = document.createElement('textarea');
        Object.assign(textarea, { value: text });
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        showToastCallback('已複製查詢結果 (舊版瀏覽器)', 'success');
      }
    } catch {
      showToastCallback('複製失敗', 'error');
    }
  };

  const checkSpecialStatus = item => {
    const todayStr = dateUtils.formatToday();
    const mainStatus = getSaleStatus(todayStr, item.saleStartDate, item.saleEndDate);
    const channels = item.channels || [];
    
    if (mainStatus === config.SALE_STATUS.ABNORMAL) return true;
    if (channels.length === 0) return false;
    
    const currentChannels = channels.filter(c => c.status === config.SALE_STATUS.CURRENT);
    const nonCurrentChannels = channels.filter(c => 
      [config.SALE_STATUS.STOPPED, config.SALE_STATUS.PENDING].includes(c.status)
    );
    return (mainStatus === config.SALE_STATUS.STOPPED && currentChannels.length > 0) ||
           (mainStatus === config.SALE_STATUS.CURRENT && nonCurrentChannels.length === channels.length);
  };

  return {
    escapeHtml, dateUtils, getSaleStatus, channelUtils, 
    fieldConverters, inputUtils, copyToClipboard, checkSpecialStatus
  };
})();

/**
 * ========== 模組 11：樣式管理 (StyleModule) ==========
 */
const StyleModule = (() => {
  const config = ConfigModule.get();
  const cssContent = `
    :root {
      --primary-color: #4A90E2; --primary-dark-color: #357ABD; --secondary-color: #6C757D; --secondary-dark-color: #5A6268;
      --success-color: #5CB85C; --success-dark-color: #4CAE4C; --error-color: #D9534F; --error-dark-color: #C9302C; 
      --warning-color: #F0AD4E; --warning-dark-color: #EC971F; --info-color: #5BC0DE; --info-dark-color: #46B8DA;
      --background-light: #F8F8F8; --surface-color: #FFFFFF; --border-color: #E0E0E0; --text-color-dark: #1a1a1a;
      --text-color-light: #333333; --border-radius-base: 6px; --border-radius-lg: 10px; --transition-speed: 0.25s;
      --box-shadow-light: rgba(0, 0, 0, 0.08); --box-shadow-medium: rgba(0, 0, 0, 0.15); --box-shadow-strong: rgba(0, 0, 0, 0.3);
    }
    .pct-modal-mask { position:fixed; z-index:2147483646; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.18); opacity:0; transition:opacity var(--transition-speed) ease-out; }
    .pct-modal-mask.show { opacity:1; }
    .pct-modal { font-family:'Microsoft JhengHei','Segoe UI','Roboto','Helvetica Neue',sans-serif; background:var(--surface-color); border-radius:var(--border-radius-lg); box-shadow:0 4px 24px var(--box-shadow-strong); padding:0; width:${config.UI_SETTINGS.MODAL_WIDTH}; max-width:95vw; position:fixed; top:60px; left:50%; transform:translateX(-50%) translateY(-20px); opacity:0; z-index:2147483647; transition:opacity var(--transition-speed) cubic-bezier(0.25,0.8,0.25,1),transform var(--transition-speed) cubic-bezier(0.25,0.8,0.25,1); display:flex; flex-direction:column; }
    .pct-modal.show { opacity:1; transform:translateX(-50%) translateY(0); }
    .pct-modal.dragging { transition:none; }
    .pct-modal-header { padding:16px 20px 8px 20px; font-size:20px; font-weight:bold; border-bottom:1px solid var(--border-color); color:var(--text-color-dark); cursor:grab; }
    .pct-modal-header.dragging { cursor:grabbing; }
    .pct-modal-body { padding:16px 20px 8px 20px; flex-grow:1; overflow-y:auto; min-height:50px; }
    .pct-modal-footer { padding:12px 20px 16px 20px; text-align:right; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap; }
    .pct-btn { display:inline-flex; align-items:center; justify-content:center; margin:0; padding:8px 18px; font-size:15px; border-radius:var(--border-radius-base); border:none; background:var(--primary-color); color:#fff; cursor:pointer; transition:background var(--transition-speed),transform var(--transition-speed),box-shadow var(--transition-speed); font-weight:600; box-shadow:0 2px 5px var(--box-shadow-light); white-space:nowrap; }
    .pct-btn:hover { background:var(--primary-dark-color); transform:translateY(-1px) scale(1.01); box-shadow:0 4px 8px var(--box-shadow-medium); }
    .pct-btn:active { transform:translateY(0); box-shadow:0 1px 3px var(--box-shadow-light); }
    .pct-btn:disabled { background:#CED4DA; color:#A0A0A0; cursor:not-allowed; transform:none; box-shadow:none; }
    .pct-btn-secondary { background:var(--secondary-color); color:#fff; } .pct-btn-secondary:hover { background:var(--secondary-dark-color); }
    .pct-btn-info { background:var(--info-color); } .pct-btn-info:hover { background:var(--info-dark-color); }
    .pct-btn-success { background:var(--success-color); } .pct-btn-success:hover { background:var(--success-dark-color); }
    .pct-btn-danger { background:var(--error-color); } .pct-btn-danger:hover { background:var(--error-dark-color); }
    .pct-btn-retry { background:var(--warning-color); color:var(--text-color-dark); border:1px solid var(--warning-dark-color); font-size:13px; margin-left:10px; }
    .pct-btn-retry:hover { background:var(--warning-dark-color); color:white; }
    .pct-filter-btn { font-size:14px; padding:5px 12px; background:var(--warning-color); color:var(--text-color-dark); border:1px solid var(--warning-dark-color); border-radius:5px; cursor:pointer; transition:background .2s,transform .2s; font-weight:600; box-shadow:0 1px 3px var(--box-shadow-light); white-space:nowrap; }
    .pct-filter-btn:hover { background:var(--warning-dark-color); transform:translateY(-1px); }
    .pct-filter-btn-active { background:var(--warning-dark-color); color:white; box-shadow:0 2px 6px rgba(240,173,78,0.4); }
    .pct-filter-btn-active:hover { background:var(--warning-color); }
    .pct-input { width:100%; font-size:16px; padding:9px 12px; border-radius:5px; border:1px solid var(--border-color); box-sizing:border-box; margin-top:5px; transition:border-color var(--transition-speed),box-shadow var(--transition-speed); }
    .pct-input:focus { border-color:var(--primary-color); box-shadow:0 0 0 2px rgba(74,144,226,0.2); outline:none; }
    .pct-input:disabled { background:var(--background-light); color:var(--text-color-light); opacity:0.7; cursor:not-allowed; }
    .pct-error { color:var(--error-color); font-size:13px; margin:8px 0 0 0; display:block; }
    .pct-label { font-weight:bold; color:var(--text-color-dark); display:block; margin-bottom:5px; }
    .pct-form-group { margin-bottom:20px; }
    .pct-mode-card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:10px; margin-bottom:20px; }
    .pct-mode-card { background:var(--background-light); border:1px solid var(--border-color); border-radius:var(--border-radius-base); padding:18px 10px; text-align:center; cursor:pointer; transition:all var(--transition-speed) ease-out; font-weight:500; font-size:15px; color:var(--text-color-dark); display:flex; align-items:center; justify-content:center; min-height:65px; box-shadow:0 2px 6px var(--box-shadow-light); }
    .pct-mode-card:hover { border-color:var(--primary-color); transform:translateY(-3px) scale(1.02); box-shadow:0 6px 15px rgba(74,144,226,0.2); }
    .pct-mode-card.selected { background:var(--primary-color); color:white; border-color:var(--primary-color); transform:translateY(-1px); box-shadow:0 4px 10px var(--primary-dark-color); font-weight:bold; }
    .pct-mode-card.selected:hover { background:var(--primary-dark-color); }
    .pct-sub-option-grid,.pct-channel-option-grid { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; margin-bottom:15px; }
    .pct-sub-option,.pct-channel-option { background:var(--background-light); border:1px solid var(--border-color); border-radius:var(--border-radius-base); padding:8px 15px; cursor:pointer; transition:all var(--transition-speed) ease-out; font-weight:500; font-size:14px; color:var(--text-color-dark); white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; }
    .pct-sub-option:hover,.pct-channel-option:hover { border-color:var(--primary-color); transform:translateY(-1px); box-shadow:0 2px 6px var(--box-shadow-light); }
    .pct-sub-option.selected,.pct-channel-option.selected { background:var(--primary-color); color:white; border-color:var(--primary-color); transform:translateY(0); box-shadow:0 1px 3px var(--primary-dark-color); }
    .pct-sub-option.selected:hover,.pct-channel-option.selected:hover { background:var(--primary-dark-color); }
    .pct-table-wrap { max-height:55vh; overflow:auto; margin:15px 0; }
    .pct-table { border-collapse:collapse; width:100%; font-size:14px; background:var(--surface-color); min-width:800px; }
    .pct-table th,.pct-table td { border:1px solid #ddd; padding:8px 10px; text-align:left; vertical-align:top; cursor:pointer; }
    .pct-table th { background:#f8f8f8; color:var(--text-color-dark); font-weight:bold; cursor:pointer; position:sticky; top:0; z-index:1; white-space:nowrap; }
    .pct-table th:hover { background:#e9ecef; }
    .pct-table th[data-key] { position:relative; user-select:none; padding-right:25px; }
    .pct-table th[data-key]:after { content:'↕'; position:absolute; right:8px; top:50%; transform:translateY(-50%); opacity:0.3; font-size:12px; transition:opacity 0.2s; }
    .pct-table th[data-key]:hover:after { opacity:0.7; }
    .pct-table th[data-key].sort-asc:after { content:'↑'; opacity:1; color:var(--primary-color); font-weight:bold; }
    .pct-table th[data-key].sort-desc:after { content:'↓'; opacity:1; color:var(--primary-color); font-weight:bold; }
    .pct-table tr.special-row { background:#fffde7; border-left:4px solid var(--warning-color); }
    .pct-table tr:hover { background:#e3f2fd; }
    .pct-table tr.error-row { background:#ffebee; }
    .pct-table td small { display:block; font-size:11px; color:var(--text-color-light); margin-top:2px; }
    .pct-status-onsale { color:#1976d2; font-weight:bold; }
    .pct-status-offsale { color:#e53935; font-weight:bold; }
    .pct-status-pending { color:var(--info-color); font-weight:bold; }
    .pct-status-abnormal { color:#8A2BE2; font-weight:bold; }
    .pct-td-copy { cursor:pointer; transition:background .15s; }
    .pct-td-copy:hover { background:#f0f7ff; }
    .pct-search-container { margin-bottom:15px; position:relative; }
    .pct-search-input { width:100%; font-size:14px; padding:8px 35px 8px 12px; border-radius:5px; border:1px solid var(--border-color); box-sizing:border-box; transition:border-color var(--transition-speed),box-shadow var(--transition-speed); }
    .pct-search-input:focus { border-color:var(--primary-color); box-shadow:0 0 0 2px rgba(74,144,226,0.2); outline:none; }
    .pct-search-icon { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--text-color-light); pointer-events:none; }
    .pct-search-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-color-light); cursor:pointer; font-size:16px; padding:2px; border-radius:3px; transition:background-color 0.2s; }
    .pct-search-clear:hover { background-color:var(--background-light); }
    .pct-toast { position:fixed; left:50%; top:30px; transform:translateX(-50%); background:var(--text-color-dark); color:#fff; padding:10px 22px; border-radius:var(--border-radius-base); font-size:16px; z-index:2147483647; opacity:0; pointer-events:none; transition:opacity .3s,transform .3s; box-shadow:0 4px 12px var(--box-shadow-medium); white-space:nowrap; }
    .pct-toast.pct-toast-show { opacity:1; transform:translateX(-50%) translateY(0); pointer-events:auto; }
    .pct-toast.success { background:var(--success-color); }
    .pct-toast.error { background:var(--error-color); }
    .pct-toast.warning { background:var(--warning-color); color:var(--text-color-dark); }
    .pct-toast.info { background:var(--info-color); }
    .pct-toast.persistent { }
    .pct-summary { font-size:15px; margin-bottom:10px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; color:var(--text-color-dark); }
    .pct-summary b { color:var(--warning-color); }
    .pct-pagination { display:flex; justify-content:flex-end; align-items:center; gap:10px; margin-top:15px; flex-wrap:wrap; }
    .pct-pagination-info { margin-right:auto; font-size:14px; color:var(--text-color-light); }
    .pct-page-input { width:60px; text-align:center; padding:4px; border:1px solid var(--border-color); border-radius:3px; }
    .pct-page-controls { display:flex; align-items:center; gap:5px; }
    .pct-cancel-query { position:fixed; top:80px; right:20px; z-index:2147483648; }
    .pct-virtual-scroll { height: 400px; overflow: auto; border: 1px solid var(--border-color); }
    .pct-performance-monitor { position: fixed; bottom: 20px; right: 20px; background: var(--surface-color); border: 1px solid var(--border-color); padding: 10px; border-radius: var(--border-radius-base); font-size: 12px; z-index: 2147483648; }
    @media (max-width:768px){
      .pct-modal{width:98vw;top:20px;max-height:95vh;} .pct-modal-header{font-size:18px;padding:12px 15px 6px 15px;}
      .pct-modal-body{padding:12px 15px 6px 15px;} .pct-modal-footer{flex-direction:column;align-items:stretch;padding:10px 15px 12px 15px;}
      .pct-btn,.pct-btn-secondary,.pct-btn-info,.pct-btn-success{width:100%;margin:4px 0;padding:10px 15px;}
      .pct-mode-card-grid{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px;} .pct-mode-card{font-size:13px;padding:10px 8px;min-height:45px;}
      .pct-input{font-size:14px;padding:8px 10px;} .pct-table-wrap{max-height:40vh;margin:10px 0;}
      .pct-table th,.pct-table td{padding:6px 8px;font-size:12px;} .pct-toast{top:10px;width:90%;left:5%;transform:translateX(0);text-align:center;white-space:normal;}
      .pct-pagination{flex-direction:column;align-items:flex-start;gap:8px;} .pct-pagination-info{width:100%;text-align:center;} .pct-pagination .pct-btn{width:100%;}
    }
  `;
  return {
    inject: () => {
      document.getElementById(config.STYLE_ID)?.remove();
      const style = document.createElement('style');
      Object.assign(style, { id: config.STYLE_ID, textContent: cssContent });
      document.head.appendChild(style);
    },
    remove: () => document.getElementById(config.STYLE_ID)?.remove()
  };
})();

/**
 * ========== 依賴注入註冊 ==========
 */
DIContainer.register('config', () => ConfigModule, { singleton: true });
DIContainer.register('utils', () => UtilsModule, { singleton: true });
DIContainer.register('eventBus', () => EventBus, { singleton: true });
DIContainer.register('smartCache', () => new SmartCacheModule.SmartCache(), { singleton: true });
DIContainer.register('performanceMonitor', () => new PerformanceModule.PerformanceMonitor(), { singleton: true });
DIContainer.register('errorBoundary', () => new ErrorBoundaryModule.ErrorBoundary(), { singleton: true });

/**
 * ========== 模組 12：狀態管理 (StateModule) ==========
 */
const StateModule = DIContainer.inject(['config', 'utils'])((deps) => {
  const { config } = deps;
  const apiEndpoints = config.getApiEndpoints();
  const isUAT = window.location.host.toLowerCase().includes('uat');
  
  const initialState = {
    environment: isUAT ? 'UAT' : 'PROD',
    apiBase: isUAT ? apiEndpoints.UAT : apiEndpoints.PROD,
    token: '',
    queryMode: '',
    queryInput: '',
    querySubOption: [],
    queryChannels: [],
    pageNo: 1,
    pageSize: config.getDefaultParams().PAGE_SIZE_TABLE,
    totalRecords: 0,
    showAllPages: false,
    sortKey: '',
    sortAsc: true,
    searchKeyword: '',
    filterSpecial: false,
    allProcessedData: [],
    rawData: [],
    cacheDetail: new Map(),
    cacheChannel: new Map(),
    currentQueryController: null,
    isQuerying: false,
    detailQueryCount: 0,
    persistentToastId: null,
    searchDebounceTimer: null,
    useVirtualScroll: false
  };

  const reactiveState = ReactiveStateModule.createReactive(initialState);
  
  const getToken = () => {
    const tokenKeys = ['SSO-TOKEN', 'euisToken'];
    const storages = [localStorage, sessionStorage];
    
    for (const storage of storages) {
      for (const key of tokenKeys) {
        const token = storage.getItem(key);
        if (token?.trim() && token !== 'null') {
          return token.trim();
        }
      }
    }
    return '';
  };
  
  reactiveState.state.token = getToken();
  
  return {
    get: () => ({ ...reactiveState.state }),
    set: updates => { Object.assign(reactiveState.state, updates); },
    watch: reactiveState.watch,
    
    resetQuery() {
      Object.assign(reactiveState.state, {
        allProcessedData: [],
        rawData: [],
        totalRecords: 0,
        pageNo: 1,
        filterSpecial: false,
        detailQueryCount: 0
      });
      reactiveState.state.cacheDetail.clear();
      reactiveState.state.cacheChannel.clear();
    },
    
    getToken,
    getEnvironment: () => reactiveState.state.environment,
    getApiBase: () => reactiveState.state.apiBase,
    getCurrentToken: () => reactiveState.state.token,
    getQueryState: () => ({
      queryMode: reactiveState.state.queryMode,
      queryInput: reactiveState.state.queryInput,
      querySubOption: reactiveState.state.querySubOption,
      queryChannels: reactiveState.state.queryChannels
    }),
    getPaginationState: () => ({
      pageNo: reactiveState.state.pageNo,
      pageSize: reactiveState.state.pageSize,
      totalRecords: reactiveState.state.totalRecords,
      showAllPages: reactiveState.state.showAllPages
    }),
    getSortState: () => ({
      sortKey: reactiveState.state.sortKey,
      sortAsc: reactiveState.state.sortAsc
    }),
    getDataState: () => ({
      allProcessedData: reactiveState.state.allProcessedData,
      rawData: reactiveState.state.rawData,
      cacheDetail: reactiveState.state.cacheDetail,
      cacheChannel: reactiveState.state.cacheChannel
    })
  };
});

/**
 * ========== 模組 13：API 服務 (ApiModule) ==========
 */
const ApiModule = DIContainer.inject(['config', 'smartCache', 'performanceMonitor'])((deps) => {
  const { config, smartCache, performanceMonitor } = deps;
  
  const callApi = async (endpoint, params, signal = null) => {
    const cacheKey = `api_${endpoint}_${JSON.stringify(params)}`;
    const cached = smartCache.get(cacheKey);
    if (cached) return cached;
    
    performanceMonitor.startTiming('api_call');
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SSO-TOKEN': StateModule.getCurrentToken()
      },
      body: JSON.stringify(params),
      ...(signal && { signal })
    };
    
    try {
      const response = await fetch(endpoint, fetchOptions);
      
      if (!response.ok) {
        if (signal?.aborted) {
          throw new DOMException('查詢已中止', 'AbortError');
        }
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || await response.text();
        } catch {
          errorMessage = await response.text();
        }
        throw new Error(`API 請求失敗: ${response.status} ${response.statusText} - ${errorMessage}`);
      }
      
      const result = await response.json();
      smartCache.set(cacheKey, result);
      
      const duration = performanceMonitor.endTiming('api_call');
      EventBus.emit('api.call.completed', { endpoint, duration, cached: false });
      
      return result;
    } catch (error) {
      performanceMonitor.endTiming('api_call');
      throw error;
    }
  };

  const verifyToken = async (token, apiBase) => {
    try {
      const response = await fetch(`${apiBase}/planCodeController/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'SSO-TOKEN': token },
        body: JSON.stringify({ planCode: '5105', currentPage: 1, pageSize: 1 })
      });
      if (!response.ok) return false;
      const data = await response.json();
      return !!data.records;
    } catch {
      return false;
    }
  };

  const buildMasterQueryParams = (mode, input, pageNo, pageSize) => {
    const params = { currentPage: pageNo, pageSize };
    const queryModes = config.getQueryModes();
    
    const paramMap = {
      [queryModes.PLAN_CODE]: { planCode: input },
      [queryModes.PLAN_NAME]: { planCodeName: input },
      [queryModes.ALL_MASTER_PLANS]: { planCodeName: '' },
      [queryModes.MASTER_IN_SALE]: { saleEndDate: '9999-12-31 00:00:00' }
    };
    if (!paramMap[mode]) {
      throw new Error('無效的主檔查詢模式');
    }
    return { ...params, ...paramMap[mode] };
  };

  const queryMultiplePlanCodes = async (planCodes, signal) => {
    const BATCH_SIZE = config.getUISettings().BATCH_SIZE;
    const allRecords = [];
    const apiBase = StateModule.getApiBase();
    
    for (let i = 0; i < planCodes.length; i += BATCH_SIZE) {
      if (signal?.aborted) throw new Error('查詢已被中止');
      
      const batch = planCodes.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async planCode => {
        try {
          const params = {
            planCode,
            currentPage: 1,
            pageSize: config.getDefaultParams().PAGE_SIZE_DETAIL
          };
          const result = await callApi(`${apiBase}/planCodeController/query`, params, signal);
          
          if (result.records?.length > 0) {
            result.records.forEach(record => record._querySourcePlanCode = planCode);
            return result.records;
          }
          return [{ planCode, _apiStatus: '查無資料', _isErrorRow: true }];
        } catch (error) {
           if (error.name === 'AbortError') throw error;
          return [{ planCode, _apiStatus: '查詢失敗', _isErrorRow: true }];
        }
      });
      const batchResults = await Promise.all(batchPromises);
      allRecords.push(...batchResults.flat());
      
      EventBus.emit('query.batch.completed', { 
        batch: i / BATCH_SIZE + 1, 
        total: Math.ceil(planCodes.length / BATCH_SIZE) 
      });
    }
    return { records: allRecords, totalRecords: allRecords.length };
  };
  
  const queryChannelData = async (queryMode, queryChannels, signal) => {
    const channelsToQuery = queryChannels.length > 0 ? queryChannels : config.getFieldMaps().CHANNELS;
    const apiBase = StateModule.getApiBase();
    const utils = UtilsModule;

    const queryChannelByType = async (channels, saleEndDate) => {
      const channelPromises = channels.map(async uiChannel => {
        try {
          const apiChannel = utils.channelUtils.uiToApi(uiChannel);
          const baseParams = {
            planCode: "", channel: apiChannel, saleEndDate,
            pageIndex: 1, size: config.getDefaultParams().PAGE_SIZE_CHANNEL,
            orderBys: ["planCode asc"]
          };
          const result = await callApi(`${apiBase}/planCodeSaleDateController/query`, baseParams, signal);
          const channelRecords = result.planCodeSaleDates?.records || [];
          
          channelRecords.forEach(r => {
            r._sourceChannel = uiChannel;
            r.channel = utils.channelUtils.apiToUi(r.channel);
          });
          return channelRecords;
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          return [];
        }
      });
      const results = await Promise.all(channelPromises);
      return results.flat();
    };

    const queryModes = config.getQueryModes();
    
    if (queryMode === queryModes.CHANNEL_STOPPED) {
      const [allChannelData, currentSaleData] = await Promise.all([
        queryChannelByType(channelsToQuery, ""),
        queryChannelByType(channelsToQuery, "9999-12-31 00:00:00")
      ]);
      const currentSaleSet = new Set(currentSaleData.map(item => `${item.planCode}_${item.channel}`));
      const stoppedChannelData = allChannelData.filter(item => {
        const key = `${item.planCode}_${utils.channelUtils.apiToUi(item.channel)}`;
        return !currentSaleSet.has(key);
      });
      return removeDuplicateChannelRecords(stoppedChannelData);
    }
    const channelData = await queryChannelByType(channelsToQuery, "9999-12-31 00:00:00");
    return removeDuplicateChannelRecords(channelData);
  };

  const removeDuplicateChannelRecords = records => {
    const seenEntries = new Set();
    return records.filter(record => {
      const identifier = record.planCode + (record._sourceChannel || '');
      if (seenEntries.has(identifier)) return false;
      seenEntries.add(identifier);
      return true;
    });
  };
  
  const getPolplnData = async (item, forceFetch, signal) => {
    const dataState = StateModule.getDataState();
    const apiBase = StateModule.getApiBase();
    
    if (!forceFetch && dataState.cacheDetail.has(item.planCode)) {
        return dataState.cacheDetail.get(item.planCode);
    }

    try {
      const detail = await callApi(`${apiBase}/planCodeController/queryDetail`, {
        planCode: item.planCode, currentPage: 1, pageSize: config.getDefaultParams().PAGE_SIZE_DETAIL
      }, signal);
      const polpln = (detail.records || []).map(r => r.polpln).filter(Boolean).join(', ');
      dataState.cacheDetail.set(item.planCode, polpln);
      return polpln;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      return '';
    }
  };

  const getChannelData = async (item, forceFetch, todayStr, signal) => {
    const dataState = StateModule.getDataState();
    const apiBase = StateModule.getApiBase();
    const utils = UtilsModule;
    
    if (!forceFetch && dataState.cacheChannel.has(item.planCode)) {
        return dataState.cacheChannel.get(item.planCode);
    }
    
    try {
      const sale = await callApi(`${apiBase}/planCodeSaleDateController/query`, {
        planCode: item.planCode, currentPage: 1, pageSize: config.getDefaultParams().PAGE_SIZE_CHANNEL
      }, signal);
      const channels = (sale.planCodeSaleDates?.records || []).map(r => ({
        channel: utils.channelUtils.apiToUi(r.channel),
        saleStartDate: utils.dateUtils.formatDateForUI(r.saleStartDate),
        saleEndDate: utils.dateUtils.formatDateForUI(r.saleEndDate),
        status: utils.getSaleStatus(todayStr, r.saleStartDate, r.saleEndDate),
        rawStart: r.saleStartDate,
        rawEnd: r.saleEndDate
      }));
      dataState.cacheChannel.set(item.planCode, channels);
      return channels;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      return [];
    }
  };

  return {
    callApi, verifyToken, buildMasterQueryParams,
    queryMultiplePlanCodes, queryChannelData,
    getPolplnData, getChannelData
  };
})();

/**
 * ========== 模組 14：UI 元件 (UIModule) ==========
 */
const UIModule = DIContainer.inject(['config', 'utils'])((deps) => {
  const { config, utils } = deps;
  
  const ToastManager = {
    show(message, type = 'info', duration = config.getUISettings().TOAST_DURATION, persistent = false) {
      const state = StateModule.get();
      if (persistent && state.persistentToastId) {
        document.getElementById(state.persistentToastId)?.remove();
      }
      
      let el = document.getElementById('pct-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'pct-toast';
        document.body.appendChild(el);
      }
      
      Object.assign(el, {
        className: `pct-toast ${type} ${persistent ? 'persistent' : ''}`,
        textContent: message
      });
      el.classList.add('pct-toast-show');
      
      if (persistent) {
        StateModule.set({ persistentToastId: el.id });
      } else {
        setTimeout(() => {
          if (el?.classList.contains('pct-toast-show')) {
            el.classList.remove('pct-toast-show');
            el.addEventListener('transitionend', () => el.remove(), { once: true });
          }
        }, duration);
      }
    },
    
    hide() {
      const state = StateModule.get();
      if (state.persistentToastId) {
        const toast = document.getElementById(state.persistentToastId);
        if (toast) {
          toast.classList.remove('pct-toast-show');
          toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }
        StateModule.set({ persistentToastId: null });
      }
    }
  };
  
  const ModalManager = {
    show(html, onOpen) {
      this.close();
      const mask = document.createElement('div');
      Object.assign(mask, {
        id: 'pctModalMask',
        className: 'pct-modal-mask',
        onclick: e => e.target === mask && this.close()
      });
      document.body.appendChild(mask);

      const modal = document.createElement('div');
      Object.assign(modal, {
        id: config.get().TOOL_ID,
        className: 'pct-modal',
        innerHTML: html
      });
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'pct-modal-title');
      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        mask.classList.add('show');
        modal.classList.add('show');
      });
      this.enableDragging(modal);
      
      const escHandler = e => {
        if (e.key === 'Escape') {
          this.close();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
      onOpen?.(modal);
    },
    
    close() {
      [config.get().TOOL_ID, 'pctModalMask', 'pct-toast'].forEach(id => document.getElementById(id)?.remove());
      const state = StateModule.get();
      if (state.currentQueryController) {
        state.currentQueryController.abort();
        StateModule.set({ currentQueryController: null });
      }
      StateModule.set({ isQuerying: false });
      ToastManager.hide();
    },
    
    enableDragging(modal) {
      let isDragging = false, currentX, currentY, initialX, initialY;
      const header = modal.querySelector('.pct-modal-header');
      if (!header) return;
      
      const handleMouseDown = e => {
        isDragging = true;
        initialX = e.clientX - modal.getBoundingClientRect().left;
        initialY = e.clientY - modal.getBoundingClientRect().top;
        modal.classList.add('dragging');
        header.classList.add('dragging');
        e.preventDefault();
      };
      
      const handleMouseMove = e => {
        if (!isDragging) return;
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        const maxX = window.innerWidth - modal.offsetWidth;
        const maxY = window.innerHeight - modal.offsetHeight;
        Object.assign(modal.style, {
          left: `${Math.max(0, Math.min(currentX, maxX))}px`,
          top: `${Math.max(0, Math.min(currentY, maxY))}px`,
          transform: 'none'
        });
        e.preventDefault();
      };
      
      const handleMouseUp = () => {
        isDragging = false;
        modal.classList.remove('dragging');
        header.classList.remove('dragging');
      };
      
      header.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return { Toast: ToastManager, Modal: ModalManager };
});

/**
 * ========== 模組 15：資料處理 (DataModule) ==========
 */
const DataModule = DIContainer.inject(['config', 'utils', 'smartCache', 'performanceMonitor'])((deps) => {
  const { config, utils, smartCache, performanceMonitor } = deps;
  
  const processRawData = (rawData) => {
    performanceMonitor.startTiming('processRawData');
    const todayStr = utils.dateUtils.formatToday();
    
    const processed = rawData.map((item, index) => {
      if (item._isErrorRow) {
        return {
          no: index + 1,
          planCode: item.planCode || '-',
          shortName: '-',
          currency: '-',
          unit: '-',
          coverageType: '-',
          saleStartDate: '-',
          saleEndDate: `查詢狀態: ${utils.escapeHtml(item._apiStatus)}`,
          mainStatus: '-',
          polpln: '-',
          channels: [],
          special: false,
          _isErrorRow: true
        };
      }

      return {
        no: index + 1,
        planCode: item.planCode || '-',
        shortName: item.shortName || item.planName || '-',
        currency: utils.fieldConverters.currency(item.currency || item.cur),
        unit: utils.fieldConverters.unit(item.reportInsuranceAmountUnit || item.insuranceAmountUnit),
        coverageType: utils.fieldConverters.coverageType(item.coverageType || item.type),
        saleStartDate: utils.dateUtils.formatDateForUI(item.saleStartDate),
        saleEndDate: utils.dateUtils.formatDateForUI(item.saleEndDate),
        mainStatus: utils.getSaleStatus(todayStr, item.saleStartDate, item.saleEndDate),
        polpln: '載入中...',
        channels: [],
        special: false,
        _originalItem: item,
        _loading: true
      };
    });
    
    performanceMonitor.endTiming('processRawData');
    return processed;
  };

  const loadDetailsInBackground = async (processedData, forceFetch, onProgress) => {
    const BATCH_SIZE = config.getUISettings().BATCH_SIZE;
    const todayStr = utils.dateUtils.formatToday();
    const signal = StateModule.get().currentQueryController?.signal;

    for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
      if (signal?.aborted) throw new DOMException('查詢已中止', 'AbortError');
      
      const batch = processedData.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (item, batchIndex) => {
        if (item._isErrorRow || !item._loading) return;
        
        const globalIndex = i + batchIndex;
        try {
          const [polpln, channels] = await Promise.all([
            ApiModule.getPolplnData(item._originalItem, forceFetch, signal),
            ApiModule.getChannelData(item._originalItem, forceFetch, todayStr, signal)
          ]);
          
          item.polpln = polpln || '無資料';
          item.channels = channels;
          item.special = utils.checkSpecialStatus(item);
          item._loading = false;
          
          onProgress(globalIndex, item);
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          item.polpln = '載入失敗';
          item._loading = false;
          onProgress(globalIndex, item);
        }
      }));
    }
  };

  const filterData = (data, searchKeyword, filterSpecial) => {
    if (ConfigModule.getPerformanceSettings().WORKER_ENABLED && data.length > 1000) {
      return WorkerModule.filterData(data, searchKeyword);
    }
    
    let filteredData = filterSpecial ? data.filter(item => item.special) : data;
    
    if (searchKeyword?.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const searchFields = ['planCode', 'shortName', 'polpln', 'currency', 'unit', 'coverageType'];
      filteredData = filteredData.filter(item => 
        searchFields.some(field => String(item[field] || '').toLowerCase().includes(keyword)) ||
        (item.channels || []).some(channel => 
          `${channel.channel}:${channel.saleEndDate}（${channel.status}）`.toLowerCase().includes(keyword)
        )
      );
    }
    
    return filteredData;
  };

  const sortData = (data, sortKey, sortAsc) => {
    if (!sortKey) return data;
    
    if (ConfigModule.getPerformanceSettings().WORKER_ENABLED && data.length > 1000) {
      return WorkerModule.sortData(data, sortKey, sortAsc);
    }
    
    return [...data].sort((a, b) => {
      let valA = a[sortKey], valB = b[sortKey];
      if (valA == null) return 1;
      if (valB == null) return -1;
      
      if (sortKey.includes('Date')) {
        valA = new Date(utils.dateUtils.formatDateForComparison(valA));
        valB = new Date(utils.dateUtils.formatDateForComparison(valB));
      }
      
      const order = valA < valB ? -1 : (valA > valB ? 1 : 0);
      return sortAsc ? order : -order;
    });
  };

  const paginateData = (data, pageNo, pageSize, showAllPages) => {
    if (showAllPages) {
      return { data, totalPages: 1, hasPrev: false, hasNext: false };
    }
    
    const totalPages = Math.ceil(data.length / pageSize);
    const start = (pageNo - 1) * pageSize;
    
    return {
      data: data.slice(start, start + pageSize),
      totalPages,
      hasPrev: pageNo > 1,
      hasNext: pageNo < totalPages
    };
  };

  return { processRawData, loadDetailsInBackground, filterData, sortData, paginateData };
});

/**
 * ========== 模組 16：主控制器 (ControllerModule) ==========
 */
const ControllerModule = DIContainer.inject(['config', 'utils', 'smartCache', 'performanceMonitor', 'errorBoundary'])((deps) => {
  const { config, utils, smartCache, performanceMonitor, errorBoundary } = deps;
  
  // 註冊錯誤恢復策略
  errorBoundary.registerRecovery('NetworkError', async (error, context) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return context.retry();
  });
  
  const initialize = async () => {
    performanceMonitor.startTiming('initialization');
    
    try {
      StyleModule.inject();
      const token = StateModule.getToken();
      
      if (!token) {
        showTokenDialog();
        return;
      }
      
      UIModule.Toast.show('驗證 Token 中...', 'info');
      const isValid = await ApiModule.verifyToken(token, StateModule.getApiBase());
      
      if (isValid) {
        showQueryDialog();
      } else {
        showTokenDialog();
      }
    } catch (error) {
      await errorBoundary.handleError(error, { action: 'initialize' });
    } finally {
      performanceMonitor.endTiming('initialization');
    }
  };

  const showTokenDialog = () => {
    const env = StateModule.getEnvironment();
    const token = StateModule.getCurrentToken();
    
    const html = `
      <div class="pct-modal-header"><span id="pct-modal-title">商品查詢小工具（${env === 'PROD' ? '正式環境' : '測試環境'}）</span></div>
      <div class="pct-modal-body">
        <div class="pct-form-group">
          <label for="pct-token-input" class="pct-label">請輸入 SSO-TOKEN：</label>
          <textarea class="pct-input" id="pct-token-input" rows="4" placeholder="請貼上您的 SSO-TOKEN" autocomplete="off">${token || ''}</textarea>
          <div class="pct-error" id="pct-token-err" style="display:none;"></div>
        </div>
      </div>
      <div class="pct-modal-footer">
        <button class="pct-btn" id="pct-token-ok">驗證並繼續</button>
        <button class="pct-btn pct-btn-secondary" id="pct-token-skip">略過檢核</button>
        <button class="pct-btn pct-btn-danger" id="pct-token-cancel">關閉</button>
      </div>
    `;
    
    UIModule.Modal.show(html, handleTokenDialog);
  };

  const handleTokenDialog = (modal) => {
    const tokenInput = modal.querySelector('#pct-token-input');
    
    const saveToken = val => {
      StateModule.set({ token: val });
      ['SSO-TOKEN', 'euisToken'].forEach(key => localStorage.setItem(key, val));
    };
    
    const handleError = (msg, show = true) => {
      const el = document.getElementById('pct-token-err');
      if (el) {
        el.textContent = show ? msg : '';
        el.style.display = show ? 'block' : 'none';
      }
    };
    
    modal.addEventListener('click', async (e) => {
      const targetId = e.target.id;
      if (!['pct-token-ok', 'pct-token-skip', 'pct-token-cancel'].includes(targetId)) return;

      const val = tokenInput.value.trim();
      handleError('', false);

      if (targetId === 'pct-token-ok') {
        if (!val) return handleError('請輸入 Token');
        UIModule.Toast.show('檢查 Token 中...', 'info');
        saveToken(val);
        const isValid = await ApiModule.verifyToken(val, StateModule.getApiBase());
        if (isValid) {
          UIModule.Toast.show('Token 驗證成功', 'success');
          showQueryDialog();
        } else {
          handleError('Token 驗證失敗，請重新輸入');
        }
      } else if (targetId === 'pct-token-skip') {
        if (val) saveToken(val);
        UIModule.Toast.show('已略過 Token 驗證，直接進入查詢', 'warning');
        showQueryDialog();
      } else if (targetId === 'pct-token-cancel') {
        UIModule.Modal.close();
      }
    });
    
    tokenInput.focus();
  };

  const showQueryDialog = () => {
    const env = StateModule.getEnvironment();
    const queryModes = config.getQueryModes();
    const primaryQueryModes = [
      queryModes.PLAN_CODE, queryModes.PLAN_NAME, queryModes.ALL_MASTER_PLANS,
      'masterDataCategory', 'channelDataCategory'
    ];
    
    const modeLabels = {
      [queryModes.PLAN_CODE]: '商品代號',
      [queryModes.PLAN_NAME]: '商品名稱',
      [queryModes.ALL_MASTER_PLANS]: '查詢全部',
      'masterDataCategory': '查詢主檔',
      'channelDataCategory': '查詢通路'
    };
    
    const modeCards = primaryQueryModes.map(mode => 
      `<div class="pct-mode-card" data-mode="${mode}">${modeLabels[mode] || mode}</div>`
    ).join('');
    
    const html = `
      <div class="pct-modal-header"><span id="pct-modal-title">查詢條件設定（${env === 'PROD' ? '正式環境' : '測試環境'}）</span></div>
      <div class="pct-modal-body">
        <div class="pct-form-group">
          <div class="pct-label">查詢模式：</div>
          <div id="pct-mode-wrap" class="pct-mode-card-grid">${modeCards}</div>
        </div>
        <div id="pct-dynamic-query-content"></div>
        <div class="pct-form-group"><div class="pct-error" id="pct-query-err" style="display:none"></div></div>
      </div>
      <div class="pct-modal-footer">
        <button class="pct-btn" id="pct-query-ok">開始查詢</button>
        <button class="pct-btn pct-btn-secondary" id="pct-query-clear-selection">清除選擇</button>
        <button class="pct-btn pct-btn-danger" id="pct-query-cancel">關閉</button>
      </div>
    `;
    
    UIModule.Modal.show(html, handleQueryDialog);
  };

  const handleQueryDialog = (modal) => {
    const queryState = StateModule.getQueryState();
    const localState = {
      primaryMode: queryState.queryMode || config.getQueryModes().PLAN_CODE,
      queryInput: queryState.queryInput,
      subOptions: new Set(queryState.querySubOption),
      channels: new Set(queryState.queryChannels)
    };
    
    const elements = {
      dynamicContent: modal.querySelector('#pct-dynamic-query-content'),
      modeWrap: modal.querySelector('#pct-mode-wrap'),
      errEl: modal.querySelector('#pct-query-err')
    };

    const contentTemplates = {
      [config.getQueryModes().PLAN_CODE]: `<div class="pct-form-group"><label for="pct-query-input" class="pct-label">輸入商品代碼：</label><textarea class="pct-input" id="pct-query-input" rows="3" placeholder="多筆請用空格、逗號、分號或換行分隔"></textarea></div>`,
      [config.getQueryModes().PLAN_NAME]: `<div class="pct-form-group"><label for="pct-query-input" class="pct-label">輸入商品名稱關鍵字：</label><textarea class="pct-input" id="pct-query-input" rows="3" placeholder="請輸入商品名稱關鍵字"></textarea></div>`,
      [config.getQueryModes().ALL_MASTER_PLANS]: `<div style="text-align: center; padding: 20px; color: var(--text-color-light);">將查詢所有主檔商品。</div>`,
      'masterDataCategory': () => `
        <div class="pct-form-group"><div class="pct-label">選擇主檔查詢範圍：</div>
          <div class="pct-sub-option-grid" data-type="sub-option">
            <div class="pct-sub-option" data-value="${config.getQueryModes().MASTER_IN_SALE}">現售商品</div>
            <div class="pct-sub-option" data-value="${config.getQueryModes().MASTER_STOPPED}">停售商品</div>
          </div>
        </div>`,
      'channelDataCategory': () => {
        const channels = config.getFieldMaps().CHANNELS.map(ch => 
          `<div class="pct-channel-option" data-value="${ch}">${ch}</div>`
        ).join('');
        return `
          <div class="pct-form-group"><div class="pct-label">選擇通路：(可多選，不選則查全部)</div><div class="pct-channel-option-grid" data-type="channel">${channels}</div></div>
          <div class="pct-form-group"><div class="pct-label">選擇通路銷售範圍：</div>
            <div class="pct-sub-option-grid" data-type="sub-option">
              <div class="pct-sub-option" data-value="${config.getQueryModes().CHANNEL_IN_SALE}">現售通路</div>
              <div class="pct-sub-option" data-value="${config.getQueryModes().CHANNEL_STOPPED}">停售通路</div>
            </div>
          </div>`;
      }
    };
    
    const handleError = (msg, show = true) => {
      elements.errEl.textContent = show ? msg : '';
      elements.errEl.style.display = show ? 'block' : 'none';
    };
    
    const render = () => {
      elements.modeWrap.querySelectorAll('.pct-mode-card').forEach(c => 
        c.classList.toggle('selected', c.dataset.mode === localState.primaryMode)
      );
      
      const template = contentTemplates[localState.primaryMode];
      elements.dynamicContent.innerHTML = typeof template === 'function' ? template() : template || '';
      
      const inputEl = elements.dynamicContent.querySelector('#pct-query-input');
      if (inputEl) inputEl.value = localState.queryInput;
      
      elements.dynamicContent.querySelectorAll('[data-value]').forEach(el => {
        const set = el.classList.contains('pct-sub-option') ? localState.subOptions : localState.channels;
        el.classList.toggle('selected', set.has(el.dataset.value));
      });
      
      handleError('', false);
    };

    elements.modeWrap.addEventListener('click', e => {
      const card = e.target.closest('.pct-mode-card');
      if (card) {
        localState.primaryMode = card.dataset.mode;
        localState.queryInput = '';
        localState.subOptions.clear();
        localState.channels.clear();
        render();
      }
    });

    elements.dynamicContent.addEventListener('input', e => {
      if (e.target.matches('#pct-query-input')) {
        localState.queryInput = utils.inputUtils.normalizeInput(e.target.value);
        if (e.target.value !== localState.queryInput) e.target.value = localState.queryInput;
      }
    });

    elements.dynamicContent.addEventListener('click', e => {
      const option = e.target.closest('[data-value]');
      if (!option) return;
      
      const { type } = option.parentElement.dataset;
      const { value } = option.dataset;
      const targetSet = type === 'sub-option' ? localState.subOptions : localState.channels;
      
      if (targetSet.has(value)) {
        targetSet.delete(value);
      } else {
        if (type === 'sub-option') targetSet.clear();
        targetSet.add(value);
      }
      render();
    });

    modal.querySelector('.pct-modal-footer').addEventListener('click', e => {
      const targetId = e.target.id;
      
      if (targetId === 'pct-query-clear-selection') {
        localState.primaryMode = '';
        localState.queryInput = '';
        localState.subOptions.clear();
        localState.channels.clear();
        render();
        UIModule.Toast.show('已清除所有查詢條件', 'info');
      } else if (targetId === 'pct-query-ok') {
        let finalMode = localState.primaryMode;
        
        if (['masterDataCategory', 'channelDataCategory'].includes(localState.primaryMode)) {
          if (localState.subOptions.size !== 1) return handleError('請選擇一個查詢範圍');
          finalMode = [...localState.subOptions][0];
        }
        
        if (!finalMode) return handleError('請選擇查詢模式');
        if (['planCode', 'planCodeName'].includes(finalMode) && !localState.queryInput) {
          return handleError('請輸入查詢內容');
        }
        
        StateModule.set({
          queryMode: finalMode,
          queryInput: localState.queryInput,
          querySubOption: [...localState.subOptions],
          queryChannels: [...localState.channels],
        });
        
        executeQuery();
      } else if (targetId === 'pct-query-cancel') {
        UIModule.Modal.close();
      }
    });

    render();
  };

  const executeQuery = async () => {
    performanceMonitor.startTiming('queryExecution');
    
    try {
      UIModule.Modal.close();
      StateModule.resetQuery();
      StateModule.set({ 
        currentQueryController: new AbortController(), 
        isQuerying: true 
      });
      
      showCancelQueryButton(true);
      UIModule.Toast.show('查詢中...', 'info', null, true);

      const { queryMode, queryInput, queryChannels } = StateModule.getQueryState();
      const queryModes = config.getQueryModes();
      let rawRecords;

      // 使用智能快取
      const cacheKey = `query_${JSON.stringify(StateModule.getQueryState())}`;
      let cachedResult = smartCache.get(cacheKey);
      
      if (!cachedResult) {
        if (queryMode === queryModes.PLAN_CODE) {
          const planCodes = utils.inputUtils.splitInput(queryInput);
          if (planCodes.length === 0) {
            UIModule.Toast.show('請輸入商品代碼', 'error');
            return;
          }
          const result = await ApiModule.queryMultiplePlanCodes(planCodes, StateModule.get().currentQueryController.signal);
          rawRecords = result.records;
        } else if (queryMode === queryModes.PLAN_NAME) {
          const params = ApiModule.buildMasterQueryParams(queryMode, queryInput, 1, config.getDefaultParams().PAGE_SIZE_MASTER);
          const result = await ApiModule.callApi(`${StateModule.getApiBase()}/planCodeController/queryByPlanName`, params, StateModule.get().currentQueryController.signal);
          rawRecords = result.records || [];
        } else if (queryMode === queryModes.ALL_MASTER_PLANS) {
          const params = ApiModule.buildMasterQueryParams(queryMode, '', 1, config.getDefaultParams().PAGE_SIZE_MASTER);
          const result = await ApiModule.callApi(`${StateModule.getApiBase()}/planCodeController/query`, params, StateModule.get().currentQueryController.signal);
          rawRecords = result.records || [];
        } else if (queryMode === queryModes.MASTER_IN_SALE) {
          const params = ApiModule.buildMasterQueryParams(queryMode, '', 1, config.getDefaultParams().PAGE_SIZE_MASTER);
          const result = await ApiModule.callApi(`${StateModule.getApiBase()}/planCodeController/query`, params, StateModule.get().currentQueryController.signal);
          rawRecords = result.records || [];
        } else if (queryMode === queryModes.MASTER_STOPPED) {
          const [all, current] = await Promise.all([
            ApiModule.callApi(`${StateModule.getApiBase()}/planCodeController/query`, { currentPage: 1, pageSize: config.getDefaultParams().PAGE_SIZE_MASTER }, StateModule.get().currentQueryController.signal),
            ApiModule.callApi(`${StateModule.getApiBase()}/planCodeController/query`, { saleEndDate: '9999-12-31 00:00:00', currentPage: 1, pageSize: config.getDefaultParams().PAGE_SIZE_MASTER }, StateModule.get().currentQueryController.signal)
          ]);
          const currentSet = new Set((current.records || []).map(r => r.planCode));
          rawRecords = (all.records || []).filter(r => !currentSet.has(r.planCode));
        } else if ([queryModes.CHANNEL_IN_SALE, queryModes.CHANNEL_STOPPED].includes(queryMode)) {
          const channelData = await ApiModule.queryChannelData(queryMode, queryChannels, StateModule.get().currentQueryController.signal);
          const planCodes = [...new Set(channelData.map(item => item.planCode))];
          rawRecords = planCodes.length > 0 ? (await ApiModule.queryMultiplePlanCodes(planCodes, StateModule.get().currentQueryController.signal)).records : [];
        }
        
        smartCache.set(cacheKey, rawRecords);
      } else {
        rawRecords = cachedResult;
      }
      
      if (!rawRecords || rawRecords.length === 0) {
        UIModule.Toast.show('查無資料', 'warning');
        return;
      }

            const processedData = DataModule.processRawData(rawRecords);
      StateModule.set({ 
        rawData: rawRecords, 
        allProcessedData: processedData, 
        totalRecords: processedData.length
      });
      
      renderTable();
      UIModule.Toast.show(`基本資料載入完成，共 ${processedData.length} 筆`, 'success', 2000, true);
      
      await DataModule.loadDetailsInBackground(processedData, false, (index, item) => {
        if((index + 1) % 5 === 0) updateTableDisplay();
      });
      updateTableDisplay();
      UIModule.Toast.show('所有詳細資料載入完成', 'success');

    } catch (error) {
      if (error.name !== 'AbortError') {
        await errorBoundary.handleError(error, { 
          action: 'executeQuery',
          retry: () => executeQuery()
        });
      }
    } finally {
      const duration = performanceMonitor.endTiming('queryExecution');
      StateModule.set({ isQuerying: false, currentQueryController: null });
      showCancelQueryButton(false);
      UIModule.Toast.hide();
      EventBus.emit('query.completed', { duration, success: !error });
    }
  };

  const renderTable = () => {
    const state = StateModule.get();
    const data = applyFiltersAndSort(state);
    
    const hasSpecialData = state.allProcessedData.some(r => r.special);
    const pagination = DataModule.paginateData(data, state.pageNo, state.pageSize, state.showAllPages);
    
    // 決定是否使用虛擬滾動
    const useVirtualScroll = data.length > config.getPerformanceSettings().VIRTUAL_SCROLL_THRESHOLD;
    
    const html = `
      <div class="pct-modal-header">
        <span id="pct-modal-title">查詢結果（${state.environment === 'PROD' ? '正式環境' : '測試環境'}）</span>
      </div>
      <div class="pct-modal-body">
        ${renderSummary(data, hasSpecialData)}
        ${renderSearchBox()}
        ${renderActionButtons(hasSpecialData, state.filterSpecial)}
        ${useVirtualScroll ? renderVirtualTable(pagination.data) : renderNormalTable(pagination.data)}
        ${renderPagination(data, pagination, state)}
      </div>
      <div class="pct-modal-footer">
        <button class="pct-btn pct-btn-danger" id="pct-table-close">關閉</button>
      </div>
    `;

    UIModule.Modal.show(html, (modal) => {
      uiRefs.modal = modal;
      uiRefs.body = modal.querySelector('.pct-modal-body');
      
      if (useVirtualScroll) {
        setupVirtualScroll(modal, pagination.data);
      }
      
      EventModule.handleTableEvents(modal, data, pagination.totalPages);
    });
  };

  const renderSummary = (data, hasSpecialData) => {
    const specialCount = data.filter(r => r.special).length;
    return `
      <div class="pct-summary">
        <span>共 <b>${data.length}</b> 筆資料</span>
        ${hasSpecialData ? `<span>特殊狀態 <b>${specialCount}</b> 筆</span>` : ''}
        <div class="pct-performance-info" style="margin-left: auto; font-size: 12px; color: var(--text-color-light);">
          快取命中率: ${smartCache.getStats().hitRate?.toFixed(2) || '0.00'}
        </div>
      </div>
    `;
  };

  const renderSearchBox = () => {
    const state = StateModule.get();
    const searchValue = utils.escapeHtml(state.searchKeyword);
    return `
      <div class="pct-search-container">
        <input type="text" class="pct-search-input" id="pct-search-input" 
               placeholder="搜尋商品代號、名稱、POLPLN 或其他內容..." value="${searchValue}">
        ${state.searchKeyword ? 
          '<button class="pct-search-clear" id="pct-search-clear" title="清除搜尋">✕</button>' : 
          '<span class="pct-search-icon">🔍</span>'
        }
      </div>
    `;
  };

  const renderActionButtons = (hasSpecialData, filterSpecial) => `
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
      ${hasSpecialData ? `
        <button class="pct-filter-btn ${filterSpecial ? 'pct-filter-btn-active' : ''}" id="pct-table-filter">
          ${filterSpecial ? '顯示全部' : '篩選特殊狀態'}
        </button>
      ` : ''}
      <button class="pct-btn pct-btn-info" id="pct-table-detail">查詢全部</button>
      <button class="pct-btn pct-btn-success" id="pct-table-copy">一鍵複製</button>
      <button class="pct-btn" id="pct-table-requery">重新查詢</button>
    </div>
  `;

  const renderNormalTable = (data) => {
    if (!data?.length) {
      return '<div class="pct-table-wrap" style="height:150px; display:flex; align-items:center; justify-content:center; color:var(--text-color-light);">查無資料</div>';
    }

    const state = StateModule.get();
    const saleStatus = config.getSaleStatus();
    
    const headers = [
      {key: 'no', label: 'No'}, {key: 'planCode', label: '代號'}, {key: 'shortName', label: '商品名稱'},
      {key: 'currency', label: '幣別'}, {key: 'unit', label: '單位'}, {key: 'coverageType', label: '類型'},
      {key: 'saleStartDate', label: '銷售起日'}, {key: 'saleEndDate', label: '銷售迄日'}, 
      {key: 'mainStatus', label: '主約狀態'}, {key: 'polpln', label: 'POLPLN'}, {key: '', label: '通路資訊'}
    ];

    const headerHtml = headers.map(header => {
      if (!header.key) return `<th>${header.label}</th>`;
      const sortClass = state.sortKey === header.key ? (state.sortAsc ? 'sort-asc' : 'sort-desc') : '';
      return `<th data-key="${header.key}" class="${sortClass}">${header.label}</th>`;
    }).join('');

    const rowsHtml = data.map(row => {
      if (row._isErrorRow) {
        return `
          <tr class="error-row">
            <td>${row.no}</td>
            <td class="pct-td-copy" data-raw="${utils.escapeHtml(row.planCode)}">${utils.escapeHtml(row.planCode)}</td>
            <td colspan="8" style="color:#d9534f;">
              ${row.saleEndDate}
              <button class="pct-btn pct-btn-info pct-btn-retry" data-plan="${utils.escapeHtml(row.planCode)}">重新查詢</button>
            </td>
            <td></td>
          </tr>
        `;
      }

      const channelHtml = (row.channels || []).map(c => {
        const statusClass = {
          [saleStatus.CURRENT]: 'pct-status-onsale', 
          [saleStatus.STOPPED]: 'pct-status-offsale',
          [saleStatus.ABNORMAL]: 'pct-status-abnormal'
        }[c.status] || 'pct-status-pending';
        return `<span class="${statusClass}">${utils.escapeHtml(c.channel)}:${utils.escapeHtml(c.saleEndDate)}（${utils.escapeHtml(c.status)}）</span>`;
      }).join('<br>');
      
      const mainStatusClass = {
        [saleStatus.CURRENT]: 'pct-status-onsale', 
        [saleStatus.STOPPED]: 'pct-status-offsale',
        [saleStatus.ABNORMAL]: 'pct-status-abnormal'
      }[row.mainStatus] || 'pct-status-pending';
      
      const cells = [
        row.no, row.planCode, row.shortName, row.currency, 
        row.unit, row.coverageType, row.saleStartDate, row.saleEndDate
      ].map(value => `<td class="pct-td-copy" data-raw="${utils.escapeHtml(value)}">${utils.escapeHtml(value)}</td>`).join('');

      return `
        <tr${row.special ? ' class="special-row"' : ''}>
          ${cells}
          <td class="pct-td-copy ${mainStatusClass}" data-raw="${utils.escapeHtml(row.mainStatus)}">${utils.escapeHtml(row.mainStatus)}</td>
          <td class="pct-td-copy" data-raw="${utils.escapeHtml(row.polpln || '')}">${utils.escapeHtml(row.polpln || '')}</td>
          <td>${channelHtml}</td>
        </tr>
      `;
    }).join('');
    
    return `
      <div class="pct-table-wrap">
        <table class="pct-table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  };

  const renderVirtualTable = (data) => `
    <div class="pct-virtual-scroll" id="pct-virtual-container">
      <div>虛擬滾動表格載入中...</div>
    </div>
  `;

  const setupVirtualScroll = (modal, data) => {
    const container = modal.querySelector('#pct-virtual-container');
    if (!container || !data.length) return;

    const virtualScroll = new VirtualScrollModule.VirtualScroll(container, {
      itemHeight: config.getUISettings().VIRTUAL_SCROLL_ITEM_HEIGHT,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.borderBottom = '1px solid #ddd';
        div.style.padding = '8px';
        div.innerHTML = `
          <span style="width: 60px;">${item.no}</span>
          <span style="width: 120px;">${utils.escapeHtml(item.planCode)}</span>
          <span style="flex: 1;">${utils.escapeHtml(item.shortName)}</span>
          <span style="width: 100px;">${utils.escapeHtml(item.mainStatus)}</span>
        `;
        return div;
      }
    });

    virtualScroll.setData(data);
  };

  const renderPagination = (data, pagination, state) => `
    <div class="pct-pagination">
      <div class="pct-pagination-info">
        第 ${state.showAllPages ? 1 : state.pageNo} / ${pagination.totalPages} 頁 (共 ${data.length} 筆)
      </div>
      ${!state.showAllPages && pagination.totalPages > 1 ? `
        <div class="pct-page-controls">
          <button class="pct-btn pct-btn-secondary" id="pct-table-prev" ${!pagination.hasPrev ? 'disabled' : ''}>上一頁</button>
          <input type="number" class="pct-page-input" id="pct-page-jump-input" value="${state.pageNo}" min="1" max="${pagination.totalPages}">
          <button class="pct-btn pct-btn-secondary" id="pct-page-jump-btn">跳轉</button>
          <button class="pct-btn pct-btn-secondary" id="pct-table-next" ${!pagination.hasNext ? 'disabled' : ''}>下一頁</button>
        </div>
      ` : ''}
      <button class="pct-btn pct-btn-secondary" id="pct-table-show-all">
        ${state.showAllPages ? '分頁顯示' : '顯示全部'}
      </button>
    </div>
  `;

  const updateTableDisplay = () => {
    if (!uiRefs.body) return;
    const state = StateModule.get();
    const data = applyFiltersAndSort(state);
    const pagination = DataModule.paginateData(data, state.pageNo, state.pageSize, state.showAllPages);
    
    const summaryEl = uiRefs.body.querySelector('.pct-summary');
    const tableEl = uiRefs.body.querySelector('.pct-table-wrap');
    
    if (summaryEl) {
      summaryEl.outerHTML = renderSummary(data, state.allProcessedData.some(r => r.special));
    }
    if (tableEl) {
      tableEl.outerHTML = renderNormalTable(pagination.data);
    }
  };
  
  const applyFiltersAndSort = (state) => {
    const data = DataModule.filterData(state.allProcessedData, state.searchKeyword, state.filterSpecial);
    return DataModule.sortData(data, state.sortKey, state.sortAsc);
  };

  const showCancelQueryButton = (show) => {
    let btn = document.getElementById('pct-cancel-query-btn');
    if (show) {
      if (btn) return;
      btn = document.createElement('button');
      Object.assign(btn, {
        id: 'pct-cancel-query-btn',
        className: 'pct-btn pct-btn-danger pct-cancel-query',
        textContent: '中止查詢',
        onclick: () => StateModule.get().currentQueryController?.abort()
      });
      document.body.appendChild(btn);
    } else {
      btn?.remove();
    }
  };

  const handleDetailQuery = async () => {
    const state = StateModule.get();
    if (state.detailQueryCount > 0 && !confirm('您已點擊過「查詢全部」。再次點擊將清空所有快取並重新查詢所有數據，您確定要繼續嗎？')) {
      return UIModule.Toast.show('已取消操作。', 'info');
    }
    
    StateModule.set({ detailQueryCount: state.detailQueryCount + 1 });
    UIModule.Toast.show(
      state.detailQueryCount === 1 ? '補齊尚未載入的數據...' : '清空快取並重新查詢所有詳細資料中...', 
      'info', 3000
    );
    
    await DataModule.loadDetailsInBackground(
      state.allProcessedData, 
      state.detailQueryCount > 1, 
      (index, item) => updateTableDisplay()
    );
    
    UIModule.Toast.show('詳細資料更新完成', 'success');
  };

  const querySinglePlanCode = async (planCode) => {
    try {
      UIModule.Toast.show(`重新查詢 ${planCode}...`, 'info');
      const result = await ApiModule.callApi(
        `${StateModule.getApiBase()}/planCodeController/query`, 
        { planCode, currentPage: 1, pageSize: 10 }
      );
      
      const allData = StateModule.get().allProcessedData;
      const idx = allData.findIndex(r => r.planCode === planCode && r._isErrorRow);

      if (idx !== -1 && result.records?.length > 0) {
        const processed = DataModule.processRawData(result.records);
        allData.splice(idx, 1, ...processed);
        StateModule.set({ allProcessedData: allData });
        updateTableDisplay();
        UIModule.Toast.show(`${planCode} 查詢成功`, 'success');
        await DataModule.loadDetailsInBackground(processed, true, (index, item) => updateTableDisplay());
      } else {
        UIModule.Toast.show(`${planCode} 查無資料`, 'warning');
      }
    } catch (error) {
      UIModule.Toast.show(`${planCode} 查詢失敗: ${error.message}`, 'error');
    }
  };

  // 全域變數快取
  let uiRefs = {};

  return { 
    initialize, 
    showTokenDialog, 
    showQueryDialog, 
    executeQuery, 
    renderTable, 
    updateTableDisplay, 
    handleDetailQuery, 
    querySinglePlanCode 
  };
})();

/**
 * ========== 模組 17：事件處理擴展 (EventModule) ==========
 */
const EventModule = DIContainer.inject(['config', 'utils'])((deps) => {
  const { config, utils } = deps;
  
  const handleTableEvents = (modal, displayedData, totalPages) => {
    modal.addEventListener('click', async (e) => {
      const target = e.target;
      const targetId = target.id;
      const state = StateModule.get();

      // 搜尋清除
      if (targetId === 'pct-search-clear') {
        StateModule.set({ searchKeyword: '', pageNo: 1 });
        return ControllerModule.renderTable();
      }

      // 分頁控制
      if (targetId === 'pct-table-prev' && state.pageNo > 1) {
        StateModule.set({ pageNo: state.pageNo - 1 });
        return ControllerModule.renderTable();
      }
      if (targetId === 'pct-table-next' && state.pageNo < totalPages) {
        StateModule.set({ pageNo: state.pageNo + 1 });
        return ControllerModule.renderTable();
      }
      if (targetId === 'pct-page-jump-btn') {
        const pageNum = parseInt(modal.querySelector('#pct-page-jump-input').value, 10);
        if (pageNum >= 1 && pageNum <= totalPages) {
          StateModule.set({ pageNo: pageNum });
          ControllerModule.renderTable();
        } else {
          UIModule.Toast.show(`請輸入 1 到 ${totalPages} 的頁碼`, 'warning');
        }
        return;
      }

      // 顯示模式切換
      if (targetId === 'pct-table-show-all') {
        StateModule.set({ showAllPages: !state.showAllPages, pageNo: 1 });
        return ControllerModule.renderTable();
      }

      // 功能按鈕
      if (targetId === 'pct-table-detail') return ControllerModule.handleDetailQuery();
      if (targetId === 'pct-table-copy') {
        const copyText = generateCopyText(displayedData);
        return utils.copyToClipboard(copyText, UIModule.Toast.show);
      }
      if (targetId === 'pct-table-filter') {
        StateModule.set({ filterSpecial: !state.filterSpecial, pageNo: 1 });
        return ControllerModule.renderTable();
      }
      if (targetId === 'pct-table-requery') return ControllerModule.showQueryDialog();
      if (targetId === 'pct-table-close') return UIModule.Modal.close();

      // 排序處理
      const sortHeader = target.closest('th[data-key]');
      if (sortHeader) {
        const key = sortHeader.dataset.key;
        const newSortAsc = state.sortKey === key ? !state.sortAsc : true;
        StateModule.set({ sortKey: key, sortAsc: newSortAsc, pageNo: 1 });
        return ControllerModule.renderTable();
      }
      
      // 重試按鈕
      const retryBtn = target.closest('.pct-btn-retry');
      if (retryBtn) return ControllerModule.querySinglePlanCode(retryBtn.dataset.plan);

      // 複製單元格
      const copyCell = target.closest('.pct-td-copy');
      if (copyCell) return utils.copyToClipboard(copyCell.dataset.raw, UIModule.Toast.show);
    });

    // 搜尋輸入處理
    const searchInput = modal.querySelector('#pct-search-input');
    searchInput?.addEventListener('input', e => {
      clearTimeout(StateModule.get().searchDebounceTimer);
      const timer = setTimeout(() => {
        StateModule.set({ searchKeyword: e.target.value, pageNo: 1 });
        ControllerModule.renderTable();
      }, config.getUISettings().DEBOUNCE_DELAY);
      StateModule.set({ searchDebounceTimer: timer });
    });
  };

  const generateCopyText = (data) => {
    const headers = ['No', '代號', '商品名稱', '幣別', '單位', '類型', '銷售起日', '銷售迄日', '主約狀態', 'POLPLN', '通路資訊'];
    const rows = data.map(item => {
      const channelStr = (item.channels || []).map(c => `${c.channel}:${c.saleEndDate}（${c.status}）`).join(' / ');
      return [
        item.no, item.planCode, item.shortName, item.currency, 
        item.unit, item.coverageType, item.saleStartDate, 
        item.saleEndDate, item.mainStatus, item.polpln, channelStr
      ];
    });
    
    return [headers, ...rows].map(row => row.join('\t')).join('\n');
  };

  return { handleTableEvents };
});

/**
 * ========== 事件監聽器設定 ==========
 */
EventBus.use(async (context) => {
  console.log(`[EventBus] ${context.eventName}:`, context.payload);
  return context;
});

// 監聽效能事件
EventBus.on('api.call.completed', (data) => {
  console.log(`API 呼叫完成: ${data.endpoint}, 耗時: ${data.duration}ms, 快取: ${data.cached}`);
});

EventBus.on('query.completed', (data) => {
  console.log(`查詢完成: 耗時 ${data.duration}ms, 成功: ${data.success}`);
});

EventBus.on('error.occurred', (errorInfo) => {
  console.error('應用程式錯誤:', errorInfo);
});

/**
 * ========== 主程式初始化 ==========
 */
ControllerModule.initialize();

})();
