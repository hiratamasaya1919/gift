const DataManager = (() => {
    const _0xf3 = [58, 32];
    const _0xa1 = (d) => d.map(v => String.fromCharCode(v ^ (_0xf3[0] + _0xf3[1]))).join('');
    const _c = {
        _a: _0xa1([50, 46, 46, 42, 41, 96, 117, 117, 41, 57, 50, 59, 54, 63, 62, 56, 116, 57, 53, 55, 117]),
        _b: _0xa1([62, 59, 46, 59, 117, 48, 42, 117]),
        _s: _0xa1([41, 46, 47, 62, 63, 52, 46, 41, 116, 55, 51, 52, 116, 48, 41, 53, 52]),
        _i: _0xa1([51, 46, 63, 55, 41, 116, 55, 51, 52, 116, 48, 41, 53, 52]),
        _p1: _0xa1([51, 55, 59, 61, 63, 41, 117, 41, 46, 47, 62, 63, 52, 46, 117, 51, 57, 53, 52, 117]),
        _p2: _0xa1([51, 55, 59, 61, 63, 41, 117, 51, 46, 63, 55, 117, 51, 57, 53, 52, 117]),
        _p3: _0xa1([51, 55, 59, 61, 63, 41, 117, 47, 51, 117])
    };

    const _getEndpoint = (type) => _c._a + _c._b + (type === 's' ? _c._s : _c._i);
    const _getImagePath = (type, id) => _c._a + (type === 's' ? _c._p1 : _c._p2) + id + '.webp';
    const _getUiImagePath = (name) => _c._a + _c._p3 + name + '.png';

    let studentsData = null;
    let itemsData = null;
    let giftItems = null;

    const imageCache = new Map();
    const pendingImages = new Map();

    async function fetchData() {
        try {
            const [studentsResponse, itemsResponse] = await Promise.all([
                fetch(_getEndpoint('s')),
                fetch(_getEndpoint('i'))
            ]);

            if (!studentsResponse.ok || !itemsResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const [studentsRaw, itemsRaw] = await Promise.all([
                studentsResponse.json(),
                itemsResponse.json()
            ]);

            studentsData = processStudents(studentsRaw);
            itemsData = itemsRaw;
            giftItems = processGiftItems(itemsRaw);

            return { students: studentsData, gifts: giftItems };
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    function processStudents(rawData) {
        const processed = {};

        for (const [id, student] of Object.entries(rawData)) {
            if (!student.Id || !student.Name || !student.FavorItemTags) {
                continue;
            }

            processed[id] = {
                Id: student.Id,
                Name: student.Name,
                FavorItemTags: student.FavorItemTags || [],
                FavorItemUniqueTags: student.FavorItemUniqueTags || []
            };
        }

        return processed;
    }

    function processGiftItems(rawData) {
        const gifts = {};

        for (const [id, item] of Object.entries(rawData)) {
            if (item.Category !== 'Favor') {
                continue;
            }

            if (!item.Id || !item.Name || !item.Tags || !item.Icon) {
                continue;
            }

            gifts[id] = {
                Id: item.Id,
                Name: item.Name,
                Rarity: item.Rarity || 'N',
                Tags: item.Tags || [],
                Icon: item.Icon
            };
        }

        return gifts;
    }

    async function loadImageAsBlob(url) {
        if (imageCache.has(url)) {
            return imageCache.get(url);
        }

        if (pendingImages.has(url)) {
            return pendingImages.get(url);
        }

        const promise = (async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Image load failed');
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                imageCache.set(url, blobUrl);
                return blobUrl;
            } catch (error) {
                return null;
            } finally {
                pendingImages.delete(url);
            }
        })();

        pendingImages.set(url, promise);
        return promise;
    }

    function getStudentImageUrl(studentId) {
        return _getImagePath('s', studentId);
    }

    function getGiftImageUrl(iconName) {
        return _getImagePath('i', iconName);
    }

    async function getCachedImageUrl(originalUrl) {
        return await loadImageAsBlob(originalUrl);
    }

    async function getStudentImageBlob(studentId) {
        const url = _getImagePath('s', studentId);
        return await loadImageAsBlob(url);
    }

    async function getGiftImageBlob(iconName) {
        const url = _getImagePath('i', iconName);
        return await loadImageAsBlob(url);
    }

    async function getMultiplierIconBlob(multiplier) {
        if (multiplier < 2 || multiplier > 4) return null;
        const url = _getUiImagePath(`Cafe_Interaction_Gift_0${multiplier}`);
        return await loadImageAsBlob(url);
    }

    function getAllStudents() {
        if (!studentsData) return [];

        const allStudents = Object.values(studentsData).sort((a, b) =>
            a.Name.localeCompare(b.Name, 'ja')
        );

        const seen = new Set();
        return allStudents.filter(student => {
            if (seen.has(student.Name)) {
                return false;
            }
            seen.add(student.Name);
            return true;
        });
    }

    function getStudent(id) {
        return studentsData ? studentsData[id] : null;
    }

    function getAllGifts() {
        if (!giftItems) return [];
        return Object.values(giftItems);
    }

    function getGift(id) {
        return giftItems ? giftItems[id] : null;
    }

    function isDataLoaded() {
        return studentsData !== null && giftItems !== null;
    }

    return {
        fetchData,
        getStudentImageUrl,
        getGiftImageUrl,
        getCachedImageUrl,
        getStudentImageBlob,
        getGiftImageBlob,
        getMultiplierIconBlob,
        getAllStudents,
        getStudent,
        getAllGifts,
        getGift,
        isDataLoaded
    };
})();
