// script.js
import { db, doc, setDoc, addDoc, collection, onSnapshot } from "./firebase.js";

const AppState = {
    lang: localStorage.getItem("lora_lang") || "ar",
    telegramBotToken: "7466548766:AAFnM0_7o4Y8UonX0UuFz_96l86hW33vYp0",
    telegramChatId: "5670154869",
    whatsappNumber: "201000000000"
};

const Dictionary = {
    en: {
        navHome: "Home", navProducts: "Fragrances", navWishlist: "Wishlist", navAdmin: "Atelier Vault",
        promoText: "Exclusive Discounts & Special Offers", mensTitle: "MEN'S COLLECTION", womensTitle: "WOMEN'S COLLECTION",
        searchPlaceholder: "Search parameters...", addToCart: "Add to Bag", soldOut: "SOLD OUT",
        cartTitle: "Your Shopping Trunk", totalVal: "Total Cost", checkoutBtn: "Proceed to Checkout",
        shippingInfo: "Shipping Information", fullName: "Full Name", phoneNumber: "Phone Number",
        cityName: "City", fullAddress: "Address", orderNotes: "Order Notes (Optional)",
        executeCheckout: "Confirm Secure Order", orderSummary: "Order Summary",
        subtotal: "Subtotal", couponCode: "Have a coupon?", navBackToCart: "Return to Bag",
        wishlistTitle: "Your Curated Desires",
        modalSuccessTitle: "Order Confirmed",
        modalSuccessMsg: "Thank you for shopping with LORA. Your luxury order allocation request was submitted successfully.",
        modalContBtn: "Continue Shopping", modalHomeBtn: "Back To Home",
        cartTotalLabel: "Total Amount", cartCheckoutBtn: "Proceed To Checkout",
        checkoutTitle: "Secure Checkout", formName: "Full Name", formPhone: "Phone Number",
        formCity: "City / Emirate", formAddress: "Delivery Address", summaryTotal: "Grand Total"
    },
    ar: {
        navHome: "الرئيسية", navProducts: "العطور", navWishlist: "الأمنيات", navAdmin: "منصة الإدارة",
        promoText: "خصومات وعروض حصرية", mensTitle: "مجموعة العطور الرجالية", womensTitle: "مجموعة العطور النسائية",
        searchPlaceholder: "ابحث في المجموعات...", addToCart: "إضافة للحقيبة", soldOut: "نفذت الكمية",
        cartTitle: "حقيبة المقتنيات", totalVal: "إجمالي التكلفة", checkoutBtn: "الاستمرار لتأكيد الطلب",
        shippingInfo: "بيانات الشحن والتوصيل", fullName: "الاسم الكامل", phoneNumber: "رقم الهاتف",
        cityName: "المدينة", fullAddress: "العنوان بالتفصيل", orderNotes: "ملاحظات إضافية (اختياري)",
        executeCheckout: "تأكيد الطلب والدفع عند الاستلام", orderSummary: "ملخص الطلب",
        subtotal: "المجموع الفرعي", couponCode: "لديك كود خصم؟", navBackToCart: "العودة للحقيبة",
        wishlistTitle: "قائمة أمنياتك المنسقة",
        modalSuccessTitle: "تمت العملية بنجاح",
        modalSuccessMsg: "شكراً لتسوقك مع لورا. تم تسجيل طلبك بنجاح في نظامنا وجاري مراجعته.",
        modalContBtn: "استمرار التسوق", modalHomeBtn: "الرئيسية",
        cartTotalLabel: "إجمالي المبلغ", cartCheckoutBtn: "الاستمرار لتأكيد الطلب",
        checkoutTitle: "إتمام الشراء الآمن", formName: "الاسم الكامل", formPhone: "رقم الهاتف",
        formCity: "المدينة / الإمارة", formAddress: "عنوان التوصيل بالتفصيل", summaryTotal: "المجموع الكلي"
    }
};

const Cart = {
    get: () => {
        try {
            return JSON.parse(localStorage.getItem("lora_cart")) || [];
        } catch (e) {
            console.error("Cart retrieval fallback:", e);
            return [];
        }
    },
    save: (items) => {
        try {
            localStorage.setItem("lora_cart", JSON.stringify(items));
        } catch (e) {
            console.error("Cart persistent serialization failure:", e);
        }
        document.dispatchEvent(new CustomEvent("cartUpdated"));
        UI.syncBadges();
        UI.renderDrawerCartContent();
    },
    add: (product, imageEl) => {
        let items = Cart.get();
        const existing = items.find(i => i.id === product.id);
        const hasDisc = product.discountPrice && parseFloat(product.discountPrice) < parseFloat(product.price);
        const finalPrice = hasDisc ? product.discountPrice : product.price;

        if (existing) {
            existing.qty = parseInt(existing.qty) + 1;
        } else {
            items.push({
                id: product.id,
                nameEn: product.nameEn,
                nameAr: product.nameAr,
                price: finalPrice,
                image: product.image,
                size: product.size || "100",
                qty: 1
            });
        }
        
        if (imageEl) {
            const target = document.getElementById("globalCartAnchor");
            if (target) {
                try {
                    const rect = imageEl.getBoundingClientRect();
                    const targetRect = target.getBoundingClientRect();
                    
                    const clone = imageEl.cloneNode();
                    clone.className = "animating-product-node";
                    clone.style.top = `${rect.top + window.scrollY}px`;
                    clone.style.left = `${rect.left + window.scrollX}px`;
                    clone.style.width = `${rect.width}px`;
                    clone.style.height = `${rect.height}px`;
                    
                    const xDist = targetRect.left - rect.left;
                    const yDist = targetRect.top - rect.top;
                    
                    clone.style.setProperty("--x", `${xDist}px`);
                    clone.style.setProperty("--y", `${yDist}px`);
                    clone.style.animation = "flyToCart 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards";
                    
                    document.body.appendChild(clone);
                    setTimeout(() => clone.remove(), 800);
                } catch (animationErr) {
                    console.error("Fly-to-cart animation catch-suppressed:", animationErr);
                }
            }
        }

        Cart.save(items);
        UI.toast(AppState.lang === 'en' ? "Fragrance allocated inside shopping trunk." : "تم إضافة العطر للحقيبة بنجاح.");
        UI.openDrawer();
    },
    remove: (id) => {
        let items = Cart.get().filter(i => i.id !== id);
        Cart.save(items);
    },
    updateQty: (id, qty) => {
        if (parseInt(qty) <= 0) {
            Cart.remove(id);
            return;
        }
        let items = Cart.get();
        const existing = items.find(i => i.id === id);
        if (existing) {
            existing.qty = parseInt(qty);
            Cart.save(items);
        }
    }
};

const Wishlist = {
    get: () => {
        try {
            return JSON.parse(localStorage.getItem("lora_wish")) || [];
        } catch (e) {
            console.error("Wishlist recovery execution bypass:", e);
            return [];
        }
    },
    has: (id) => Wishlist.get().includes(id),
    toggle: (id) => {
        let items = Wishlist.get();
        if (items.includes(id)) {
            items = items.filter(i => i !== id);
            UI.toast(AppState.lang === 'en' ? "Removed from curation registry." : "تم الحذف من قائمة الأمنيات.");
        } else {
            items.push(id);
            UI.toast(AppState.lang === 'en' ? "Saved inside desires manifest." : "تم الحفظ في قائمة الأمنيات.");
        }
        try {
            localStorage.setItem("lora_wish", JSON.stringify(items));
        } catch (e) {
            console.error("Wishlist state failure:", e);
        }
        document.dispatchEvent(new CustomEvent("wishlistUpdated"));
        UI.syncBadges();
    }
};

const AnalyticsTracker = {
    async logVisitor() {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const visitorKey = `lora_v_${todayStr}`;
            
            if (!localStorage.getItem(visitorKey)) {
                const docRef = doc(db, "analytics", todayStr);
                await setDoc(docRef, { visitorsToday: Math.floor(Math.random() * 10) + 1 }, { merge: true });
                localStorage.setItem(visitorKey, "true");
            }
            
            const activeSessionId = Math.random().toString(36).substring(2, 15);
            await setDoc(doc(db, "analytics_live", activeSessionId), { timestamp: Date.now() });
        } catch (e) {
            console.error("Visitor logging structural capture failure:", e);
        }
    }
};

const NotificationEngine = {
    async broadcastTelegramAlert(orderId, name, phone, totalPrice) {
        try {
            const message = `🚨 *NEW INTERNAL LORA ORDER* 🚨\n\n🆔 *Order ID:* ${orderId}\n👤 *Customer:* ${name}\n📞 *Phone:* ${phone}\n💰 *Total Price:* ${totalPrice} AED\n\n🖥️ Please monitor the Atelier Vault Order Dashboard for fulfillment parameters.`;
            const url = `https://api.telegram.org/bot${AppState.telegramBotToken}/sendMessage`;
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: AppState.telegramChatId,
                    text: message,
                    parse_mode: "Markdown"
                })
            });
        } catch (err) {
            console.error("Notification gateway broadcast pipeline error:", err);
        }
    }
};

const UI = {
    localizeDOM: () => {
        try {
            const root = document.documentElement;
            root.setAttribute("lang", AppState.lang);
            root.setAttribute("dir", AppState.lang === 'ar' ? 'rtl' : 'ltr');
            document.body.setAttribute("dir", AppState.lang === 'ar' ? 'rtl' : 'ltr');

            document.querySelectorAll("[data-i18n]").forEach(el => {
                const key = el.getAttribute("data-i18n");
                if (Dictionary[AppState.lang] && Dictionary[AppState.lang][key]) {
                    el.innerText = Dictionary[AppState.lang][key];
                }
            });
            document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
                const key = el.getAttribute("data-i18n-placeholder");
                if (Dictionary[AppState.lang] && Dictionary[AppState.lang][key]) {
                    el.setAttribute("placeholder", Dictionary[AppState.lang][key]);
                }
            });
            
            const langToggle = document.getElementById("globalLangToggle");
            if (langToggle) langToggle.innerText = AppState.lang === 'en' ? "العربية" : "English";
        } catch (err) {
            console.error("Localization engine execution halted safely:", err);
        }
    },
    syncBadges: () => {
        try {
            const cBadge = document.getElementById("cartBadgeCount");
            const wBadge = document.getElementById("wishlistBadgeCount");
            
            if (cBadge) cBadge.innerText = Cart.get().reduce((sum, i) => sum + parseInt(i.qty || 0), 0);
            if (wBadge) wBadge.innerText = Wishlist.get().length;
        } catch (err) {
            console.error("Badge rendering logic safely detached:", err);
        }
    },
    toast: (msg) => {
        const stack = document.getElementById("toastContainerStack");
        if (!stack) return;
        try {
            const node = document.createElement("div");
            node.className = "toast-node";
            node.innerText = msg;
            stack.appendChild(node);
            setTimeout(() => {
                if (node.parentNode) {
                    node.style.animation = "slideInUp 0.4s reverse ease forwards";
                    setTimeout(() => { if (node.parentNode) node.remove(); }, 400);
                }
            }, 3000);
        } catch (err) {
            console.error("Toast notifications execution error bypass:", err);
        }
    },
    openDrawer: () => {
        const drawer = document.getElementById("globalCartDrawer");
        const backdrop = document.getElementById("drawerBackdrop");
        const panel = document.getElementById("drawerPanel");
        
        if (!drawer || !backdrop || !panel) return;
        
        UI.renderDrawerCartContent();
        
        drawer.classList.remove("pointer-events-none");
        backdrop.classList.replace("opacity-0", "opacity-100");
        panel.classList.replace("translate-x-full", "translate-x-0");
        
        document.getElementById("drawerCartStep").classList.remove("hidden");
        document.getElementById("drawerCheckoutStep").classList.add("hidden");
    },
    closeDrawer: () => {
        const drawer = document.getElementById("globalCartDrawer");
        const backdrop = document.getElementById("drawerBackdrop");
        const panel = document.getElementById("drawerPanel");
        
        if (!drawer || !backdrop || !panel) return;
        
        drawer.classList.add("pointer-events-none");
        backdrop.classList.replace("opacity-100", "opacity-0");
        panel.classList.replace("translate-x-0", "translate-x-full");
    },
    renderDrawerCartContent: () => {
        const container = document.getElementById("drawerCartItemsContainer");
        const subtotalEl = document.getElementById("drawerCartSubtotal");
        if (!container || !subtotalEl) return;
        
        const items = Cart.get();
        if (items.length === 0) {
            container.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-center opacity-60 py-12">
                    <svg class="w-8 h-8 text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                    <p class="text-xs tracking-widest uppercase">${AppState.lang === 'en' ? 'Trunk is empty' : 'الحقيبة فارغة حالياً'}</p>
                </div>
            `;
            subtotalEl.innerText = "0.00 AED";
            return;
        }
        
        container.innerHTML = "";
        let total = 0;
        
        items.forEach(item => {
            const cost = parseFloat(item.price) * parseInt(item.qty);
            total += cost;
            
            const node = document.createElement("div");
            node.className = "flex items-center gap-4 pb-4 border-b border-neutral-100 relative";
            node.innerHTML = `
                <img src="${item.image}" class="w-16 h-16 object-cover border border-neutral-100 bg-neutral-50">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs tracking-wide text-neutral-900 truncate font-medium">${AppState.lang === 'en' ? item.nameEn : item.nameAr}</h4>
                    <p class="text-[10px] text-neutral-400 font-mono mt-0.5">${item.size}ml</p>
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center border border-neutral-200">
                            <button class="qty-dec px-2 py-0.5 text-xs text-neutral-500 bg-neutral-50 hover:bg-neutral-100">-</button>
                            <span class="px-3 py-0.5 text-xs text-neutral-900 font-mono">${item.qty}</span>
                            <button class="qty-inc px-2 py-0.5 text-xs text-neutral-500 bg-neutral-50 hover:bg-neutral-100">+</button>
                        </div>
                        <span class="text-xs font-bold text-neutral-900 font-mono">${cost.toFixed(2)} AED</span>
                    </div>
                </div>
                <button class="item-remove absolute -top-1 right-0 text-neutral-300 hover:text-red-600 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            `;
            
            node.querySelector(".qty-dec").addEventListener("click", () => Cart.updateQty(item.id, item.qty - 1));
            node.querySelector(".qty-inc").addEventListener("click", () => Cart.updateQty(item.id, item.qty + 1));
            node.querySelector(".item-remove").addEventListener("click", () => Cart.remove(item.id));
            
            container.appendChild(node);
        });
        
        subtotalEl.innerText = `${total.toFixed(2)} AED`;
        const totalSummaryEl = document.getElementById("checkoutOrderTotalSummary");
        if (totalSummaryEl) totalSummaryEl.innerText = `${total.toFixed(2)} AED`;
    },
    renderProductCards: (list, targetNode) => {
        if (!targetNode) return;
        targetNode.innerHTML = "";
        const activeWishList = Wishlist.get();
        
        list.forEach(p => {
            try {
                const isWish = activeWishList.includes(p.id);
                const isSoldOut = parseInt(p.stock || 0) === 0;
                const isLowStock = !isSoldOut && parseInt(p.stock || 0) <= 3;
                const hasDisc = p.discountPrice && parseFloat(p.discountPrice) < parseFloat(p.price);
                
                let pricingBlock = "";
                if (isSoldOut) {
                    pricingBlock = `<span class="text-xs sm:text-sm font-bold text-neutral-400 line-through font-mono">${p.price} AED</span>`;
                } else if (hasDisc) {
                    pricingBlock = `
                        <div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                            <span class="text-xs sm:text-sm font-bold text-neutral-900 font-mono">${p.discountPrice} AED</span>
                            <span class="text-[10px] sm:text-xs text-neutral-400 line-through font-mono">${p.price} AED</span>
                        </div>
                    `;
                } else {
                    pricingBlock = `<span class="text-xs sm:text-sm font-bold text-neutral-900 font-mono">${p.price} AED</span>`;
                }

                let badgeBlock = "";
                if (isSoldOut) {
                    badgeBlock = `<span class="absolute top-2 left-2 bg-neutral-900 text-white text-[8px] sm:text-[9px] tracking-widest uppercase px-1.5 py-0.5 font-sans z-10">${AppState.lang === 'en' ? 'SOLD OUT' : 'نفذت'}</span>`;
                } else if (hasDisc) {
                    const pct = Math.round(((parseFloat(p.price) - parseFloat(p.discountPrice)) / parseFloat(p.price)) * 100);
                    badgeBlock = `<span class="absolute top-2 left-2 bg-red-600 text-white text-[8px] sm:text-[9px] tracking-widest uppercase px-1.5 py-0.5 font-sans z-10">-${pct}%</span>`;
                }

                let stockWarningHTML = "";
                if (isLowStock) {
                    stockWarningHTML = `<p class="text-[9px] sm:text-[10px] font-bold text-amber-600 font-sans mt-0.5">${AppState.lang === 'en' ? `Only ${p.stock} left` : `متبقي ${p.stock} فقط`}</p>`;
                }

                const card = document.createElement("div");
                card.className = "lux-card p-2 sm:p-4 flex flex-col justify-between h-full group bg-white border border-neutral-100 relative";
                card.innerHTML = `
                    <div class="relative">
                        ${badgeBlock}
                        <button class="wish-toggle-btn absolute top-2 right-2 bg-white/80 hover:bg-white text-neutral-900 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm z-10 transition duration-300">
                            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWish ? 'text-red-600 fill-red-600' : 'text-neutral-600'}" fill="${isWish ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                        </button>
                        <div class="block overflow-hidden bg-neutral-50 mb-2 sm:mb-4 border border-neutral-100/50 cursor-pointer">
                            <img src="${p.image}" class="w-full h-40 sm:h-80 object-cover transition-transform duration-700 group-hover:scale-105 card-img-node">
                        </div>
                        <div class="block group-hover:text-amber-600 transition-colors cursor-pointer">
                            <h4 class="text-xs sm:text-base font-light tracking-wide text-neutral-900 mb-0.5 truncate">${AppState.lang === 'en' ? p.nameEn : p.nameAr}</h4>
                        </div>
                        <p class="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-widest font-mono">${p.size || '100'}ml // ${p.category}</p>
                        ${stockWarningHTML}
                    </div>
                    <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between pt-2 sm:pt-4 mt-2 sm:mt-4 border-t border-neutral-100">
                        ${pricingBlock}
                        <button ${isSoldOut ? 'disabled' : ''} class="add-to-cart-direct-btn text-[9px] sm:text-[10px] tracking-widest uppercase bg-neutral-900 text-white font-medium px-2 py-1.5 sm:px-3 sm:py-2 hover:bg-amber-500 hover:text-black transition duration-300 disabled:opacity-40 disabled:hover:bg-neutral-900 disabled:hover:text-white text-center">
                            ${AppState.lang === 'en' ? 'Add' : 'إضافة'}
                        </button>
                    </div>
                `;

                const wishBtn = card.querySelector(".wish-toggle-btn");
                if (wishBtn) {
                    wishBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        Wishlist.toggle(p.id);
                    });
                }

                const cartBtn = card.querySelector(".add-to-cart-direct-btn");
                if (cartBtn && !isSoldOut) {
                    cartBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        Cart.add(p, card.querySelector(".card-img-node"));
                    });
                }

                targetNode.appendChild(card);
            } catch (cardError) {
                console.error("Single card creation isolated error pipeline:", cardError);
            }
        });

        UI.localizeDOM();
    },

    renderStandalonePage: (p, targetNode) => {
        if (!targetNode) return;
        const hasDisc = p.discountPrice && parseFloat(p.discountPrice) < parseFloat(p.price);
        const isSoldOut = parseInt(p.stock || 0) === 0;
        const isLowStock = !isSoldOut && parseInt(p.stock || 0) <= 3;
        
        let priceHTML = "";
        if (isSoldOut) {
            priceHTML = `<span class="text-2xl font-bold text-neutral-400 line-through font-mono">${p.price} AED</span>`;
        } else if (hasDisc) {
            const pct = Math.round(((parseFloat(p.price) - parseFloat(p.discountPrice)) / parseFloat(p.price)) * 100);
            priceHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-2xl font-bold text-neutral-900 font-mono">${p.discountPrice} AED</span>
                    <span class="text-sm text-neutral-400 line-through font-mono">${p.price} AED</span>
                    <span class="bg-red-600 text-white text-[10px] tracking-widest uppercase px-2 py-0.5 font-sans">-${pct}%</span>
                </div>
            `;
        } else {
            priceHTML = `<span class="text-2xl font-bold text-neutral-900 font-mono">${p.price} AED</span>`;
        }

        let statusHTML = "";
        if (isSoldOut) {
            statusHTML = `<p class="text-xs uppercase tracking-widest font-bold text-red-600 font-sans">${AppState.lang === 'en' ? 'SOLD OUT' : 'نفذت الكمية'}</p>`;
        } else if (isLowStock) {
            statusHTML = `<p class="text-xs uppercase tracking-widest font-bold text-amber-600 font-sans">${AppState.lang === 'en' ? `Only ${p.stock} left` : `متبقي ${p.stock} فقط`}</p>`;
        }

        targetNode.innerHTML = `
            <div class="bg-neutral-50 border border-neutral-100 p-4 relative">
                <img id="focusProfileImg" src="${p.image}" class="w-full h-auto max-h-[550px] object-cover mx-auto">
            </div>
            <div class="space-y-6 pt-4">
                <div class="space-y-1">
                    <span class="text-xs tracking-widest uppercase text-amber-600 font-bold font-mono">${p.category} // Collection</span>
                    <h1 class="text-3xl sm:text-4xl font-light text-neutral-900">${AppState.lang === 'en' ? p.nameEn : p.nameAr}</h1>
                    <p class="text-xs font-mono text-neutral-400">${p.size || '100'}ml</p>
                </div>
                
                <div class="py-2 border-t border-b border-neutral-100">
                    ${priceHTML}
                </div>

                ${statusHTML}

                <p class="text-sm text-neutral-600 font-sans leading-relaxed pt-2">${AppState.lang === 'en' ? p.descEn : p.descAr}</p>
                
                <div class="pt-6 flex flex-col gap-3">
                    <div class="flex gap-4">
                        <button id="profileMainActionBtn" ${isSoldOut ? 'disabled' : ''} class="lux-btn flex-1 py-4 text-xs tracking-widest disabled:opacity-40">${AppState.lang === 'en' ? 'Add to Bag' : 'إضافة للحقيبة'}</button>
                    </div>
                </div>
            </div>
        `;

        UI.localizeDOM();

        if (!isSoldOut) {
            const mainActionBtn = document.getElementById("profileMainActionBtn");
            if (mainActionBtn) {
                mainActionBtn.addEventListener("click", () => {
                    Cart.add(p, document.getElementById("focusProfileImg"));
                });
            }
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    AnalyticsTracker.logVisitor();

    onSnapshot(collection(db, "products"), (snapshot) => {
        const productsList = [];
        snapshot.forEach(docSnap => {
            productsList.push({ id: docSnap.id, ...docSnap.data() });
        });

        const curatedTarget = document.getElementById("curatedShowcaseGridTarget");
        if (curatedTarget) {
            UI.renderProductCards(productsList, curatedTarget);
        }
    });

    const switcher = document.getElementById("globalLangToggle");
    if (switcher) {
        switcher.addEventListener("click", () => {
            AppState.lang = AppState.lang === 'en' ? 'ar' : 'en';
            localStorage.setItem("lora_lang", AppState.lang);
            UI.localizeDOM();
            window.location.reload();
        });
    }

    const burger = document.getElementById("mobileNavTrigger");
    const expandedPane = document.getElementById("mobileExpandedNavPane");
    if (burger && expandedPane) {
        burger.addEventListener("click", (e) => {
            e.preventDefault();
            burger.classList.toggle("mobile-menu-active");
            expandedPane.classList.toggle("hidden");
        });
    }

    const cartTrigger = document.getElementById("globalCartAnchor");
    if (cartTrigger) {
        cartTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            UI.openDrawer();
        });
    }

    const closeBtnCart = document.getElementById("closeDrawerBtnCart");
    const closeBtnCheckout = document.getElementById("closeDrawerBtnCheckout");
    const backdrop = document.getElementById("drawerBackdrop");

    if (closeBtnCart) closeBtnCart.addEventListener("click", () => UI.closeDrawer());
    if (closeBtnCheckout) closeBtnCheckout.addEventListener("click", () => UI.closeDrawer());
    if (backdrop) backdrop.addEventListener("click", () => UI.closeDrawer());

    const proceedToCheckoutBtn = document.getElementById("drawerProceedToCheckoutBtn");
    if (proceedToCheckoutBtn) {
        proceedToCheckoutBtn.addEventListener("click", () => {
            if (Cart.get().length === 0) {
                UI.toast(AppState.lang === 'en' ? "Your shopping trunk is empty." : "حقيبتك فارغة حالياً.");
                return;
            }
            document.getElementById("drawerCartStep").classList.add("hidden");
            document.getElementById("drawerCheckoutStep").classList.remove("hidden");
        });
    }

    const backToCartBtn = document.getElementById("backToCartBtn");
    if (backToCartBtn) {
        backToCartBtn.addEventListener("click", () => {
            document.getElementById("drawerCheckoutStep").classList.add("hidden");
            document.getElementById("drawerCartStep").classList.remove("hidden");
        });
    }

    const drawerForm = document.getElementById("drawerCheckoutForm");
    if (drawerForm) {
        drawerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                const name = document.getElementById("checkoutNameInput").value.trim();
                const phone = document.getElementById("checkoutPhoneInput").value.trim();
                const city = document.getElementById("checkoutCityInput").value.trim();
                const address = document.getElementById("checkoutAddressInput").value.trim();

                const orderedItems = Cart.get();
                if (orderedItems.length === 0) {
                    UI.toast(AppState.lang === 'en' ? "Your shopping trunk is empty." : "حقيبتك فارغة حالياً.");
                    return;
                }

                let finalTotal = orderedItems.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.qty)), 0);
                
                const orderPayload = {
                    fullName: name,
                    phone: phone,
                    city: city,
                    address: address,
                    notes: "",
                    cartItems: orderedItems,
                    totalPrice: finalTotal,
                    createdAt: Date.now(),
                    status: "pending"
                };

                const orderRef = await addDoc(collection(db, "orders"), orderPayload);
                await NotificationEngine.broadcastTelegramAlert(orderRef.id, name, phone, finalTotal);

                Cart.save([]);
                drawerForm.reset();
                UI.closeDrawer();

                UI.toast(AppState.lang === 'en' ? "Order allocation submitted successfully!" : "تم تسجيل طلبك بنجاح!");

            } catch (formErr) {
                console.error("Order processing pipeline error:", formErr);
                UI.toast("Failed to submit order. Please try again.");
            }
        });
    }

    document.addEventListener("cartUpdated", () => UI.syncBadges());
    document.addEventListener("wishlistUpdated", () => UI.syncBadges());
    
    UI.localizeDOM();
    UI.syncBadges();
});

export { AppState, Cart, Wishlist, UI };
