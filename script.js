const products = [
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

const state = {
    cart: [],
    user: null,
    products: [],
    reviews: [],
    promotions: [],
    maintenanceMode: false,
};

const apiBaseUrl = (window.JokeMooConfig && window.JokeMooConfig.apiBaseUrl)
    ? window.JokeMooConfig.apiBaseUrl
    : "https://script.google.com/macros/s/AKfycbyspAWk-Wkf4qShYeswphtQt5iCe2q7hccdDu6G4rd648hdgzNLOlLUMsPVvZmRL0XF/exec";
const productCategories = {
    netflix: "Netflix Premium",
    other: "แอพอื่น",
};

let siteDataCache = null;
const REVIEWS_PER_PAGE = 4;
const PENDING_REVIEWS_STORAGE_KEY = 'jokemoo_pending_reviews';
const REVIEW_SETTINGS_STORAGE_KEY = 'jokemoo_review_settings';
const ADMIN_RELOAD_STORAGE_KEY = 'jokemoo_admin_reload';
const SITE_DATA_POLL_INTERVAL_MS = 10000;
let lastSiteDataSignature = '';
let reviewPageIndex = 0;
let pendingReviewImageDataUrl = null;

function getReviewSettings() {
    try {
        const stored = window.localStorage.getItem(REVIEW_SETTINGS_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        return {
            lastReviewMonth: '',
            unlimitedMode: false,
            ...parsed,
        };
    } catch (error) {
        console.warn('getReviewSettings failed', error);
        return {
            lastReviewMonth: '',
            unlimitedMode: false,
        };
    }
}

function setReviewSettings(settings) {
    try {
        window.localStorage.setItem(REVIEW_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn('setReviewSettings failed', error);
    }
}

function getCurrentReviewMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function canSubmitReview() {
    const settings = getReviewSettings();
    if (settings.unlimitedMode) return true;
    return settings.lastReviewMonth !== getCurrentReviewMonth();
}

function recordReviewSubmission() {
    const settings = getReviewSettings();
    settings.lastReviewMonth = getCurrentReviewMonth();
    setReviewSettings(settings);
}

function toggleReviewUnlimitedMode() {
    const settings = getReviewSettings();
    settings.unlimitedMode = !settings.unlimitedMode;
    setReviewSettings(settings);
    return settings.unlimitedMode;
}

function adminReviewConsoleCommand() {
    const enabled = toggleReviewUnlimitedMode();
    const message = enabled ? 'โหมดส่งรีวิวไม่จำกัดเปิดแล้ว' : 'โหมดส่งรีวิวไม่จำกัดปิดแล้ว';
    showToast(message, 'success');
    if (window && window.console && typeof console.info === 'function') {
        console.info(message);
    }
    return enabled;
}

function persistPendingReviews() {
    try {
        const pendingReviews = getPendingReviews();
        if (pendingReviews.length) {
            window.localStorage.setItem(PENDING_REVIEWS_STORAGE_KEY, JSON.stringify(pendingReviews));
        } else {
            window.localStorage.removeItem(PENDING_REVIEWS_STORAGE_KEY);
        }
    } catch (error) {
        console.warn('persistPendingReviews failed', error);
    }
}

function loadStoredPendingReviews() {
    try {
        const stored = window.localStorage.getItem(PENDING_REVIEWS_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('loadStoredPendingReviews failed', error);
        return [];
    }
}

function clearPendingReviewsStorage() {
    try {
        window.localStorage.removeItem(PENDING_REVIEWS_STORAGE_KEY);
    } catch (error) {
        console.warn('clearPendingReviewsStorage failed', error);
    }
}

function applyMaintenanceMode(enabled) {
    state.maintenanceMode = !!enabled;
    const maintenanceOverlay = document.getElementById('maintenanceOverlay');
    if (!maintenanceOverlay) return;
    maintenanceOverlay.classList.toggle('hidden', !state.maintenanceMode);
    if (state.maintenanceMode) {
        showToast('เว็บไซต์อยู่ในโหมดปิดปรับปรุง กรุณารอแอดมินเปิดระบบ', 'error');
    }
}

function handleAdminReloadEvent(event) {
    if (event.key !== ADMIN_RELOAD_STORAGE_KEY) return;
    refreshSiteDataIfChanged();
}

async function refreshSiteDataIfChanged() {
    try {
        const siteData = await apiGet('siteData');
        if (!siteData || typeof siteData !== 'object') return;

        const signature = JSON.stringify({
            maintenanceMode: !!siteData.maintenanceMode,
            products: Array.isArray(siteData.products) ? siteData.products : [],
            reviews: Array.isArray(siteData.reviews) ? siteData.reviews : [],
            promotions: Array.isArray(siteData.promotions) ? siteData.promotions : [],
        });

        if (signature === lastSiteDataSignature) return;
        lastSiteDataSignature = signature;

        if (Array.isArray(siteData.products) && siteData.products.length) {
            state.products = siteData.products;
        }
        if (Array.isArray(siteData.reviews)) {
            state.reviews = siteData.reviews;
        }
        const pendingLocal = loadStoredPendingReviews();
        if (pendingLocal.length) {
            state.reviews = mergeReviews(state.reviews, pendingLocal);
        }
        state.maintenanceMode = !!siteData.maintenanceMode;
        state.promotions = Array.isArray(siteData.promotions) ? siteData.promotions : [];
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        applyMaintenanceMode(state.maintenanceMode);
    } catch (error) {
        console.warn('refreshSiteDataIfChanged failed:', error);
    }
}

function ensureSiteActive() {
    if (state.maintenanceMode) {
        showToast('เว็บไซต์ปิดปรับปรุงอยู่ในขณะนี้', 'error');
        return false;
    }
    return true;
}

// Elements
const productsContainer = document.getElementById("products");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const closeCart = document.getElementById("closeCart");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const userBadge = document.getElementById("userBadge");
const heroShopBtn = document.getElementById("heroShopBtn");
const reviewForm = document.getElementById("reviewForm");
const reviewName = document.getElementById("reviewName");
const reviewRating = document.getElementById("reviewRating");
const reviewComment = document.getElementById("reviewComment");
const reviewImageInput = document.getElementById("reviewImage");
const reviewImagePreview = document.getElementById("reviewImagePreview");
const reviewPreviewImg = document.getElementById("reviewPreviewImg");
const reviewList = document.getElementById("reviewList");
const reviewListWrapper = document.getElementById("reviewListWrapper");
const reviewCarouselPrev = document.getElementById("reviewCarouselPrev");
const reviewCarouselNext = document.getElementById("reviewCarouselNext");
const reviewNoData = document.getElementById("reviewNoData");
const pageLoader = document.getElementById("pageLoader");
const promotionBanner = document.getElementById("promotionBanner");

const defaultReviews = [
    {
        id: 1,
        name: "น้องรีเฟรช",
        rating: 5,
        comment: "ซื้อ Netflix 30 วันแล้วชอบมาก ชำระเงินง่าย ได้รหัสเร็วจริงๆ",
        imageUrl: "",
        date: "25 เม.ย. 2026",
    },
    {
        id: 2,
        name: "คุณเอ๋",
        rating: 4,
        comment: "บริการดี ดูได้ไม่มีสะดุด แอดมินตอบเร็วครับ",
        imageUrl: "",
        date: "23 เม.ย. 2026",
    },
];

async function fetchGet(action) {

    const url = new URL(apiBaseUrl);
    const query = new URLSearchParams({ action }).toString();
    url.search = query;

    const response = await fetch(url.toString(), {
        cache: 'no-store',
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    if (!result || !result.success) {
        throw new Error((result && result.message) || 'API error');
    }
    return result;
}

async function apiGet(action) {

    if (siteDataCache && action === 'siteData') {
        return siteDataCache;
    }
    if (siteDataCache && Array.isArray(siteDataCache.products) && action === 'products') {
        return siteDataCache.products;
    }
    if (siteDataCache && Array.isArray(siteDataCache.reviews) && action === 'reviews') {
        return siteDataCache.reviews;
    }

    const result = await fetchGet(action);
    const data = result.data || [];
    if (action === 'siteData' && data && typeof data === 'object') {
        siteDataCache = data;
    }
    return data;
}

async function apiPost(action, payload) {
    const bodyPayload = new URLSearchParams({ action, ...payload });
    const response = await fetch(apiBaseUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyPayload.toString(),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const result = await response.json();
    if (!result || !result.success) {
        throw new Error((result && result.message) || 'API error');
    }
    if (action === 'submitReview') {
        siteDataCache = null;
    }
    return result;
}

function parsePromotionDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const str = String(value).trim();
    if (!str) return null;

    const directDate = new Date(str);
    if (!Number.isNaN(directDate.getTime())) return directDate;

    const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmY) {
        const day = Number(dmY[1]);
        const month = Number(dmY[2]);
        const year = Number(dmY[3]);
        return new Date(year, month - 1, day);
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
        const monthName = thaiMatch[2].trim();
        const year = Number(thaiMatch[3]);
        const month = thaiMonths[monthName] || 0;
        if (month > 0) {
            return new Date(year, month - 1, day);
        }
    }

    return null;
}

function formatPromotionDate(value) {
    if (!value) return '';
    const parsed = parsePromotionDate(value);
    if (!parsed) return value;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = String(parsed.getFullYear());
    return `${day}/${month}/${year}`;
}

function isPromotionActive(promo) {
    if (!promo || !promo.enabled) return false;
    const now = new Date();
    const startDate = parsePromotionDate(promo.startAt);
    const endDate = parsePromotionDate(promo.endAt);

    if (startDate && startDate > now) return false;
    if (endDate && now >= endDate) return false;
    return true;
}

function renderPromotionBanner() {
    if (!promotionBanner) return;
    const activePromotion = Array.isArray(state.promotions)
        ? state.promotions.find(isPromotionActive)
        : null;

    if (!activePromotion) {
        promotionBanner.classList.add('hidden');
        promotionBanner.innerHTML = '';
        return;
    }

    const promoImage = normalizeReviewImageUrl(activePromotion.image);
    const startLabel = formatPromotionDate(activePromotion.startAt);
    const endLabel = formatPromotionDate(activePromotion.endAt);
    const dateLine = startLabel || endLabel
        ? `<div class="promotion-banner-dates">${startLabel ? `เริ่ม ${startLabel}` : ''}${startLabel && endLabel ? ' • ' : ''}${endLabel ? `ถึง ${endLabel}` : ''}</div>`
        : '';
    promotionBanner.classList.remove('hidden');
    promotionBanner.innerHTML = `
        <div class="promotion-banner-content">
            <div class="promotion-banner-text">
                <span class="promotion-tag">โปรโมชั่นพิเศษ</span>
                <h2>${activePromotion.title || 'โปรสุดคุ้มวันนี้'}</h2>
                <p>${activePromotion.description || 'เลือกโปรดี ๆ ลดแรงก่อนใคร'}</p>
            </div>
            ${promoImage ? `<div class="promotion-banner-image promotion-banner-image-clickable" data-image-url="${promoImage}"><img src="${promoImage}" alt="${activePromotion.title || 'โปรโมชั่น'}" loading="lazy"><div class="promotion-image-overlay"><i class="fas fa-search-plus"></i></div></div>` : ''}
            <div class="promotion-banner-meta">
                <div class="promotion-banner-dates">
                    ${dateLine.replace('<div class="promotion-banner-dates">', '').replace('</div>', '')}
                </div>
                <a class="promotion-action-button" href="https://line.me/R/ti/p/%40106zyrpm" target="_blank" rel="noopener noreferrer">ติดต่อรับโปร</a>
            </div>
        </div>
    `;
    attachPromotionBannerEvents();
}

function attachPromotionBannerEvents() {
    const promoImages = document.querySelectorAll('.promotion-banner-image-clickable');
    promoImages.forEach((img) => {
        img.addEventListener('click', () => {
            const imageUrl = img.dataset.imageUrl;
            if (imageUrl) {
                openPromotionImageModal(imageUrl);
            }
        });
    });
}

function openPromotionImageModal(imageUrl) {
    let modal = document.getElementById('promotionImageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'promotionImageModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" aria-label="ปิด"><i class="fas fa-times"></i></button>
                <img id="promotionModalImage" src="" alt="โปรโมชั่น" />
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').addEventListener('click', closePromotionImageModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePromotionImageModal();
        });
    }
    const modalImg = modal.querySelector('#promotionModalImage');
    modalImg.src = imageUrl;
    modal.classList.remove('hidden');
}

function closePromotionImageModal() {
    const modal = document.getElementById('promotionImageModal');
    if (modal) modal.classList.add('hidden');
}

function renderProducts() {
    if (!productsContainer) return;

    const categoryOrder = ["netflix", "other"];
    const categoryHtml = categoryOrder
        .map((category) => {
            const group = state.products.filter((item) => item.category === category);
            if (group.length === 0) return "";

            return `
                <section class="category-block">
                    <div class="category-header">
                        <h3>${productCategories[category]}</h3>
                        <p>${category === "netflix" ? "แพ็กเกจ Netflix Premium ทั้งหมด" : "แพ็กเกจแอพอื่น ๆ"}</p>
                    </div>
                    <div class="product-grid">
                        ${group
                            .map((product) => `
                                <div class="product-card">
                                    <div class="product-card-header">
                                        <h4>${product.name}</h4>
                                        <div class="product-status ${product.available ? "available" : "unavailable"}">${product.available ? "พร้อมขาย" : "ไม่พร้อมใช้งาน"}</div>
                                    </div>
                                    <p>${product.desc}</p>
                                    <div class="product-image-wrap">
                                        <img src="${product.image}" alt="${product.name}" class="product-image" />
                                    </div>
                                    <div>
                                        <div class="price">฿${product.price} <span class="price-unit">/ บาท</span></div>
                                        <button class="button button-primary full-width" data-id="${product.id}" ${product.available ? "" : "disabled aria-disabled='true'"}>
                                            <i class="fas fa-plus"></i> ${product.available ? "เพิ่มเข้าตะกร้า" : "สินค้าไม่พร้อมใช้งาน"}
                                        </button>
                                    </div>
                                </div>
                            `)
                            .join("")}
                    </div>
                </section>
            `;
        })
        .join("");

    if (!categoryHtml.trim()) {
        productsContainer.innerHTML = `
            <div class="empty-state">
                <p>กำลังโหลดข้อมูลสินค้าจาก API หรือยังไม่มีสินค้าในระบบ</p>
            </div>
        `;
        return;
    }

    productsContainer.innerHTML = `<div class="category-wrapper">${categoryHtml}</div>`;

    productsContainer.querySelectorAll("button[data-id]").forEach((button) => {
        const productId = Number(button.dataset.id);
        const product = state.products.find((item) => item.id === productId);
        if (!product || !product.available) return;
        button.addEventListener("click", () => addToCart(productId));
    });
}

function renderCart() {
    if (!cartItems) return;

    cartItems.innerHTML = "";
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = `
            <div style="text-align:center; padding: 20px; color: var(--text-muted);">
                <i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>ยังไม่มีสินค้าในตะกร้า</p>
            </div>`;
        cartTotal.innerHTML = "฿0 <span class='price-unit'>/ บาท</span>";
        cartCount.textContent = "0";
        return;
    }

    state.cart.forEach((item) => {
        const element = document.createElement("div");
        element.className = "cart-item";
        element.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.name}</strong>
                <div class="cart-item-meta">
                    <span>฿${item.price}</span>
                    <div class="quantity-controls">
                        <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}"><i class="fas fa-minus"></i></button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                <button data-id="${item.id}"><i class="fas fa-trash-alt"></i> ลบ</button>
            </div>
        `;

        element.querySelector(".item-actions button").addEventListener("click", () => removeFromCart(item.id));
        element.querySelectorAll(".qty-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.dataset.action;
                const currentQuantity = item.quantity;
                const newQuantity = action === "increase" ? currentQuantity + 1 : currentQuantity - 1;
                updateCartQuantity(item.id, newQuantity);
            });
        });
        cartItems.appendChild(element);
    });

    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartTotal.innerHTML = `฿${total} <span class='price-unit'>/ บาท</span>`;
    cartCount.textContent = count;
}

async function loadSiteData() {
    try {
        const siteData = await apiGet('siteData');
        if (siteData && typeof siteData === 'object') {
            lastSiteDataSignature = JSON.stringify({
                maintenanceMode: !!siteData.maintenanceMode,
                products: Array.isArray(siteData.products) ? siteData.products : [],
                reviews: Array.isArray(siteData.reviews) ? siteData.reviews : [],
                promotions: Array.isArray(siteData.promotions) ? siteData.promotions : [],
            });

            if (Array.isArray(siteData.products) && siteData.products.length) {
                state.products = siteData.products;
            }
            if (Array.isArray(siteData.reviews)) {
                state.reviews = siteData.reviews;
            }
            state.promotions = Array.isArray(siteData.promotions) ? siteData.promotions : [];
            const pendingLocal = loadStoredPendingReviews();
            if (pendingLocal.length) {
                state.reviews = mergeReviews(state.reviews, pendingLocal);
            }
            state.maintenanceMode = !!siteData.maintenanceMode;
            renderPromotionBanner();
            renderProducts();
            renderReviews();
            applyMaintenanceMode(state.maintenanceMode);
            return;
        }
    } catch (error) {
        console.warn('loadSiteData failed:', error);
        const pendingLocal = loadStoredPendingReviews();
        if (pendingLocal.length) {
            state.reviews = mergeReviews(state.reviews, pendingLocal);
            renderReviews();
        }
    }

    await loadProductsAndReviewsFallback();
}

async function loadProductsAndReviewsFallback() {
    try {
        const [products, reviews] = await Promise.all([apiGet('products'), apiGet('reviews')]);
        if (Array.isArray(products) && products.length) {
            state.products = products;
        }
        if (Array.isArray(reviews)) {
            state.reviews = reviews;
        }
        const pendingLocal = loadStoredPendingReviews();
        if (pendingLocal.length) {
            state.reviews = mergeReviews(state.reviews, pendingLocal);
        }
        state.promotions = [];
        state.maintenanceMode = false;
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        applyMaintenanceMode(false);
    } catch (error) {
        console.warn('loadProductsAndReviewsFallback failed:', error);
        state.products = products;
        state.reviews = defaultReviews;
        state.promotions = [];
        state.maintenanceMode = false;
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        applyMaintenanceMode(false);
        showToast('ใช้ข้อมูลสำรองแล้ว ขณะนี้ไม่สามารถเชื่อมต่อ API ได้', 'info');
    }
}

function renderStars(count) {
    return Array.from({ length: 5 }, (_, index) => `
        <i class="fas fa-star" style="opacity: ${index < count ? 1 : 0.25};"></i>
    `).join("");
}

function updateReviewCarouselControls() {
    if (!reviewList || !reviewCarouselPrev || !reviewCarouselNext) return;
    const totalPages = Math.ceil(state.reviews.length / REVIEWS_PER_PAGE) || 1;
    reviewCarouselPrev.classList.toggle('hidden', totalPages <= 1);
    reviewCarouselNext.classList.toggle('hidden', totalPages <= 1);
    const pageIndicator = document.getElementById('reviewPageIndicator');
    if (pageIndicator) {
        pageIndicator.textContent = `${reviewPageIndex + 1} / ${totalPages}`;
    }
}

async function loadReviews() {
    const reviews = await apiGet('reviews');
    if (Array.isArray(reviews)) {
        state.reviews = reviews;
    } else if (!state.reviews.length) {
        state.reviews = defaultReviews.slice();
    }
    renderReviews();
    return state.reviews;
}

function goReviewPage(delta) {
    const totalPages = Math.ceil(state.reviews.length / REVIEWS_PER_PAGE) || 1;
    reviewPageIndex = Math.max(0, Math.min(totalPages - 1, reviewPageIndex + delta));
    renderReviews();
}

function normalizeReviewImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('drive.google.com')) {
            if (parsed.searchParams.get('id')) {
                const fileId = parsed.searchParams.get('id');
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
            }
            const parts = parsed.pathname.split('/');
            const fileId = parts[3];
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
            }
        }
    } catch (error) {
        return url;
    }
    return url;
}

function renderReviews() {
    renderPromotionBanner();
    if (!reviewList || !reviewNoData) return;

    reviewList.innerHTML = "";
    if (state.reviews.length === 0) {
        reviewNoData.classList.remove("hidden");
        reviewPageIndex = 0;
        updateReviewCarouselControls();
        return;
    }

    const totalPages = Math.max(1, Math.ceil(state.reviews.length / REVIEWS_PER_PAGE));
    reviewPageIndex = Math.max(0, Math.min(totalPages - 1, reviewPageIndex));

    reviewNoData.classList.add("hidden");
    const startIndex = reviewPageIndex * REVIEWS_PER_PAGE;
    const pageReviews = state.reviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);
    pageReviews.forEach((review) => {
        const imageUrl = normalizeReviewImageUrl(review.imageUrl);
        const reviewEl = document.createElement("div");
        reviewEl.className = "review-card-item";
        reviewEl.innerHTML = `
            <div class="review-card-top">
                <div class="review-card-author">
                    <div class="review-card-avatar">${review.name.trim().charAt(0).toUpperCase()}</div>
                    <div class="review-card-meta">
                        <p class="review-card-name">${review.name}</p>
                        <div class="review-stars">${renderStars(review.rating)} <span>${review.rating}.0</span></div>
                    </div>
                </div>
                <div class="review-card-date">${review.date}</div>
            </div>
            ${review.synced === false ? `<div class="review-card-status">กำลังเพิ่มรีวิว...</div>` : ""}
            <p class="review-card-comment">${review.comment}</p>
            ${imageUrl ? `<div class="review-card-image"><img src="${imageUrl}" alt="รูปรีวิวของ ${review.name}" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>` : ""}
        `;
        reviewList.appendChild(reviewEl);
    });
    updateReviewCarouselControls();
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

    try {
        const compressedDataUrl = await resizeImageDataUrl(rawDataUrl, 1200, 1200, 0.75);
        if (compressedDataUrl.length <= maximumLength) {
            return compressedDataUrl;
        }

        const moreCompressedDataUrl = await resizeImageDataUrl(rawDataUrl, 900, 900, 0.6);
        if (moreCompressedDataUrl.length <= maximumLength) {
            return moreCompressedDataUrl;
        }

        throw new Error('รูปภาพยังมีขนาดใหญ่เกินไป กรุณาใช้รูปภาพที่มีขนาดเล็กลงหรือบีบอัดให้เล็กกว่าสัก 1.4MB');
    } catch (error) {
        console.warn('compress image failed', error);
        throw error;
    }
}

function isImageFile(file) {
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
    const name = file.name || '';
    return /\.(jpe?g|png|gif|webp)$/i.test(name);
}

function resizeImageFile(file, maxWidth = 900, maxHeight = 900) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
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
                    const output = canvas.toDataURL('image/jpeg', 0.75);
                    resolve(output);
                } catch (error) {
                    reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
                }
            };
            img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        reader.readAsDataURL(file);
    });
}

async function updateImagePreview() {
    if (!reviewImageInput || !reviewImagePreview || !reviewPreviewImg) return;

    const file = reviewImageInput.files && reviewImageInput.files[0];
    if (!file || !isImageFile(file)) {
        reviewImagePreview.classList.add("hidden");
        reviewPreviewImg.src = "";
        reviewPreviewImg.style.display = "none";
        pendingReviewImageDataUrl = null;
        if (file) {
            showToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        }
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        reviewImageInput.value = '';
        reviewImagePreview.classList.add('hidden');
        reviewPreviewImg.src = "";
        reviewPreviewImg.style.display = "none";
        pendingReviewImageDataUrl = null;
        return;
    }

    try {
        pendingReviewImageDataUrl = await createReviewImageDataUrl(file);
        reviewPreviewImg.src = pendingReviewImageDataUrl;
        reviewImagePreview.classList.remove('hidden');
        reviewPreviewImg.style.display = 'block';
    } catch (error) {
        reviewImagePreview.classList.add('hidden');
        reviewPreviewImg.style.display = 'none';
        reviewPreviewImg.src = '';
        pendingReviewImageDataUrl = null;
        showToast(error && error.message ? error.message : 'ไม่สามารถประมวลผลรูปภาพได้ ลองเลือกรูปใหม่', 'error');
    }
}

function resetReviewForm() {
    if (!reviewForm) return;
    reviewForm.reset();
    pendingReviewImageDataUrl = null;
    if (reviewImagePreview) {
        reviewImagePreview.classList.add("hidden");
    }
    if (reviewPreviewImg) {
        reviewPreviewImg.src = "";
        reviewPreviewImg.style.display = "none";
    }
}

function mergeReviews(serverReviews, localReviews = []) {
    const serverIds = new Set(Array.isArray(serverReviews) ? serverReviews.map((item) => String(item.id)) : []);
    const unsyncedLocalReviews = Array.isArray(localReviews)
        ? localReviews.filter((item) => item.synced === false && !serverIds.has(String(item.id)))
        : [];

    const normalizedServerReviews = Array.isArray(serverReviews)
        ? serverReviews.map((item) => ({ ...item, synced: true }))
        : [];

    return [...unsyncedLocalReviews, ...normalizedServerReviews];
}

function getPendingReviews() {
    return state.reviews.filter((item) => item.synced === false);
}

async function syncPendingReviews() {
    const pendingReviews = getPendingReviews();
    if (!pendingReviews.length) {
        clearPendingReviewsStorage();
        return false;
    }

    let syncedAny = false;
    for (const pendingReview of pendingReviews) {
        try {
            const payload = {
                id: pendingReview.id,
                name: pendingReview.name,
                rating: pendingReview.rating,
                comment: pendingReview.comment,
                date: pendingReview.date,
                imageUrl: pendingReview.imageUrl || ''
            };
            const result = await apiPost('submitReview', payload);
            if (result && result.success) {
                const savedReview = result.data && typeof result.data === 'object' ? result.data : null;
                if (savedReview) {
                    savedReview.synced = true;
                    state.reviews = state.reviews.map((item) => item.id === pendingReview.id ? { ...item, ...savedReview } : item);
                } else {
                    state.reviews = state.reviews.map((item) => item.id === pendingReview.id ? { ...item, synced: true } : item);
                }
                syncedAny = true;
            }
        } catch (error) {
            console.warn('syncPendingReviews failed for review', pendingReview.id, error);
        }
    }
    if (syncedAny) {
        persistPendingReviews();
        showToast('ซิงก์เรียบร้อยแล้ว', 'success');
    } else {
        persistPendingReviews();
    }
    return syncedAny;
}

function addReview(review) {
    if (review.synced === undefined) {
        review.synced = true;
    }
    state.reviews.unshift(review);
    renderReviews();
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!reviewForm || !reviewName || !reviewComment || !reviewRating) return;

    const submitButton = reviewForm.querySelector('button[type="submit"]');
    const originalButtonHtml = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...';
    }

    const name = reviewName.value.trim();
    const comment = reviewComment.value.trim();
    const rating = Number(reviewRating.value) || 5;

    if (!name || !comment) {
        showToast("กรุณากรอกชื่อและข้อความรีวิว", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    if (!canSubmitReview()) {
        showToast('ขอโทษครับ คุณสามารถส่งรีวิวได้ครั้งละ 1 เดือนเท่านั้น!!', 'error');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    const review = {
        id: Date.now(),
        name,
        rating,
        comment,
        date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }),
        imageUrl: pendingReviewImageDataUrl || "",
    };

    const file = reviewImageInput && reviewImageInput.files && reviewImageInput.files[0];
    if (file && !isImageFile(file)) {
        showToast("รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
        showToast("กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    if (file && !pendingReviewImageDataUrl) {
        try {
            pendingReviewImageDataUrl = await createReviewImageDataUrl(file);
        } catch (previewError) {
            console.warn('ไม่สามารถอ่านไฟล์รูปภาพก่อนส่งได้', previewError);
            showToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHtml;
            }
            return;
        }
    }

    if (!ensureSiteActive()) {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    recordReviewSubmission();

    const reviewPayload = {
        id: review.id,
        name: review.name,
        rating: review.rating,
        comment: review.comment,
        date: review.date,
        imageUrl: pendingReviewImageDataUrl || "",
    };


    review.synced = false;
    addReview(review);
    resetReviewForm();
    reviewPageIndex = 0;
    persistPendingReviews();
    showToast("กำลังส่งรีวิว...", "info");

    try {
        const result = await apiPost('submitReview', reviewPayload);
        if (result && result.success) {
            const savedReview = result.data && typeof result.data === 'object' ? result.data : null;
            if (savedReview) {
                if (savedReview.synced === undefined) {
                    savedReview.synced = true;
                }
                state.reviews = state.reviews.map((item) => item.id === review.id ? { ...item, ...savedReview } : item);
            }
            await loadSiteData();
            showToast("ขอบคุณสำหรับรีวิวของคุณ!", "success");
        } else {
            throw new Error('API failed');
        }
    } catch (error) {
        state.reviews = state.reviews.map((item) => item.id === review.id ? { ...item, synced: false } : item);
        persistPendingReviews();
        renderReviews();
        const message = error && error.message ? error.message : 'ไม่สามารถส่งรีวิวได้';
        showToast(message, 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
    }
}

function addToCart(productId) {
    if (!ensureSiteActive()) return;
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    if (!product.available) {
        showToast("สินค้านี้ยังไม่พร้อมขาย", "error");
        return;
    }

    const existing = state.cart.find((item) => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    
    renderCart();
    showToast("เพิ่มสินค้าในรถเขนเรียบร้อยแล้ว");
    // ไม่เปิดตะกร้า/ชำระเงินทันทีเมื่อเพิ่มสินค้า
}

function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.id !== productId);
    renderCart();
}

function updateCartQuantity(productId, quantity) {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = state.cart.find((entry) => entry.id === productId);
    if (!item) return;
    item.quantity = quantity;
    renderCart();
}

function openCart() {
    renderCart();
    cartPanel.classList.remove("hidden");
}

function openCheckout() {
    if (!ensureSiteActive()) return;
    if (state.cart.length === 0) {
        showToast("กรุณาเพิ่มสินค้าในตะกร้าก่อนสั่งซื้อ", "error");
        return;
    }

    const lineUrl = "https://line.me/R/ti/p/%40106zyrpm";
    showToast("กำลังเปิด Line เพื่อแจ้งแอดมิน", "success");
    window.location.href = lineUrl;
}

function showPageLoader(show = true) {
    if (!pageLoader) return;
    pageLoader.classList.toggle('hidden', !show);
    document.body.classList.toggle('loading', show);
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const icons = {
        success: "<i class='fas fa-check'></i>",
        error: "<i class='fas fa-exclamation-triangle'></i>",
        info: "<i class='fas fa-info-circle'></i>"
    };

    toast.innerHTML = `
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${message}</span>
    `;

    toast.classList.remove("hidden", "toast--success", "toast--error", "toast--info");
    toast.classList.add("show", `toast--${type}`);

    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2400);
}

function toggleLogin() {
    if (state.user) {
        // Logout
        state.user = null;
        userBadge.classList.add("hidden");
        googleLoginBtn.classList.remove("hidden");
        googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> เข้าสู่ระบบ';
    } else {
        handleGoogleLogin();
    }
}

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // ปิดข้ออื่นทั้งหมดก่อน (เลือกเปิดได้ทีละข้อ)
            faqItems.forEach(i => i.classList.remove('active'));
            
            // ถ้าไม่ได้อยู่ในสถานะเปิด ให้เปิด
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

async function init() {
    renderProducts();
    renderCart();
    renderReviews();
    initFAQ();
    showPageLoader(true);
    try {
        await loadSiteData();
        await syncPendingReviews();
    } catch (error) {
        console.warn('loadSiteData threw error', error);
        showToast('ไม่สามารถเชื่อมต่อ API ได้ โปรดตรวจสอบการ deploy และ URL', 'error');
    } finally {
        showPageLoader(false);
    }

    if (window && window.addEventListener) {
        window.addEventListener('online', syncPendingReviews);
        window.addEventListener('storage', handleAdminReloadEvent);
    }

    if (window) {
        window.adminre = adminReviewConsoleCommand;
        window.reviewModeStatus = getReviewSettings;
        if (window.console && typeof console.info === 'function') {
        }
    }

    setInterval(refreshSiteDataIfChanged, SITE_DATA_POLL_INTERVAL_MS);
    // Update promotion banner every minute to check date/time constraints
    setInterval(renderPromotionBanner, 60000);

    if (googleLoginBtn) googleLoginBtn.addEventListener("click", toggleLogin);
    if (cartBtn) cartBtn.addEventListener("click", openCart);
    if (closeCart) closeCart.addEventListener("click", () => cartPanel.classList.add("hidden"));
    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
    if (reviewImageInput) reviewImageInput.addEventListener("change", updateImagePreview);
    if (reviewForm) reviewForm.addEventListener("submit", handleReviewSubmit);
    if (reviewCarouselPrev) reviewCarouselPrev.addEventListener('click', () => goReviewPage(-1));
    if (reviewCarouselNext) reviewCarouselNext.addEventListener('click', () => goReviewPage(1));
    if (heroShopBtn) heroShopBtn.addEventListener("click", () => {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });

    if (cartPanel) {
        cartPanel.addEventListener("click", (event) => {
            if (event.target === cartPanel) cartPanel.classList.add("hidden");
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
