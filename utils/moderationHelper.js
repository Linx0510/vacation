const forbiddenWords = [
    'хуй', 'хуя', 'хуе', 'хуё', 'пизд', 'ебат', 'ёбат', 'сук', 'бляд', 'пидор', 'гандон', 'мудак', 'член', 'шлюх', 'проститут',
    'fuck', 'shit', 'bitch', 'asshole', 'dick'
];

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function checkProfanity(text) {
    if (!text) return true;

    const normalized = normalizeText(text);
    if (!normalized) return true;

    return !forbiddenWords.some((word) => {
        const pattern = new RegExp(`(^|\\s)${word}[\\p{L}\\p{N}_-]*($|\\s)`, 'iu');
        return pattern.test(normalized);
    });
}

function checkFormat(text, mediaUrl = null, requireMedia = mediaUrl !== null && mediaUrl !== undefined && mediaUrl !== '') {
    if (!text) return false;
    const isLongEnough = text.trim().length >= 2;
    const hasMedia = mediaUrl !== null && mediaUrl !== undefined && mediaUrl !== '';
    return isLongEnough && (!requireMedia || hasMedia);
}

module.exports = { checkProfanity, checkFormat, normalizeText };
