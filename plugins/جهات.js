const fs = require('fs-extra');
const path = require('path');
const { isElite } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

const settingsPath = path.join(__dirname, '../data/جهات.json');
const warningsPath = path.join(__dirname, '../data/جهات_تحذيرات.json');

// التأكد من وجود الملفات والمجلدات
fs.ensureDirSync(path.dirname(settingsPath));
if (!fs.existsSync(settingsPath)) {
    fs.writeJsonSync(settingsPath, {}, { spaces: 2 });
}
if (!fs.existsSync(warningsPath)) {
    fs.writeJsonSync(warningsPath, {}, { spaces: 2 });
}

module.exports = {
    command: 'جهات',
    description: 'إدارة منع جهات الاتصال والقفل التلقائي',
    usage: '.جهات تشغيل / .جهات ايقاف',

    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;

            if (!groupJid?.endsWith('@g.us')) {
                return await sock.sendMessage(groupJid, {
                    text: 'هذا الأمر يخص المجموعات فقط!'
                }, { quoted: msg });
            }

            const rawSender = msg.key.participant || msg.participant || groupJid;
            const sender = decode(rawSender);
            const senderLid = sender.split('@')[0];

            const body = (
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                ''
            ).trim();

            const args = body.split(/\s+/);
            const action = args[1]?.trim();

            // ==========================================
            // 1. تفعيل أو إيقاف النظام (يتطلب نخبة)
            // ==========================================
            if (action === 'تشغيل' || action === 'ايقاف' || action === 'إيقاف') {
                if (!isElite(senderLid)) {
                    return await sock.sendMessage(groupJid, {
                        text: 'عذراً، ليس لديك صلاحية لاستخدام هذا الأمر.'
                    }, { quoted: msg });
                }

                const settings = fs.readJsonSync(settingsPath);

                if (action === 'تشغيل') {
                    settings[groupJid] = true;
                    fs.writeJsonSync(settingsPath, settings, { spaces: 2 });
                    return await sock.sendMessage(groupJid, {
                        text: '✅ تم تشغيل نظام منع جهات الاتصال بنجاح.\n\n⚠️ عند إرسال أي جهة اتصال (شاملة المشرفين والنخبة):\n1️⃣ سيتم قفل الشات فوراً.\n2️⃣ سيتم إرسال تحذير للعضو بالمنشن.\n3️⃣ عند التكرار سيتم طرد العضو.'
                    }, { quoted: msg });
                } else {
                    settings[groupJid] = false;
                    fs.writeJsonSync(settingsPath, settings, { spaces: 2 });
                    return await sock.sendMessage(groupJid, {
                        text: '🛑 تم إيقاف نظام منع جهات الاتصال.'
                    }, { quoted: msg });
                }
            }

            // ==========================================
            // 2. الكشف عن الجهة (يطبق على الجميع بدون استثناء)
            // ==========================================
            const settings = fs.readJsonSync(settingsPath);
            if (settings[groupJid] === true) {

                const m = msg.message || {};
                const isContact = 
                    !!m.contactMessage || 
                    !!m.contactsArrayMessage ||
                    !!m.viewOnceMessage?.message?.contactMessage ||
                    !!m.viewOnceMessage?.message?.contactsArrayMessage ||
                    !!m.viewOnceMessageV2?.message?.contactMessage ||
                    !!m.viewOnceMessageV2?.message?.contactsArrayMessage ||
                    !!m.ephemeralMessage?.message?.contactMessage ||
                    !!m.ephemeralMessage?.message?.contactsArrayMessage;

                if (isContact) {
                    // أ) قفل الشات أولاً لمنع إرسال المزيد
                    try {
                        await sock.groupSettingUpdate(groupJid, 'announcement');
                    } catch (err) {
                        console.error('فشل إقفال الشات:', err);
                    }

                    // ب) حذف رسالة جهة الاتصال
                    try {
                        await sock.sendMessage(groupJid, {
                            delete: {
                                remoteJid: groupJid,
                                fromMe: msg.key.fromMe,
                                id: msg.key.id,
                                participant: rawSender
                            }
                        });
                    } catch (err) {
                        console.error('فشل حذف جهة الاتصال:', err);
                    }

                    // ج) معالجة الإنذار والطرد
                    const warnings = fs.readJsonSync(warningsPath);
                    if (!warnings[groupJid]) {
                        warnings[groupJid] = {};
                    }

                    const currentWarnings = warnings[groupJid][sender] || 0;

                    if (currentWarnings === 0) {
                        // الإنذار الأول
                        warnings[groupJid][sender] = 1;
                        fs.writeJsonSync(warningsPath, warnings, { spaces: 2 });

                        return await sock.sendMessage(groupJid, {
                            text: `⚠️ *تحذير وإعادة قفل الشات*\n\nعذراً @${senderLid}، يُمنع إرسال جهات الاتصال في المجموعة!\n\n🔒 *تم قفل الشات تلقائياً.*`,
                            mentions: [sender]
                        });
                    } else {
                        // الإنذار الثاني -> طرد العضو
                        delete warnings[groupJid][sender];
                        fs.writeJsonSync(warningsPath, warnings, { spaces: 2 });

                        try {
                            await sock.groupParticipantsUpdate(groupJid, [sender], 'remove');
                        } catch (err) {
                            console.error('فشل طرد العضو المخالف (قد يكون منشئ القروب أو البوت ليس أدمين):', err);
                        }

                        return await sock.sendMessage(groupJid, {
                            text: `🚨 *تم طرد العضو المخالف*\n\nالعضو: @${senderLid}\nالسبب: تكرار إرسال جهات الاتصال (الإنذار الثاني).\n\n🔒 *الشات لا يزال مقفلاً.*`,
                            mentions: [sender]
                        });
                    }
                }
            }

            if (body.startsWith('.جهات') && !action) {
                return await sock.sendMessage(groupJid, {
                    text: 'يرجى استخدام:\n.جهات تشغيل أو .جهات ايقاف'
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('خطأ في أمر الجهات:', error);
        }
    }
};
