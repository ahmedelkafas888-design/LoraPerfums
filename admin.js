import { db, collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc } from "./firebase.js";

const LoraAdminEngineModule = {
    currentTab: "products",
    adminLang: "en",

    init() {
        // حماية ضد انهيار الموقع: التأكد من وجود نافذة بوابة الدخول أولاً قبل بدء أي عمليات
        this.verifyAccessGateState();
        this.bindEvents();
        this.listenRealtimeStreams();
        this.localizeLayout();
    },

    verifyAccessGateState() {
        if (sessionStorage.getItem("lora_vault_unlocked") === "true") {
            const gate = document.getElementById("adminAuthAccessGateModalWindow");
            if (gate) gate.remove();
        }
    },

    tryLogin() {
        const inputField = document.getElementById("adminSecurityAccessKeyField");
        if (!inputField) return; // حماية ضد الانهيار

        const input = inputField.value.trim();
        // التعديل المطلوبة رقم 1: تسجيل الدخول باستخدام الكود الفردي المعتمد فقط
        if (input === "moda@2006") {
            sessionStorage.setItem("lora_vault_unlocked", "true");
            const gate = document.getElementById("adminAuthAccessGateModalWindow");
            if (gate) gate.remove();
        } else {
            alert("Security token validation trace sequence authentication rejected.");
        }
    },

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll("[id^='adminTabSection-']").forEach(el => {
            if (el) el.classList.add("hidden");
        });
        document.querySelectorAll("[id^='tabBtn-']").forEach(el => {
            if (el) el.classList.remove("tab-btn-active");
        });
        
        const sec = document.getElementById(`adminTabSection-${tabId}`);
        const btn = document.getElementById(`tabBtn-${tabId}`);
        if (sec) sec.classList.remove("hidden");
        if (btn) btn.classList.add("tab-btn-active");
    },

    bindEvents() {
        // حماية ضد انهيار الموقع: فحص دقيق لوجود كافة عناصر الـ DOM قبل ربط الأحداث
        const authBtn = document.getElementById("adminSubmitAuthAccessGateBtn");
        if (authBtn) {
            authBtn.addEventListener("click", () => this.tryLogin());
        }

        ["products", "coupons", "settings"].forEach(tab => {
            const tBtn = document.getElementById(`tabBtn-${tab}`);
            if (tBtn) {
                tBtn.addEventListener("click", () => this.switchTab(tab));
            }
        });

        const productForm = document.getElementById("adminProductFormElement");
        if (productForm) {
            productForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                await this.saveProduct();
            });
        }

        const couponForm = document.getElementById("adminCouponCreationFormElement");
        if (couponForm) {
            couponForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                await this.saveCoupon();
            });
        }

        const settingsForm = document.getElementById("adminGlobalSettingsFormElement");
        if (settingsForm) {
            settingsForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                await this.saveSettings();
            });
        }

        const fileInput = document.getElementById("pProductImageFileInput");
        if (fileInput) {
            fileInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (file) await this.uploadToCloudinaryStream(file);
            });
        }

        const langToggleBtn = document.getElementById("adminLangToggleBtn");
        if (langToggleBtn) {
            langToggleBtn.addEventListener("click", () => {
                this.adminLang = this.adminLang === 'en' ? 'ar' : 'en';
                this.localizeLayout();
            });
        }
    },

    async uploadToCloudinaryStream(file) {
        const feedback = document.getElementById("imageUploadProgressTrackerFeedback");
        if (feedback) {
            feedback.innerText = "Uploading asset payload streams to Cloudinary...";
            feedback.classList.remove("hidden");
        }

        try {
            const formData = new FormData();
            formData.append("file", file);
            // التعديل المطلوب رقم 2: تهيئة الرفع غير الموقع (Unsigned Upload) بدقة
            formData.append("upload_preset", "lora_upload");

            const res = await fetch(
                "https://api.cloudinary.com/v1_1/dttzylpxp/image/upload",
                { method: "POST", body: formData }
            );

            const data = await res.json();

            if (!data.secure_url) throw new Error("Upload failed");

            const secureUrlField = document.getElementById("pUploadedImageSecureURLString");
            if (secureUrlField) {
                secureUrlField.value = data.secure_url;
            }
            
            if (feedback) {
                feedback.innerText = "Cloudinary upload sequence complete. Asset secure_url locked.";
            }
        } catch (error) {
            console.error(error);
            if (feedback) {
                feedback.innerText = "Fault encountered inside Cloudinary asset upload processor engine.";
            }
            alert("Image upload failed. Ensure upload preset metadata configuration parameters match.");
        }
    },

    async saveProduct() {
        const idField = document.getElementById("editProductHiddenIdField");
        const id = idField ? idField.value : "";

        // جلب القيم بأمان مع التحقق التام لتجنب الانهيارات
        const pNameEn = document.getElementById("pNameEn")?.value.trim() || "";
        const pNameAr = document.getElementById("pNameAr")?.value.trim() || "";
        const pCategory = document.getElementById("pCategory")?.value || "";
        const pSize = document.getElementById("pSize")?.value.trim() || "100";
        const pStock = parseInt(document.getElementById("pStock")?.value || 0);
        const pPrice = document.getElementById("pPrice")?.value.trim() || "0";
        const pDiscountPrice = document.getElementById("pDiscountPrice")?.value.trim() || null;
        const pImage = document.getElementById("pUploadedImageSecureURLString")?.value.trim() || "";
        const pDescEn = document.getElementById("pDescEn")?.value.trim() || "";
        const pDescAr = document.getElementById("pDescAr")?.value.trim() || "";

        const payload = {
            nameEn: pNameEn,
            nameAr: pNameAr,
            category: pCategory,
            size: pSize,
            stock: pStock,
            price: pPrice,
            discountPrice: pDiscountPrice,
            image: pImage,
            descEn: pDescEn,
            descAr: pDescAr
        };

        if (!payload.image) {
            alert("An uploaded image is required via Cloudinary pipeline registry matrix.");
            return;
        }

        if (id) {
            await updateDoc(doc(db, "products", id), payload);
        } else {
            await addDoc(collection(db, "products"), payload);
        }

        const productForm = document.getElementById("adminProductFormElement");
        if (productForm) productForm.reset();
        
        if (idField) idField.value = "";
        
        const secureUrlField = document.getElementById("pUploadedImageSecureURLString");
        if (secureUrlField) secureUrlField.value = "";
        
        const feedback = document.getElementById("imageUploadProgressTrackerFeedback");
        if (feedback) feedback.classList.add("hidden");
    },

    editProduct(id, dataStr) {
        const p = JSON.parse(decodeURIComponent(dataStr));
        
        const idField = document.getElementById("editProductHiddenIdField");
        if (idField) idField.value = id;

        if (document.getElementById("pNameEn")) document.getElementById("pNameEn").value = p.nameEn || "";
        if (document.getElementById("pNameAr")) document.getElementById("pNameAr").value = p.nameAr || "";
        if (document.getElementById("pCategory")) document.getElementById("pCategory").value = p.category || "";
        if (document.getElementById("pSize")) document.getElementById("pSize").value = p.size || "100";
        if (document.getElementById("pStock")) document.getElementById("pStock").value = p.stock || "0";
        if (document.getElementById("pPrice")) document.getElementById("pPrice").value = p.price || "";
        if (document.getElementById("pDiscountPrice")) document.getElementById("pDiscountPrice").value = p.discountPrice || "";
        if (document.getElementById("pUploadedImageSecureURLString")) document.getElementById("pUploadedImageSecureURLString").value = p.image || "";
        if (document.getElementById("pDescEn")) document.getElementById("pDescEn").value = p.descEn || "";
        if (document.getElementById("pDescAr")) document.getElementById("pDescAr").value = p.descAr || "";
        
        window.scrollTo({ top: 0, behavior: "smooth" });
    },

    async purgeProduct(id) {
        if (confirm("Purge asset allocation entry permanently from Cloud Firestore?")) {
            await deleteDoc(doc(db, "products", id));
        }
    },

    async saveCoupon() {
        const cCode = document.getElementById("cCode")?.value.trim().toUpperCase() || "";
        const cPercentage = parseInt(document.getElementById("cPercentage")?.value || 0);
        const cEnabled = document.getElementById("cEnabled")?.value === "true";

        const payload = {
            code: cCode,
            percentage: cPercentage,
            enabled: cEnabled
        };
        
        await addDoc(collection(db, "coupons"), payload);
        
        const couponForm = document.getElementById("adminCouponCreationFormElement");
        if (couponForm) couponForm.reset();
    },

    async toggleCoupon(id, currentState) {
        await updateDoc(doc(db, "coupons", id), { enabled: !currentState });
    },

    async purgeCoupon(id) {
        if (confirm("Purge coupon data node?")) {
            await deleteDoc(doc(db, "coupons", id));
        }
    },

    async saveSettings() {
        const numField = document.getElementById("cfgWhatsAppLine");
        const num = numField ? numField.value.trim() : "";
        
        await setDoc(doc(db, "settings", "config_ledger"), { whatsappNumber: num });
        alert("Ecosystem master configuration synchronized successfully.");
    },

    listenRealtimeStreams() {
        onSnapshot(collection(db, "products"), (snapshot) => {
            const wrapper = document.getElementById("adminLiveCatalogLedgerInjectedWrapper");
            if (!wrapper) return; // منع انهيار الكود في حال عدم وجود الـ wrapper
            wrapper.innerHTML = "";
            
            snapshot.forEach(docSnap => {
                const p = docSnap.data();
                const enc = encodeURIComponent(JSON.stringify(p));
                const card = document.createElement("div");
                card.className = "bg-[#121212] border border-neutral-800 p-3 flex items-center justify-between gap-4 font-sans text-xs";
                card.innerHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${p.image}" class="w-12 h-12 object-cover border border-neutral-800">
                        <div>
                            <h4 class="font-bold text-white">${p.nameEn} / ${p.nameAr}</h4>
                            <p class="text-[11px] text-amber-500 font-mono">${(p.category || '').toUpperCase()} // ${p.size}ml // ${p.price} EGP // Stock: ${p.stock}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="edit-p-btn px-3 py-1 bg-neutral-800 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black transition">Edit</button>
                        <button class="purge-p-btn px-3 py-1 bg-neutral-800 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white transition">Purge</button>
                    </div>
                `;
                
                card.querySelector(".edit-p-btn").addEventListener("click", () => this.editProduct(docSnap.id, enc));
                card.querySelector(".purge-p-btn").addEventListener("click", () => this.purgeProduct(docSnap.id));
                wrapper.appendChild(card);
            });
            
            if (wrapper.innerHTML === "") {
                wrapper.innerHTML = `<p class="text-[11px] text-neutral-500 font-mono">No active dataset elements tracked inside catalog storage collection ledger.</p>`;
            }
        });

        onSnapshot(collection(db, "coupons"), (snapshot) => {
            const wrapper = document.getElementById("adminLiveCouponsLedgerInjectedWrapper");
            if (!wrapper) return; // منع الانهيار
            wrapper.innerHTML = "";
            
            snapshot.forEach(docSnap => {
                const c = docSnap.data();
                const node = document.createElement("div");
                node.className = "bg-[#121212] border border-neutral-800 p-3 flex items-center justify-between gap-4 font-sans text-xs font-mono";
                node.innerHTML = `
                    <div>
                        <span class="text-white font-bold tracking-widest text-sm bg-neutral-900 px-2 py-1 border border-neutral-800">${c.code}</span>
                        <span class="text-amber-500 ml-4">${c.percentage}% OFF</span>
                        <span class="ml-4 ${c.enabled ? 'text-green-500':'text-red-500'}">[${c.enabled ? 'Active':'Suspended'}]</span>
                    </div>
                    <div class="flex gap-2">
                        <button class="toggle-c-btn px-3 py-1 bg-neutral-800 text-neutral-300 hover:text-white transition">Toggle State</button>
                        <button class="purge-c-btn px-3 py-1 bg-neutral-800 text-red-400 hover:bg-red-600 hover:text-white transition">✕</button>
                    </div>
                `;
                
                node.querySelector(".toggle-c-btn").addEventListener("click", () => this.toggleCoupon(docSnap.id, c.enabled));
                node.querySelector(".purge-c-btn").addEventListener("click", () => this.purgeCoupon(docSnap.id));
                wrapper.appendChild(node);
            });
            
            if (wrapper.innerHTML === "") {
                wrapper.innerHTML = `<p class="text-[11px] text-neutral-500 font-mono">No active coupon system tracking items allocated.</p>`;
            }
        });

        onSnapshot(doc(db, "settings", "config_ledger"), (snapshot) => {
            if (snapshot.exists()) {
                const input = document.getElementById("cfgWhatsAppLine");
                if (input) input.value = snapshot.data().whatsappNumber || "";
            }
        });
    },

    localizeLayout() {
        const root = document.documentElement;
        if (root) {
            root.setAttribute("lang", this.adminLang);
            root.setAttribute("dir", this.adminLang === 'ar' ? 'rtl' : 'ltr');
        }
        if (document.body) {
            document.body.setAttribute("dir", this.adminLang === 'ar' ? 'rtl' : 'ltr');
        }
    }
};

window.LoraAdminEngineModule = LoraAdminEngineModule;

// حماية التشغيل الآمن بعد تحميل بنية المستند بالكامل
document.addEventListener("DOMContentLoaded", () => LoraAdminEngineModule.init());

export { LoraAdminEngineModule };
