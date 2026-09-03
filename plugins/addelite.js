const {
    eliteNumbers,
    vipNumbers,
    isElite,
    isVip,
    addEliteNumber,
    removeEliteNumber,
    addVipNumber,
    removeVipNumber,
    extractPureNumber
} = require('../Extractions/elite');

// الآيدي الصريح لرقم البوت والرقم الصافي للحماية المطلقة
const BOT_ID = '68831817015450';
const BOT_PHONE = '212609968650';

// دالة فحص ما إذا كان المدخل هو البوت (سواء بالآيدي أو بالرقم)
const checkIsBot = (target) => {
    if (!target) return false;
    const cleanTarget = extractPureNumber(target);
    return cleanTarget === BOT_ID || cleanTarget === BOT_PHONE || target.includes(BOT_ID);
};

module.exports = {
    command: 'نخبة',
    description: 'إدارة قائمة النخبة والـ VIP بالحماية الهرمية عبر ID البوت',
    usage: '.نخبة اضف/ازل/عرض/vip/ازل_vip + منشن أو رد أو رقم',
    category: 'zarf',

    async execute(sock, msg) {
        // 1. استخراج آيدي ورقم المرسل
        const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid || '';
        const senderNumber = extractPureNumber(senderJid);

        // 2. التحقق مما إذا كان المنفذ هو البوت نفسه عبر الـ ID أو الرقم
        const isBotSender = checkIsBot(senderJid) || checkIsBot(senderNumber) || msg.key.fromMe;

        // 3. التحقق من صلاحية المنفذ (نخبة / VIP / البوت)
        if (!isElite(senderNumber) && !isBotSender) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '❌ هذا الأمر مخصص لأعضاء النخبة فقط [Toshiro]'
            }, { quoted: msg });
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        const action = parts[1];

        if (!action || !['اضف', 'ازل', 'عرض', 'vip', 'ازل_vip'].includes(action)) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '⚠️ الاستخدام الصحيح:\n• .نخبة عرض\n• .نخبة اضف (رقم/منشن)\n• .نخبة ازل (رقم/منشن)\n• .نخبة vip (رقم/منشن - لرقم البوت فقط)\n• .نخبة ازل_vip (رقم/منشن - لرقم البوت فقط)'
            }, { quoted: msg });
        }

        // عرض القائمة
        if (action === 'عرض') {
            const vipListFormatted = (vipNumbers || []).map((n, i) => `• ${i + 1}. +${n} 💎 [VIP]`).join('\n') || 'لا يوجد أعضاء VIP';
            const eliteListFormatted = (eliteNumbers || []).filter(n => !(vipNumbers || []).includes(n)).map((n, i) => `• ${i + 1}. +${n}`).join('\n') || 'لا يوجد أعضاء عاديين';

            const message = `
\`❖════⊰ Toshiro ꚸ ⊱════❖\`

╭─[ 💎 VIP MEMBERS 💎 ]─╮
${vipListFormatted}
╰──────────────────────╯

╭─[ 👑 ELITE MEMBERS 👑 ]─╮
${eliteListFormatted}
╰──────────────────────╯
`;
            return sock.sendMessage(msg.key.remoteJid, {
                text: message
            }, { quoted: msg });
        }

        // استخراج الرقم المستهدف
        let targetNumber;
        let targetJid = '';

        if (parts[2] && /^\d{5,}$/.test(parts[2])) {
            targetNumber = extractPureNumber(parts[2]);
        }

        if (!targetNumber) {
            targetJid =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                msg.message?.extendedTextMessage?.contextInfo?.participant || '';

            if (!targetJid) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '⚠️ يرجى تحديد رقم أو عمل منشن للشخص المستهدف [Toshiro]'
                }, { quoted: msg });
            }

            targetNumber = extractPureNumber(targetJid);
        }

        const isTargetBot = checkIsBot(targetJid) || checkIsBot(targetNumber);

        // ==========================================
        //  قواعد الحماية والتراتبية الهرمية
        // ==========================================

        // 1. لا أحد يستطيع سحب أو تعديل رتبة البوت نفسه (عن طريق ID أو الرقم)
        if (isTargetBot && (action === 'ازل' || action === 'ازل_vip')) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '🛡️ حصانة مطلقة: لا يمكن سحب رتبة النخبة من البوت الأساسي!'
            }, { quoted: msg });
        }

        // 2. إدارة رتبة VIP حصرياً لـ ID البوت الأساسي
        if ((action === 'vip' || action === 'ازل_vip') && !isBotSender) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '🚫 منح أو سحب رتبة VIP مقتصر فقط على البوت الأساسي!'
            }, { quoted: msg });
        }

        // 3. لا يمكن لأحد سحب النخبة من عضو VIP إلا البوت
        if (action === 'ازل' && isVip(targetNumber) && !isBotSender) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '🛡️ لا يمكن سحب النخبة من أعضاء VIP إلا بواسطة البوت الأساسي!'
            }, { quoted: msg });
        }

        // 4. النخبة العاديين لا يمكنهم سحب نخبة عاديين آخرين (مسموح للبوت ولـ VIP فقط)
        if (action === 'ازل' && !isVip(senderNumber) && !isBotSender) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '🚫 النخبة العادية لا تملك صلاحية سحب الأعضاء. السحب متاح للـ VIP والبوت فقط!'
            }, { quoted: msg });
        }

        // ==========================================
        //  تنفيذ الأوامر
        // ==========================================

        let replyText = '';

        if (action === 'اضف') {
            if (isElite(targetNumber)) {
                replyText = `الرقم +${targetNumber} موجود بالفعل في النخبة [Toshiro]`;
            } else {
                addEliteNumber(targetNumber);
                replyText = `تم إضافة الرقم +${targetNumber} إلى قائمة النخبة [Toshiro]`;
            }
        } else if (action === 'ازل') {
            if (!isElite(targetNumber)) {
                replyText = `الرقم +${targetNumber} غير موجود في النخبة [Toshiro]`;
            } else {
                removeEliteNumber(targetNumber);
                replyText = `تم إزالة الرقم +${targetNumber} من قائمة النخبة [Toshiro]`;
            }
        } else if (action === 'vip') {
            addVipNumber(targetNumber);
            replyText = `💎 تم ترفيع الرقم +${targetNumber} إلى رتبة VIP بنجاح [Toshiro]`;
        } else if (action === 'ازل_vip') {
            removeVipNumber(targetNumber);
            replyText = `تم سحب رتبة VIP من الرقم +${targetNumber} (يبقى نخبة عادية) [Toshiro]`;
        }

        return sock.sendMessage(msg.key.remoteJid, {
            text: `
\`❖════⊰ Toshiro ꚸ ⊱════❖\`

${replyText}
`
        }, { quoted: msg });
    }
};
