/**
 * LORA PARFUMS - Core Business Logic Engine
 */

// Initial Luxury Catalog Seed Data
const INITIAL_PRODUCTS = [
    {
        id: "LORA-001",
        name: "Élixir d'Or",
        image: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
        price: 245.00,
        description: "An opulent composition opening with luminous Damask Rose and rare Indonesian Oud, dissolving beautifully into an ambient background of golden amber warmth and vanilla absolute.",
        category: "Women"
    },
    {
        id: "LORA-002",
        name: "Nuit Impériale",
        image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80",
        price: 260.00,
        description: "A bold signature statement designed for the modern gentleman. Crisp Calabrian Bergamot intertwines elegantly with Haitian Vetiver, dark leather accents, and natural wood resins.",
        category: "Men"
    },
    {
        id: "LORA-003",
        name: "Opus Magnolia",
        image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        price: 210.00,
        description: "A fresh floral landscape bringing sweet majestic Magnolias to life alongside fresh sliced green apples, white musk formulations, and breezy Mediterranean citrus notes.",
        category: "Women"
    },
    {
        id: "LORA-004",
        name: "Santal Absolu",
        image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
        price: 285.00,
        description: "A sophisticated exploration of cream-textured Australian Sandalwood paired organically with spicy cardamom kernels, papyrus notes, and deep Virginia Cedarwood oil essence.",
        category: "Men"
    }
];

// Initialize Storage Configuration Data Structures
function initApp() {
    if (!localStorage.getItem('lora_products')) {
        localStorage.setItem('lora_products', JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem('lora_cart')) {
        localStorage.setItem('lora_cart', JSON.stringify([]));
    }
}

// Global Products Pipeline Fetcher
function getProducts() {
    return JSON.parse(localStorage.getItem('lora_products')) || [];
}

// Global Shopping Cart Pipeline Fetcher
function getCart() {
    return JSON.parse(localStorage.getItem('lora_cart')) || [];
}

// Generate Uniform Product Showcase Card Markup Template Blueprint
function createProductCard(product) {
    return `
        <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
            <div class="product-card-img-wrapper">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
            </div>
            <span class="category-tag">Maison ${product.category}</span>
            <h3>${product.name}</h3>
            <span class="price">$${parseFloat(product.price).toFixed(2)}</span>
        </div>
    `;
}

// Shopping Cart Core Transaction Controllers
function addToCart(productId, quantity = 1) {
    let cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity });
    }

    localStorage.setItem('lora_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartItemQty(productId, delta) {
    let cart = getCart();
    const idx = cart.findIndex(item => item.id === productId);

    if (idx > -1) {
        cart[idx].quantity += delta;
        if (cart[idx].quantity <= 0) {
            cart.splice(idx, 1);
        }
        localStorage.setItem('lora_cart', JSON.stringify(cart));
        updateCartBadge();
    }
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('lora_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const totalItems = getCart().reduce((sum, item) => sum + item.quantity, 0);
        badge.innerText = totalItems;
    }
}
