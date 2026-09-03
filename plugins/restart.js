const { isElite } = require('../Extractions/elite');
const { jidDecode } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';
const imagePath = path.join(process.cwd(), 'media', 'mode.jpg');

module.exports = {
  command: 'ريستارت',
  description: 'إعادة تشغيل البوت (خاص بالنخبة فقط)',

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;
      const sender = decode(msg.key.participant || msg.participant || chatId);
      const senderId = sender.split('@')[0];

      if (!(await isElite(senderId))) {
        return await sock.sendMessage(chatId, {
          text: ' عذراً، هذا الأمر مخصص فقط للنخبة المميزة!'
        }, { quoted: msg });
      }

      let thumbnailBuffer = null;
      if (fs.existsSync(imagePath)) {
        thumbnailBuffer = fs.readFileSync(imagePath);
      }

      await sock.sendMessage(chatId, {
        text: `\`❖════⊰ 𝐓𝐑𝐀𝐔𝐌𝐀 𝐁𝐎𝐓 ⊱════❖\`\n\n جاري إعادة تشغيل البوت...\nيرجى الانتظار للحظة.\n سوف يعود البوت بنشاط وفعالية خلال ثوانٍ!`,
        contextInfo: {
          externalAdReply: {
            title: 'Trauma Bot',
            body: 'Elite Command Panel',
            mediaType: 2,
            thumbnail: thumbnailBuffer,
            sourceUrl: 'https://t.me/YourChannel'
          }
        }
      }, { quoted: msg });

      console.log(
        '\n' + chalk.bgYellow.black(' SYSTEM '),
        chalk.yellow('⇨'),
        chalk.green.bold('تم تفعيل إعادة تشغيل البوت من قبل عضو نخبة'),
        chalk.cyan(`(ID: ${senderId})`)
      );

      if (process.send) process.send('reset');
      process.exit(0);

    } catch (error) {
      console.error(chalk.bgRed.white(' ERROR '), error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ حدث خطأ غير متوقع أثناء تنفيذ الأمر. حاول مرة أخرى لاحقًا.'
      }, { quoted: msg });
    }
  }
};