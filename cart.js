import { db, collection, getDocs, addDoc } from "./firebase.js";
import { AppState, Cart, UI } from "./script.js";

const CartPageModule = {
    calculatedSubtotal: 0,
    applicableDiscountPercent: 0,
    validatedCouponCodeStr: "",

    init() {
        const path = window.location.pathname;
        if (path.includes("cart.html")) {
            this.renderCartView();
        } else if (path.includes("checkout.html")) {
            this.initCheckoutView();
        }
    },

    renderCartView() {
        const container = document.getElementById("cartPageItemsContainerNode");
        const sumDisplay = document.getElementById("cartComputedSummaryTotalValueNode");
        const heroTitle = document.getElementById("cartHeroTitle");
        
        if (heroTitle) {
            heroTitle.innerText = AppState.lang === 'en' ? "Your Shopping Cart" : "سلة التسوق الخاصة بك";
        }

        if (!container) return;

        const items = Cart.get();
        if (items.length === 0) {
            container.innerHTML = `<div class="text-center py-16 border border-dashed border-neutral-200 text-xs uppercase tracking-widest text-neutral-400 font-sans">Your shopping trunk is currently empty.</div>`;
            if (sumDisplay) sumDisplay.innerText = "0 EGP";
            return;
        }

        let total = 0;
        container.innerHTML = items.map(item => {
            const itemCost = parseFloat(item.price) * parseInt(item.qty);
            total += itemCost;
            return `
                <div class="bg-white border border-neutral-200 p-4 flex flex-row items-center justify-between gap-4 shadow-sm">
                    <div class="flex items-center gap-4 w-full sm:w-auto">
                        <img src="${item.image}" class="w-16 h-16 object-cover border border-neutral-100">
                        <div>
                            <h4 class="text-sm font-medium text-neutral-900">${AppState.lang === 'en' ? item.nameEn : item.nameAr}</h4>
                            <p class="text-xs text-neutral-400 font-mono">${item.size || '100'}ml @ ${item.price} EGP</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div class="flex items-center border border-neutral-200 bg-neutral-50">
                            <button data-action="dec" data-id="${item.id}" data-qty="${item.qty}" class="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">-</button>
                            <span class="px-3 text-xs font-mono text-neutral-800">${item.qty}</span>
                            <button data-action="inc" data-id="${item.id}" data-qty="${item.qty}" class="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">+</button>
                        </div>
                        <span class="text-sm font-bold text-neutral-900 font-mono">${itemCost} EGP</span>
                        <button data-action="del" data-id="${item.id}" class="text-neutral-300 hover:text-red-600 transition-colors text-sm">✕</button>
                    </div>
                </div>
            `;
        }).join('');

        if (sumDisplay) sumDisplay.innerText = `${total} EGP`;
        this.bindCartActions();
    },

    bindCartActions() {
        document.querySelectorAll("[data-action]").forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll("[data-action]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const action = btn.getAttribute("data-action");
                const id = btn.getAttribute("data-id");
                const currentQty = parseInt(btn.getAttribute("data-qty") || 0);

                if (action === "inc") {
                    Cart.updateQty(id, currentQty + 1);
                    this.renderCartView();
                } else if (action === "dec") {
                    if (currentQty - 1 <= 0) {
                        Cart.remove(id);
                    } else {
                        Cart.updateQty(id, currentQty - 1);
                    }
                    this.renderCartView();
                } else if (action === "del") {
                    Cart.remove(id);
                    this.renderCartView();
                }
            });
        });
    },

    initCheckoutView() {
        const urlParams = new URLSearchParams(window.location.search);
        const buyNowPid = urlParams.get("buynow");
        
        if (buyNowPid) {
            const singleItem = JSON.parse(sessionStorage.getItem("lora_buynow_payload"));
            if (singleItem && singleItem.id === buyNowPid) {
                this.setupCheckoutDom([singleItem]);
                return;
            }
        }

        const items = Cart.get();
        if (items.length === 0) {
            window.location.href = "cart.html";
            return;
        }

        this.setupCheckoutDom(items);
    },

    setupCheckoutDom(items) {
        const breakdown = document.getElementById("checkoutItemsBreakdownList");
        this.calculatedSubtotal = 0;
        
        if (breakdown) {
            breakdown.innerHTML = items.map(i => {
                const lineCost = parseFloat(i.price) * parseInt(i.qty);
                this.calculatedSubtotal += lineCost;
                return `
                    <div class="flex justify-between items-center text-xs text-neutral-600 font-sans">
                        <span>${AppState.lang === 'en' ? i.nameEn : i.nameAr} <span class="font-mono text-[11px]">x${i.qty} (${i.size}ml)</span></span>
                        <span class="font-mono">${lineCost} EGP</span>
                    </div>
                `;
            }).join('');
        }

        const savedCoupon = sessionStorage.getItem("lora_applied_coupon");
        if (savedCoupon) {
            const cp = JSON.parse(savedCoupon);
            this.applicableDiscountPercent = cp.percentage;
            this.validatedCouponCodeStr = cp.code;
            const feedback = document.getElementById("couponValidationFeedbackMessage");
            if (feedback) {
                feedback.className = "text-[11px] font-medium text-green-600";
                feedback.innerText = AppState.lang === 'en' ? `Coupon "${cp.code}" auto-synced.` : `تم مزامنة كود الخصم "${cp.code}".`;
                feedback.classList.remove("hidden");
                const cpInput = document.getElementById("couponCodeInputField");
                if (cpInput) cpInput.value = cp.code;
            }
        }

        this.recalculateCheckoutPricing();

        const applyCouponBtn = document.getElementById("applyCouponActionTriggerBtn");
        if (applyCouponBtn) {
            applyCouponBtn.replaceWith(applyCouponBtn.cloneNode(true));
            document.getElementById("applyCouponActionTriggerBtn").addEventListener("click", () => this.handleCouponApplication());
        }

        const checkoutForm = document.getElementById("checkoutProcessingFormStructure");
        if (checkoutForm) {
            checkoutForm.replaceWith(checkoutForm.cloneNode(true));
            document.getElementById("checkoutProcessingFormStructure").addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleCheckoutSubmission(items);
            });
        }
    },

    async handleCouponApplication() {
        const codeIn = document.getElementById("couponCodeInputField").value.trim().toUpperCase();
        const feedback = document.getElementById("couponValidationFeedbackMessage");
        if (!codeIn) return;

        feedback.classList.remove("hidden", "text-red-600", "text-green-600");
        feedback.className = "text-[11px] font-medium text-neutral-500";
        feedback.innerText = AppState.lang === 'en' ? "Validating coupon tracking matrix..." : "جاري التحقق من كود الخصم...";
        feedback.classList.remove("hidden");

        const snap = await getDocs(collection(db, "coupons"));
        let found = null;
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.code.toUpperCase() === codeIn && data.enabled === true) {
                found = data;
            }
        });

        if (found) {
            this.applicableDiscountPercent = parseInt(found.percentage || 0);
            this.validatedCouponCodeStr = found.code;
            sessionStorage.setItem("lora_applied_coupon", JSON.stringify({ code: found.code, percentage: found.percentage }));
            feedback.className = "text-[11px] font-medium text-green-600";
            feedback.innerText = AppState.lang === 'en' ? `Coupon "${found.code}" applied successfully!` : `تم تطبيق كود الخصم "${found.code}" بنجاح!`;
        } else {
            this.applicableDiscountPercent = 0;
            this.validatedCouponCodeStr = "";
            sessionStorage.removeItem("lora_applied_coupon");
            feedback.className = "text-[11px] font-medium text-red-600";
            feedback.innerText = AppState.lang === 'en' ? "Invalid or expired promotional token." : "كود الخصم غير صحيح أو منتهي الصلاحية.";
        }
        this.recalculateCheckoutPricing();
    },

    recalculateCheckoutPricing() {
        const discAmt = Math.round((this.calculatedSubtotal * this.applicableDiscountPercent) / 100);
        const finalTotal = this.calculatedSubtotal - discAmt;

        document.getElementById("chkSubtotalPriceDisplay").innerText = `${this.calculatedSubtotal} EGP`;
        const rowNode = document.getElementById("couponDiscountLineRow");
        
        if (discAmt > 0) {
            document.getElementById("chkCouponDiscountValueDisplay").innerText = `-${discAmt} EGP`;
            rowNode.classList.remove("hidden");
        } else {
            rowNode.classList.add("hidden");
        }

        document.getElementById("chkGrandTotalPriceDisplay").innerText = `${finalTotal} EGP`;
    },

    async handleCheckoutSubmission(items) {
        const name = document.getElementById("chkFullName").value.trim();
        const phone = document.getElementById("chkPhoneNumber").value.trim();
        const city = document.getElementById("chkCity").value.trim();
        const addr = document.getElementById("chkAddress").value.trim();
        const notes = document.getElementById("chkNotes").value.trim();
        const discountAmt = Math.round((this.calculatedSubtotal * this.applicableDiscountPercent) / 100);
        const finalBill = this.calculatedSubtotal - discountAmt;

        const orderPayload = {
            customerName: name,
            customerPhone: phone,
            customerCity: city,
            customerAddress: addr,
            customerNotes: notes,
            itemsOrdered: items,
            subtotal: this.calculatedSubtotal,
            couponUsed: this.validatedCouponCodeStr || null,
            discountValue: discountAmt,
            finalPrice: finalBill,
            timestamp: Date.now()
        };

        await addDoc(collection(db, "orders"), orderPayload);

        let waText = `LORA PERFUME STORE ORDER\n=========================\n`;
        items.forEach((i, idx) => {
            waText += `${idx+1}. ${i.nameEn} [${i.size}ml] x${i.qty} -> ${parseFloat(i.price)*parseInt(i.qty)} EGP\n`;
        });
        waText += `=========================\n`;
        waText += `Subtotal: ${this.calculatedSubtotal} EGP\n`;
        if (this.validatedCouponCodeStr) waText += `Coupon: ${this.validatedCouponCodeStr} (-${discountAmt} EGP)\n`;
        waText += `Grand Total: ${finalBill} EGP\n\n`;
        waText += `DELIVERY LOGISTICS:\n• Name: ${name}\n• Phone: ${phone}\n• City: ${city}\n• Address: ${addr}\n• Notes: ${notes || 'None'}`;

        const cleanNum = AppState.whatsappNumber.replace(/\D/g, "");
        const targetNumber = cleanNum.startsWith("2") ? cleanNum : "2" + cleanNum;
        
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get("buynow")) {
            localStorage.removeItem("lora_cart");
        }
        sessionStorage.removeItem("lora_buynow_payload");
        sessionStorage.removeItem("lora_applied_coupon");
        
        window.location.href = `https://wa.me/${targetNumber}?text=${encodeURIComponent(waText)}`;
    }
};

document.addEventListener("DOMContentLoaded", () => CartPageModule.init());

export { CartPageModule };
