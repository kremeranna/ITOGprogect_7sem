// ============================================
// МОДУЛЬ ДЛЯ УПРАВЛЕНИЯ СОСТОЯНИЕМ ПРИЛОЖЕНИЯ
// Используем паттерн "Модуль" для инкапсуляции состояния и методов
// ============================================
const AppState = (function() {
    // Массив товаров в корзине
    let cart = [];
    // Текущий примененный промокод (null если не применен)
    let appliedPromo = null;
    // Map для хранения товаров, которые находятся в процессе удаления
    // Ключ - id товара, значение - объект с таймером и данными товара
    let pendingRemovals = new Map();
    
    // ============================================
    // ЗАГРУЗКА КОРЗИНЫ ИЗ LOCALSTORAGE
    // Восстанавливаем состояние корзины при загрузке страницы
    // ============================================
    function loadCart() {
        // Получаем сохраненную корзину из localStorage по ключу 'redshop_cart'
        const savedCart = localStorage.getItem('redshop_cart');
        // Если данные есть, парсим JSON и сохраняем в cart
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        // Обновляем счетчик товаров в корзине (иконка в шапке)
        updateCartCount();
    }
    
    // ============================================
    // СОХРАНЕНИЕ КОРЗИНЫ В LOCALSTORAGE
    // Сохраняем текущее состояние корзины для восстановления при следующем посещении
    // ============================================
    function saveCart() {
        // Преобразуем массив cart в JSON и сохраняем в localStorage
        localStorage.setItem('redshop_cart', JSON.stringify(cart));
        // Обновляем счетчик товаров
        updateCartCount();
    }
    
    // ============================================
    // ОБНОВЛЕНИЕ СЧЕТЧИКА ТОВАРОВ В КОРЗИНЕ
    // Считает общее количество товаров в корзине (сумма quantity всех товаров)
    // ============================================
    function updateCartCount() {
        // Используем reduce для подсчета общего количества товаров
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        // Обновляем текст в элементе с id 'cart-count'
        document.getElementById('cart-count').textContent = totalItems;
    }
    
    // ============================================
    // ДОБАВЛЕНИЕ ТОВАРА В КОРЗИНУ
    // Добавляет товар или увеличивает его количество если уже есть в корзине
    // ============================================
    function addToCart(product) {
        // Ищем, есть ли уже такой товар в корзине
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            // Если товар уже есть, увеличиваем количество на 1
            existingItem.quantity += 1;
        } else {
            // Если товара нет, добавляем новый объект товара в корзину
            cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                quantity: 1,
                image: product.image,
                category: product.category
            });
        }
        
        // Сохраняем обновленную корзину в localStorage
        saveCart();
        // Перерисовываем содержимое корзины на странице
        renderCart();
        // Показываем уведомление об успешном добавлении
        showNotification(`${product.title} добавлен в корзину`, 'success');
    }
    
    // ============================================
    // УДАЛЕНИЕ ТОВАРА С ВОЗМОЖНОСТЬЮ ОТМЕНЫ
    // Удаляет товар после 3 секунд, показывая кнопку "Отменить удаление"
    // ============================================
    function removeFromCartWithUndo(productId) {
        // Находим индекс товара в массиве cart
        const itemIndex = cart.findIndex(item => item.id === productId);
        
        // Если товар не найден, выходим из функции
        if (itemIndex === -1) return;
        
        // Сохраняем сам товар для возможного восстановления
        const item = cart[itemIndex];
        
        // Устанавливаем таймер на 3 секунды (3000 миллисекунд)
        const removalTimer = setTimeout(() => {
            // Проверяем, все еще ли товар в pendingRemovals (пользователь не отменил удаление)
            if (pendingRemovals.has(productId)) {
                // Удаляем товар из массива cart по найденному индексу
                cart.splice(itemIndex, 1);
                // Сохраняем изменения в localStorage
                saveCart();
                // Перерисовываем корзину
                renderCart();
                // Удаляем запись о товаре из pendingRemovals
                pendingRemovals.delete(productId);
            }
        }, 3000);
        
        // Сохраняем товар и таймер в Map для возможной отмены удаления
        pendingRemovals.set(productId, {
            item,          // Сам товар
            index: itemIndex,  // Его индекс в массиве
            timer: removalTimer  // Таймер для отмены
        });
        
        // Перерисовываем корзину, чтобы показать кнопку "Отменить удаление"
        renderCart();
    }
    
    // ============================================
    // ОТМЕНА УДАЛЕНИЯ ТОВАРА
    // Отменяет запланированное удаление товара
    // ============================================
    function undoRemoval(productId) {
        // Проверяем, есть ли товар в списке ожидающих удаления
        if (pendingRemovals.has(productId)) {
            // Получаем данные об удалении
            const removal = pendingRemovals.get(productId);
            // Останавливаем таймер, чтобы удаление не произошло
            clearTimeout(removal.timer);
            // Удаляем запись из pendingRemovals
            pendingRemovals.delete(productId);
            
            // Товар уже в корзине (мы его не удаляли из массива), просто перерисовываем
            renderCart();
            // Показываем уведомление об отмене удаления
            showNotification('Удаление отменено', 'info');
        }
    }
    
    // ============================================
    // ОБНОВЛЕНИЕ КОЛИЧЕСТВА ТОВАРА
    // Изменяет количество конкретного товара в корзине
    // ============================================
    function updateQuantity(productId, newQuantity) {
        // Если новое количество меньше 1, инициируем удаление с возможностью отмены
        if (newQuantity < 1) {
            removeFromCartWithUndo(productId);
            return;
        }
        
        // Находим товар в корзине
        const item = cart.find(item => item.id === productId);
        if (item) {
            // Обновляем количество
            item.quantity = newQuantity;
            // Сохраняем изменения
            saveCart();
            // Перерисовываем корзину
            renderCart();
        }
    }
    
    // ============================================
    // ПРИМЕНЕНИЕ ПРОМОКОДА
    // Проверяет и применяет промокод, если он действителен
    // ============================================
    function applyPromoCode(code) {
        // Если уже есть примененный промокод, возвращаем ошибку
        if (appliedPromo) {
            return { 
                success: false, 
                message: 'Промокод уже применен. Сначала удалите текущий промокод.' 
            };
        }
        
        // Ищем промокод в массиве PROMO_CODES
        const promo = PROMO_CODES.find(p => p.code === code);
        
        // Если промокод не найден, возвращаем ошибку
        if (!promo) {
            return { success: false, message: 'Промокод не найден' };
        }
        
        // Сохраняем примененный промокод
        appliedPromo = promo;
        // Возвращаем успешный результат
        return { 
            success: true, 
            message: `Промокод "${promo.code}" применен! Скидка ${promo.discount}%` 
        };
    }
    
    // ============================================
    // УДАЛЕНИЕ ПРИМЕНЕННОГО ПРОМОКОДА
    // Удаляет текущий примененный промокод
    // ============================================
    function removePromo() {
        // Если промокод применен, удаляем его
        if (appliedPromo) {
            const removedCode = appliedPromo.code;
            appliedPromo = null;
            return { 
                success: true, 
                message: `Промокод "${removedCode}" удален` 
            };
        }
        // Если промокод не был применен, возвращаем ошибку
        return { 
            success: false, 
            message: 'Нет примененного промокода' 
        };
    }
    
    // ============================================
    // ОЧИСТКА ПРОМОКОДА
    // Просто устанавливает appliedPromo в null
    // Используется при оформлении заказа
    // ============================================
    function clearPromo() {
        appliedPromo = null;
    }
    
    // ============================================
    // РАСЧЕТ ОБЩЕЙ СТОИМОСТИ
    // Рассчитывает промежуточные итоги и общую сумму
    // ============================================
    function calculateTotal() {
        // Считаем сумму всех товаров (цена × количество)
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        let discount = 0;
        
        // Если применен промокод, рассчитываем скидку
        if (appliedPromo) {
            discount = subtotal * (appliedPromo.discount / 100);
        }
        
        // Итоговая сумма после скидки
        const total = subtotal - discount;
        
        // Возвращаем объект с расчетами
        return {
            subtotal,  // Сумма без скидки
            discount,  // Сумма скидки
            total      // Итоговая сумма к оплате
        };
    }
    
    // ============================================
    // ОЧИСТКА КОРЗИНЫ ПОСЛЕ ПОКУПКИ
    // Удаляет все товары из корзины после успешного оформления заказа
    // ============================================
    function clearCartAfterPurchase() {
        // Очищаем массив cart
        cart.length = 0;
        // Сохраняем пустую корзину в localStorage
        saveCart();
    }
    
    // ============================================
    // ПУБЛИЧНЫЕ МЕТОДЫ МОДУЛЯ
    // Возвращаем объект с методами, доступными извне модуля
    // ============================================
    return {
        loadCart,                  // Загрузка корзины из localStorage
        addToCart,                 // Добавление товара в корзину
        removeFromCartWithUndo,    // Удаление товара с возможностью отмены
        undoRemoval,               // Отмена удаления товара
        updateQuantity,            // Изменение количества товара
        applyPromoCode,            // Применение промокода
        removePromo,               // Удаление примененного промокода
        clearPromo,                // Очистка промокода
        calculateTotal,            // Расчет общей стоимости
        clearCartAfterPurchase,    // Очистка корзины после покупки
        
        // Геттеры для получения текущего состояния
        getCart: () => cart,                       // Получить текущую корзину
        getAppliedPromo: () => appliedPromo,       // Получить примененный промокод
        getPendingRemovals: () => pendingRemovals  // Получить товары в процессе удаления
    };
})();

// ============================================
// МАССИВ ТОВАРОВ ДЛЯ МАГАЗИНА
// Каждый товар имеет полное описание, характеристики, изображение и категорию
// ============================================
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

// ============================================
// МАССИВ ДОСТУПНЫХ ПРОМОКОДОВ
// Каждый промокод имеет код, размер скидки и описание
// ============================================
const PROMO_CODES = [
    { code: "REDSHOP10", discount: 10, description: "Скидка 10% на все товары" },
    { code: "TECH20", discount: 20, description: "Скидка 20% на электронику" },
    { code: "NEWYEAR2025", discount: 15, description: "Скидка 15% для праздничных покупок" }
];

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

// ============================================
// ФОРМАТИРОВАНИЕ ЦЕНЫ
// Преобразует число в формат валюты (рубли)
// ============================================
function formatPrice(price) {
    // Используем Intl.NumberFormat для форматирования валюты
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0  // Без копеек
    }).format(price);
}

// ============================================
// ПОКАЗ УВЕДОМЛЕНИЯ
// Создает временное всплывающее уведомление
// ============================================
function showNotification(message, type = 'success') {
    // Создаем новый div элемент для уведомления
    const notification = document.createElement('div');
    // Устанавливаем текст уведомления
    notification.textContent = message;
    // Задаем стили для уведомления
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
    
    // Добавляем уведомление на страницу
    document.body.appendChild(notification);
    
    // Устанавливаем таймер для автоматического скрытия уведомления через 3 секунды
    setTimeout(() => {
        // Плавно скрываем уведомление
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        // Удаляем элемент из DOM после завершения анимации
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ============================================
// ФИЛЬТРАЦИЯ ТОВАРОВ ПО КАТЕГОРИИ
// Фильтрует товары по выбранной категории и обновляет отображение
// ============================================
function filterProducts(category) {
    // Получаем контейнер для товаров
    const productsGrid = document.getElementById('products-grid');
    // Получаем все кнопки фильтров
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Обновляем активную кнопку фильтра
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Фильтруем товары в зависимости от выбранной категории
    const filteredProducts = category === 'all' 
        ? PRODUCTS  // Если выбраны все товары, показываем все
        : PRODUCTS.filter(product => product.category === category);  // Иначе фильтруем по категории
    
    // Отрисовываем отфильтрованные товары
    renderProducts(filteredProducts);
}

// ============================================
// ОТРИСОВКА ТОВАРОВ НА СТРАНИЦЕ
// Создает HTML-карточки для каждого товара и добавляет их в контейнер
// ============================================
function renderProducts(products = PRODUCTS) {
    // Получаем контейнер для товаров
    const productsGrid = document.getElementById('products-grid');
    // Очищаем контейнер перед добавлением новых товаров
    productsGrid.innerHTML = '';
    
    // Для каждого товара создаем карточку
    products.forEach(product => {
        // Создаем div элемент для карточки товара
        const productCard = document.createElement('div');
        // Добавляем CSS классы
        productCard.className = 'product-card fade-in';
        // Заполняем HTML содержимое карточки
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
        
        // Добавляем карточку товара в контейнер
        productsGrid.appendChild(productCard);
    });
    
    // ============================================
    // ДОБАВЛЕНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ ДЛЯ КНОПОК "В КОРЗИНУ"
    // ============================================
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function(e) {
            // Останавливаем всплытие события, чтобы не сработал клик по карточке
            e.stopPropagation();
            // Получаем id товара из атрибута data-id
            const productId = parseInt(this.getAttribute('data-id'));
            // Находим товар в массиве PRODUCTS по id
            const product = PRODUCTS.find(p => p.id === productId);
            // Если товар найден, добавляем его в корзину
            if (product) {
                AppState.addToCart(product);
            }
        });
    });
    
    // ============================================
    // ДОБАВЛЕНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ ДЛЯ КНОПОК "ПОДРОБНЕЕ"
    // ============================================
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function(e) {
            // Останавливаем всплытие события
            e.stopPropagation();
            // Получаем id товара
            const productId = parseInt(this.getAttribute('data-id'));
            // Показываем модальное окно с деталями товара
            showProductDetail(productId);
        });
    });
    
    // ============================================
    // ДОБАВЛЕНИЕ ОБРАБОТЧИКА КЛИКА ПО КАРТОЧКЕ ТОВАРА
    // ============================================
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function() {
            // Получаем id товара из кнопки "В корзину" внутри карточки
            const productId = parseInt(this.querySelector('.add-to-cart').getAttribute('data-id'));
            // Показываем модальное окно с деталями товара
            showProductDetail(productId);
        });
    });
}

// ============================================
// ПОКАЗ ДЕТАЛЕЙ ТОВАРА В МОДАЛЬНОМ ОКНЕ
// Заполняет и открывает модальное окно с подробной информацией о товаре
// ============================================
function showProductDetail(productId) {
    // Находим товар в массиве PRODUCTS по id
    const product = PRODUCTS.find(p => p.id === productId);
    // Если товар не найден, выходим из функции
    if (!product) return;
    
    // Получаем контейнер для деталей товара в модальном окне
    const detailContent = document.getElementById('product-detail-content');
    // Заполняем HTML содержимое модального окна
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
    
    // ============================================
    // ДОБАВЛЕНИЕ ОБРАБОТЧИКА ДЛЯ КНОПКИ "ДОБАВИТЬ В КОРЗИНУ" В МОДАЛЬНОМ ОКНЕ
    // ============================================
    detailContent.querySelector('.add-to-cart').addEventListener('click', function() {
        // Добавляем товар в корзину
        AppState.addToCart(product);
        // Закрываем модальное окно
        closeModal('product-detail-modal');
    });
    
    // Открываем модальное окно
    openModal('product-detail-modal');
}

// ============================================
// ОТРИСОВКА КОРЗИНЫ
// Создает HTML-элементы для каждого товара в корзине и обновляет отображение
// ============================================
function renderCart() {
    // Получаем контейнер для товаров в корзине
    const cartItemsContainer = document.getElementById('cart-items');
    // Получаем текущую корзину и список товаров в процессе удаления
    const cart = AppState.getCart();
    const pendingRemovals = AppState.getPendingRemovals();
    
    // Проверяем, пуста ли корзина и нет ли товаров в процессе удаления
    if (cart.length === 0 && pendingRemovals.size === 0) {
        // Показываем сообщение о пустой корзине
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
            </div>
        `;
    } else {
        // Очищаем контейнер перед добавлением новых элементов
        cartItemsContainer.innerHTML = '';
        
        // Для каждого товара в корзине создаем элемент
        cart.forEach(item => {
            // Проверяем, находится ли товар в процессе удаления
            const isPendingRemoval = pendingRemovals.has(item.id);
            
            // Создаем div элемент для товара в корзине
            const cartItem = document.createElement('div');
            // Добавляем CSS классы (если товар в процессе удаления, добавляем класс 'removing')
            cartItem.className = `cart-item fade-in ${isPendingRemoval ? 'removing' : ''}`;
            // Заполняем HTML содержимое
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
            // Добавляем элемент товара в контейнер
            cartItemsContainer.appendChild(cartItem);
        });
        
        // ============================================
        // ДОБАВЛЕНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ ДЛЯ КНОПОК В КОРЗИНЕ
        // ============================================
        
        // Обработчик для кнопки уменьшения количества (-)
        document.querySelectorAll('.quantity-btn.minus').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const item = cart.find(item => item.id === productId);
                if (item) {
                    // Уменьшаем количество на 1
                    AppState.updateQuantity(productId, item.quantity - 1);
                }
            });
        });
        
        // Обработчик для кнопки увеличения количества (+)
        document.querySelectorAll('.quantity-btn.plus').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const item = cart.find(item => item.id === productId);
                if (item) {
                    // Увеличиваем количество на 1
                    AppState.updateQuantity(productId, item.quantity + 1);
                }
            });
        });
        
        // Обработчик для кнопки удаления товара (корзина)
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                // Инициируем удаление с возможностью отмены
                AppState.removeFromCartWithUndo(productId);
            });
        });
        
        // Обработчик для кнопки "Отменить удаление"
        document.querySelectorAll('.undo-remove').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                // Отменяем удаление товара
                AppState.undoRemoval(productId);
            });
        });
    }
    
    // Обновляем итоговую стоимость в корзине
    updateCartSummary();
    // Обновляем отображение промокода
    updatePromoDisplay();
}

// ============================================
// ОБНОВЛЕНИЕ ИТОГОВОЙ СТОИМОСТИ В КОРЗИНЕ
// Рассчитывает и обновляет суммы в блоке итогов
// ============================================
function updateCartSummary() {
    // Получаем расчеты стоимости
    const totals = AppState.calculateTotal();
    
    // Обновляем соответствующие элементы на странице
    document.getElementById('subtotal').textContent = formatPrice(totals.subtotal);
    document.getElementById('discount').textContent = formatPrice(totals.discount);
    document.getElementById('total').textContent = formatPrice(totals.total);
}

// ============================================
// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ПРОМОКОДА
// Показывает/скрывает кнопку удаления промокода и сообщение о примененном промокоде
// ============================================
function updatePromoDisplay() {
    // Получаем текущий примененный промокод
    const appliedPromo = AppState.getAppliedPromo();
    // Получаем элементы DOM
    const removePromoBtn = document.getElementById('remove-promo');
    const promoMessage = document.getElementById('promo-message');
    
    // Если промокод применен
    if (appliedPromo) {
        // Показываем кнопку удаления промокода
        removePromoBtn.style.display = 'block';
        // Устанавливаем текст сообщения
        promoMessage.textContent = `Применен промокод "${appliedPromo.code}" (скидка ${appliedPromo.discount}%)`;
        // Добавляем CSS класс для стилизации успешного сообщения
        promoMessage.className = 'promo-message promo-success';
    } else {
        // Скрываем кнопку удаления промокода
        removePromoBtn.style.display = 'none';
        // Очищаем текст сообщения
        promoMessage.textContent = '';
        // Сбрасываем CSS класс
        promoMessage.className = 'promo-message';
    }
}

// ============================================
// РАБОТА С МОДАЛЬНЫМИ ОКНАМИ
// ============================================

// ============================================
// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА
// Показывает модальное окно и блокирует прокрутку страницы
// ============================================
function openModal(modalId) {
    // Находим модальное окно по id
    const modal = document.getElementById(modalId);
    // Показываем модальное окно (flex для центрирования)
    modal.style.display = 'flex';
    // Блокируем прокрутку страницы
    document.body.style.overflow = 'hidden';
}

// ============================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
// Скрывает модальное окно и восстанавливает прокрутку страницы
// ============================================
function closeModal(modalId) {
    // Находим модальное окно по id
    const modal = document.getElementById(modalId);
    // Скрываем модальное окно
    modal.style.display = 'none';
    // Восстанавливаем прокрутку страницы
    document.body.style.overflow = 'auto';
}

// ============================================
// ПОКАЗ ОКНА ОПЛАТЫ
// Заполняет и открывает модальное окно оформления заказа
// ============================================
function showPaymentModal() {
    // Получаем расчеты стоимости
    const totals = AppState.calculateTotal();
    
    // Обновляем суммы в модальном окне оплаты
    document.getElementById('payment-subtotal').textContent = formatPrice(totals.subtotal);
    document.getElementById('payment-discount').textContent = formatPrice(totals.discount);
    document.getElementById('payment-total').textContent = formatPrice(totals.total);
    
    // Сбрасываем выбранный способ оплаты
    document.querySelectorAll('.payment-method').forEach(method => {
        method.classList.remove('selected');
    });
    
    // Открываем модальное окно оплаты
    openModal('payment-modal');
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (СВЕТЛАЯ/ТЕМНАЯ)
// Переключает тему и сохраняет выбор в localStorage
// ============================================
function toggleTheme() {
    // Получаем body элемент и кнопку переключения темы
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    // Проверяем, активна ли темная тема
    if (body.classList.contains('dark-theme')) {
        // Переключаем на светлую тему
        body.classList.remove('dark-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        // Сохраняем выбор в localStorage
        localStorage.setItem('redshop_theme', 'light');
    } else {
        // Переключаем на темную тему
        body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        // Сохраняем выбор в localStorage
        localStorage.setItem('redshop_theme', 'dark');
    }
}

// ============================================
// ЗАГРУЗКА СОХРАНЕННОЙ ТЕМЫ
// Восстанавливает тему из localStorage при загрузке страницы
// ============================================
function loadTheme() {
    // Получаем сохраненную тему из localStorage
    const savedTheme = localStorage.getItem('redshop_theme');
    // Получаем кнопку переключения темы и иконку
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    // Если сохранена темная тема
    if (savedTheme === 'dark') {
        // Применяем темную тему
        document.body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        // Применяем светлую тему (значение по умолчанию)
        document.body.classList.remove('dark-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// Устанавливает обработчики событий и запускает приложение
// ============================================
function initApp() {
    // Загружаем корзину и тему из localStorage
    AppState.loadCart();
    loadTheme();
    
    // Рендерим товары и корзину
    renderProducts();
    renderCart();
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ КНОПКИ ПРИМЕНЕНИЯ ПРОМОКОДА
    // ============================================
    document.getElementById('apply-promo').addEventListener('click', function() {
        // Получаем значение из поля ввода промокода
        const promoCode = document.getElementById('promo-code').value.trim();
        
        // Проверяем, не пустое ли поле
        if (!promoCode) {
            showNotification('Введите промокод', 'error');
            return;
        }
        
        // Пытаемся применить промокод
        const result = AppState.applyPromoCode(promoCode);
        
        // Если промокод успешно применен
        if (result.success) {
            // Показываем уведомление об успехе
            showNotification(result.message, 'success');
            // Перерисовываем корзину (обновятся суммы с учетом скидки)
            renderCart();
            // Очищаем поле ввода промокода
            document.getElementById('promo-code').value = '';
        } else {
            // Показываем уведомление об ошибке
            showNotification(result.message, 'error');
        }
    });
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ КНОПКИ УДАЛЕНИЯ ПРОМОКОДА
    // ============================================
    document.getElementById('remove-promo').addEventListener('click', function() {
        // Удаляем примененный промокод
        const result = AppState.removePromo();
        
        // Если промокод успешно удален
        if (result.success) {
            // Показываем информационное уведомление
            showNotification(result.message, 'info');
            // Перерисовываем корзину (обновятся суммы без скидки)
            renderCart();
        }
    });
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ КНОПКИ ОФОРМЛЕНИЯ ЗАКАЗА
    // ============================================
    document.getElementById('checkout-btn').addEventListener('click', function() {
        // Получаем текущую корзину
        const cart = AppState.getCart();
        
        // Проверяем, не пуста ли корзина
        if (cart.length === 0) {
            showNotification('Добавьте товары в корзину для оформления заказа', 'error');
            return;
        }
        
        // Показываем модальное окно оплаты
        showPaymentModal();
    });
    
    // ============================================
    // ОБРАБОТЧИКИ ДЛЯ ВЫБОРА СПОСОБА ОПЛАТЫ
    // ============================================
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            // Убираем класс 'selected' у всех способов оплаты
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('selected');
            });
            // Добавляем класс 'selected' к выбранному способу оплаты
            this.classList.add('selected');
        });
    });
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ КНОПКИ ПОДТВЕРЖДЕНИЯ ОПЛАТЫ
    // ============================================
    document.getElementById('confirm-payment').addEventListener('click', function() {
        // Проверяем, выбран ли способ оплаты
        const selectedMethod = document.querySelector('.payment-method.selected');
        
        if (!selectedMethod) {
            showNotification('Выберите способ оплаты', 'error');
            return;
        }
        
        // Показываем сообщение об успешной оплате
        document.getElementById('payment-form').style.display = 'none';
        document.getElementById('payment-success').style.display = 'block';
        
        // Генерируем случайный номер заказа от 10000 до 99999
        document.getElementById('order-number').textContent = Math.floor(Math.random() * 90000) + 10000;
    });
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ КНОПКИ "ПРОДОЛЖИТЬ ПОКУПКИ"
    // ============================================
    document.getElementById('continue-shopping').addEventListener('click', function() {
        // Очищаем корзину после успешной покупки
        AppState.clearCartAfterPurchase();
        
        // Очищаем промокод
        AppState.clearPromo();
        document.getElementById('promo-code').value = '';
        
        // Закрываем модальное окно оплаты
        closeModal('payment-modal');
        
        // Возвращаемся в начало страницы
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Перерисовываем корзину (будет показано сообщение о пустой корзине)
        renderCart();
        
        // Показываем уведомление об успешном оформлении заказа
        showNotification('Заказ успешно оформлен! Спасибо за покупку!', 'success');
    });
    
    // ============================================
    // ОБРАБОТЧИКИ ДЛЯ ЗАКРЫТИЯ МОДАЛЬНЫХ ОКОН
    // ============================================
    
    // Закрытие модального окна деталей товара
    document.getElementById('close-detail-modal').addEventListener('click', function() {
        closeModal('product-detail-modal');
    });
    
    // Закрытие модального окна оплаты
    document.getElementById('close-payment-modal').addEventListener('click', function() {
        closeModal('payment-modal');
        // Сбрасываем форму оплаты (показываем форму, скрываем сообщение об успехе)
        document.getElementById('payment-form').style.display = 'block';
        document.getElementById('payment-success').style.display = 'none';
    });
    
    // ============================================
    // ЗАКРЫТИЕ МОДАЛЬНЫХ ОКОН ПРИ КЛИКЕ ВНЕ КОНТЕНТА
    // ============================================
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            // Если клик был по самому модальному окну (фону), а не по контенту
            if (e.target === this) {
                const modalId = this.id;
                // Закрываем модальное окно
                closeModal(modalId);
                
                // Если закрываем окно оплаты, сбрасываем его состояние
                if (modalId === 'payment-modal') {
                    document.getElementById('payment-form').style.display = 'block';
                    document.getElementById('payment-success').style.display = 'none';
                }
            }
        });
    });
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ ПЕРЕКЛЮЧЕНИЯ ТЕМЫ
    // ============================================
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // ============================================
    // ОБРАБОТЧИКИ ДЛЯ ФИЛЬТРОВ ТОВАРОВ
    // ============================================
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Получаем категорию из атрибута data-filter
            const filter = this.dataset.filter;
            // Фильтруем товары по выбранной категории
            filterProducts(filter);
        });
    });
    
    // ============================================
    // ОБРАБОТЧИК ДЛЯ ИКОНКИ КОРЗИНЫ В ШАПКЕ
    // ============================================
    document.getElementById('cart-icon').addEventListener('click', function() {
        // Плавно прокручиваем страницу к боковой панели корзины
        const cartSidebar = document.querySelector('.cart-sidebar');
        cartSidebar.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    });
}

// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ ПОСЛЕ ЗАГРУЗКИ DOM
// ============================================
document.addEventListener('DOMContentLoaded', initApp);
