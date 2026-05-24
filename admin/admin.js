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
const adminToast = document.getElementById('adminToast');
const maintenanceToggleBtn = document.getElementById('maintenanceToggleBtn');
const maintenanceStatus = document.getElementById('maintenanceStatus');

const adminState = {
  apiUrl: DEFAULT_ADMIN_API_URL,
  apiKey: DEFAULT_ADMIN_API_KEY,
  products: [],
  reviews: [],
  promotions: [],
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

function getProductStatus(product) {
  return product.available ? 'พร้อมขาย' : 'ไม่พร้อมใช้งาน';
}

function getPromotionStatus(promo) {
  if (!promo.enabled) return 'ปิดใช้งาน';
  const now = new Date();
  const start = parsePromotionDate(promo.startAt);
  const end = parsePromotionDate(promo.endAt);
  if (start && start > now) return 'รอเริ่ม';
  if (end && now >= end) return 'หมดเวลา';
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
  if (addProductBtn) addProductBtn.addEventListener('click', createNewProduct);
  if (addReviewBtn) addReviewBtn.addEventListener('click', createNewReview);
  if (addPromotionBtn) addPromotionBtn.addEventListener('click', createNewPromotion);
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

  const adminTabButtons = document.querySelectorAll('.admin-tab-button');
  adminTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      if (!targetId) return;

      adminTabButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      document.querySelectorAll('.admin-section').forEach((section) => {
        section.classList.toggle('hidden', section.id !== targetId);
      });
    });
  });

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
        editPanel.classList.toggle('hidden', isOpen);
        toggleEditButton.textContent = isOpen ? 'แก้ไข' : 'ปิด';
        if (!isOpen) {
          editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
        editPanel.classList.toggle('hidden', isOpen);
        const newLabel = isOpen ? 'แก้ไข' : 'ยกเลิก';
        reviewCard.querySelectorAll('.admin-toggle-review-edit').forEach((btn) => {
          if (btn.dataset.id === toggleEditButton.dataset.id) btn.textContent = newLabel;
        });
        if (!isOpen) {
          editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
        editPanel.classList.toggle('hidden', isOpen);
        toggleEditButton.textContent = isOpen ? 'แก้ไข' : 'ปิด';
        if (!isOpen) {
          editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
    adminState.promotions = promotions;
    adminState.maintenanceMode = !!result.maintenanceMode;
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
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
    updateMaintenanceStatus();
    updateApiStatus('โหลดข้อมูลสำรองเรียบร้อย', 'success');
  } catch (fallbackError) {
    showAdminToast(fallbackError.message, 'error');
    updateApiStatus('ไม่สามารถเชื่อมต่อ API ได้', 'error');
  }
}

function initializeAdmin() {
  attachAdminEvents();
  loadAdminData();
}

document.addEventListener('DOMContentLoaded', initializeAdmin);
