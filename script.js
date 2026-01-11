// Модуль для управления состоянием приложения
const AppState = (function() {
    let cart = [];
    let appliedPromo = null;
    let pendingRemovals = new Map(); // Для хранения удаляемых товаров с таймерами
    
    // Загружаем корзину из localStorage
    function loadCart() {
        const savedCart = localStorage.getItem('redshop_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        updateCartCount();
    }
    
    // Сохраняем корзину в localStorage
    function saveCart() {
        localStorage.setItem('redshop_cart', JSON.stringify(cart));
        updateCartCount();
    }
    
    // Обновляем счетчик товаров в корзине
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = totalItems;
    }
    
    // Добавляем товар в корзину
    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                quantity: 1,
                image: product.image,
                category: product.category
            });
        }
        
        saveCart();
        renderCart();
        showNotification(`${product.title} добавлен в корзину`, 'success');
    }
    
    // Удаляем товар из корзины с возможностью отмены
    function removeFromCartWithUndo(productId) {
        const itemIndex = cart.findIndex(item => item.id === productId);
        
        if (itemIndex === -1) return;
        
        const item = cart[itemIndex];
        
        // Устанавливаем таймер на 3 секунды
        const removalTimer = setTimeout(() => {
            // Если таймер истек и пользователь не отменил удаление
            if (pendingRemovals.has(productId)) {
                cart.splice(itemIndex, 1);
                saveCart();
                renderCart();
                pendingRemovals.delete(productId);
            }
        }, 3000);
        
        // Сохраняем товар и таймер для возможной отмены
        pendingRemovals.set(productId, {
            item,
            index: itemIndex,
            timer: removalTimer
        });
        
        // Временно скрываем товар из отображения
        renderCart();
    }
    
    // Отмена удаления товара
    function undoRemoval(productId) {
        if (pendingRemovals.has(productId)) {
            const removal = pendingRemovals.get(productId);
            clearTimeout(removal.timer);
            pendingRemovals.delete(productId);
            
            // Товар уже в корзине (мы его не удаляли из массива), просто перерисовываем
            renderCart();
            showNotification('Удаление отменено', 'info');
        }
    }
    
    // Обновляем количество товара
    function updateQuantity(productId, newQuantity) {
        if (newQuantity < 1) {
            // Вместо немедленного удаления, используем удаление с возможностью отмены
            removeFromCartWithUndo(productId);
            return;
        }
        
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            saveCart();
            renderCart();
        }
    }
    
    // Применяем промокод
    function applyPromoCode(code) {
        // Если уже есть примененный промокод
        if (appliedPromo) {
            return { success: false, message: 'Промокод уже применен. Сначала удалите текущий промокод.' };
        }
        
        const promo = PROMO_CODES.find(p => p.code === code);
        
        if (!promo) {
            return { success: false, message: 'Промокод не найден' };
        }
        
        appliedPromo = promo;
        return { success: true, message: `Промокод "${promo.code}" применен! Скидка ${promo.discount}%` };
    }
    
    // Удаляем примененный промокод
    function removePromo() {
        if (appliedPromo) {
            const removedCode = appliedPromo.code;
            appliedPromo = null;
            return { success: true, message: `Промокод "${removedCode}" удален` };
        }
        return { success: false, message: 'Нет примененного промокода' };
    }
    
    // Очищаем промокод
    function clearPromo() {
        appliedPromo = null;
    }
    
    // Рассчитываем общую стоимость
    function calculateTotal() {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        let discount = 0;
        
        if (appliedPromo) {
            discount = subtotal * (appliedPromo.discount / 100);
        }
        
        const total = subtotal - discount;
        
        return {
            subtotal,
            discount,
            total
        };
    }
    
    // Очищаем корзину после покупки
    function clearCartAfterPurchase() {
        cart.length = 0;
        saveCart();
    }
    
    // Возвращаем публичные методы
    return {
        loadCart,
        addToCart,
        removeFromCartWithUndo,
        undoRemoval,
        updateQuantity,
        applyPromoCode,
        removePromo,
        clearPromo,
        calculateTotal,
        clearCartAfterPurchase,
        getCart: () => cart,
        getAppliedPromo: () => appliedPromo,
        getPendingRemovals: () => pendingRemovals
    };
})();

// Данные о товарах с изображениями и категориями
const PRODUCTS = [
    {
        id: 1,
        title: "Ноутбук Asus ZenBook Pro",
        description: "Мощный ноутбук для работы и творчества",
        fullDescription: "Ноутбук Asus ZenBook Pro 15 оснащен процессором Intel Core i7 11-го поколения, 16 ГБ оперативной памяти DDR4 и быстрым SSD накопителем на 1 ТБ. 15.6-дюймовый экран с разрешением 4K UHD обеспечивает невероятную детализацию изображения. Идеален для дизайнеров, программистов и всех, кто ценит производительность и качество.",
        price: 114990,
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "laptop",
        features: ["Процессор Intel Core i7", "16 ГБ оперативной памяти", "1 ТБ SSD", "Экран 4K UHD 15.6''", "Видеокарта NVIDIA GeForce RTX 3050"]
    },
    {
        id: 2,
        title: "Смартфон Samsung Galaxy S23 Ultra",
        description: "Флагманский смартфон с лучшей камерой",
        fullDescription: "Samsung Galaxy S23 Ultra — это абсолютный флагман с камерой на 200 Мп, которая позволяет делать невероятно детализированные снимки даже при слабом освещении. Мощный процессор Snapdragon 8 Gen 2 обеспечивает плавную работу любых приложений и игр. Стилус S Pen в комплекте открывает новые возможности для творчества и работы.",
        price: 99990,
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "phone",
        features: ["Камера 200 Мп", "Процессор Snapdragon 8 Gen 2", "12 ГБ оперативной памяти", "512 ГБ памяти", "Аккумулятор 5000 мАч"]
    },
    {
        id: 3,
        title: "Планшет Apple iPad Pro 12.9",
        description: "Профессиональный планшет для творчества",
        fullDescription: "iPad Pro 12.9 с чипом M2 обеспечивает невероятную производительность для профессиональных задач. Дисплей Liquid Retina XDR с технологией mini-LED предлагает невероятную яркость и контрастность. Идеален для дизайнеров, художников и всех, кто работает с графикой и видео. Поддерживает Apple Pencil 2-го поколения и Magic Keyboard.",
        price: 129990,
        image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "tablet",
        features: ["Чип Apple M2", "Дисплей Liquid Retina XDR 12.9''", "Поддержка Apple Pencil 2", "Камеры 12 Мп + 10 Мп", "До 10 часов работы"]
    },
    {
        id: 4,
        title: "Наушники Sony WH-1000XM5",
        description: "Беспроводные наушники с шумоподавлением",
        fullDescription: "Наушники Sony WH-1000XM5 оснащены системой шумоподавления нового поколения, которая адаптируется к окружающей обстановке. Автономность до 30 часов позволяет использовать их весь день без подзарядки. Фирменное приложение Sony Headphones Connect открывает дополнительные возможности настройки звука.",
        price: 34990,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "accessory",
        features: ["Активное шумоподавление", "Автономность 30 часов", "Качество звука Hi-Res", "Сенсорное управление", "Складывающаяся конструкция"]
    },
    {
        id: 5,
        title: "Умные часы Apple Watch Series 8",
        description: "Смарт-часы для здоровья и фитнеса",
        fullDescription: "Apple Watch Series 8 оснащены датчиками для мониторинга здоровья, включая измерение ЭКГ, уровня кислорода в крови и температуры тела. Фитнес-трекинг поддерживает более 50 видов активности. Уведомления о падении и экстренном SOS могут спасти жизнь в критической ситуации.",
        price: 45990,
        image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "accessory",
        features: ["ЭКГ и мониторинг кислорода", "Измерение температуры тела", "Более 50 фитнес-режимов", "Автономность 18 часов", "Водонепроницаемость 50м"]
    },
    {
        id: 6,
        title: "Ноутбук Apple MacBook Air M2",
        description: "Легкий и мощный ноутбук Apple",
        fullDescription: "MacBook Air с чипом M2 сочетает невероятную производительность с ультрапортативным дизайном. Тонкий и легкий корпус скрывает мощный процессор, способный справляться с профессиональными задачами. Дисплей Liquid Retina с узкими рамками предлагает невероятное качество изображения. Идеален для работы в дороге.",
        price: 119990,
        image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "laptop",
        features: ["Чип Apple M2", "Дисплей Liquid Retina 13.6''", "До 18 часов работы", "8 ГБ оперативной памяти", "512 ГБ SSD"]
    },
    {
        id: 7,
        title: "Смартфон iPhone 14 Pro Max",
        description: "Инновационный iPhone с Dynamic Island",
        fullDescription: "iPhone 14 Pro Max оснащен революционной камерой на 48 Мп и технологией Dynamic Island, которая преображает уведомления и взаимодействие с приложениями. Мощный процессор A16 Bionic обеспечивает невероятную производительность. Дисплей Super Retina XDR с технологией ProMotion адаптирует частоту обновления до 120 Гц.",
        price: 129990,
        image: "https://at-store.ru/uploadedFiles/eshopimages/big/IMG_0228.JPG",
        category: "phone",
        features: ["Камера 48 Мп", "Процессор A16 Bionic", "Dynamic Island", "Дисплей Super Retina XDR", "Защита от воды IP68"]
    },
    {
        id: 8,
        title: "Игровая консоль PlayStation 5",
        description: "Новое поколение игровых консолей",
        fullDescription: "PlayStation 5 предлагает невероятную производительность для игр нового поколения с поддержкой трассировки лучей в реальном времени и частотой до 120 кадров в секунду. Адаптивные триггеры и тактильная отдача создают новый уровень погружения. Совместима с играми PlayStation 4 благодаря обратной совместимости.",
        price: 64990,
        image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        category: "accessory",
        features: ["Трассировка лучей в реальном времени", "До 120 кадров в секунду", "Адаптивные триггеры", "Тактильная отдача", "825 ГБ SSD"]
    }
];

// Промокоды
const PROMO_CODES = [
    { code: "REDSHOP10", discount: 10, description: "Скидка 10% на все товары" },
    { code: "TECH20", discount: 20, description: "Скидка 20% на электронику" },
    { code: "NEWYEAR2023", discount: 15, description: "Скидка 15% для праздничных покупок" }
];

// Вспомогательные функции
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
        color: white;
        padding: 15px 20px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Фильтрация товаров
function filterProducts(category) {
    const productsGrid = document.getElementById('products-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Обновляем активную кнопку фильтра
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Фильтруем товары
    const filteredProducts = category === 'all' 
        ? PRODUCTS 
        : PRODUCTS.filter(product => product.category === category);
    
    renderProducts(filteredProducts);
}

// Рендеринг товаров
function renderProducts(products = PRODUCTS) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card fade-in';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-actions">
                    <button class="add-to-cart" data-id="${product.id}">
                        <i class="fas fa-cart-plus"></i>
                        В корзину
                    </button>
                    <button class="view-details" data-id="${product.id}">
                        <i class="fas fa-eye"></i>
                        Подробнее
                    </button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
    
    // Добавляем обработчики событий для кнопок "В корзину"
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = parseInt(this.getAttribute('data-id'));
            const product = PRODUCTS.find(p => p.id === productId);
            if (product) {
                AppState.addToCart(product);
            }
        });
    });
    
    // Добавляем обработчики событий для кнопок "Подробнее"
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = parseInt(this.getAttribute('data-id'));
            showProductDetail(productId);
        });
    });
    
    // Добавляем обработчик клика по карточке товара
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function() {
            const productId = parseInt(this.querySelector('.add-to-cart').getAttribute('data-id'));
            showProductDetail(productId);
        });
    });
}

// Показать детали товара
function showProductDetail(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    
    const detailContent = document.getElementById('product-detail-content');
    detailContent.innerHTML = `
        <div class="product-detail-image">
            <img src="${product.image}" alt="${product.title}">
        </div>
        <div class="product-detail-info">
            <h2 class="product-detail-title">${product.title}</h2>
            <div class="product-detail-price">${formatPrice(product.price)}</div>
            <p class="product-detail-description">${product.fullDescription}</p>
            <div class="product-detail-features">
                <h4>Характеристики:</h4>
                <ul>
                    ${product.features.map(feature => `<li><i class="fas fa-check" style="color: var(--primary-color); margin-right: 8px;"></i>${feature}</li>`).join('')}
                </ul>
            </div>
            <div class="product-detail-actions">
                <button class="add-to-cart" data-id="${product.id}" style="flex: 1;">
                    <i class="fas fa-cart-plus"></i>
                    Добавить в корзину
                </button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки в модальном окне
    detailContent.querySelector('.add-to-cart').addEventListener('click', function() {
        AppState.addToCart(product);
        closeModal('product-detail-modal');
    });
    
    openModal('product-detail-modal');
}

// Рендеринг корзины
function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cart = AppState.getCart();
    const pendingRemovals = AppState.getPendingRemovals();
    
    if (cart.length === 0 && pendingRemovals.size === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
            </div>
        `;
    } else {
        cartItemsContainer.innerHTML = '';
        
        // Показываем товары в корзине
        cart.forEach(item => {
            const isPendingRemoval = pendingRemovals.has(item.id);
            
            const cartItem = document.createElement('div');
            cartItem.className = `cart-item fade-in ${isPendingRemoval ? 'removing' : ''}`;
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn minus" data-id="${item.id}">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    <button class="remove-item" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${isPendingRemoval ? '<button class="undo-remove" data-id="' + item.id + '">Отменить удаление</button>' : ''}
            `;
            cartItemsContainer.appendChild(cartItem);
        });
        
        // Добавляем обработчики событий для кнопок в корзине
        document.querySelectorAll('.quantity-btn.minus').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const item = cart.find(item => item.id === productId);
                if (item) {
                    AppState.updateQuantity(productId, item.quantity - 1);
                }
            });
        });
        
        document.querySelectorAll('.quantity-btn.plus').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const item = cart.find(item => item.id === productId);
                if (item) {
                    AppState.updateQuantity(productId, item.quantity + 1);
                }
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                AppState.removeFromCartWithUndo(productId);
            });
        });
        
        // Добавляем обработчики для кнопок отмены удаления
        document.querySelectorAll('.undo-remove').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                AppState.undoRemoval(productId);
            });
        });
    }
    
    // Обновляем итоговую стоимость
    updateCartSummary();
    
    // Обновляем отображение промокода
    updatePromoDisplay();
}

// Обновление итоговой стоимости в корзине
function updateCartSummary() {
    const totals = AppState.calculateTotal();
    
    document.getElementById('subtotal').textContent = formatPrice(totals.subtotal);
    document.getElementById('discount').textContent = formatPrice(totals.discount);
    document.getElementById('total').textContent = formatPrice(totals.total);
}

// Обновление отображения промокода
function updatePromoDisplay() {
    const appliedPromo = AppState.getAppliedPromo();
    const removePromoBtn = document.getElementById('remove-promo');
    const promoMessage = document.getElementById('promo-message');
    
    if (appliedPromo) {
        removePromoBtn.style.display = 'block';
        promoMessage.textContent = `Применен промокод "${appliedPromo.code}" (скидка ${appliedPromo.discount}%)`;
        promoMessage.className = 'promo-message promo-success';
    } else {
        removePromoBtn.style.display = 'none';
        promoMessage.textContent = '';
        promoMessage.className = 'promo-message';
    }
}

// Работа с модальными окнами
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Показать окно оплаты
function showPaymentModal() {
    const totals = AppState.calculateTotal();
    
    document.getElementById('payment-subtotal').textContent = formatPrice(totals.subtotal);
    document.getElementById('payment-discount').textContent = formatPrice(totals.discount);
    document.getElementById('payment-total').textContent = formatPrice(totals.total);
    
    // Сбрасываем выбранный способ оплаты
    document.querySelectorAll('.payment-method').forEach(method => {
        method.classList.remove('selected');
    });
    
    openModal('payment-modal');
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('redshop_theme', 'light');
    } else {
        body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('redshop_theme', 'dark');
    }
}

// Загрузка сохраненной темы
function loadTheme() {
    const savedTheme = localStorage.getItem('redshop_theme');
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        document.body.classList.remove('dark-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Инициализация приложения
function initApp() {
    // Загружаем корзину и тему из localStorage
    AppState.loadCart();
    loadTheme();
    
    // Рендерим товары и корзину
    renderProducts();
    renderCart();
    
    // Обработчик для применения промокода
    document.getElementById('apply-promo').addEventListener('click', function() {
        const promoCode = document.getElementById('promo-code').value.trim();
        
        if (!promoCode) {
            showNotification('Введите промокод', 'error');
            return;
        }
        
        const result = AppState.applyPromoCode(promoCode);
        
        if (result.success) {
            showNotification(result.message, 'success');
            renderCart();
            document.getElementById('promo-code').value = '';
        } else {
            showNotification(result.message, 'error');
        }
    });
    
    // Обработчик для удаления промокода
    document.getElementById('remove-promo').addEventListener('click', function() {
        const result = AppState.removePromo();
        
        if (result.success) {
            showNotification(result.message, 'info');
            renderCart();
        }
    });
    
    // Обработчик для кнопки оформления заказа
    document.getElementById('checkout-btn').addEventListener('click', function() {
        const cart = AppState.getCart();
        
        if (cart.length === 0) {
            showNotification('Добавьте товары в корзину для оформления заказа', 'error');
            return;
        }
        
        showPaymentModal();
    });
    
    // Обработчик для выбора способа оплаты
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
    
    // Обработчик для подтверждения оплаты
    document.getElementById('confirm-payment').addEventListener('click', function() {
        const selectedMethod = document.querySelector('.payment-method.selected');
        
        if (!selectedMethod) {
            showNotification('Выберите способ оплаты', 'error');
            return;
        }
        
        // Показываем успешное сообщение
        document.getElementById('payment-form').style.display = 'none';
        document.getElementById('payment-success').style.display = 'block';
        
        // Генерируем случайный номер заказа
        document.getElementById('order-number').textContent = Math.floor(Math.random() * 90000) + 10000;
    });
    
    // Обработчик для продолжения покупок
    document.getElementById('continue-shopping').addEventListener('click', function() {
        // Очищаем корзину
        AppState.clearCartAfterPurchase();
        
        // Очищаем промокод
        AppState.clearPromo();
        document.getElementById('promo-code').value = '';
        
        // Закрываем модальное окно
        closeModal('payment-modal');
        
        // Возвращаемся в начало страницы
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Перерисовываем корзину
        renderCart();
        
        // Показываем уведомление
        showNotification('Заказ успешно оформлен! Спасибо за покупку!', 'success');
    });
    
    // Обработчики для закрытия модальных окон
    document.getElementById('close-detail-modal').addEventListener('click', function() {
        closeModal('product-detail-modal');
    });
    
    document.getElementById('close-payment-modal').addEventListener('click', function() {
        closeModal('payment-modal');
        // Сбрасываем форму оплаты
        document.getElementById('payment-form').style.display = 'block';
        document.getElementById('payment-success').style.display = 'none';
    });
    
    // Закрытие модальных окон при клике вне контента
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                const modalId = this.id;
                closeModal(modalId);
                
                // Сбрасываем форму оплаты
                if (modalId === 'payment-modal') {
                    document.getElementById('payment-form').style.display = 'block';
                    document.getElementById('payment-success').style.display = 'none';
                }
            }
        });
    });
    
    // Обработчик для переключения темы
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Обработчики для фильтров
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            filterProducts(filter);
        });
    });
    
    // Обработчик для иконки корзины в шапке
    document.getElementById('cart-icon').addEventListener('click', function() {
        const cartSidebar = document.querySelector('.cart-sidebar');
        cartSidebar.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    });
}

// Запускаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);