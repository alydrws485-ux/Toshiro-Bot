const { isElite } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'شات',
    description: 'فتح أو قفل الشات مؤقتًا (إجباري)',
    usage: '.شات فتح [دقائق] | .شات قفل',

    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(groupJid, {
                    text: 'هذا الأمر يخص المجموعات فقط!'
                }, { quoted: msg });
            }

            if (!isElite(senderLid)) {
                return await sock.sendMessage(groupJid, {
                    text: 'عذراً، ليس لديك صلاحية لاستخدام هذا الأمر.'
                }, { quoted: msg });
            }

            const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
            const args = body.trim().split(/\s+/).slice(1);

            const option = args[0];
            if (!['فتح', 'قفل'].includes(option)) {
                return await sock.sendMessage(groupJid, {
                    text: 'يرجى استخدام:\n.شات فتح [دقائق] أو .شات قفل'
                }, { quoted: msg });
            }

            if (option === 'فتح') {
                let duration = parseInt(args[1]);
                await sock.groupSettingUpdate(groupJid, 'not_announcement');

                if (isNaN(duration) || duration <= 0) {
                    await sock.sendMessage(groupJid, {
                        text: 'تم فتح الشات بدون تحديد مدة.'
                    });
                } else {
                    await sock.sendMessage(groupJid, {
                        text: `تم فتح الشات مؤقتًا لمدة ${duration} دقيقة. سيتم قفله تلقائيًا.`
                    });

                    setTimeout(async () => {
                        try {
                            await sock.groupSettingUpdate(groupJid, 'announcement');
                            await sock.sendMessage(groupJid, {
                                text: `تم قفل الشات تلقائيًا بعد مرور ${duration} دقيقة.`
                            });
                        } catch (err) {
                            console.error('فشل إقفال الشات التلقائي:', err);
                        }
                    }, duration * 60 * 1000);
                }

            } else if (option === 'قفل') {
                await sock.groupSettingUpdate(groupJid, 'announcement');
                await sock.sendMessage(groupJid, {
                    text: 'تم قفل الشات يدويًا.'
                });
            }

        } catch (error) {
            console.error('خطأ في أمر الشات:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};