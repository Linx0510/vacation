// AJAX фильтрация без перезагрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    const eventsGrid = document.getElementById('eventsGrid');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const categoryChips = document.querySelectorAll('[data-category]');
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const applyDateBtn = document.getElementById('applyDateBtn');
    const resetDateBtn = document.getElementById('resetDateBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const loadMoreWrapper = document.getElementById('loadMoreWrapper');
    
    let visibleCount = 6;
    
    // Текущие параметры фильтрации
    let currentFilters = {
        search: new URLSearchParams(window.location.search).get('search') || '',
        category: new URLSearchParams(window.location.search).get('category') || '',
        date_from: new URLSearchParams(window.location.search).get('date_from') || '',
        date_to: new URLSearchParams(window.location.search).get('date_to') || ''
    };
    
    // Функция обновления URL без перезагрузки
    function updateURL() {
        const params = new URLSearchParams();
        if (currentFilters.search) params.set('search', currentFilters.search);
        if (currentFilters.category && currentFilters.category !== 'all') params.set('category', currentFilters.category);
        if (currentFilters.date_from) params.set('date_from', currentFilters.date_from);
        if (currentFilters.date_to) params.set('date_to', currentFilters.date_to);
        
        const newURL = params.toString() ? `/events?${params.toString()}` : '/events';
        window.history.pushState({ filters: currentFilters }, '', newURL);
    }
    
    // Функция загрузки событий через AJAX
    async function loadEvents() {
        const params = new URLSearchParams();
        if (currentFilters.search) params.set('search', currentFilters.search);
        if (currentFilters.category && currentFilters.category !== 'all') params.set('category', currentFilters.category);
        if (currentFilters.date_from) params.set('date_from', currentFilters.date_from);
        if (currentFilters.date_to) params.set('date_to', currentFilters.date_to);
        params.set('ajax', '1');
        
        const url = `/events?${params.toString()}`;
        
        eventsGrid.style.opacity = '0.5';
        
        try {
            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const html = await response.text();
            
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const newGrid = temp.querySelector('#eventsGrid');
            
            if (newGrid) {
                eventsGrid.innerHTML = newGrid.innerHTML;
                
                // Переинициализируем обработчики
                if (typeof initFavoriteButtons === 'function') initFavoriteButtons();
                if (typeof initJoinButtons === 'function') initJoinButtons();
                if (typeof initLikeButtons === 'function') initLikeButtons();
                if (typeof initReportButtons === 'function') initReportButtons();
                
                // Обновляем пагинацию
                const eventCards = eventsGrid.querySelectorAll('.event-card');
                visibleCount = 6;
                eventCards.forEach((card, index) => {
                    if (index < visibleCount) {
                        card.classList.remove('hidden-event');
                    } else {
                        card.classList.add('hidden-event');
                    }
                });
                
                if (loadMoreWrapper) {
                    loadMoreWrapper.style.display = eventCards.length > 6 ? 'flex' : 'none';
                }
                
                updateActiveChips();
            }
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            eventsGrid.style.opacity = '1';
        }
    }
    
    function updateActiveChips() {
        categoryChips.forEach(chip => {
            const category = chip.dataset.category;
            if ((category === currentFilters.category) || (category === 'all' && !currentFilters.category)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }
    
    function applyFilters() {
        updateURL();
        loadEvents();
    }
    
    // Обработчики
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentFilters.search = searchInput.value;
            applyFilters();
        });
    }
    
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const category = chip.dataset.category;
            currentFilters.category = category === 'all' ? '' : category;
            applyFilters();
        });
    });
    
    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', () => {
            currentFilters.date_from = dateFromInput.value;
            currentFilters.date_to = dateToInput.value;
            applyFilters();
        });
    }
    
    if (resetDateBtn) {
        resetDateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dateFromInput.value = '';
            dateToInput.value = '';
            currentFilters.date_from = '';
            currentFilters.date_to = '';
            applyFilters();
        });
    }
    
    // Кнопка "Сбросить всё" (иконка)
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Сбрасываем все фильтры
            currentFilters = {
                search: '',
                category: '',
                date_from: '',
                date_to: ''
            };
            
            // Очищаем поля ввода
            if (searchInput) searchInput.value = '';
            if (dateFromInput) dateFromInput.value = '';
            if (dateToInput) dateToInput.value = '';
            
            // Обновляем активные чипсы
            updateActiveChips();
            
            // Обновляем URL и загружаем события
            updateURL();
            loadEvents();
        });
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            visibleCount += 6;
            const eventCards = eventsGrid.querySelectorAll('.event-card');
            eventCards.forEach((card, index) => {
                if (index < visibleCount) {
                    card.classList.remove('hidden-event');
                } else {
                    card.classList.add('hidden-event');
                }
            });
            if (visibleCount >= eventCards.length) {
                loadMoreWrapper.style.display = 'none';
            }
        });
    }
    
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.filters) {
            currentFilters = event.state.filters;
        } else {
            const params = new URLSearchParams(window.location.search);
            currentFilters = {
                search: params.get('search') || '',
                category: params.get('category') || '',
                date_from: params.get('date_from') || '',
                date_to: params.get('date_to') || ''
            };
        }
        
        if (searchInput) searchInput.value = currentFilters.search;
        if (dateFromInput) dateFromInput.value = currentFilters.date_from;
        if (dateToInput) dateToInput.value = currentFilters.date_to;
        
        loadEvents();
    });
    
    updateActiveChips();
});