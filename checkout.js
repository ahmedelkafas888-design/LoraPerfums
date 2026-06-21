// checkout.js

const Cart = {
    get: () => JSON.parse(localStorage.getItem("lora_cart")) || []
};

let cartItems = [];
let subtotal = 0;
let discount = 0;

const el = {
    items: document.getElementById("checkoutItemsBreakdownList"),
    subtotal: document.getElementById("chkSubtotalPriceDisplay"),
    total: document.getElementById("chkGrandTotalPriceDisplay"),
    discountRow: document.getElementById("couponDiscountLineRow"),
    discountValue: document.getElementById("chkCouponDiscountValueDisplay"),
    couponInput: document.getElementById("couponCodeInputField"),
    applyBtn: document.getElementById("applyCouponActionTriggerBtn"),
    feedback: document.getElementById("couponValidationFeedbackMessage")
};

// ================== CALCULATIONS ==================

function calcSubtotal() {
    subtotal = cartItems.reduce((sum, item) => {
        return sum + (Number(item.price) * Number(item.qty));
    }, 0);
}

// ================== RENDER CART ==================

function renderCart() {
    if (!el.items) return;

    el.items.innerHTML = "";

    if (!cartItems.length) {
        el.items.innerHTML = `
            <p class="text-xs text-neutral-400 text-center">السلة فارغة</p>
        `;
        return;
    }

    cartItems.forEach(item => {
        const row = document.createElement("div");
        row.className = "flex justify-between text-xs border-b pb-2";

        row.innerHTML = `
            <span>${item.nameEn || item.nameAr} x ${item.qty}</span>
            <span>${Number(item.price) * Number(item.qty)} EGP</span>
        `;

        el.items.appendChild(row);
    });
}

// ================== UPDATE TOTALS ==================

function updateTotals() {
    calcSubtotal();

    if (el.subtotal) {
        el.subtotal.innerText = `${subtotal} EGP`;
    }

    const total = subtotal - discount;

    if (el.total) {
        el.total.innerText = `${total < 0 ? 0 : total} EGP`;
    }

    if (el.discountRow) {
        el.discountRow.classList.toggle("hidden", discount <= 0);
    }

    if (el.discountValue) {
        el.discountValue.innerText = `-${discount} EGP`;
    }
}

// ================== COUPON SYSTEM ==================

function applyCoupon() {
    const code = el.couponInput.value.trim().toLowerCase();

    if (!code) return;

    // مثال كوبونات
    if (code === "lora10") {

        if (cartItems.length >= 3) {
            discount = subtotal * 0.10;
            showMsg("تم تطبيق خصم 10% بنجاح", "green");
        } else {
            discount = 0;
            showMsg("لازم 3 عطور على الأقل لاستخدام الكوبون", "red");
        }

    } else {
        discount = 0;
        showMsg("كود غير صالح", "red");
    }

    updateTotals();
}

// ================== MESSAGE ==================

function showMsg(msg, color) {
    if (!el.feedback) return;

    el.feedback.innerText = msg;
    el.feedback.style.color = color;
    el.feedback.classList.remove("hidden");
}

// ================== INIT (IMPORTANT FIX) ==================

function initCheckout() {

    // 🔥 أهم حل لمشكلة 0 EGP
    const waitForCart = setInterval(() => {
        const data = Cart.get();

        if (data && data.length >= 0) {
            cartItems = data;

            calcSubtotal();
            renderCart();
            updateTotals();

            clearInterval(waitForCart);
        }
    }, 200);

    // coupon button
    if (el.applyBtn) {
        el.applyBtn.addEventListener("click", applyCoupon);
    }
}

// ================== RUN ==================

window.addEventListener("load", initCheckout);
