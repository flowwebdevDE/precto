// Steuersätze und Logik
const taxConfig = {
    // Steuersätze pro Land (Standard / Ermäßigt)
    rates: {
        'DE': { standard: 0.19, reduced: 0.07 },
        'AT': { standard: 0.20, reduced: 0.10 },
        'CH': { standard: 0.081, reduced: 0.026 },
        'default': { standard: 0.19, reduced: 0.07 }
    },
    // Mapping: Welche Kategorie bekommt welchen Satz?
    categories: {
        'Bürobedarf': 'standard',
        'Elektronik': 'standard',
        'Merchandise': 'standard',
        'Textilien': 'standard'
    }
};

function calculateTax(country, cart, shipping, discountRatio = 0) {
    const rates = taxConfig.rates[country] || taxConfig.rates['default'];
    let totalTax = 0;

    // Steuer für Produkte berechnen
    cart.forEach(item => {
        const type = taxConfig.categories[item.category] || 'standard';
        const rate = rates[type];
        // Preis anteilig um Rabatt reduzieren für Steuerberechnung
        const itemTotal = item.price * item.qty * (1 - discountRatio);
        totalTax += itemTotal - (itemTotal / (1 + rate));
    });

    // Steuer für Versand (meist Standard-Satz)
    const shippingRate = rates.standard;
    totalTax += shipping - (shipping / (1 + shippingRate));

    return totalTax;
}