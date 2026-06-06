(function () {
    'use strict';
    
    // Selectoare de elemente UI și cache pentru starea componentelor
    const $ = id => document.getElementById(id);
    const loginScreen = $('loginScreen');
    const adminDashboard = $('adminDashboard');
    const adminEmailDisplay = $('adminEmailDisplay');
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    let dbProducts = [];
    const productsTableBody = $('productsTableBody');
    const emptyState = $('emptyState');
    const addProductBtn = $('addProductBtn');
    const filterCategory = $('filterCategory');
    const searchProduct = $('searchProduct');
    const productModal = $('productModal');
    const modalTitle = $('modalTitle');
    const productForm = $('productForm');
    const productId = $('productId');
    const closeModal = $('closeModal');
    const cancelModal = $('cancelModal');
    const saveBtn = $('saveBtn');
    const imageDragDropZone = $('imageDragDropZone');
    const imageFileInput = $('imageFileInput');
    const imageUploadProgress = $('imageUploadProgress');
    const uploadStatusText = $('uploadStatusText');
    const imagePreviewContainer = $('imagePreviewContainer');
    const imagePreviewImg = $('imagePreviewImg');
    const removeImageBtn = $('removeImageBtn');
    const deleteModal = $('deleteModal');
    const deleteProductName = $('deleteProductName');
    const closeDeleteModal = $('closeDeleteModal');
    const cancelDelete = $('cancelDelete');
    const confirmDelete = $('confirmDelete');
    let productIdToDelete = '';
    let allOrders = [];
    const ordersContainer = $('ordersContainer');
    const emptyOrders = $('emptyOrders');
    const ordersCountBadge = $('ordersCount');
    const filterOrderStatus = $('filterOrderStatus');
    const refreshOrdersBtn = $('refreshOrdersBtn');
    const CANCELLED_ORDER_VISIBLE_MS = 30000;
    const COMPLETED_ORDER_VISIBLE_MS = 10 * 60 * 1000;
    let allMessages = [];
    const messagesContainer = $('messagesContainer');
    const emptyMessages = $('emptyMessages');
    const messagesCountBadge = $('messagesCount');
    const filterMessagesStatus = $('filterMessagesStatus');
    const refreshMessagesBtn = $('refreshMessagesBtn');
    const contentSettingsForm = $('contentSettingsForm');
    const saveContentBtn = $('saveContentBtn');

    // Monitorizează starea de autorizare a administratorului și redirecționează utilizatorii neautorizați
    auth.onAuthStateChanged(user => {
        if (user) {
            loginScreen.style.display = 'none';
            adminDashboard.style.display = 'block';
            adminEmailDisplay.innerHTML = `<i class="fas fa-user-circle me-1"></i> ${window.t('dash_js_connected_as')} <strong>${user.email}</strong>`;
            const navLink = $('dashboardNavLink');
            if (navLink) navLink.style.display = 'block';
            const lockIcon = document.querySelector('#adminLoginBtn i');
            if (lockIcon) lockIcon.className = 'fas fa-user-shield';
            loadProducts();
            loadOrders();
            loadMessages();
            loadContentSettings();
            startLivePolling();
        } else {
            loginScreen.style.display = 'flex';
            adminDashboard.style.display = 'none';
            const navLink = $('dashboardNavLink');
            if (navLink) navLink.style.display = 'none';
            const lockIcon = document.querySelector('#adminLoginBtn i');
            if (lockIcon) lockIcon.className = 'fas fa-lock';
        }
    });

    // Trimite datele de conectare pentru a autentifica administratorii în ecranul de login
    $('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('loginEmail').value.trim();
        const password = $('loginPassword').value;
        const loginBtn = $('loginBtn');
        const loginError = $('loginError');

        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${window.t('js_loading_connecting')}`;
        loginError.style.display = 'none';

        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast(window.t('dash_js_login_success'), 'success');
        } catch (err) {
            let msg = window.t('dash_js_login_generic');
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                msg = window.t('dash_js_login_error');
            } else if (err.code === 'auth/too-many-requests') {
                msg = window.t('dash_js_login_too_many');
            }
            loginError.textContent = msg;
            loginError.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<i class="fas fa-sign-in-alt me-2"></i> ${window.t('dash_login_btn')}`;
        }
    });

    // Șterge datele de conectare și închide sesiunea curentă de administrator
    $('logoutBtn').addEventListener('click', () => {
        auth.signOut().then(() => {
            showToast(window.t('dash_js_logout_success'), 'success');
            window.location.href = 'index.html';
        });
    });

    // Configurarea ascultătorilor de evenimente pentru navigarea pe file în panoul de control
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => {
                if (content.id === `tabContent${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
            if (targetTab === 'produse') loadProducts();
            if (targetTab === 'comenzi') loadOrders();
            if (targetTab === 'mesaje') loadMessages();
            if (targetTab === 'setari') loadContentSettings();
        });
    });

    const CAT_ORDER = { pizza: 1, bauturi: 2, bucate_calde: 3, salate: 4, patiserie: 5 };

    // Preluarea inventarului complet de produse din Firestore
    async function loadProducts() {
        try {
            const snapshot = await db.collection('produse').get();
            dbProducts = [];
            snapshot.forEach(doc => {
                dbProducts.push({ id: doc.id, ...doc.data() });
            });
            dbProducts.sort((a, b) => {
                const catA = CAT_ORDER[a.categorie] || 99;
                const catB = CAT_ORDER[b.categorie] || 99;
                if (catA !== catB) return catA - catB;
                const ordDiff = (a.ordine || 0) - (b.ordine || 0);
                if (ordDiff !== 0) return ordDiff;
                return (a.nume || '').localeCompare(b.nume || '', 'ro');
            });
            updateProductStats();
            renderProductsTable();
        } catch (err) {
            console.error('Error loading products:', err);
            showToast(window.t('dash_js_load_error'), 'error');
        }
    }

    // Actualizează totalurile din cardurile statistice
    function updateProductStats() {
        $('statTotal').textContent = dbProducts.length;
        $('statPizza').textContent = dbProducts.filter(p => p.categorie === 'pizza').length;
        $('statBauturi').textContent = dbProducts.filter(p => p.categorie === 'bauturi').length;
    }
    // Redă lista de produse în tabelul panoului de control al administratorului
    function renderProductsTable() {
        const cat = filterCategory.value;
        const search = searchProduct.value.toLowerCase().trim();

        let filtered = dbProducts;

        if (cat !== 'toate') {
            filtered = filtered.filter(p => p.categorie === cat);
        }

        if (search) {
            filtered = filtered.filter(p =>
                (p.nume || '').toLowerCase().includes(search) ||
                (p.nume_ru || '').toLowerCase().includes(search) ||
                (p.descriere || '').toLowerCase().includes(search) ||
                (p.descriere_ru || '').toLowerCase().includes(search)
            );
        }

        if (filtered.length === 0) {
            productsTableBody.innerHTML = '';
            emptyState.style.display = 'block';
            document.querySelector('.table-container').style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        document.querySelector('.table-container').style.display = 'block';

        productsTableBody.innerHTML = filtered.map((p, idx) => {
            const imgSrc = p.imagine || 'img/logo.png';
            const priceStr = p.pret % 1 === 0 ? p.pret : parseFloat(p.pret).toFixed(2);

            let catLabel = p.categorie;
            if (p.categorie === 'pizza') catLabel = window.t('cat_pizza');
            else if (p.categorie === 'bauturi') catLabel = window.t('cat_bauturi');
            else if (p.categorie === 'bucate_calde') catLabel = window.t('cat_bucate_calde');
            else if (p.categorie === 'salate') catLabel = window.t('cat_salate');
            else if (p.categorie === 'patiserie') catLabel = window.t('cat_patiserie');

            return `
                <tr>
                    <td class="text-muted table-order-cell" title="Ordine Firestore: ${p.ordine || 0}">#${idx + 1}</td>
                    <td><img src="${escapeHtml(imgSrc)}" class="product-thumb" onerror="this.src='img/logo.png'"></td>
                    <td>
                        <strong>${escapeHtml(p.nume || '')}</strong>
                        ${p.nume_ru ? `<br><small class="text-muted secondary-lang-text">${escapeHtml(p.nume_ru)}</small>` : ''}
                    </td>
                    <td><span class="category-badge ${p.categorie}">${catLabel}</span></td>
                    <td class="price-cell">${priceStr} ${window.t('js_lei')}</td>
                    <td class="desc-cell" title="${escapeHtml(p.descriere || '')}">
                        ${escapeHtml(p.descriere || '—')}
                        ${p.descriere_ru ? `<br><small class="text-muted secondary-lang-text">${escapeHtml(p.descriere_ru)}</small>` : ''}
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-edit" title="${window.t('dash_js_edit')}" onclick="editProduct('${p.id}')">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-del" title="${window.t('dash_js_delete')}" onclick="deleteProduct('${p.id}', '${escapeAttr(p.nume || '')}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterCategory.addEventListener('change', renderProductsTable);
    searchProduct.addEventListener('input', renderProductsTable);
    
    let sortOrderAsc = true;
    
    // Sortează produsele după prioritatea de afișare (ordine)
    window.sortByOrder = function () {
        sortOrderAsc = !sortOrderAsc;
        dbProducts.sort((a, b) => {
            const diff = (a.ordine || 0) - (b.ordine || 0);
            return sortOrderAsc ? diff : -diff;
        });
        const th = document.querySelector('.products-table thead th:first-child');
        if (th) th.innerHTML = `Ord ${sortOrderAsc ? '↑' : '↓'}`;
        renderProductsTable();
    };

    // Pregătește formularul de adăugare a produsului în modalul pop-up
    addProductBtn.addEventListener('click', () => {
        productId.value = '';
        productForm.reset();
        $('productAvailable').checked = true;
        imagePreviewContainer.style.display = 'none';
        imagePreviewImg.src = '';
        imageUploadProgress.style.display = 'none';
        imageFileInput.value = '';

        modalTitle.innerHTML = `<i class="fas fa-plus-circle"></i> ${window.t('dash_modal_add_title')}`;
        saveBtn.innerHTML = `<i class="fas fa-save me-2"></i> ${window.t('dash_modal_save')}`;
        productModal.style.display = 'flex';
    });

    // Populează și deschide modalul de editare a produsului
    window.editProduct = function (id) {
        const p = dbProducts.find(prod => prod.id === id);
        if (!p) return;

        productId.value = p.id;
        $('productName').value = p.nume || '';
        $('productNameRu').value = p.nume_ru || '';
        $('productCategory').value = p.categorie || '';
        $('productPrice').value = p.pret || '';
        $('productOrder').value = p.ordine || 0;
        $('productDescription').value = p.descriere || '';
        $('productDescriptionRu').value = p.descriere_ru || '';
        $('productImage').value = p.imagine || '';
        $('productAvailable').checked = p.disponibil !== false;
        imageUploadProgress.style.display = 'none';
        imageFileInput.value = '';
        if (p.imagine && p.imagine !== 'img/logo.png') {
            imagePreviewImg.src = p.imagine;
            imagePreviewContainer.style.display = 'flex';
        } else {
            imagePreviewContainer.style.display = 'none';
            imagePreviewImg.src = '';
        }

        modalTitle.innerHTML = `<i class="fas fa-edit"></i> ${window.t('dash_modal_edit_title')}`;
        saveBtn.innerHTML = `<i class="fas fa-save me-2"></i> ${window.t('js_updating')}`;
        productModal.style.display = 'flex';
    };

    $('productImage').addEventListener('input', () => {
        const val = $('productImage').value.trim();
        if (val && val !== 'img/logo.png') {
            imagePreviewImg.src = val;
            imagePreviewContainer.style.display = 'flex';
        } else {
            imagePreviewContainer.style.display = 'none';
            imagePreviewImg.src = '';
        }
    });

    // Trimite formularul cu datele produsului către Firestore (operație de creare sau actualizare)
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = productId.value;
        const pData = {
            nume: $('productName').value.trim(),
            nume_ru: $('productNameRu').value.trim(),
            categorie: $('productCategory').value,
            pret: parseFloat($('productPrice').value),
            ordine: parseInt($('productOrder').value) || 0,
            descriere: $('productDescription').value.trim(),
            descriere_ru: $('productDescriptionRu').value.trim(),
            imagine: $('productImage').value.trim() || 'img/logo.png',
            disponibil: $('productAvailable').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> ${window.t('js_saving')}`;

        try {
            if (id) {
                await db.collection('produse').doc(id).update(pData);
                showToast(window.t('dash_js_edit_success'), 'success');
            } else {
                pData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('produse').add(pData);
                showToast(window.t('dash_js_add_success'), 'success');
            }
            productModal.style.display = 'none';
            loadProducts();
        } catch (err) {
            console.error('Error saving product:', err);
            showToast(window.t('dash_js_save_product_error'), 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });

    window.deleteProduct = function (id, name) {
        productIdToDelete = id;
        deleteProductName.textContent = name;
        deleteModal.style.display = 'flex';
    };

    // Confirmă ștergerea produsului selectat din Firestore
    confirmDelete.addEventListener('click', async () => {
        if (!productIdToDelete) return;
        confirmDelete.disabled = true;
        confirmDelete.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> ${window.t('js_deleting')}`;

        try {
            await db.collection('produse').doc(productIdToDelete).delete();
            showToast(window.t('dash_js_delete_product_done'), 'success');
            deleteModal.style.display = 'none';
            loadProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
            showToast(window.t('dash_js_delete_product_error'), 'error');
        } finally {
            confirmDelete.disabled = false;
            confirmDelete.innerHTML = `<i class="fas fa-trash-alt"></i> ${window.t('delete_confirm_btn')}`;
            productIdToDelete = '';
        }
    });

    imageDragDropZone.addEventListener('click', () => {
        imageFileInput.click();
    });
    imageFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        imageDragDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            imageDragDropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        imageDragDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            imageDragDropZone.classList.remove('dragover');
        }, false);
    });

    imageDragDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    }, false);

    removeImageBtn.addEventListener('click', () => {
        $('productImage').value = '';
        imagePreviewContainer.style.display = 'none';
        imagePreviewImg.src = '';
        imageFileInput.value = '';
        showToast(window.t('dash_js_img_removed'), 'success');
    });

    // Procesează, redimensionează și codifică în base64 imaginile de produs încărcate local
    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast(window.t('dash_js_select_image'), 'error');
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        imagePreviewImg.src = objectUrl;
        imagePreviewContainer.style.display = 'flex';
        imageUploadProgress.style.display = 'block';
        uploadStatusText.textContent = window.t('dash_js_optimizing');

        const img = new Image();
        img.onload = function () {
            URL.revokeObjectURL(objectUrl);
            const maxDim = 800;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                else       { w = Math.round(w * maxDim / h); h = maxDim; }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const base64 = canvas.toDataURL('image/jpeg', 0.75);
            $('productImage').value = base64;
            imagePreviewImg.src = base64;
            imagePreviewContainer.style.display = 'flex';
            imageUploadProgress.style.display = 'none';
            showToast(window.t('dash_js_img_processed'), 'success');
        };
        img.onerror = function () {
            URL.revokeObjectURL(objectUrl);
            imageUploadProgress.style.display = 'none';
            showToast(window.t('dash_js_img_error'), 'error');
        };
        img.src = objectUrl;
    }

    closeModal.addEventListener('click', () => productModal.style.display = 'none');
    cancelModal.addEventListener('click', () => productModal.style.display = 'none');
    closeDeleteModal.addEventListener('click', () => deleteModal.style.display = 'none');
    cancelDelete.addEventListener('click', () => deleteModal.style.display = 'none');

    // Preluarea comenzilor active și istorice ale clienților din Firestore
    async function loadOrders() {
        try {
            const snapshot = await db.collection('comenzi').orderBy('createdAt', 'desc').get();
            allOrders = [];
            let newOrdersCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                allOrders.push({ id: doc.id, ...data });
                if (data.status === 'nouă') newOrdersCount++;
            });

            if (newOrdersCount > 0) {
                ordersCountBadge.textContent = newOrdersCount;
                ordersCountBadge.style.display = 'inline-block';
            } else {
                ordersCountBadge.style.display = 'none';
            }

            renderOrders();
        } catch (err) {
            console.error('Error loading orders:', err);
            ordersContainer.innerHTML = `<div class="text-danger p-4 text-center">${window.t('dash_js_error_orders')}${err.message}</div>`;
        }
    }

    function getOrderStatusLabel(status) {
        switch (status) {
            case 'nouă': return window.t('dash_js_status_new');
            case 'în pregătire': return window.t('dash_js_status_preparing');
            case 'finalizată': return window.t('dash_js_status_done');
            case 'anulată': return window.t('dash_js_status_cancelled');
            default: return status;
        }
    }

    function getOrderDate(value) {
        if (!value) return null;
        const date = value.toDate ? value.toDate() : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatOrderRemaining(ms) {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    function getCompletedOrderDate(order) {
        const completedDate = getOrderDate(order.completedAt || order.completedAtClient);
        if (completedDate) return completedDate;

        return getOrderDate(order.createdAt);
    }

    function isOrderVisible(order, now = new Date()) {
        if (order.status === 'anulată') {
            const cancelDate = getOrderDate(order.cancelledAt || order.cancelledAtClient);
            return cancelDate ? now - cancelDate < CANCELLED_ORDER_VISIBLE_MS : false;
        }

        if (order.status === 'finalizată') {
            const completedDate = getCompletedOrderDate(order);
            return completedDate ? now - completedDate < COMPLETED_ORDER_VISIBLE_MS : false;
        }

        return true;
    }

    // Afișează cardurile cu comenzile clienților cu butoane dinamice de actualizare a stării
    function renderOrders() {
        const statusFilter = filterOrderStatus.value;
        const now = new Date();

        let filtered = allOrders.filter(order => isOrderVisible(order, now));

        if (statusFilter !== 'toate') {
            filtered = filtered.filter(o => o.status === statusFilter);
        }

        if (filtered.length === 0) {
            ordersContainer.innerHTML = '';
            emptyOrders.style.display = 'block';
            return;
        }

        emptyOrders.style.display = 'none';

        ordersContainer.innerHTML = filtered.map(order => {
            const currentLang = (localStorage.getItem('mipiace_lang') || 'ro') === 'ro' ? 'ro-RO' : 'ru-RU';
            const dateStr = order.createdAt ? order.createdAt.toDate().toLocaleString(currentLang) : window.t('js_date_unknown');
            const items = Array.isArray(order.produse) ? order.produse : [];
            const client = order.client || {};

            const itemsHtml = items.map(p => `
                <div class="order-item-row">
                    <span>${escapeHtml(p.nume)} × ${p.cantitate}</span>
                    <span class="order-item-price">${p.subtotal} ${window.t('js_lei')}</span>
                </div>
            `).join('');

            let actionBtns = '';
            if (order.status === 'nouă') {
                actionBtns = `
                    <button class="order-action-btn order-btn-prepare" onclick="updateOrderStatus('${order.id}', 'în pregătire')">
                        <i class="fas fa-fire"></i> ${window.t('dash_js_order_take')}
                    </button>
                    <button class="order-action-btn order-btn-cancel" onclick="updateOrderStatus('${order.id}', 'anulată')">
                        <i class="fas fa-times"></i> ${window.t('dash_js_order_cancel')}
                    </button>
                `;
            } else if (order.status === 'în pregătire') {
                actionBtns = `
                    <button class="order-action-btn order-btn-complete" onclick="updateOrderStatus('${order.id}', 'finalizată')">
                        <i class="fas fa-check"></i> ${window.t('dash_js_order_complete')}
                    </button>
                `;
            }

            let statusBadge = getOrderStatusLabel(order.status);
            if (order.status === 'anulată') {
                const cancelDate = getOrderDate(order.cancelledAt || order.cancelledAtClient);
                const secondsPassed = Math.floor((now - cancelDate) / 1000);
                const remaining = Math.max(0, 30 - secondsPassed);
                statusBadge = `${getOrderStatusLabel('anulată')} (${remaining}s)`;
            }
            if (order.status === 'finalizată') {
                const completedDate = getCompletedOrderDate(order);
                const remaining = COMPLETED_ORDER_VISIBLE_MS - (now - completedDate);
                statusBadge = `${getOrderStatusLabel('finalizată')} (${formatOrderRemaining(remaining)})`;
            }

            return `
                <div class="order-card mb-3">
                    <div class="order-card-header">
                        <div class="order-card-header-left">
                            <span class="order-id">#${order.id.substring(0, 8).toUpperCase()}</span>
                            <span class="order-date"><i class="far fa-clock me-1"></i> ${dateStr}</span>
                        </div>
                        <span class="order-status ${order.status.replace(' ', '-')}">${statusBadge}</span>
                    </div>
                    <div class="order-card-body">
                        <div class="order-client-info">
                            <h4>${window.t('js_order_client_details')}</h4>
                            <p><i class="fas fa-user"></i> ${escapeHtml(client.nume)}</p>
                            <p><i class="fas fa-phone"></i> <a href="tel:${escapeHtml(client.telefon)}" class="admin-link-inherit">${escapeHtml(client.telefon)}</a></p>
                            ${client.adresa ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(client.adresa)}</p>` : ''}
                            ${client.observatii ? `<p class="mt-2 text-warning font-italic"><i class="fas fa-comment-dots"></i> "${escapeHtml(client.observatii)}"</p>` : ''}
                        </div>
                        <div class="order-items-list">
                            <h5>${window.t('js_order_cart')}</h5>
                            ${itemsHtml}
                            <div class="order-total-row">
                                <span>${window.t('js_order_total')}</span>
                                <span class="order-total-price">${order.total} ${window.t('js_lei')}</span>
                            </div>
                        </div>
                    </div>
                    ${actionBtns ? `<div class="order-card-footer">${actionBtns}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    // Salvează actualizările stării comenzii în Firebase
    window.updateOrderStatus = async function (orderId, newStatus) {
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
            showToast(window.t('dash_js_update_ok'), 'success');
            loadOrders();
        } catch (err) {
            console.error('Error updating order:', err);
            showToast(window.t('dash_js_update_order_err'), 'error');
        }
    };

    filterOrderStatus.addEventListener('change', renderOrders);
    refreshOrdersBtn.addEventListener('click', loadOrders);

    setInterval(() => {
        const activeTab = document.querySelector('.admin-tab.active');
        const hasTimedOrder = allOrders.some(order => order.status === 'anulată' || order.status === 'finalizată');
        if (activeTab && activeTab.getAttribute('data-tab') === 'comenzi' && hasTimedOrder) {
            renderOrders();
        }
    }, 1000);

    // Preluarea mesajelor de feedback de la clienți
    async function loadMessages() {
        try {
            const snapshot = await db.collection('mesaje').orderBy('createdAt', 'desc').get();
            allMessages = [];
            let unreadCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                allMessages.push({ id: doc.id, ...data });
                if (data.citit === false) unreadCount++;
            });

            $('statMessages').textContent = unreadCount;

            if (unreadCount > 0) {
                messagesCountBadge.textContent = unreadCount;
                messagesCountBadge.style.display = 'inline-block';
            } else {
                messagesCountBadge.style.display = 'none';
            }

            renderMessages();
        } catch (err) {
            console.error('Error loading messages:', err);
            messagesContainer.innerHTML = `<div class="text-danger p-4 text-center">${window.t('dash_js_error_messages')}</div>`;
        }
    }

    // Redă cardurile cu mesajele de contact personalizate
    function renderMessages() {
        const filter = filterMessagesStatus.value;
        let filtered = allMessages;

        if (filter === 'necitit') {
            filtered = filtered.filter(m => m.citit === false);
        } else if (filter === 'citit') {
            filtered = filtered.filter(m => m.citit === true);
        }

        if (filtered.length === 0) {
            messagesContainer.innerHTML = '';
            emptyMessages.style.display = 'block';
            return;
        }

        emptyMessages.style.display = 'none';

        messagesContainer.innerHTML = filtered.map(msg => {
            const currentLang = (localStorage.getItem('mipiace_lang') || 'ro') === 'ro' ? 'ro-RO' : 'ru-RU';
            const dateStr = msg.createdAt ? msg.createdAt.toDate().toLocaleString(currentLang) : window.t('js_date_unknown');
            const isUnread = msg.citit === false;

            return `
                <div class="message-card ${isUnread ? 'unread' : ''}" id="msg-card-${msg.id}">
                    <div class="message-header">
                        <div>
                            <span class="message-sender"><i class="fas fa-user me-1 text-primary"></i> ${escapeHtml(msg.nume)}</span>
                            <span class="mx-2 text-muted">|</span>
                            <span class="message-email"><i class="fas fa-envelope me-1"></i> <a href="mailto:${escapeHtml(msg.email)}" class="admin-link-inherit">${escapeHtml(msg.email)}</a></span>
                        </div>
                        <span class="message-date"><i class="far fa-clock me-1"></i> ${dateStr}</span>
                    </div>
                    <h5 class="text-light mb-2">${window.t('dash_js_msg_subject_prefix')} ${escapeHtml(msg.subiect || window.t('js_no_subject'))}</h5>
                    <div class="message-body">${escapeHtml(msg.mesaj || '')}</div>
                    <div class="message-actions">
                        ${isUnread ? `
                            <button class="order-action-btn order-btn-complete" onclick="markMessageAsRead('${msg.id}')">
                                <i class="fas fa-check"></i> ${window.t('dash_js_mark_read_full')}
                            </button>
                        ` : ''}
                        <button class="order-action-btn order-btn-cancel" onclick="deleteMessage('${msg.id}')">
                            <i class="fas fa-trash-alt"></i> ${window.t('dash_js_delete')}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.markMessageAsRead = async function (id) {
        try {
            await db.collection('mesaje').doc(id).update({
                citit: true
            });
            showToast(window.t('dash_js_mark_read_success'), 'success');
            loadMessages();
        } catch (err) {
            console.error('Error marking message read:', err);
            showToast(window.t('dash_js_update_error'), 'error');
        }
    };

    window.deleteMessage = async function (id) {
        if (!confirm(window.t('dash_js_confirm_delete_msg'))) return;
        try {
            await db.collection('mesaje').doc(id).delete();
            showToast(window.t('dash_js_delete_msg_success'), 'success');
            loadMessages();
        } catch (err) {
            console.error('Error deleting message:', err);
            showToast(window.t('dash_js_delete_msg_error'), 'error');
        }
    };

    filterMessagesStatus.addEventListener('change', renderMessages);
    refreshMessagesBtn.addEventListener('click', loadMessages);
    
    // Încarcă setările globale de conținut pentru pagina principală din documentul de setări Firestore
    async function loadContentSettings() {
        try {
            const doc = await db.collection('setari').doc('pagina_principala').get();
            if (doc.exists) {
                const data = doc.data();
                $('slide1Title').value = data.slide1Title || '';
                $('slide1TitleRu').value = data.slide1Title_ru || '';
                $('slide1Desc').value = data.slide1Desc || '';
                $('slide1DescRu').value = data.slide1Desc_ru || '';
                $('slide2Title').value = data.slide2Title || '';
                $('slide2TitleRu').value = data.slide2Title_ru || '';
                $('slide2Desc').value = data.slide2Desc || '';
                $('slide2DescRu').value = data.slide2Desc_ru || '';
                $('aboutSub').value = data.aboutSub || '';
                $('aboutSubRu').value = data.aboutSub_ru || '';
                $('aboutTitle').value = data.aboutTitle || '';
                $('aboutTitleRu').value = data.aboutTitle_ru || '';
                $('aboutText1').value = data.aboutText1 || '';
                $('aboutText1Ru').value = data.aboutText1_ru || '';
                $('aboutText2').value = data.aboutText2 || '';
                $('aboutText2Ru').value = data.aboutText2_ru || '';
                $('contactPhone').value = data.contactPhone || '';
                $('contactAddress').value = data.contactAddress || '';
                $('contactEmailSettings').value = data.contactEmail || '';
            }
        } catch (err) {
            console.error('Error loading settings:', err);
            showToast(window.t('dash_js_settings_load_error'), 'error');
        }
    }

    contentSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveContentBtn.disabled = true;
        saveContentBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> ' + window.t('js_saving');

        const data = {
            slide1Title: $('slide1Title').value.trim(),
            slide1Title_ru: $('slide1TitleRu').value.trim(),
            slide1Desc: $('slide1Desc').value.trim(),
            slide1Desc_ru: $('slide1DescRu').value.trim(),
            slide2Title: $('slide2Title').value.trim(),
            slide2Title_ru: $('slide2TitleRu').value.trim(),
            slide2Desc: $('slide2Desc').value.trim(),
            slide2Desc_ru: $('slide2DescRu').value.trim(),
            aboutSub: $('aboutSub').value.trim(),
            aboutSub_ru: $('aboutSubRu').value.trim(),
            aboutTitle: $('aboutTitle').value.trim(),
            aboutTitle_ru: $('aboutTitleRu').value.trim(),
            aboutText1: $('aboutText1').value.trim(),
            aboutText1_ru: $('aboutText1Ru').value.trim(),
            aboutText2: $('aboutText2').value.trim(),
            aboutText2_ru: $('aboutText2Ru').value.trim(),
            contactPhone: $('contactPhone').value.trim(),
            contactAddress: $('contactAddress').value.trim(),
            contactEmail: $('contactEmailSettings').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('setari').doc('pagina_principala').set(data, { merge: true });
            showToast(window.t('dash_js_settings_saved'), 'success');
        } catch (err) {
            console.error('Error saving settings:', err);
            showToast(window.t('dash_js_settings_error'), 'error');
        } finally {
            saveContentBtn.disabled = false;
            saveContentBtn.innerHTML = `<i class="fas fa-save me-2"></i> ${window.t('dash_save_btn')}`;
        }
    });

    // Pornește buclele de interogare în fundal pentru a menține actualizate comenzile și mesajele din panou
    function startLivePolling() {
        setInterval(() => {
            const activeTab = document.querySelector('.admin-tab.active').getAttribute('data-tab');
            if (activeTab === 'comenzi') {
                loadOrders();
            } else {
                db.collection('comenzi').where('status', '==', 'nouă').get().then(snap => {
                    const count = snap.size;
                    if (count > 0) {
                        ordersCountBadge.textContent = count;
                        ordersCountBadge.style.display = 'inline-block';
                    } else {
                        ordersCountBadge.style.display = 'none';
                    }
                }).catch(err => console.error(err));
            }
        }, 15000);
        
        setInterval(() => {
            const activeTab = document.querySelector('.admin-tab.active').getAttribute('data-tab');
            if (activeTab === 'mesaje') {
                loadMessages();
            } else {
                db.collection('mesaje').where('citit', '==', false).get().then(snap => {
                    const count = snap.size;
                    $('statMessages').textContent = count;
                    if (count > 0) {
                        messagesCountBadge.textContent = count;
                        messagesCountBadge.style.display = 'inline-block';
                    } else {
                        messagesCountBadge.style.display = 'none';
                    }
                }).catch(err => console.error(err));
            }
        }, 30000);
    }

    // Funcție utilitară pentru a afișa notificări de succes sau eroare pe ecran
    function showToast(message, type = 'success') {
        const toast = $('toast');
        const icon = toast.querySelector('.toast-icon');
        const msg = toast.querySelector('.toast-message');

        toast.className = `toast ${type}`;
        icon.className = `toast-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        msg.textContent = message;
        toast.style.display = 'flex';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3500);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return escapeHtml(str)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    document.addEventListener('langchange', function () {
        if (auth && auth.currentUser) {
            adminEmailDisplay.innerHTML = `<i class="fas fa-user-circle me-1"></i> ${window.t('dash_js_connected_as')} <strong>${auth.currentUser.email}</strong>`;
            loadProducts();
            loadOrders();
            loadMessages();
            loadContentSettings();
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === productModal) productModal.style.display = 'none';
        if (e.target === deleteModal) deleteModal.style.display = 'none';
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            productModal.style.display = 'none';
            deleteModal.style.display = 'none';
        }
    });

})();
