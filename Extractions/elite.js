const fs = require('fs-extra');
const path = require('path');

// مسار حفظ البيانات
const dataDir = path.join(__dirname, '../data');
const eliteFilePath = path.join(dataDir, 'eliteData.json');

// آيدي البوت ورقم الهاتف الأساسي
const BOT_ID = '68831817015450';
const BOT_PHONE = '212609968650';

// إنشاء المجلد والملف إذا لم يكونا موجودين
fs.ensureDirSync(dataDir);
if (!fs.existsSync(eliteFilePath)) {
    fs.writeJsonSync(eliteFilePath, {
        elite: [BOT_PHONE, BOT_ID],
        vip: [BOT_PHONE, BOT_ID]
    }, { spaces: 2 });
}

// تحميل البيانات من الملف عند تشغيل البوت
function loadData() {
    try {
        const data = fs.readJsonSync(eliteFilePath);
        return {
            elite: Array.isArray(data.elite) ? data.elite : [BOT_PHONE, BOT_ID],
            vip: Array.isArray(data.vip) ? data.vip : [BOT_PHONE, BOT_ID]
        };
    } catch (e) {
        return { elite: [BOT_PHONE, BOT_ID], vip: [BOT_PHONE, BOT_ID] };
    }
}

// حفظ البيانات في الملف
function saveData(data) {
    try {
        fs.writeJsonSync(eliteFilePath, data, { spaces: 2 });
    } catch (e) {
        console.error('❌ خطأ في حفظ ملف النخبة:', e);
    }
}

let loaded = loadData();
let eliteNumbers = loaded.elite;
let vipNumbers = loaded.vip;

// دالة تنظيف الرقم
function extractPureNumber(jid) {
    if (!jid) return '';
    return jid.toString().replace(/[^0-9]/g, '');
}

// دالة التحقق من النخبة
function isElite(number) {
    if (!number) return false;
    const clean = extractPureNumber(number);
    return eliteNumbers.includes(clean) || vipNumbers.includes(clean) || clean === BOT_ID || clean === BOT_PHONE;
}

// دالة التحقق من الـ VIP
function isVip(number) {
    if (!number) return false;
    const clean = extractPureNumber(number);
    return vipNumbers.includes(clean) || clean === BOT_ID || clean === BOT_PHONE;
}

// إضافة رقم للنخبة مع الحفظ الأوتوماتيكي
function addEliteNumber(number) {
    const clean = extractPureNumber(number);
    if (clean && !eliteNumbers.includes(clean)) {
        eliteNumbers.push(clean);
        saveData({ elite: eliteNumbers, vip: vipNumbers });
    }
}

// إزالة رقم من النخبة مع الحفظ الأوتوماتيكي
function removeEliteNumber(number) {
    const clean = extractPureNumber(number);
    if (clean !== BOT_ID && clean !== BOT_PHONE) {
        eliteNumbers = eliteNumbers.filter(n => n !== clean);
        saveData({ elite: eliteNumbers, vip: vipNumbers });
    }
}

// إضافة رقم للـ VIP مع الحفظ الأوتوماتيكي
function addVipNumber(number) {
    const clean = extractPureNumber(number);
    if (clean && !vipNumbers.includes(clean)) {
        vipNumbers.push(clean);
        addEliteNumber(clean);
    }
}

// إزالة رقم من الـ VIP مع الحفظ الأوتوماتيكي
function removeVipNumber(number) {
    const clean = extractPureNumber(number);
    if (clean !== BOT_ID && clean !== BOT_PHONE) {
        vipNumbers = vipNumbers.filter(n => n !== clean);
        saveData({ elite: eliteNumbers, vip: vipNumbers });
    }
}

module.exports = {
    eliteNumbers,
    vipNumbers,
    extractPureNumber,
    isElite,
    isVip,
    addEliteNumber,
    removeEliteNumber,
    addVipNumber,
    removeVipNumber
};
