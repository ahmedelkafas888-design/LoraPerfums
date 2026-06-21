// checkout.js
import { db, collection, onSnapshot, addDoc } from "./firebase.js";
import { AppState, Cart, UI } from "./script.js";

const CheckoutModule = {
    cartItems: [],
    subtotal: 0,
    discountAmount: 0,
    finalTotal: 0,
    activeCoupon: null,

    init() {
        // 1. Ensure DOM is ready, show loading state to prevent flickering 0 EGP
        this.showLuxuryLoadingState();
        
        // 2. Load Cart Data with absolute safely
        this.loadCartData();

        // 3. Setup Coupon Live Synchronizer from Firebase to match dynamic limits
        this.initCouponSystem();

        // 4. Bind Event Listeners for Promo Form and Checkout execution
        this.bindEvents();
    },

    showLuxuryLoadingState() {
        const subtotalEl = document.getElementById("checkoutSubtotalDisplay");
        const totalEl = document.getElementById("checkoutTotalDisplay");
        if (subtotalEl) subtotalEl.innerText = AppState.lang === 'en' ? "Calculating..." : "جاري الحساب...";
        if (totalEl) totalEl.innerText = AppState.lang === 'en' ? "Calculating..." : "جاري الحساب...";
    },

    loadCartData() {
        // Prevent race condition by extracting payload or full localStorage trunk directly
        const urlParams = new URLSearchParams(window.location.search);
        const isBuyNow = urlParams.get("buynow");

        if (isBuyNow) {
            try {
                const singlePayload = JSON.parse(sessionStorage.getItem("lora_buynow_payload"));
                this.cartItems = singlePayload ? [singlePayload] : [];
            } catch (exErr) {
                console.error("Parsing buy-now payload failed:", exErr);
                this.cartItems = [];
            }
        }

        if (!this.cartItems || this.cartItems.length === 0) {
            this.cartItems = Cart.get();
        }

        // Calculate raw subtotal based on trusted data source
        this.calculateTotals();
    },

    calculateTotals() {
        this.subtotal = this.cartItems.reduce((acc, item) => {
            const price = parseFloat(item.price || 0);
            const qty = parseInt(item.qty || 1);
            return acc + (price * qty);
        }, 0);

        this.applyCouponLogic();
        this.renderSummaryUI();
    },

    initCouponSystem() {
        // Real-time synchronization of active coupon settings from Firebase
        onSnapshot(collection(db, "coupons"), (snapshot) => {
            let firebaseCoupon = null;
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.enabled === true) {
                    firebaseCoupon = { id: docSnap.id, ...data };
                }
            });

            // Cache active coupon structure for instant application validation
            this.liveFirebaseCouponData = firebaseCoupon;
            
            // Recalculate immediately if a coupon was already applied prior to snapshot resolution
            if (this.activeCoupon) {
                this.validateAndReapplyCoupon();
            }
        }, (error) => {
            console.error("Coupon stream failure on checkout initialization:", error);
        });
    },

    validateAndReapplyCoupon() {
        if (!this.liveFirebaseCouponData || this.liveFirebaseCouponData.code !== this.activeCoupon.code) {
            this.activeCoupon = null;
            this.discountAmount = 0;
            UI.toast(AppState.lang === 'en' ? "Applied coupon is no longer active." : "الكوبون المطبق لم يعد فعالاً.");
        } else {
            const totalProductsCount = this.cartItems.reduce((sum, item) => sum + parseInt(item.qty || 1), 0);
            const minProductsRule = parseInt(this.liveFirebaseCouponData.minimumProducts || 0);

            if (totalProductsCount < minProductsRule) {
                this.activeCoupon = null;
                this.discountAmount = 0;
                const errMsg = AppState.lang === 'en' 
                    ? `Coupon requires a minimum of ${minProductsRule} items.` 
                    : `يتطلب الكوبون وجود ${minProductsRule} عطور أو أكثر في الحقيبة.`;
                UI.toast(errMsg);
            } else {
                const pct = parseFloat(this.liveFirebaseCouponData.percentage || 0);
                this.discountAmount = (this.subtotal * pct) / 100;
            }
        }
        this.finalTotal = Math.max(0, this.subtotal - this.discountAmount);
        this.renderSummaryUI();
    },

    applyCouponLogic() {
        if (this.activeCoupon) {
            const pct = parseFloat(this.activeCoupon.percentage || 0);
            this.discountAmount = (this.subtotal * pct) / 100;
        } else {
            this.discountAmount = 0;
        }
        this.finalTotal = Math.max(0, this.subtotal - this.discountAmount);
    },

    renderSummaryUI() {
        const subtotalEl = document.getElementById("checkoutSubtotalDisplay") || document.getElementById("subtotalPriceValue");
        const discountEl = document.getElementById("checkoutDiscountDisplay") || document.getElementById("discountPriceValue");
        const totalEl = document.getElementById("checkoutTotalDisplay") || document.getElementById("finalTotalPriceValue");
        const summaryItemsContainer = document.getElementById("checkoutSummaryItemsListGrid");

        if (subtotalEl) subtotalEl.innerText = `${this.subtotal.toFixed(2)} EGP`;
        if (discountEl) discountEl.innerText = `${this.discountAmount.toFixed(2)} EGP`;
        if (totalEl) totalEl.innerText = `${this.finalTotal.toFixed(2)} EGP`;

        // Render mini items breakdown safely if container exists
        if (summaryItemsContainer && this.cartItems.length > 0) {
            summaryItemsContainer.innerHTML = "";
            this.cartItems.forEach(item => {
                const name = AppState.lang === 'en' ? item.nameEn : item.nameAr;
                const node = document.createElement("div");
                node.className = "flex items-center justify-between text-xs py-2 border-b border-neutral-100 font-sans";
                node.innerHTML = `
                    <div class="flex items-center space-x-3 space-x-reverse">
                        <img src="${item.image}" class="w-10 h-10 object-cover border border-neutral-100">
                        <div>
                            <p class="font-light text-neutral-900">${name}</p>
                            <p class="text-[10px] text-neutral-400">${item.size || '100'}ml x${item.qty}</p>
                        </div>
                    </div>
                    <span class="font-mono text-neutral-900">${(parseFloat(item.price) * parseInt(item.qty)).toFixed(2)} EGP</span>
                `;
                summaryItemsContainer.appendChild(node);
            });
        }
    },

    bindEvents() {
        const couponForm = document.getElementById("checkoutPromoCodeFormSubmissionPanel") || document.getElementById("applyCouponButtonBtn")?.closest("div");
        const couponInput = document.getElementById("checkoutCouponInputField") || document.getElementById("couponCodeInputText");
        const couponBtn = document.getElementById("applyCouponButtonBtn");

        const handleCouponSubmission = (e) => {
            if (e) e.preventDefault();
            if (!couponInput) return;

            const typedCode = couponInput.value.trim().toUpperCase();
            if (!typedCode) {
                UI.toast(AppState.lang === 'en' ? "Please insert a coupon code." : "برجاء كتابة كود الخصم أولاً.");
                return;
            }

            if (!this.liveFirebaseCouponData || this.liveFirebaseCouponData.code.toUpperCase() !== typedCode) {
                UI.toast(AppState.lang === 'en' ? "Invalid or expired promotional code." : "كود الخصم غير صحيح أو منتهي الصلاحية.");
                return;
            }

            const totalProductsCount = this.cartItems.reduce((sum, item) => sum + parseInt(item.qty || 1), 0);
            const minProductsRule = parseInt(this.liveFirebaseCouponData.minimumProducts || 0);

            if (totalProductsCount < minProductsRule) {
                const errMsg = AppState.lang === 'en' 
                    ? `This coupon requires at least ${minProductsRule} items in your trunk.` 
                    : `هذا الكوبون يتطلب وجود ${minProductsRule} عطور أو أكثر في حقيبتك لتفعيله.`;
                UI.toast(errMsg);
                return;
            }

            this.activeCoupon = this.liveFirebaseCouponData;
            this.validateAndReapplyCoupon();
            UI.toast(AppState.lang === 'en' ? "Luxury discount applied successfully." : "تم تطبيق خصم الكوبون بنجاح.");
        };

        if (couponBtn) {
            couponBtn.addEventListener("click", handleCouponSubmission);
        } else if (couponForm && couponForm.tagName === "FORM") {
            couponForm.addEventListener("submit", handleCouponSubmission);
        }
    }
};

// Guarantee synchronous state loading immediately on load script execution matching workflow rules
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => CheckoutModule.init());
} else {
    CheckoutModule.init();
}

export { CheckoutModule };
