// products.js
import { db, collection, getDocs, getDoc, doc, onSnapshot } from "./firebase.js";
import { AppState, UI } from "./script.js";

const ProductsModule = {
    allProducts: [],
    activeCat: "all",
    queryText: "",
    homeLimit: 6,
    loadMoreCreated: false,
    CACHE_KEY: "lora_products_cache_data",
    isInitialized: false,
    retryCount: 0,
    maxRetries: 3,
    streamUnsubscribe: null,

    async init() {
        // خطوة 1: تحميل الكاش مباشرة كطبقة دفاع أولى لمنع اختفاء البيانات الفوري
        this.loadLocalCache();
        
        // خطوة 2: عرض حالة تحميل فاخرة في الـ Grid المتاح في الصفحة قبل اكتمال اتصال الفايربيز
        this.showLuxuryLoadingStates();

        // خطوة 3: بدء جلب البيانات ومراقبتها حياً مع معالجة الأخطاء والـ Retry التلقائي
        this.startProductsLiveStream();
    },

    startProductsLiveStream() {
        if (this.streamUnsubscribe) {
            this.streamUnsubscribe();
        }

        this.streamUnsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            const list = [];
            snapshot.forEach(d => {
                list.push({ id: d.id, ...d.data() });
            });
            
            // إلغاء تفعيل أي أزرار خطأ مرئية لأن البيانات وصلت بنجاح
            this.hideFallbackReloadButton();

            if (list.length > 0) {
                this.allProducts = list;
                this.saveLocalCache(list);
                this.syncCurrentPageUI();
            } else if (this.allProducts.length === 0) {
                this.renderNoProductsUI();
            } else {
                this.syncCurrentPageUI();
            }
        }, (error) => {
            console.error("Realtime products sync failed, initiating recovery:", error);
            this.handleStreamFailure();
        });
    },

    handleStreamFailure() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            const delay = this.retryCount * 2000; // تصاعدي: 2 ثانية، 4 ثواني، 6 ثواني
            console.warn(`Retrying connection to LORA Database... Attempt ${this.retryCount}/${this.maxRetries} in ${delay}ms`);
            setTimeout(() => {
                this.startProductsLiveStream();
            }, delay);
        } else {
            // استنفاد المحاولات التلقائية: نظهر زر الاستعادة الاحتياطي للعميل بدون ريفريش للصفحة
            this.showFallbackReloadButton();
            if (this.allProducts.length > 0) {
                // إذا كان هناك كاش قديم، نعرضه لإنقاذ الموقف بدلاً من ترك الصفحة فارغة
                this.syncCurrentPageUI();
                UI.toast(AppState.lang === 'en' ? "Displaying offline registry catalog." : "يتم الآن عرض الكتالوج المحفوظ مؤقتاً.");
            }
        }
    },

    showLuxuryLoadingStates() {
        const targets = [
            document.getElementById("curatedShowcaseGridTarget"),
            document.getElementById("catalogGridDynamicDisplayRoot")
        ];
        
        const loadingHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                <div class="w-8 h-8 border-2 border-neutral-200 border-t-amber-500 rounded-full animate-spin"></div>
                <p class="text-[10px] uppercase tracking-widest text-neutral-400 font-serif">
                    ${AppState.lang === 'en' ? 'Unveiling LORA Curation...' : 'جاري تحضير مقتنيات لورا الفاخرة...'}
                </p>
            </div>
        `;

        targets.forEach(t => {
            if (t && (!this.allProducts || this.allProducts.length === 0)) {
                t.innerHTML = loadingHTML;
            }
        });
    },

    showFallbackReloadButton() {
        const targets = [
            document.getElementById("curatedShowcaseGridTarget"),
            document.getElementById("catalogGridDynamicDisplayRoot")
        ];

        targets.forEach(t => {
            if (!t) return;
            
            // تحقق إن كان الزر موجوداً مسبقاً لمنع التكرار
            let container = document.getElementById("loraFallbackReloadContainer");
            if (!container) {
                container = document.createElement("div");
                container.id = "loraFallbackReloadContainer";
                container.className = "col-span-full text-center py-6 flex flex-col items-center justify-center space-y-3 animate-fade-in";
                
                const msg = AppState.lang === 'en' 
                    ? "Experiencing sync delay with Atelier Vault." 
                    : "واجهنا تأخيراً في تحديث منتجات المنصة.";
                const btnText = AppState.lang === 'en' ? "Reload Fragrances" : "إعادة تحميل المنتجات المعروضة";
                
                container.innerHTML = `
                    <p class="text-xs text-amber-600 font-sans font-medium">${msg}</p>
                    <button id="loraDirectTriggerReloadBtn" class="px-4 py-2 text-[10px] tracking-widest uppercase bg-neutral-900 text-white hover:bg-amber-500 hover:text-black transition duration-300 font-mono border border-neutral-950">
                        ${btnText}
                    </button>
                `;
                
                // يتم إدخاله قبل أو داخل الـ Grid
                t.insertAdjacentElement('beforebegin', container);
                
                const fallbackBtn = document.getElementById("loraDirectTriggerReloadBtn");
                if (fallbackBtn) {
                    fallbackBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        this.retryCount = 0; // تصفير المحاولات لبدء دورة جديدة
                        this.showLuxuryLoadingStates();
                        container.remove();
                        this.startProductsLiveStream();
                    });
                }
            }
        });
    },

    hideFallbackReloadButton() {
        const container = document.getElementById("loraFallbackReloadContainer");
        if (container) {
            container.remove();
        }
    },

    renderNoProductsUI() {
        const targets = [
            document.getElementById("curatedShowcaseGridTarget"),
            document.getElementById("catalogGridDynamicDisplayRoot")
        ];
        targets.forEach(t => {
            if (t) {
                t.innerHTML = `
                    <div class="col-span-full text-center py-12 text-xs text-neutral-400 uppercase tracking-widest font-serif">
                        ${AppState.lang === 'en' ? 'No fragrances available in collection' : 'لا توجد عطور متاحة في المجموعة حالياً'}
                    </div>`;
            }
        });
    },

    syncCurrentPageUI() {
        const path = window.location.pathname;
        if (path.includes("index.html") || path === "/" || path === "" || path.endsWith("/")) {
            this.initHomepage();
        } else if (path.includes("products.html")) {
            this.initCatalogPage();
        } else if (path.includes("product.html")) {
            this.initStandaloneProfilePage();
        } else if (path.includes("wishlist.html")) {
            this.initWishlistPage();
        }
    },

    loadLocalCache() {
        try {
            const cachedData = localStorage.getItem(this.CACHE_KEY);
            if (cachedData) {
                this.allProducts = JSON.parse(cachedData);
            }
        } catch (e) {
            console.error("Cache read failed:", e);
        }
    },

    saveLocalCache(data) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Cache write failed:", e);
        }
    },

    // ===================== HOME =====================
    async initHomepage() {
        const homeTarget = document.getElementById("curatedShowcaseGridTarget");

        if (homeTarget) {
            if (this.allProducts && this.allProducts.length > 0) {
                homeTarget.innerHTML = "";
                UI.renderProductCards(
                    this.allProducts.slice(0, this.homeLimit),
                    homeTarget
                );
                this.createLoadMoreButton();
            } else {
                this.renderNoProductsUI();
            }
        }

        if (!this.isInitialized) {
            this.isInitialized = true;
            onSnapshot(collection(db, "coupons"), (snapshot) => {
                let activeCoupon = null;
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.enabled === true) activeCoupon = data;
                });

                const banner = document.getElementById("dynamicPromoBannerTarget");
                const txt = document.getElementById("promoBannerText");

                if (banner && txt) {
                    if (activeCoupon) {
                        txt.innerText = AppState.lang === 'en'
                            ? `🔥 ${activeCoupon.percentage}% OFF WITH CODE ${activeCoupon.code}`
                            : `🔥 خصم ${activeCoupon.percentage}% باستخدام كود ${activeCoupon.code}`;
                        banner.classList.remove("hidden");
                    } else {
                        banner.classList.add("hidden");
                    }
                }
            }, (error) => {
                console.error("Coupon stream failed:", error);
            });
        }
    },

    createLoadMoreButton() {
        let btn = document.getElementById("loadMoreProductsBtn");
        const target = document.getElementById("curatedShowcaseGridTarget");
        if (!target) return;

        if (!btn) {
            btn = document.createElement("button");
            btn.id = "loadMoreProductsBtn";
            btn.innerText = AppState.lang === 'en' ? "Show More Products" : "عرض المزيد";
            btn.className = "w-full mt-6 py-3 text-xs uppercase tracking-widest border border-neutral-300 hover:border-neutral-900 transition";

            if (target.parentNode) {
                target.parentNode.appendChild(btn);
            }

            btn.addEventListener("click", () => {
                this.homeLimit += 6;
                const liveTarget = document.getElementById("curatedShowcaseGridTarget");
                if (!liveTarget) return;

                UI.renderProductCards(
                    this.allProducts.slice(0, this.homeLimit),
                    liveTarget
                );

                if (this.homeLimit >= this.allProducts.length) {
                    btn.style.display = "none";
                }
            });
        }

        if (this.homeLimit >= this.allProducts.length) {
            btn.style.display = "none";
        } else {
            btn.style.display = "block";
        }
    },

    // ===================== CATALOG =====================
    async initCatalogPage() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("cat")) this.activeCat = params.get("cat");

        this.renderCatalogGrid();
        
        if (!this.isInitialized) {
            this.isInitialized = true;
            this.bindCatalogFilters();
        }
    },

    bindCatalogFilters() {
        ["all", "men", "women", "unisex"].forEach(cat => {
            const btn = document.getElementById(`btn-filter-${cat}`);
            if (btn) {
                btn.addEventListener("click", () => {
                    this.activeCat = cat;
                    this.renderCatalogGrid();
                });
            }
        });

        const searchField = document.getElementById("catalogLiveInterfaceSearchField");
        if (searchField) {
            searchField.addEventListener("input", (e) => {
                this.queryText = e.target.value;
                this.renderCatalogGrid();
            });
        }
    },

    renderCatalogGrid() {
        const target = document.getElementById("catalogGridDynamicDisplayRoot");
        if (!target) return;

        const filtered = this.allProducts.filter(p => {
            const matchesCat = this.activeCat === "all" || p.category === this.activeCat;
            const text = `${p.nameEn || ''} ${p.nameAr || ''} ${p.descEn || ''} ${p.descAr || ''}`.toLowerCase();
            const matchesSearch = text.includes(this.queryText.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            target.innerHTML = `
                <div class="col-span-full text-center py-24 text-xs uppercase tracking-widest text-neutral-400">
                    No fragrances found
                </div>`;
            return;
        }

        target.innerHTML = "";
        UI.renderProductCards(filtered, target);
    },

    // ===================== PRODUCT PAGE =====================
    async initStandaloneProfilePage() {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get("id");

        const target = document.getElementById("productStandaloneFocusTarget");
        if (!pid || !target) return;

        if (this.allProducts && this.allProducts.length > 0) {
            const localProduct = this.allProducts.find(item => item.id === pid);
            if (localProduct) {
                target.innerHTML = "";
                UI.renderStandalonePage(localProduct, target);
                return;
            }
        }

        try {
            const docSnap = await getDoc(doc(db, "products", pid));
            if (!docSnap.exists()) {
                if (!target.innerHTML || target.innerHTML.trim() === "") {
                    target.innerHTML = `
                        <p class="text-center text-xs uppercase tracking-widest text-neutral-400 py-12">
                            Product not found
                        </p>`;
                }
                return;
            }

            const p = docSnap.data();
            p.id = docSnap.id;

            target.innerHTML = "";
            UI.renderStandalonePage(p, target);
        } catch (error) {
            console.error("Standalone single fetch execution failed:", error);
        }
    },
    
    initWishlistPage() {
        const target = document.getElementById("wishlistGridDynamicDisplayRoot");
        if (!target) return;

        const activeWishIds = JSON.parse(localStorage.getItem("lora_wish")) || [];
        if (activeWishIds.length === 0) {
            target.innerHTML = `
                <div class="col-span-full text-center py-24 text-xs uppercase tracking-widest text-neutral-400">
                    ${AppState.lang === 'en' ? 'Your curation manifest is completely empty' : 'قائمة أمنياتك فارغة تماماً'}
                </div>`;
            return;
        }

        const filtered = this.allProducts.filter(p => activeWishIds.includes(p.id));
        if (filtered.length > 0) {
            target.innerHTML = "";
            UI.renderProductCards(filtered, target);
        } else {
            target.innerHTML = `
                <div class="col-span-full text-center py-24 text-xs uppercase tracking-widest text-neutral-400">
                    ${AppState.lang === 'en' ? 'Your curation manifest is completely empty' : 'قائمة أمنياتك فارغة تماماً'}
                </div>`;
        }
    }
};

const setupDomExecutionPipeline = () => {
    ProductsModule.init();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDomExecutionPipeline);
} else {
    setupDomExecutionPipeline();
}

document.addEventListener("wishlistUpdated", () => {
    if (window.location.pathname.includes("wishlist.html")) {
        ProductsModule.initWishlistPage();
    }
});

export { ProductsModule };
