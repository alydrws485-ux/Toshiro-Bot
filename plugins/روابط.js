const fs = require('fs-extra');
const path = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');
const { isElite } = require('../Extractions/elite.js');

const settingsPath = path.join(__dirname, '../data/روابط.json');

fs.ensureDirSync(path.dirname(settingsPath));
if (!fs.existsSync(settingsPath)) {
    fs.writeJsonSync(settingsPath, {}, { spaces: 2 });
}

function decode(jid) {
    return (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';
}

module.exports = {
    command: 'روابط',
    description: 'تشغيل وإيقاف نظام منع الروابط (استثناء المشرفين)',
    usage: '.روابط تشغيل / .روابط ايقاف',

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;

            if (!chatId?.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر يعمل داخل القروبات فقط.'
                }, { quoted: msg });
            }

            const sender = decode(msg.key.participant || chatId);
            const senderNumber = sender.split('@')[0];

            // النخبة فقط
            if (!isElite(senderNumber)) {
                return await sock.sendMessage(chatId, {
                    text: '❌ لا تملك صلاحية استخدام هذا الأمر.'
                }, { quoted: msg });
            }

            const text = (
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                ''
            ).trim();

            const args = text.split(/\s+/);
            const firstArg = args[1]?.trim() || '';
            const fullAction = text.replace(/^[./#!]/, '').trim();

            const settings = fs.readJsonSync(settingsPath);

            // تفعيل نظام الروابط
            if (firstArg === 'تشغيل' || fullAction === 'روابط_تشغيل' || firstArg === '_تشغيل') {
                settings[chatId] = true;
                fs.writeJsonSync(settingsPath, settings, { spaces: 2 });

                return await sock.sendMessage(chatId, {
                    text: '✅ تم تشغيل نظام منع الروابط.\n\n🔗 أي رابط يتم إرساله من قِبل الأعضاء سيتم حذفه تلقائيًا (يُستثنى المشرفون).'
                }, { quoted: msg });
            }

            // إيقاف نظام الروابط
            if (firstArg === 'ايقاف' || fullAction === 'روابط_ايقاف' || firstArg === '_ايقاف') {
                settings[chatId] = false;
                fs.writeJsonSync(settingsPath, settings, { spaces: 2 });

                return await sock.sendMessage(chatId, {
                    text: '🛑 تم إيقاف نظام منع الروابط.'
                }, { quoted: msg });
            }

            return await sock.sendMessage(chatId, {
                text: '❌ الاستخدام الصحيح:\n\n.روابط تشغيل\n.روابط ايقاف'
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ خطأ في أمر الروابط:', err);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ حدث خطأ أثناء تنفيذ الأمر.'
            }, { quoted: msg });
        }
    }
};
