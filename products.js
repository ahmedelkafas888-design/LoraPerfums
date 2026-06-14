import { db, collection, getDocs, getDoc, doc, onSnapshot } from "./firebase.js";
import { AppState, UI } from "./script.js";

const ProductsModule = {
    allProducts: [],
    activeCat: "all",
    queryText: "",
    
    // 👇 جديد: نظام عرض تدريجي
    homeLimit: 6,

    async init() {
        const path = window.location.pathname;

        if (path.includes("index.html") || path === "/" || path === "") {
            this.initHomepage();
        } else if (path.includes("products.html")) {
            this.initCatalogPage();
        } else if (path.includes("product.html")) {
            this.initStandaloneProfilePage();
        } else if (path.includes("wishlist.html")) {
            this.initWishlistPage();
        }
    },

    initHomepage() {
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
        });

        onSnapshot(collection(db, "products"), (snapshot) => {
            const target = document.getElementById("curatedShowcaseGridTarget");
            if (!target) return;

            this.allProducts = [];
            snapshot.forEach(d => this.allProducts.push({ id: d.id, ...d.data() }));

            this.renderHomepageProducts();

            // 👇 زر عرض المزيد
            this.createLoadMoreButton();
        });
    },

    renderHomepageProducts() {
        const target = document.getElementById("curatedShowcaseGridTarget");
        if (!target) return;

        const list = this.allProducts;

        if (list.length === 0) {
            target.innerHTML = `<div class="col-span-full text-center py-12 text-xs uppercase tracking-widest text-neutral-400">No fragrances available inside the catalog ledger.</div>`;
            return;
        }

        UI.renderProductCards(list.slice(0, this.homeLimit), target);
    },

    createLoadMoreButton() {
        let btn = document.getElementById("loadMoreProductsBtn");

        if (!btn) {
            btn = document.createElement("button");
            btn.id = "loadMoreProductsBtn";
            btn.innerText = "عرض المزيد";
            btn.className = "w-full mt-6 py-3 text-xs uppercase tracking-widest border border-neutral-300 hover:border-neutral-900 transition";

            const target = document.getElementById("curatedShowcaseGridTarget");
            if (target && target.parentNode) {
                target.parentNode.appendChild(btn);
            }

            btn.addEventListener("click", () => {
                this.homeLimit += 6;
                this.renderHomepageProducts();

                // اخفاء الزر لما يخلص
                if (this.homeLimit >= this.allProducts.length) {
                    btn.style.display = "none";
                }
            });
        }
    },

    async initCatalogPage() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("cat")) this.activeCat = params.get("cat");

        onSnapshot(collection(db, "products"), (snapshot) => {
            this.allProducts = [];
            snapshot.forEach(docSnap => this.allProducts.push({ id: docSnap.id, ...docSnap.data() }));
            this.renderCatalogGrid();
        });

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
            const matchesCat = this.activeCat === "all" || p.category === this.activeCat;
            const contentString = `${p.nameEn} ${p.nameAr} ${p.descEn} ${p.descAr}`.toLowerCase();
            const matchesSearch = contentString.includes(this.queryText.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            target.innerHTML = `<div class="col-span-full text-center py-24 text-xs uppercase tracking-widest text-neutral-400">No fine fragrances matched your specified criteria metrics.</div>`;
            return;
        }

        UI.renderProductCards(filtered, target);
    },

    async initStandaloneProfilePage() {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get("id");
        const target = document.getElementById("productStandaloneFocusTarget");
        if (!pid || !target) return;

        onSnapshot(doc(db, "products", pid), (docSnap) => {
            if (!docSnap.exists()) {
                target.innerHTML = `<p class="text-center text-xs uppercase tracking-widest text-neutral-400 py-12">Fragrance documentation profile missing inside active core dataset.</p>`;
                return;
            }
            const p = docSnap.data();
            p.id = docSnap.id;
            UI.renderStandalonePage(p, target);
        });
    }
};

document.addEventListener("DOMContentLoaded", () => ProductsModule.init());

export { ProductsModule };
