const fs = require('fs');
const path = require('path');

const imagePath = path.join(process.cwd(), 'media', 'mode.jpg');

module.exports = {
  command: 'رابط',
  description: 'يعطي رابط دعوة المجموعة الحالية',

  async execute(sock, msg, args = []) {
    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, { text: '❌ هذا الأمر يعمل فقط في المجموعات.' }, { quoted: msg });
    }

    try {
      const inviteCode = await sock.groupInviteCode(chatId);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      const thumbnailBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;

      await sock.sendMessage(chatId, {
        text: `🔗 رابط دعوة المجموعة:\n${inviteLink}`,
        contextInfo: {
          externalAdReply: {
            title: 'Trauma Bot',
            body: 'رابط دعوة المجموعة',
            mediaType: 2,
            thumbnail: thumbnailBuffer,
            sourceUrl: inviteLink
          }
        }
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(chatId, { text: `❌ حدث خطأ أثناء جلب الرابط: ${error.message}` }, { quoted: msg });
    }
  }
};