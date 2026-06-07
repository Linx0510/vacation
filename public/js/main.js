document.addEventListener('DOMContentLoaded', () => {
    function normalizeMediaList(value) {
        if (Array.isArray(value)) return value;
        if (!value || value === '[]' || value === 'null') return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    
    // ========== ИЗБРАННОЕ ==========
    function initFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('.btn-favorite');
        console.log('Найдено кнопок избранного:', favoriteButtons.length);
        
        favoriteButtons.forEach(button => {
            button.removeEventListener('click', handleFavoriteClick);
            button.addEventListener('click', handleFavoriteClick);
        });
    }
    
    async function handleFavoriteClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = e.currentTarget;
        const eventId = btn.dataset.id;
        
        if (!eventId) {
            console.error('Нет data-id у кнопки');
            return;
        }
        
        const isFavorite = btn.classList.contains('active');
        let url = isFavorite ? `/user/favorites/remove/${eventId}` : '/user/favorites/add';
        
        // Специальная обработка для тестового мероприятия
        if (eventId === 'test-exclusive') {
            url = '/user/favorites/test-exclusive';
        }
        
        const allButtons = document.querySelectorAll(`.btn-favorite[data-id="${eventId}"]`);
        allButtons.forEach(sameBtn => {
            sameBtn.classList.toggle('active');
            const svg = sameBtn.querySelector('svg');
            if (svg) {
                svg.setAttribute('fill', sameBtn.classList.contains('active') ? 'currentColor' : 'none');
            }
            const textNode = Array.from(sameBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
            if (textNode) {
                textNode.textContent = sameBtn.classList.contains('active') ? ' В избранном' : ' В избранное';
            }
            const spanText = sameBtn.querySelector('span');
            if (spanText && !textNode) {
                spanText.textContent = sameBtn.classList.contains('active') ? ' В избранном' : ' В избранное';
            }
        });
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                allButtons.forEach(sameBtn => {
                    sameBtn.classList.toggle('active');
                    const svg = sameBtn.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('fill', sameBtn.classList.contains('active') ? 'currentColor' : 'none');
                    }
                });
                
                if (data.error === 'Нужна авторизация' || response.status === 401) {
                    showNotification('Пожалуйста, войдите в систему', 'error');
                    setTimeout(() => {
                        window.location.href = '/auth/login';
                    }, 1500);
                } else {
                    showNotification(data.error || 'Ошибка при добавлении в избранное', 'error');
                }
            } else {
                showNotification(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное', 'success');
            }
        } catch (error) {
            console.error('Error:', error);
            allButtons.forEach(sameBtn => {
                sameBtn.classList.toggle('active');
                const svg = sameBtn.querySelector('svg');
                if (svg) {
                    svg.setAttribute('fill', sameBtn.classList.contains('active') ? 'currentColor' : 'none');
                }
            });
            showNotification('Ошибка соединения с сервером', 'error');
        }
    }

    // ========== ЗАПИСЬ НА МЕРОПРИЯТИЕ (Я ИДУ) ==========
    function initJoinButtons() {
        const joinButtons = document.querySelectorAll('.btn-join');
        console.log('Найдено кнопок "Я иду":', joinButtons.length);
        
        joinButtons.forEach(button => {
            button.removeEventListener('click', handleJoinClick);
            button.addEventListener('click', handleJoinClick);
        });
    }
    
    async function handleJoinClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = e.currentTarget;
        const eventId = btn.dataset.id;
        
        if (!eventId) {
            console.error('Нет data-id у кнопки "Я иду"');
            return;
        }
        
        const isGoing = btn.classList.contains('active');
        let url = isGoing ? `/user/going/leave/${eventId}` : '/user/going/join';
        
        // Специальная обработка для тестового мероприятия
        if (eventId === 'test-exclusive') {
            url = '/events/join/test-exclusive';
        }
        
        const originalText = btn.textContent;
        
        btn.classList.toggle('active');
        btn.textContent = btn.classList.contains('active') ? 'Вы идете' : 'Я иду';
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            const data = await response.json();
            
            if (data.success) {
                const countSpan = document.querySelector('.participants-count[data-id="' + eventId + '"]');
                if (countSpan) {
                    let currentCount = parseInt(countSpan.textContent);
                    if (!isNaN(currentCount)) {
                        const newCount = isGoing ? currentCount - 1 : currentCount + 1;
                        countSpan.textContent = newCount;
                        console.log('Счетчик обновлен:', newCount);
                    }
                }
                
                const printBtn = document.getElementById('printTicketBtn');
                if (printBtn) {
                    if (!isGoing) {
                        printBtn.style.display = 'flex';
                        console.log('Кнопка печати показана');
                    } else {
                        printBtn.style.display = 'none';
                        console.log('Кнопка печати скрыта');
                    }
                }
                
                showNotification(isGoing ? 'Вы отказались от участия' : 'Вы успешно записаны!', 'success');
            } else {
                btn.classList.toggle('active');
                btn.textContent = originalText;
                showNotification(data.message || 'Ошибка при записи', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            btn.classList.toggle('active');
            btn.textContent = originalText;
            showNotification('Ошибка сервера', 'error');
        }
    }

    // ========== ЛАЙКИ ОТЗЫВОВ ==========
    function initLikeButtons() {
        const likeButtons = document.querySelectorAll('.btn-like-review');
        console.log('Найдено кнопок лайков:', likeButtons.length);
        
        likeButtons.forEach(button => {
            button.removeEventListener('click', handleLikeReviewClick);
            button.addEventListener('click', handleLikeReviewClick);
        });
    }
    
    async function handleLikeReviewClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = e.currentTarget;
        const reviewId = btn.dataset.id;
        
        try {
            const response = await fetch(`/user/reviews/like/${reviewId}`, { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                const countSpan = btn.querySelector('span');
                if (countSpan) countSpan.textContent = data.likes;
                
                const svg = btn.querySelector('svg');
                if (data.liked) {
                    btn.classList.add('liked');
                    if (svg) {
                        svg.setAttribute('fill', '#635bff');
                        svg.setAttribute('stroke', '#635bff');
                    }
                } else {
                    btn.classList.remove('liked');
                    if (svg) {
                        svg.setAttribute('fill', 'none');
                        svg.setAttribute('stroke', '#94a3b8');
                    }
                }
            }
        } catch (error) {
            console.error('Like error:', error);
        }
    }

    // ========== УДАЛЕНИЕ ИЗ ИЗБРАННОГО ==========
    const removeFavoriteBtns = document.querySelectorAll('.btn-remove-favorite');
    removeFavoriteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const eventId = btn.dataset.id;
            if (!eventId) return;
            
            if (confirm('Удалить это мероприятие из избранного?')) {
                try {
                    const response = await fetch(`/user/favorites/remove/${eventId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId })
                    });
                    const data = await response.json();
                    if (data.success) {
                        const card = btn.closest('.mini-card');
                        if (card) {
                            card.style.transition = 'opacity 0.3s';
                            card.style.opacity = '0';
                            setTimeout(() => card.remove(), 300);
                        }
                        showNotification('Удалено из избранного', 'success');
                    } else {
                        showNotification(data.error || 'Ошибка при удалении', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('Ошибка сервера', 'error');
                }
            }
        });
    });

    // ========== ОТКАЗ ОТ МЕРОПРИЯТИЯ ==========
    const leaveEventBtns = document.querySelectorAll('.btn-leave-event');
    leaveEventBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const eventId = btn.dataset.id;
            if (!eventId) return;
            
            if (confirm('Отказаться от участия в этом мероприятии?')) {
                try {
                    const response = await fetch(`/user/going/leave/${eventId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId })
                    });
                    const data = await response.json();
                    if (data.success) {
                        const card = btn.closest('.mini-card');
                        if (card) {
                            card.style.transition = 'opacity 0.3s';
                            card.style.opacity = '0';
                            setTimeout(() => card.remove(), 300);
                        }
                        showNotification('Вы отказались от участия', 'success');
                        
                        const participantsCount = document.querySelector(`.participants-count[data-id="${eventId}"]`);
                        if (participantsCount) {
                            let count = parseInt(participantsCount.textContent);
                            participantsCount.textContent = count - 1;
                        }
                    } else {
                        showNotification(data.message || 'Ошибка при отказе', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('Ошибка сервера', 'error');
                }
            }
        });
    });

    // ========== УДАЛЕНИЕ ОТЗЫВА ==========
    async function handleDeleteReview(e) {
        e.preventDefault();
        e.stopPropagation();
        const reviewId = e.currentTarget.dataset.id;
        
        if (confirm('Вы уверены, что хотите удалить этот отзыв?')) {
            try {
                const response = await fetch(`/user/reviews/delete/${reviewId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reviewId })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Отзыв удалён', 'success');
                    refreshMyReviews();
                } else {
                    showNotification(data.error || 'Ошибка при удалении', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Ошибка сервера', 'error');
            }
        }
    }

    // ========== УДАЛЕНИЕ ПРЕДЛОЖЕНИЯ ==========
    async function handleDeleteProposal(e) {
        e.preventDefault();
        e.stopPropagation();
        const proposalId = e.currentTarget.dataset.id;
        
        if (confirm('Удалить это предложение?')) {
            try {
                const response = await fetch(`/user/proposals/delete/${proposalId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proposalId })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Предложение удалено', 'success');
                    refreshMyProposals();
                } else {
                    showNotification(data.message || 'Ошибка при удалении', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Ошибка сервера', 'error');
            }
        }
    }

    // ========== ОБНОВЛЕНИЕ СПИСКА ОТЗЫВОВ ==========
    async function refreshMyReviews() {
        try {
            const response = await fetch('/user/reviews/my', {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            
            if (data.success && data.reviews) {
                updateMyReviewsList(data.reviews);
            }
        } catch (error) {
            console.error('Error refreshing reviews:', error);
        }
    }

    function updateMyReviewsList(reviews) {
        const container = document.querySelector('#reviews .reviews-list, #reviews > div:not(.section-title):not(form):last-child');
        if (!container) return;
        
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><p class="empty-text">Вы еще не оставили ни одного отзыва.</p></div>';
            return;
        }
        
        let html = '<div style="display: grid; grid-template-columns: 1fr; gap: 20px;">';
        reviews.forEach(review => {
            html += createMyReviewCard(review);
        });
        html += '</div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-delete-review').forEach(btn => {
            btn.removeEventListener('click', handleDeleteReview);
            btn.addEventListener('click', handleDeleteReview);
        });
    }

    function createMyReviewCard(review) {
        let photosHtml = '';
        const photos = normalizeMediaList(review.photos);
        photos.forEach(photo => {
            photosHtml += `<img src="${photo}" style="width: 80px; height: 80px; border-radius: 12px; object-fit: cover;">`;
        });

        let videosHtml = '';
        const videos = normalizeMediaList(review.videos);
        videos.forEach(video => {
            videosHtml += `<div style="position: relative;"><video src="${video}" class="review-video-thumb" style="width: 80px; height: 80px; border-radius: 12px; object-fit: cover; background: #111827;" muted preload="metadata"></video><div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div></div>`;
        });
        
        return `
            <div class="mini-card" data-review-id="${review.id}">
                <div class="mini-card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <h4 style="font-weight: 800; margin: 0;">${escapeHtml(review.event_title || 'Мероприятие')}</h4>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="font-size: 12px; color: #94a3b8;">${new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                            <button class="btn-delete-review" data-id="${review.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 5px;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <p style="color: #475569; margin-bottom: 15px;">${escapeHtml(review.comment || '')}</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">${photosHtml}${videosHtml}</div>
                </div>
            </div>
        `;
    }

    // ========== ОБНОВЛЕНИЕ СПИСКА ПРЕДЛОЖЕНИЙ ==========
    async function refreshMyProposals() {
        try {
            const response = await fetch('/user/proposals/my', {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            
            if (data.success && data.proposals) {
                updateMyProposalsList(data.proposals);
            }
        } catch (error) {
            console.error('Error refreshing proposals:', error);
        }
    }

    function updateMyProposalsList(proposals) {
        const container = document.querySelector('#proposals .proposals-list, #proposals > div:not(.proposal-steps-container):not(form):last-child');
        if (!container) return;
        
        if (!proposals || proposals.length === 0) {
            container.innerHTML = '<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.07" x2="5.64" y2="17.66"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><p class="empty-text">Вы еще не создали ни одного предложения.</p><p style="color: #94a3b8; font-size: 14px;">Поделитесь своей идеей — мы обязательно её рассмотрим!</p></div>';
            return;
        }
        
        let html = '<div style="display: grid; grid-template-columns: 1fr; gap: 20px;">';
        proposals.forEach(proposal => {
            html += createMyProposalCard(proposal);
        });
        html += '</div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-delete-proposal').forEach(btn => {
            btn.removeEventListener('click', handleDeleteProposal);
            btn.addEventListener('click', handleDeleteProposal);
        });
    }

    function createMyProposalCard(proposal) {
        let statusClass = '';
        let statusText = '';
        
        switch(proposal.status) {
            case 'moderation':
                statusClass = 'background: #fef9e6; color: #b87307;';
                statusText = 'На модерации';
                break;
            case 'approved':
                statusClass = 'background: #e6f7e6; color: #2e7d32;';
                statusText = 'Одобрено';
                break;
            case 'rejected':
                statusClass = 'background: #fdecea; color: #c62828;';
                statusText = 'Отклонено';
                break;
            default:
                statusClass = 'background: #f1f5f9; color: #64748b;';
                statusText = proposal.status;
        }
        
        return `
            <div class="mini-card" data-proposal-id="${proposal.id}">
                <div class="mini-card-content" style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <h4 style="font-weight: 800; margin: 0; font-size: 18px;">${escapeHtml(proposal.title)}</h4>
                        <span style="display: inline-block; padding: 6px 16px; border-radius: 30px; font-size: 12px; font-weight: 700; ${statusClass}">${statusText}</span>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <span style="display: inline-block; padding: 5px 14px; background: #f0f0ff; color: #635bff; border-radius: 20px; font-size: 12px; font-weight: 700;">${escapeHtml(proposal.category)}</span>
                        <p style="color: #475569; margin-top: 16px;">${escapeHtml(proposal.description || '')}</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 700;">${proposal.votes_count || 0}</span>
                            <span style="color: #64748b;">голосов</span>
                        </div>
                        <button class="btn-delete-proposal" data-id="${proposal.id}" style="background: #fee2e2; border: none; color: #ef4444; cursor: pointer; padding: 8px 20px; border-radius: 30px;">
                            Удалить
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== ОТПРАВКА ФОРМЫ ОТЗЫВА ==========
    const reviewForm = document.querySelector('#reviews form');
    if (reviewForm && !window.__reviewFormBound) {
        window.__reviewFormBound = true;
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (reviewForm.dataset.submitting === '1') return;
            reviewForm.dataset.submitting = '1';

            const formData = new FormData(reviewForm);
            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : '';

            if (submitBtn) {
                submitBtn.textContent = 'Отправка...';
                submitBtn.disabled = true;
            }

            try {
                const response = await fetch('/user/reviews/create', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                console.log('Server response:', data);

                if (data.success) {
                    showNotification('Отзыв успешно опубликован!', 'success');

                    reviewForm.reset();
                    const select = reviewForm.querySelector('select');
                    if (select) select.selectedIndex = 0;

                    const previews = reviewForm.querySelectorAll('.preview-img');
                    previews.forEach(preview => {
                        preview.style.display = 'none';
                        preview.src = '';
                        if (preview.tagName === 'VIDEO') {
                            preview.pause();
                            preview.currentTime = 0;
                        }
                    });

                    const fileContainers = reviewForm.querySelectorAll('.file-upload-container');
                    fileContainers.forEach(container => {
                        const svg = container.querySelector('svg');
                        const span = container.querySelector('span');
                        const input = container.querySelector('input');
                        if (svg) svg.style.display = 'block';
                        if (span) span.style.display = 'block';
                        if (input) input.value = '';
                    });

                    setTimeout(() => {
                        window.location.reload();
                    }, 700);

                } else {
                    showNotification(data.message || 'Ошибка при публикации отзыва', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Ошибка сервера', 'error');
            } finally {
                reviewForm.dataset.submitting = '0';
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // ========== ОТПРАВКА ФОРМЫ ПРЕДЛОЖЕНИЯ ==========
    const proposalForm = document.querySelector('#proposals form');
    if (proposalForm) {
        proposalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {};
            const formElements = proposalForm.elements;
            
            for (let i = 0; i < formElements.length; i++) {
                const element = formElements[i];
                if (element.name && !element.disabled) {
                    if (element.type === 'radio') {
                        if (element.checked) {
                            formData[element.name] = element.value;
                        }
                    } else if (element.type !== 'submit' && element.type !== 'button') {
                        formData[element.name] = element.value;
                    }
                }
            }
            
            const submitBtn = proposalForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Отправка...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('/user/proposals/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                
                if (data.success) {
                    showNotification(data.message || 'Предложение отправлено на модерацию!', 'success');
                    proposalForm.reset();
                    const defaultRadio = document.querySelector('#proposals form input[type="radio"][checked]');
                    if (defaultRadio) defaultRadio.checked = true;
                    refreshMyProposals();
                } else {
                    showNotification(data.message || 'Ошибка при отправке', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Ошибка сервера', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ========== ЖАЛОБА НА ОТЗЫВ ==========
    function initReportButtons() {
        const reportBtns = document.querySelectorAll('.btn-report-review');
        console.log('Найдено кнопок жалобы:', reportBtns.length);
        
        reportBtns.forEach(btn => {
            btn.removeEventListener('click', handleReportClick);
            btn.addEventListener('click', handleReportClick);
        });
    }

    function handleReportClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = e.currentTarget;
        const reviewId = btn.dataset.id;
        
        if (reviewId && typeof window.openReportModal === 'function') {
            window.openReportModal(reviewId);
        } else {
            console.error('openReportModal function not found');
        }
    }

    // ========== FAQ ==========
    const faqItems = document.querySelectorAll('.faq-accordion-item');
    faqItems.forEach(item => {
        const questionBox = item.querySelector('.faq-question-box');
        if (questionBox) {
            questionBox.addEventListener('click', () => {
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });
                item.classList.toggle('active');
            });
        }
    });

    // ========== УВЕДОМЛЕНИЯ ==========
    function showNotification(message, type = 'success') {
        const existingNotification = document.querySelector('.custom-notification');
        if (existingNotification) existingNotification.remove();
        
        const bgColor = '#635bff';
        
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 30px;
                right: 30px;
                background: ${bgColor};
                color: #fff;
                padding: 14px 24px;
                border-radius: 16px;
                font-weight: 600;
                font-family: 'Manrope', sans-serif;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 10px 25px rgba(99, 91, 255, 0.3);
                animation: slideInRight 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    ${type === 'success' 
                        ? '<polyline points="20 6 9 17 4 12"></polyline>'
                        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
                    }
                </svg>
                ${message}
            </div>
        `;
        
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    initFavoriteButtons();
    initJoinButtons();
    initLikeButtons();
    initReportButtons();
    
    const observer = new MutationObserver(() => {
        initFavoriteButtons();
        initJoinButtons();
        initLikeButtons();
        initReportButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('Все обработчики событий инициализированы');
});