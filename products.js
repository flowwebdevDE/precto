// Hier Produkte bearbeiten/hinzufügen
let products = [
    {
        id: 1,
        name: "Hochwertiges Notizbuch A5",
        price: 19.99,
        originalPrice: 24.99, // SALE
        category: "Bürobedarf",
        description: "Elegantes Notizbuch mit Hardcover und 120g/m² Papier. Ideal für Notizen und Skizzen.",
        image: "https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&w=800&q=80",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_1" // TODO: Echte Shopify Variant ID eintragen
    },
    {
        id: 2,
        name: "Eleganter Metall-Kugelschreiber",
        price: 29.50,
        category: "Bürobedarf",
        description: "Schwerer Kugelschreiber aus gebürstetem Metall mit schwarzer Tinte. Liegt perfekt in der Hand.",
        image: "https://images.unsplash.com/photo-1583485311499-9a6132555475?auto=format&fit=crop&w=800&q=80",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_2"
    },
    {
        id: 3,
        name: "USB-C Multiport-Adapter",
        price: 59.90,
        category: "Elektronik",
        description: "7-in-1-Adapter mit HDMI, 3x USB 3.0, SD-Kartenleser und Power Delivery.",
        image: "https://m.media-amazon.com/images/I/61jJkP23G+L._AC_SL1500_.jpg",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_3"
    },
    {
        id: 4,
        name: "Ergonomischer Laptop-Ständer",
        price: 45.00,
        category: "Bürobedarf",
        description: "Verstellbarer Ständer aus Aluminium für eine bessere Haltung am Arbeitsplatz. Für Laptops bis 16 Zoll.",
        image: "https://m.media-amazon.com/images/I/71pY-a2-cAL._AC_SL1500_.jpg",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_4"
    },
    {
        id: 5,
        name: "Isolierte Edelstahl-Trinkflasche",
        price: 34.99,
        category: "Merchandise",
        description: "Hält Getränke 12h heiß oder 24h kalt. 750ml, auslaufsicher und BPA-frei.",
        image: "https://images.unsplash.com/photo-1602143407151-247e961d21a6?auto=format&fit=crop&w=800&q=80",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_5"
    },
    {
        id: 6,
        name: "Keramiktasse mit Logo-Druck",
        price: 14.90,
        category: "Merchandise",
        description: "Hochwertige Keramiktasse (330ml), spülmaschinenfest. Perfekt für das Büro oder als Geschenk.",
        image: "https://images.unsplash.com/photo-1621402532029-ac147a53299a?auto=format&fit=crop&w=800&q=80",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_6"
    },
    {
        id: 7,
        name: "Bio-Baumwoll-Tragetasche",
        price: 9.99,
        category: "Textilien",
        description: "Robuste Tragetasche aus 100% zertifizierter Bio-Baumwolle. Fair hergestellt.",
        image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_7"
    },
    {
        id: 8,
        name: "Kabellose Lade-Station",
        price: 79.00,
        originalPrice: 99.00, // SALE
        category: "Elektronik",
        description: "3-in-1 Ladestation für Smartphone, Smartwatch und Kopfhörer. Qi-zertifiziert.",
        image: "https://images.unsplash.com/photo-1585298723682-711556143a75?auto=format&fit=crop&w=800&q=80",
        shopifyVariantId: "gid://shopify/ProductVariant/REPLACE_ME_8"
    }
];

// Gültige Gutscheincodes
const discountCodes = {
    'WILLKOMMEN10': { type: 'percent', value: 0.10 }, // 10% Rabatt
    'HALLOWELT5': { type: 'fixed', value: 5.00 }        // 5€ Rabatt
};

// Versandkosten berechnen
function getShippingCost(country) {
    if (country === 'DE') return 4.99;
    if (country === 'AT') return 9.99;
    if (country === 'CH') return 14.99;
    return 19.99;
}