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
    movies: [],
    discounts: [],
    myOrders: [],
    webSettings: null,
    maintenanceMode: false,
};

const apiBaseUrl = (window.JokeMooConfig && window.JokeMooConfig.apiBaseUrl)
    ? window.JokeMooConfig.apiBaseUrl
    : "https://script.google.com/macros/s/AKfycbyspAWk-Wkf4qShYeswphtQt5iCe2q7hccdDu6G4rd648hdgzNLOlLUMsPVvZmRL0XF/exec";
const productCategories = {
    netflix: "Netflix Premium",
    other: "แอพอื่น",
};

const optimizedLocalImages = Object.freeze({
    'netflix19.png': 'assets/optimized/netflix19.webp',
    'netflix39.png': 'assets/optimized/netflix39.webp',
    'netflix59.png': 'assets/optimized/netflix59.webp',
    'netflix109.png': 'assets/optimized/netflix109.webp',
    'netflix169.png': 'assets/optimized/netflix169.webp',
    'netflix189.png': 'assets/optimized/netflix189.webp',
    'netflix.png': 'assets/optimized/netflix.webp',
    'youtube.png': 'assets/optimized/youtube.webp',
    'iqiy.png': 'assets/optimized/iqiy.webp',
    'wetv.png': 'assets/optimized/wetv.webp',
    'www.png': 'assets/optimized/www.webp',
    'logo.png': 'assets/optimized/logo.webp',
});

function getOptimizedLocalImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const clean = url.trim();
    if (!clean || /^(?:https?:|data:|blob:|\/\/)/i.test(clean)) return clean;
    const normalized = clean.replace(/^\.\//, '');
    return optimizedLocalImages[normalized] || clean;
}

let siteDataCache = null;
const REVIEWS_PER_PAGE = 4;
const PENDING_REVIEWS_STORAGE_KEY = 'jokemoo_pending_reviews';
const REVIEW_SETTINGS_STORAGE_KEY = 'jokemoo_review_settings';
const ADMIN_RELOAD_STORAGE_KEY = 'jokemoo_admin_reload';
const LIVE_SYNC_STORAGE_KEY = 'jokemoo_live_sync';
const LIVE_SYNC_CHANNEL_NAME = 'jokemoo_live_sync_v1';
const CHECKOUT_RETURN_STORAGE_KEY = 'jokemoo_checkout_returned_from_line';
const SITE_DATA_POLL_INTERVAL_MS = 5000;
let siteRefreshInFlight = false;
let lastSiteDataSignature = '';
let liveSyncChannel = null;
let realtimeRefreshTimer = 0;
let reviewPageIndex = 0;
let pendingReviewImageDataUrl = null;

// App page navigation
let activePage = 'home';
let activeProductCategory = 'all';
const appPageTitles = {
    home: 'หน้าแรก',
    products: 'แพ็คเกจสินค้า',
    wheel: 'วงล้อสุ่มโชค',
    reviews: 'รีวิวลูกค้า',
    promotions: 'โปรโมชั่น',
    'movies-top': 'หนังติด TOP',
    'movies-upcoming': 'หนังที่ใกล้จะเข้า',
    'my-orders': 'ประวัติการซื้อของฉัน',
    faq: 'คำถามที่พบบ่อย',
};
const appPageTitlesEn = {
    home: 'Home',
    products: 'Packages',
    wheel: 'Lucky Wheel',
    reviews: 'Customer Reviews',
    promotions: 'Promotions',
    'movies-top': 'Top Movies',
    'movies-upcoming': 'Coming Soon',
    'my-orders': 'My Orders',
    faq: 'FAQ',
};

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
    if (event.key !== ADMIN_RELOAD_STORAGE_KEY && event.key !== LIVE_SYNC_STORAGE_KEY) return;
    requestRealtimeRefresh(80);
}

function requestRealtimeRefresh(delay = 120) {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
        if (!document.hidden) refreshSiteDataIfChanged();
    }, Math.max(0, Number(delay) || 0));
}

function notifyRealtimePeers(reason = 'storefront-change') {
    const payload = { reason, at: Date.now() };
    try { window.localStorage.setItem(LIVE_SYNC_STORAGE_KEY, JSON.stringify(payload)); } catch (_) {}
    try { liveSyncChannel?.postMessage(payload); } catch (_) {}
}

function initRealtimeSync() {
    try {
        if ('BroadcastChannel' in window) {
            liveSyncChannel = new BroadcastChannel(LIVE_SYNC_CHANNEL_NAME);
            liveSyncChannel.addEventListener('message', () => requestRealtimeRefresh(60));
        }
    } catch (_) { liveSyncChannel = null; }
    window.addEventListener('focus', () => requestRealtimeRefresh(30), { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRealtimeRefresh(30); }, { passive: true });
}

async function refreshSiteDataIfChanged() {
    if (siteRefreshInFlight || document.hidden || document.body.classList.contains('checkout-active')) return;
    siteRefreshInFlight = true;
    try {
        siteDataCache = null;
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

        if (Array.isArray(siteData.products)) {
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
        applyPromotionAndMovieData(siteData.promotions);
        renderPromotionBanner();
        renderMovies();
        renderProducts();
        renderReviews();
        applyMaintenanceMode(state.maintenanceMode);
    } catch (error) {
        console.warn('refreshSiteDataIfChanged failed:', error);
    } finally {
        siteRefreshInFlight = false;
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
const topMoviesGrid = document.getElementById("topMoviesGrid");
const upcomingMoviesGrid = document.getElementById("upcomingMoviesGrid");
const topMovieCount = document.getElementById("topMovieCount");
const upcomingMovieCount = document.getElementById("upcomingMovieCount");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutPanel = document.getElementById("checkoutPanel");
const closeCheckout = document.getElementById("closeCheckout");
const discountCodeInput = document.getElementById("discountCodeInput");
const applyDiscountBtn = document.getElementById("applyDiscountBtn");
const discountFeedback = document.getElementById("discountFeedback");
const checkoutBackToCart = document.getElementById("checkoutBackToCart");
const checkoutToPayment = document.getElementById("checkoutToPayment");
const checkoutBackDiscount = document.getElementById("checkoutBackDiscount");
const checkoutToConfirm = document.getElementById("checkoutToConfirm");
const checkoutBackPayment = document.getElementById("checkoutBackPayment");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const checkoutOrderReceipt = document.getElementById("checkoutOrderReceipt");
const checkoutOrderNumber = document.getElementById("checkoutOrderNumber");
const paymentDetail = document.getElementById("paymentDetail");
const checkoutSummaryStep1 = document.getElementById("checkoutSummaryStep1");
const checkoutSummaryStep2 = document.getElementById("checkoutSummaryStep2");
const checkoutFinalSummary = document.getElementById("checkoutFinalSummary");
const closeCart = document.getElementById("closeCart");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const userBadge = document.getElementById("userBadge");
const heroShopBtn = document.getElementById("heroShopBtn");
const heroReviewBtn = document.getElementById("heroReviewBtn");
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
const promotionEmptyState = document.getElementById("promotionEmptyState");
const promotionActiveCount = document.getElementById("promotionActiveCount");
const promotionUpcomingCount = document.getElementById("promotionUpcomingCount");

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
        notifyRealtimePeers(action);
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

const MOVIE_PROMO_PREFIX = '__JM_MOVIE__';
const DISCOUNT_PROMO_PREFIX = '__JM_DISCOUNT__';
const ORDER_PROMO_PREFIX = '__JM_ORDER__';
const SETTINGS_PROMO_PREFIX = '__JM_SETTINGS__';
const ADMIN_USER_PROMO_PREFIX = '__JM_ADMIN_USER__';

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
        title: meta.title || fallbackTitle || 'Movie',
        titleEn: meta.titleEn || '',
        type: meta.type === 'upcoming' ? 'upcoming' : 'top',
        rank: Number(meta.rank) || 0,
        releaseDate: meta.releaseDate || promo.startAt || '',
        note: meta.note || '',
        noteEn: meta.noteEn || '',
        image: promo.image || promo.imageUrl || '',
        enabled: meta.enabled !== false,
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
    const usedClients = Array.isArray(meta.usedClients) ? meta.usedClients.map(String) : [];
    const clientUses = meta.clientUses && typeof meta.clientUses === 'object' && !Array.isArray(meta.clientUses) ? meta.clientUses : {};
    return {
        id: promo.id,
        code: String(meta.code || fallbackCode || '').trim().toUpperCase(),
        type: meta.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(meta.value) || 0),
        minSpend: Math.max(0, Number(meta.minSpend) || 0),
        startAt: meta.startAt || promo.startAt || '',
        endAt: meta.endAt || promo.endAt || '',
        enabled: meta.enabled !== false && promo.enabled !== false,
        maxPeople: Math.max(0, Math.floor(Number(meta.maxPeople) || 0)),
        maxUsesPerPerson: Math.max(0, Math.floor(meta.maxUsesPerPerson === undefined || meta.maxUsesPerPerson === null || meta.maxUsesPerPerson === '' ? 1 : Number(meta.maxUsesPerPerson))),
        usedCount: Math.max(0, Math.floor(Number(meta.usedCount) || 0)),
        usedClients,
        clientUses,
        _sourcePromotion: promo,
    };
}

function isOrderPromotionRecord(promo) {
    return !!(promo && String(promo.title || '').startsWith(ORDER_PROMO_PREFIX));
}

function parseStoreOrderPromotionRecord(promo) {
    if (!isOrderPromotionRecord(promo)) return null;
    try {
        const meta = JSON.parse(String(promo.description || '{}'));
        const fallback = String(promo.title || '').slice(ORDER_PROMO_PREFIX.length).replace(/^\|/, '').trim();
        return { ...meta, orderNo: meta.orderNo || fallback, _recordId: promo.id };
    } catch (_) { return null; }
}

function isAdminUserPromotionRecord(promo) { return !!(promo && String(promo.title || '').startsWith(ADMIN_USER_PROMO_PREFIX)); }

function isSettingsPromotionRecord(promo) {
    return !!(promo && String(promo.title || '').startsWith(SETTINGS_PROMO_PREFIX));
}

function parseWebSettingsRecord(promo) {
    if (!isSettingsPromotionRecord(promo)) return null;
    try {
        const meta = JSON.parse(String(promo.description || '{}'));
        return { ...meta, _recordId: promo.id };
    } catch (_) { return null; }
}

function getDefaultWheelRates() {
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

function normalizeWebSettings(settings) {
    const base = settings && typeof settings === 'object' ? settings : {};
    const rates = Array.isArray(base.wheelRates) && base.wheelRates.length ? base.wheelRates : getDefaultWheelRates();
    const fallbackPayment = (window.JokeMooConfig && window.JokeMooConfig.payment) || {};
    const payment = base.payment && typeof base.payment === 'object' ? base.payment : {};
    const contacts = base.contacts && typeof base.contacts === 'object' ? base.contacts : {};
    return {
        ...base,
        lineUrl: String(base.lineUrl || 'https://line.me/R/ti/p/%40106zyrpm').trim(),
        contacts: {
            pageUrl: String(contacts.pageUrl || base.pageUrl || '').trim(),
            ownerUrl: String(contacts.ownerUrl || base.ownerUrl || '').trim(),
        },
        payment: {
            bankName: String(payment.bankName || fallbackPayment.bankName || '').trim(),
            accountName: String(payment.accountName || fallbackPayment.accountName || 'JokeMoo Store').trim(),
            accountNumber: String(payment.accountNumber || fallbackPayment.accountNumber || '').trim(),
            qrImage: String(payment.qrImage || fallbackPayment.qrImage || '').trim(),
        },
        wheelRates: rates.map((item, index) => ({
            id: String(item.id || `prize-${index+1}`),
            label: String(item.label || `รางวัล ${index+1}`),
            rate: Math.max(0, Number(item.rate) || 0),
        }))
    };
}

function getStoreSettings() { return normalizeWebSettings(state.webSettings || {}); }
function getLineContactUrl() { return getStoreSettings().lineUrl || 'https://line.me/R/ti/p/%40106zyrpm'; }
function getPaymentSettings() { return getStoreSettings().payment || {}; }
function getStoreContacts() { return getStoreSettings().contacts || {}; }
function setConfiguredContactLink(id, url) {
    const link = document.getElementById(id);
    if (!link) return;
    const clean = String(url || '').trim();
    if (clean) {
        link.href = clean;
        link.dataset.configured = 'true';
        link.classList.remove('is-unconfigured');
        link.removeAttribute('aria-disabled');
    } else {
        link.href = '#';
        link.dataset.configured = 'false';
        link.classList.add('is-unconfigured');
        link.setAttribute('aria-disabled', 'true');
    }
}
function applyStoreSettingsToUi() {
    const lineUrl = getLineContactUrl();
    document.querySelectorAll('a[href*="line.me"], a[href*="lin.ee"]').forEach((anchor) => { anchor.href = lineUrl; });
    const contacts = getStoreContacts();
    setConfiguredContactLink('contactLineLink', lineUrl);
    setConfiguredContactLink('contactPageLink', contacts.pageUrl);
    setConfiguredContactLink('contactOwnerLink', contacts.ownerUrl);
}
function buildLineRedirectUrl(message) {
    const base = getLineContactUrl();
    if (/line\.me\/R\/oaMessage\//i.test(base)) return base.replace(/\?.*$/, '').replace(/\/?$/, '/') + '?' + encodeURIComponent(message || '');
    return base;
}

function applyPromotionAndMovieData(records) {
    const list = Array.isArray(records) ? records : [];
    state.movies = list.map(parseMoviePromotionRecord).filter(Boolean);
    state.discounts = list.map(parseDiscountPromotionRecord).filter(Boolean);
    const currentClientId = getCheckoutClientId();
    state.myOrders = list.map(parseStoreOrderPromotionRecord).filter((order) => order && String(order.clientId || '') === String(currentClientId)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const settingsRecords = list.map(parseWebSettingsRecord).filter(Boolean);
    state.webSettings = normalizeWebSettings(settingsRecords.length ? settingsRecords[settingsRecords.length - 1] : null);
    state.promotions = list.filter((promo) => !isMoviePromotionRecord(promo) && !isDiscountPromotionRecord(promo) && !isOrderPromotionRecord(promo) && !isSettingsPromotionRecord(promo) && !isAdminUserPromotionRecord(promo));
    applyStoreSettingsToUi();
    renderMyOrders();
    if (typeof renderPaymentDetail === 'function') renderPaymentDetail();
    const wheelFrame = document.getElementById('wheelFrame');
    if (wheelFrame && wheelFrame.src) applyWheelSettingsToFrame(wheelFrame);
}

function escapeMovieText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatMovieReleaseDate(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    return new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function renderMovieCard(movie, index) {
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const title = escapeMovieText(isEnglish && movie.titleEn ? movie.titleEn : movie.title);
    const note = escapeMovieText(isEnglish && movie.noteEn ? movie.noteEn : movie.note);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(movie.image || ''));
    const isTop = movie.type === 'top';
    const rank = Number(movie.rank) > 0 ? Number(movie.rank) : index + 1;
    const dateText = formatMovieReleaseDate(movie.releaseDate);
    return `
        <article class="movie-card ${isTop ? 'is-top' : 'is-upcoming'}">
            <div class="movie-poster-wrap">
                ${imageUrl ? `<img class="movie-poster" src="${escapeMovieText(imageUrl)}" alt="${title}" loading="lazy" decoding="async">` : `<div class="movie-poster movie-poster-placeholder"><i class="fas fa-film"></i><span>JOKEMOO</span></div>`}
                ${isTop ? `<span class="movie-rank-badge"><small>TOP</small><b>${rank}</b></span>` : `<span class="movie-coming-badge"><i class="fas fa-clock"></i>${isEnglish ? 'SOON' : 'เร็ว ๆ นี้'}</span>`}
                <div class="movie-poster-shade"></div>
            </div>
            <div class="movie-card-body">
                <div class="movie-card-title-row"><h4>${title}</h4>${!isTop && dateText ? `<span><i class="far fa-calendar"></i>${escapeMovieText(dateText)}</span>` : ''}</div>
                ${note ? `<p>${note}</p>` : `<p class="movie-muted">${isEnglish ? 'Details will be updated soon.' : 'รายละเอียดจะอัปเดตเร็ว ๆ นี้'}</p>`}
                ${!isTop && dateText ? `<div class="movie-release-line"><i class="fas fa-ticket"></i><span>${isEnglish ? 'Release' : 'กำหนดเข้า'} <b>${escapeMovieText(dateText)}</b></span></div>` : ''}
            </div>
        </article>`;
}

function renderMovies() {
    const visible = Array.isArray(state.movies) ? state.movies.filter((movie) => movie && movie.enabled !== false) : [];
    const top = visible.filter((movie) => movie.type === 'top').sort((a,b) => (Number(a.rank)||999) - (Number(b.rank)||999));
    const upcoming = visible.filter((movie) => movie.type === 'upcoming').sort((a,b) => String(a.releaseDate||'9999').localeCompare(String(b.releaseDate||'9999')));
    if (topMovieCount) topMovieCount.textContent = String(top.length);
    if (upcomingMovieCount) upcomingMovieCount.textContent = String(upcoming.length);
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    if (topMoviesGrid) topMoviesGrid.innerHTML = top.length ? top.map(renderMovieCard).join('') : `<div class="movie-empty"><i class="fas fa-trophy"></i><strong>${isEnglish ? 'No top movies yet' : 'ยังไม่มีหนังติด TOP'}</strong><small>${isEnglish ? 'Add movies in Admin and they will appear here automatically.' : 'ขณะนี้ยังไม่มีหนังติด TOP แสดงผล'}</small></div>`;
    if (upcomingMoviesGrid) upcomingMoviesGrid.innerHTML = upcoming.length ? upcoming.map(renderMovieCard).join('') : `<div class="movie-empty"><i class="fas fa-calendar-plus"></i><strong>${isEnglish ? 'No upcoming movies yet' : 'ยังไม่มีหนังที่ใกล้จะเข้า'}</strong><small>${isEnglish ? 'Add movies in Admin and they will appear here automatically.' : 'ขณะนี้ยังไม่มีหนังที่ใกล้จะเข้า แสดงผล'}</small></div>`;
}

function getPromotionTimeState(promo) {
    if (!promo || !promo.enabled) return 'disabled';

    const now = new Date();
    const startDate = parsePromotionDate(promo.startAt);
    const endDate = parsePromotionDate(promo.endAt);

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    if (startDate && startDate > now) return 'upcoming';
    if (endDate && endDate < now) return 'expired';
    return 'active';
}

function isPromotionActive(promo) {
    return getPromotionTimeState(promo) === 'active';
}

function escapePromotionText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPromotionDateRange(promo) {
    const startLabel = formatPromotionDate(promo && promo.startAt);
    const endLabel = formatPromotionDate(promo && promo.endAt);
    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
    const en = window.JMI18n && window.JMI18n.lang === 'en';
    if (startLabel) return `${en ? 'Start' : 'เริ่ม'} ${startLabel}`;
    if (endLabel) return `${en ? 'Until' : 'ถึง'} ${endLabel}`;
    return en ? 'No date limit' : 'ไม่จำกัดวัน';
}

function getPromotionStateLabel(stateName) {
    const en = window.JMI18n && window.JMI18n.lang === 'en';
    if (stateName === 'upcoming') return en ? 'Coming Soon' : 'เร็ว ๆ นี้';
    return en ? 'Active' : 'กำลังใช้งาน';
}

function getPromotionSortValue(promo) {
    const start = parsePromotionDate(promo && promo.startAt);
    return start ? start.getTime() : 0;
}

function renderPromotionFeaturedCard(promo) {
    const promoState = getPromotionTimeState(promo);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || ''));
    const title = escapePromotionText(promo.title || promo.name || 'โปรสุดคุ้มวันนี้');
    const description = escapePromotionText(promo.description || promo.desc || 'เลือกโปรดี ๆ ลดแรงก่อนใคร');
    const dateRange = escapePromotionText(getPromotionDateRange(promo));
    const stateLabel = getPromotionStateLabel(promoState);

    return `
        <article class="promotion-featured-card ${promoState === 'upcoming' ? 'is-upcoming' : ''}">
            <div class="promotion-featured-copy">
                <div class="promotion-featured-badges">
                    <span class="promotion-status-badge ${promoState}"><i class="fas ${promoState === 'upcoming' ? 'fa-clock' : 'fa-bolt'}"></i>${stateLabel}</span>
                    <span class="promotion-featured-label">โปรเด่น</span>
                </div>
                <h3>${title}</h3>
                <p>${description}</p>
                <div class="promotion-featured-meta">
                    <span><i class="far fa-calendar-alt"></i>${dateRange}</span>
                    <span><i class="fas fa-shield-alt"></i>JokeMoo Store</span>
                </div>
                <div class="promotion-featured-actions">
                    <a class="promotion-contact-button" href="${getLineContactUrl()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i> ติดต่อรับโปร</a>
                    ${imageUrl ? `<button class="promotion-view-image" type="button" data-promo-image="${escapePromotionText(imageUrl)}"><i class="far fa-image"></i> ดูรูปเต็ม</button>` : ''}
                </div>
            </div>
            <div class="promotion-featured-visual ${imageUrl ? '' : 'no-image'}">
                ${imageUrl ? `<button class="promotion-image-button" type="button" data-promo-image="${escapePromotionText(imageUrl)}" aria-label="ดูรูปโปรโมชั่น ${title}"><img src="${escapePromotionText(imageUrl)}" alt="${title}" loading="lazy" decoding="async"><span><i class="fas fa-expand-alt"></i></span></button>` : `<div class="promotion-placeholder-art"><i class="fas fa-gift"></i><strong>JOKEMOO</strong><small>PROMOTION</small></div>`}
            </div>
        </article>
    `;
}

function renderPromotionMiniCard(promo) {
    const promoState = getPromotionTimeState(promo);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || ''));
    const title = escapePromotionText(promo.title || promo.name || 'โปรโมชั่นพิเศษ');
    const description = escapePromotionText(promo.description || promo.desc || 'โปรพิเศษสำหรับลูกค้า JokeMoo');
    const dateRange = escapePromotionText(getPromotionDateRange(promo));
    const stateLabel = getPromotionStateLabel(promoState);

    return `
        <article class="promotion-card ${promoState === 'upcoming' ? 'is-upcoming' : ''}">
            <div class="promotion-card-media ${imageUrl ? '' : 'no-image'}">
                ${imageUrl ? `<button class="promotion-image-button" type="button" data-promo-image="${escapePromotionText(imageUrl)}" aria-label="ดูรูปโปรโมชั่น ${title}"><img src="${escapePromotionText(imageUrl)}" alt="${title}" loading="lazy" decoding="async"><span><i class="fas fa-expand-alt"></i></span></button>` : `<div class="promotion-placeholder-art"><i class="fas fa-tags"></i><strong>JOKEMOO</strong><small>PROMO</small></div>`}
                <span class="promotion-status-badge ${promoState}"><i class="fas ${promoState === 'upcoming' ? 'fa-clock' : 'fa-check-circle'}"></i>${stateLabel}</span>
            </div>
            <div class="promotion-card-body">
                <div class="promotion-card-date"><i class="far fa-calendar-alt"></i>${dateRange}</div>
                <h3>${title}</h3>
                <p>${description}</p>
                <div class="promotion-card-actions">
                    <a href="${getLineContactUrl()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i> รับโปรโมชั่น</a>
                    ${imageUrl ? `<button type="button" data-promo-image="${escapePromotionText(imageUrl)}" aria-label="ดูรายละเอียดรูปโปรโมชั่น"><i class="far fa-eye"></i></button>` : ''}
                </div>
            </div>
        </article>
    `;
}

function updatePromotionSummary(activeCount, upcomingCount) {
    if (promotionActiveCount) promotionActiveCount.textContent = String(activeCount);
    if (promotionUpcomingCount) promotionUpcomingCount.textContent = String(upcomingCount);
}

function renderPromotionBanner() {
    if (!promotionBanner) return;

    const enabledPromotions = Array.isArray(state.promotions)
        ? state.promotions.filter((promo) => promo && promo.enabled)
        : [];

    const activePromotions = enabledPromotions
        .filter((promo) => getPromotionTimeState(promo) === 'active')
        .sort((a, b) => getPromotionSortValue(b) - getPromotionSortValue(a));
    const upcomingPromotions = enabledPromotions
        .filter((promo) => getPromotionTimeState(promo) === 'upcoming')
        .sort((a, b) => getPromotionSortValue(a) - getPromotionSortValue(b));

    updatePromotionSummary(activePromotions.length, upcomingPromotions.length);

    if (!activePromotions.length && !upcomingPromotions.length) {
        promotionBanner.classList.add('hidden');
        promotionBanner.innerHTML = '';
        if (promotionEmptyState) promotionEmptyState.classList.remove('hidden');
        return;
    }

    if (promotionEmptyState) promotionEmptyState.classList.add('hidden');
    promotionBanner.classList.remove('hidden');
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const dealSuffix = (count) => isEnglish ? `${count} deals` : `${count} โปร`;

    promotionBanner.innerHTML = `
        ${activePromotions.length ? `
            <div class="promotion-list-section promotion-list-section-primary">
                <div class="promotion-list-heading">
                    <div><span>ACTIVE DEALS</span><h3>โปรที่กำลังใช้งาน</h3></div>
                    <b>${dealSuffix(activePromotions.length)}</b>
                </div>
                <div class="promotion-grid">${activePromotions.map(renderPromotionMiniCard).join('')}</div>
            </div>
        ` : ''}
        ${upcomingPromotions.length ? `
            <div class="promotion-list-section promotion-upcoming-section">
                <div class="promotion-list-heading">
                    <div><span>COMING SOON</span><h3>โปรโมชั่นที่กำลังจะมา</h3></div>
                    <b>${dealSuffix(upcomingPromotions.length)}</b>
                </div>
                <div class="promotion-grid">${upcomingPromotions.map(renderPromotionMiniCard).join('')}</div>
            </div>
        ` : ''}
    `;
}

function attachPromotionBannerEvents() {
    if (!promotionBanner || promotionBanner.dataset.promoEventsBound === '1') return;
    promotionBanner.dataset.promoEventsBound = '1';
    promotionBanner.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-promo-image]');
        if (!trigger || !promotionBanner.contains(trigger)) return;
        const imageUrl = trigger.dataset.promoImage;
        if (imageUrl) openPromotionImageModal(imageUrl);
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

function getActivePromotion() {
    if (!Array.isArray(state.promotions) || state.promotions.length === 0) return null;
    // If a local override exists in config, prefer it
    try {
        const cfg = window && window.JokeMooConfig;
        if (cfg && Array.isArray(cfg.promotions) && cfg.promotions.length) {
            const cfgPromo = cfg.promotions.find(p => p && p.enabled) || cfg.promotions[0];
            if (cfgPromo) return cfgPromo;
        }
    } catch (e) {
        // ignore
    }
    return state.promotions.find(isPromotionActive) || state.promotions[0] || null;
}

function openPromotionsModal() {
    const promo = getActivePromotion();
    const title = (promo && (promo.title || promo.name)) || 'โปรโมชั่นวงล้อ';
    const description = (promo && (promo.description || promo.desc)) || 'กดดูรายละเอียดโปรโมชั่นก่อนเข้าชมวงล้อ';
    const imageUrl = promo ? normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || '')) : '';
    const targetUrl = 'https://jokemoomovieluckwheel.github.io/wheelnew/';

    let modal = document.getElementById('promotionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'promotionsModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal-content promotion-modal-content">
                <button class="modal-close" aria-label="ปิด"><i class="fas fa-times"></i></button>
                <div class="promotion-modal-body">
                    <div class="promotion-modal-image-wrap"></div>
                    <div class="promotion-modal-info">
                        <h2 class="promotion-modal-title"></h2>
                        <p class="promotion-modal-desc"></p>
                        <div class="promotion-modal-actions">
                            <button class="button button-primary open-promo-site">ไปยังวงล้อ</button>
                            <button class="button button-outline close-promo">ปิด</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('.close-promo').addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
        modal.querySelector('.open-promo-site').addEventListener('click', () => {
            window.open(targetUrl, '_blank');
        });
    }

    const titleEl = modal.querySelector('.promotion-modal-title');
    const descEl = modal.querySelector('.promotion-modal-desc');
    const imageWrap = modal.querySelector('.promotion-modal-image-wrap');

    titleEl.textContent = title;
    descEl.textContent = description;
    imageWrap.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="${title}" style="max-width:360px; width:100%; border-radius:12px;" />` : `<img src="assets/optimized/logo.webp" alt="${title}" style="max-width:240px; width:100%; border-radius:12px;" />`;

    modal.classList.remove('hidden');
}

function renderProducts() {
    if (!productsContainer) return;

    const categoryOrder = activeProductCategory === 'all'
        ? ["netflix", "other"]
        : [activeProductCategory];
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
                                        <img src="${getOptimizedLocalImageUrl(product.image)}" alt="${product.name}" class="product-image" loading="lazy" decoding="async" />
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

    if (state.cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty-state">
                <span class="cart-empty-icon"><i class="fas fa-basket-shopping"></i></span>
                <strong>ยังไม่มีสินค้าในตะกร้า</strong>
                <small>เลือกแพ็กเกจจากหน้าสินค้า แล้วรายการจะมาแสดงตรงนี้</small>
                <button type="button" class="cart-go-shop" data-cart-go-shop><i class="fas fa-box-open"></i> เลือกแพ็กเกจ</button>
            </div>`;
        cartTotal.innerHTML = "฿0 <span class='price-unit'>/ บาท</span>";
        cartCount.textContent = "0";
        return;
    }

    const cartHtml = state.cart.map((item) => {
        const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
        const image = getOptimizedLocalImageUrl(item.image || '');
        return `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-thumb">
                ${image ? `<img src="${image}" alt="${item.name}" loading="lazy" decoding="async">` : `<i class="fas fa-clapperboard"></i>`}
            </div>
            <div class="cart-item-info">
                <div class="cart-item-title-row">
                    <div><strong>${item.name}</strong><small>JokeMoo Premium</small></div>
                    <button class="cart-remove-btn" data-id="${item.id}" type="button" aria-label="ลบ"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="cart-item-meta">
                    <span class="cart-unit-price">฿${item.price}</span>
                    <div class="quantity-controls" aria-label="จำนวน">
                        <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}"><i class="fas fa-minus"></i></button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}"><i class="fas fa-plus"></i></button>
                    </div>
                    <strong class="cart-line-total">฿${subtotal}</strong>
                </div>
            </div>
        </div>`;
    }).join('');

    cartItems.innerHTML = cartHtml;

    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    cartTotal.innerHTML = `฿${total} <span class='price-unit'>/ บาท</span>`;
    cartCount.textContent = count;
}

function handleCartItemsClick(event) {
    const target = event.target;
    const goShop = target.closest('[data-cart-go-shop]');
    if (goShop) {
        if (cartPanel) cartPanel.classList.add('hidden');
        navigateToPage('products');
        return;
    }
    const button = target.closest('button');
    if (!button || !cartItems.contains(button)) return;

    const productId = Number(button.dataset.id);
    if (!productId) return;

    const action = button.dataset.action;
    if (action === 'increase' || action === 'decrease') {
        const item = state.cart.find((entry) => entry.id === productId);
        if (!item) return;
        const newQuantity = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
        updateCartQuantity(productId, newQuantity);
        return;
    }

    if (button.classList.contains('cart-remove-btn')) {
        removeFromCart(productId);
    }
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
            applyPromotionAndMovieData(siteData.promotions);
            const pendingLocal = loadStoredPendingReviews();
            if (pendingLocal.length) {
                state.reviews = mergeReviews(state.reviews, pendingLocal);
            }
            state.maintenanceMode = !!siteData.maintenanceMode;
            renderPromotionBanner();
            renderProducts();
            renderReviews();
            renderMovies();
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
        state.movies = [];
        state.promotions = (window.JokeMooConfig && Array.isArray(window.JokeMooConfig.promotions))
            ? window.JokeMooConfig.promotions.slice()
            : [];
        state.maintenanceMode = false;
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        renderMovies();
        applyMaintenanceMode(false);
    } catch (error) {
        console.warn('loadProductsAndReviewsFallback failed:', error);
        state.products = products;
        state.reviews = defaultReviews;
        state.movies = [];
        state.promotions = (window.JokeMooConfig && Array.isArray(window.JokeMooConfig.promotions))
            ? window.JokeMooConfig.promotions.slice()
            : [];
        state.maintenanceMode = false;
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        renderMovies();
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
    if (cartPanel) {
        cartPanel.classList.remove("hidden");
    }
    requestAnimationFrame(() => {
        renderCart();
    });
}

function formatMyOrderDate(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '-';
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    return new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getStorePaymentLabel(method) {
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    if (method === 'qr') return isEnglish ? 'PromptPay QR' : 'QR พร้อมเพย์';
    if (method === 'bank') return isEnglish ? 'Bank transfer' : 'เลขบัญชี';
    return isEnglish ? 'Not specified' : 'ไม่ระบุ';
}

function upsertMyOrder(order) {
    if (!order || String(order.clientId || '') !== String(getCheckoutClientId())) return;
    const list = Array.isArray(state.myOrders) ? state.myOrders.slice() : [];
    const index = list.findIndex((item) => String(item.orderNo) === String(order.orderNo));
    if (index >= 0) list[index] = { ...list[index], ...order };
    else list.unshift(order);
    state.myOrders = list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    renderMyOrders();
}

function renderMyOrders() {
    const listEl = document.getElementById('myOrdersList');
    if (!listEl) return;
    const orders = Array.isArray(state.myOrders) ? state.myOrders : [];
    const countEl = document.getElementById('myOrdersCount');
    const totalEl = document.getElementById('myOrdersTotal');
    const discountCountEl = document.getElementById('myOrdersDiscountCount');
    if (countEl) countEl.textContent = String(orders.length);
    if (totalEl) totalEl.textContent = money(orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0));
    if (discountCountEl) discountCountEl.textContent = String(orders.filter((order) => order.discount && order.discount.code).length);

    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    if (!orders.length) {
        listEl.innerHTML = `<div class="my-orders-empty"><i class="fas fa-bag-shopping"></i><strong>${isEnglish ? 'No purchase history yet' : 'ยังไม่มีประวัติการซื้อ'}</strong><small>${isEnglish ? 'Orders created successfully on this browser will appear here automatically.' : 'เมื่อสั่งซื้อและสร้างเลขออเดอร์สำเร็จ รายการจะขึ้นที่นี่อัตโนมัติ'}</small></div>`;
        return;
    }

    listEl.innerHTML = orders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const discount = order.discount && order.discount.code ? order.discount : null;
        const itemPreview = items.slice(0, 2).map((item) => `<span>${escapeMovieText(item.name || '-') } × ${Math.max(1, Number(item.quantity) || 1)}</span>`).join('');
        const extra = items.length > 2 ? `<small>+${items.length - 2} ${isEnglish ? 'more' : 'รายการ'}</small>` : '';
        const discountText = discount ? `<span class="my-order-discount"><i class="fas fa-ticket"></i>${escapeMovieText(discount.code)}</span>` : `<span class="my-order-no-discount">${isEnglish ? 'No discount code' : 'ไม่ใช้โค้ดส่วนลด'}</span>`;
        const detailItems = items.map((item) => `<div><span>${escapeMovieText(item.name || '-')} × ${Math.max(1, Number(item.quantity) || 1)}</span><b>${money((Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1))}</b></div>`).join('');
        return `<article class="my-order-card">
            <div class="my-order-card-top">
                <div class="my-order-number-wrap"><span>${isEnglish ? 'ORDER' : 'เลขออเดอร์'}</span><strong>${escapeMovieText(order.orderNo || '-')}</strong></div>
                <span class="my-order-status"><i class="fas fa-circle-check"></i>${isEnglish ? 'Confirmed' : 'ยืนยันแล้ว'}</span>
            </div>
            <div class="my-order-meta"><span><i class="far fa-clock"></i>${formatMyOrderDate(order.createdAt)}</span><span><i class="fas ${order.paymentMethod === 'qr' ? 'fa-qrcode' : 'fa-building-columns'}"></i>${getStorePaymentLabel(order.paymentMethod)}</span></div>
            <div class="my-order-preview">${itemPreview}${extra}</div>
            <div class="my-order-price-row"><div>${discountText}</div><div><span>${isEnglish ? 'Paid' : 'ยอดสุทธิ'}</span><strong>${money(order.total)}</strong></div></div>
            <details class="my-order-details">
                <summary><span><i class="fas fa-eye"></i>${isEnglish ? 'View details' : 'ดูรายละเอียด'}</span><i class="fas fa-chevron-down"></i></summary>
                <div class="my-order-details-body">
                    <div class="my-order-detail-items">${detailItems || `<div><span>${isEnglish ? 'No item data' : 'ไม่มีข้อมูลสินค้า'}</span></div>`}</div>
                    <div class="my-order-detail-totals"><div><span>${isEnglish ? 'Subtotal' : 'ยอดสินค้า'}</span><b>${money(order.subtotal)}</b></div><div><span>${isEnglish ? 'Discount' : 'ส่วนลด'}</span><b>-${money(order.discountAmount)}</b></div><div class="grand"><span>${isEnglish ? 'Total' : 'ยอดชำระ'}</span><b>${money(order.total)}</b></div></div>
                    ${discount ? `<div class="my-order-coupon-info"><i class="fas fa-ticket"></i><span>${isEnglish ? 'Discount code' : 'โค้ดส่วนลด'} <b>${escapeMovieText(discount.code)}</b> · ${discount.type === 'fixed' ? `${isEnglish ? 'Fixed' : 'ลดเงิน'} ${money(discount.value)}` : `${Number(discount.value) || 0}%`}</span></div>` : ''}
                </div>
            </details>
            <div class="my-order-actions"><button type="button" class="button button-outline my-order-copy" data-order-number="${escapeMovieText(order.orderNo || '')}"><i class="fas fa-copy"></i>${isEnglish ? 'Copy order no.' : 'คัดลอกเลขออเดอร์'}</button><a class="button button-primary" href="${escapeMovieText(getLineContactUrl())}" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i>${isEnglish ? 'Contact LINE' : 'ติดต่อ LINE'}</a></div>
        </article>`;
    }).join('');
}

async function refreshMyOrderHistory() {
    const button = document.getElementById('refreshMyOrdersBtn');
    const old = button ? button.innerHTML : '';
    if (button) { button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...'; }
    try {
        await loadSiteData();
        renderMyOrders();
        showToast((window.JMI18n && window.JMI18n.lang === 'en') ? 'Order history refreshed' : 'รีเฟรชประวัติการซื้อแล้ว', 'success');
    } catch (error) {
        showToast(error.message || 'รีเฟรชประวัติไม่สำเร็จ', 'error');
    } finally {
        if (button) { button.disabled = false; button.innerHTML = old || '<i class="fas fa-rotate"></i> รีเฟรชประวัติ'; }
    }
}

const checkoutState = { step: 1, discount: null, paymentMethod: '', confirming: false, orderNo: null, orderRecordId: null, orderSaved: false, lineMessage: '' };

function getCartSubtotal() {
    return state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
}

function getCheckoutTotals() {
    const subtotal = getCartSubtotal();
    let discountAmount = 0;
    const discount = checkoutState.discount;
    if (discount) {
        if (discount.type === 'fixed') discountAmount = Math.min(subtotal, Math.max(0, Number(discount.value) || 0));
        else discountAmount = Math.min(subtotal, subtotal * Math.max(0, Number(discount.value) || 0) / 100);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;
    return { subtotal, discountAmount, total: Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100) };
}

function money(value) {
    const n = Number(value) || 0;
    return `฿${Number.isInteger(n) ? n.toLocaleString('th-TH') : n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CHECKOUT_CLIENT_ID_KEY = 'jokemoo_checkout_client_id';

function getCheckoutClientId() {
    try {
        let id = localStorage.getItem(CHECKOUT_CLIENT_ID_KEY);
        if (!id) {
            id = `jm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
            localStorage.setItem(CHECKOUT_CLIENT_ID_KEY, id);
        }
        return id;
    } catch (_) {
        return `session-${Math.random().toString(36).slice(2, 12)}`;
    }
}

function getDiscountLimitStatus(discount) {
    const clientId = getCheckoutClientId();
    const usedClients = Array.isArray(discount?.usedClients) ? discount.usedClients.map(String) : [];
    const clientUses = discount?.clientUses && typeof discount.clientUses === 'object' ? discount.clientUses : {};
    const alreadyUsed = Math.max(0, Number(clientUses[clientId]) || 0);
    const maxPeople = Math.max(0, Math.floor(Number(discount?.maxPeople) || 0));
    const maxUsesPerPerson = Math.max(0, Math.floor(discount?.maxUsesPerPerson === undefined || discount?.maxUsesPerPerson === null || discount?.maxUsesPerPerson === '' ? 1 : Number(discount.maxUsesPerPerson)));
    const isExistingClient = usedClients.includes(clientId);
    if (maxPeople > 0 && !isExistingClient && usedClients.length >= maxPeople) {
        return { ok: false, message: 'โค้ดนี้ใช้ครบจำนวนลูกค้าที่กำหนดแล้ว' };
    }
    if (maxUsesPerPerson > 0 && alreadyUsed >= maxUsesPerPerson) {
        return { ok: false, message: 'คุณใช้โค้ดนี้ครบจำนวนครั้งที่กำหนดแล้ว' };
    }
    return { ok: true, clientId, alreadyUsed, usedClients, clientUses, maxPeople, maxUsesPerPerson };
}

async function storeAdminPost(action, payload = {}) {
    const apiKey = (window.JokeMooConfig && window.JokeMooConfig.adminApiKey) || '';
    const bodyPayload = new URLSearchParams({ action, apiKey, ...payload });
    const response = await fetch(apiBaseUrl, {
        method: 'POST', mode: 'cors',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyPayload.toString(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result || !result.success) throw new Error((result && result.message) || 'ไม่สามารถบันทึกการใช้โค้ดได้');
    siteDataCache = null;
    notifyRealtimePeers(action);
    return result;
}

async function consumeDiscountUsage() {
    if (!checkoutState.discount) return true;
    const code = String(checkoutState.discount.code || '').trim().toUpperCase();
    let freshPromotion = checkoutState.discount._sourcePromotion || null;
    let freshDiscount = checkoutState.discount;
    try {
        const result = await fetchGet('siteData');
        const data = result && result.data ? result.data : {};
        const promotions = Array.isArray(data.promotions) ? data.promotions : [];
        const match = promotions.find((promo) => isDiscountPromotionRecord(promo) && String(parseDiscountPromotionRecord(promo)?.code || '').toUpperCase() === code);
        if (match) {
            freshPromotion = match;
            freshDiscount = parseDiscountPromotionRecord(match);
        }
    } catch (error) {
        console.warn('refresh discount before consume failed', error);
    }
    if (!isDiscountUsable(freshDiscount)) throw new Error('โค้ดส่วนลดนี้ไม่สามารถใช้งานได้แล้ว');
    const limit = getDiscountLimitStatus(freshDiscount);
    if (!limit.ok) throw new Error(limit.message);
    const usedClients = Array.from(new Set(limit.usedClients));
    if (!usedClients.includes(limit.clientId)) usedClients.push(limit.clientId);
    const clientUses = { ...limit.clientUses, [limit.clientId]: limit.alreadyUsed + 1 };
    const updated = {
        ...freshDiscount,
        usedClients,
        clientUses,
        usedCount: Math.max(0, Number(freshDiscount.usedCount) || 0) + 1,
    };
    const source = freshPromotion || freshDiscount._sourcePromotion || {};
    const description = JSON.stringify({
        code: updated.code,
        type: updated.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(updated.value) || 0),
        minSpend: Math.max(0, Number(updated.minSpend) || 0),
        startAt: String(updated.startAt || '').trim(),
        endAt: String(updated.endAt || '').trim(),
        enabled: updated.enabled !== false,
        maxPeople: Math.max(0, Math.floor(Number(updated.maxPeople) || 0)),
        maxUsesPerPerson: Math.max(0, Math.floor(updated.maxUsesPerPerson === undefined || updated.maxUsesPerPerson === null || updated.maxUsesPerPerson === '' ? 1 : Number(updated.maxUsesPerPerson))),
        usedCount: updated.usedCount,
        usedClients,
        clientUses,
    });
    const numericId = Number(updated.id);
    if (!Number.isFinite(numericId)) throw new Error('ไม่พบรหัสโค้ดส่วนลดในระบบ กรุณารีเฟรชหน้าแล้วลองใหม่');
    await storeAdminPost('adminUpdatePromotion', {
        id: numericId,
        title: `${DISCOUNT_PROMO_PREFIX}|${updated.code}`,
        description,
        startAt: String(updated.startAt || '').trim(),
        endAt: String(updated.endAt || '').trim(),
        image: source.image || source.imageUrl || '',
        enabled: updated.enabled !== false,
    });
    checkoutState.discount = { ...updated, _sourcePromotion: { ...source, description } };
    const idx = (state.discounts || []).findIndex((item) => String(item.id) === String(updated.id));
    if (idx >= 0) state.discounts[idx] = checkoutState.discount;
    return true;
}

function isDiscountUsable(discount) {
    if (!discount || !discount.enabled || !discount.code) return false;
    const now = new Date();
    const start = parsePromotionDate(discount.startAt);
    const end = parsePromotionDate(discount.endAt);
    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);
    if (!((!start || start <= now) && (!end || end >= now))) return false;
    return getDiscountLimitStatus(discount).ok;
}

function validateDiscountCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'กรุณากรอกโค้ดส่วนลด' };
    const discount = (state.discounts || []).find(item => String(item.code || '').toUpperCase() === code);
    if (!discount) return { ok: false, message: 'ไม่พบโค้ดส่วนลดนี้' };
    if (!discount.enabled) return { ok: false, message: 'โค้ดนี้ถูกปิดใช้งาน' };
    const limitStatus = getDiscountLimitStatus(discount);
    if (!limitStatus.ok) return { ok: false, message: limitStatus.message };
    if (!isDiscountUsable(discount)) return { ok: false, message: 'โค้ดนี้ยังไม่เปิดใช้หรือหมดอายุแล้ว' };
    const subtotal = getCartSubtotal();
    if (subtotal < (Number(discount.minSpend) || 0)) return { ok: false, message: `โค้ดนี้ใช้ได้เมื่อยอดถึง ${money(discount.minSpend)}` };
    return { ok: true, discount };
}

function renderCheckoutSummary(target, compact = false) {
    if (!target) return;
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    target.innerHTML = `
        <div><span>ยอดสินค้า</span><strong>${money(subtotal)}</strong></div>
        <div class="checkout-discount-row ${discountAmount ? '' : 'is-muted'}"><span>ส่วนลด${checkoutState.discount ? ` (${escapeMovieText(checkoutState.discount.code)})` : ''}</span><strong>-${money(discountAmount)}</strong></div>
        <div class="checkout-total-row"><span>ยอดที่ต้องชำระ</span><strong>${money(total)}</strong></div>`;
}

function setCheckoutStep(step) {
    checkoutState.step = step;
    document.querySelectorAll('[data-checkout-step]').forEach(el => el.classList.toggle('is-active', Number(el.dataset.checkoutStep) === step));
    document.querySelectorAll('[data-checkout-step-pill]').forEach(el => {
        const n = Number(el.dataset.checkoutStepPill);
        el.classList.toggle('is-active', n === step);
        el.classList.toggle('is-done', n < step);
    });
    // Render only what is visible. This avoids rebuilding all checkout sections on every click.
    if (step === 1) renderCheckoutSummary(checkoutSummaryStep1);
    else if (step === 2) renderCheckoutSummary(checkoutSummaryStep2);
    else if (step === 3) renderCheckoutFinal();
}

function resetCheckoutFlow({ closePanel = false } = {}) {
    checkoutState.step = 1;
    checkoutState.discount = null;
    checkoutState.paymentMethod = '';
    checkoutState.confirming = false;
    checkoutState.orderNo = null;
    checkoutState.orderRecordId = null;
    checkoutState.orderSaved = false;
    checkoutState.lineMessage = '';
    if (discountCodeInput) discountCodeInput.value = '';
    if (discountFeedback) {
        discountFeedback.classList.add('hidden');
        discountFeedback.classList.remove('is-success', 'is-error');
        discountFeedback.innerHTML = '';
    }
    document.querySelectorAll('[data-payment-method]').forEach(el => el.classList.remove('is-selected'));
    if (checkoutOrderReceipt) checkoutOrderReceipt.classList.add('hidden');
    if (checkoutOrderNumber) checkoutOrderNumber.textContent = '-';
    if (checkoutBackPayment) checkoutBackPayment.classList.remove('hidden');
    if (checkoutToConfirm) {
        checkoutToConfirm.disabled = false;
        checkoutToConfirm.innerHTML = 'โอนเสร็จแล้ว <i class="fas fa-arrow-right"></i>';
    }
    if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.innerHTML = '<i class="fas fa-copy"></i> คัดลอกเลขออเดอร์';
    }
    renderPaymentDetail();
    setCheckoutStep(1);
    if (closePanel) closeCheckoutPanel();
}

function openCheckout() {
    if (!ensureSiteActive()) return;
    if (state.cart.length === 0) { showToast('กรุณาเพิ่มสินค้าในตะกร้าก่อนสั่งซื้อ', 'error'); return; }
    // Pause decorative/realtime work while the checkout is opening.
    document.body.classList.add('checkout-active');
    resetCheckoutFlow();
    if (cartPanel) cartPanel.classList.add('hidden');
    if (checkoutPanel) {
        checkoutPanel.classList.remove('hidden');
        // Promote the modal on the next frame instead of forcing a large synchronous repaint.
        requestAnimationFrame(() => checkoutPanel.classList.add('checkout-ready'));
    }
}

function closeCheckoutPanel() {
    if (checkoutPanel) {
        checkoutPanel.classList.add('hidden');
        checkoutPanel.classList.remove('checkout-ready');
    }
    document.body.classList.remove('checkout-active');
    requestRealtimeRefresh(120);
}

function applyDiscountFromInput() {
    const result = validateDiscountCode(discountCodeInput ? discountCodeInput.value : '');
    if (!discountFeedback) return result.ok;
    discountFeedback.classList.remove('hidden', 'is-success', 'is-error');
    if (!result.ok) {
        checkoutState.discount = null;
        discountFeedback.classList.add('is-error');
        discountFeedback.innerHTML = `<i class="fas fa-circle-xmark"></i><span>${escapeMovieText(result.message)}</span>`;
    } else {
        checkoutState.discount = result.discount;
        const label = result.discount.type === 'fixed' ? `ลด ${money(result.discount.value)}` : `ลด ${result.discount.value}%`;
        discountFeedback.classList.add('is-success');
        discountFeedback.innerHTML = `<i class="fas fa-circle-check"></i><span>ใช้โค้ด <b>${escapeMovieText(result.discount.code)}</b> สำเร็จ • ${label}</span>`;
    }
    renderCheckoutSummary(checkoutSummaryStep1);
    return result.ok;
}

function renderPaymentDetail() {
    if (!paymentDetail) return;
    const cfg = getPaymentSettings();
    const method = checkoutState.paymentMethod;
    if (!method) {
        paymentDetail.innerHTML = `<div class="payment-placeholder"><i class="fas fa-hand-pointer"></i><span>เลือกช่องทางชำระเงินด้านบน</span></div>`;
        return;
    }
    if (method === 'qr') {
        const image = String(cfg.qrImage || '').trim();
        const { total } = getCheckoutTotals();
        paymentDetail.innerHTML = `<div class="payment-qr-layout">
            <span class="payment-label">QR พร้อมเพย์</span>
            <div class="payment-due-chip"><span>ยอดที่ต้องชำระ</span><strong>${money(total)}</strong></div>
            <div class="payment-qr-box">${image ? `<img src="${escapeMovieText(image)}" alt="QR ชำระเงิน">` : `<div class="payment-qr-empty"><i class="fas fa-qrcode"></i><strong>ยังไม่ได้ตั้งค่า QR</strong><small>ตั้งค่า QR ในเมนูจัดการเว็บ</small></div>`}</div>
            ${image ? `<button class="button button-outline save-qr-image" type="button" data-qr-src="${escapeMovieText(image)}"><i class="fas fa-download"></i> บันทึก QR</button>` : ''}
            <div class="payment-qr-caption"><h5>${escapeMovieText(cfg.accountName || 'JokeMoo Store')}</h5><p>สแกน QR แล้วตรวจสอบชื่อและยอดก่อนโอน</p></div>
        </div>`;
    } else {
        const number = String(cfg.accountNumber || '').trim();
        paymentDetail.innerHTML = `<div class="payment-bank-layout">
            <span class="payment-bank-icon"><i class="fas fa-building-columns"></i></span>
            <div><span class="payment-label">${escapeMovieText(cfg.bankName || 'ธนาคาร')}</span><h5>${escapeMovieText(number || 'ยังไม่ได้ตั้งค่าเลขบัญชี')}</h5><p>${escapeMovieText(cfg.accountName || 'JokeMoo Store')}</p></div>
            ${number ? `<button class="button button-outline copy-bank-number" type="button" data-bank-number="${escapeMovieText(number)}"><i class="fas fa-copy"></i> คัดลอก</button>` : ''}
        </div>`;
    }
}

function selectPaymentMethod(method) {
    if (checkoutState.orderSaved) return;
    checkoutState.paymentMethod = method;
    document.querySelectorAll('[data-payment-method]').forEach(el => el.classList.toggle('is-selected', el.dataset.paymentMethod === method));
    renderPaymentDetail();
}

function renderCheckoutFinal() {
    if (!checkoutFinalSummary) return;
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    const methodLabel = checkoutState.paymentMethod === 'qr' ? 'QR พร้อมเพย์' : checkoutState.paymentMethod === 'bank' ? 'เลขบัญชี' : '-';
    const items = state.cart.map(item => `<li><span>${escapeMovieText(item.name)} × ${item.quantity}</span><b>${money(item.price * item.quantity)}</b></li>`).join('');
    checkoutFinalSummary.innerHTML = `<ul class="checkout-order-list">${items}</ul><div class="checkout-final-meta"><div><span>ช่องทาง</span><strong>${methodLabel}</strong></div><div><span>ส่วนลด</span><strong>-${money(discountAmount)}</strong></div><div class="checkout-final-total"><span>ยอดชำระ</span><strong>${money(total)}</strong></div></div>`;
    if (checkoutOrderReceipt) checkoutOrderReceipt.classList.toggle('hidden', !checkoutState.orderSaved || !checkoutState.orderNo);
    if (checkoutOrderNumber) checkoutOrderNumber.textContent = checkoutState.orderNo || '-';
    if (checkoutBackPayment) checkoutBackPayment.classList.toggle('hidden', !!checkoutState.orderSaved);
}

function buildLineOrderMessage() {
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    const methodLabel = checkoutState.paymentMethod === 'qr' ? 'QR พร้อมเพย์' : 'เลขบัญชี';
    const itemLines = state.cart.map(item => `• ${item.name} x${item.quantity} = ${money(item.price * item.quantity)}`).join('\n');
    return `สวัสดีครับ ต้องการยืนยันคำสั่งซื้อ JokeMoo\nเลขออเดอร์: ${checkoutState.orderNo || '-'}\n\n${itemLines}\n\nยอดสินค้า: ${money(subtotal)}\nส่วนลด: ${money(discountAmount)}${checkoutState.discount ? ` (${checkoutState.discount.code})` : ''}\nยอดชำระ: ${money(total)}\nชำระผ่าน: ${methodLabel}\n\nโอนเรียบร้อยแล้วครับ เดี๋ยวส่งสลิปให้แอดมิน`;
}


function createOrderNumber() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    return `JM-${stamp}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

async function saveConfirmedOrder() {
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    const orderNo = checkoutState.orderNo || createOrderNumber();
    checkoutState.orderNo = orderNo;
    const discount = checkoutState.discount ? {
        code: String(checkoutState.discount.code || ''),
        type: checkoutState.discount.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(checkoutState.discount.value) || 0),
        amount: discountAmount,
    } : null;
    const order = {
        orderNo,
        createdAt: new Date().toISOString(),
        clientId: getCheckoutClientId(),
        items: state.cart.map(item => ({ id: item.id, name: item.name, price: Number(item.price)||0, quantity: Number(item.quantity)||1 })),
        subtotal,
        discount,
        discountAmount,
        total,
        paymentMethod: checkoutState.paymentMethod,
        status: 'confirmed',
        source: 'web',
    };
    const payload = {
        title: `${ORDER_PROMO_PREFIX}|${orderNo}`,
        description: JSON.stringify(order),
        startAt: order.createdAt.slice(0,10),
        endAt: '',
        image: '',
        enabled: false,
    };
    const result = await storeAdminPost('adminCreatePromotion', payload);
    checkoutState.orderRecordId = result && result.data && result.data.id ? result.data.id : (result && result.id ? result.id : null);
    return order;
}

function getWheelSettingsPayload() {
    const settings = normalizeWebSettings(state.webSettings || {});
    return { wheelRates: settings.wheelRates, updatedAt: settings.updatedAt || '' };
}

function applyWheelSettingsToFrame(frame) {
    if (!frame) return;
    const payload = getWheelSettingsPayload();
    try { frame.contentWindow?.postMessage({ type: 'JOKEMOO_WHEEL_SETTINGS', settings: payload }, '*'); } catch (_) {}
}

async function finalizeOrderAfterTransfer() {
    if (!checkoutState.paymentMethod) {
        showToast('กรุณาเลือกช่องทางชำระเงิน', 'error');
        setCheckoutStep(2);
        return false;
    }
    if (checkoutState.orderSaved && checkoutState.orderNo) {
        setCheckoutStep(3);
        return true;
    }
    if (checkoutState.confirming) return false;

    checkoutState.confirming = true;
    const originalHtml = checkoutToConfirm ? checkoutToConfirm.innerHTML : '';
    if (checkoutToConfirm) {
        checkoutToConfirm.disabled = true;
        checkoutToConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังสร้างออเดอร์...';
    }

    let orderSaved = false;
    try {
        const savedOrder = await saveConfirmedOrder();
        orderSaved = true;
        if (checkoutState.discount) await consumeDiscountUsage();
        checkoutState.orderSaved = true;
        upsertMyOrder(savedOrder);
        checkoutState.lineMessage = buildLineOrderMessage();
        setCheckoutStep(3);
        renderCheckoutFinal();
        showToast(`สร้างออเดอร์ ${checkoutState.orderNo} เรียบร้อยแล้ว`, 'success');
        return true;
    } catch (error) {
        // ถ้าบันทึกออเดอร์แล้ว แต่ตัดสิทธิ์โค้ดไม่สำเร็จ ให้ลบออเดอร์ที่สร้างไว้เพื่อป้องกันยอดซ้ำ
        if (orderSaved && checkoutState.orderRecordId) {
            try { await storeAdminPost('adminDeletePromotion', { id: checkoutState.orderRecordId }); } catch (_) {}
        }
        checkoutState.orderRecordId = null;
        checkoutState.orderNo = null;
        checkoutState.orderSaved = false;
        checkoutState.lineMessage = '';
        showToast(error.message || 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่', 'error');
        try {
            const fresh = await fetchGet('siteData');
            if (fresh && fresh.data && Array.isArray(fresh.data.promotions)) applyPromotionAndMovieData(fresh.data.promotions);
        } catch (_) {}
        setCheckoutStep(2);
        return false;
    } finally {
        checkoutState.confirming = false;
        if (checkoutToConfirm) {
            checkoutToConfirm.disabled = false;
            checkoutToConfirm.innerHTML = originalHtml || 'โอนเสร็จแล้ว <i class="fas fa-arrow-right"></i>';
        }
    }
}

function fallbackCopyText(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    area.remove();
    return ok;
}

async function copyOrderNumberAndOpenLine() {
    if (!checkoutState.orderSaved || !checkoutState.orderNo) {
        showToast('ยังไม่มีเลขออเดอร์ กรุณากด “โอนเสร็จแล้ว” ก่อน', 'error');
        setCheckoutStep(2);
        return;
    }
    if (checkoutState.confirming) return;
    checkoutState.confirming = true;
    const originalHtml = confirmPaymentBtn ? confirmPaymentBtn.innerHTML : '';
    if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังคัดลอกเลขออเดอร์...';
    }
    try {
        let copied = false;
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(checkoutState.orderNo); copied = true; } catch (_) {}
        }
        if (!copied) copied = fallbackCopyText(checkoutState.orderNo);
        if (!copied) throw new Error('คัดลอกเลขออเดอร์ไม่สำเร็จ');

        const completedOrderNo = checkoutState.orderNo;
        const message = checkoutState.lineMessage || buildLineOrderMessage();
        const lineUrl = buildLineRedirectUrl(message);
        showToast(`คัดลอก ${completedOrderNo} แล้ว กำลังเปิด LINE`, 'success');
        try { sessionStorage.setItem(CHECKOUT_RETURN_STORAGE_KEY, '1'); } catch (_) {}
        state.cart = [];
        renderCart();
        resetCheckoutFlow({ closePanel: true });
        setTimeout(() => { window.location.href = lineUrl; }, 350);
    } catch (error) {
        showToast(error.message || 'คัดลอกเลขออเดอร์ไม่สำเร็จ', 'error');
        checkoutState.confirming = false;
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.innerHTML = originalHtml;
        }
    }
}

function recoverCheckoutAfterExternalReturn(event) {
    let shouldReset = !!event?.persisted;
    try {
        if (sessionStorage.getItem(CHECKOUT_RETURN_STORAGE_KEY) === '1') {
            shouldReset = true;
            sessionStorage.removeItem(CHECKOUT_RETURN_STORAGE_KEY);
        }
    } catch (_) {}
    if (!shouldReset) return;
    resetCheckoutFlow({ closePanel: true });
    if (cartPanel) cartPanel.classList.add('hidden');
}

function showPageLoader(show = true) {
    if (!pageLoader) return;
    pageLoader.classList.toggle('hidden', !show);
    document.body.classList.toggle('loading', show);
}

function getHashRoute() {
    const raw = (window.location.hash || '#home').replace(/^#/, '');
    const [pagePart, categoryPart] = raw.split('/');
    const page = appPageTitles[pagePart] ? pagePart : 'home';
    const category = ['all', 'netflix', 'other'].includes(categoryPart) ? categoryPart : 'all';
    return { page, category };
}

function closeSidebar() {
    document.body.classList.remove('sidebar-open');
}

function initAppHeroImage() {
    const image = document.getElementById('appHeroImage');
    if (!image) return;
    const heroConfig = (window.JokeMooConfig && window.JokeMooConfig.hero) || {};
    const src = String(heroConfig.image || '').trim();
    if (!src) {
        image.closest('.app-hero-media')?.classList.add('is-hidden');
        return;
    }
    image.src = src;
    image.alt = heroConfig.alt || 'JokeMoo Movie';
    if (heroConfig.objectPosition) image.style.objectPosition = heroConfig.objectPosition;
    image.addEventListener('error', () => {
        const media = image.closest('.app-hero-media');
        if (media) media.classList.add('is-hidden');
    }, { once: true });
}

function suspendWheelFrame() {
    const frame = document.getElementById('wheelFrame');
    const loading = document.getElementById('wheelLoading');
    if (!frame) return;
    frame.style.pointerEvents = 'none';
    frame.style.visibility = 'hidden';
    if (frame.getAttribute('src')) {
        try { frame.src = 'about:blank'; } catch (_) {}
        frame.removeAttribute('src');
    }
    frame.classList.remove('is-ready');
    if (loading) loading.classList.remove('is-hidden');
}

function ensureWheelLoaded() {
    const frame = document.getElementById('wheelFrame');
    const loading = document.getElementById('wheelLoading');
    if (!frame) return;
    frame.style.pointerEvents = 'auto';
    frame.style.visibility = 'visible';
    if (frame.src) { applyWheelSettingsToFrame(frame); return; }
    const rawSrc = frame.dataset.src;
    if (!rawSrc) return;
    let src = rawSrc;
    try {
        const url = new URL(rawSrc, window.location.href);
        url.searchParams.set('jmWheelRates', JSON.stringify(getWheelSettingsPayload().wheelRates));
        src = url.toString();
    } catch (_) {}
    frame.addEventListener('load', () => {
        if (loading) loading.classList.add('is-hidden');
        frame.classList.add('is-ready');
        applyWheelSettingsToFrame(frame);
    }, { once: true });
    requestAnimationFrame(() => { frame.src = src; });
    setTimeout(() => { if (loading) loading.classList.add('is-hidden'); }, 5500);
}
function updateProductFilterUI(category) {
    document.querySelectorAll('[data-product-filter]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.productFilter === category);
    });
    document.querySelectorAll('.side-subnav-item[data-category]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.category === category);
    });
    const heading = document.getElementById('productsPageHeading');
    if (heading) {
        heading.textContent = category === 'netflix' ? 'Netflix' : category === 'other' ? 'YouTube / แอปอื่น' : 'แพ็คเกจทั้งหมด';
    }
}

function showAppPage(page, category = 'all', options = {}) {
    if (!appPageTitles[page]) page = 'home';
    if (!['all', 'netflix', 'other'].includes(category)) category = 'all';

    activePage = page;
    if (page === 'products') {
        activeProductCategory = category;
        updateProductFilterUI(category);
        renderProducts();
    }
    if (page === 'my-orders') renderMyOrders();

    document.querySelectorAll('[data-page-view]').forEach((section) => {
        section.classList.toggle('is-active', section.dataset.pageView === page);
    });
    document.querySelectorAll('.side-nav-item[data-page]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.page === page);
    });
    document.querySelectorAll('.side-subnav-item[data-page]').forEach((button) => {
        if (!button.dataset.category) button.classList.toggle('is-active', button.dataset.page === page);
    });
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const pageTitle = isEnglish ? appPageTitlesEn[page] : appPageTitles[page];
    const title = document.getElementById('currentPageTitle');
    if (title) title.textContent = pageTitle;
    document.title = `${pageTitle} | JokeMoo Store`;

    document.body.classList.toggle('wheel-page-active', page === 'wheel');
    const wheelFrame = document.getElementById('wheelFrame');
    if (page === 'wheel') {
        ensureWheelLoaded();
    } else if (wheelFrame) {
        suspendWheelFrame();
    }
    if (!options.keepScroll) {
        const mainScroller = document.querySelector('.app-main-column');
        if (mainScroller) {
            mainScroller.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
        }
    }
    closeSidebar();
}

function navigateToPage(page, category = 'all') {
    const nextHash = page === 'products' && category !== 'all' ? `#products/${category}` : `#${page}`;
    if (window.location.hash === nextHash) {
        showAppPage(page, category);
    } else {
        window.location.hash = nextHash;
    }
}

function applyHashRoute(options = {}) {
    const route = getHashRoute();
    showAppPage(route.page, route.page === 'products' ? route.category : 'all', options);
}

function openPromotionsWheel() {
    navigateToPage('wheel');
}

function initAppNavigation() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const productGroup = document.getElementById('productNavGroup');
    const productParent = productGroup ? productGroup.querySelector('.side-nav-parent') : null;
    const movieGroup = document.getElementById('movieNavGroup');
    const movieParent = movieGroup ? movieGroup.querySelector('.side-nav-parent') : null;
    const contactGroup = document.getElementById('contactNavGroup');
    const contactParent = contactGroup ? contactGroup.querySelector('.side-nav-parent') : null;

    // Submenus always start collapsed. They only open after the user clicks the parent.
    [productGroup, movieGroup, contactGroup].forEach((group) => {
        if (!group) return;
        group.classList.remove('is-open');
        const parent = group.querySelector('.side-nav-parent');
        if (parent) parent.setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', (event) => {
            const page = button.dataset.page;
            if (!page) return;
            event.preventDefault();
            const category = button.dataset.category || 'all';
            navigateToPage(page, category);
        });
    });

    document.querySelectorAll('[data-product-filter]').forEach((button) => {
        button.addEventListener('click', () => navigateToPage('products', button.dataset.productFilter || 'all'));
    });

    if (sidebarToggle) sidebarToggle.addEventListener('click', () => document.body.classList.add('sidebar-open'));
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    if (productParent && productGroup) {
        productParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !productGroup.classList.contains('is-open');
            productGroup.classList.toggle('is-open', willOpen);
            productParent.setAttribute('aria-expanded', String(willOpen));
        });
    }

    if (movieParent && movieGroup) {
        movieParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !movieGroup.classList.contains('is-open');
            movieGroup.classList.toggle('is-open', willOpen);
            movieParent.setAttribute('aria-expanded', String(willOpen));
        });
    }

    if (contactParent && contactGroup) {
        contactParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !contactGroup.classList.contains('is-open');
            contactGroup.classList.toggle('is-open', willOpen);
            contactParent.setAttribute('aria-expanded', String(willOpen));
        });
    }
    document.getElementById('contactSubnav')?.addEventListener('click', (event) => {
        const link = event.target.closest('[data-contact-link]');
        if (!link) return;
        if (link.dataset.configured === 'false' || link.classList.contains('is-unconfigured')) {
            event.preventDefault();
            showToast((window.JMI18n && window.JMI18n.lang === 'en') ? 'This contact link has not been configured yet' : 'ช่องทางนี้ยังไม่พร้อมใช้งาน', 'info');
        }
    });
    document.getElementById('refreshMyOrdersBtn')?.addEventListener('click', refreshMyOrderHistory);
    document.getElementById('myOrdersList')?.addEventListener('click', async (event) => {
        const copyButton = event.target.closest('.my-order-copy');
        if (!copyButton) return;
        const orderNo = String(copyButton.dataset.orderNumber || '').trim();
        if (!orderNo) return;
        try { await navigator.clipboard.writeText(orderNo); } catch (_) {
            const temp = document.createElement('textarea'); temp.value = orderNo; document.body.appendChild(temp); temp.select(); document.execCommand('copy'); temp.remove();
        }
        showToast((window.JMI18n && window.JMI18n.lang === 'en') ? 'Order number copied' : 'คัดลอกเลขออเดอร์แล้ว', 'success');
    });

    window.addEventListener('hashchange', () => applyHashRoute());
    applyHashRoute({ instant: true, keepScroll: true });
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
    initAppHeroImage();
    renderProducts();
    renderCart();
    renderReviews();
    renderMovies();
    initFAQ();
    initAppNavigation();
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
        window.addEventListener('online', () => { syncPendingReviews(); requestRealtimeRefresh(20); });
        window.addEventListener('storage', handleAdminReloadEvent);
        window.addEventListener('pageshow', recoverCheckoutAfterExternalReturn);
    }
    initRealtimeSync();

    if (window) {
        window.adminre = adminReviewConsoleCommand;
        window.reviewModeStatus = getReviewSettings;
        if (window.console && typeof console.info === 'function') {
        }
    }

    attachPromotionBannerEvents();

    // Avoid unnecessary background work while this tab is hidden.
    setInterval(() => {
        if (!document.hidden) refreshSiteDataIfChanged();
    }, SITE_DATA_POLL_INTERVAL_MS);
    // Update promotion banner every minute only while visible.
    setInterval(() => {
        if (!document.hidden) renderPromotionBanner();
    }, 60000);

    if (googleLoginBtn) googleLoginBtn.addEventListener("click", toggleLogin);
    if (cartBtn) cartBtn.addEventListener("click", openCart);
    if (heroReviewBtn) heroReviewBtn.addEventListener("click", () => navigateToPage('reviews'));
    if (cartItems) cartItems.addEventListener('click', handleCartItemsClick);
    if (closeCart) closeCart.addEventListener("click", () => cartPanel.classList.add("hidden"));
    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
    if (closeCheckout) closeCheckout.addEventListener('click', closeCheckoutPanel);
    if (applyDiscountBtn) applyDiscountBtn.addEventListener('click', applyDiscountFromInput);
    if (discountCodeInput) discountCodeInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); applyDiscountFromInput(); } });
    if (checkoutBackToCart) checkoutBackToCart.addEventListener('click', () => { closeCheckoutPanel(); openCart(); });
    if (checkoutToPayment) checkoutToPayment.addEventListener('click', () => setCheckoutStep(2));
    if (checkoutBackDiscount) checkoutBackDiscount.addEventListener('click', () => setCheckoutStep(1));
    if (checkoutToConfirm) checkoutToConfirm.addEventListener('click', finalizeOrderAfterTransfer);
    if (checkoutBackPayment) checkoutBackPayment.addEventListener('click', () => { if (!checkoutState.orderSaved) setCheckoutStep(2); });
    if (confirmPaymentBtn) confirmPaymentBtn.addEventListener('click', copyOrderNumberAndOpenLine);
    document.querySelectorAll('[data-payment-method]').forEach(btn => btn.addEventListener('click', () => selectPaymentMethod(btn.dataset.paymentMethod)));
    if (paymentDetail) paymentDetail.addEventListener('click', async (event) => {
        const copyBtn = event.target.closest('.copy-bank-number');
        if (copyBtn) {
            try {
                await navigator.clipboard.writeText(copyBtn.dataset.bankNumber || '');
                showToast('คัดลอกเลขบัญชีแล้ว', 'success');
            } catch (_) {
                showToast('คัดลอกไม่สำเร็จ', 'error');
            }
            return;
        }

        const saveQrBtn = event.target.closest('.save-qr-image');
        if (!saveQrBtn) return;
        const src = String(saveQrBtn.dataset.qrSrc || '').trim();
        if (!src) return showToast('ยังไม่ได้ตั้งค่ารูป QR', 'error');

        const triggerDownload = (href, filename) => {
            const a = document.createElement('a');
            a.href = href;
            a.download = filename || 'JOKEMOO-QR.png';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
        };

        try {
            saveQrBtn.disabled = true;
            const response = await fetch(src, { cache: 'no-store' });
            if (!response.ok) throw new Error('download_failed');
            const blob = await response.blob();
            const type = String(blob.type || '').toLowerCase();
            const ext = type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png';
            const objectUrl = URL.createObjectURL(blob);
            triggerDownload(objectUrl, `JOKEMOO-QR.${ext}`);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
            showToast('บันทึก QR แล้ว', 'success');
        } catch (_) {
            try {
                triggerDownload(src, 'JOKEMOO-QR.png');
                showToast('กำลังบันทึก QR', 'success');
            } catch (__) {
                window.open(src, '_blank', 'noopener');
                showToast('เปิดรูป QR แล้ว กดบันทึกรูปได้เลย', 'info');
            }
        } finally {
            saveQrBtn.disabled = false;
        }
    });
    if (reviewImageInput) reviewImageInput.addEventListener("change", updateImagePreview);
    if (reviewForm) reviewForm.addEventListener("submit", handleReviewSubmit);
    if (reviewCarouselPrev) reviewCarouselPrev.addEventListener('click', () => goReviewPage(-1));
    if (reviewCarouselNext) reviewCarouselNext.addEventListener('click', () => goReviewPage(1));
    if (heroShopBtn) heroShopBtn.addEventListener("click", () => navigateToPage('products'));
    if (heroShopBtn) heroShopBtn.addEventListener("click", () => navigateToPage('products'));

    if (cartPanel) {
        cartPanel.addEventListener("click", (event) => {
            if (event.target === cartPanel) cartPanel.classList.add("hidden");
        });
    }
    if (checkoutPanel) {
        checkoutPanel.addEventListener('click', (event) => { if (event.target === checkoutPanel) closeCheckoutPanel(); });
    }
}


document.addEventListener('jokemoo:languagechange', () => {
    try {
        updateProductFilterUI(activeProductCategory || 'all');
        renderProducts();
        renderCart();
        renderPromotionBanner();
        renderMovies();
        if (activePage) showAppPage(activePage, activeProductCategory || 'all', { keepScroll: true, instant: true });
    } catch (error) {
        console.warn('language refresh skipped', error);
    }
});

document.addEventListener('DOMContentLoaded', init);


document.addEventListener('jokemoo:languagechange', () => {
    try { renderMyOrders(); applyStoreSettingsToUi(); } catch (_) {}
});
