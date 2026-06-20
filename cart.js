import { db, collection, getDocs, addDoc } from "./firebase.js";
import { AppState, Cart, UI } from "./script.js";

const CartPageModule = {
    calculatedSubtotal: 0,
    applicableDiscountPercent: 0,
    validatedCouponCodeStr: "",

    init() {
        // مزامنة حالة السلة فوراً عند تحميل الموديول
        this.syncInPageCartState();
    },

    syncInPageCartState() {
        const items = Cart.get();
        this.calculatedSubtotal = items.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.qty)), 0);
        this.recalculateCheckoutPricing();
    },

    async handleCouponApplicationInline(codeString) {
        if (!codeString) return { success: false, percentage: 0 };
        try {
            const snap = await getDocs(collection(db, "coupons"));
            let found = null;
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.code.toUpperCase() === codeString.toUpperCase() && data.enabled === true) {
                    found = data;
                }
            });

            if (found) {
                this.applicableDiscountPercent = parseInt(found.percentage || 0);
                this.validatedCouponCodeStr = found.code;
                this.recalculateCheckoutPricing();
                return { success: true, percentage: this.applicableDiscountPercent, code: found.code };
            }
        } catch (err) {
            console.error("Coupon cross-validation pipeline failure:", err);
        }
        this.applicableDiscountPercent = 0;
        this.validatedCouponCodeStr = "";
        this.recalculateCheckoutPricing();
        return { success: false, percentage: 0 };
    },

    recalculateCheckoutPricing() {
        const discAmt = Math.round((this.calculatedSubtotal * this.applicableDiscountPercent) / 100);
        const finalTotal = this.calculatedSubtotal - discAmt;

        const totalSummaryEl = document.getElementById("checkoutOrderTotalSummary");
        if (totalSummaryEl) {
            totalSummaryEl.innerText = `${finalTotal.toFixed(2)} AED`;
        }
    }
};

document.addEventListener("DOMContentLoaded", () => CartPageModule.init());
document.addEventListener("cartUpdated", () => CartPageModule.syncInPageCartState());

export { CartPageModule };
