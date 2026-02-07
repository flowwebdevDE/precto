        //Version vom 07.02.2026
        
        // --- KONFIGURATION & DATEN ---
        const shopifyConfig = {
            // TODO: Hier Ihre Shopify-Daten eintragen
            domain: 'devstore-2794986.myshopify.com', 
            storefrontAccessToken: '9e3de93f3f4599e6e419b6b60ffd6c8f', // WICHTIG: Dies muss der "Storefront Access Token" sein (nicht der API Key!)
            apiVersion: '2024-01' // Feste Version für Stabilität
        };

        // Config global verfügbar machen für Debugging
        window.shopifyConfig = shopifyConfig;

        const config = {
            enablePreviewMode: true, // Setze auf false, um den Login zu deaktivieren (Shop live schalten)
            useFallbackData: false, // Setze auf true, um Platzhalter anzuzeigen, wenn Shopify lädt/fehlt; false für Ladeanimation
            // Währungs-Konfiguration (Basis: EUR)
            currencyRates: {
                'DE': { code: 'EUR', symbol: '€', rate: 1 },
                'AT': { code: 'EUR', symbol: '€', rate: 1 },
                'CH': { code: 'CHF', symbol: 'CHF', rate: 0.96 }, // Beispielkurs
                'default': { code: 'EUR', symbol: '€', rate: 1 }
            },
            // Lokalisierte Texte pro Land
            locales: {
                'DE': {
                    heroTitle: "Qualität, die überzeugt.",
                    heroText: "Entdecken Sie unsere kuratierte Auswahl an hochwertigen Produkten für Ihr Unternehmen und Zuhause.",
                    cartTitle: "Ihr Warenkorb"
                },
                'AT': {
                    heroTitle: "Qualität, die überzeugt.",
                    heroText: "Entdecken Sie unsere kuratierte Auswahl an hochwertigen Produkten für Ihr Unternehmen und Zuhause.",
                    cartTitle: "Ihr Einkaufskorb"
                },
                'CH': {
                    heroTitle: "Qualität, die überzeugt.",
                    heroText: "Entdecken Sie unsere kuratierte Auswahl an hochwertigen Produkten für Ihr Unternehmen und Zuhause.",
                    cartTitle: "Din Warenkorb 🛒"
                }
            }
        };

        // --- APP LOGIK ---
        window.app = {
            cart: [],
            shopifyClient: null,
            customerToken: null, // Token für eingeloggte Kunden
            customerData: null,  // Kundendaten (Name, Adresse, Orders)
            currentStep: 1,
            currentProductId: null,
            currentVariantId: null,
            discount: null, // Aktueller Rabatt
            selectedCountry: 'DE',
            favorites: [],
            lastOrderId: null,
            lastOrder: null, // Speichert Details für Rechnung
            trackingInterval: null,
            filterState: {
                category: 'Alle',
                search: '',
                sort: 'default'
            },

            checkPreviewAccess() {
                const pass = document.getElementById('preview-pass').value;
                // Einfaches Passwort für die Preview
                if (pass.toLowerCase() === 'preview') {
                    document.getElementById('preview-login').style.display = 'none';
                    sessionStorage.setItem('preview_access', 'true');
                } else {
                    document.getElementById('login-error').style.display = 'block';
                }
            },

            init() {
                // Prüfen ob Preview-Modus aktiv ist oder bereits eingeloggt
                if (!config.enablePreviewMode || sessionStorage.getItem('preview_access') === 'true') {
                    const loginOverlay = document.getElementById('preview-login');
                    if (loginOverlay) loginOverlay.style.display = 'none';
                }

                // Prüfen ob Kunde von erfolgreicher Shopify-Zahlung zurückkehrt
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('payment') === 'success') {
                    this.handleSuccessReturn();
                }

                // Prüfen ob Kunde eingeloggt ist
                this.checkCustomerLogin();

                // Sicherheits-Check für Konfiguration
                if (shopifyConfig.storefrontAccessToken && shopifyConfig.storefrontAccessToken.includes('-')) {
                    console.warn("⚠️ WARNUNG: Der Token sieht aus wie eine Client ID (enthält Bindestriche). Bitte prüfen Sie, ob Sie wirklich den 'Storefront Access Token' verwenden.");
                }

                this.initShopify();

                // Load favorites
                const savedFavs = localStorage.getItem('shopFavorites');
                if (savedFavs) {
                    this.favorites = JSON.parse(savedFavs);
                }

                if (config.useFallbackData) {
                    this.renderProducts();
                } else {
                    products = []; // Fallback-Daten löschen, damit sie nicht versehentlich angezeigt werden
                    this.renderLoadingState();
                }
                this.updateCartUI();
                // Load cart from local storage if needed
                const savedCart = localStorage.getItem('shopCart');
                if (savedCart) {
                    this.cart = JSON.parse(savedCart);
                    this.updateCartUI();
                }
                this.initAddressAutocomplete();
                this.initStreetAutocomplete();
                this.renderCategories();
                
                // Setze Standardland beim Start
                this.setCountry(this.selectedCountry);
            },

            handleSuccessReturn() {
                // Warenkorb leeren nach erfolgreichem Kauf
                this.cart = [];
                this.saveCart();
                this.updateCartUI();
                
                // Zur Success-Seite navigieren
                setTimeout(() => this.navigate('success'), 100);
            },

            renderLoadingState() {
                // Skeleton Card HTML Struktur (Platzhalter)
                const skeletonHTML = `
                    <div class="product-card skeleton-card" style="min-width: 260px; border: 1px solid #f3f4f6; box-shadow: none;">
                        <div class="product-img skeleton-pulse" style="background: #f3f4f6; height: 180px;"></div>
                        <div class="product-details" style="padding: 1.5rem;">
                            <div class="skeleton-pulse" style="height: 22px; width: 70%; margin-bottom: 12px; border-radius: 4px;"></div>
                            <div class="skeleton-pulse" style="height: 14px; width: 90%; margin-bottom: 8px; border-radius: 4px;"></div>
                            <div class="skeleton-pulse" style="height: 14px; width: 60%; margin-bottom: 20px; border-radius: 4px;"></div>
                            <div class="skeleton-pulse" style="height: 28px; width: 40%; margin-bottom: 20px; border-radius: 4px;"></div>
                            <div class="skeleton-pulse" style="height: 45px; width: 100%; border-radius: 8px;"></div>
                        </div>
                    </div>
                `;
                
                // 4 Platzhalter generieren
                const content = Array(4).fill(skeletonHTML).join('');
                
                const list = document.getElementById('product-list');
                const featured = document.getElementById('featured-products');
                
                if (list) list.innerHTML = content;
                if (featured) featured.innerHTML = content;
            },

            // --- SHOPIFY API HELPER ---
            shopifyFetch(query, variables, token = shopifyConfig.storefrontAccessToken) {
                const domain = shopifyConfig.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
                const apiUrl = `https://${domain}/api/${shopifyConfig.apiVersion || '2024-01'}/graphql.json`;
                
                // Token bereinigen (Leerzeichen entfernen)
                const cleanToken = token ? token.trim() : '';

                const headers = {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': cleanToken
                };
                return fetch(apiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ query, variables })
                }).then(res => {
                    if (!res.ok) {
                        return res.text().then(text => { 
                            throw new Error(`Shopify API Fehler (${res.status}): ${text}`); 
                        });
                    }
                    return res.json();
                });
            },

            // --- CUSTOMER ACCOUNT LOGIC ---
            checkCustomerLogin() {
                const token = localStorage.getItem('shopifyCustomerAccessToken');
                if (token) {
                    this.customerToken = token;
                    this.fetchCustomerData();
                }
            },

            handleUserIconClick() {
                if (this.customerToken) {
                    this.navigate('account');
                } else {
                    this.navigate('auth');
                }
            },

            async registerCustomer(event) {
                event.preventDefault();
                const form = event.target;
                const btn = form.querySelector('button[type="submit"]');
                if(btn) { btn.disabled = true; btn.innerText = "Lädt..."; }

                const email = form.email.value;
                const password = form.password.value;
                const firstName = form.firstName.value;
                const lastName = form.lastName.value;

                const query = `
                    mutation customerCreate($input: CustomerCreateInput!) {
                        customerCreate(input: $input) {
                            customer { id }
                            customerUserErrors { code field message }
                        }
                    }
                `;

                try {
                    const result = await this.shopifyFetch(query, { input: { email, password, firstName, lastName } });
                    console.log("Registrierung API Antwort:", result); // Debug Log
                    
                    if (result.errors) {
                        throw new Error(result.errors.map(e => e.message).join(', '));
                    }

                    const data = result.data?.customerCreate;
                    if (!data) throw new Error("Keine Antwort von Shopify erhalten.");

                    if (data.customerUserErrors.length > 0) {
                        console.warn("Registrierung Fehler:", data.customerUserErrors);
                        this.showToast(data.customerUserErrors[0].message, 'error');
                    } else {
                        this.showToast('Konto erstellt! Ggf. E-Mail bestätigen, dann einloggen.');
                        this.toggleAuthMode('login'); // Zum Login wechseln
                        form.reset();
                    }
                } catch (err) {
                    console.error(err);
                    this.showToast(err.message || 'Fehler bei der Registrierung', 'error');
                } finally {
                    if(btn) { btn.disabled = false; btn.innerText = "Registrieren"; }
                }
            },

            async loginCustomer(event) {
                event.preventDefault();
                const form = event.target;
                const btn = form.querySelector('button[type="submit"]');
                if(btn) { btn.disabled = true; btn.innerText = "Lädt..."; }

                const email = form.email.value.trim();
                const password = form.password.value;

                const query = `
                    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
                        customerAccessTokenCreate(input: $input) {
                            customerAccessToken { accessToken expiresAt }
                            customerUserErrors { code field message }
                        }
                    }
                `;

                try {
                    const result = await this.shopifyFetch(query, { input: { email, password } });
                    console.log("Login API Antwort:", result); // Debug Log
                    
                    if (result.errors) {
                        throw new Error(result.errors.map(e => e.message).join(', '));
                    }

                    const data = result.data?.customerAccessTokenCreate;
                    if (!data) throw new Error("Keine Antwort von Shopify erhalten.");

                    if (data.customerUserErrors.length > 0) {
                        console.warn("Login Fehler:", data.customerUserErrors);
                        const msg = data.customerUserErrors[0].message;
                        this.showToast(msg === 'Unidentified customer' ? 'E-Mail/Passwort falsch oder Konto nicht aktiviert.' : msg, 'error');
                    } else if (data.customerAccessToken) {
                        this.customerToken = data.customerAccessToken.accessToken;
                        localStorage.setItem('shopifyCustomerAccessToken', this.customerToken);
                        this.showToast('Erfolgreich eingeloggt! 👋');
                        this.fetchCustomerData();
                        this.navigate('account');
                        form.reset();
                    }
                } catch (err) {
                    console.error(err);
                    this.showToast(err.message || 'Login fehlgeschlagen', 'error');
                } finally {
                    if(btn) { btn.disabled = false; btn.innerText = "Einloggen"; }
                }
            },

            async fetchCustomerData() {
                if (!this.customerToken) return;

                const query = `
                    query getCustomer($customerAccessToken: String!) {
                        customer(customerAccessToken: $customerAccessToken) {
                            firstName lastName email
                            defaultAddress { id address1 city zip countryCodeV2 firstName lastName }
                            orders(first: 5, reverse: true) {
                                edges { 
                                    node { 
                                        id
                                        orderNumber 
                                        totalPrice { amount currencyCode } 
                                        processedAt 
                                        canceledAt
                                        statusUrl
                                        financialStatus 
                                        fulfillmentStatus 
                                        successfulFulfillments(first: 1) {
                                            trackingInfo(first: 1) {
                                                url
                                                number
                                            }
                                        }
                                        shippingAddress { firstName lastName address1 city zip country }
                                        lineItems(first: 20) {
                                            edges {
                                                node { title quantity variant { id price { amount } image { url } product { id title featuredImage { url } } } }
                                            }
                                        }
                                    } 
                                }
                            }
                        }
                    }
                `;

                try {
                    const result = await this.shopifyFetch(query, { customerAccessToken: this.customerToken });
                    
                    // Fehler-Logging für Debugging (z.B. wenn Berechtigungen für Orders fehlen)
                    if (result.errors) {
                        console.error("Shopify API Fehler (Customer Data):", result.errors);
                    }

                    if (result.data && result.data.customer) {
                        this.customerData = result.data.customer;
                        this.renderAccountDashboard();
                    } else {
                        console.warn("Keine Kundendaten erhalten. Token ungültig oder API-Fehler.");
                        this.logout();
                    }
                } catch (err) {
                    console.error("Fehler beim Laden der Kundendaten:", err);
                    // Nicht sofort ausloggen bei Netzwerkfehlern, damit man es nochmal versuchen kann
                }
            },

            logout() {
                document.getElementById('logout-modal').classList.add('active');
            },

            confirmLogout() {
                this.customerToken = null;
                this.customerData = null;
                localStorage.removeItem('shopifyCustomerAccessToken');
                this.showToast('Ausgeloggt.');
                this.navigate('home');
                this.closeLogoutModal();
            },

            closeLogoutModal() {
                document.getElementById('logout-modal').classList.remove('active');
            },

            renderAccountDashboard() {
                const c = this.customerData;
                if (!c) return;

                // Sidebar Info
                const sidebarName = document.getElementById('sidebar-name');
                const sidebarEmail = document.getElementById('sidebar-email');
                const avatar = document.getElementById('profile-avatar');
                
                if (sidebarName) sidebarName.innerText = `${c.firstName} ${c.lastName}`;
                if (sidebarEmail) sidebarEmail.innerText = c.email;
                if (avatar) avatar.innerText = this.getInitials(c.firstName, c.lastName);

                // Settings Form Pre-fill
                const setFirst = document.getElementById('settings-firstname');
                const setLast = document.getElementById('settings-lastname');
                const setEmail = document.getElementById('settings-email');
                
                if(setFirst) setFirst.value = c.firstName || '';
                if(setLast) setLast.value = c.lastName || '';
                if(setEmail) setEmail.value = c.email || '';

                // Adresse rendern
                const addrDisplay = document.getElementById('account-address-display');
                const addrForm = document.getElementById('account-address-form');
                
                if (c.defaultAddress) {
                    const a = c.defaultAddress;
                    addrDisplay.innerHTML = `
                        <strong>${a.firstName} ${a.lastName}</strong><br>
                        ${a.address1}<br>
                        ${a.zip} ${a.city}<br>
                        ${a.countryCodeV2}
                    `;
                    // Formular vorfüllen
                    if(addrForm) {
                        addrForm.firstName.value = a.firstName || '';
                        addrForm.lastName.value = a.lastName || '';
                        addrForm.address1.value = a.address1 || '';
                        addrForm.zip.value = a.zip || '';
                        addrForm.city.value = a.city || '';
                        addrForm.country.value = a.countryCodeV2 || 'DE';
                    }
                } else {
                    addrDisplay.innerHTML = '<p style="color: #666;">Noch keine Adresse hinterlegt.</p>';
                }

                // Orders & Stats
                const ordersContainer = document.getElementById('account-orders');
                const recentOrderContainer = document.getElementById('recent-order-preview');
                const statCount = document.getElementById('stat-orders-count');
                const statTotal = document.getElementById('stat-total-spent');

                if (ordersContainer) {
                    if (!c.orders || c.orders.edges.length === 0) {
                        ordersContainer.innerHTML = '<p style="color: #666;">Noch keine Bestellungen.</p>';
                        if(recentOrderContainer) recentOrderContainer.innerHTML = '<p style="color: #666;">Noch keine Bestellungen.</p>';
                        if(statCount) statCount.innerText = '0';
                        if(statTotal) statTotal.innerText = this.formatPrice(0);
                    } else {
                        // Stats berechnen
                        const totalOrders = c.orders.edges.length; // (Hinweis: API liefert hier nur die ersten 5, für echte Total bräuchte man ein extra Feld)
                        let totalSpent = 0;
                        c.orders.edges.forEach(e => totalSpent += parseFloat(e.node.totalPrice.amount));
                        
                        // Render Order List
                        const orderHTML = c.orders.edges.map(({ node: o }) => {
                            // Subtotal berechnen um Versandkosten zu ermitteln
                            let subtotal = 0;
                            o.lineItems.edges.forEach(({ node: item }) => {
                                const price = item.variant?.price?.amount ? parseFloat(item.variant.price.amount) : 0;
                                subtotal += price * item.quantity;
                            });
                            const total = parseFloat(o.totalPrice.amount);
                            const shipping = Math.max(0, total - subtotal);

                            // Tracking Info extrahieren (falls vorhanden)
                            const tracking = o.successfulFulfillments?.[0]?.trackingInfo?.[0];

                            return `
                            <div class="order-card" id="order-${o.id}">
                                <div class="flex-between mb-2 order-card-header">
                                    <strong>Bestellung #${o.orderNumber}</strong>
                                    <span>${new Date(o.processedAt).toLocaleDateString()}</span>
                                </div>
                                <div class="flex-between mb-4 order-card-status">
                                    <span class="status-badge ${o.canceledAt ? 'cancelled' : (o.fulfillmentStatus === 'FULFILLED' ? 'success' : 'pending')}">
                                        ${o.canceledAt ? 'Storniert' : (o.fulfillmentStatus === 'FULFILLED' ? 'Versendet' : 'In Bearbeitung')}
                                    </span>
                                    <strong>${this.formatPrice(o.totalPrice.amount)}</strong>
                                </div>
                                
                                <div class="order-actions">
                                    <button class="secondary small" onclick="app.toggleOrderDetails('${o.id}')" id="btn-details-${o.id}">Details anzeigen</button>
                                    <button class="small" onclick="app.repeatOrder('${o.id}')">Bestellung wiederholen</button>
                                    <button class="secondary small" onclick="app.showOrderStatus('${o.id}')" style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7;">Bestellstatus</button>
                                    ${tracking?.url ? `<button class="secondary small" onclick="window.open('${tracking.url}', '_blank')" style="background: #ecfdf5; border: 1px solid #6ee7b7; color: #047857;">Tracking 📦</button>` : ''}
                                </div>

                                <div id="details-${o.id}" class="order-details-list" style="display: none;">
                                    ${o.lineItems.edges.map(({ node: item }) => {
                                        // Robustes Laden der Bilder: Erst Variante, dann Produkt, dann Platzhalter
                                        const variantImg = item.variant?.image?.url;
                                        const productImg = item.variant?.product?.featuredImage?.url;
                                        const img = variantImg || productImg || 'https://via.placeholder.com/50';
                                        
                                        const price = item.variant?.price?.amount || '0.00';
                                        return `
                                            <div class="order-detail-item">
                                                <img src="${img}" alt="${item.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                                                <div style="flex: 1;">
                                                    <div style="font-weight: 600; font-size: 0.9rem;">${item.title}</div>
                                                    <div style="color: #666; font-size: 0.85rem;">${item.quantity}x ${this.formatPrice(price)}</div>
                                                </div>
                                                <div style="font-weight: bold;">
                                                    ${this.formatPrice(price * item.quantity)}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee; text-align: right; font-size: 0.9rem; color: #666;">
                                        ${shipping > 0.01 ? `<div style="margin-bottom:4px;">Versand: ${this.formatPrice(shipping)}</div>` : ''}
                                        <span style="margin-right: 10px;">inkl. MwSt.</span>
                                    </div>
                                </div>
                            </div>
                        `}).join('');
                        
                        ordersContainer.innerHTML = orderHTML;

                        // Recent Order (Erste in der Liste)
                        if(recentOrderContainer) {
                            const firstOrderNode = c.orders.edges[0].node;

                            // Get first 3 product images from the order
                            const itemImagesHTML = firstOrderNode.lineItems.edges.slice(0, 3).map(({ node: item }) => {
                                const img = item.variant?.image?.url || item.variant?.product?.featuredImage?.url || 'https://via.placeholder.com/50';
                                return `<img src="${img}" alt="${item.title}" class="recent-order-item-img">`;
                            }).join('');

                            const isCanceled = firstOrderNode.canceledAt !== null;
                            const isFulfilled = firstOrderNode.fulfillmentStatus === 'FULFILLED';
                            const statusClass = isCanceled ? 'cancelled' : (isFulfilled ? 'success' : 'pending');
                            const statusText = isCanceled ? 'Storniert' : (isFulfilled ? 'Versendet' : 'In Bearbeitung');

                            recentOrderContainer.innerHTML = `
                                <div class="recent-order-card">
                                    <div class="recent-order-images">
                                        ${itemImagesHTML}
                                    </div>
                                    <div class="recent-order-info">
                                        <div>
                                            <strong>Bestellung #${firstOrderNode.orderNumber}</strong>
                                            <span class="status-badge ${statusClass}" style="margin-left: 10px;">${statusText}</span>
                                        </div>
                                        <small style="color: #666;">${new Date(firstOrderNode.processedAt).toLocaleDateString()} &middot; ${this.formatPrice(firstOrderNode.totalPrice.amount)}</small>
                                    </div>
                                    <button class="small" onclick="app.showOrderStatus('${firstOrderNode.id}')" style="margin-left: auto;">Details</button>
                                </div>
                            `;
                        }

                        if(statCount) statCount.innerText = totalOrders;
                        if(statTotal) statTotal.innerText = this.formatPrice(totalSpent);
                    }
                }
            },

            toggleAddressForm() {
                const form = document.getElementById('account-address-form');
                const display = document.getElementById('account-address-display');
                if (form.style.display === 'none') {
                    form.style.display = 'block';
                    display.style.display = 'none';
                } else {
                    form.style.display = 'none';
                    display.style.display = 'block';
                }
            },

            switchAccountTab(tabId) {
                // Buttons active state
                document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
                const activeBtn = document.getElementById(`nav-btn-${tabId}`);
                if(activeBtn) activeBtn.classList.add('active');

                // Content visibility
                document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
                const activePane = document.getElementById(`tab-${tabId}`);
                if(activePane) activePane.style.display = 'block';
            },

            getInitials(first, last) {
                return (first.charAt(0) + last.charAt(0)).toUpperCase();
            },

            async updateCustomerAddress(event) {
                event.preventDefault();
                const form = event.target;
                const btn = form.querySelector('button[type="submit"]');
                if(btn) { btn.disabled = true; btn.innerText = "Speichert..."; }

                const addressInput = {
                    firstName: form.firstName.value,
                    lastName: form.lastName.value,
                    address1: form.address1.value,
                    zip: form.zip.value,
                    city: form.city.value,
                    country: form.country.value
                };

                // Prüfen ob Update oder Create
                const isUpdate = this.customerData.defaultAddress && this.customerData.defaultAddress.id;
                const mutationName = isUpdate ? 'customerAddressUpdate' : 'customerAddressCreate';
                const idVar = isUpdate ? '$id: ID!, ' : '';
                const idParam = isUpdate ? 'id: $id, ' : '';

                const query = `
                    mutation addressMutation($customerAccessToken: String!, ${idVar}$address: MailingAddressInput!) {
                        ${mutationName}(customerAccessToken: $customerAccessToken, ${idParam}address: $address) {
                            customerAddress { id }
                            customerUserErrors { code field message }
                        }
                    }
                `;

                const variables = {
                    customerAccessToken: this.customerToken,
                    address: addressInput
                };
                if (isUpdate) variables.id = this.customerData.defaultAddress.id;

                try {
                    const result = await this.shopifyFetch(query, variables);
                    const data = result.data?.[mutationName];
                    
                    if (data?.customerUserErrors?.length > 0) {
                        this.showToast(data.customerUserErrors[0].message, 'error');
                    } else {
                        this.showToast('Adresse gespeichert!');
                        this.toggleAddressForm();
                        this.fetchCustomerData(); // Daten neu laden
                    }
                } catch (err) {
                    console.error(err);
                    this.showToast('Fehler beim Speichern', 'error');
                } finally {
                    if(btn) { btn.disabled = false; btn.innerText = "Speichern"; }
                }
            },

            async updateCustomerProfile(event) {
                event.preventDefault();
                const form = event.target;
                const btn = form.querySelector('button[type="submit"]');
                if(btn) { btn.disabled = true; btn.innerText = "Speichert..."; }

                const input = {
                    firstName: form.firstName.value,
                    lastName: form.lastName.value,
                    email: form.email.value
                };

                if (form.password.value) {
                    input.password = form.password.value;
                }

                const query = `
                    mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
                        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
                            customer { id firstName lastName email }
                            customerAccessToken { accessToken expiresAt }
                            customerUserErrors { code field message }
                        }
                    }
                `;

                try {
                    const result = await this.shopifyFetch(query, { customerAccessToken: this.customerToken, customer: input });
                    const data = result.data?.customerUpdate;

                    if (data?.customerUserErrors?.length > 0) {
                        this.showToast(data.customerUserErrors[0].message, 'error');
                    } else {
                        this.showToast('Profil aktualisiert!');
                        // Falls Passwort geändert wurde, gibt es einen neuen Token
                        if (data.customerAccessToken) {
                            this.customerToken = data.customerAccessToken.accessToken;
                            localStorage.setItem('shopifyCustomerAccessToken', this.customerToken);
                        }
                        this.fetchCustomerData(); // UI aktualisieren
                    }
                } catch (err) {
                    console.error(err);
                    this.showToast('Fehler beim Aktualisieren', 'error');
                } finally {
                    if(btn) { btn.disabled = false; btn.innerText = "Änderungen speichern"; }
                }
            },

            toggleOrderDetails(orderId) {
                const details = document.getElementById(`details-${orderId}`);
                const btn = document.getElementById(`btn-details-${orderId}`);
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    btn.innerText = 'Details verbergen';
                } else {
                    details.style.display = 'none';
                    btn.innerText = 'Details anzeigen';
                }
            },

            showOrderStatus(orderId) {
                const order = this.customerData.orders.edges.find(e => e.node.id === orderId)?.node;
                if (!order) return;

                const container = document.getElementById('order-status-content');
                
                // Status Logic
                const isCanceled = order.canceledAt !== null;
                const isFulfilled = order.fulfillmentStatus === 'FULFILLED';
                
                // Timeline Steps
                const steps = [
                    { title: "Bestellung eingegangen", active: true, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' },
                    { title: "In Bearbeitung", active: !isCanceled, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' },
                    { title: "Versendet", active: isFulfilled, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>' }
                ];

                if (isCanceled) {
                    steps.push({ title: "Storniert", active: true, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>', error: true });
                }

                const timelineHTML = steps.map((step, i) => `
                    <div class="timeline-item ${step.active ? 'active' : ''} ${step.error ? 'error' : ''}">
                        <div class="timeline-icon">${step.icon}</div>
                        <div class="timeline-content">
                            <strong>${step.title}</strong>
                        </div>
                    </div>
                `).join('');

                // Address
                const addr = order.shippingAddress;
                const addressHTML = addr ? `
                    <div class="address-card" style="margin-top: 2rem;">
                        <h4 style="margin-top: 0;">Lieferadresse</h4>
                        ${addr.firstName} ${addr.lastName}<br>
                        ${addr.address1}<br>
                        ${addr.zip} ${addr.city}<br>
                        ${addr.country || ''}
                    </div>
                ` : '';

                // Items
                const itemsHTML = order.lineItems.edges.map(({ node: item }) => {
                    const img = item.variant?.image?.url || item.variant?.product?.featuredImage?.url || 'https://via.placeholder.com/50';
                    return `
                        <div class="status-item" style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem;">
                            <img src="${img}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                            <div>
                                <div style="font-weight: 600;">${item.title}</div>
                                <div style="color: #666; font-size: 0.9rem;">${item.quantity}x</div>
                            </div>
                        </div>
                    `;
                }).join('');

                container.innerHTML = `
                    <div class="flex-between mb-4 status-header" style="margin-bottom: 2rem;">
                        <h2 style="margin: 0;">Bestellung #${order.orderNumber}</h2>
                        <span class="status-badge ${isCanceled ? 'cancelled' : (isFulfilled ? 'success' : 'pending')}" style="font-size: 1rem; padding: 0.5rem 1rem;">
                            ${isCanceled ? 'Storniert' : (isFulfilled ? 'Versendet' : 'In Bearbeitung')}
                        </span>
                    </div>

                    <div class="tracking-timeline" style="margin-bottom: 2rem;">
                        ${timelineHTML}
                    </div>

                    ${addressHTML}

                    <h3 style="margin-top: 2rem;">Inhalt</h3>
                    <div>${itemsHTML}</div>
                `;

                this.navigate('order-status');
            },

            repeatOrder(orderId) {
                const orderEdge = this.customerData.orders.edges.find(e => e.node.id === orderId);
                if (!orderEdge) return;
                
                let addedCount = 0;
                orderEdge.node.lineItems.edges.forEach(({ node: item }) => {
                    if (item.variant && item.variant.product) {
                        // Wir nutzen die existierende addToCart Funktion
                        // Hinweis: Das Produkt muss im lokalen 'products' Array existieren, damit addToCart funktioniert.
                        this.addToCart(item.variant.product.id, 'reorder', item.quantity, item.variant.id);
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    this.showToast(`${addedCount} Positionen in den Warenkorb gelegt.`);
                    this.navigate('cart');
                } else {
                    this.showToast("Produkte nicht mehr verfügbar.", "error");
                }
            },

            requestCancellation(orderNumber) {
                this.navigate('contact');
                const msgField = document.getElementById('contact-message');
                if (msgField) {
                    msgField.value = `Bitte um Stornierung meiner Bestellung #${orderNumber}.`;
                    this.showToast("Bitte senden Sie das Formular ab, um die Stornierung anzufragen.");
                }
            },

            initShopify() {
                if (window.ShopifyBuy) {
                    this.shopifyClient = ShopifyBuy.buildClient(shopifyConfig);
                    this.testShopifyConnection();
                    this.fetchShopifyProducts();
                } else {
                    console.warn("Shopify SDK nicht geladen.");
                }
            },

            testShopifyConnection() {
                if (!this.shopifyClient) return;

                console.group("🛒 Shopify Verbindungs-Check");
                console.log("Konfiguration wird geprüft...", {
                    domain: shopifyConfig.domain,
                    token: shopifyConfig.storefrontAccessToken ? `${shopifyConfig.storefrontAccessToken.substring(0, 10)}...` : 'FEHLT'
                });

                this.shopifyClient.shop.fetchInfo()
                    .then((shop) => {
                        console.log("%c✅ Verbindung erfolgreich hergestellt!", "color: #10b981; font-weight: bold; font-size: 1.1em;");
                        console.log("Shop Name:", shop.name);
                        console.log("Beschreibung:", shop.description);
                        console.log("Währung:", shop.currencyCode);
                        console.log("Shop URL:", shop.primaryDomain.url);
                    })
                    .catch((err) => {
                        console.log("%c❌ Verbindung fehlgeschlagen!", "color: #ef4444; font-weight: bold; font-size: 1.1em;");
                        console.error("Fehler-Details:", err);
                        
                        let msg = err.message || JSON.stringify(err);
                        if (msg.includes("Failed to fetch")) {
                            console.warn("Netzwerkfehler: Domain prüfen. Ist die URL korrekt?");
                        }
                        
                        console.warn("Mögliche Ursachen:\n1. Falsche Domain (muss 'ihr-shop.myshopify.com' sein)\n2. Ungültiger Storefront Access Token\n3. Fehlende API-Berechtigungen (unauthenticated_read_product_listings)");
                    })
                    .finally(() => console.groupEnd());
            },

            fetchShopifyProducts() {
                if (!this.shopifyClient) {
                    if (!config.useFallbackData) {
                        const list = document.getElementById('product-list');
                        if(list) list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Shopify Verbindung nicht verfügbar.</div>';
                    }
                    return;
                }

                console.log("🔄 Lade Produkte von Shopify...");
                
                // Fetch all products
                this.shopifyClient.product.fetchAll().then((fetchedProducts) => {
                    if (fetchedProducts && fetchedProducts.length > 0) {
                        console.log(`✅ ${fetchedProducts.length} Produkte geladen.`);
                        
                        // Map Shopify Data to App Data Structure
                        products = fetchedProducts.map(p => {
                            const variant = p.variants[0]; // Use first variant
                            
                            // Kategorie-Logik verbessert:
                            // 1. Nutze 'productType' aus Shopify
                            // 2. Fallback auf den ersten Tag, falls productType leer ist
                            // 3. Fallback auf 'Allgemein'
                            let category = p.productType ? p.productType.trim() : '';
                            if (!category && p.tags && p.tags.length > 0) {
                                category = typeof p.tags[0] === 'object' ? p.tags[0].value : p.tags[0];
                            }

                            return {
                                id: p.id, // Keep Shopify ID (Base64 String)
                                name: p.title,
                                price: parseFloat(variant.price.amount),
                                originalPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null,
                                category: category || 'Allgemein',
                                description: p.description || '',
                                image: p.images[0] ? p.images[0].src : 'https://via.placeholder.com/300',
                                shopifyVariantId: variant.id,
                                variantCount: p.variants.length,
                                variants: p.variants
                            };
                        });

                        // Update UI
                        this.renderCategories();
                        this.renderProducts();
                        this.applyFilters();
                    } else {
                        console.warn("⚠️ Keine Produkte in Shopify gefunden.");
                        this.renderProducts([]); // Loading State entfernen
                    }
                }).catch(err => {
                    console.error("❌ Fehler beim Laden der Produkte:", err);
                    if (config.useFallbackData) {
                        this.renderProducts();
                    } else {
                        // Fehleranzeige im UI
                        const list = document.getElementById('product-list');
                        if(list) list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">Produkte konnten nicht geladen werden.<br><small>Bitte prüfen Sie Ihre Internetverbindung.</small><br><button onclick="location.reload()" style="margin-top:1rem; width:auto;">Neu laden</button></div>';
                    }
                });
            },

            getCurrency() {
                return config.currencyRates[this.selectedCountry] || config.currencyRates['default'];
            },

            formatPrice(amount) {
                const currency = this.getCurrency();
                const converted = amount * currency.rate;
                return `${converted.toFixed(2)} ${currency.symbol}`;
            },

            initAddressAutocomplete() {
                const zipInput = document.getElementById('input-zip');
                const cityInput = document.getElementById('input-city');
                const countrySelect = document.getElementById('input-country');
                
                if (!zipInput || !cityInput) return;

                zipInput.addEventListener('input', (e) => {
                    const zip = e.target.value;
                    const countryCode = countrySelect ? (countrySelect.value.toLowerCase() || 'de') : 'de';
                    
                    if (zip.length >= 4 && /^\d+$/.test(zip)) {
                        cityInput.placeholder = "Suche Stadt...";
                        // Dynamische API-Abfrage basierend auf Land
                        fetch(`https://api.zippopotam.us/${countryCode}/${zip}`)
                            .then(response => {
                                if (!response.ok) throw new Error('PLZ nicht gefunden');
                                return response.json();
                            })
                            .then(data => {
                                if (data.places && data.places.length > 0) {
                                    cityInput.value = data.places[0]['place name'];
                                    this.showToast(`Stadt gefunden: ${cityInput.value} 📍`);
                                }
                            })
                            .catch(() => { /* Silent fail, user types manually */ })
                            .finally(() => { cityInput.placeholder = "Stadt"; });
                    }
                });
            },

            initStreetAutocomplete() {
                const streetInput = document.getElementById('input-street');
                const suggestionsBox = document.getElementById('street-suggestions');
                const zipInput = document.getElementById('input-zip');
                const cityInput = document.getElementById('input-city');
                const countrySelect = document.getElementById('input-country');

                if (!streetInput || !suggestionsBox) return;

                let debounceTimer;

                streetInput.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    const query = e.target.value;
                    
                    if (query.length < 3) {
                        suggestionsBox.classList.remove('active');
                        return;
                    }

                    debounceTimer = setTimeout(() => {
                        // Suche in DACH-Region (lang=de)
                        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=de`)
                            .then(res => res.json())
                            .then(data => {
                                suggestionsBox.innerHTML = '';
                                if (data.features && data.features.length > 0) {
                                    data.features.forEach(feature => {
                                        const props = feature.properties;
                                        // Nur anzeigen, wenn Straße vorhanden
                                        if (props.street || props.name) {
                                            const div = document.createElement('div');
                                            div.className = 'autocomplete-item';
                                            const streetName = props.street || props.name;
                                            const houseNr = props.housenumber || '';
                                            const city = props.city || props.town || props.village || '';
                                            const zip = props.postcode || '';
                                            const countryCode = props.countrycode ? props.countrycode.toUpperCase() : '';
                                            
                                            div.innerHTML = `<strong>${streetName} ${houseNr}</strong><small>${zip} ${city}</small>`;
                                            
                                            div.onclick = () => {
                                                streetInput.value = `${streetName} ${houseNr}`.trim();
                                                if (zip) zipInput.value = zip;
                                                if (city) cityInput.value = city;
                                                
                                                // Land automatisch setzen, falls erkannt und in der Liste vorhanden
                                                if (countryCode && countrySelect) {
                                                    const option = countrySelect.querySelector(`option[value="${countryCode}"]`);
                                                    if (option) {
                                                        countrySelect.value = countryCode;
                                                    }
                                                }
                                                
                                                suggestionsBox.classList.remove('active');
                                            };
                                            suggestionsBox.appendChild(div);
                                        }
                                    });
                                    suggestionsBox.classList.add('active');
                                } else {
                                    suggestionsBox.classList.remove('active');
                                }
                            })
                            .catch(err => console.error(err));
                    }, 300); // 300ms warten bevor Request gesendet wird
                });

                // Schließen wenn man woanders hinklickt
                document.addEventListener('click', (e) => {
                    if (e.target !== streetInput && e.target !== suggestionsBox) {
                        suggestionsBox.classList.remove('active');
                    }
                });
            },

            toggleMenu() {
                const nav = document.getElementById('main-nav');
                const hamburger = document.querySelector('.hamburger');
                nav.classList.toggle('active');
                hamburger.classList.toggle('active');
            },

            navigate(pageId) {
                // Hide all sections
                document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
                // Show target section
                document.getElementById(pageId).classList.add('active');

                // Update Nav State
                document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));
                const navLink = document.getElementById('nav-' + pageId);
                if (navLink) navLink.classList.add('active');

                // Update Mobile Bottom Nav State
                document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
                const mobileNavLink = document.getElementById('mobile-nav-' + (pageId === 'product-detail' ? 'shop' : pageId));
                if (mobileNavLink) mobileNavLink.classList.add('active');

                // Close Mobile Menu
                document.getElementById('main-nav').classList.remove('active');
                const hamburger = document.querySelector('.hamburger');
                if(hamburger) hamburger.classList.remove('active');

                // Stop tracking interval when leaving page
                if (this.trackingInterval) clearInterval(this.trackingInterval);

                // Scroll Reset (für den neuen Body-Scroll-Container)
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;

                // SEO: Reset Title if not product detail
                if (pageId !== 'product-detail') {
                    document.title = 'PRECTO | Offizieller Online Shop';
                }
            },

            toggleAuthMode(mode) {
                document.getElementById('auth-login').style.display = mode === 'login' ? 'block' : 'none';
                document.getElementById('auth-register').style.display = mode === 'register' ? 'block' : 'none';
                document.getElementById('auth-recover').style.display = mode === 'recover' ? 'block' : 'none';
                
                document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
                // Bei 'recover' bleibt der Login-Tab aktiv (oder keiner), da es ein Unterbereich ist
                if (mode === 'login' || mode === 'recover') document.getElementById('tab-login')?.classList.add('active');
                else if (mode === 'register') document.getElementById('tab-register')?.classList.add('active');
            },

            renderCategories() {
                const categories = ['Alle', 'Favoriten', ...new Set(products.map(p => p.category))];
                const container = document.getElementById('category-filters');
                container.innerHTML = categories.map(cat => 
                    `<button class="category-btn ${cat === 'Alle' ? 'active' : ''}" onclick="app.filterCategory('${cat}')">${cat}</button>`
                ).join('');
            },

            toggleFilterView() {
                const container = document.getElementById('category-filters');
                const btn = document.querySelector('.filter-toggle');
                container.classList.toggle('expanded');
                
                if (container.classList.contains('expanded')) {
                    btn.style.transform = 'rotate(180deg)';
                } else {
                    btn.style.transform = 'rotate(0deg)';
                }
            },

            filterCategory(category) {
                this.filterState.category = category;
                this.applyFilters();
            },

            searchProducts(query) {
                this.filterState.search = query;
                this.applyFilters();
            },

            sortProducts(sortValue) {
                this.filterState.sort = sortValue;
                this.applyFilters();
            },

            scrollProducts(direction) {
                const container = document.getElementById('product-list');
                const scrollAmount = 300;
                if (container) {
                    const leftPos = direction === 'left' ? -scrollAmount : scrollAmount;
                    container.scrollBy({ left: leftPos, behavior: 'smooth' });
                }
            },

            applyFilters() {
                let list = [...products]; // Kopie erstellen

                // 1. Kategorie Filter
                if (this.filterState.category === 'Favoriten') {
                    list = list.filter(p => this.favorites.includes(p.id));
                } else if (this.filterState.category !== 'Alle') {
                    list = list.filter(p => p.category === this.filterState.category);
                }

                // 2. Suche Filter
                if (this.filterState.search) {
                    const term = this.filterState.search.toLowerCase();
                    list = list.filter(p => 
                        p.name.toLowerCase().includes(term) || 
                        p.description.toLowerCase().includes(term)
                    );
                }

                // 3. Sortierung
                if (this.filterState.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
                else if (this.filterState.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
                else if (this.filterState.sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));

                this.updateFilterUI();
                this.renderProducts(list);
            },

            setCountry(country) {
                this.selectedCountry = country;
                
                // 1. Texte aktualisieren (Lokalisierung)
                const texts = config.locales[country] || config.locales['DE'];
                const heroTitle = document.getElementById('hero-title');
                const heroText = document.getElementById('hero-text');
                const cartTitle = document.getElementById('cart-section-title');
                
                if(heroTitle) heroTitle.innerText = texts.heroTitle;
                if(heroText) heroText.innerText = texts.heroText;
                if(cartTitle) cartTitle.innerText = texts.cartTitle;

                // 2. Alle Auswahlfelder synchronisieren
                const selects = ['header-country-select', 'cart-country', 'input-country'];
                selects.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.value = country;
                });

                // 3. Preise und UI aktualisieren
                this.updateCartUI();
                this.renderProducts(); // Shop-Preise aktualisieren

                // Falls wir uns im Checkout befinden, auch dort die Zusammenfassung aktualisieren
                if (document.getElementById('checkout').classList.contains('active')) {
                    this.renderCheckoutSummary();
                }
            },

            updateFilterUI() {
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.innerText === this.filterState.category);
                });
            },

            renderProducts(list = products) {
                const container = document.getElementById('product-list');
                const featuredContainer = document.getElementById('featured-products');

                const createCard = (p, index, context) => {
                    const isFav = this.favorites.some(fid => fid == p.id);
                    // Sale Logic
                    const isSale = p.originalPrice && p.originalPrice > p.price;
                    const savings = isSale ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
                    
                    return `
                <div class="product-card" style="animation-delay: ${index * 100}ms">
                    ${isSale ? `<div class="sale-badge">-${savings}%</div>` : ''}
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="app.toggleFavorite('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                    <div class="product-img" onclick="app.showProductDetails('${p.id}')" style="cursor: pointer;">
                        <img src="${p.image}" alt="${p.name}">
                    </div>
                    <div class="product-details">
                        <h3 class="product-title" onclick="app.showProductDetails('${p.id}')" style="cursor: pointer;">${p.name}</h3>
                        ${p.variantCount && p.variantCount > 1 ? `<div class="variant-info">${p.variantCount} Varianten verfügbar</div>` : ''}
                        <p class="product-desc">${p.description}</p>
                        <div class="product-price">
                            ${isSale ? `<span class="old-price">${this.formatPrice(p.originalPrice)}</span>` : ''}
                            ${this.formatPrice(p.price)}
                        </div>
                        
                        <div style="margin-bottom: 1rem; display: flex; align-items: center;">
                            <label style="margin-right: 0.5rem; font-size: 0.9rem; color: #666;">Menge:</label>
                            <div style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                                <button onclick="app.adjustQty('${p.id}', '${context}', -1)" style="width: 30px; padding: 0.4rem 0; border-radius: 0; margin: 0; background: #f3f4f6; color: #333;">-</button>
                                <input type="number" id="qty-${p.id}-${context}" value="1" min="1" style="width: 40px; padding: 0.4rem 0; text-align: center; border: none; margin: 0; -moz-appearance: textfield; background: white;">
                                <button onclick="app.adjustQty('${p.id}', '${context}', 1)" style="width: 30px; padding: 0.4rem 0; border-radius: 0; margin: 0; background: #f3f4f6; color: #333;">+</button>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button onclick="app.addToCart('${p.id}', '${context}')" style="padding: 0.75rem 0.2rem; font-size: 0.85rem;">In den Korb</button>
                            <button onclick="app.buyNow('${p.id}', '${context}')" class="secondary" style="padding: 0.75rem 0.2rem; font-size: 0.85rem;">Direkt</button>
                        </div>
                    </div>
                </div>
            `;
                };

                container.innerHTML = list.map((p, i) => createCard(p, i, 'list')).join('');
                // Just show first 2 as featured for demo
                featuredContainer.innerHTML = products.slice(0, 2).map((p, i) => createCard(p, i, 'feat')).join('');
            },

            showProductDetails(id) {
                const p = products.find(x => x.id == id);
                if(!p) return;
                
                this.currentProductId = id;
                this.currentVariantId = p.shopifyVariantId; // Standard-Variante setzen
                
                // SEO: Update Page Title
                document.title = `${p.name} | PRECTO`;

                document.getElementById('detail-img').src = p.image;
                document.getElementById('detail-category').innerText = p.category;
                document.getElementById('detail-title').innerText = p.name;
                
                const isSale = p.originalPrice && p.originalPrice > p.price;
                document.getElementById('detail-price').innerHTML = (isSale ? `<span class="old-price" style="font-size: 1.5rem;">${this.formatPrice(p.originalPrice)}</span> ` : '') + this.formatPrice(p.price);
                
                document.getElementById('detail-desc').innerText = p.description;
                
                // Fav Btn Logic
                const favBtn = document.getElementById('detail-fav-btn');
                const isFav = this.favorites.some(fid => fid == id);
                favBtn.className = `fav-btn ${isFav ? 'active' : ''}`;
                favBtn.onclick = () => {
                    this.toggleFavorite(id);
                    const newFav = this.favorites.some(fid => fid == id);
                    favBtn.className = `fav-btn ${newFav ? 'active' : ''}`;
                };
                
                // Varianten-Auswahl (Dropdown) generieren
                let variantSelector = '';
                if (p.variants && p.variants.length > 1) {
                    variantSelector = `
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: bold; display: block; margin-bottom: 0.5rem;">Variante wählen:</label>
                            <select onchange="app.selectVariant(this.value)" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd; background: #f9fafb;">
                                ${p.variants.map(v => `<option value="${v.id}">${v.title}</option>`).join('')}
                            </select>
                        </div>
                    `;
                }

                // Controls
                const controls = document.querySelector('.detail-controls');
                controls.innerHTML = `
                    ${variantSelector}
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <label style="font-weight: bold;">Menge:</label>
                        <div class="qty-selector" style="background: #f3f4f6; padding: 5px; border-radius: 12px;">
                            <button onclick="app.adjustDetailQty(-1)" style="width: 40px; height: 40px; font-size: 1.2rem;">-</button>
                            <input type="number" id="detail-qty-input" value="1" min="1" style="width: 50px; text-align: center; border: none; background: transparent; font-size: 1.2rem; font-weight: bold; margin: 0;">
                            <button onclick="app.adjustDetailQty(1)" style="width: 40px; height: 40px; font-size: 1.2rem;">+</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button onclick="app.addToCartFromDetail()" class="checkout-btn-large">In den Warenkorb</button>
                        <button onclick="app.buyNowFromDetail()" class="checkout-btn-large secondary">Direkt kaufen</button>
                    </div>
                `;
                
                // Accordion rendern
                const accordionContainer = document.getElementById('detail-accordion-container');
                if (accordionContainer) {
                    accordionContainer.innerHTML = `
                        <div class="detail-accordion">
                            <div class="accordion-item">
                                <button style="display:none;" class="accordion-header" onclick="app.toggleAccordion(this)">
                                    <span>Details & Pflege</span>
                                    <span class="icon">+</span>
                                </button>
                                <div class="accordion-content">
                                    <div class="inner">
                                        <p>Handgefertigt mit höchster Präzision. Jedes Stück ist ein Unikat.</p>
                                        <ul style="padding-left: 1rem; margin: 0.5rem 0; color: #666;">
                                            <li>Premium Materialien</li>
                                            <li>Langlebige Verarbeitung</li>
                                            <li>Bitte Pflegehinweise auf dem Etikett beachten</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="accordion-item">
                                <button class="accordion-header" onclick="app.toggleAccordion(this)">
                                    <span>Versand & Lieferung</span>
                                    <span class="icon">+</span>
                                </button>
                                <div class="accordion-content">
                                    <div class="inner">
                                        <p>Standardversand: 2-4 Werktage.<br>Kostenloser Versand ab 100€.<br>Wir versenden klimaneutral in recycelter Verpackung.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                this.navigate('product-detail');
            },

            selectVariant(variantId) {
                this.currentVariantId = variantId;
                const p = products.find(x => x.id == this.currentProductId);
                const variant = p.variants.find(v => v.id == variantId);
                
                if (variant) {
                    // Preis aktualisieren
                    const isSale = variant.compareAtPrice && parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);
                    document.getElementById('detail-price').innerHTML = (isSale ? `<span class="old-price" style="font-size: 1.5rem;">${this.formatPrice(variant.compareAtPrice.amount)}</span> ` : '') + this.formatPrice(variant.price.amount);
                    
                    // Bild aktualisieren (falls Variante ein eigenes Bild hat)
                    if (variant.image) document.getElementById('detail-img').src = variant.image.src;
                }
            },

            toggleAccordion(btn) {
                const item = btn.parentElement;
                const content = item.querySelector('.accordion-content');
                const icon = btn.querySelector('.icon');
                
                // Close others (Accordion behavior)
                document.querySelectorAll('.accordion-item.active').forEach(el => {
                    if(el !== item) {
                        el.classList.remove('active');
                        el.querySelector('.accordion-content').style.maxHeight = null;
                        el.querySelector('.icon').innerText = '+';
                    }
                });

                if (item.classList.contains('active')) {
                    item.classList.remove('active');
                    content.style.maxHeight = null;
                    icon.innerText = '+';
                } else {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";
                    icon.innerText = '−';
                }
            },

            toggleFavorite(id) {
                const index = this.favorites.findIndex(fid => fid == id);
                if (index === -1) {
                    this.favorites.push(id);
                    this.showToast("Zu Favoriten hinzugefügt.");
                } else {
                    this.favorites.splice(index, 1);
                    this.showToast("Aus Favoriten entfernt.");
                }
                localStorage.setItem('shopFavorites', JSON.stringify(this.favorites));
                this.applyFilters(); // Re-render to update icons
            },

            adjustQty(id, context, delta) {
                const input = document.getElementById(`qty-${id}-${context}`);
                if (input) {
                    let val = parseInt(input.value) + delta;
                    if (val < 1) val = 1;
                    input.value = val;
                }
            },

            adjustDetailQty(delta) {
                const input = document.getElementById('detail-qty-input');
                if(input) {
                    let val = parseInt(input.value) + delta;
                    if(val < 1) val = 1;
                    input.value = val;
                }
            },

            addToCartFromDetail() {
                const qty = parseInt(document.getElementById('detail-qty-input').value) || 1;
                this.addToCart(this.currentProductId, null, qty, this.currentVariantId);
            },

            buyNowFromDetail() {
                this.addToCartFromDetail();
                this.checkout();
            },

            addToCart(id, context = 'list', explicitQty = null, selectedVariantId = null) {
                const product = products.find(p => p.id == id);
                if (!product) return;

                // Variante bestimmen (entweder ausgewählt oder Standard)
                let variantId = selectedVariantId || product.shopifyVariantId;
                let name = product.name;
                let price = product.price;
                let image = product.image;

                if (product.variants) {
                    const v = product.variants.find(v => v.id == variantId);
                    if (v) {
                        price = parseFloat(v.price.amount);
                        if (v.title !== 'Default Title') name = `${product.name} - ${v.title}`;
                        if (v.image) image = v.image.src;
                    }
                }

                // Prüfen ob diese spezifische Variante schon im Korb ist
                const existing = this.cart.find(item => item.id == variantId);

                let qty = explicitQty;
                if (qty === null) {
                    const qtyInput = document.getElementById(`qty-${id}-${context}`);
                    qty = qtyInput ? parseInt(qtyInput.value) : 1;
                }
                if (isNaN(qty) || qty < 1) qty = 1;

                if (existing) {
                    existing.qty += qty;
                } else {
                    this.cart.push({
                        ...product,
                        id: variantId, // WICHTIG: Cart Item ID ist jetzt die Variant ID
                        productId: product.id,
                        name: name,
                        price: price,
                        image: image,
                        shopifyVariantId: variantId,
                        qty: qty,
                        variants: undefined // Varianten-Liste nicht im Korb speichern
                    });
                }

                this.saveCart();
                this.updateCartUI();
                this.showToast(`${qty}x ${name} in den Warenkorb gelegt.`);

                // Cart Icon Animation
                const cartIcon = document.querySelector('.cart-icon');
                cartIcon.classList.remove('cart-bump');
                void cartIcon.offsetWidth; // Trigger reflow
                cartIcon.classList.add('cart-bump');
            },

            buyNow(id, context = 'list') {
                this.addToCart(id, context);
                this.checkout();
            },

            updateCartQty(id, delta) {
                const item = this.cart.find(i => i.id == id);
                if (item) {
                    item.qty += delta;
                    if (item.qty < 1) item.qty = 1;
                    this.saveCart();
                    this.updateCartUI();
                }
            },

            removeFromCart(id) {
                this.cart = this.cart.filter(item => item.id != id);
                this.saveCart();
                this.updateCartUI();
            },

            applyDiscount() {
                const input = document.getElementById('discount-code');
                const code = input.value.trim().toUpperCase();
                
                if (discountCodes[code]) {
                    this.discount = { code: code, ...discountCodes[code] };
                    this.showToast(`Gutschein ${code} angewendet! 🎉`);
                    input.value = '';
                    this.updateCartUI();
                } else {
                    this.showToast("Ungültiger Gutscheincode", "error");
                    this.discount = null;
                }
            },

            updateCartUI() {
                const cartItemsContainer = document.getElementById('cart-items-container');
                const cartSummaryContainer = document.getElementById('cart-summary-container');
                const countBadge = document.getElementById('cart-count');
                const mobileCountBadge = document.getElementById('mobile-cart-count');
                const subtotalEl = document.getElementById('cart-subtotal');
                const totalEl = document.getElementById('cart-total-display');
                const shippingEl = document.getElementById('cart-shipping');
                const discountRow = document.getElementById('cart-discount-row');
                const discountAmountEl = document.getElementById('cart-discount-amount');
                const taxEl = document.getElementById('cart-tax');
                const countrySelect = document.getElementById('cart-country');

                // Update Count
                const totalQty = this.cart.reduce((sum, item) => sum + item.qty, 0);
                countBadge.innerText = totalQty;
                countBadge.style.display = totalQty > 0 ? 'block' : 'none';
                
                if (mobileCountBadge) {
                    mobileCountBadge.innerText = totalQty;
                    mobileCountBadge.style.display = totalQty > 0 ? 'block' : 'none';
                }

                // Empty State
                if (this.cart.length === 0) {
                    // Vorschläge generieren (erste 3 Produkte)
                    const suggestions = products.slice(0, 3).map(p => `
                        <div class="product-card" style="border: 1px solid #eee; box-shadow: none; animation: none; opacity: 1;">
                            <div class="product-img" style="height: 150px;" onclick="app.showProductDetails('${p.id}')">
                                <img src="${p.image}" alt="${p.name}">
                            </div>
                            <div class="product-details" style="padding: 1rem;">
                                <h4 style="margin: 0 0 0.5rem; font-size: 1rem;">${p.name}</h4>
                                <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 0.5rem;">${this.formatPrice(p.price)}</div>
                                <button onclick="app.addToCart('${p.id}')" style="font-size: 0.8rem; padding: 0.5rem;">Hinzufügen</button>
                            </div>
                        </div>
                    `).join('');

                    cartItemsContainer.innerHTML = `
                        <div class="cart-empty-state">
                            <div class="cart-empty-icon">️</div>
                            <h3>Ihr Warenkorb ist leer</h3>
                            <p style="color: #666; margin-bottom: 1.5rem;">Sieht aus, als hätten Sie noch keine Produkte gefunden.</p>
                            <button onclick="app.navigate('shop')">Jetzt stöbern</button>
                        </div>
                        <div class="cart-suggestions">
                            <h3 style="color: #666; font-size: 1.2rem; margin-bottom: 1.5rem;">Vielleicht interessiert Sie das:</h3>
                            <div class="product-grid">
                                ${suggestions}
                            </div>
                        </div>
                    `;
                    if(cartSummaryContainer) cartSummaryContainer.style.display = 'none';
                    cartItemsContainer.style.gridColumn = '1 / -1';
                    return;
                }

                if(cartSummaryContainer) cartSummaryContainer.style.display = 'block';
                cartItemsContainer.style.gridColumn = 'auto';

                let total = 0;
                cartItemsContainer.innerHTML = this.cart.map(item => {
                    const itemTotal = item.price * item.qty;
                    total += itemTotal;
                    return `
                    <div class="cart-item">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px;">
                            <div>
                                <strong style="font-size: 1.1rem;">${item.name}</strong><br>
                                <small style="color: #666;">${this.formatPrice(item.price)} / Stück</small>
                            </div>
                        </div>
                        <div class="cart-controls">
                            <div class="qty-selector">
                                <button onclick="app.updateCartQty('${item.id}', -1)">-</button>
                                <span>${item.qty}</span>
                                <button onclick="app.updateCartQty('${item.id}', 1)">+</button>
                            </div>
                            <div class="item-total">
                                <span>${this.formatPrice(itemTotal)}</span>
                            </div>
                            <button class="remove-btn" onclick="app.removeFromCart('${item.id}')" title="Entfernen">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
                }).join('');

                // Update Cart Summary with Shipping
                if (countrySelect) countrySelect.value = this.selectedCountry;
                const shipping = getShippingCost(this.selectedCountry);
                
                // Discount Calculation
                this.cartTotalBeforeDiscount = total; // Für Steuerberechnung speichern
                let discountVal = 0;
                if (this.discount) {
                    if (this.discount.type === 'percent') {
                        discountVal = total * this.discount.value;
                    } else {
                        discountVal = this.discount.value;
                    }
                    if (discountVal > total) discountVal = total; // Nicht negativ werden
                }
                this.discountAmount = discountVal;

                const totalAfterDiscount = total - discountVal;
                const totalGross = totalAfterDiscount + shipping;
                
                // Steuerberechnung mit globaler Funktion
                let discountRatio = 0;
                if (this.discount && this.cartTotalBeforeDiscount > 0) {
                    discountRatio = this.discountAmount / this.cartTotalBeforeDiscount;
                }
                const taxAmount = calculateTax(this.selectedCountry, this.cart, shipping, discountRatio);

                if (discountRow) discountRow.style.display = discountVal > 0 ? 'flex' : 'none';
                if (discountAmountEl) discountAmountEl.innerText = `-${this.formatPrice(discountVal)}`;

                if(shippingEl) shippingEl.innerText = `${this.formatPrice(shipping)}`;
                if(taxEl) taxEl.innerText = `${this.formatPrice(taxAmount)}`;
                if(subtotalEl) subtotalEl.innerText = `${this.formatPrice(total)}`;
                if(totalEl) totalEl.innerText = `${this.formatPrice(totalGross)}`;
            },

            saveCart() {
                localStorage.setItem('shopCart', JSON.stringify(this.cart));
            },

            // --- WIZARD LOGIC ---
            checkout() {
                if (this.cart.length === 0) {
                    this.showToast("Ihr Warenkorb ist leer!", "error");
                    return;
                }
                
                // Wizard starten (Daten lokal erfassen)
                this.currentStep = 1;
                this.updateWizardUI();
                this.navigate('checkout');

                // Wenn eingeloggt, Daten vorausfüllen
                if (this.customerData) {
                    const c = this.customerData;
                    document.getElementById('input-firstname').value = c.firstName || '';
                    document.getElementById('input-lastname').value = c.lastName || '';
                    document.getElementById('input-email').value = c.email || '';
                    if (c.defaultAddress) {
                        document.getElementById('input-street').value = c.defaultAddress.address1 || '';
                        document.getElementById('input-city').value = c.defaultAddress.city || '';
                        document.getElementById('input-zip').value = c.defaultAddress.zip || '';
                        
                        if (c.defaultAddress.countryCodeV2) {
                            const countryEl = document.getElementById('input-country');
                            if(countryEl) {
                                countryEl.value = c.defaultAddress.countryCodeV2;
                                this.setCountry(c.defaultAddress.countryCodeV2); // Trigger updates (Währung etc.)
                            }
                        }
                    }
                }
            },

            processShopifyCheckout(btnElement = null) {
                // Helper für Button-Status
                const setButtonState = (loading) => {
                    if (!btnElement) return;
                    if (loading) {
                        btnElement.disabled = true;
                        btnElement.dataset.originalText = btnElement.innerHTML;
                        btnElement.innerHTML = '<span class="spinner"></span> Leite zur Zahlung weiter...';
                    } else {
                        btnElement.disabled = false;
                        btnElement.innerHTML = btnElement.dataset.originalText || 'Weiter';
                    }
                };

                if (!this.shopifyClient) {
                    console.error("Shopify Client nicht initialisiert.");
                    console.error("Fehler: Shopify Verbindung fehlt.");
                    return;
                }

                // Validierung: Prüfen ob echte Shopify IDs vorhanden sind (keine Platzhalter)
                const hasInvalidItems = this.cart.some(item => !item.shopifyVariantId || item.shopifyVariantId.includes('REPLACE_ME'));
                if (hasInvalidItems) {
                    console.error("Fehler: Test-Produkte (Platzhalter) im Warenkorb. Bitte echte Shopify Variant IDs eintragen.");
                    alert("Konfigurationsfehler: Bitte prüfen Sie die Browser-Konsole."); // Fallback Feedback
                    return;
                }

                // Daten aus dem lokalen Wizard auslesen
                const emailInput = document.getElementById('input-email');
                const email = emailInput ? emailInput.value : '';
                const address = {
                    firstName: document.getElementById('input-firstname')?.value || '',
                    lastName: document.getElementById('input-lastname')?.value || '',
                    address1: document.getElementById('input-street')?.value || '',
                    city: document.getElementById('input-city')?.value || '',
                    country: document.getElementById('input-country')?.value || 'DE',
                    zip: document.getElementById('input-zip')?.value || ''
                };

                setButtonState(true);
                console.log("Erstelle Warenkorb mit Kundendaten (Cart API)...");

                // 1. Line Items vorbereiten
                const lineItems = this.cart.map(item => ({
                    merchandiseId: item.shopifyVariantId,
                    quantity: parseInt(item.qty)
                }));

                const domain = shopifyConfig.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
                const apiUrl = `https://${domain}/api/${shopifyConfig.apiVersion || '2024-01'}/graphql.json`;
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': shopifyConfig.storefrontAccessToken
                };

                // Schritt 1: Cart erstellen
                const createQuery = `
                    mutation cartCreate($lines: [CartLineInput!]) {
                        cartCreate(input: { lines: $lines }) {
                            cart {
                                id
                                checkoutUrl
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `;

                this.shopifyFetch(createQuery, { lines: lineItems })
                .then(result => {
                    if (result.errors) throw new Error(result.errors.map(e => e.message).join(' | '));
                    const data = result.data.cartCreate;
                    if (data.userErrors && data.userErrors.length > 0) throw new Error(data.userErrors.map(e => e.message).join(' | '));
                    
                    const cartId = data.cart.id;
                    const checkoutUrl = data.cart.checkoutUrl;

                    // Schritt 2: Adresse & Email setzen
                    const updateQuery = `
                        mutation cartUpdateBuyerIdentity($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
                            cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
                                cart { checkoutUrl }
                                userErrors { field message }
                            }
                        }
                    `;

                    const buyerIdentity = {
                        email: email,
                        deliveryAddressPreferences: [{
                            deliveryAddress: {
                                firstName: address.firstName,
                                lastName: address.lastName,
                                address1: address.address1,
                                city: address.city,
                                country: address.country,
                                zip: address.zip
                            }
                        }]
                    };

                    return this.shopifyFetch(updateQuery, { cartId, buyerIdentity })
                        .then(updateResult => {
                            // Auch wenn das Update fehlschlägt (z.B. Validierung), leiten wir zum Checkout weiter
                            if (updateResult.errors) console.warn("Adress-Update Fehler:", updateResult.errors);
                            
                            // Weiterleitung
                            // WICHTIG: Damit der Kunde nach dem Kauf automatisch hierher zurückkehrt,
                            // fügen Sie im Shopify Admin (Einstellungen > Checkout > Bestellstatus-Seite > Zusätzliche Skripte)
                            // folgenden Code ein:
                            // <script>window.location.href = "https://IHRE-DOMAIN.de/?payment=success";</script>
                            window.location.href = checkoutUrl;
                        });
                }).catch(err => {
                    console.error("Shopify Error:", err);
                    
                    let errorMsg = err.message || "Unbekannter Fehler";
                    
                    if (errorMsg.includes("doesn't exist on type 'Mutation'") || errorMsg.includes("Access denied")) {
                        errorMsg = "Berechtigungs-Fehler: Bitte aktivieren Sie 'unauthenticated_write_checkouts' in den Shopify App-Einstellungen.";
                    } else if (errorMsg.includes("Access denied")) {
                        errorMsg = "Zugriff verweigert: Token ungültig oder Rechte fehlen.";
                    }

                    console.error(errorMsg);
                    setButtonState(false);
                });
            },

            updateWizardUI() {
                // Steps visibility
                document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
                document.getElementById(`step-${this.currentStep}`).classList.add('active');

                // Progress Bar
                document.getElementById('wizard-progress-bar').style.width = (this.currentStep / 2 * 100) + '%';

                // Buttons
                const backBtn = document.getElementById('btn-back');
                const nextBtn = document.getElementById('btn-next');
                
                backBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
                
                if (this.currentStep === 2) {
                    nextBtn.innerHTML = 'Weiter zur Zahlung ➔';
                    this.renderCheckoutSummary();
                } else {
                    nextBtn.innerHTML = 'Weiter ➔';
                }
            },

            nextStep() {
                if (this.currentStep === 1) {
                    // Validate Step 1
                    const form = document.getElementById('checkout-form-step1');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                }

                if (this.currentStep < 2) {
                    this.currentStep++;
                    this.updateWizardUI();
                } else {
                    this.placeOrder();
                }
            },

            prevStep() {
                if (this.currentStep > 1) {
                    this.currentStep--;
                    this.updateWizardUI();
                }
            },

            renderCheckoutSummary() {
                const summary = document.getElementById('checkout-summary-wizard');
                const totalEl = document.getElementById('checkout-total-wizard');
                const countrySelect = document.getElementById('input-country');
                
                let total = 0;
                let subtotal = 0;
                
                // 1. Zuerst Zwischensumme berechnen (FIX für Preis-Bug)
                let itemsHtml = this.cart.map(item => {
                    const sum = item.price * item.qty;
                    subtotal += sum;
                    return `<div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; color:#555; font-size: 1.1rem; border-bottom: 1px dashed #ddd; padding-bottom: 0.5rem;">
                        <span><strong>${item.qty}x</strong> ${item.name}</span>
                        <span><strong>${this.formatPrice(sum)}</strong></span>
                    </div>`;
                }).join('');

                // Versandkosten berechnen
                const country = countrySelect ? countrySelect.value : 'DE';
                const shipping = getShippingCost(country);
                const shippingLabel = `Versand (${country})`;
                
                // Discount Logic for Wizard
                let discountVal = 0;
                if (this.discount) {
                    if (this.discount.type === 'percent') {
                        discountVal = subtotal * this.discount.value;
                    } else {
                        discountVal = this.discount.value;
                    }
                    if (discountVal > subtotal) discountVal = subtotal;
                }
                const totalAfterDiscount = subtotal - discountVal;
                const totalGross = totalAfterDiscount + shipping;

                // Steuer neu berechnen (mit Kontext aus Cart-Update)
                this.cartTotalBeforeDiscount = subtotal;
                this.discountAmount = discountVal;
                
                let discountRatio = 0;
                if (this.discount && this.cartTotalBeforeDiscount > 0) {
                    discountRatio = this.discountAmount / this.cartTotalBeforeDiscount;
                }
                const taxAmount = calculateTax(country, this.cart, shipping, discountRatio);

                summary.innerHTML = itemsHtml + `
                    <div style="display:flex; justify-content:space-between; margin-top:1rem; padding-top:0.5rem; color:#444; font-weight:500;">
                        <span>Zwischensumme</span>
                        <span>${this.formatPrice(subtotal)}</span>
                    </div>
                    ${discountVal > 0 ? `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:var(--accent-color); font-weight:bold;">
                        <span>Rabatt (${this.discount.code})</span>
                        <span>-${this.formatPrice(discountVal)}</span>
                    </div>` : ''}
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#444; font-weight:500;">
                        <span>${shippingLabel}</span>
                        <span>${this.formatPrice(shipping)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#666; font-size: 0.9rem;">
                        <span>Enth. MwSt.</span>
                        <span>${this.formatPrice(taxAmount)}</span>
                    </div>
                `;

                totalEl.innerText = `Gesamt: ${this.formatPrice(totalGross)}`;
            },

            placeOrder() {
                const btn = document.getElementById('btn-next');
                // Echten Shopify Checkout starten (mit Daten aus Wizard)
                this.processShopifyCheckout(btn);
            },

            downloadInvoice() {
                if (!this.lastOrder) {
                    this.showToast("Keine Rechnungsdaten verfügbar.", "error");
                    return;
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const o = this.lastOrder;
                
                // Logo Image Element (aus dem DOM)
                const logoImg = document.querySelector('.logo img');

                // Farben definieren
                const primaryColor = [74, 4, 78]; // #4a044e
                const accentColor = [219, 39, 119]; // #db2777

                // --- Header ---
                // Hintergrundbalken
                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, 210, 40, 'F');

                // Logo einfügen (falls geladen)
                if (logoImg && logoImg.complete && logoImg.naturalHeight !== 0) {
                    try {
                        doc.addImage(logoImg, 'JPEG', 15, 5, 30, 30);
                    } catch (e) {
                        console.warn("Logo konnte nicht ins PDF eingefügt werden:", e);
                    }
                }

                // Titel
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.text("RECHNUNG", 150, 28);

                // --- Info Sektion ---
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");

                let y = 60;
                
                // Links: Firmenadresse
                doc.setFont("helvetica", "bold");
                doc.text("PRECTO", 15, y); y += 5;
                doc.setFont("helvetica", "normal");
                doc.text("Inh. Sebastian Roth", 15, y); y += 5;
                doc.text("Hauptstraße 10", 15, y); y += 5;
                doc.text("73730 Esslingen am Neckar", 15, y); y += 5;
                doc.text("Deutschland", 15, y); y += 5;
                doc.text("info@precto.de", 15, y);

                // Rechts: Bestelldaten
                y = 60;
                const rightColX = 130;
                doc.text("Bestellnummer:", rightColX, y); 
                doc.text(o.id, rightColX + 35, y); y += 6;
                
                doc.text("Datum:", rightColX, y); 
                doc.text(o.date, rightColX + 35, y); y += 6;
                
                // --- Artikel Tabelle ---
                y = 95;
                
                // Tabellenkopf
                doc.setFillColor(240, 240, 240);
                doc.rect(15, y - 8, 180, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.text("Artikel", 20, 45);
                doc.text("Preis", 160, 45);
                doc.text("Artikel", 20, y);
                doc.text("Menge", 110, y);
                doc.text("Einzelpreis", 135, y);
                doc.text("Gesamt", 170, y);
                
                y += 10;
                doc.setFont("helvetica", "normal");

                o.items.forEach((item, i) => {
                    const itemTotal = item.price * item.qty;
                    
                    // Zebra-Streifen
                    if (i % 2 === 1) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(15, y - 6, 180, 8, 'F');
                    }

                    doc.text(item.name, 20, y);
                    doc.text(String(item.qty), 115, y);
                    doc.text(this.formatPrice(item.price), 135, y);
                    doc.text(this.formatPrice(itemTotal), 170, y);
                    
                    y += 8;
                });

                // Trennlinie
                doc.setDrawColor(200, 200, 200);
                doc.line(20, y, 190, y);
                y += 10;

                // --- Summen ---
                const totalsX = 130;
                const valuesX = 170;

                doc.text("Zwischensumme:", totalsX, y);
                doc.text(this.formatPrice(o.subtotal), valuesX, y);
                y += 6;

                if (o.discountVal > 0) {
                    doc.setTextColor(...accentColor);
                    doc.text("Rabatt:", totalsX, y);
                    doc.text(`-${this.formatPrice(o.discountVal)}`, valuesX, y);
                    doc.setTextColor(0, 0, 0);
                    y += 6;
                }

                doc.text("Versand:", totalsX, y);
                doc.text(this.formatPrice(o.shipping), valuesX, y);
                y += 10;

                // Gesamtbetrag Box
                doc.setFillColor(...primaryColor);
                doc.rect(totalsX - 5, y - 7, 70, 12, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.text("Gesamtbetrag:", totalsX, y);
                doc.text(this.formatPrice(o.total), valuesX, y);

                // --- Footer ---
                doc.setTextColor(128, 128, 128);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                const pageHeight = doc.internal.pageSize.height;
                doc.text("Vielen Dank für deinen Einkauf!", 105, pageHeight - 20, { align: "center" });
                doc.text("PRECTO - www.precto.de", 105, pageHeight - 15, { align: "center" });

                doc.save(`Rechnung_${o.id}.pdf`);
            },

            trackOrder() {
                if (!this.lastOrderId) {
                    this.showToast("Keine aktuelle Bestellung gefunden.", "error");
                    return;
                }

                if (this.trackingInterval) clearInterval(this.trackingInterval);
                
                document.getElementById('tracking-order-id').innerText = this.lastOrderId;
                this.navigate('tracking');

                // Simuliere Fortschritt
                const timeline = document.querySelector('.tracking-timeline');
                const steps = [
                    { title: "Bestellung eingegangen", desc: "Wir haben Ihre Bestellung erhalten.", icon: "✅" },
                    { title: "Wird bearbeitet", desc: "Ihre Bestellung wird für den Versand vorbereitet.", icon: "📦" },
                    { title: "Versandt", desc: "Das Paket ist auf dem Weg zu Ihnen.", icon: "🚚" },
                    { title: "In Zustellung", desc: "Das Paket wird Ihnen in Kürze zugestellt.", icon: "🏠" }
                ];

                let currentStepIndex = 0;

                const renderTimeline = () => {
                    timeline.innerHTML = steps.map((step, index) => {
                        const isActive = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        return `
                        <div class="timeline-item ${isActive ? 'active' : ''} ${isCurrent ? 'pulse' : ''}">
                            <div class="timeline-icon">${step.icon}</div>
                            <div class="timeline-content">
                                <strong>${step.title}</strong>
                                <small>${step.desc}</small>
                            </div>
                        </div>`;
                    }).join('');
                };

                renderTimeline();

                // Automatisches Update alle 3 Sekunden
                this.trackingInterval = setInterval(() => {
                    currentStepIndex++;
                    if (currentStepIndex >= steps.length) {
                        clearInterval(this.trackingInterval);
                        this.showToast("Ihre Bestellung wurde zugestellt! 📦", "success");
                        runConfetti();
                    }
                    renderTimeline();
                }, 3000);
            },

            showToast(message, type = 'success') {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.innerHTML = `
                    <span style="display: flex; align-items: center;">
                        ${type === 'error' 
                            ? '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" style="color: #ef4444"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' 
                            : '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" style="color: #10b981"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'}
                    </span>
                    <span>${message}</span>
                `;

                container.appendChild(toast);

                setTimeout(() => {
                    toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            },

            async recoverCustomerPassword(event) {
                event.preventDefault();
                const form = event.target;
                const btn = form.querySelector('button[type="submit"]');
                if(btn) { btn.disabled = true; btn.innerText = "Sende..."; }
                
                const email = form.email.value;
                
                const query = `
                    mutation customerRecover($email: String!) {
                        customerRecover(email: $email) {
                            customerUserErrors { code field message }
                        }
                    }
                `;

                try {
                    const result = await this.shopifyFetch(query, { email });
                    
                    if (result.errors) throw new Error(result.errors.map(e => e.message).join(', '));
                    
                    const data = result.data?.customerRecover;
                    // Shopify gibt bei customerRecover oft keine Fehler zurück (Security), auch wenn Email nicht existiert.
                    // Wenn customerUserErrors leer ist, war es erfolgreich.
                    if (data?.customerUserErrors?.length > 0) {
                        this.showToast(data.customerUserErrors[0].message, 'error');
                    } else {
                        this.showToast('Falls ein Konto existiert, wurde eine E-Mail gesendet.');
                        this.toggleAuthMode('login');
                        form.reset();
                    }
                } catch (err) {
                    console.error(err);
                    this.showToast('Fehler beim Senden der Anfrage', 'error');
                } finally {
                    if(btn) { btn.disabled = false; btn.innerText = "E-Mail senden"; }
                }
            },

            togglePasswordVisibility(inputId) {
                const input = document.getElementById(inputId);
                if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                }
            }
        };

        // --- CONFETTI LOGIC ---
        function runConfetti() {
            // Confetti disabled for minimalist professional design
        }

        // Start App
        window.onload = () => window.app.init();