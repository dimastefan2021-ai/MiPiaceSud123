(function ($) {
    "use strict";
    // Gestionarea spinnerului de încărcare
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    new WOW().init();
    $('.fixed-top').css('top', 0);
    $(window).scroll(function () {
        let scrollPos = $(document).scrollTop();
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            if (scrollPos < 400) {
                $('.navbar-nav .nav-link').removeClass('active');
                $('.navbar-nav .nav-link[href="index.html"]').addClass('active');
            }
            let despreSection = $('#despre-section');
            if (despreSection.length > 0) {
                let despreTop = despreSection.offset().top - 150;
                let despreBottom = despreTop + despreSection.outerHeight();

                if (scrollPos >= despreTop && scrollPos < despreBottom) {
                    $('.navbar-nav .nav-link').removeClass('active');
                    $('.navbar-nav .nav-link[href="index.html#despre-section"]').addClass('active');
                }
            }
            let menuSection = $('#menu-section');
            if (menuSection.length > 0) {
                let menuTop = menuSection.offset().top - 150;
                let menuBottom = menuTop + menuSection.outerHeight();

                if (scrollPos >= menuTop && scrollPos < menuBottom) {
                    $('.navbar-nav .nav-link').removeClass('active');
                    $('.navbar-nav .nav-link[href="index.html#menu-section"]').addClass('active');
                }
            }
        }
    });
    window.siteSettingsData = null;
    window.applySiteSettings = function() {
        var data = window.siteSettingsData;
        if (!data) return;
        var lang = window.currentLang || 'ro';
        
        function getVal(field) {
            var val = data[field + '_' + lang] || data[field];
            return val || '';
        }
        
        if (data.slide1Title || data.slide1Title_ru) $('#heroSlide1Title').text(getVal('slide1Title'));
        if (data.slide1Desc || data.slide1Desc_ru) $('#heroSlide1Desc').text(getVal('slide1Desc'));
        if (data.slide2Title || data.slide2Title_ru) $('#heroSlide2Title').text(getVal('slide2Title'));
        if (data.slide2Desc || data.slide2Desc_ru) $('#heroSlide2Desc').text(getVal('slide2Desc'));
        
        if (data.aboutSub || data.aboutSub_ru) $('#aboutSectionSub').text(getVal('aboutSub'));
        if (data.aboutTitle || data.aboutTitle_ru) $('#aboutSectionTitle').text(getVal('aboutTitle'));
        if (data.aboutText1 || data.aboutText1_ru) $('#aboutSectionText1').text(getVal('aboutText1'));
        if (data.aboutText2 || data.aboutText2_ru) $('#aboutSectionText2').text(getVal('aboutText2'));
    };

    if (typeof db !== 'undefined') {
        db.collection('setari').doc('pagina_principala').get().then(function(doc) {
            if (doc.exists) {
                window.siteSettingsData = doc.data();
                window.applySiteSettings();
            }
            initCarousel();
        }).catch(function(err) {
            console.error("Error loading content settings:", err);
            initCarousel();
        });
    } else {
        initCarousel();
    }

    function initCarousel() {
        $(".header-carousel").owlCarousel({
            autoplay: true,
            autoplayTimeout: 8000,
            autoplayHoverPause: true,
            smartSpeed: 1000,
            fluidSpeed: 800,
            loop: true,
            nav: true,
            dots: false,
            items: 1,
            slideTransition: 'ease-in-out',
            navText: [
                '<i class="fas fa-angle-left"></i>',
                '<i class="fas fa-angle-right"></i>'
            ]
        });
    }
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });
    $(".testimonial-carousel").owlCarousel({
        autoplay: false,
        smartSpeed: 1000,
        margin: 25,
        loop: true,
        center: true,
        dots: false,
        nav: true,
        navText: [
            '<i class="fas fa-angle-left"></i>',
            '<i class="fas fa-angle-right"></i>'
        ],
        responsive: {
            0: {
                items: 1
            },
            768: {
                items: 2
            },
            992: {
                items: 3
            }
        }
    });

    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const src = this.getAttribute('data-bs-image');
            document.getElementById('modalImage').setAttribute('src', src);
        });
    });
    // Configurarea stării inițiale pentru coșul de cumpărături persistent
    let cart = (function () {
        try { return JSON.parse(localStorage.getItem('mipiace_cart') || '[]'); }
        catch (e) { return []; }
    })();

    function saveCartToStorage() {
        try { localStorage.setItem('mipiace_cart', JSON.stringify(cart)); } catch (e) { }
    }

    function updateCartUI() {
        const cartBadge = $('#cartBadge');
        const cartItemsContainer = $('#cartItems');
        const cartTotalEl = $('#cartTotal');

        let totalQty = 0;
        let totalPrice = 0;

        cartItemsContainer.empty();

        cart.forEach((item, index) => {
            totalQty += item.qty;
            totalPrice += item.price * item.qty;
            let displayName = item.name;
            if (typeof dbProducts !== 'undefined' && dbProducts.length > 0) {
                const prod = dbProducts.find(p => p.nume === item.name || p.nume_ro === item.name);
                if (prod) {
                    const currentLang = window.currentLang || 'ro';
                    displayName = prod['nume_' + currentLang] || prod.nume;
                }
            }

            cartItemsContainer.append(`
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h6>${displayName}</h6>
                        <span class="cart-item-price">${item.price} ${window.t('js_lei')} x ${item.qty}</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn dec-btn" data-index="${index}">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn inc-btn" data-index="${index}">+</button>
                    </div>
                </div>
            `);
        });

        if (cartBadge.length) cartBadge.text(totalQty);
        if (cartTotalEl.length) cartTotalEl.text(totalPrice + ' ' + window.t('js_lei'));

        if (cart.length === 0) {
            cartItemsContainer.append(`<p class="text-center text-muted my-4">${window.t('js_cart_empty')}</p>`);
        }
        saveCartToStorage();
    }
    $(document).on('click', '.order-btn', function (e) {
        e.preventDefault();
        e.stopPropagation(); // prevent triggering the product detail modal
        const name = $(this).attr('data-name');
        const price = parseFloat($(this).attr('data-price'));

        if (!name || isNaN(price)) return;

        const existingItem = cart.find(i => i.name === name);
        if (existingItem) {
            existingItem.qty++;
        } else {
            cart.push({ name, price, qty: 1 });
        }

        updateCartUI();
        $('#cartOverlay, #cartSidebar').addClass('show');
    });

    $(document).on('click', '.inc-btn', function () {
        const idx = $(this).data('index');
        cart[idx].qty++;
        updateCartUI();
    });

    $(document).on('click', '.dec-btn', function () {
        const idx = $(this).data('index');
        if (cart[idx].qty > 1) {
            cart[idx].qty--;
        } else {
            cart.splice(idx, 1);
        }
        updateCartUI();
    });

    $('#floatingCartBtn').click(function () {
        $('#cartOverlay, #cartSidebar').addClass('show');
    });

    $('#closeCart, #cartOverlay').click(function () {
        $('#cartOverlay, #cartSidebar').removeClass('show');
    });

    $('#checkoutBtn').click(function () {
        if (cart.length > 0) {
            let totalPrice = 0;
            let summaryHtml = '<div class="checkout-summary-list">';
            cart.forEach(item => {
                const lineTotal = item.price * item.qty;
                totalPrice += lineTotal;
                
                let displayName = item.name;
                if (typeof dbProducts !== 'undefined' && dbProducts.length > 0) {
                    const prod = dbProducts.find(p => p.nume === item.name || p.nume_ro === item.name);
                    if (prod) {
                        const currentLang = window.currentLang || 'ro';
                        displayName = prod['nume_' + currentLang] || prod.nume;
                    }
                }

                summaryHtml += `<div class="checkout-summary-row">
                    <span>${displayName} × ${item.qty}</span>
                    <span class="checkout-summary-price">${lineTotal} ${window.t('js_lei')}</span>
                </div>`;
            });
            summaryHtml += `<div class="checkout-summary-total">
                <span>${window.t('js_total')}</span>
                <span class="checkout-summary-total-price">${totalPrice} ${window.t('js_lei')}</span>
            </div></div>`;
            $('#checkoutSummary').html(summaryHtml);
            $('#checkoutName').val('');
            $('#checkoutPhone').val('');
            $('#checkoutAddress').val('');
            $('#checkoutNotes').val('');
            $('#checkoutError').hide();
            $('#cartOverlay, #cartSidebar').removeClass('show');
            $('#checkoutModal').fadeIn(250);
        } else {
            alert(window.t('js_cart_need_products'));
        }
    });

    // Trimite detaliile comenzii finalizate în baza de date Firestore
    $('#checkoutForm').submit(async function (e) {
        e.preventDefault();

        const name = $('#checkoutName').val().trim();
        const phone = $('#checkoutPhone').val().trim();
        const address = $('#checkoutAddress').val().trim();
        const notes = $('#checkoutNotes').val().trim();
        const submitBtn = $('#checkoutSubmitBtn');
        const errorDiv = $('#checkoutError');

        if (!name || !phone) {
            errorDiv.text(window.t('js_order_validation')).fadeIn();
            return;
        }

        submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i> ' + window.t('js_sending'));
        errorDiv.hide();
        let totalPrice = 0;
        const orderItems = cart.map(item => {
            totalPrice += item.price * item.qty;
            return {
                nume: item.name,
                pret: item.price,
                cantitate: item.qty,
                subtotal: item.price * item.qty
            };
        });

        const orderData = {
            client: {
                nume: name,
                telefon: phone,
                adresa: address || '',
                observatii: notes || ''
            },
            produse: orderItems,
            total: totalPrice,
            status: 'nouă',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('comenzi').add(orderData);
            closeInlineModal('checkoutModal');
            cart = [];
            updateCartUI();
            alert(window.t('js_order_success_prefix') + phone + window.t('js_order_success_suffix'));
        } catch (err) {
            console.error('Error placing order:', err);
            errorDiv.text(window.t('js_order_error')).fadeIn();
        } finally {
            submitBtn.prop('disabled', false).html('<i class="fas fa-paper-plane me-2"></i> ' + window.t('checkout_submit'));
        }
    });

    // Golește coșul de cumpărături când se apasă butonul de curățare
    $('#clearCartBtn').click(function () {
        if (cart.length > 0) {
            if (confirm(window.t('js_confirm_clear_cart'))) {
                cart = [];
                updateCartUI();
            }
        }
    });
    
    // Variabile de stare ale componentelor pentru cache-ul inventarului și starea de admin
    let dbProducts = []; // Stochează produsele preluate din Firestore
    let visibleCount = 20;
    const loadIncrement = 9999; // "Vezi totul" afișează toate produsele deodată
    let currentCategory = 'toate';
    let isAdminLoggedIn = false; // Starea de conectare a adminului
    
    // Funcție utilitară globală pentru închiderea modalelor inline
    window.closeInlineModal = function (modalId) {
        $(`#${modalId}`).fadeOut(200);
    };

    // Configuresază persistența stării de autentificare a administratorului
    if (typeof auth !== 'undefined') {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch(err => {
                console.warn("Could not set LOCAL persistence, trying SESSION...", err);
                return auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            })
            .catch(err => {
                console.warn("Could not set SESSION persistence, using NONE...", err);
                return auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
            });
    }

    let ordersCheckInterval = null;

    // Verifică comenzile noi în Firestore și actualizează numărul din insigna administratorului
    async function checkNewOrdersBadge() {
        if (!isAdminLoggedIn || typeof db === 'undefined') return;
        try {
            const snapshot = await db.collection('comenzi').where('status', '==', 'nouă').get();
            const count = snapshot.size;
            const badge = $('#inlineOrdersBadgeCount');
            if (count > 0) {
                badge.text(count).fadeIn(200);
            } else {
                badge.fadeOut(200);
            }
        } catch (err) {
            console.error('Error checking orders badge:', err);
        }
    }

    // Pornește verificarea periodică pentru comenzi noi
    function startCheckingOrders() {
        checkNewOrdersBadge();
        ordersCheckInterval = setInterval(checkNewOrdersBadge, 20000);
    }

    // Oprește verificarea periodică pentru comenzi noi
    function stopCheckingOrders() {
        if (ordersCheckInterval) {
            clearInterval(ordersCheckInterval);
            ordersCheckInterval = null;
        }
        $('#inlineOrdersBadgeCount').hide();
    }

    // Observator pentru schimbarea stării de autentificare, folosit pentru a afișa/ascunde panourile de administrare
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => {
            if (user) {
                isAdminLoggedIn = true;
                $('body').addClass('admin-logged-in');
                $('#adminUserEmail').text(user.email);
                $('#adminStatusBar').fadeIn(300);
                $('#adminLoginBtn i').removeClass('fa-lock').addClass('fa-user-shield');
                startCheckingOrders();
            } else {
                isAdminLoggedIn = false;
                $('body').removeClass('admin-logged-in');
                $('#adminStatusBar').fadeOut(200);
                $('#adminLoginBtn i').removeClass('fa-user-shield').addClass('fa-lock');
                stopCheckingOrders();
            }
            fetchProducts();
        });
    }

    $('#adminLoginBtn').click(function (e) {
        e.preventDefault();
        if (isAdminLoggedIn) {
            $('html, body').animate({ scrollTop: $('#menu-section').offset().top - 100 }, 500);
        } else {
            $('#inlineLoginError').hide();
            $('#inlineEmail').val('');
            $('#inlinePassword').val('');
            $('#adminLoginModal').fadeIn(250);
        }
    });

    function getOrderStatusLabel(status) {
        switch (status) {
            case 'nouă': return window.t('orders_status_new');
            case 'în pregătire': return window.t('orders_status_preparing');
            case 'finalizată': return window.t('orders_status_done');
            case 'anulată': return window.t('orders_status_cancelled');
            default: return status;
        }
    }
    $('#inlineLoginForm').submit(async function (e) {
        e.preventDefault();
        const email = $('#inlineEmail').val().trim();
        const password = $('#inlinePassword').val();
        const submitBtn = $('#inlineLoginSubmitBtn');
        const errorDiv = $('#inlineLoginError');

        submitBtn.prop('disabled', true).text(window.t('js_loading_connecting'));
        errorDiv.hide();

        try {
            await auth.signInWithEmailAndPassword(email, password);
            closeInlineModal('adminLoginModal');
        } catch (err) {
            console.error('Login error:', err);
            errorDiv.text(window.t('js_error_prefix') + err.message).fadeIn();
            alert(window.t('dash_js_login_generic') + ': ' + err.message); // Direct screen alert for diagnostics
        } finally {
            submitBtn.prop('disabled', false).text(window.t('admin_login_btn'));
        }
    });
    let inlineOrders = [];
    const CANCELLED_ORDER_VISIBLE_MS = 30000;
    const COMPLETED_ORDER_VISIBLE_MS = 10 * 60 * 1000;

    function getInlineOrderDate(value) {
        if (!value) return null;
        const date = value.toDate ? value.toDate() : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatInlineOrderRemaining(ms) {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    function getInlineCompletedOrderDate(order) {
        const completedDate = getInlineOrderDate(order.completedAt || order.completedAtClient);
        if (completedDate) return completedDate;

        return getInlineOrderDate(order.createdAt);
    }

    function isInlineOrderVisible(order, now = new Date()) {
        if (order.status === 'anulată') {
            const cancelledDate = getInlineOrderDate(order.cancelledAt || order.cancelledAtClient);
            return cancelledDate ? now - cancelledDate < CANCELLED_ORDER_VISIBLE_MS : false;
        }

        if (order.status === 'finalizată') {
            const completedDate = getInlineCompletedOrderDate(order);
            return completedDate ? now - completedDate < COMPLETED_ORDER_VISIBLE_MS : false;
        }

        return true;
    }

    function scheduleInlineCancelledOrderRemoval() {
        setTimeout(() => {
            if ($('#inlineOrdersModal').is(':visible')) {
                renderInlineOrders();
            }
        }, CANCELLED_ORDER_VISIBLE_MS);
    }
    $('#inlineRefreshOrdersBtn').click(function () {
        fetchInlineOrders();
    });
    $('#inlineFilterOrderStatus').change(function () {
        renderInlineOrders();
    });
    // Preluarea listei de comenzi ale restaurantului din Firestore
    async function fetchInlineOrders() {
        const container = $('#inlineOrdersContainer');
        container.html(`
            <div class="inline-loading-state">
                <i class="fas fa-spinner fa-spin fa-2x mb-3 inline-loading-icon"></i>
                <p>${window.t('js_loading_orders_inline')}</p>
            </div>
        `);

        try {
            const snapshot = await db.collection('comenzi').orderBy('createdAt', 'desc').get();
            inlineOrders = [];
            snapshot.forEach(doc => {
                inlineOrders.push({ id: doc.id, ...doc.data() });
            });
            renderInlineOrders();
            checkNewOrdersBadge(); // Update floating button badge count too
        } catch (err) {
            console.error('Error fetching inline orders:', err);
            container.html(`<p class="inline-error-message">${window.t('js_error_order_prefix')}${err.message}</p>`);
        }
    }
    function escapeHtml(str) {
        return $('<div>').text(str).html();
    }
    function renderInlineOrders() {
        const filterStatus = $('#inlineFilterOrderStatus').val();
        const container = $('#inlineOrdersContainer');
        const now = new Date();
        let filtered = inlineOrders.filter(order => isInlineOrderVisible(order, now));

        if (filterStatus !== 'toate') {
            filtered = filtered.filter(o => o.status === filterStatus);
        }

        if (filtered.length === 0) {
            container.html(`
                <div class="inline-loading-state">
                    <i class="fas fa-clipboard-check fa-3x mb-3 opacity-25"></i>
                    <h4>${window.t('js_no_orders_found')}</h4>
                    <p>${window.t('js_no_orders_status')}</p>
                </div>
            `);
            return;
        }

        let html = '<div class="inline-orders-list">';
        filtered.forEach(order => {
            const currentLang = (localStorage.getItem('mipiace_lang') || 'ro') === 'ro' ? 'ro-RO' : 'ru-RU';
            const date = order.createdAt ? order.createdAt.toDate().toLocaleString(currentLang) : window.t('js_date_unknown');

            const itemsHtml = order.produse.map(p => `
                <div class="inline-order-item-row">
                    <span>${escapeHtml(p.nume)} × ${p.cantitate}</span>
                    <span class="inline-order-item-price">${p.subtotal} ${window.t('js_lei')}</span>
                </div>
            `).join('');

            let actionBtns = '';
            if (order.status === 'nouă') {
                actionBtns = `
                    <button class="inline-order-action-btn inline-order-btn-prepare" onclick="updateInlineOrderStatus('${order.id}', 'în pregătire')">
                        <i class="fas fa-fire"></i> ${window.t('js_order_take')}
                    </button>
                    <button class="inline-order-action-btn inline-order-btn-cancel" onclick="updateInlineOrderStatus('${order.id}', 'anulată')">
                        <i class="fas fa-times"></i> ${window.t('js_order_cancel_action')}
                    </button>
                `;
            } else if (order.status === 'în pregătire') {
                actionBtns = `
                    <button class="inline-order-action-btn inline-order-btn-complete" onclick="updateInlineOrderStatus('${order.id}', 'finalizată')">
                        <i class="fas fa-check"></i> ${window.t('js_order_complete')}
                    </button>
                `;
            }
            let statusBadgeText = getOrderStatusLabel(order.status);
            if (order.status === 'anulată') {
                const cancelledTime = getInlineOrderDate(order.cancelledAt || order.cancelledAtClient);
                const secondsPassed = Math.floor((now - cancelledTime) / 1000);
                const remaining = Math.max(0, 30 - secondsPassed);
                statusBadgeText = `${getOrderStatusLabel('anulată')} (${remaining}s)`;
            }
            if (order.status === 'finalizată') {
                const completedTime = getInlineCompletedOrderDate(order);
                const remaining = COMPLETED_ORDER_VISIBLE_MS - (now - completedTime);
                statusBadgeText = `${getOrderStatusLabel('finalizată')} (${formatInlineOrderRemaining(remaining)})`;
            }

            html += `
                <div class="inline-order-card">
                    <div class="inline-order-card-header">
                        <span class="inline-order-id">#${order.id.substring(0, 8).toUpperCase()}</span>
                        <span class="inline-order-date"><i class="far fa-clock me-1"></i> ${date}</span>
                        <span class="inline-order-status ${order.status.replace(' ', '-')}">${statusBadgeText}</span>
                    </div>
                    <div class="inline-order-card-body">
                        <div class="inline-order-client-info">
                            <h4>${window.t('js_order_client')}</h4>
                            <p><i class="fas fa-user"></i> ${escapeHtml(order.client.nume)}</p>
                            <p><i class="fas fa-phone"></i> <a href="tel:${escapeHtml(order.client.telefon)}" class="inline-order-link">${escapeHtml(order.client.telefon)}</a></p>
                            ${order.client.adresa ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(order.client.adresa)}</p>` : ''}
                            ${order.client.observatii ? `<p class="inline-order-note"><i class="fas fa-comment-dots"></i> "${escapeHtml(order.client.observatii)}"</p>` : ''}
                        </div>
                        <div class="inline-order-items-list">
                            <h5>${window.t('js_order_products')}</h5>
                            ${itemsHtml}
                            <div class="inline-order-total-row">
                                <span>${window.t('js_order_total')}</span>
                                <span class="inline-order-total-price">${order.total} ${window.t('js_lei')}</span>
                            </div>
                        </div>
                    </div>
                    ${actionBtns ? `<div class="inline-order-card-footer">${actionBtns}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        container.html(html);
    }
    window.updateInlineOrderStatus = async function (orderId, newStatus) {
        try {
            const updateData = { status: newStatus };
            if (newStatus === 'anulată') {
                updateData.cancelledAtClient = Date.now();
                updateData.cancelledAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            if (newStatus === 'finalizată') {
                updateData.completedAtClient = Date.now();
                updateData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            await db.collection('comenzi').doc(orderId).update(updateData);
            if (newStatus === 'anulată') {
                const localOrder = inlineOrders.find(order => order.id === orderId);
                if (localOrder) {
                    localOrder.status = newStatus;
                    localOrder.cancelledAtClient = updateData.cancelledAtClient;
                }
                renderInlineOrders();
                scheduleInlineCancelledOrderRemoval();
            }
            if (newStatus === 'finalizată') {
                const localOrder = inlineOrders.find(order => order.id === orderId);
                if (localOrder) {
                    localOrder.status = newStatus;
                    localOrder.completedAtClient = updateData.completedAtClient;
                }
                renderInlineOrders();
            }
            fetchInlineOrders(); // Reload and re-render orders
        } catch (err) {
            console.error('Error updating order status:', err);
            alert(window.t('js_update_order_error') + err.message);
        }
    };
    setInterval(() => {
        if ($('#inlineOrdersModal').is(':visible') && inlineOrders.some(o => o.status === 'anulată' || o.status === 'finalizată')) {
            renderInlineOrders();
        }
    }, 1000);
    $('#adminLogoutBtn').click(async function () {
        if (confirm(window.t('js_confirm_logout'))) {
            try {
                await auth.signOut();
            } catch (err) {
                console.error('Logout error:', err);
            }
        }
    });
    // Preluarea listei de produse active din Firebase și aplicarea regulilor de sortare pe categorii
    async function fetchProducts() {
        if (typeof db === 'undefined') {
            console.warn('Firebase not initialized yet. Skipping Firestore fetch.');
            return;
        }
        const CAT_ORDER = { pizza: 1, bauturi: 2, bucate_calde: 3, salate: 4, patiserie: 5 };

        try {
            const snapshot = await db.collection('produse').get();
            dbProducts = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (isAdminLoggedIn || data.disponibil !== false) {
                    dbProducts.push({ id: doc.id, ...data });
                }
            });
            dbProducts.sort((a, b) => {
                const catA = CAT_ORDER[a.categorie] || 99;
                const catB = CAT_ORDER[b.categorie] || 99;
                if (catA !== catB) return catA - catB;
                return (a.ordine || 0) - (b.ordine || 0);
            });
            $('#menuLoading').remove();
            renderMenu();
        } catch (err) {
            console.error('Eroare la încărcarea produselor din Firestore:', err);
            $('#menuGrid').html(`
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h4 class="text-danger">${window.t('js_menu_error_title')}</h4>
                    <p class="text-muted">${window.t('js_menu_error_text')}</p>
                </div>
            `);
        }
    }
    // Redă meniul pizzeriei, filtrabil după termenul de căutare și categoria de mâncare
    function renderMenu() {
        const searchTerm = $('#menuSearch').val() ? $('#menuSearch').val().toLowerCase().trim() : '';
        const menuGrid = $('#menuGrid');
        if ($('#menuLoading').length > 0) return;

        let filteredItems = dbProducts.filter(function (p) {
            const matchesCategory = (currentCategory === 'toate' || p.categorie === currentCategory);
            const currentLang = window.currentLang || 'ro';
            const title = (p['nume_' + currentLang] || p.nume || '').toLowerCase();
            const description = (p['descriere_' + currentLang] || p.descriere || '').toLowerCase();
            const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);

            return matchesCategory && matchesSearch;
        });

        menuGrid.empty();
        if (filteredItems.length === 0) {
            menuGrid.addClass('justify-content-center');
            menuGrid.append(`
                <div id="noResults" class="col-12 text-center py-5 wow fadeIn">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">${window.t('js_no_results_prefix')}${escapeHtml(searchTerm)}${window.t('js_no_results_suffix')}</h4>
                    <p>${window.t('js_no_results_hint')}</p>
                </div>
            `);
            $('#loadMoreWrapper').hide();
        } else {
            menuGrid.removeClass('justify-content-center');

            const pageItems = filteredItems.slice(0, visibleCount);
            const categoryLabels = {
                'pizza':        { label: window.t('cat_pizza') },
                'bauturi':      { label: window.t('cat_bauturi') },
                'bucate_calde': { label: window.t('cat_bucate_calde') },
                'salate':       { label: window.t('cat_salate') },
                'patiserie':    { label: window.t('cat_patiserie') }
            };

            let lastCategory = null;

            pageItems.forEach(p => {
                const imgSrc = p.imagine || 'img/logo.png';
                const pretFormatat = p.pret % 1 === 0 ? p.pret : parseFloat(p.pret).toFixed(2);
                const currentLang = window.currentLang || 'ro';
                const prodName = p['nume_' + currentLang] || p.nume;
                const prodDesc = p['descriere_' + currentLang] || p.descriere || '';
                if (p.categorie !== lastCategory) {
                    lastCategory = p.categorie;
                    const cat = categoryLabels[p.categorie] || { label: p.categorie };
                    menuGrid.append(`
                        <div class="col-12 menu-category-header">
                            <div class="menu-category-divider">
                                <h2 class="menu-category-label">${cat.label}</h2>
                            </div>
                        </div>
                    `);
                }

                menuGrid.append(`
                    <div data-category="${p.categorie}" class="col-lg-3 col-md-4 col-6 menu-col wow fadeIn" data-wow-delay="0.1s">
                        <div class="menu-card">
                            <div class="menu-img">
                                <img src="${imgSrc}" alt="${prodName}" onerror="this.src='img/logo.png'">
                                <div class="overlay"></div>
                                <span class="price-badge">${pretFormatat} ${window.t('js_lei')}</span>
                                <button class="order-btn" data-name="${p.nume}" data-price="${p.pret}">${window.t('js_add_to_cart')}</button>
                            </div>
                            <div class="menu-content">
                                <h3>${prodName}</h3>
                                <p>${prodDesc}</p>
                            </div>
                        </div>
                    </div>
                `);
            });
            if (filteredItems.length > visibleCount) {
                $('#loadMoreWrapper').fadeIn(300);
            } else {
                $('#loadMoreWrapper').fadeOut(200);
            }
        }
    }
    $('#loadMoreBtn').click(function () {
        visibleCount += loadIncrement;
        renderMenu();
    });
    $(document).on('click', '.admin-card-btn-edit', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const product = dbProducts.find(p => p.id === id);

        if (!product) return;

        $('#inlineProductId').val(product.id);
        $('#inlineProductName').val(product.nume);
        $('#inlineProductNameRu').val(product.nume_ru || '');
        $('#inlineProductCategory').val(product.categorie);
        $('#inlineProductPrice').val(product.pret);
        $('#inlineProductOrder').val(product.ordine || 0);
        $('#inlineProductDescription').val(product.descriere || '');
        $('#inlineProductDescriptionRu').val(product.descriere_ru || '');
        $('#inlineProductImage').val(product.imagine || '');
        $('#inlineProductAvailable').prop('checked', product.disponibil !== false);

        $('#inlineProductModalTitle').html(`<i class="fas fa-pencil-alt me-2"></i> ${window.t('product_modal_edit_title')}`);
        $('#inlineProductModal').fadeIn(250);
    });
    $('#inlineProductForm').submit(async function (e) {
        e.preventDefault();
        const id = $('#inlineProductId').val();
        const name = $('#inlineProductName').val().trim();
        const name_ru = $('#inlineProductNameRu').val().trim();
        const category = $('#inlineProductCategory').val();
        const price = parseFloat($('#inlineProductPrice').val());
        const order = parseInt($('#inlineProductOrder').val()) || 0;
        const description = $('#inlineProductDescription').val().trim();
        const description_ru = $('#inlineProductDescriptionRu').val().trim();
        const image = $('#inlineProductImage').val().trim();
        const available = $('#inlineProductAvailable').is(':checked');

        const saveBtn = $('#inlineProductSaveBtn');
        saveBtn.prop('disabled', true).text(window.t('js_saving'));

        const productData = {
            nume: name,
            nume_ru: name_ru,
            categorie: category,
            pret: price,
            ordine: order,
            descriere: description,
            descriere_ru: description_ru,
            imagine: image,
            disponibil: available,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (id) {
                await db.collection('produse').doc(id).update(productData);
            } else {
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('produse').add(productData);
            }
            closeInlineModal('inlineProductModal');
            fetchProducts(); // Refresh list
        } catch (err) {
            console.error('Error saving product:', err);
            alert(window.t('dash_js_save_product_inline_error') + err.message);
        } finally {
            saveBtn.prop('disabled', false).text(window.t('product_save'));
        }
    });
    let productIdToDelete = '';
    $(document).on('click', '.admin-card-btn-delete', function (e) {
        e.stopPropagation();
        productIdToDelete = $(this).data('id');
        const name = $(this).data('name');

        $('#inlineDeleteProductName').text(name);
        $('#inlineDeleteModal').fadeIn(250);
    });
    $('#inlineConfirmDeleteBtn').click(async function () {
        if (!productIdToDelete) return;

        const deleteBtn = $(this);
        deleteBtn.prop('disabled', true).text(window.t('js_deleting'));

        try {
            await db.collection('produse').doc(productIdToDelete).delete();
            closeInlineModal('inlineDeleteModal');
            fetchProducts(); // Refresh list
        } catch (err) {
            console.error('Error deleting product:', err);
            alert(window.t('dash_js_delete_product_inline_error') + err.message);
        } finally {
            deleteBtn.prop('disabled', false).text(window.t('delete_confirm_btn'));
            productIdToDelete = '';
        }
    });
    $('#menuSearch').on('input', function () {
        const value = $(this).val();
        if (value.length > 0) {
            $('#clearSearch').fadeIn();
        } else {
            $('#clearSearch').fadeOut();
        }
        visibleCount = loadIncrement; // reset to first batch
        renderMenu();
    });
    $(document).on('click', '#clearSearch', function () {
        $('#menuSearch').val('').focus();
        $(this).fadeOut();
        visibleCount = loadIncrement; // reset to first batch
        renderMenu();
    });
    $('.filter-btn').click(function () {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        currentCategory = $(this).data('filter');
        visibleCount = loadIncrement; // reset to first batch
        renderMenu();
    });
    $(document).on('click', '.admin-inline-modal', function (e) {
        if ($(e.target).hasClass('admin-inline-modal')) {
            $(this).fadeOut(200);
        }
    });

    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            $('.admin-inline-modal').fadeOut(200);
        }
    });
    $(document).ready(function () {
        updateCartUI();

        if ($('#menu-section').length > 0) {
            fetchProducts(); // Load products only on the menu page
        }
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged(function (user) {
                if (user) {
                    $('#dashboardNavLink').show();
                    $('#adminLoginBtn i').removeClass('fa-lock').addClass('fa-user-shield');
                } else {
                    $('#dashboardNavLink').hide();
                    $('#adminLoginBtn i').removeClass('fa-user-shield').addClass('fa-lock');
                }
            });
        }
        $(document).on('click', '#adminLoginBtn', function (e) {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
    });
    document.addEventListener('langchange', function () {
        updateCartUI();
        if ($('#menu-section').length > 0) {
            renderMenu();
        }
        if ($('#inlineOrdersModal').is(':visible')) {
            renderInlineOrders();
        }
        if (window.applySiteSettings) {
            window.applySiteSettings();
        }
    });
    $(document).on('click', '.navbar-nav .nav-link', function () {
        const navbarCollapse = $('#navbarCollapse');
        if (navbarCollapse.hasClass('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse[0]);
            if (bsCollapse) {
                bsCollapse.hide();
            } else {
                new bootstrap.Collapse(navbarCollapse[0]).hide();
            }
        }
    });
    $(document).on('click', '.menu-card', function (e) {
        if ($(e.target).closest('.order-btn, .admin-card-controls, .admin-card-btn').length) return;
        const orderBtn = $(this).find('.order-btn');
        const name = orderBtn.attr('data-name');

        if (!name) return;
        const product = dbProducts.find(p => p.nome === name || p.nume === name);

        if (product && product.id) {
            window.location.href = `product.html?id=${product.id}`;
        }
    });

})(jQuery);
