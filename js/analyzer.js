const GiftAnalyzer = (() => {
    const SSR_BLACKLIST = [
        'きらめきの花束',
        'さわやかな花束',
        '美しい花束',
        '初音ミクのフォトカード'
    ];

    function calculateMultiplier(student, gift) {
        const studentTags = student.FavorItemTags || [];
        const studentUniqueTags = student.FavorItemUniqueTags || [];
        const itemTags = gift.Tags || [];

        const allStudentTags = [...studentTags, ...studentUniqueTags];
        const totalMatches = allStudentTags.filter(tag => itemTags.includes(tag)).length;

        if (totalMatches >= 3) {
            return 4;
        } else if (totalMatches >= 2) {
            return 3;
        } else if (totalMatches === 1) {
            return 2;
        }

        return 1;
    }

    function analyzeGifts(selectedStudents, allGifts) {
        if (!selectedStudents.length || !allGifts.length) {
            return null;
        }

        const giftAnalysis = allGifts.map(gift => {
            const multipliers = {};
            let maxMultiplier = 1;

            selectedStudents.forEach(student => {
                const mult = calculateMultiplier(student, gift);
                multipliers[student.Id] = mult;
                if (mult > maxMultiplier) {
                    maxMultiplier = mult;
                }
            });

            const competitionCount = Object.values(multipliers).filter(m => m === maxMultiplier).length;

            return {
                gift,
                multipliers,
                maxMultiplier,
                competitionCount
            };
        });

        return {
            optimal: generateOptimalSection(giftAnalysis, selectedStudents),
            freeChoice: generateFreeChoiceSection(giftAnalysis, selectedStudents),
            tailor: generateTailorSection(giftAnalysis),
            unchi: generateUnchiSection(giftAnalysis)
        };
    }

    function generateOptimalSection(giftAnalysis, selectedStudents) {
        const result = {};

        selectedStudents.forEach(student => {
            result[student.Id] = {
                student,
                gifts: []
            };
        });

        giftAnalysis.forEach(({ gift, multipliers, maxMultiplier, competitionCount }) => {
            if (maxMultiplier > 1 && competitionCount === 1) {
                for (const [studentId, mult] of Object.entries(multipliers)) {
                    if (mult === maxMultiplier) {
                        result[studentId].gifts.push({
                            gift,
                            multiplier: mult
                        });
                        break;
                    }
                }
            }
        });

        Object.values(result).forEach(studentData => {
            studentData.gifts.sort((a, b) => {
                if (b.multiplier !== a.multiplier) {
                    return b.multiplier - a.multiplier;
                }
                return getRarityOrder(b.gift.Rarity) - getRarityOrder(a.gift.Rarity);
            });
        });

        const filteredResult = {};
        for (const [studentId, data] of Object.entries(result)) {
            if (data.gifts.length > 0) {
                filteredResult[studentId] = data;
            }
        }

        return filteredResult;
    }

    function generateFreeChoiceSection(giftAnalysis, selectedStudents) {
        const result = [];

        giftAnalysis.forEach(({ gift, multipliers, maxMultiplier, competitionCount }) => {
            if (maxMultiplier > 1 && competitionCount > 1) {
                const matchingStudents = [];
                for (const [studentId, mult] of Object.entries(multipliers)) {
                    if (mult === maxMultiplier) {
                        const student = selectedStudents.find(s => s.Id.toString() === studentId.toString());
                        if (student) {
                            matchingStudents.push(student);
                        }
                    }
                }

                result.push({
                    gift,
                    multiplier: maxMultiplier,
                    students: matchingStudents
                });
            }
        });

        result.sort((a, b) => {
            if (b.multiplier !== a.multiplier) {
                return b.multiplier - a.multiplier;
            }
            if (b.students.length !== a.students.length) {
                return b.students.length - a.students.length;
            }
            return getRarityOrder(b.gift.Rarity) - getRarityOrder(a.gift.Rarity);
        });

        return result;
    }

    function generateTailorSection(giftAnalysis) {
        const result = [];

        giftAnalysis.forEach(({ gift, maxMultiplier }) => {
            if (gift.Rarity === 'SR' && maxMultiplier === 1) {
                result.push({ gift });
            }
        });

        result.sort((a, b) => a.gift.Name.localeCompare(b.gift.Name, 'ja'));

        return result;
    }

    function generateUnchiSection(giftAnalysis) {
        const result = [];

        giftAnalysis.forEach(({ gift, maxMultiplier }) => {
            if (gift.Rarity === 'SSR' && maxMultiplier === 1) {
                if (!SSR_BLACKLIST.includes(gift.Name)) {
                    result.push({ gift });
                }
            }
        });

        result.sort((a, b) => a.gift.Name.localeCompare(b.gift.Name, 'ja'));

        return result;
    }

    function getRarityOrder(rarity) {
        const order = { 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1 };
        return order[rarity] || 0;
    }

    return {
        calculateMultiplier,
        analyzeGifts
    };
})();
