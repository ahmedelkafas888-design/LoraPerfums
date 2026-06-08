Import { db, collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc } from "./firebase.js";

const LoraAdminEngineModule = {
    currentTab: "products",
    adminLang: "en",

    init() {
        if (!document.getElementById("adminAuthAccessGateModalWindow")) return;
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
        const input = document.getElementById("adminSecurityAccessKeyField").value.trim();
        if (input === "ahmedelkafas888@gmail.com") {
            sessionStorage.setItem("lora_vault_unlocked", "true");
            const gate = document.getElementById("adminAuthAccessGateModalWindow");
            if (gate) gate.remove();
        } else {
            alert("Security token validation trace sequence authentication rejected.");
        }
    },

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll("[id^='adminTabSection-']").forEach(el => el.classList.add("hidden"));
        document.querySelectorAll("[id^='tabBtn-']").forEach(el => el.classList.remove("tab-btn-active"));
        
        const sec = document.getElementById(`adminTabSection-${tabId}`);
        const btn = document.getElementById(`tabBtn-${tabId}`);
        if (sec) sec.classList.remove("hidden");
        if (btn) btn.classList.add("tab-btn-active");
    },

    bindEvents() {
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

        document.getElementById("adminProductFormElement").addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.saveProduct();
        });

        document.getElementById("adminCouponCreationFormElement").addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.saveCoupon();
        });

        document.getElementById("adminGlobalSettingsFormElement").addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });

        document.getElementById("pProductImageFileInput").addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (file) await this.uploadToCloudinaryStream(file);
        });

        document.getElementById("adminLangToggleBtn").addEventListener("click", () => {
            this.adminLang = this.adminLang === 'en' ? 'ar' : 'en';
            this.localizeLayout();
        });
    },

    async uploadToCloudinaryStream(file) {
        const feedback = document.getElementById("imageUploadProgressTrackerFeedback");
        feedback.innerText = "Uploading asset payload streams to Cloudinary...";
        feedback.classList.remove("hidden");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "lora_upload");

            const res = await fetch(
                "https://api.cloudinary.com/v1_1/dttzylpxp/image/upload",
                { method: "POST", body: formData }
            );

            const data = await res.json();

            if (!data.secure_url) throw new Error("Upload failed");

            document.getElementById("pUploadedImageSecureURLString").value = data.secure_url;
            feedback.innerText = "Cloudinary upload sequence complete. Asset secure_url locked.";
        } catch (error) {
            console.error(error);
            feedback.innerText = "Fault encountered inside Cloudinary asset upload processor engine.";
            alert("Image upload failed. Ensure upload preset metadata configuration parameters match.");
        }
    },

    async saveProduct() {
        const id = document.getElementById("editProductHiddenIdField").value;
        const payload = {
            nameEn: document.getElementById("pNameEn").value.trim(),
            nameAr: document.getElementById("pNameAr").value.trim(),
            category: document.getElementById("pCategory").value,
            size: document.getElementById("pSize").value.trim() || "100",
            stock: parseInt(document.getElementById("pStock").value || 0),
            price: document.getElementById("pPrice").value.trim(),
            discountPrice: document.getElementById("pDiscountPrice").value.trim() || null,
            image: document.getElementById("pUploadedImageSecureURLString").value.trim(),
            descEn: document.getElementById("pDescEn").value.trim(),
            descAr: document.getElementById("pDescAr").value.trim()
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

        document.getElementById("adminProductFormElement").reset();
        document.getElementById("editProductHiddenIdField").value = "";
        document.getElementById("pUploadedImageSecureURLString").value = "";
        document.getElementById("imageUploadProgressTrackerFeedback").classList.add("hidden");
    },

    editProduct(id, dataStr) {
        const p = JSON.parse(decodeURIComponent(dataStr));
        document.getElementById("editProductHiddenIdField").value = id;
        document.getElementById("pNameEn").value = p.nameEn;
        document.getElementById("pNameAr").value = p.nameAr;
        document.getElementById("pCategory").value = p.category;
        document.getElementById("pSize").value = p.size || "100";
        document.getElementById("pStock").value = p.stock || "0";
        document.getElementById("pPrice").value = p.price;
        document.getElementById("pDiscountPrice").value = p.discountPrice || "";
        document.getElementById("pUploadedImageSecureURLString").value = p.image;
        document.getElementById("pDescEn").value = p.descEn;
        document.getElementById("pDescAr").value = p.descAr;
        
        window.scrollTo({ top: 0, behavior: "smooth" });
    },

    async purgeProduct(id) {
        if (confirm("Purge asset allocation entry permanently from Cloud Firestore?")) {
            await deleteDoc(doc(db, "products", id));
        }
    },

    async saveCoupon() {
        const payload = {
            code: document.getElementById("cCode").value.trim().toUpperCase(),
            percentage: parseInt(document.getElementById("cPercentage").value || 0),
            enabled: document.getElementById("cEnabled").value === "true"
        };
        await addDoc(collection(db, "coupons"), payload);
        document.getElementById("adminCouponCreationFormElement").reset();
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
        const num = document.getElementById("cfgWhatsAppLine").value.trim();
        await setDoc(doc(db, "settings", "config_ledger"), { whatsappNumber: num });
        alert("Ecosystem master configuration synchronized successfully.");
    },

    listenRealtimeStreams() {
        onSnapshot(collection(db, "products"), (snapshot) => {
            const wrapper = document.getElementById("adminLiveCatalogLedgerInjectedWrapper");
            if (!wrapper) return;
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
                            <p class="text-[11px] text-amber-500 font-mono">${p.category.toUpperCase()} // ${p.size}ml // ${p.price} EGP // Stock: ${p.stock}</p>
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
            if (!wrapper) return;
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
        root.setAttribute("lang", this.adminLang);
        root.setAttribute("dir", this.adminLang === 'ar' ? 'rtl' : 'ltr');
        document.body.setAttribute("dir", this.adminLang === 'ar' ? 'rtl' : 'ltr');
    }
};

window.LoraAdminEngineModule = LoraAdminEngineModule;
document.addEventListener("DOMContentLoaded", () => LoraAdminEngineModule.init());

export { LoraAdminEngineModule };
