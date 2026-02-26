const DataManager = (() => {
    const _b = 'https://hiratamasaya.810114514.workers.dev';

    let studentsData = null;
    let itemsData = null;
    let giftItems = null;

    const imageCache = new Map();
    const pendingImages = new Map();

    async function fetchData() {
        try {
            const [studentsResponse, itemsResponse] = await Promise.all([
                fetch(_b + '/api/students'),
                fetch(_b + '/api/items')
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

        for (const [id, s] of Object.entries(rawData)) {
            if (!s.i || !s.n || !s.t) {
                continue;
            }

            processed[id] = {
                Id: s.i,
                Name: s.n,
                FavorItemTags: s.t || [],
                FavorItemUniqueTags: s.u || []
            };
        }

        return processed;
    }

    function processGiftItems(rawData) {
        const gifts = {};

        for (const [id, item] of Object.entries(rawData)) {
            if (!item.i || !item.n || !item.t || !item.c) {
                continue;
            }

            gifts[id] = {
                Id: item.i,
                Name: item.n,
                Rarity: item.r || 'N',
                Tags: item.t || [],
                Icon: item.c
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
        return _b + '/api/image/student/icon/' + studentId + '.webp';
    }

    function getGiftImageUrl(iconName) {
        return _b + '/api/image/item/icon/' + iconName + '.webp';
    }

    async function getCachedImageUrl(originalUrl) {
        return await loadImageAsBlob(originalUrl);
    }

    async function getStudentImageBlob(studentId) {
        const url = getStudentImageUrl(studentId);
        return await loadImageAsBlob(url);
    }

    async function getGiftImageBlob(iconName) {
        const url = getGiftImageUrl(iconName);
        return await loadImageAsBlob(url);
    }

    async function getMultiplierIconBlob(multiplier) {
        if (multiplier < 2 || multiplier > 4) return null;
        const url = _b + '/api/image/ui/Cafe_Interaction_Gift_0' + multiplier + '.png';
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
