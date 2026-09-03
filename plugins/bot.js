const fs = require('fs');
const path = require('path');
const { eliteNumbers } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'bot',
    description: 'تشغيل أو إيقاف البوت مؤقتًا',
    usage: '.bot [on/off]',
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

        const args = msg.args || [];
        const botPath = path.join(__dirname, '../data/bot.txt');
        if (!fs.existsSync(botPath)) fs.writeFileSync(botPath, '[ON]');
        let currentStatus = fs.readFileSync(botPath, 'utf8').trim().toUpperCase();

        const imagesOn = ['./images/on1.jpg', './images/on2.jpg'];
        const imagesOff = ['./images/off1.jpg', './images/off2.jpg'];

        const getRandomImage = arr => arr[Math.floor(Math.random() * arr.length)];
        let selectedImage = null;
        let messageText = '';

        if (!args[0]) {
            messageText = currentStatus === '[ON]'
                ? `✅ 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐁𝐨𝐭 𝐒𝐭𝐚𝐭𝐮𝐬: [ON]`
                : `⛔ 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐁𝐨𝐭 𝐒𝐭𝐚𝐭𝐮𝐬: [OFF]`;
            selectedImage = currentStatus === '[ON]' ? getRandomImage(imagesOn) : getRandomImage(imagesOff);
        } else {
            const action = args[0].toLowerCase();
            if (!['on','off'].includes(action)) {
                return await sock.sendMessage(jid, {
                    text: '❗ استخدم: .bot on أو .bot off'
                }, { quoted: msg });
            }

            currentStatus = `[${action.toUpperCase()}]`;
            fs.writeFileSync(botPath, currentStatus);

            messageText = action === 'on'
                ? `✅ 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐁𝐨𝐭 𝐒𝐭𝐚𝐭𝐮𝐬: [ON]`
                : `⛔ 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐁𝐨𝐭 𝐒𝐭𝐚𝐭𝐮𝐬: [OFF]`;

            selectedImage = action === 'on' ? getRandomImage(imagesOn) : getRandomImage(imagesOff);
        }

        const thumbnailBuffer = fs.readFileSync(path.resolve(selectedImage));

        await sock.sendMessage(jid, {
            text: messageText,
            contextInfo: {
                externalAdReply: {
                    title: `❖══⏣⊰ Toshiro ꚸ ⊱⏣══❖`,
                    body: messageText,
                    mediaType: 1,
                    thumbnail: thumbnailBuffer,
                    sourceUrl: 'https://t.me/YourChannel'
                }
            }
        }, { quoted: msg });
    }
};