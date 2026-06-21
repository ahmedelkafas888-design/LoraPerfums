import { Cart, UI, AppState } from "./script.js";

const Checkout = {
    cart: [],

    init() {
        this.cart = Cart.get();

        this.renderItems();
        this.calculateTotals();
        this.bindCoupon();
        this.bindForm();
    },

    renderItems() {
        const container = document.getElementById("checkoutItemsBreakdownList");
        if (!container) return;

        if (!this.cart.length) {
            container.innerHTML = `
                <p class="text-xs text-neutral-400 uppercase tracking-widest">
                    Cart is empty
                </p>
            `;
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="flex justify-between text-xs border-b border-neutral-100 pb-2">
                <div>
                    <p class="font-medium">${AppState.lang === "en" ? item.nameEn : item.nameAr}</p>
                    <p class="text-[10px] text-neutral-400">x${item.qty}</p>
                </div>
                <div class="font-mono">
                    ${(item.price * item.qty).toFixed(2)} EGP
                </div>
            </div>
        `).join("");
    },

    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => {
            return sum + (Number(item.price) * Number(item.qty));
        }, 0);

        const subtotalEl = document.getElementById("chkSubtotalPriceDisplay");
        const totalEl = document.getElementById("chkGrandTotalPriceDisplay");

        if (subtotalEl) subtotalEl.innerText = `${subtotal.toFixed(2)} EGP`;
        if (totalEl) totalEl.innerText = `${subtotal.toFixed(2)} EGP`;

        this.subtotal = subtotal;
        this.total = subtotal;
    },

    bindCoupon() {
        const input = document.getElementById("couponCodeInputField");
        const btn = document.getElementById("applyCouponActionTriggerBtn");
        const feedback = document.getElementById("couponValidationFeedbackMessage");
        const discountRow = document.getElementById("couponDiscountLineRow");
        const discountValue = document.getElementById("chkCouponDiscountValueDisplay");

        if (!btn || !input) return;

        btn.addEventListener("click", () => {
            const code = input.value.trim().toLowerCase();

            if (!code) return;

            // 👇 مثال كوبون بسيط (تقدر تعدله من الادمن بعدين)
            let discount = 0;

            if (code === "lora10") {
                discount = this.subtotal * 0.10; // 10%
            } 
            else if (code === "lora20") {
                discount = this.subtotal * 0.20;
            }
            else {
                if (feedback) {
                    feedback.innerText = "Invalid coupon code";
                    feedback.classList.remove("hidden");
                }
                return;
            }

            const finalTotal = this.subtotal - discount;

            if (discountRow) discountRow.classList.remove("hidden");
            if (discountValue) discountValue.innerText = `- ${discount.toFixed(2)} EGP`;

            const totalEl = document.getElementById("chkGrandTotalPriceDisplay");
            if (totalEl) totalEl.innerText = `${finalTotal.toFixed(2)} EGP`;

            if (feedback) {
                feedback.innerText = "Coupon applied successfully";
                feedback.classList.remove("hidden");
            }
        });
    },

    bindForm() {
        const form = document.getElementById("checkoutProcessingFormStructure");

        if (!form) return;

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("chkFullName").value;
            const phone = document.getElementById("chkPhoneNumber").value;
            const city = document.getElementById("chkCity").value;
            const address = document.getElementById("chkAddress").value;
            const notes = document.getElementById("chkNotes").value;

            const order = {
                name,
                phone,
                city,
                address,
                notes,
                items: this.cart,
                total: this.total
            };

            console.log("ORDER:", order);

            // نجاح وهمي (تقدر تربطه بفايربيز أو واتساب بعدين)
            const modal = document.getElementById("loraPremiumOrderSuccessModalWindow");
            if (modal) {
                modal.classList.remove("hidden");
                modal.style.opacity = "1";
                modal.style.transform = "scale(1)";
            }
        });
    }
};

// ⬇️ تشغيل تلقائي + حل مشكلة التحميل المتأخر
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        Checkout.init();
    }, 100);
});
