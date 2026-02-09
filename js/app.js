(function () {
    'use strict';

    let selectedStudentIds = new Set();
    let allStudents = [];
    let allGifts = [];

    const elements = {
        loadingOverlay: document.getElementById('loadingOverlay'),
        resultsContainer: document.getElementById('resultsContainer'),
        welcomeMessage: document.getElementById('welcomeMessage'),
        openCharSelector: document.getElementById('openCharSelector'),
        charSelectorOverlay: document.getElementById('charSelectorOverlay'),
        charGrid: document.getElementById('charGrid'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        confirmSelectionBtn: document.getElementById('confirmSelectionBtn'),
        selectedCharsList: document.getElementById('selectedCharsList'),
        selectedCount: document.getElementById('selectedCount'),
        analyzeBtn: document.getElementById('analyzeBtn')
    };

    let tooltipEl = null;

    async function init() {
        showLoading(true);

        try {
            await DataManager.fetchData();
            allStudents = DataManager.getAllStudents();
            allGifts = DataManager.getAllGifts();

            populateCharacterGrid();
            setupEventListeners();
            createTooltip();

            showLoading(false);
        } catch (error) {
            console.error('Failed to initialize:', error);
            showError('データの読み込みに失敗しました。ページを再読み込みしてください。');
        }
    }

    function showLoading(show) {
        elements.loadingOverlay.classList.toggle('active', show);
    }

    function showError(message) {
        elements.loadingOverlay.innerHTML = `
            <div style="text-align: center; color: #ef4444;">
                <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;
    }

    function populateCharacterGrid() {
        elements.charGrid.innerHTML = '';

        allStudents.forEach(student => {
            const div = document.createElement('div');
            div.className = 'char-grid-item';
            div.dataset.studentId = student.Id;
            div.title = student.Name;

            const img = document.createElement('img');
            img.alt = student.Name;
            img.loading = 'lazy';

            DataManager.getStudentImageBlob(student.Id).then(blobUrl => {
                if (blobUrl) {
                    img.src = blobUrl;
                } else {
                    div.innerHTML = `<div class="placeholder-icon">${student.Name.substring(0, 2)}</div>`;
                }
            });

            div.appendChild(img);
            elements.charGrid.appendChild(div);
        });
    }

    function setupEventListeners() {
        elements.openCharSelector.addEventListener('click', () => {
            elements.charSelectorOverlay.classList.add('active');
        });

        elements.charSelectorOverlay.addEventListener('click', (e) => {
            if (e.target === elements.charSelectorOverlay) {
                elements.charSelectorOverlay.classList.remove('active');
            }
        });

        elements.charGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.char-grid-item');
            if (item) {
                const studentId = item.dataset.studentId;
                toggleStudentSelection(studentId);
                item.classList.toggle('selected', selectedStudentIds.has(studentId));
            }
        });

        elements.clearAllBtn.addEventListener('click', () => {
            selectedStudentIds.clear();
            document.querySelectorAll('.char-grid-item.selected').forEach(el => {
                el.classList.remove('selected');
            });
            updateSelectedCharsList();
        });

        elements.confirmSelectionBtn.addEventListener('click', () => {
            elements.charSelectorOverlay.classList.remove('active');
        });

        elements.analyzeBtn.addEventListener('click', runAnalysis);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.charSelectorOverlay.classList.contains('active')) {
                elements.charSelectorOverlay.classList.remove('active');
            }
        });
    }

    function toggleStudentSelection(studentId) {
        if (selectedStudentIds.has(studentId)) {
            selectedStudentIds.delete(studentId);
        } else {
            selectedStudentIds.add(studentId);
        }
        updateSelectedCharsList();
    }

    function removeStudent(studentId) {
        selectedStudentIds.delete(studentId);

        const gridItem = elements.charGrid.querySelector(`[data-student-id="${studentId}"]`);
        if (gridItem) {
            gridItem.classList.remove('selected');
        }

        updateSelectedCharsList();
    }

    function updateSelectedCharsList() {
        const count = selectedStudentIds.size;
        elements.selectedCount.textContent = count;
        elements.analyzeBtn.disabled = count === 0;

        if (count === 0) {
            elements.selectedCharsList.innerHTML = '<div class="empty-state">キャラクターを選択してください</div>';
            return;
        }

        elements.selectedCharsList.innerHTML = '';

        selectedStudentIds.forEach(async studentId => {
            const student = DataManager.getStudent(studentId);
            if (!student) return;

            const div = document.createElement('div');
            div.className = 'selected-char-item';

            const img = document.createElement('img');
            img.alt = student.Name;
            img.title = student.Name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.dataset.studentId = student.Id;
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeStudent(student.Id.toString());
            });

            div.appendChild(img);
            div.appendChild(removeBtn);
            elements.selectedCharsList.appendChild(div);

            const blobUrl = await DataManager.getStudentImageBlob(student.Id);
            if (blobUrl) {
                img.src = blobUrl;
            }
        });
    }

    function runAnalysis() {
        const selectedStudents = Array.from(selectedStudentIds)
            .map(id => DataManager.getStudent(id))
            .filter(Boolean);

        if (selectedStudents.length === 0) {
            return;
        }

        const results = GiftAnalyzer.analyzeGifts(selectedStudents, allGifts);
        renderResults(results);
    }

    function renderResults(results) {
        if (!results) {
            return;
        }

        elements.welcomeMessage.style.display = 'none';

        let html = '';

        html += '<button class="save-image-btn" id="saveImageBtn">📷 画像として保存</button>';

        html += '<div class="results-grid two-column">';

        html += '<div class="left-column">';
        html += renderOptimalSection(results.optimal);
        html += renderUnnecessarySection(results.tailor, results.unchi);
        html += '</div>';
        html += '<div class="right-column">';
        html += renderFreeChoiceSection(results.freeChoice);
        html += '</div>';

        html += '</div>';

        elements.resultsContainer.innerHTML = html;

        addTooltipListeners();
        convertImagesToBlob();
        loadMultiplierIcons();

        const saveBtn = document.getElementById('saveImageBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveResultsAsImage);
        }
    }

    async function saveResultsAsImage() {
        const saveBtn = document.getElementById('saveImageBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const resultsGrid = elements.resultsContainer.querySelector('.results-grid');
            if (!resultsGrid) return;

            const canvas = await html2canvas(resultsGrid, {
                backgroundColor: '#0b0f14',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            const link = document.createElement('a');
            link.download = 'gift-analysis-' + Date.now() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            saveBtn.textContent = '✓ 保存完了';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Image save failed:', error);
            saveBtn.textContent = '保存失敗';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    async function convertImagesToBlob() {
        const images = elements.resultsContainer.querySelectorAll('img[src]');

        for (const img of images) {
            const originalSrc = img.src;
            if (originalSrc.startsWith('blob:')) continue;

            try {
                const blobUrl = await DataManager.getCachedImageUrl(originalSrc);
                if (blobUrl) {
                    img.src = blobUrl;
                }
            } catch (e) { }
        }
    }

    function renderOptimalSection(optimal) {
        const entries = Object.entries(optimal);
        if (entries.length === 0) {
            return '';
        }

        let html = `
            <div class="result-section">
                <div class="section-header">
                    <span class="section-title">専用品</span>
                </div>
                <div class="section-body">
        `;

        entries.forEach(([studentId, data]) => {
            html += `
                <div class="char-gift-row">
                    <div class="row-char-icon">
                        <img src="${DataManager.getStudentImageUrl(data.student.Id)}" 
                             alt="${data.student.Name}" 
                             title="${data.student.Name}">
                    </div>
                    <div class="row-gifts">
            `;

            data.gifts.forEach(({ gift, multiplier }) => {
                html += renderGiftIcon(gift, multiplier);
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    function renderFreeChoiceSection(freeChoice) {
        if (freeChoice.length === 0) {
            return '';
        }

        let html = `
            <div class="result-section">
                <div class="section-header">
                    <span class="section-title">共通品</span>
                </div>
                <div class="section-body">
        `;

        freeChoice.forEach(({ gift, multiplier, students }) => {
            html += `
                <div class="shared-gift-row">
                    <div class="shared-gift-icon rarity-${gift.Rarity.toLowerCase()}">
                        <img src="${DataManager.getGiftImageUrl(gift.Icon)}" 
                             alt="${gift.Name}"
                             data-tooltip="${gift.Name}">
                        ${multiplier > 1 ? `<img class="gift-multiplier-icon" data-multiplier="${multiplier}" alt="x${multiplier}">` : ''}
                    </div>
                    <div class="shared-chars">
            `;

            students.forEach(student => {
                html += `
                    <div class="shared-char-icon">
                        <img src="${DataManager.getStudentImageUrl(student.Id)}" 
                             alt="${student.Name}"
                             title="${student.Name}">
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    function renderUnnecessarySection(tailor, unchi) {
        if (tailor.length === 0 && unchi.length === 0) {
            return '';
        }

        let html = `
            <div class="result-section">
                <div class="section-header">
                    <span class="section-title">不用品</span>
                </div>
                <div class="section-body">
                    <div class="gift-list">
        `;

        tailor.forEach(({ gift }) => {
            html += `
                <div class="gift-item rarity-sr">
                    <img src="${DataManager.getGiftImageUrl(gift.Icon)}" 
                         alt="${gift.Name}"
                         data-tooltip="${gift.Name}">
                </div>
            `;
        });

        if (tailor.length > 0 && unchi.length > 0) {
            html += '</div><div class="gift-list-separator"></div><div class="gift-list">';
        }

        unchi.forEach(({ gift }) => {
            html += `
                <div class="gift-item rarity-ssr">
                    <img src="${DataManager.getGiftImageUrl(gift.Icon)}" 
                         alt="${gift.Name}"
                         data-tooltip="${gift.Name}">
                </div>
            `;
        });

        html += '</div></div></div>';
        return html;
    }

    function renderGiftIcon(gift, multiplier) {
        return `
            <div class="gift-item rarity-${gift.Rarity.toLowerCase()}">
                <img src="${DataManager.getGiftImageUrl(gift.Icon)}" 
                     alt="${gift.Name}"
                     data-tooltip="${gift.Name}">
                ${multiplier > 1 ? `<img class="gift-multiplier-icon" data-multiplier="${multiplier}" alt="x${multiplier}">` : ''}
            </div>
        `;
    }

    async function loadMultiplierIcons() {
        const multiplierImgs = elements.resultsContainer.querySelectorAll('img[data-multiplier]');

        for (const img of multiplierImgs) {
            const multiplier = parseInt(img.dataset.multiplier, 10);
            const blobUrl = await DataManager.getMultiplierIconBlob(multiplier);
            if (blobUrl) {
                img.src = blobUrl;
            }
        }
    }

    function createTooltip() {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'tooltip';
        document.body.appendChild(tooltipEl);
    }

    function addTooltipListeners() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', showTooltip);
            el.addEventListener('mouseleave', hideTooltip);
            el.addEventListener('mousemove', moveTooltip);
        });
    }

    function showTooltip(e) {
        const text = e.target.dataset.tooltip;
        if (!text) return;

        tooltipEl.textContent = text;
        tooltipEl.classList.add('visible');
        moveTooltip(e);
    }

    function hideTooltip() {
        tooltipEl.classList.remove('visible');
    }

    function moveTooltip(e) {
        const x = e.clientX + 10;
        const y = e.clientY + 10;
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
