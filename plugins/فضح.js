const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'فضح',
  description: 'يكشف رسالة العرض لمرة واحدة (صورة/فيديو/صوت)',
  category: 'tools',
  usage: '.عرض (بالرد على رسالة عرض لمرة واحدة)',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                   msg.message?.viewOnceMessage?.message;

    if (!quoted) {
      return await sock.sendMessage(chatId, {
        text: '❌ من فضلك قم بالرد على رسالة "عرض لمرة واحدة"!',
      }, { quoted: msg });
    }

    try {
      const isImage = quoted.imageMessage?.viewOnce === true || quoted.imageMessage;
      const isVideo = quoted.videoMessage?.viewOnce === true || quoted.videoMessage;
      const isAudio = quoted.audioMessage?.viewOnce === true || quoted.audioMessage;

      let mediaMessage;
      let type;

      if (isImage) {
        mediaMessage = quoted.imageMessage;
        type = 'image';
      } else if (isVideo) {
        mediaMessage = quoted.videoMessage;
        type = 'video';
      } else if (isAudio) {
        mediaMessage = quoted.audioMessage;
        type = 'audio';
      } else {
        return await sock.sendMessage(chatId, {
          text: '❌ هذا النوع من الرسائل غير مدعوم أو ليست رسالة "عرض لمرة واحدة"!',
        }, { quoted: msg });
      }

      const stream = await downloadContentFromMessage(mediaMessage, type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const caption = mediaMessage.caption || '';

      if (type === 'image') {
        await sock.sendMessage(chatId, {
          image: buffer,
          caption: `*💀 تم كشف صورة العرض مرة واحدة 💀*\n\n*النوع:* صورة 📸\n${caption ? `*الوصف:* ${caption}` : ''}`,
        }, { quoted: msg });
      } else if (type === 'video') {
        await sock.sendMessage(chatId, {
          video: buffer,
          caption: `*💀 تم كشف فيديو العرض مرة واحدة 💀*\n\n*النوع:* فيديو 📹\n${caption ? `*الوصف:* ${caption}` : ''}`,
        }, { quoted: msg });
      } else if (type === 'audio') {
        await sock.sendMessage(chatId, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: mediaMessage.ptt || false,
        }, { quoted: msg });
      }

      console.log(`✅ تم إرسال ${type} العرض مرة واحدة بنجاح`);
    } catch (error) {
      console.error('❌ خطأ في كشف العرض لمرة واحدة:', error);
      await sock.sendMessage(chatId, {
        text: '❌ فشل في معالجة رسالة العرض لمرة واحدة:\n' + error.message,
      }, { quoted: msg });
    }
  }
};