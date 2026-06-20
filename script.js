import { db, doc, setDoc, onSnapshot } from "./firebase.js";

const AppState = {
    lang: localStorage.getItem("lora_lang") || "en",
    whatsappNumber: "01271163971"
};

const Dictionary = {
    en: {
        navHome: "Home", navProducts: "Fragrances", navWishlist: "Wishlist", navAdmin: "Atelier Vault",
        promoText: "Exclusive Discounts & Special Offers", mensTitle: "MEN'S COLLECTION", womensTitle: "WOMEN'S COLLECTION",
        searchPlaceholder: "Search parameters...", addToCart: "Add to Bag", soldOut: "SOLD OUT",
        cartTitle: "Your Shopping Trunk", totalVal: "Total Cost", checkoutBtn: "Proceed to Checkout",
        shippingInfo: "Shipping Information", fullName: "Full Name", phoneNumber: "Phone Number",
        cityName: "City", fullAddress: "Address", orderNotes: "Order Notes (Optional)",
        executeCheckout: "Confirm Order via WhatsApp", orderSummary: "Order Summary",
        subtotal: "Subtotal", couponCode: "Have a coupon?", navBackToCart: "Return to Bag",
        wishlistTitle: "Your Curated Desires"
    },
    ar: {
        navHome: "الرئيسية", navProducts: "العطور", navWishlist: "الأمنيات", navAdmin: "منصة الإدارة",
        promoText: "خصومات وعروض حصرية", mensTitle: "مجموعة العطور الرجالية", womensTitle: "مجموعة العطور النسائية",
        searchPlaceholder: "ابحث في المجموعات...", addToCart: "إضافة للحقيبة", soldOut: "نفذت الكمية",
        cartTitle: "حقيبة المقتنيات", totalVal: "إجمالي التكلفة", checkoutBtn: "الاستمرار لتأكيد الطلب",
        shippingInfo: "بيانات الشحن والتوصيل", fullName: "الاسم الكامل", phoneNumber: "رقم الهاتف",
        cityName: "المدينة", fullAddress: "العنوان بالتفصيل", orderNotes: "ملاحظات إضافية (اختياري)",
        executeCheckout: "تأكيد الطلب عبر الواتساب", orderSummary: "ملخص الطلب",
        subtotal: "المجموع الفرعي", couponCode: "لديك كود خصم؟", navBackToCart: "العودة للحقيبة",
        wishlistTitle: "قائمة أمنياتك المنسقة"
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
        UI.toast(AppState.lang === 'en' ? "Fragrance allocated inside shopping trunk." : "تم إضافة المقتنى للحقيبة بنجاح.");
    },
    remove: (id) => {
        let items = Cart.get().filter(i => i.id !== id);
        Cart.save(items);
    },
    updateQty: (id, qty) => {
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
            UI.toast(AppState.lang === 'en' ? "Removed from curation registry." : "تم الحذف من قائمة الأمنيات المنسقة.");
        } else {
            items.push(id);
            UI.toast(AppState.lang === 'en' ? "Saved inside desires manifest." : "تم الحفظ في قائمة الرغبات.");
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
                    pricingBlock = `<span class="text-xs sm:text-sm font-bold text-neutral-400 line-through font-mono">${p.price} EGP</span>`;
                } else if (hasDisc) {
                    pricingBlock = `
                        <div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                            <span class="text-xs sm:text-sm font-bold text-neutral-900 font-mono">${p.discountPrice} EGP</span>
                            <span class="text-[10px] sm:text-xs text-neutral-400 line-through font-mono">${p.price} EGP</span>
                        </div>
                    `;
                } else {
                    pricingBlock = `<span class="text-xs sm:text-sm font-bold text-neutral-900 font-mono">${p.price} EGP</span>`;
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
                        <a href="product.html?id=${p.id}" class="block overflow-hidden bg-neutral-50 mb-2 sm:mb-4 border border-neutral-100/50">
                            <img src="${p.image}" class="w-full h-40 sm:h-80 object-cover transition-transform duration-700 group-hover:scale-105 card-img-node">
                        </a>
                        <a href="product.html?id=${p.id}" class="block group-hover:text-amber-600 transition-colors">
                            <h4 class="text-xs sm:text-base font-light tracking-wide text-neutral-900 mb-0.5 truncate">${AppState.lang === 'en' ? p.nameEn : p.nameAr}</h4>
                        </a>
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
        const activePrice = hasDisc ? p.discountPrice : p.price;
        
        let priceHTML = "";
        if (isSoldOut) {
            priceHTML = `<span class="text-2xl font-bold text-neutral-400 line-through font-mono">${p.price} EGP</span>`;
        } else if (hasDisc) {
            const pct = Math.round(((parseFloat(p.price) - parseFloat(p.discountPrice)) / parseFloat(p.price)) * 100);
            priceHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-2xl font-bold text-neutral-900 font-mono">${p.discountPrice} EGP</span>
                    <span class="text-sm text-neutral-400 line-through font-mono">${p.price} EGP</span>
                    <span class="bg-red-600 text-white text-[10px] tracking-widest uppercase px-2 py-0.5 font-sans">-${pct}%</span>
                </div>
            `;
        } else {
            priceHTML = `<span class="text-2xl font-bold text-neutral-900 font-mono">${p.price} EGP</span>`;
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
                        <button id="profileWishlistToggleActionBtn" class="border border-neutral-200 hover:border-neutral-900 p-4 transition-colors flex items-center justify-center">
                            <svg id="profileHeartIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                        </button>
                    </div>
                    <button id="profileBuyNowActionBtn" ${isSoldOut ? 'disabled' : ''} class="w-full py-4 text-xs tracking-widest uppercase border border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white font-medium transition duration-300 disabled:opacity-40">
                        ${AppState.lang === 'en' ? 'Buy It Now' : 'شراء الآن مباشر'}
                    </button>
                </div>
            </div>
        `;

        UI.localizeDOM();
        
        const btnHeart = document.getElementById("profileHeartIcon");
        const updateHeart = () => {
            if (!btnHeart) return;
            if (Wishlist.has(p.id)) {
                btnHeart.setAttribute("fill", "#bc2c2c");
                btnHeart.setAttribute("stroke", "#bc2c2c");
            } else {
                btnHeart.setAttribute("fill", "none");
                btnHeart.setAttribute("stroke", "currentColor");
            }
        };
        updateHeart();

        const wishToggleBtn = document.getElementById("profileWishlistToggleActionBtn");
        if (wishToggleBtn) {
            wishToggleBtn.addEventListener("click", () => {
                Wishlist.toggle(p.id);
                updateHeart();
            });
        }

        if (!isSoldOut) {
            const mainActionBtn = document.getElementById("profileMainActionBtn");
            if (mainActionBtn) {
                mainActionBtn.addEventListener("click", () => {
                    Cart.add(p, document.getElementById("focusProfileImg"));
                });
            }
            
            const buyNowBtn = document.getElementById("profileBuyNowActionBtn");
            if (buyNowBtn) {
                buyNowBtn.addEventListener("click", () => {
                    const buyNowPayload = {
                        id: p.id,
                        nameEn: p.nameEn,
                        nameAr: p.nameAr,
                        price: activePrice,
                        image: p.image,
                        size: p.size || "100",
                        qty: 1
                    };
                    sessionStorage.setItem("lora_buynow_payload", JSON.stringify(buyNowPayload));
                    window.location.href = `checkout.html?buynow=${p.id}`;
                });
            }
        }
    }
};

const openWhatsApp = (phone, message) => {
    try {
        const cleanPhone = phone.replace(/\D/g, "");
        const formattedPhone = cleanPhone.startsWith("20") ? cleanPhone : "20" + cleanPhone;
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            if (link.parentNode) link.remove();
        }, 100);
    } catch (err) {
        console.error("Primary anchor navigation blocked, invoking runtime fallback location method:", err);
        try {
            const cleanPhone = phone.replace(/\D/g, "");
            const formattedPhone = cleanPhone.startsWith("20") ? cleanPhone : "20" + cleanPhone;
            window.location.href = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        } catch (fallbackErr) {
            console.error("Complete redirection architecture failed:", fallbackErr);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
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

    const checkoutForm = document.getElementById("checkoutFormDetails") || document.querySelector("form.checkout-form") || document.getElementById("confirmOrderBtn");
    if (checkoutForm) {
        const interceptCheckout = (e) => {
            e.preventDefault();
            try {
                const nameInp = document.getElementById("customerFullName") || document.querySelector('[placeholder*="Name"]') || document.querySelector('[placeholder*="الاسم"]');
                const phoneInp = document.getElementById("customerPhoneNumber") || document.querySelector('[placeholder*="Phone"]') || document.querySelector('[placeholder*="الهاتف"]');
                const addressInp = document.getElementById("customerFullAddress") || document.querySelector('[placeholder*="Address"]') || document.querySelector('[placeholder*="العنوان"]');
                const cityInp = document.getElementById("customerCityName") || document.querySelector('[placeholder*="City"]') || document.querySelector('[placeholder*="المدينة"]');
                const notesInp = document.getElementById("customerOrderNotes") || document.querySelector('[placeholder*="Notes"]') || document.querySelector('[placeholder*="ملاحظات"]');

                const name = nameInp ? nameInp.value.trim() : "";
                const phone = phoneInp ? phoneInp.value.trim() : "";
                const city = cityInp ? cityInp.value.trim() : "";
                const address = addressInp ? addressInp.value.trim() : "";
                const notes = notesInp ? notesInp.value.trim() : "";

                if (!name || !phone || !address) {
                    alert(AppState.lang === 'en' ? "Please fulfill all required fields." : "برجاء ملء الحقول المطلوبة.");
                    return;
                }

                const urlParams = new URLSearchParams(window.location.search);
                const isBuyNow = urlParams.get("buynow");
                let orderedItems = [];

                if (isBuyNow) {
                    try {
                        const singlePayload = JSON.parse(sessionStorage.getItem("lora_buynow_payload"));
                        if (singlePayload) orderedItems.push(singlePayload);
                    } catch (exErr) {
                        console.error("Parsing single checkout payload failure:", exErr);
                    }
                }
                
                if (orderedItems.length === 0) {
                    orderedItems = Cart.get();
                }

                if (orderedItems.length === 0) {
                    alert(AppState.lang === 'en' ? "Your trunk is currently empty." : "حقيبتك فارغة حالياً.");
                    return;
                }

                let subtotal = orderedItems.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.qty)), 0);
                let textSummary = AppState.lang === 'en' ? `✨ *LORA PERFUME STORE - NEW ORDER* ✨\n\n` : `✨ *طلب جديد - متجر لورا للعطور* ✨\n\n`;
                
                textSummary += AppState.lang === 'en' ? `👤 *Customer Details:*\n` : `👤 *بيانات العميل:*\n`;
                textSummary += `${AppState.lang === 'en' ? 'Name' : 'الاسم'}: ${name}\n`;
                textSummary += `${AppState.lang === 'en' ? 'Phone' : 'الهاتف'}: ${phone}\n`;
                textSummary += `${AppState.lang === 'en' ? 'Destination' : 'الوجهة'}: ${city} ${address}\n`;
                if (notes) textSummary += `${AppState.lang === 'en' ? 'Notes' : 'ملاحظات'}: ${notes}\n`;
                textSummary += `\n🛍️ *${AppState.lang === 'en' ? 'Requested Items' : 'المقتنيات المطلوبة'}:*\n`;

                orderedItems.forEach((item, index) => {
                    const nameDisplay = AppState.lang === 'en' ? item.nameEn : item.nameAr;
                    textSummary += `${index + 1}. ${nameDisplay} (${item.size || '100'}ml) x${item.qty} -> ${parseFloat(item.price) * parseInt(item.qty)} EGP\n`;
                });

                textSummary += `\n💰 *${AppState.lang === 'en' ? 'Total Summary' : 'إجمالي الحساب'}: ${subtotal} EGP*`;

                if (!isBuyNow) {
                    Cart.save([]);
                } else {
                    sessionStorage.removeItem("lora_buynow_payload");
                }

                openWhatsApp(AppState.whatsappNumber, textSummary);
            } catch (formErr) {
                console.error("Checkout validation interception system fault pipeline safe-caught:", formErr);
            }
        };

        if (checkoutForm.tagName === "FORM") {
            checkoutForm.addEventListener("submit", interceptCheckout);
        } else {
            checkoutForm.addEventListener("click", interceptCheckout);
        }
    }

    document.addEventListener("cartUpdated", () => UI.syncBadges());
    document.addEventListener("wishlistUpdated", () => UI.syncBadges());
    
    UI.localizeDOM();
    UI.syncBadges();
});

export { AppState, Cart, Wishlist, UI, openWhatsApp };
