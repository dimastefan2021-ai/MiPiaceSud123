(function () {
    'use strict';
    // Funcție utilitară pentru a prelua coșul de cumpărături din local storage
    function getCart() {
        try { return JSON.parse(localStorage.getItem('mipiace_cart') || '[]'); }
        catch (e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem('mipiace_cart', JSON.stringify(cart));
    }

    function updateCartBadge() {
        var qty = getCart().reduce(function (s, i) { return s + i.qty; }, 0);
        var badge = document.getElementById('pdCartBadge');
        if (!badge) return;
        badge.textContent = qty;
        badge.style.display = qty > 0 ? 'flex' : 'none';
    }
    // Extrage ID-ul produsului ('id') din parametrii URL-ului
    function getProductId() {
        return new URLSearchParams(window.location.search).get('id');
    }
    function goBack() {
        window.location.href = 'index.html#menu-section';
    }
    // Redă datele încărcate ale produsului în elementele DOM corespunzătoare
    function renderProduct(product) {
        var price = product.pret;
        var priceStr = price % 1 === 0 ? price : parseFloat(price).toFixed(2);
        var currentLang = window.currentLang || 'ro';
        var prodName = product['nume_' + currentLang] || product.nume;
        var prodDesc = product['descriere_' + currentLang] || product.descriere || '';

        var catKey = 'cat_' + product.categorie;
        var catLabel = (window.t && window.t(catKey) !== catKey) ? window.t(catKey) : (product.categorie || '');
        document.title = prodName + ' — Pizzeria Mi Piace';
        var meta = document.getElementById('pageMeta');
        if (meta) meta.setAttribute('content', prodDesc || prodName);
        var bc = document.getElementById('pdBreadcrumb');
        if (bc) {
            bc.removeAttribute('data-i18n');
            bc.textContent = prodName;
        }
        var img = document.getElementById('pdImg');
        img.src = product.imagine || 'img/logo.png';
        img.alt = prodName;
        img.onerror = function () { this.src = 'img/logo.png'; };
        document.getElementById('pdCategory').textContent = catLabel;
        document.getElementById('pdName').textContent = prodName;
        document.getElementById('pdPrice').textContent = priceStr;
        document.getElementById('pdDesc').textContent = prodDesc;
        document.getElementById('productLoading').style.display = 'none';
        document.getElementById('productError').style.display = 'none';
        document.getElementById('productImgPanel').style.display = 'block';
        document.getElementById('productDetailsPanel').style.display = 'flex';
    }

    // Afișează ecranul de eroare dacă preluarea produsului eșuează
    function showError() {
        document.getElementById('productLoading').style.display = 'none';
        document.getElementById('productError').style.display = 'flex';
        document.getElementById('productImgPanel').style.display = 'none';
        document.getElementById('productDetailsPanel').style.display = 'none';
        var bc = document.getElementById('pdBreadcrumb');
        if (bc) bc.textContent = window.t('js_error');
    }
    var qty = 1;
    var currentProduct = null;

    document.getElementById('pdInc').addEventListener('click', function (e) {
        e.stopPropagation();
        qty++;
        document.getElementById('pdQty').textContent = qty;
    });

    document.getElementById('pdDec').addEventListener('click', function (e) {
        e.stopPropagation();
        if (qty > 1) { qty--; document.getElementById('pdQty').textContent = qty; }
    });
    document.getElementById('pdAddBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!currentProduct) return;

        var cart = getCart();
        var existing = cart.find(function (i) { return i.name === currentProduct.nume; });
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ name: currentProduct.nume, price: currentProduct.pret, qty: qty });
        }
        saveCart(cart);
        updateCartBadge();

        var btn = this;
        btn.classList.add('added');
        btn.innerHTML = '<i class="fas fa-check"></i> ' + window.t('js_added');
        setTimeout(function () {
            btn.classList.remove('added');
            btn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + window.t('js_add_to_cart');
        }, 1800);
    });
    document.addEventListener('langchange', function () {
        updateCartBadge();
        var btn = document.getElementById('pdAddBtn');
        if (btn && !btn.classList.contains('added')) {
            btn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + window.t('js_add_to_cart');
        }
        var bcError = document.getElementById('pdBreadcrumb');
        if (bcError && (bcError.textContent === 'Eroare' || bcError.textContent === 'Ошибка')) {
            bcError.textContent = window.t('js_error');
        }
        if (currentProduct) {
            renderProduct(currentProduct);
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') goBack();
    });
    updateCartBadge();

    // Așteaptă ca SDK-ul Firebase să se inițializeze pentru a prelua produsul
    var productId = getProductId();
    if (!productId) { showError(); return; }
    var attempts = 0;
    var poll = setInterval(function () {
        attempts++;
        if (typeof db !== 'undefined') {
            clearInterval(poll);
            db.collection('produse').doc(productId).get()
                .then(function (doc) {
                    if (doc.exists) {
                        currentProduct = { id: doc.id, ...doc.data() };
                        renderProduct(currentProduct);
                    } else {
                        showError();
                    }
                })
                .catch(function (err) {
                    console.error(err);
                    showError();
                });
        } else if (attempts > 40) {
            clearInterval(poll);
            showError();
        }
    }, 150);

})();
