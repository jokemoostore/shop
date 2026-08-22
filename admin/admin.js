const DEFAULT_ADMIN_API_URL = (window.JokeMooConfig && window.JokeMooConfig.apiBaseUrl)
  ? window.JokeMooConfig.apiBaseUrl
  : 'https://script.google.com/macros/s/AKfycbyspAWk-Wkf4qShYeswphtQt5iCe2q7hccdDu6G4rd648hdgzNLOlLUMsPVvZmRL0XF/exec';
const DEFAULT_ADMIN_API_KEY = (window.JokeMooConfig && window.JokeMooConfig.adminApiKey)
  ? window.JokeMooConfig.adminApiKey
  : 'ldmbvu219-126dhidk;das';
const ADMIN_REVIEWS_PER_PAGE = 6;

const defaultProducts = [
  { id: 1, name: "Netflix Premium 1 DAY", category: "netflix", available: true, price: 19, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix19.png" },
  { id: 2, name: "Netflix Premium 3 DAY", category: "netflix", available: true, price: 39, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix39.png" },
  { id: 3, name: "Netflix Premium 7 DAY", category: "netflix", available: true, price: 59, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix59.png" },
  { id: 4, name: "Netflix Premium 15 DAY", category: "netflix", available: true, price: 109, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix109.png" },
  { id: 5, name: "Netflix Premium 30 DAY", category: "netflix", available: true, price: 169, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix169.png" },
  { id: 6, name: "Netflix Premium 30 DAY", category: "netflix", available: true, price: 189, desc: "Netflix [ เมลลูกค้า ]", image: "netflix189.png" },
  { id: 7, name: "YouTube Premium 30 DAY", category: "other", available: true, price: 99, desc: "YouTube Premium [ เมลลูกค้า ]", image: "youtube.png" },
  { id: 8, name: "IQIY Premium 7 DAY", category: "other", available: false, price: 29, desc: "IQIY รับชมได้ทุกเรื่องแบบ VIP", image: "iqiy.png" },
  { id: 9, name: "IQIY Premium 30 DAY", category: "other", available: false, price: 99, desc: "IQIY รับชมได้ทุกเรื่องแบบ VIP", image: "iqiy.png" },
  { id: 10, name: "WETV Premium 7 DAY", category: "other", available: false, price: 24, desc: "รับชมซีรีส์ แบบ VIP ท๊๋ WETV", image: "wetv.png" },
  { id: 11, name: "WETV Premium 30 DAY", category: "other", available: false, price: 59, desc: "รับชมซีรีส์ แบบ VIP ที่ WETV", image: "wetv.png" },
];

const apiStatusElement = document.getElementById('apiStatus');
const refreshProductsBtn = document.getElementById('refreshProductsBtn');
const refreshReviewsBtn = document.getElementById('refreshReviewsBtn');
const addProductBtn = document.getElementById('addProductBtn');
const addReviewBtn = document.getElementById('addReviewBtn');
const reviewSearchInput = document.getElementById('reviewSearchInput');
const productTable = document.getElementById('productTable');
const reviewTable = document.getElementById('reviewTable');
const promotionTable = document.getElementById('promotionTable');
const addPromotionBtn = document.getElementById('addPromotionBtn');
const refreshPromotionsBtn = document.getElementById('refreshPromotionsBtn');
const movieTable = document.getElementById('movieTable');
const addMovieBtn = document.getElementById('addMovieBtn');
const refreshMoviesBtn = document.getElementById('refreshMoviesBtn');
const discountTable = document.getElementById('discountTable');
const addDiscountBtn = document.getElementById('addDiscountBtn');
const refreshDiscountsBtn = document.getElementById('refreshDiscountsBtn');
const adminToast = document.getElementById('adminToast');
const maintenanceToggleBtn = document.getElementById('maintenanceToggleBtn');
const maintenanceStatus = document.getElementById('maintenanceStatus');
const codeManagerRoot = document.getElementById('codeManagerRoot');
const codeManagerLoader = document.getElementById('codeManagerLoader');
const reloadCodeManagerBtn = document.getElementById('reloadCodeManagerBtn');
const adminCurrentTitle = document.getElementById('adminCurrentTitle');
const adminSidebar = document.getElementById('adminSidebar');
const adminSidebarToggle = document.getElementById('adminSidebarToggle');
const adminSidebarClose = document.getElementById('adminSidebarClose');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
let codeManagerLoaded = false;
let codeManagerLoadingPromise = null;

function loadScriptOnce(src, id) {
  const existing = id ? document.getElementById(id) : null;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    if (id) script.id = id;
    script.src = src;
    script.async = false;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`โหลด ${src} ไม่สำเร็จ`));
    document.body.appendChild(script);
  });
}

function bindCodeManagerSearch() {
  const input = document.getElementById('searchInput');
  if (!input || input.dataset.bound === '1' || typeof window.filterCodes !== 'function') return;
  input.dataset.bound = '1';
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => window.filterCodes(), 150);
  }, { passive: true });
}

function loadCodeManager(force = false) {
  if (!codeManagerRoot) return Promise.resolve();
  if (codeManagerLoaded) {
    if (force && typeof window.refreshData === 'function') window.refreshData();
    return Promise.resolve();
  }
  if (codeManagerLoadingPromise) return codeManagerLoadingPromise;
  if (codeManagerLoader) codeManagerLoader.classList.remove('hidden');

  codeManagerLoadingPromise = loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js', 'jmChartJs').catch(() => null)
    .then(() => loadScriptOnce('code-manager/api-config.js', 'jmCodeApiConfig'))
    .then(() => loadScriptOnce('code-manager/script.js', 'jmCodeManagerScript'))
    .then(() => {
      codeManagerLoaded = true;
      bindCodeManagerSearch();
      if (window.JMI18n) window.JMI18n.apply(window.JMI18n.lang, false);
      if (codeManagerLoader) codeManagerLoader.classList.add('hidden');
    })
    .catch((error) => {
      console.error('code manager load failed', error);
      if (codeManagerLoader) {
        codeManagerLoader.innerHTML = `<span class="code-manager-error"><i class="fas fa-triangle-exclamation"></i> ${error.message}</span>`;
      }
      throw error;
    })
    .finally(() => { codeManagerLoadingPromise = null; });

  return codeManagerLoadingPromise;
}

if (reloadCodeManagerBtn) {
  reloadCodeManagerBtn.addEventListener('click', () => loadCodeManager(true));
}


const adminState = {
  apiUrl: DEFAULT_ADMIN_API_URL,
  apiKey: DEFAULT_ADMIN_API_KEY,
  products: [],
  reviews: [],
  promotions: [],
  movies: [],
  discounts: [],
  orders: [],
  adminUsers: [],
  currentAdminUser: null,
  webSettings: null,
  orderSearch: '',
  orderPeriod: 'all',
  reviewSearchQuery: '',
  reviewPageIndex: 0,
  reviewSelectionIds: new Set(),
  maintenanceMode: false,
};

function showAdminToast(message, type = 'success') {
  if (!adminToast) return;
  adminToast.innerHTML = `<span class="toast__icon"><i class="fas ${type === 'success' ? 'fa-check' : 'fa-exclamation-triangle'}"></i></span><span class="toast__message">${message}</span>`;
  adminToast.classList.remove('hidden', 'toast--success', 'toast--error');
  adminToast.classList.add('show', `toast--${type}`);
  clearTimeout(showAdminToast.timeoutId);
  showAdminToast.timeoutId = setTimeout(() => {
    adminToast.classList.remove('show');
    adminToast.classList.add('hidden');
  }, 2600);
}

function setButtonLoading(button, loadingText = 'กำลังบันทึก...') {
  if (!button) return;
  if (!button.dataset.originalHtml) {
    button.dataset.originalHtml = button.innerHTML;
  }
  button.disabled = true;
  button.classList.add('button-loading');
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
}

function clearButtonLoading(button) {
  if (!button) return;
  button.disabled = false;
  button.classList.remove('button-loading');
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
  }
}

function normalizeReviewImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('drive.google.com')) {
      const id = parsed.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
      }
      const parts = parsed.pathname.split('/');
      const fileId = parts[3];
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
      }
    }
    return url;
  } catch (error) {
    if (/^\/\//.test(url)) {
      return `${window.location.protocol}${url}`;
    }
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return url.startsWith('/') ? url : `../${url}`;
  }
}

function updateApiStatus(message, type = 'loading') {
  if (!apiStatusElement) return;
  apiStatusElement.textContent = message;
  apiStatusElement.classList.remove('status-loading', 'status-success', 'status-error');
  apiStatusElement.classList.add(`status-${type}`);
}

function updateMaintenanceStatus() {
  if (!maintenanceStatus || !maintenanceToggleBtn) return;
  if (adminState.maintenanceMode) {
    maintenanceStatus.textContent = 'ปิดปรับปรุงอยู่';
    maintenanceStatus.classList.remove('status-success');
    maintenanceStatus.classList.add('status-error');
    maintenanceToggleBtn.textContent = 'เปิดระบบ';
    maintenanceToggleBtn.classList.remove('button-primary');
    maintenanceToggleBtn.classList.add('button-secondary');
  } else {
    maintenanceStatus.textContent = 'ระบบใช้งานปกติ';
    maintenanceStatus.classList.remove('status-error');
    maintenanceStatus.classList.add('status-success');
    maintenanceToggleBtn.textContent = 'ปิดปรับปรุง';
    maintenanceToggleBtn.classList.remove('button-secondary');
    maintenanceToggleBtn.classList.add('button-primary');
  }
}

function isSupportedReviewImage(file) {
  if (!file) return false;
  const mimeType = (file.type || '').toLowerCase();
  const blockedMimeTypes = new Set([
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ]);
  if (mimeType) {
    if (blockedMimeTypes.has(mimeType)) return false;
    if (mimeType.startsWith('image/')) return true;
  }
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name || '');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      }
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
      }
    };
    img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    img.src = dataUrl;
  });
}

async function createReviewImageDataUrl(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const maximumLength = 1.4 * 1024 * 1024;
  if (rawDataUrl.length <= maximumLength) {
    return rawDataUrl;
  }
  const compressedDataUrl = await resizeImageDataUrl(rawDataUrl, 1200, 1200, 0.75);
  if (compressedDataUrl.length <= maximumLength) {
    return compressedDataUrl;
  }
  const moreCompressedDataUrl = await resizeImageDataUrl(rawDataUrl, 900, 900, 0.6);
  if (moreCompressedDataUrl.length <= maximumLength) {
    return moreCompressedDataUrl;
  }
  throw new Error('รูปภาพยังมีขนาดใหญ่เกินไป กรุณาใช้รูปที่เล็กลง');
}

async function createQrImageDataUrl(file) {
  const raw = await readFileAsDataUrl(file);
  const attempts = [
    [520, 520, 0.92],
    [420, 420, 0.90],
    [340, 340, 0.88],
    [280, 280, 0.86],
  ];
  for (const [w,h,q] of attempts) {
    const data = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(w / img.width, h / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/webp', q));
        } catch (error) { reject(error); }
      };
      img.onerror = reject;
      img.src = raw;
    });
    if (data.length < 45000) return data;
  }
  throw new Error('รูป QR มีข้อมูลมากเกินไป กรุณาใช้รูป QR ที่เรียบง่ายหรือใส่ URL รูปแทน');
}

function createNewReview() {
  const newReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    rating: 5,
    comment: '',
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
    imageUrl: '',
    synced: false,
  };
  adminState.reviews.unshift(newReview);
  adminState.reviewPageIndex = 0;
  renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
  updateAdminStats();
  showAdminToast('เพิ่มรีวิวใหม่เรียบร้อยแล้ว กรุณากดบันทึกเพื่อเก็บข้อมูล', 'success');
}

function createNewProduct() {
  const newProduct = {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    desc: '',
    price: 0,
    category: 'netflix',
    available: true,
    image: '',
    synced: false,
  };
  adminState.products.unshift(newProduct);
  renderProductTable(adminState.products);
  updateAdminStats();
  showAdminToast('เพิ่มสินค้าใหม่เรียบร้อยแล้ว กรุณากดบันทึกเพื่อเก็บข้อมูล', 'success');
}

function parsePromotionDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return null;

  const direct = new Date(str);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmY) {
    return new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]));
  }

  const thaiMonths = {
    'มกราคม': 1,
    'กุมภาพันธ์': 2,
    'มีนาคม': 3,
    'เมษายน': 4,
    'พฤษภาคม': 5,
    'มิถุนายน': 6,
    'กรกฎาคม': 7,
    'สิงหาคม': 8,
    'กันยายน': 9,
    'ตุลาคม': 10,
    'พฤศจิกายน': 11,
    'ธันวาคม': 12,
  };
  const thaiMatch = str.match(/^(\d{1,2})\s+([^\d]+)\s+(\d{4})$/);
  if (thaiMatch) {
    const day = Number(thaiMatch[1]);
    const month = thaiMonths[thaiMatch[2].trim()] || 0;
    const year = Number(thaiMatch[3]);
    if (month > 0) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = parsePromotionDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function formatDateForDateInput(value) {
  if (!value) return '';
  const date = parsePromotionDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateParts(value) {
  if (!value) return { day: '', month: '', year: '' };
  const date = parsePromotionDate(value);
  if (!date) return { day: '', month: '', year: '' };
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

function parseDateParts(dayValue, monthValue, yearValue) {
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return '';
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return '';
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

const MOVIE_PROMO_PREFIX = '__JM_MOVIE__';
const DISCOUNT_PROMO_PREFIX = '__JM_DISCOUNT__';
const ORDER_PROMO_PREFIX = '__JM_ORDER__';
const SETTINGS_PROMO_PREFIX = '__JM_SETTINGS__';
const ADMIN_USER_PROMO_PREFIX = '__JM_ADMIN_USER__';
const ADMIN_SESSION_KEY = 'jokemoo_admin_session_v1';
const ADMIN_SESSION_DAYS = 30;
const ADMIN_SESSION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;
const ROOT_ADMIN_USERNAME = 'adminbank';
const ROOT_ADMIN_FALLBACK = Object.freeze({
  username: ROOT_ADMIN_USERNAME,
  displayName: 'Bank Admin',
  role: 'owner',
  enabled: true,
  salt: '+bsvLvT4FNwB5KWQd7MweA==',
  hash: 'wu7yJURQMxmXwBelux7pc2SiDKteHU2fWEYKmOgFhsA=',
  iterations: 120000,
  isRoot: true,
  synced: false,
});

function isMoviePromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(MOVIE_PROMO_PREFIX));
}

function parseMoviePromotionRecord(promo) {
  if (!isMoviePromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallbackTitle = String(promo.title || '').slice(MOVIE_PROMO_PREFIX.length).replace(/^\|/, '').trim();
  return {
    id: promo.id,
    title: meta.title || fallbackTitle || '',
    titleEn: meta.titleEn || '',
    type: meta.type === 'upcoming' ? 'upcoming' : 'top',
    rank: Number(meta.rank) || 0,
    releaseDate: meta.releaseDate || formatDateForDateInput(promo.startAt),
    note: meta.note || '',
    noteEn: meta.noteEn || '',
    image: promo.image || promo.imageUrl || '',
    enabled: meta.enabled !== false,
    synced: true,
  };
}

function isDiscountPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(DISCOUNT_PROMO_PREFIX));
}

function parseDiscountPromotionRecord(promo) {
  if (!isDiscountPromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallbackCode = String(promo.title || '').slice(DISCOUNT_PROMO_PREFIX.length).replace(/^\|/, '').trim();
  return {
    id: promo.id,
    code: String(meta.code || fallbackCode || '').trim().toUpperCase(),
    type: meta.type === 'fixed' ? 'fixed' : 'percent',
    value: Math.max(0, Number(meta.value) || 0),
    minSpend: Math.max(0, Number(meta.minSpend) || 0),
    startAt: meta.startAt || formatDateForDateInput(promo.startAt),
    endAt: meta.endAt || formatDateForDateInput(promo.endAt),
    enabled: meta.enabled !== false && promo.enabled !== false,
    maxPeople: Math.max(0, Math.floor(Number(meta.maxPeople) || 0)),
    maxUsesPerPerson: Math.max(0, Math.floor(meta.maxUsesPerPerson === undefined || meta.maxUsesPerPerson === null || meta.maxUsesPerPerson === '' ? 1 : Number(meta.maxUsesPerPerson))),
    usedCount: Math.max(0, Math.floor(Number(meta.usedCount) || 0)),
    usedClients: Array.isArray(meta.usedClients) ? meta.usedClients.map(String) : [],
    clientUses: meta.clientUses && typeof meta.clientUses === 'object' && !Array.isArray(meta.clientUses) ? meta.clientUses : {},
    synced: true,
  };
}

function discountToPromotionPayload(discount) {
  const code = String(discount.code || '').trim().toUpperCase();
  return {
    title: `${DISCOUNT_PROMO_PREFIX}|${code || 'CODE'}`,
    description: JSON.stringify({
      code,
      type: discount.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(discount.value) || 0),
      minSpend: Math.max(0, Number(discount.minSpend) || 0),
      startAt: String(discount.startAt || '').trim(),
      endAt: String(discount.endAt || '').trim(),
      enabled: discount.enabled !== false,
      maxPeople: Math.max(0, Math.floor(Number(discount.maxPeople) || 0)),
      maxUsesPerPerson: Math.max(0, Math.floor(discount.maxUsesPerPerson === undefined || discount.maxUsesPerPerson === null || discount.maxUsesPerPerson === '' ? 1 : Number(discount.maxUsesPerPerson))),
      usedCount: Math.max(0, Math.floor(Number(discount.usedCount) || 0)),
      usedClients: Array.isArray(discount.usedClients) ? discount.usedClients.map(String) : [],
      clientUses: discount.clientUses && typeof discount.clientUses === 'object' && !Array.isArray(discount.clientUses) ? discount.clientUses : {},
    }),
    startAt: String(discount.startAt || '').trim(),
    endAt: String(discount.endAt || '').trim(),
    image: '',
    enabled: discount.enabled !== false,
  };
}

function createNewDiscount() {
  const row = { id: `new-discount-${Date.now()}`, code: '', type: 'percent', value: 10, minSpend: 0, startAt: '', endAt: '', enabled: true, maxPeople: 0, maxUsesPerPerson: 1, usedCount: 0, usedClients: [], clientUses: {}, synced: false };
  adminState.discounts.unshift(row);
  renderDiscountTable(adminState.discounts);
  updateAdminStats();
  showAdminToast('เพิ่มโค้ดส่วนลดใหม่แล้ว กรุณากรอกข้อมูลและกดบันทึก', 'success');
}

function isAdminUserPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(ADMIN_USER_PROMO_PREFIX));
}

function parseAdminUserPromotionRecord(promo) {
  if (!isAdminUserPromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallback = String(promo.title || '').slice(ADMIN_USER_PROMO_PREFIX.length).replace(/^\|/, '').trim().toLowerCase();
  const username = String(meta.username || fallback || '').trim().toLowerCase();
  if (!username) return null;
  return {
    id: promo.id, username, displayName: String(meta.displayName || username), role: meta.role === 'owner' ? 'owner' : 'admin',
    enabled: meta.enabled !== false, salt: String(meta.salt || ''), hash: String(meta.hash || ''),
    iterations: Math.max(60000, Number(meta.iterations) || 120000), createdAt: meta.createdAt || '', updatedAt: meta.updatedAt || '',
    isRoot: username === ROOT_ADMIN_USERNAME || meta.role === 'owner', synced: true
  };
}

function adminUserToPromotionPayload(user) {
  const username = String(user.username || '').trim().toLowerCase();
  return {
    title: `${ADMIN_USER_PROMO_PREFIX}|${username}`,
    description: JSON.stringify({ username, displayName: String(user.displayName || username), role: user.isRoot || user.role === 'owner' ? 'owner' : 'admin', enabled: user.enabled !== false, salt: user.salt, hash: user.hash, iterations: Number(user.iterations) || 120000, createdAt: user.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }),
    startAt: '', endAt: '', image: '', enabled: false
  };
}

function splitPromotionsAndMovies(records) {
  const list = Array.isArray(records) ? records : [];
  adminState.movies = list.map(parseMoviePromotionRecord).filter(Boolean);
  adminState.discounts = list.map(parseDiscountPromotionRecord).filter(Boolean);
  adminState.orders = list.map(parseOrderPromotionRecord).filter(Boolean).sort((a,b) => new Date(b.createdAt||0)-new Date(a.createdAt||0));
  adminState.adminUsers = list.map(parseAdminUserPromotionRecord).filter(Boolean);
  const settings = list.map(parseWebSettingsPromotionRecord).filter(Boolean);
  adminState.webSettings = normalizeAdminWebSettings(settings.length ? settings[settings.length - 1] : null);
  adminState.promotions = list.filter((promo) => !isMoviePromotionRecord(promo) && !isDiscountPromotionRecord(promo) && !isOrderPromotionRecord(promo) && !isSettingsPromotionRecord(promo) && !isAdminUserPromotionRecord(promo));
}

function movieToPromotionPayload(movie) {
  const cleanTitle = String(movie.title || '').trim();
  return {
    title: `${MOVIE_PROMO_PREFIX}|${cleanTitle || 'Movie'}`,
    description: JSON.stringify({
      title: cleanTitle,
      titleEn: String(movie.titleEn || '').trim(),
      type: movie.type === 'upcoming' ? 'upcoming' : 'top',
      rank: Number(movie.rank) || 0,
      releaseDate: String(movie.releaseDate || '').trim(),
      note: String(movie.note || '').trim(),
      noteEn: String(movie.noteEn || '').trim(),
      enabled: movie.enabled !== false,
    }),
    startAt: String(movie.releaseDate || '').trim(),
    endAt: '',
    image: String(movie.image || '').trim(),
    enabled: false,
  };
}

function createNewMovie() {
  const movie = {
    id: `new-movie-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    title: '', titleEn: '', type: 'top', rank: (adminState.movies.filter(m => m.type === 'top').length + 1),
    releaseDate: '', note: '', noteEn: '', image: '', enabled: true, synced: false,
  };
  adminState.movies.unshift(movie);
  renderMovieTable(adminState.movies);
  updateAdminStats();
  showAdminToast('เพิ่มรายการหนังใหม่แล้ว กรุณากรอกข้อมูลและกดบันทึก', 'success');
}

function renderMovieTable(movies) {
  if (!movieTable) return;
  const list = Array.isArray(movies) ? movies.slice() : [];
  if (!list.length) {
    movieTable.innerHTML = '<div class="empty-state movie-admin-empty"><i class="fas fa-clapperboard"></i><strong>ยังไม่มีหนังแนะนำ</strong><span>กด “เพิ่มหนังใหม่” เพื่อเริ่มจัดหน้าแนะนำหนัง</span></div>';
    return;
  }
  list.sort((a,b) => a.type === b.type ? ((a.type === 'top' ? (Number(a.rank)||999)-(Number(b.rank)||999) : String(a.releaseDate||'9999').localeCompare(String(b.releaseDate||'9999')))) : (a.type === 'top' ? -1 : 1));
  movieTable.innerHTML = `<div class="admin-movie-grid">${list.map((movie) => {
    const release = formatDateForDateInput(movie.releaseDate);
    return `
      <article class="admin-movie-card" data-id="${movie.id}">
        <div class="admin-movie-poster">
          ${movie.image ? `<img src="${normalizeReviewImageUrl(movie.image)}" alt="${movie.title || 'Movie'}" loading="lazy">` : `<div class="admin-movie-placeholder"><i class="fas fa-film"></i><span>POSTER</span></div>`}
          <span class="admin-movie-type ${movie.type === 'upcoming' ? 'upcoming' : 'top'}">${movie.type === 'upcoming' ? '<i class="fas fa-clock"></i> ใกล้จะเข้า' : `<i class="fas fa-trophy"></i> TOP ${movie.rank || '-'}`}</span>
        </div>
        <div class="admin-movie-content">
          <div class="admin-movie-card-header">
            <div><strong>${movie.title || 'หนังใหม่'}</strong><small>${movie.titleEn || (movie.type === 'upcoming' ? 'Coming Soon' : 'Top Movie')}</small></div>
            <span class="admin-status-badge ${movie.enabled !== false ? 'status-success' : 'status-error'}">${movie.enabled !== false ? 'เปิดแสดง' : 'ปิดแสดง'}</span>
          </div>
          <div class="admin-movie-fields">
            <div class="field-row"><label>ชื่อหนัง</label><input data-field="title" value="${movie.title || ''}" placeholder="ชื่อหนังภาษาไทย"></div>
            <div class="field-row"><label>ชื่อภาษาอังกฤษ</label><input data-field="titleEn" value="${movie.titleEn || ''}" placeholder="English title"></div>
            <div class="field-row"><label>ประเภทการแสดง</label><select data-field="type"><option value="top" ${movie.type === 'top' ? 'selected' : ''}>หนังติด TOP</option><option value="upcoming" ${movie.type === 'upcoming' ? 'selected' : ''}>หนังที่ใกล้จะเข้า</option></select></div>
            <div class="field-row movie-rank-field"><label>อันดับ TOP</label><input type="number" min="1" max="99" data-field="rank" value="${movie.rank || 1}"></div>
            <div class="field-row"><label>วันที่กำหนดเข้า</label><input type="date" data-field="releaseDate" value="${release}"></div>
            <div class="field-row"><label>สถานะ</label><select data-field="enabled"><option value="true" ${movie.enabled !== false ? 'selected' : ''}>เปิดแสดง</option><option value="false" ${movie.enabled === false ? 'selected' : ''}>ปิดแสดง</option></select></div>
            <div class="field-row field-span-2"><label>รายละเอียดหนัง</label><textarea data-field="note" placeholder="รายละเอียดสั้น ๆ ที่แสดงหน้าเว็บ">${movie.note || ''}</textarea></div>
            <div class="field-row field-span-2"><label>รายละเอียดภาษาอังกฤษ</label><textarea data-field="noteEn" placeholder="Short English description">${movie.noteEn || ''}</textarea></div>
            <div class="field-row field-span-2"><label>URL รูปโปสเตอร์</label><input data-field="imageUrl" value="${movie.image || ''}" placeholder="https://... หรือเลือกไฟล์ด้านล่าง"></div>
            <div class="field-row field-span-2 file-row"><label class="file-input-button"><input class="admin-movie-file" type="file" accept="image/*"><span><i class="fas fa-image"></i> เลือกโปสเตอร์</span></label><span class="file-note">ระบบจะย่อรูปก่อนบันทึก เพื่อลดขนาดและทำให้เว็บลื่น</span></div>
          </div>
          <div class="admin-movie-actions"><button type="button" class="button button-primary admin-save-movie" data-id="${movie.id}"><i class="fas fa-floppy-disk"></i> บันทึกหนัง</button><button type="button" class="button button-secondary admin-delete-movie" data-id="${movie.id}"><i class="fas fa-trash"></i> ลบ</button></div>
        </div>
      </article>`;
  }).join('')}</div>`;
}

function updateAdminStats() {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
  set('productStatTotal', adminState.products.length);
  set('productStatActive', adminState.products.filter(p => p.available).length);
  set('productStatInactive', adminState.products.filter(p => !p.available).length);
  set('reviewStatTotal', adminState.reviews.length);
  set('reviewStatFive', adminState.reviews.filter(r => Number(r.rating) === 5).length);
  set('reviewStatImages', adminState.reviews.filter(r => r.imageUrl).length);
  set('promoStatTotal', adminState.promotions.length);
  set('promoStatActive', adminState.promotions.filter(p => p.enabled).length);
  set('promoStatInactive', adminState.promotions.filter(p => !p.enabled).length);
  set('movieStatTotal', adminState.movies.length);
  set('movieStatTop', adminState.movies.filter(m => m.type === 'top' && m.enabled !== false).length);
  set('movieStatUpcoming', adminState.movies.filter(m => m.type === 'upcoming' && m.enabled !== false).length);

  const discounts = Array.isArray(adminState.discounts) ? adminState.discounts : [];
  const discountTotal = document.getElementById('discountStatTotal');
  const discountActive = document.getElementById('discountStatActive');
  const discountInactive = document.getElementById('discountStatInactive');
  const activeDiscountCount = discounts.filter(d => getDiscountLiveStatus(d).label === 'ใช้งานได้').length;
  if (discountTotal) discountTotal.textContent = discounts.length;
  if (discountActive) discountActive.textContent = activeDiscountCount;
  if (discountInactive) discountInactive.textContent = Math.max(0, discounts.length - activeDiscountCount);
}

function getProductStatus(product) {
  return product.available ? 'พร้อมขาย' : 'ไม่พร้อมใช้งาน';
}

function getPromotionStatus(promo) {
  if (!promo.enabled) return 'ปิดใช้งาน';
  const now = new Date();
  const start = parsePromotionDate(promo.startAt);
  const end = parsePromotionDate(promo.endAt);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  if (start && start > now) return 'รอเริ่ม';
  if (end && end < now) return 'หมดเวลา';
  return 'กำลังแสดง';
}

function getPromotionStatusClass(promo) {
  if (!promo.enabled) return 'status-error';
  const status = getPromotionStatus(promo);
  if (status === 'กำลังแสดง') return 'status-success';
  if (status === 'รอเริ่ม') return 'status-loading';
  return 'status-error';
}

function createNewPromotion() {
  const newPromotion = {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    description: '',
    image: '',
    enabled: false,
    startAt: '',
    endAt: '',
    synced: false,
  };
  adminState.promotions.unshift(newPromotion);
  renderPromotionTable(adminState.promotions);
  updateAdminStats();
  showAdminToast('เพิ่มโปรโมชั่นใหม่เรียบร้อยแล้ว กรุณากดบันทึกเพื่อเก็บข้อมูล', 'success');
}

async function fetchAdminGet(action, params = {}) {

  if (!adminState.apiUrl) {
    throw new Error('กรุณาใส่ Google Script API URL ก่อน');
  }

  const url = new URL(adminState.apiUrl);
  const query = new URLSearchParams({ action, apiKey: adminState.apiKey, ...params }).toString();
  url.search = query;

  const response = await fetch(url.toString(), { cache: 'no-store', mode: 'cors' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const result = await response.json();
  if (!result || !result.success) {
    throw new Error((result && result.message) || 'API error');
  }
  return result.data || result;
}

async function adminApiFetch(action, params = {}) {
  return await fetchAdminGet(action, params);
}

function notifyIndexReload() {
  try {
    window.localStorage.setItem('jokemoo_admin_reload', String(Date.now()));
  } catch (error) {
    console.warn('notifyIndexReload failed', error);
  }
}

async function adminApiPost(action, payload = {}) {
  if (!adminState.apiUrl) {
    throw new Error('กรุณาใส่ Google Script API URL ก่อน');
  }

  const requestBody = new URLSearchParams({ action, apiKey: adminState.apiKey, ...payload }).toString();
  const response = await fetch(adminState.apiUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (!result || !result.success) {
    throw new Error((result && result.message) || 'API error');
  }

  notifyIndexReload();
  return result.data || result;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

function resizeImageFile(file, maxWidth = 900, maxHeight = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

const adminCategories = {
  netflix: 'Netflix Premium',
  other: 'แอพอื่น'
};

function renderProductTable(products) {
  if (!productTable) return;
  if (!products.length) {
    productTable.innerHTML = '<div class="empty-state">ยังไม่มีสินค้าพร้อมจัดการ</div>';
    return;
  }

  const grouped = products.reduce((groups, product) => {
    const category = product.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
    return groups;
  }, {});

  productTable.innerHTML = Object.keys(adminCategories).map((category) => {
    const items = grouped[category] || [];
    if (!items.length) return '';

    return `
      <div class="admin-category-block">
        <div class="admin-category-header">
          <h4>${adminCategories[category]}</h4>
          <span>${items.length} รายการ</span>
        </div>
        <div class="admin-product-grid">
          ${items.map((product) => `
            <article class="admin-product-card" data-id="${product.id}">
              <div class="admin-product-card-header">
                <div>
                  <strong>${product.name || 'สินค้าใหม่'}</strong>
                  <div class="admin-card-meta">
                    <span>${product.desc || 'รายละเอียดสินค้าจะปรากฎที่นี่'}</span>
                    <span class="admin-status-badge ${product.available ? 'status-success' : 'status-error'}">${getProductStatus(product)}</span>
                  </div>
                </div>
                <div class="admin-product-card-actions">
                  <button type="button" class="button button-outline admin-toggle-product-edit" data-id="${product.id}">แก้ไข</button>
                  <button type="button" class="button button-secondary admin-delete-product" data-id="${product.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
              </div>
              <div class="admin-product-preview">
                ${product.image ? `<img src="${normalizeReviewImageUrl(product.image)}" alt="${product.name || 'สินค้า'}">` : `<div class="empty-image">ยังไม่มีรูปสินค้า</div>`}
              </div>
              <div class="admin-edit-panel hidden">
                <div class="admin-product-fields">
                  <div class="field-row">
                    <label>ชื่อสินค้า</label>
                    <input type="text" data-id="${product.id}" data-field="name" value="${product.name || ''}" placeholder="ชื่อสินค้า">
                  </div>
                  <div class="field-row">
                    <label>รายละเอียด</label>
                    <textarea data-id="${product.id}" data-field="desc" placeholder="คำอธิบายสินค้า">${product.desc || ''}</textarea>
                  </div>
                  <div class="field-row">
                    <label>ราคา</label>
                    <input type="number" data-id="${product.id}" data-field="price" step="1" min="0" value="${product.price || 0}">
                  </div>
                  <div class="field-row">
                    <label>หมวดหมู่</label>
                    <select data-id="${product.id}" data-field="category">
                      ${Object.keys(adminCategories).map((cat) => `
                        <option value="${cat}" ${product.category === cat ? 'selected' : ''}>${adminCategories[cat]}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="field-row">
                    <label>สถานะ</label>
                    <select data-id="${product.id}" data-field="available">
                      <option value="true" ${product.available ? 'selected' : ''}>พร้อมขาย</option>
                      <option value="false" ${!product.available ? 'selected' : ''}>ไม่พร้อมใช้งาน</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <label>ลิงก์รูปภาพ</label>
                    <input type="text" data-id="${product.id}" data-field="imageUrl" value="${product.image || ''}" placeholder="ใส่ URL รูปภาพ หรือเลือกไฟล์">
                  </div>
                  <div class="field-row file-row">
                    <label class="file-input-button">
                      <input class="admin-file-input" type="file" accept="image/*" data-id="${product.id}" data-field="image">
                      <span><i class="fas fa-image"></i> เลือกรูป</span>
                    </label>
                    <span class="file-note">รองรับ JPG/PNG/GIF/WEBP สูงสุด 5MB</span>
                  </div>
                </div>
              </div>
              <div class="admin-product-card-footer">
                <button type="button" class="button button-primary admin-save-product" data-id="${product.id}">บันทึก</button>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderPromotionTable(promotions) {
  if (!promotionTable) return;
  promotions = (Array.isArray(promotions) ? promotions : []).filter((promo) => !isMoviePromotionRecord(promo));
  if (!promotions || !promotions.length) {
    promotionTable.innerHTML = '<div class="empty-state">ยังไม่มีโปรโมชั่นให้จัดการ</div>';
    return;
  }

  promotionTable.innerHTML = `
    <div class="admin-product-grid">
      ${promotions.map((promo) => {
        const startDateValue = formatDateForDateInput(promo.startAt);
        const endDateValue = formatDateForDateInput(promo.endAt);
        return `
        <article class="admin-product-card" data-id="${promo.id}">
          <div class="admin-product-card-header">
            <div>
              <strong>${promo.title || 'โปรโมชั่นใหม่'}</strong>
              <div class="admin-card-meta">
                <span>${promo.description || 'รายละเอียดโปรโมชั่น'}</span>
                <span class="admin-status-badge ${getPromotionStatusClass(promo)}">${getPromotionStatus(promo)}</span>
              </div>
            </div>
            <div class="admin-product-card-actions">
              <button type="button" class="button button-outline admin-toggle-promotion-edit" data-id="${promo.id}">แก้ไข</button>
              <button type="button" class="button button-secondary admin-delete-promotion" data-id="${promo.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
          <div class="admin-product-preview">
            ${promo.image ? `<img src="${normalizeReviewImageUrl(promo.image)}" alt="${promo.title || 'โปรโมชั่น'}">` : `<div class="empty-image">ยังไม่มีรูปโปรโมชั่น</div>`}
          </div>
          <div class="admin-edit-panel hidden">
            <div class="admin-product-fields">
              <div class="field-row">
                <label>หัวข้อโปรโมชั่น</label>
                <input type="text" data-id="${promo.id}" data-field="title" value="${promo.title || ''}" placeholder="เช่น ลด 10% ทุกสินค้า">
              </div>
              <div class="field-row">
                <label>คำอธิบาย</label>
                <textarea data-id="${promo.id}" data-field="description" placeholder="รายละเอียดโปรโมชั่น">${promo.description || ''}</textarea>
              </div>
              <div class="field-row">
                <label>วันที่เริ่มโปรโมชั่น</label>
                <input type="date" data-id="${promo.id}" data-field="startAt" value="${startDateValue}">
              </div>
              <div class="field-row">
                <label>วันที่สิ้นสุดโปรโมชั่น</label>
                <input type="date" data-id="${promo.id}" data-field="endAt" value="${endDateValue}">
              </div>
              <div class="field-row field-note-row">
                <span class="field-note">เลือกวันที่เริ่มและวันที่สิ้นสุด เพื่อให้ระบบเก็บโปรโมชั่นได้ตรง</span>
              </div>
              <div class="field-row">
                <label>รูปประกอบ</label>
                <input type="text" data-id="${promo.id}" data-field="imageUrl" value="${promo.image || ''}" placeholder="ใส่ URL รูปหรือเลือกไฟล์">
              </div>
              <div class="field-row">
                <label>สถานะ</label>
                <select data-id="${promo.id}" data-field="enabled">
                  <option value="true" ${promo.enabled ? 'selected' : ''}>เปิดใช้งาน</option>
                  <option value="false" ${!promo.enabled ? 'selected' : ''}>ปิดใช้งาน</option>
                </select>
              </div>
              <div class="field-row file-row">
                <label class="file-input-button">
                  <input class="admin-file-input" type="file" accept="image/*" data-id="${promo.id}" data-field="image">
                  <span><i class="fas fa-image"></i> เลือกรูป</span>
                </label>
                <span class="file-note">รองรับ JPG/PNG/GIF/WEBP สูงสุด 5MB</span>
              </div>
            </div>
          </div>
          <div class="admin-product-card-footer">
            <button type="button" class="button button-primary admin-save-promotion" data-id="${promo.id}">บันทึก</button>
          </div>
        </article>
      `}).join('')}
    </div>
  `;
}

function getDiscountLiveStatus(discount) {
  if (!discount.enabled) return { label: 'ปิดใช้งาน', cls: 'status-error' };
  const now = new Date();
  const start = parsePromotionDate(discount.startAt);
  const end = parsePromotionDate(discount.endAt);
  if (start) start.setHours(0,0,0,0);
  if (end) end.setHours(23,59,59,999);
  if (start && start > now) return { label: 'รอเริ่ม', cls: 'status-loading' };
  if (end && end < now) return { label: 'หมดอายุ', cls: 'status-error' };
  return { label: 'ใช้งานได้', cls: 'status-success' };
}

function renderDiscountTable(discounts) {
  if (!discountTable) return;
  if (!Array.isArray(discounts) || discounts.length === 0) {
    discountTable.innerHTML = `<div class="admin-empty-state"><i class="fas fa-tags"></i><strong>ยังไม่มีโค้ดส่วนลด</strong><span>กด “สร้างโค้ด” เพื่อเพิ่มโค้ดได้เรื่อย ๆ โดยไม่จำกัดจำนวนโค้ด</span></div>`;
    return;
  }
  discountTable.innerHTML = `<div class="admin-discount-grid">${discounts.map(discount => {
    const status = getDiscountLiveStatus(discount);
    const valueText = discount.type === 'fixed' ? `฿${Number(discount.value)||0}` : `${Number(discount.value)||0}%`;
    const usedPeople = Array.isArray(discount.usedClients) ? new Set(discount.usedClients.map(String)).size : 0;
    const maxPeople = Math.max(0, Number(discount.maxPeople) || 0);
    const perPerson = Math.max(0, discount.maxUsesPerPerson === undefined || discount.maxUsesPerPerson === null || discount.maxUsesPerPerson === '' ? 1 : Number(discount.maxUsesPerPerson));
    const usedCount = Math.max(0, Number(discount.usedCount) || 0);
    return `<article class="admin-discount-card" data-id="${discount.id}">
      <div class="admin-discount-card-head">
        <div class="discount-code-preview"><i class="fas fa-ticket"></i><div><small>CODE</small><strong>${discount.code || 'NEWCODE'}</strong></div></div>
        <span class="status-badge ${status.cls}">${status.label}</span>
      </div>
      <div class="admin-discount-value"><span>ส่วนลด</span><b>${valueText}</b><small>${discount.type === 'fixed' ? 'ลดเป็นจำนวนเงินบาท' : 'ลดเป็นเปอร์เซ็นต์'}</small></div>
      <div class="admin-discount-usage-summary">
        <div><span>ใช้แล้ว</span><b>${usedCount} ครั้ง</b></div>
        <div><span>ลูกค้าที่ใช้</span><b>${usedPeople}${maxPeople ? ` / ${maxPeople}` : ' / ∞'} คน</b></div>
        <div><span>ต่อคน</span><b>${perPerson ? `${perPerson} ครั้ง` : 'ไม่จำกัด'}</b></div>
      </div>
      <div class="admin-form-grid admin-discount-form-grid">
        <label class="admin-field"><span>โค้ดส่วนลด</span><input data-field="code" value="${discount.code || ''}" placeholder="JOKEMOO10" maxlength="40"></label>
        <label class="admin-field"><span>รูปแบบส่วนลด</span><select data-field="type"><option value="percent" ${discount.type !== 'fixed' ? 'selected' : ''}>ลดเป็น %</option><option value="fixed" ${discount.type === 'fixed' ? 'selected' : ''}>ลดเป็นจำนวนเงิน</option></select></label>
        <label class="admin-field"><span>มูลค่าส่วนลด</span><input data-field="value" type="number" min="0" step="1" value="${Number(discount.value)||0}"></label>
        <label class="admin-field"><span>ยอดขั้นต่ำ</span><input data-field="minSpend" type="number" min="0" step="1" value="${Number(discount.minSpend)||0}"></label>
        <label class="admin-field"><span>จำนวนลูกค้าสูงสุด</span><input data-field="maxPeople" type="number" min="0" step="1" value="${maxPeople}" placeholder="0 = ไม่จำกัด"><small>ใส่ 0 หากไม่จำกัดจำนวนลูกค้า</small></label>
        <label class="admin-field"><span>ใช้ได้กี่ครั้ง / ลูกค้า</span><input data-field="maxUsesPerPerson" type="number" min="0" step="1" value="${perPerson}" placeholder="1"><small>นับตอนกดยืนยันชำระเงิน • 0 = ไม่จำกัด</small></label>
        <label class="admin-field"><span>เริ่มใช้</span><input data-field="startAt" type="date" value="${formatDateForDateInput(discount.startAt)}"></label>
        <label class="admin-field"><span>หมดอายุ</span><input data-field="endAt" type="date" value="${formatDateForDateInput(discount.endAt)}"></label>
        <label class="admin-field"><span>สถานะ</span><select data-field="enabled"><option value="true" ${discount.enabled ? 'selected' : ''}>เปิดใช้งาน</option><option value="false" ${!discount.enabled ? 'selected' : ''}>ปิดใช้งาน</option></select></label>
      </div>
      <div class="admin-discount-actions"><button class="button button-primary admin-save-discount" data-id="${discount.id}" type="button"><i class="fas fa-floppy-disk"></i> บันทึกโค้ด</button><button class="button button-outline admin-reset-discount" data-id="${discount.id}" type="button"><i class="fas fa-arrow-rotate-left"></i> รีเซ็ตจำนวนใช้</button><button class="button button-danger admin-delete-discount" data-id="${discount.id}" type="button"><i class="fas fa-trash"></i> ลบ</button></div>
    </article>`;
  }).join('')}</div>`;
}

function renderReviewTable(reviews, searchQuery = '') {
  if (!reviewTable) return;
  const query = (searchQuery || adminState.reviewSearchQuery || '').trim().toLowerCase();
  const filteredReviews = query
    ? reviews.filter((review) => {
        const text = [review.name, review.date, review.comment].filter(Boolean).join(' ').toLowerCase();
        return text.includes(query);
      })
    : reviews;

  if (!filteredReviews.length) {
    const message = query
      ? 'ไม่พบรีวิวที่ตรงกับการค้นหา'
      : 'ยังไม่มีรีวิวให้แก้ไข';
    reviewTable.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / ADMIN_REVIEWS_PER_PAGE));
  adminState.reviewPageIndex = Math.max(0, Math.min(totalPages - 1, adminState.reviewPageIndex));
  const startIndex = adminState.reviewPageIndex * ADMIN_REVIEWS_PER_PAGE;
  const pageReviews = filteredReviews.slice(startIndex, startIndex + ADMIN_REVIEWS_PER_PAGE);

  reviewTable.innerHTML = `
    <div class="admin-review-actions-bar">
      <div class="review-selection-summary">
        <span>เลือกแล้ว ${adminState.reviewSelectionIds.size} รายการ</span>
      </div>
      <button type="button" class="button button-secondary admin-delete-selected" ${adminState.reviewSelectionIds.size === 0 ? 'disabled' : ''}>
        <i class="fas fa-trash-alt"></i> ลบรีวิวที่เลือก
      </button>
    </div>
    <div class="admin-review-grid">
      ${pageReviews.map((review, index) => `
        <article class="admin-review-card" data-id="${review.id}">
          <div class="admin-review-card-header">
            <div class="review-card-left">
              <label class="review-card-checkbox">
                <input type="checkbox" class="review-delete-checkbox" data-id="${review.id}" ${adminState.reviewSelectionIds.has(String(review.id)) ? 'checked' : ''}>
                <span>เลือก</span>
              </label>
              <div class="review-card-title">
                <span class="review-index">#${startIndex + index + 1}</span>
                <span class="review-status-chip">${review.rating} ดาว</span>
                ${review.synced === false ? '<span class="review-local-badge">ยังไม่ซิงก์</span>' : ''}
              </div>
              <div class="review-card-info">
                <strong>${review.name || 'ไม่ระบุชื่อ'}</strong>
                <p class="review-card-comment summary">${review.comment || 'ไม่มีข้อความรีวิว'}</p>
              </div>
            </div>
            <div class="review-meta-actions">
              <span class="review-meta-label">${review.date || 'ยังไม่ระบุวันที่'}</span>
              <div class="review-card-actions">
                <button type="button" class="button button-outline admin-toggle-review-edit" data-id="${review.id}">แก้ไข</button>
                <button type="button" class="button button-secondary admin-delete-review" data-id="${review.id}"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
          </div>

          <div class="admin-review-image-preview">
            ${review.imageUrl ? `<img src="${normalizeReviewImageUrl(review.imageUrl)}" alt="รูปรีวิว ${review.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;empty-image&quot;>ไม่สามารถโหลดรูปได้</div>'">` : `<div class="empty-image">ยังไม่มีรูปรีวิว</div>`}
          </div>

          <div class="review-edit-panel hidden">
            <div class="admin-review-fields">
              <div class="field-row">
                <label>ชื่อ</label>
                <input type="text" data-id="${review.id}" data-field="name" value="${review.name}">
              </div>
              <div class="field-row">
                <label>วันที่ / เวลา</label>
                <input type="text" data-id="${review.id}" data-field="date" value="${review.date}" placeholder="2026-04-29 16:30">
              </div>
              <div class="field-row">
                <label>คะแนน</label>
                <select data-id="${review.id}" data-field="rating">
                  ${[5,4,3,2,1].map((value) => `<option value="${value}" ${review.rating === value ? 'selected' : ''}>${value} ดาว</option>`).join('')}
                </select>
              </div>
              <div class="field-row">
                <label>ความคิดเห็น</label>
                <textarea data-id="${review.id}" data-field="comment">${review.comment}</textarea>
              </div>
              <div class="field-row file-row">
                <label>อัปโหลดรูปใหม่</label>
                <label class="file-input-button">
                  <input class="admin-file-input" type="file" accept="image/*" data-id="${review.id}" data-field="image">
                  <span><i class="fas fa-image"></i> เลือกรูป</span>
                </label>
                <span class="file-note">JPG/PNG สูงสุด 1MB</span>
              </div>
            </div>

            <div class="admin-review-card-footer">
              <button class="button button-primary admin-save-review" data-id="${review.id}">บันทึก</button>
              <button class="button button-secondary admin-toggle-review-edit" data-id="${review.id}">ยกเลิก</button>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
    <div class="review-nav admin-review-pagination">
      <button type="button" class="carousel-btn admin-review-prev ${totalPages <= 1 ? 'hidden' : ''}" data-action="prev">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="review-page-buttons">
        ${Array.from({ length: totalPages }, (_, i) => `
          <button type="button" class="button button-outline admin-review-page-button ${adminState.reviewPageIndex === i ? 'active' : ''}" data-action="page" data-page="${i}">${i + 1}</button>
        `).join('')}
      </div>
      <button type="button" class="carousel-btn admin-review-next ${totalPages <= 1 ? 'hidden' : ''}" data-action="next">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function attachAdminEvents() {
  if (refreshProductsBtn) refreshProductsBtn.addEventListener('click', loadAdminData);
  if (refreshReviewsBtn) refreshReviewsBtn.addEventListener('click', loadAdminData);
  if (refreshPromotionsBtn) refreshPromotionsBtn.addEventListener('click', loadAdminData);
  if (refreshMoviesBtn) refreshMoviesBtn.addEventListener('click', loadAdminData);
  if (refreshDiscountsBtn) refreshDiscountsBtn.addEventListener('click', loadAdminData);
  if (addProductBtn) addProductBtn.addEventListener('click', createNewProduct);
  if (addReviewBtn) addReviewBtn.addEventListener('click', createNewReview);
  if (addPromotionBtn) addPromotionBtn.addEventListener('click', createNewPromotion);
  if (addMovieBtn) addMovieBtn.addEventListener('click', createNewMovie);
  if (addDiscountBtn) addDiscountBtn.addEventListener('click', createNewDiscount);
  if (maintenanceToggleBtn) {
    maintenanceToggleBtn.addEventListener('click', async () => {
      const newMode = !adminState.maintenanceMode;
      try {
        updateApiStatus(newMode ? 'กำลังปิดปรับปรุง...' : 'กำลังเปิดระบบ...','loading');
        const result = await adminApiPost('adminToggleMaintenance', { enabled: newMode });
        adminState.maintenanceMode = !!(result && result.maintenanceMode);
        updateMaintenanceStatus();
        updateApiStatus('เปลี่ยนโหมดสำเร็จ', 'success');
        showAdminToast(newMode ? 'เว็บไซต์ปิดปรับปรุงแล้ว' : 'เปิดระบบเว็บไซต์เรียบร้อย', 'success');
      } catch (error) {
        showAdminToast(error.message, 'error');
        updateApiStatus('ไม่สามารถเปลี่ยนโหมดได้', 'error');
      }
    });
  }
  if (reviewSearchInput) {
    reviewSearchInput.addEventListener('input', (event) => {
      adminState.reviewSearchQuery = event.target.value || '';
      adminState.reviewPageIndex = 0;
      renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    });
  }

  if (adminSidebarToggle) adminSidebarToggle.addEventListener('click', () => document.body.classList.add('admin-sidebar-open'));
  if (adminSidebarClose) adminSidebarClose.addEventListener('click', () => document.body.classList.remove('admin-sidebar-open'));
  if (adminSidebarBackdrop) adminSidebarBackdrop.addEventListener('click', () => document.body.classList.remove('admin-sidebar-open'));

  const adminTabButtons = document.querySelectorAll('.admin-tab-button');
  adminTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      if (!targetId) return;

      adminTabButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      document.querySelectorAll('.admin-section').forEach((section) => {
        section.classList.toggle('hidden', section.id !== targetId);
      });
      if (adminCurrentTitle) {
        adminCurrentTitle.textContent = button.dataset.adminTitle || button.textContent.trim();
      }
      document.body.classList.remove('admin-sidebar-open');

      if (targetId === 'codeSection') {
        loadCodeManager(false);
      }
    });
  });

  if (movieTable) {
    movieTable.addEventListener('change', async (event) => {
      const fileInput = event.target.closest('.admin-movie-file');
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      const card = fileInput.closest('.admin-movie-card');
      if (!card) return;
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) { showAdminToast('รองรับ JPG, PNG, WEBP, GIF เท่านั้น', 'error'); fileInput.value=''; return; }
      if (file.size > 5 * 1024 * 1024) { showAdminToast('กรุณาเลือกรูปไม่เกิน 5MB', 'error'); fileInput.value=''; return; }
      try {
        const dataUrl = await resizeImageFile(file, 520, 780);
        card.dataset.pendingImage = dataUrl;
        const preview = card.querySelector('.admin-movie-poster');
        const badge = preview ? preview.querySelector('.admin-movie-type')?.outerHTML || '' : '';
        if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Preview poster">${badge}`;
        const urlInput = card.querySelector('[data-field="imageUrl"]');
        if (urlInput) urlInput.value = '';
        fileInput.value = '';
      } catch (error) { showAdminToast('อ่านรูปไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    });

    movieTable.addEventListener('click', async (event) => {
      const saveButton = event.target.closest('.admin-save-movie');
      const deleteButton = event.target.closest('.admin-delete-movie');
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!confirm('ต้องการลบหนังรายการนี้ใช่หรือไม่?')) return;
        const numericId = Number(id);
        if (Number.isFinite(numericId) && String(numericId) === String(id)) {
          try { await adminApiPost('adminDeletePromotion', { id: numericId }); }
          catch (error) { showAdminToast(error.message, 'error'); return; }
        }
        adminState.movies = adminState.movies.filter(m => String(m.id) !== String(id));
        renderMovieTable(adminState.movies); updateAdminStats(); showAdminToast('ลบรายการหนังแล้ว', 'success');
        return;
      }
      if (!saveButton) return;
      const card = saveButton.closest('.admin-movie-card');
      if (!card) return;
      const get = (field) => card.querySelector(`[data-field="${field}"]`);
      const movie = {
        id: saveButton.dataset.id,
        title: get('title')?.value.trim() || '',
        titleEn: get('titleEn')?.value.trim() || '',
        type: get('type')?.value === 'upcoming' ? 'upcoming' : 'top',
        rank: Number(get('rank')?.value) || 0,
        releaseDate: get('releaseDate')?.value || '',
        note: get('note')?.value.trim() || '',
        noteEn: get('noteEn')?.value.trim() || '',
        image: card.dataset.pendingImage || get('imageUrl')?.value.trim() || '',
        enabled: get('enabled')?.value !== 'false',
      };
      if (!movie.title) { showAdminToast('กรุณาใส่ชื่อหนัง', 'error'); return; }
      if (movie.type === 'upcoming' && !movie.releaseDate) { showAdminToast('หนังใกล้จะเข้าควรใส่วันที่กำหนดเข้า', 'error'); return; }
      const payload = movieToPromotionPayload(movie);
      setButtonLoading(saveButton, 'กำลังบันทึก...');
      try {
        const numericId = Number(movie.id);
        if (Number.isFinite(numericId) && String(numericId) === String(movie.id)) {
          payload.id = numericId;
          await adminApiPost('adminUpdatePromotion', payload);
        } else {
          await adminApiPost('adminCreatePromotion', payload);
        }
        card.dataset.pendingImage = '';
        showAdminToast('บันทึกหนังแนะนำเรียบร้อย', 'success');
        await loadAdminData();
      } catch (error) { showAdminToast(error.message, 'error'); }
      finally { clearButtonLoading(saveButton); }
    });
  }

  if (discountTable) {
    discountTable.addEventListener('click', async (event) => {
      const saveButton = event.target.closest('.admin-save-discount');
      const deleteButton = event.target.closest('.admin-delete-discount');
      const resetButton = event.target.closest('.admin-reset-discount');
      if (!saveButton && !deleteButton && !resetButton) return;
      const actionButton = saveButton || deleteButton || resetButton;
      const card = actionButton.closest('.admin-discount-card');
      if (!card) return;
      const id = actionButton.dataset.id;
      if (deleteButton) {
        if (!confirm('ต้องการลบโค้ดส่วนลดนี้ใช่หรือไม่?')) return;
        const numericId = Number(id);
        if (Number.isFinite(numericId) && String(numericId) === String(id)) {
          try { await adminApiPost('adminDeletePromotion', { id: numericId }); }
          catch (error) { showAdminToast(error.message, 'error'); return; }
        }
        adminState.discounts = adminState.discounts.filter(item => String(item.id) !== String(id));
        renderDiscountTable(adminState.discounts); updateAdminStats(); showAdminToast('ลบโค้ดส่วนลดแล้ว', 'success');
        return;
      }
      if (resetButton) {
        if (!confirm('รีเซ็ตจำนวนการใช้โค้ดนี้เป็น 0 ใช่หรือไม่?')) return;
        const current = adminState.discounts.find(item => String(item.id) === String(id));
        if (!current) return;
        const resetDiscount = { ...current, usedCount: 0, usedClients: [], clientUses: {} };
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || String(numericId) !== String(id)) {
          Object.assign(current, resetDiscount); renderDiscountTable(adminState.discounts); showAdminToast('รีเซ็ตโค้ดชั่วคราวแล้ว', 'success'); return;
        }
        const payload = discountToPromotionPayload(resetDiscount); payload.id = numericId;
        setButtonLoading(resetButton, 'กำลังรีเซ็ต...');
        try { await adminApiPost('adminUpdatePromotion', payload); showAdminToast('รีเซ็ตจำนวนการใช้เรียบร้อย', 'success'); await loadAdminData(); }
        catch (error) { showAdminToast(error.message, 'error'); }
        finally { clearButtonLoading(resetButton); }
        return;
      }
      const get = field => card.querySelector(`[data-field="${field}"]`);
      const discount = {
        id,
        code: String(get('code')?.value || '').trim().toUpperCase(),
        type: get('type')?.value === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(get('value')?.value) || 0),
        minSpend: Math.max(0, Number(get('minSpend')?.value) || 0),
        maxPeople: Math.max(0, Math.floor(Number(get('maxPeople')?.value) || 0)),
        maxUsesPerPerson: Math.max(0, Math.floor(Number(get('maxUsesPerPerson')?.value) || 0)),
        usedCount: Math.max(0, Number(adminState.discounts.find(item => String(item.id) === String(id))?.usedCount) || 0),
        usedClients: adminState.discounts.find(item => String(item.id) === String(id))?.usedClients || [],
        clientUses: adminState.discounts.find(item => String(item.id) === String(id))?.clientUses || {},
        startAt: get('startAt')?.value || '', endAt: get('endAt')?.value || '', enabled: get('enabled')?.value !== 'false'
      };
      if (!/^[A-Z0-9_-]{3,40}$/.test(discount.code)) { showAdminToast('โค้ดต้องมีอย่างน้อย 3 ตัว ใช้ A-Z, 0-9, - หรือ _', 'error'); return; }
      if (discount.type === 'percent' && discount.value > 100) { showAdminToast('ส่วนลดแบบ % ต้องไม่เกิน 100%', 'error'); return; }
      if (adminState.discounts.some(item => String(item.id) !== String(id) && String(item.code||'').toUpperCase() === discount.code)) { showAdminToast('มีโค้ดนี้อยู่แล้ว กรุณาใช้ชื่ออื่น', 'error'); return; }
      const payload = discountToPromotionPayload(discount);
      setButtonLoading(saveButton, 'กำลังบันทึก...');
      try {
        const numericId = Number(id);
        if (Number.isFinite(numericId) && String(numericId) === String(id)) { payload.id = numericId; await adminApiPost('adminUpdatePromotion', payload); }
        else await adminApiPost('adminCreatePromotion', payload);
        showAdminToast('บันทึกโค้ดส่วนลดเรียบร้อย', 'success'); await loadAdminData();
      } catch (error) { showAdminToast(error.message, 'error'); }
      finally { clearButtonLoading(saveButton); }
    });
  }

  if (productTable) {
    productTable.addEventListener('click', async (event) => {
      const saveButton = event.target.closest('.admin-save-product');
      const deleteButton = event.target.closest('.admin-delete-product');
      const uploadButton = event.target.closest('.file-input-button');
      const toggleEditButton = event.target.closest('.admin-toggle-product-edit');
      if (toggleEditButton) {
        const card = toggleEditButton.closest('.admin-product-card');
        if (!card) return;
        const editPanel = card.querySelector('.admin-edit-panel');
        if (!editPanel) return;
        const isOpen = !editPanel.classList.contains('hidden');
        if (!isOpen) {
          productTable.querySelectorAll('.admin-product-card.is-editing').forEach((otherCard) => {
            if (otherCard === card) return;
            otherCard.classList.remove('is-editing');
            otherCard.querySelector('.admin-edit-panel')?.classList.add('hidden');
            const otherToggle = otherCard.querySelector('.admin-toggle-product-edit');
            if (otherToggle) otherToggle.innerHTML = '<i class="fas fa-pen"></i> แก้ไข';
          });
        }
        editPanel.classList.toggle('hidden', isOpen);
        card.classList.toggle('is-editing', !isOpen);
        toggleEditButton.innerHTML = isOpen ? '<i class="fas fa-pen"></i> แก้ไข' : '<i class="fas fa-times"></i> ปิด';
        return;
      }

      if (saveButton) {
        const id = saveButton.dataset.id;
        const card = saveButton.closest('.admin-product-card');
        if (!card) return;
        const nameInput = card.querySelector('[data-field="name"]');
        const descTextarea = card.querySelector('[data-field="desc"]');
        const priceInput = card.querySelector('[data-field="price"]');
        const categorySelect = card.querySelector('[data-field="category"]');
        const availableSelect = card.querySelector('[data-field="available"]');
        const imageUrlInput = card.querySelector('[data-field="imageUrl"]');
        const fileInput = card.querySelector('[data-field="image"]');

        const payload = {
          name: nameInput ? String(nameInput.value).trim() : '',
          desc: descTextarea ? String(descTextarea.value).trim() : '',
          price: Number(priceInput ? priceInput.value : 0) || 0,
          category: categorySelect ? String(categorySelect.value) : 'other',
          available: availableSelect ? availableSelect.value === 'true' : true,
        };

        const imageValue = imageUrlInput ? String(imageUrlInput.value).trim() : '';
        setButtonLoading(saveButton, 'กำลังบันทึก...');
        try {
          if (card.dataset.pendingImage) {
            payload.image = card.dataset.pendingImage;
          } else if (fileInput && fileInput.files && fileInput.files[0]) {
            payload.image = await createReviewImageDataUrl(fileInput.files[0]);
          } else if (imageValue) {
            payload.image = imageValue;
          }

          let result;
          const numericId = Number(id);
          if (Number.isFinite(numericId) && !isNaN(numericId) && String(id) === String(numericId)) {
            payload.id = numericId;
            result = await adminApiPost('adminUpdateProduct', payload);
          } else {
            result = await adminApiPost('adminCreateProduct', payload);
          }

          showAdminToast('บันทึกสินค้าสำเร็จ', 'success');
          card.dataset.pendingImage = '';
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        } finally {
          clearButtonLoading(saveButton);
        }
        return;
      }

      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id || !confirm('คุณแน่ใจหรือไม่ว่าจะลบสินค้านี้?')) return;
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || isNaN(numericId) || String(id) !== String(numericId)) {
          adminState.products = adminState.products.filter((product) => String(product.id) !== String(id));
          renderProductTable(adminState.products);
          showAdminToast('ลบสินค้าชั่วคราวเรียบร้อย', 'success');
          return;
        }
        try {
          await adminApiPost('adminDeleteProduct', { id });
          adminState.products = adminState.products.filter((product) => String(product.id) !== String(id));
          renderProductTable(adminState.products);
          showAdminToast('ลบสินค้าสำเร็จ', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }

      if (uploadButton) {
        const id = uploadButton.querySelector('.admin-file-input')?.dataset.id;
        const hiddenInput = productTable.querySelector(`.admin-file-input[data-id="${id}"]`);
        if (hiddenInput) hiddenInput.click();
        return;
      }
    });

    productTable.addEventListener('change', async (event) => {
      const fileInput = event.target.closest('.admin-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const productCard = fileInput.closest('.admin-product-card');
      if (!productCard) return;
      const previewContainer = productCard.querySelector('.admin-product-preview');
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) {
        showAdminToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }
      try {
        const dataUrl = await createReviewImageDataUrl(file);
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Preview สินค้า">`;
        productCard.dataset.pendingImage = dataUrl;
        fileInput.value = '';
      } catch (error) {
        showAdminToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
        fileInput.value = '';
      }
    });
  }

  if (reviewTable) {
    reviewTable.addEventListener('click', async (event) => {
      const uploadButton = event.target.closest('.file-input-button');
      const saveButton = event.target.closest('.admin-save-review');
      const deleteButton = event.target.closest('.admin-delete-review');
      if (uploadButton) {
        const id = uploadButton.querySelector('.admin-file-input')?.dataset.id;
        const hiddenInput = reviewTable.querySelector(`.admin-file-input[data-id="${id}"]`);
        if (hiddenInput) hiddenInput.click();
        return;
      }
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบรีวิวนี้?')) return;
        try {
          await adminApiPost('adminDeleteReview', { id });
          adminState.reviews = adminState.reviews.filter((review) => String(review.id) !== String(id));
          adminState.reviewSelectionIds.delete(String(id));
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
          showAdminToast('ลบรีวิวเรียบร้อย', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }
      const toggleEditButton = event.target.closest('.admin-toggle-review-edit');
      if (toggleEditButton) {
        const reviewCard = toggleEditButton.closest('.admin-review-card');
        if (!reviewCard) return;
        const editPanel = reviewCard.querySelector('.review-edit-panel');
        if (!editPanel) return;
        const isOpen = !editPanel.classList.contains('hidden');
        if (!isOpen) {
          reviewTable.querySelectorAll('.admin-review-card.is-editing').forEach((otherCard) => {
            if (otherCard === reviewCard) return;
            otherCard.classList.remove('is-editing');
            otherCard.querySelector('.review-edit-panel')?.classList.add('hidden');
            otherCard.querySelectorAll('.admin-toggle-review-edit').forEach((btn) => { btn.textContent = 'แก้ไข'; });
          });
        }
        editPanel.classList.toggle('hidden', isOpen);
        reviewCard.classList.toggle('is-editing', !isOpen);
        const newLabel = isOpen ? 'แก้ไข' : 'ยกเลิก';
        reviewCard.querySelectorAll('.admin-toggle-review-edit').forEach((btn) => {
          if (btn.dataset.id === toggleEditButton.dataset.id) btn.textContent = newLabel;
        });
        return;
      }
      const pageButton = event.target.closest('.admin-review-page-button');
      if (pageButton) {
        const page = Number(pageButton.dataset.page);
        if (!Number.isNaN(page)) {
          adminState.reviewPageIndex = page;
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        }
        return;
      }
      const deleteSelectedButton = event.target.closest('.admin-delete-selected');
      if (deleteSelectedButton) {
        if (adminState.reviewSelectionIds.size === 0) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบรีวิวที่เลือก?')) return;
        const selectedIds = Array.from(adminState.reviewSelectionIds);
        try {
          for (const selectedId of selectedIds) {
            await adminApiPost('adminDeleteReview', { id: selectedId });
          }
          adminState.reviews = adminState.reviews.filter((review) => !adminState.reviewSelectionIds.has(String(review.id)));
          adminState.reviewSelectionIds.clear();
          adminState.reviewPageIndex = 0;
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
          showAdminToast('ลบรีวิวที่เลือกเรียบร้อย', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }
      const reviewPager = event.target.closest('.carousel-btn');
      if (reviewPager) {
        const action = reviewPager.dataset.action;
        if (action === 'prev') {
          adminState.reviewPageIndex = Math.max(0, adminState.reviewPageIndex - 1);
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        }
        if (action === 'next') {
          const filteredReviews = adminState.reviewSearchQuery
            ? adminState.reviews.filter((review) => {
                const text = [review.name, review.date, review.comment].filter(Boolean).join(' ').toLowerCase();
                return text.includes(adminState.reviewSearchQuery.trim().toLowerCase());
              })
            : adminState.reviews;
          const totalPages = Math.max(1, Math.ceil(filteredReviews.length / ADMIN_REVIEWS_PER_PAGE));
          adminState.reviewPageIndex = Math.min(totalPages - 1, adminState.reviewPageIndex + 1);
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        }
        return;
      }
      if (saveButton) {
        const id = saveButton.dataset.id;
        const reviewCard = saveButton.closest('.admin-review-card');
        if (!reviewCard) return;
        const nameInput = reviewCard.querySelector('[data-field="name"]');
        const dateInput = reviewCard.querySelector('[data-field="date"]');
        const ratingSelect = reviewCard.querySelector('[data-field="rating"]');
        const commentTextarea = reviewCard.querySelector('[data-field="comment"]');
        const imageFileInput = reviewCard.querySelector('[data-field="image"]');
        const payloadId = Number(id) || Date.now();
        const payload = {
          id: payloadId,
          name: nameInput.value.trim(),
          date: dateInput.value.trim(),
          rating: Number(ratingSelect.value),
          comment: commentTextarea.value.trim()
        };
        setButtonLoading(saveButton, 'กำลังบันทึก...');
        try {
          if (reviewCard.dataset.pendingImage) {
            payload.imageUrl = reviewCard.dataset.pendingImage;
          } else if (imageFileInput && imageFileInput.files && imageFileInput.files[0]) {
            payload.imageUrl = await createReviewImageDataUrl(imageFileInput.files[0]);
          }

          const result = await adminApiPost('adminEditReview', payload);
          showAdminToast('อัปเดตรีวิวสำเร็จ', 'success');
          const savedReview = result && result.id ? result : null;
          const targetId = Number(id);
          let review = adminState.reviews.find((item) => Number(item.id) === targetId);
          if (review) {
            review.name = payload.name;
            review.rating = payload.rating;
            review.comment = payload.comment;
            review.date = payload.date;
            if (savedReview && savedReview.imageUrl) {
              review.imageUrl = savedReview.imageUrl;
            } else if (payload.imageUrl !== undefined) {
              review.imageUrl = payload.imageUrl;
            }
          } else {
            review = {
              id: Number(result && result.id) || targetId || Date.now(),
              name: payload.name,
              rating: payload.rating,
              comment: payload.comment,
              date: payload.date,
              imageUrl: payload.imageUrl || (savedReview && savedReview.imageUrl) || ''
            };
            adminState.reviews.unshift(review);
          }
          adminState.reviewPageIndex = 0;
          reviewCard.dataset.pendingImage = '';
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        } finally {
          clearButtonLoading(saveButton);
        }
        return;
      }
    });

        reviewTable.addEventListener('change', async (event) => {
      const checkbox = event.target.closest('.review-delete-checkbox');
      if (checkbox) {
        const id = checkbox.dataset.id;
        if (!id) return;
        if (checkbox.checked) {
          adminState.reviewSelectionIds.add(String(id));
        } else {
          adminState.reviewSelectionIds.delete(String(id));
        }
        renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        return;
      }
      const fileInput = event.target.closest('.admin-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const reviewCard = fileInput.closest('.admin-review-card');
      if (!reviewCard) return;
      const previewContainer = reviewCard.querySelector('.admin-review-image-preview');
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) {
        showAdminToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }
      try {
        const dataUrl = await createReviewImageDataUrl(file);
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Preview รีวิว">`;
        reviewCard.dataset.pendingImage = dataUrl;
        fileInput.value = '';
      } catch (error) {
        showAdminToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
        fileInput.value = '';
      }
    });
  }

  if (promotionTable) {
    promotionTable.addEventListener('click', async (event) => {
      const uploadButton = event.target.closest('.file-input-button');
      const saveButton = event.target.closest('.admin-save-promotion');
      const deleteButton = event.target.closest('.admin-delete-promotion');
      if (uploadButton) {
        const id = uploadButton.querySelector('.admin-file-input')?.dataset.id;
        const hiddenInput = promotionTable.querySelector(`.admin-file-input[data-id="${id}"]`);
        if (hiddenInput) hiddenInput.click();
        return;
      }
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบโปรโมชั่นนี้?')) return;
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || isNaN(numericId) || String(id) !== String(numericId)) {
          adminState.promotions = adminState.promotions.filter((promo) => String(promo.id) !== String(id));
          renderPromotionTable(adminState.promotions);
          showAdminToast('ลบโปรโมชั่นชั่วคราวเรียบร้อย', 'success');
          return;
        }
        try {
          await adminApiPost('adminDeletePromotion', { id });
          adminState.promotions = adminState.promotions.filter((promo) => String(promo.id) !== String(id));
          renderPromotionTable(adminState.promotions);
          showAdminToast('ลบโปรโมชั่นเรียบร้อย', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }
      const toggleEditButton = event.target.closest('.admin-toggle-promotion-edit');
      if (toggleEditButton) {
        const card = toggleEditButton.closest('.admin-product-card');
        if (!card) return;
        const editPanel = card.querySelector('.admin-edit-panel');
        if (!editPanel) return;
        const isOpen = !editPanel.classList.contains('hidden');
        if (!isOpen) {
          promotionTable.querySelectorAll('.admin-product-card.is-editing').forEach((otherCard) => {
            if (otherCard === card) return;
            otherCard.classList.remove('is-editing');
            otherCard.querySelector('.admin-edit-panel')?.classList.add('hidden');
            const otherToggle = otherCard.querySelector('.admin-toggle-promotion-edit');
            if (otherToggle) otherToggle.innerHTML = '<i class="fas fa-pen"></i> แก้ไข';
          });
        }
        editPanel.classList.toggle('hidden', isOpen);
        card.classList.toggle('is-editing', !isOpen);
        toggleEditButton.innerHTML = isOpen ? '<i class="fas fa-pen"></i> แก้ไข' : '<i class="fas fa-times"></i> ปิด';
        return;
      }

      if (saveButton) {
        const id = saveButton.dataset.id;
        const card = saveButton.closest('.admin-product-card');
        if (!card) return;
        const titleInput = card.querySelector('[data-field="title"]');
        const descTextarea = card.querySelector('[data-field="description"]');
        const startDateInput = card.querySelector('[data-field="startAt"]');
        const endDateInput = card.querySelector('[data-field="endAt"]');
        const imageUrlInput = card.querySelector('[data-field="imageUrl"]');
        const enabledSelect = card.querySelector('[data-field="enabled"]');
        const fileInput = card.querySelector('[data-field="image"]');

        const payload = {
          title: titleInput ? String(titleInput.value).trim() : '',
          description: descTextarea ? String(descTextarea.value).trim() : '',
          startAt: startDateInput ? String(startDateInput.value).trim() : '',
          endAt: endDateInput ? String(endDateInput.value).trim() : '',
          enabled: enabledSelect ? enabledSelect.value === 'true' : false,
        };

        const imageValue = imageUrlInput ? String(imageUrlInput.value).trim() : '';
        setButtonLoading(saveButton, 'กำลังบันทึก...');
        try {
          if (card.dataset.pendingImage) {
            payload.image = card.dataset.pendingImage;
          } else if (fileInput && fileInput.files && fileInput.files[0]) {
            payload.image = await createReviewImageDataUrl(fileInput.files[0]);
          } else if (imageValue) {
            payload.image = imageValue;
          }

          let result;
          const numericId = Number(id);
          if (Number.isFinite(numericId) && !isNaN(numericId) && String(id) === String(numericId)) {
            payload.id = numericId;
            result = await adminApiPost('adminUpdatePromotion', payload);
          } else {
            result = await adminApiPost('adminCreatePromotion', payload);
          }

          showAdminToast('บันทึกโปรโมชั่นสำเร็จ', 'success');
          card.dataset.pendingImage = '';
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        } finally {
          clearButtonLoading(saveButton);
        }
        return;
      }
    });

    promotionTable.addEventListener('change', async (event) => {
      const fileInput = event.target.closest('.admin-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const promoCard = fileInput.closest('.admin-product-card');
      if (!promoCard) return;
      const previewContainer = promoCard.querySelector('.admin-product-preview');
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) {
        showAdminToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }
      try {
        const dataUrl = await createReviewImageDataUrl(file);
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Preview โปรโมชั่น">`;
        promoCard.dataset.pendingImage = dataUrl;
        fileInput.value = '';
      } catch (error) {
        showAdminToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
        fileInput.value = '';
      }
    });
  }
}

async function loadAdminData() {
  try {
    updateApiStatus('กำลังโหลดข้อมูลจาก API...', 'loading');
    const result = await adminApiFetch('adminData');
    const products = result.products || [];
    const reviews = result.reviews || [];
    const promotions = result.promotions || [];
    adminState.products = products;
    adminState.reviews = reviews;
    splitPromotionsAndMovies(promotions);
    adminState.maintenanceMode = !!result.maintenanceMode;
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
    renderMovieTable(adminState.movies);
    renderDiscountTable(adminState.discounts);
    renderWebSettingsEditor();
    renderOrdersDashboard();
    renderAdminUsers();
    updateAdminStats();
    updateMaintenanceStatus();
    updateApiStatus('โหลดข้อมูลเรียบร้อย', 'success');
    return;
  } catch (error) {
    console.error('adminData failed:', error);
  }

  try {
    updateApiStatus('กำลังโหลดข้อมูลสำรอง...', 'loading');
    const products = await adminApiFetch('products');
    const reviews = await adminApiFetch('reviews');
    adminState.products = products || [];
    adminState.reviews = reviews || [];
    adminState.maintenanceMode = false;
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
    renderMovieTable(adminState.movies);
    renderDiscountTable(adminState.discounts);
    renderWebSettingsEditor();
    renderOrdersDashboard();
    renderAdminUsers();
    updateAdminStats();
    updateMaintenanceStatus();
    updateApiStatus('โหลดข้อมูลสำรองเรียบร้อย', 'success');
  } catch (fallbackError) {
    showAdminToast(fallbackError.message, 'error');
    updateApiStatus('ไม่สามารถเชื่อมต่อ API ได้', 'error');
  }
}

function initializeAdmin() {
  attachAdminEvents();
  attachV9AdminEvents();
  attachAdminAuthEvents();
  initializeAdminAuth();
}




/* ==========================================================================
   JOKEMOO Admin V9 — website settings + orders/sales history
   Hidden records reuse the existing Promotions API so no extra backend endpoint
   is required. They are filtered out of the storefront promotions page.
   ========================================================================== */

adminState.orders = Array.isArray(adminState.orders) ? adminState.orders : [];
adminState.webSettings = adminState.webSettings || null;
adminState.orderSearch = '';
adminState.orderPeriod = 'all';

function isOrderPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(ORDER_PROMO_PREFIX));
}
function isSettingsPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(SETTINGS_PROMO_PREFIX));
}
function parseOrderPromotionRecord(promo) {
  if (!isOrderPromotionRecord(promo)) return null;
  try {
    const meta = JSON.parse(String(promo.description || '{}'));
    const fallback = String(promo.title || '').slice(ORDER_PROMO_PREFIX.length).replace(/^\|/,'').trim();
    return { ...meta, orderNo: meta.orderNo || fallback, _recordId: promo.id };
  } catch (_) { return null; }
}
function getDefaultAdminWheelRates() {
    return [
        { id: 'netflix7', label: 'Netflix 7 Day', rate: 0 },
        { id: 'netflix1', label: 'Netflix 1 Day', rate: 5.45 },
        { id: 'netflix3', label: 'Netflix 3 Day', rate: 1.82 },
        { id: 'discount10', label: 'ส่วนลด 10%', rate: 1.82 },
        { id: 'discount5', label: 'ส่วนลด 5%', rate: 5.45 },
        { id: 'discount20', label: 'ส่วนลด 20%', rate: 0 },
        { id: 'miss', label: 'MISS', rate: 85.46 },
    ];
}
function normalizeAdminWebSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const rates = Array.isArray(raw.wheelRates) && raw.wheelRates.length ? raw.wheelRates : getDefaultAdminWheelRates();
  const fallbackPayment = (window.JokeMooConfig && window.JokeMooConfig.payment) || {};
  const payment = raw.payment && typeof raw.payment === 'object' ? raw.payment : {};
  const contacts = raw.contacts && typeof raw.contacts === 'object' ? raw.contacts : {};
  return {
    ...raw,
    lineUrl: String(raw.lineUrl || 'https://line.me/R/ti/p/%40106zyrpm').trim(),
    contacts: {
      pageUrl: String(contacts.pageUrl || raw.pageUrl || '').trim(),
      ownerUrl: String(contacts.ownerUrl || raw.ownerUrl || '').trim(),
    },
    payment: {
      bankName: String(payment.bankName || fallbackPayment.bankName || '').trim(),
      accountName: String(payment.accountName || fallbackPayment.accountName || '').trim(),
      accountNumber: String(payment.accountNumber || fallbackPayment.accountNumber || '').trim(),
      qrImage: String(payment.qrImage || fallbackPayment.qrImage || '').trim(),
    },
    wheelRates: rates.map((item,index)=>({
      id:String(item.id || `prize-${index+1}`), label:String(item.label || `รางวัล ${index+1}`), rate:Math.max(0,Number(item.rate)||0)
    }))
  };
}
function parseWebSettingsPromotionRecord(promo) {
  if (!isSettingsPromotionRecord(promo)) return null;
  try { return normalizeAdminWebSettings({ ...JSON.parse(String(promo.description || '{}')), _recordId: promo.id }); }
  catch (_) { return normalizeAdminWebSettings({ _recordId: promo.id }); }
}
function escapeAdminHtml(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function adminMoney(value) {
  const n = Number(value)||0;
  return `฿${n.toLocaleString('th-TH',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2})}`;
}
function adminDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function localDateKey(value) {
  const d = new Date(value); if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localMonthKey(value) {
  const d = new Date(value); if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function renderWebSettingsEditor() {
  const wrap = document.getElementById('wheelRatesEditor'); if (!wrap) return;
  const settings = normalizeAdminWebSettings(adminState.webSettings);
  adminState.webSettings = settings;
  const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  setValue('webLineUrl', settings.lineUrl);
  setValue('webPageUrl', settings.contacts?.pageUrl || '');
  setValue('webOwnerUrl', settings.contacts?.ownerUrl || '');
  setValue('webBankName', settings.payment.bankName);
  setValue('webAccountName', settings.payment.accountName);
  setValue('webAccountNumber', settings.payment.accountNumber);
  setValue('webQrImageUrl', /^data:/i.test(settings.payment.qrImage) ? '' : settings.payment.qrImage);
  renderWebQrPreview(settings.payment.qrImage);
  wrap.innerHTML = `<div class="wheel-rate-list">${settings.wheelRates.map((item,index)=>`
    <div class="wheel-rate-row" data-rate-index="${index}">
      <span class="wheel-rate-number">${index+1}</span>
      <label><span>ชื่อรางวัล</span><input type="text" data-wheel-field="label" value="${escapeAdminHtml(item.label)}" placeholder="ชื่อรางวัล"></label>
      <label class="wheel-rate-input"><span>น้ำหนัก</span><input type="number" min="0" step="0.1" data-wheel-field="rate" value="${Number(item.rate)||0}"></label>
      <div class="wheel-rate-share"><strong class="wheel-rate-chance">0%</strong><div class="wheel-rate-meter"><span></span></div></div>
      <button class="wheel-rate-remove" type="button" title="ลบรางวัล"><i class="fas fa-trash"></i></button>
    </div>`).join('')}</div>
    <button id="addWheelRateRow" type="button" class="button button-outline wheel-rate-add"><i class="fas fa-plus"></i> เพิ่มรางวัล</button>`;
  updateWheelRateSummary();
}
function collectWheelRatesFromEditor() {
  return Array.from(document.querySelectorAll('#wheelRatesEditor .wheel-rate-row')).map((row,index)=>({
    id: adminState.webSettings?.wheelRates?.[index]?.id || `prize-${Date.now()}-${index}`,
    label: String(row.querySelector('[data-wheel-field="label"]')?.value || `รางวัล ${index+1}`).trim(),
    rate: Math.max(0,Number(row.querySelector('[data-wheel-field="rate"]')?.value)||0),
  }));
}
function updateWheelRateSummary() {
  const rates = document.querySelector('#wheelRatesEditor') ? collectWheelRatesFromEditor() : (adminState.webSettings?.wheelRates || []);
  const total = Math.round(rates.reduce((sum,item)=>sum+(Number(item.rate)||0),0)*100)/100;
  const countEl=document.getElementById('wheelPrizeCount'), totalEl=document.getElementById('wheelRateTotal'), statusEl=document.getElementById('wheelRateStatus');
  if(countEl) countEl.textContent=rates.length;
  if(totalEl) totalEl.textContent=String(total);
  if(statusEl){ statusEl.textContent=total>0?'คำนวณอัตโนมัติ':'ใส่น้ำหนักก่อน'; statusEl.className=total>0?'rate-ok':'rate-warn'; }
  document.querySelectorAll('#wheelRatesEditor .wheel-rate-row').forEach((row,index)=>{
    const weight=Math.max(0,Number(row.querySelector('[data-wheel-field="rate"]')?.value)||0);
    const chance=total>0?(weight/total*100):0;
    const meter=row.querySelector('.wheel-rate-meter span');
    const chanceEl=row.querySelector('.wheel-rate-chance');
    if(meter) meter.style.width=`${Math.min(100,chance)}%`;
    if(chanceEl) chanceEl.textContent=`${chance.toFixed(chance>=10?1:2)}%`;
  });
  return total;
}
function collectStoreSettingsFromEditor() {
  const current = normalizeAdminWebSettings(adminState.webSettings);
  const lineUrl = String(document.getElementById('webLineUrl')?.value || current.lineUrl || '').trim();
  const typedQr = String(document.getElementById('webQrImageUrl')?.value || '').trim();
  return {
    lineUrl,
    contacts: {
      pageUrl: String(document.getElementById('webPageUrl')?.value || '').trim(),
      ownerUrl: String(document.getElementById('webOwnerUrl')?.value || '').trim(),
    },
    payment: {
      bankName: String(document.getElementById('webBankName')?.value || '').trim(),
      accountName: String(document.getElementById('webAccountName')?.value || '').trim(),
      accountNumber: String(document.getElementById('webAccountNumber')?.value || '').trim(),
      qrImage: typedQr || String(current.payment?.qrImage || '').trim(),
    }
  };
}
function renderWebQrPreview(src) {
  const preview = document.getElementById('webQrPreview');
  if (!preview) return;
  const image = String(src || '').trim();
  preview.innerHTML = image ? `<img src="${escapeAdminHtml(image)}" alt="QR ชำระเงิน"><span>รูป QR ปัจจุบัน</span>` : '<i class="fas fa-qrcode"></i><span>ยังไม่มีรูป QR</span>';
}
async function saveWebSettings() {
  const btn=document.getElementById('saveWebSettingsBtn'); const rates=collectWheelRatesFromEditor(); const total=updateWheelRateSummary();
  if(!rates.length){ showAdminToast('กรุณาเพิ่มรางวัลอย่างน้อย 1 รายการ','error'); return; }
  if(total<=0){ showAdminToast('กรุณาใส่น้ำหนักอย่างน้อย 1 รางวัลให้มากกว่า 0','error'); return; }
  const storeSettings=collectStoreSettingsFromEditor();
  if(storeSettings.lineUrl && !/^https?:\/\//i.test(storeSettings.lineUrl)){ showAdminToast('ลิงก์ LINE ต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  if(storeSettings.contacts?.pageUrl && !/^https?:\/\//i.test(storeSettings.contacts.pageUrl)){ showAdminToast('ลิงก์เพจร้านต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  if(storeSettings.contacts?.ownerUrl && !/^https?:\/\//i.test(storeSettings.contacts.ownerUrl)){ showAdminToast('ลิงก์เจ้าของร้านต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  const settings={ ...storeSettings, wheelRates:rates, updatedAt:new Date().toISOString() };
  const payload={ title:`${SETTINGS_PROMO_PREFIX}|main`, description:JSON.stringify(settings), startAt:'', endAt:'', image:'', enabled:false };
  setButtonLoading(btn,'กำลังบันทึก...');
  try {
    const currentId=Number(adminState.webSettings?._recordId);
    if(Number.isFinite(currentId)){ payload.id=currentId; await adminApiPost('adminUpdatePromotion',payload); }
    else await adminApiPost('adminCreatePromotion',payload);
    showAdminToast('บันทึกช่องทางติดต่อ การชำระเงิน และน้ำหนักวงล้อเรียบร้อย','success'); await loadAdminData();
  } catch(error){ showAdminToast(error.message,'error'); } finally { clearButtonLoading(btn); }
}
function getFilteredOrders() {
  let list=(adminState.orders||[]).slice(); const q=String(adminState.orderSearch||'').trim().toLowerCase();
  if(q) list=list.filter(o=>[o.orderNo,o.discount?.code,...(o.items||[]).map(i=>i.name)].filter(Boolean).join(' ').toLowerCase().includes(q));
  const period=adminState.orderPeriod||'all', now=new Date(), today=localDateKey(now), month=localMonthKey(now), lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1), lastMonth=localMonthKey(lastMonthDate);
  const customDate=document.getElementById('orderCustomDate')?.value||'', customMonth=document.getElementById('orderCustomMonth')?.value||'';
  if(period==='today') list=list.filter(o=>localDateKey(o.createdAt)===today);
  else if(period==='thisMonth') list=list.filter(o=>localMonthKey(o.createdAt)===month);
  else if(period==='lastMonth') list=list.filter(o=>localMonthKey(o.createdAt)===lastMonth);
  else if(period==='customDate'&&customDate) list=list.filter(o=>localDateKey(o.createdAt)===customDate);
  else if(period==='customMonth'&&customMonth) list=list.filter(o=>localMonthKey(o.createdAt)===customMonth);
  return list.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
}
function getPaymentLabel(method){ return method==='qr'?'QR พร้อมเพย์':method==='bank'?'เลขบัญชี':'ไม่ระบุ'; }
function renderOrdersDashboard() {
  const table=document.getElementById('ordersTable'); if(!table) return;
  const orders=adminState.orders||[], filtered=getFilteredOrders();
  const now=new Date(), today=localDateKey(now), month=localMonthKey(now);
  const todayOrders=orders.filter(o=>localDateKey(o.createdAt)===today), monthOrders=orders.filter(o=>localMonthKey(o.createdAt)===month);
  const set=(id,text)=>{const el=document.getElementById(id); if(el) el.textContent=text;};
  set('orderTodayRevenue',adminMoney(todayOrders.reduce((s,o)=>s+(Number(o.total)||0),0))); set('orderTodayCount',`${todayOrders.length} ออเดอร์`);
  set('orderMonthRevenue',adminMoney(monthOrders.reduce((s,o)=>s+(Number(o.total)||0),0))); set('orderMonthCount',`${monthOrders.length} ออเดอร์`);
  set('orderDiscountCount',String(orders.filter(o=>o.discount&&o.discount.code).length));
  if(!filtered.length) table.innerHTML='<div class="admin-empty-state"><i class="fas fa-receipt"></i><strong>ยังไม่พบออเดอร์</strong><span>ออเดอร์จะขึ้นที่นี่เมื่อลูกค้ากดยืนยันชำระเงิน</span></div>';
  else table.innerHTML=`<div class="order-list">${filtered.map(o=>{ const d=o.discount; return `<article class="order-row" data-order="${escapeAdminHtml(o.orderNo)}">
    <div class="order-main"><span class="order-number">${escapeAdminHtml(o.orderNo||'-')}</span><strong>${adminMoney(o.total)}</strong><small>${adminDateTime(o.createdAt)}</small></div>
    <div class="order-items-preview">${(o.items||[]).slice(0,2).map(i=>`<span>${escapeAdminHtml(i.name)} × ${Number(i.quantity)||1}</span>`).join('')}${(o.items||[]).length>2?`<small>+${(o.items||[]).length-2} รายการ</small>`:''}</div>
    <div class="order-discount-cell">${d&&d.code?`<span class="order-discount-badge"><i class="fas fa-ticket"></i>${escapeAdminHtml(d.code)}</span><small>ลด ${adminMoney(o.discountAmount||d.amount||0)}</small>`:'<span class="order-no-discount">ไม่ใช้โค้ด</span>'}</div>
    <div class="order-payment-cell"><span><i class="fas ${o.paymentMethod==='qr'?'fa-qrcode':'fa-building-columns'}"></i>${getPaymentLabel(o.paymentMethod)}</span></div>
    <div class="order-actions"><button type="button" class="button button-outline admin-view-order" data-order="${escapeAdminHtml(o.orderNo)}"><i class="fas fa-eye"></i> รายละเอียด</button><button type="button" class="button button-danger admin-delete-order" data-record-id="${escapeAdminHtml(o._recordId)}" data-order="${escapeAdminHtml(o.orderNo)}"><i class="fas fa-trash"></i></button></div>
  </article>`;}).join('')}</div>`;
  renderSalesSummaries();
}
function renderSalesSummaries(){
  const orders=adminState.orders||[]; const days={}, months={};
  orders.forEach(o=>{ const dk=localDateKey(o.createdAt), mk=localMonthKey(o.createdAt); if(dk){days[dk]??={count:0,total:0,discount:0};days[dk].count++;days[dk].total+=Number(o.total)||0;days[dk].discount+=Number(o.discountAmount)||0;} if(mk){months[mk]??={count:0,total:0,discount:0};months[mk].count++;months[mk].total+=Number(o.total)||0;months[mk].discount+=Number(o.discountAmount)||0;} });
  const daily=document.getElementById('dailySalesSummary'), monthly=document.getElementById('monthlySalesSummary');
  if(daily) daily.innerHTML=Object.keys(days).sort().reverse().slice(0,31).map(k=>`<div class="sales-summary-row"><div><strong>${new Date(k+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}</strong><small>${days[k].count} ออเดอร์ · ลด ${adminMoney(days[k].discount)}</small></div><b>${adminMoney(days[k].total)}</b></div>`).join('')||'<div class="summary-empty">ยังไม่มีข้อมูล</div>';
  if(monthly) monthly.innerHTML=Object.keys(months).sort().reverse().slice(0,12).map(k=>{const [y,m]=k.split('-');const label=new Date(Number(y),Number(m)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});return `<div class="sales-summary-row"><div><strong>${label}</strong><small>${months[k].count} ออเดอร์ · ลด ${adminMoney(months[k].discount)}</small></div><b>${adminMoney(months[k].total)}</b></div>`;}).join('')||'<div class="summary-empty">ยังไม่มีข้อมูล</div>';
}
function openOrderDetail(orderNo){
  const order=(adminState.orders||[]).find(o=>String(o.orderNo)===String(orderNo)); if(!order)return; const body=document.getElementById('orderDetailBody'), modal=document.getElementById('orderDetailModal'); if(!body||!modal)return;
  const d=order.discount; body.innerHTML=`<div class="order-detail-top"><div><span>เลขออเดอร์</span><strong>${escapeAdminHtml(order.orderNo)}</strong></div><div><span>วันเวลา</span><strong>${adminDateTime(order.createdAt)}</strong></div><div><span>ช่องทางชำระ</span><strong>${getPaymentLabel(order.paymentMethod)}</strong></div></div>
    <div class="order-detail-section"><h4>รายการสินค้า</h4><div class="order-detail-items">${(order.items||[]).map(i=>`<div><span>${escapeAdminHtml(i.name)} × ${Number(i.quantity)||1}</span><b>${adminMoney((Number(i.price)||0)*(Number(i.quantity)||1))}</b></div>`).join('')}</div></div>
    <div class="order-detail-section order-discount-detail"><h4>โค้ดส่วนลด</h4>${d&&d.code?`<div class="discount-detail-card"><span class="order-discount-badge"><i class="fas fa-ticket"></i>${escapeAdminHtml(d.code)}</span><div><span>รูปแบบ</span><b>${d.type==='fixed'?`ลด ${adminMoney(d.value)}`:`ลด ${Number(d.value)||0}%`}</b></div><div><span>ลดจริง</span><b>-${adminMoney(order.discountAmount||d.amount||0)}</b></div></div>`:'<div class="order-no-discount-large"><i class="fas fa-circle-minus"></i> ออเดอร์นี้ไม่ได้ใช้โค้ดส่วนลด</div>'}</div>
    <div class="order-detail-total"><div><span>ยอดสินค้า</span><b>${adminMoney(order.subtotal)}</b></div><div><span>ส่วนลด</span><b>-${adminMoney(order.discountAmount)}</b></div><div class="grand"><span>ยอดสุทธิ</span><b>${adminMoney(order.total)}</b></div></div>`;
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('admin-modal-open');
}
function closeOrderDetail(){ const modal=document.getElementById('orderDetailModal'); if(modal){modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');} document.body.classList.remove('admin-modal-open'); }
async function deleteOrderRecord(recordId,orderNo){
  const id=Number(recordId); if(!Number.isFinite(id)){showAdminToast('ไม่พบรหัสข้อมูลออเดอร์','error');return;}
  if(!confirm(`ลบออเดอร์ ${orderNo} ออกจากประวัติหรือไม่?`))return;
  try{await adminApiPost('adminDeletePromotion',{id});showAdminToast(`ลบออเดอร์ ${orderNo} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message,'error');}
}
function attachV9AdminEvents(){
  const editor=document.getElementById('wheelRatesEditor');
  editor?.addEventListener('input',updateWheelRateSummary);
  document.getElementById('webQrImageUrl')?.addEventListener('input', (event) => {
    const value=String(event.target.value||'').trim();
    if(value){ adminState.webSettings=normalizeAdminWebSettings({...adminState.webSettings,payment:{...(adminState.webSettings?.payment||{}),qrImage:value}}); renderWebQrPreview(value); }
  });
  document.getElementById('webQrImageFile')?.addEventListener('change', async (event) => {
    const file=event.target.files?.[0]; if(!file) return;
    if(!isSupportedReviewImage(file)){ showAdminToast('รองรับเฉพาะ JPG, PNG หรือ WEBP','error'); event.target.value=''; return; }
    if(file.size>4*1024*1024){ showAdminToast('รูป QR ต้องไม่เกิน 4MB','error'); event.target.value=''; return; }
    try {
      const dataUrl=await createQrImageDataUrl(file);
      const current=normalizeAdminWebSettings(adminState.webSettings);
      adminState.webSettings={...current,payment:{...current.payment,qrImage:dataUrl}};
      const urlInput=document.getElementById('webQrImageUrl'); if(urlInput) urlInput.value='';
      renderWebQrPreview(dataUrl); showAdminToast('เลือกรูป QR แล้ว กดบันทึกค่าเพื่อใช้งาน','success');
    } catch(error){ showAdminToast('อ่านรูป QR ไม่สำเร็จ','error'); }
    event.target.value='';
  });
  document.getElementById('removeWebQrBtn')?.addEventListener('click',()=>{
    const current=normalizeAdminWebSettings(adminState.webSettings);
    adminState.webSettings={...current,payment:{...current.payment,qrImage:''}};
    const urlInput=document.getElementById('webQrImageUrl'); if(urlInput) urlInput.value='';
    renderWebQrPreview(''); showAdminToast('ลบรูป QR แล้ว กดบันทึกค่าเพื่อยืนยัน','success');
  });
  editor?.addEventListener('click',e=>{const remove=e.target.closest('.wheel-rate-remove'); if(remove){remove.closest('.wheel-rate-row')?.remove(); updateWheelRateSummary();} if(e.target.closest('#addWheelRateRow')){const rates=collectWheelRatesFromEditor();rates.push({id:`prize-${Date.now()}`,label:`รางวัล ${rates.length+1}`,rate:0});adminState.webSettings={...(adminState.webSettings||{}),wheelRates:rates};renderWebSettingsEditor();}});
  document.getElementById('saveWebSettingsBtn')?.addEventListener('click',saveWebSettings);
  document.getElementById('resetWheelRatesBtn')?.addEventListener('click',()=>{adminState.webSettings={...(adminState.webSettings||{}),wheelRates:getDefaultAdminWheelRates()};renderWebSettingsEditor();showAdminToast('คืนค่าอัตราเริ่มต้นแล้ว กดบันทึกเพื่อใช้งาน','success');});
  document.getElementById('refreshOrdersBtn')?.addEventListener('click',loadAdminData);
  document.getElementById('orderSearchInput')?.addEventListener('input',e=>{adminState.orderSearch=e.target.value||'';renderOrdersDashboard();});
  document.getElementById('orderPeriodFilter')?.addEventListener('change',e=>{adminState.orderPeriod=e.target.value;document.getElementById('orderCustomDate')?.classList.toggle('hidden',e.target.value!=='customDate');document.getElementById('orderCustomMonth')?.classList.toggle('hidden',e.target.value!=='customMonth');renderOrdersDashboard();});
  document.getElementById('orderCustomDate')?.addEventListener('change',renderOrdersDashboard); document.getElementById('orderCustomMonth')?.addEventListener('change',renderOrdersDashboard);
  document.getElementById('ordersTable')?.addEventListener('click',e=>{const view=e.target.closest('.admin-view-order');if(view)openOrderDetail(view.dataset.order);const del=e.target.closest('.admin-delete-order');if(del)deleteOrderRecord(del.dataset.recordId,del.dataset.order);});
  document.querySelectorAll('[data-close-order-modal]').forEach(el=>el.addEventListener('click',closeOrderDetail));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOrderDetail();});
}

/* ==========================================================================
   JOKEMOO Admin V18 — login gate, 30-day remember session and admin users
   ========================================================================== */
function adminAuthBase64(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary);
}
function adminAuthUnbase64(value) {
  const binary = atob(String(value || '')); const arr = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) arr[i]=binary.charCodeAt(i); return arr;
}
async function adminHashPassword(password, saltB64, iterations=120000) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:adminAuthUnbase64(saltB64), iterations:Number(iterations)||120000, hash:'SHA-256'}, key, 256);
  return adminAuthBase64(new Uint8Array(bits));
}
function adminRandomSalt() { const a=new Uint8Array(16); crypto.getRandomValues(a); return adminAuthBase64(a); }
function adminSafeEqual(a,b){ a=String(a||'');b=String(b||''); if(a.length!==b.length)return false; let d=0; for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i); return d===0; }
function getEffectiveAdminUsers(){
  const list=Array.isArray(adminState.adminUsers)?adminState.adminUsers.slice():[];
  if(!list.some(u=>u.username===ROOT_ADMIN_USERNAME)) list.unshift({...ROOT_ADMIN_FALLBACK});
  return list;
}
function findAdminUser(username){ return getEffectiveAdminUsers().find(u=>u.username===String(username||'').trim().toLowerCase())||null; }
function setAdminAuthLocked(locked){ document.body.classList.toggle('admin-auth-locked',!!locked); const gate=document.getElementById('adminAuthGate'); if(gate) gate.classList.toggle('hidden',!locked); }
function setAdminLoginError(message=''){ const el=document.getElementById('adminLoginError'); if(!el)return; el.textContent=message; el.classList.toggle('hidden',!message); }
function adminSessionStorage(remember){ return remember ? localStorage : sessionStorage; }
function clearAdminSessions(){ localStorage.removeItem(ADMIN_SESSION_KEY); sessionStorage.removeItem(ADMIN_SESSION_KEY); }
function readAdminSession(){
  for(const storage of [localStorage,sessionStorage]){
    try{const raw=storage.getItem(ADMIN_SESSION_KEY);if(!raw)continue;const s=JSON.parse(raw);if(!s||!s.username||Number(s.expiresAt)<=Date.now()){storage.removeItem(ADMIN_SESSION_KEY);continue;}return s;}catch(_){storage.removeItem(ADMIN_SESSION_KEY);}
  }
  return null;
}
function writeAdminSession(user,remember){
  clearAdminSessions(); const expiresAt=remember?Date.now()+ADMIN_SESSION_MS:Date.now()+12*60*60*1000;
  const data={username:user.username,displayName:user.displayName||user.username,createdAt:Date.now(),expiresAt,remember:!!remember,nonce:crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)};
  adminSessionStorage(remember).setItem(ADMIN_SESSION_KEY,JSON.stringify(data));
}
function updateCurrentAdminUi(){
  const u=adminState.currentAdminUser; const name=u?(u.displayName||u.username):'-';
  document.getElementById('adminCurrentUserName') && (document.getElementById('adminCurrentUserName').textContent=name);
  document.getElementById('adminSidebarUserName') && (document.getElementById('adminSidebarUserName').textContent=name);
}
async function fetchAuthUsersOnly(){
  try{const result=await adminApiFetch('adminData');const promotions=Array.isArray(result?.promotions)?result.promotions:[];adminState.adminUsers=promotions.map(parseAdminUserPromotionRecord).filter(Boolean);return true;}catch(error){console.warn('auth users fetch failed',error);return false;}
}
async function persistRootAdminIfNeeded(user){
  if(user.username!==ROOT_ADMIN_USERNAME || (adminState.adminUsers||[]).some(u=>u.username===ROOT_ADMIN_USERNAME)) return;
  try{const payload=adminUserToPromotionPayload({...ROOT_ADMIN_FALLBACK,createdAt:new Date().toISOString()});await adminApiPost('adminCreatePromotion',payload);await fetchAuthUsersOnly();}catch(error){console.warn('root admin persistence skipped',error);}
}
async function completeAdminLogin(user,remember){
  adminState.currentAdminUser=user; writeAdminSession(user,remember); updateCurrentAdminUi(); setAdminAuthLocked(false); setAdminLoginError('');
  await persistRootAdminIfNeeded(user); await loadAdminData();
}
async function handleAdminLogin(event){
  event?.preventDefault(); const username=String(document.getElementById('adminLoginUsername')?.value||'').trim().toLowerCase(); const password=String(document.getElementById('adminLoginPassword')?.value||''); const remember=!!document.getElementById('adminRememberLogin')?.checked; const btn=document.getElementById('adminLoginBtn');
  if(!username||!password){setAdminLoginError('กรุณากรอก Username และ Password');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>กำลังตรวจสอบ...</span>';} setAdminLoginError('');
  try{
    await fetchAuthUsersOnly(); const user=findAdminUser(username); if(!user||user.enabled===false||!user.salt||!user.hash){throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');}
    const hash=await adminHashPassword(password,user.salt,user.iterations); if(!adminSafeEqual(hash,user.hash))throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    await completeAdminLogin(user,remember);
  }catch(error){setAdminLoginError(error.message||'เข้าสู่ระบบไม่สำเร็จ');}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-right-to-bracket"></i><span>เข้าสู่ระบบ</span>';}}
}
async function initializeAdminAuth(){
  setAdminAuthLocked(true); await fetchAuthUsersOnly(); const session=readAdminSession();
  if(session){const user=findAdminUser(session.username);if(user&&user.enabled!==false){adminState.currentAdminUser=user;updateCurrentAdminUi();setAdminAuthLocked(false);await loadAdminData();return;}clearAdminSessions();}
  const username=document.getElementById('adminLoginUsername'); if(username) setTimeout(()=>username.focus(),80);
}
function logoutAdmin(){ clearAdminSessions(); adminState.currentAdminUser=null; updateCurrentAdminUi(); setAdminAuthLocked(true); const p=document.getElementById('adminLoginPassword');if(p)p.value=''; setAdminLoginError(''); setTimeout(()=>document.getElementById('adminLoginUsername')?.focus(),80); }
function formatAdminUserDate(value){ if(!value)return '-';const d=new Date(value);return Number.isNaN(d.getTime())?'-':d.toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}); }
function renderAdminUsers(){
  const listEl=document.getElementById('adminUsersList');if(!listEl)return; const users=getEffectiveAdminUsers(); const current=adminState.currentAdminUser?.username||'';
  document.getElementById('adminUserStatTotal') && (document.getElementById('adminUserStatTotal').textContent=users.length);
  document.getElementById('adminUserStatActive') && (document.getElementById('adminUserStatActive').textContent=users.filter(u=>u.enabled!==false).length);
  document.getElementById('adminUserStatCurrent') && (document.getElementById('adminUserStatCurrent').textContent=current||'-');
  listEl.innerHTML=users.map(u=>{const root=u.username===ROOT_ADMIN_USERNAME||u.isRoot;const isCurrent=u.username===current;return `<article class="admin-user-row ${u.enabled===false?'is-disabled':''}">
    <div class="admin-user-avatar"><i class="fas ${root?'fa-crown':'fa-user-shield'}"></i></div>
    <div class="admin-user-info"><div><strong>${escapeAdminHtml(u.displayName||u.username)}</strong>${root?'<span class="admin-user-badge owner">บัญชีหลัก</span>':''}${isCurrent?'<span class="admin-user-badge current">กำลังใช้งาน</span>':''}</div><code>${escapeAdminHtml(u.username)}</code><small>${u.synced?`สร้างเมื่อ ${formatAdminUserDate(u.createdAt)}`:'บัญชีเริ่มต้นของระบบ'}</small></div>
    <div class="admin-user-status"><span class="admin-status-badge ${u.enabled===false?'status-error':'status-success'}">${u.enabled===false?'ปิดใช้งาน':'ใช้งานได้'}</span></div>
    <div class="admin-user-actions"><button type="button" class="button button-outline admin-user-password" data-user="${escapeAdminHtml(u.username)}"><i class="fas fa-key"></i> เปลี่ยนรหัส</button>${root?'':`<button type="button" class="button button-outline admin-user-toggle" data-user="${escapeAdminHtml(u.username)}"><i class="fas ${u.enabled===false?'fa-toggle-off':'fa-toggle-on'}"></i> ${u.enabled===false?'เปิด':'ปิด'}</button><button type="button" class="button button-danger admin-user-delete" data-user="${escapeAdminHtml(u.username)}"><i class="fas fa-trash"></i></button>`}</div>
  </article>`}).join('');
}
async function createAdminUser(event){
  event.preventDefault(); const username=String(document.getElementById('newAdminUsername')?.value||'').trim().toLowerCase(); const displayName=String(document.getElementById('newAdminDisplayName')?.value||'').trim(); const password=String(document.getElementById('newAdminPassword')?.value||''); const btn=document.getElementById('createAdminUserBtn');
  if(!/^[a-zA-Z0-9._-]{3,32}$/.test(username)){showAdminToast('Username ใช้ได้เฉพาะ a-z, 0-9, จุด, _ และ - จำนวน 3–32 ตัว','error');return;} if(password.length<6){showAdminToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร','error');return;} if(findAdminUser(username)){showAdminToast('มี Username นี้อยู่แล้ว','error');return;}
  setButtonLoading(btn,'กำลังเพิ่ม...'); try{const salt=adminRandomSalt();const hash=await adminHashPassword(password,salt,120000);const user={username,displayName:displayName||username,role:'admin',enabled:true,salt,hash,iterations:120000,createdAt:new Date().toISOString()};await adminApiPost('adminCreatePromotion',adminUserToPromotionPayload(user));event.target.reset();showAdminToast(`เพิ่มผู้ดูแล ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message||'เพิ่มผู้ดูแลไม่สำเร็จ','error');}finally{clearButtonLoading(btn);}
}
function openAdminPasswordModal(username){const u=findAdminUser(username);if(!u)return;document.getElementById('adminPasswordTarget').value=u.username;document.getElementById('adminPasswordModalUser').textContent=`บัญชี: ${u.username}`;document.getElementById('adminPasswordNew').value='';document.getElementById('adminPasswordConfirm').value='';const modal=document.getElementById('adminPasswordModal');modal?.classList.remove('hidden');modal?.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('adminPasswordNew')?.focus(),80);}
function closeAdminPasswordModal(){const modal=document.getElementById('adminPasswordModal');modal?.classList.add('hidden');modal?.setAttribute('aria-hidden','true');}
async function saveAdminPassword(event){
  event.preventDefault();const username=document.getElementById('adminPasswordTarget').value;const pass=document.getElementById('adminPasswordNew').value;const confirmPass=document.getElementById('adminPasswordConfirm').value;const user=findAdminUser(username);const btn=document.getElementById('saveAdminPasswordBtn');if(!user)return;if(pass.length<6){showAdminToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร','error');return;}if(pass!==confirmPass){showAdminToast('รหัสผ่านยืนยันไม่ตรงกัน','error');return;}setButtonLoading(btn,'กำลังบันทึก...');try{const salt=adminRandomSalt();const hash=await adminHashPassword(pass,salt,120000);const updated={...user,salt,hash,iterations:120000,updatedAt:new Date().toISOString()};const payload=adminUserToPromotionPayload(updated);if(user.synced&&Number.isFinite(Number(user.id))){payload.id=Number(user.id);await adminApiPost('adminUpdatePromotion',payload);}else{await adminApiPost('adminCreatePromotion',payload);}closeAdminPasswordModal();showAdminToast(`เปลี่ยนรหัสผ่าน ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message||'เปลี่ยนรหัสผ่านไม่สำเร็จ','error');}finally{clearButtonLoading(btn);}
}
async function toggleAdminUser(username){const user=findAdminUser(username);if(!user||user.isRoot||user.username===ROOT_ADMIN_USERNAME)return;if(!user.synced){showAdminToast('บัญชียังไม่ซิงก์กับระบบ','error');return;}try{const payload=adminUserToPromotionPayload({...user,enabled:user.enabled===false});payload.id=Number(user.id);await adminApiPost('adminUpdatePromotion',payload);showAdminToast(`${user.enabled===false?'เปิด':'ปิด'}บัญชี ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message,'error');}}
async function deleteAdminUser(username){const user=findAdminUser(username);if(!user||user.isRoot||user.username===ROOT_ADMIN_USERNAME)return;if(username===adminState.currentAdminUser?.username){showAdminToast('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่','error');return;}if(!confirm(`ลบบัญชีผู้ดูแล ${username} หรือไม่?`))return;try{await adminApiPost('adminDeletePromotion',{id:Number(user.id)});showAdminToast(`ลบบัญชี ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message,'error');}}
function attachAdminAuthEvents(){
  document.getElementById('adminLoginForm')?.addEventListener('submit',handleAdminLogin);
  document.getElementById('adminLoginPasswordToggle')?.addEventListener('click',()=>{const input=document.getElementById('adminLoginPassword');if(!input)return;input.type=input.type==='password'?'text':'password';document.querySelector('#adminLoginPasswordToggle i')?.classList.toggle('fa-eye-slash',input.type==='text');});
  document.getElementById('adminLogoutBtn')?.addEventListener('click',logoutAdmin); document.getElementById('adminSidebarLogoutBtn')?.addEventListener('click',logoutAdmin);
  document.getElementById('adminUserCreateForm')?.addEventListener('submit',createAdminUser); document.getElementById('refreshAdminUsersBtn')?.addEventListener('click',loadAdminData);
  document.getElementById('adminUsersList')?.addEventListener('click',e=>{const pass=e.target.closest('.admin-user-password');if(pass)return openAdminPasswordModal(pass.dataset.user);const tog=e.target.closest('.admin-user-toggle');if(tog)return toggleAdminUser(tog.dataset.user);const del=e.target.closest('.admin-user-delete');if(del)return deleteAdminUser(del.dataset.user);});
  document.getElementById('adminPasswordResetForm')?.addEventListener('submit',saveAdminPassword); document.querySelectorAll('[data-close-admin-password]').forEach(el=>el.addEventListener('click',closeAdminPasswordModal));
}

document.addEventListener('jokemoo:languagechange', (event) => {
  try {
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
    renderMovieTable(adminState.movies);
    renderWebSettingsEditor();
    renderOrdersDashboard();
    renderAdminUsers();
    updateAdminStats();
  } catch (error) {
    console.warn('admin language refresh skipped', error);
  }
});

document.addEventListener('DOMContentLoaded', initializeAdmin);
