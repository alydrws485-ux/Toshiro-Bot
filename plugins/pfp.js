const fs = require('fs');
const path = require('path');
const { extractPureNumber } = require('../Extractions/elite');

module.exports = {
    command: 'بروفايل',
    category: 'إدارة',
    description: 'عرض رقم ومنشن الشخص بشكل فخم',

    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;

        try {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            const contextParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const parts = text.trim().split(/\s+/);

            let target;

            if (mentioned?.length) {
                target = mentioned[0];
            } else if (contextParticipant) {
                target = contextParticipant;
            } else if (parts[1] && /^\d{5,}$/.test(parts[1])) {
                const pureNumber = extractPureNumber(parts[1]);
                target = pureNumber + '@s.whatsapp.net';
            } else {
                target = msg.key.participant || msg.key.remoteJid;
            }

            let ppUrl;

            try {
                ppUrl = await sock.profilePictureUrl(target, "image");
            } catch {
                ppUrl = path.join(process.cwd(), 'media', 'avatar.png'); // صورة افتراضية
            }

            const number = target.replace(/@s\.whatsapp\.net$/, '');

            const caption = `*❖════⊰ Toshiro ꚸ ⊱════❖*\n\n` +
                            `*الرقم:* @${number}\n` +
                            `*منشن:* @${number}\n\n` +
                            `*Trauma Dev*`;

            await sock.sendMessage(chatId, {
                image: { url: ppUrl },
                caption,
                mentions: [target]
            }, { quoted: msg });

        } catch (err) {
            console.error("خطأ أثناء تنفيذ أمر بروفايل:", err);
            return sock.sendMessage(chatId, {
                text: '❌ حدث خطأ أثناء جلب الرقم والمنشن.'
            }, { quoted: msg });
        }
    }
};