const handler = require('../Shapes/handler');
const { eliteNumbers } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: ['حدث', 'تحديث', 'reload'],
    description: 'إعادة تحميل وتحديث جميع الأوامر والملفات فورًا في الذاكرة',
    usage: '.حدث',
    category: 'tools',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const sender = decode(msg.key.participant || jid);
        const senderLid = sender.split('@')[0];

        if (!eliteNumbers.includes(senderLid)) {
            return await sock.sendMessage(jid, {
                text: '❗ لا تملك صلاحية استخدام هذا الأمر.'
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

            // حل مشكلة الصوت بدون المساس بملف handler.js
            const mainModule = require('../main');
            if (!mainModule.playSound) {
                mainModule.playSound = () => {};
            }

            // استدعاء دالة التحديث
            await handler.reloadPlugins();

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }).catch(() => {});
            await sock.sendMessage(jid, {
                text: ` *تم إعادة تحديث وفرز جميع الأوامر والملفات بنجاح!*`
            }, { quoted: msg });

        } catch (error) {
            console.error('خطأ في أمر التحديث:', error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await sock.sendMessage(jid, {
                text: `❌ *حدث خطأ أثناء التحديث:*\n\`\`\`${error.message}\`\`\``
            }, { quoted: msg });
        }
    }
};
