import { db, collection, getDocs, getDoc, doc, onSnapshot } from "./firebase.js";
import { AppState, UI } from "./script.js";

const ProductsModule = {
    allProducts: [],
    activeCat: "all",
    queryText: "",
    homeLimit: 6,
    loadMoreCreated: false,
    CACHE_KEY: "lora_products_cache_data",

    async init() {
        this.loadLocalCache();
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
        this.homeLimit = 6;
        this.loadMoreCreated = false;

        const homeTarget = document.getElementById("curatedShowcaseGridTarget");

        // 1. Instant Cache Render Strategy to Eliminate Blank Screen First Load Issues
        if (homeTarget && this.allProducts && this.allProducts.length > 0) {
            homeTarget.innerHTML = "";
            UI.renderProductCards(
                this.allProducts.slice(0, this.homeLimit),
                homeTarget
            );
            this.createLoadMoreButton();
            this.loadMoreCreated = true;
        }

        // Coupon banner layout sync stream remains real-time
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

        // 2. Stable Initial Loading System using getDocs with dynamic background refresh
        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            const list = [];
            querySnapshot.forEach(d => {
                list.push({ id: d.id, ...d.data() });
            });

            if (list.length > 0) {
                this.allProducts = list;
                this.saveLocalCache(list);

                const freshTarget = document.getElementById("curatedShowcaseGridTarget");
                if (freshTarget) {
                    freshTarget.innerHTML = "";
                    UI.renderProductCards(
                        this.allProducts.slice(0, this.homeLimit),
                        freshTarget
                    );

                    const btn = document.getElementById("loadMoreProductsBtn");
                    if (!this.loadMoreCreated) {
                        this.createLoadMoreButton();
                        this.loadMoreCreated = true;
                    } else if (btn) {
                        btn.style.display = this.homeLimit >= this.allProducts.length ? "none" : "block";
                    }
                }
            } else if (!this.allProducts || this.allProducts.length === 0) {
                if (homeTarget) {
                    homeTarget.innerHTML = `
                        <div class="col-span-full text-center py-12 text-xs text-neutral-400">
                            No fragrances available
                        </div>`;
                }
            }
        } catch (error) {
            console.error("Firestore loading system error, running cache fallback path:", error);
            if (homeTarget && (!this.allProducts || this.allProducts.length === 0)) {
                homeTarget.innerHTML = `
                    <div class="col-span-full text-center py-12 text-xs text-neutral-400">
                        No fragrances available. Please check your connection.
                    </div>`;
            }
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

            btn.className =
                "w-full mt-6 py-3 text-xs uppercase tracking-widest border border-neutral-300 hover:border-neutral-900 transition";

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

        const target = document.getElementById("catalogGridDynamicDisplayRoot");
        if (target && this.allProducts && this.allProducts.length > 0) {
            this.renderCatalogGrid();
        }

        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            const list = [];
            querySnapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            if (list.length > 0) {
                this.allProducts = list;
                this.saveLocalCache(list);
                this.renderCatalogGrid();
            }
        } catch (error) {
            console.error("Catalog background sync failed:", error);
        }

        this.bindCatalogFilters();
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
            const matchesCat =
                this.activeCat === "all" || p.category === this.activeCat;

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
        // Structurally handled inside script.js lifecycle context
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

export { ProductsModule };
