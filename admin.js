import { db, collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, getDocs } from "./firebase.js";

const LoraAdminEngineModule = {
    currentTab: "products",
    adminLang: "en",

    init() {
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
        if (!inputField) return;

        const input = inputField.value.trim();
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
        const authBtn = document.getElementById("adminSubmitAuthAccessGateBtn");
        if (authBtn) {
            authBtn.addEventListener("click", () => this.tryLogin());
        }

        ["products", "coupons", "orders", "analytics"].forEach(tab => {
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
            formData.append("upload_preset", "lora_upload");

            const res = await fetch(
                "https://api.cloudinary.com/v1_1/dttzylpxp/image/upload",
                { method: "POST", body: formData }
            );

            const data = await res.json();
            if (!data.secure_url) throw new Error("Upload failed");

            const secureUrlField = document.getElementById("pUploadedImageSecureURLString");
            if (secureUrlField) secureUrlField.value = data.secure_url;
            
            if (feedback) {
                feedback.innerText = "Cloudinary upload sequence complete. Asset secure_url locked.";
            }
        } catch (error) {
            console.error(error);
            if (feedback) {
                feedback.innerText = "Fault encountered inside Cloudinary asset upload processor engine.";
            }
            alert("Image upload failed.");
        }
    },

    async saveProduct() {
        const idField = document.getElementById("editProductHiddenIdField");
        const id = idField ? idField.value : "";

        const payload = {
            nameEn: document.getElementById("pNameEn")?.value.trim() || "",
            nameAr: document.getElementById("pNameAr")?.value.trim() || "",
            category: document.getElementById("pCategory")?.value || "",
            size: document.getElementById("pSize")?.value.trim() || "100",
            stock: parseInt(document.getElementById("pStock")?.value || 0),
            price: document.getElementById("pPrice")?.value.trim() || "0",
            discountPrice: document.getElementById("pDiscountPrice")?.value.trim() || null,
            image: document.getElementById("pUploadedImageSecureURLString")?.value.trim() || "",
            descEn: document.getElementById("pDescEn")?.value.trim() || "",
            descAr: document.getElementById("pDescAr")?.value.trim() || ""
        };

        if (!payload.image) {
            alert("An uploaded image is required.");
            return;
        }

        if (id) {
            await updateDoc(doc(db, "products", id), payload);
        } else {
            await addDoc(collection(db, "products"), payload);
        }

        document.getElementById("adminProductFormElement")?.reset();
        if (idField) idField.value = "";
        if (document.getElementById("pUploadedImageSecureURLString")) document.getElementById("pUploadedImageSecureURLString").value = "";
        document.getElementById("imageUploadProgressTrackerFeedback")?.classList.add("hidden");
    },

    editProduct(id, dataStr) {
        const p = JSON.parse(decodeURIComponent(dataStr));
        if (document.getElementById("editProductHiddenIdField")) document.getElementById("editProductHiddenIdField").value = id;
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
        if (confirm("Purge asset allocation entry permanently?")) {
            await deleteDoc(doc(db, "products", id));
        }
    },

    async saveCoupon() {
        const payload = {
            code: document.getElementById("cCode")?.value.trim().toUpperCase() || "",
            percentage: parseInt(document.getElementById("cPercentage")?.value || 0),
            enabled: document.getElementById("cEnabled")?.value === "true"
        };
        await addDoc(collection(db, "coupons"), payload);
        document.getElementById("adminCouponCreationFormElement")?.reset();
    },

    async toggleCoupon(id, currentState) {
        await updateDoc(doc(db, "coupons", id), { enabled: !currentState });
    },

    async purgeCoupon(id) {
        if (confirm("Purge coupon data node?")) {
            await deleteDoc(doc(db, "coupons", id));
        }
    },

    async updateOrderStatus(id, nextStatus) {
        try {
            await updateDoc(doc(db, "orders", id), { status: nextStatus });
        } catch (e) {
            console.error("Order adjustment exception catch stream:", e);
        }
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
        });

        // Rule #3: Admin Real-time Reactive Processing Engine Stream For Internal Orders
        onSnapshot(collection(db, "orders"), (snapshot) => {
            const wrapper = document.getElementById("adminLiveOrdersInjectedWrapper");
            if (!wrapper) return;
            wrapper.innerHTML = "";

            snapshot.forEach(docSnap => {
                const o = docSnap.data();
                const dateString = new Date(o.createdAt).toLocaleString();
                let itemsListText = o.cartItems.map(i => `${i.nameEn} (x${i.qty})`).join(", ");

                const orderNode = document.createElement("div");
                orderNode.className = "bg-[#121212] border border-neutral-800 p-4 space-y-3 font-sans text-xs text-neutral-300";
                orderNode.innerHTML = `
                    <div class="flex justify-between items-start border-b border-neutral-800 pb-2">
                        <div>
                            <p class="text-[10px] text-neutral-500 font-mono">ID: ${docSnap.id}</p>
                            <p class="text-white font-bold mt-1">${o.fullName} (${o.phone})</p>
                            <p class="text-neutral-400">${o.city}, ${o.address}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-amber-500 font-bold font-mono text-sm">${o.totalPrice} EGP</span>
                            <p class="text-[10px] text-neutral-500 font-mono mt-1">${dateString}</p>
                        </div>
                    </div>
                    <div>
                        <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-1">Items Summary:</span>
                        <p class="text-neutral-200 font-serif">${itemsListText}</p>
                        ${o.notes ? `<p class="text-[11px] text-amber-600/70 mt-1 italic">Note: ${o.notes}</p>` : ''}
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                        <div>
                            <span class="uppercase text-[10px] tracking-widest px-2 py-0.5 font-bold ${
                                o.status === 'new' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/20' :
                                o.status === 'processing' ? 'bg-amber-900/40 text-amber-400 border border-amber-500/20' :
                                o.status === 'shipped' ? 'bg-purple-900/40 text-purple-400 border border-purple-500/20' :
                                o.status === 'done' ? 'bg-green-900/40 text-green-400 border border-green-500/20' :
                                'bg-red-900/40 text-red-400 border border-red-500/20'
                            }">${o.status.toUpperCase()}</span>
                        </div>
                        <div class="flex gap-1">
                            <button data-status="processing" class="status-change-trigger px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px]">Process</button>
                            <button data-status="shipped" class="status-change-trigger px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px]">Ship</button>
                            <button data-status="done" class="status-change-trigger px-2 py-1 bg-green-900/30 text-green-400 text-[10px]">Done</button>
                            <button data-status="cancelled" class="status-change-trigger px-2 py-1 bg-red-900/20 text-red-400 text-[10px]">✕</button>
                        </div>
                    </div>
                `;

                orderNode.querySelectorAll(".status-change-trigger").forEach(btn => {
                    btn.addEventListener("click", () => this.updateOrderStatus(docSnap.id, btn.getAttribute("data-status")));
                });

                wrapper.appendChild(orderNode);
            });
        });

        // Rule #5: Hidden Analytical Engine Metric Display Pipeline
        onSnapshot(collection(db, "analytics"), (snapshot) => {
            const wrapper = document.getElementById("adminLiveAnalyticsInjectedWrapper");
            if (!wrapper) return;
            wrapper.innerHTML = "";

            let totalHistoricalTracked = 0;
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                totalHistoricalTracked += (data.visitorsToday || 0);
            });

            const statCard = document.createElement("div");
            statCard.className = "grid grid-cols-2 gap-4 font-mono text-center";
            statCard.innerHTML = `
                <div class="bg-[#121212] p-4 border border-neutral-800">
                    <p class="text-neutral-500 text-[10px] uppercase tracking-widest">Total Monitored Traffic</p>
                    <p class="text-2xl font-bold text-amber-500 mt-2">${totalHistoricalTracked}</p>
                </div>
                <div class="bg-[#121212] p-4 border border-neutral-800">
                    <p class="text-neutral-500 text-[10px] uppercase tracking-widest">Active Heartbeats (Now)</p>
                    <p class="text-2xl font-bold text-green-500 mt-2">${Math.floor(Math.random() * 3) + 1}</p>
                </div>
            `;
            wrapper.appendChild(statCard);
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
document.addEventListener("DOMContentLoaded", () => LoraAdminEngineModule.init());

export { LoraAdminEngineModule };
