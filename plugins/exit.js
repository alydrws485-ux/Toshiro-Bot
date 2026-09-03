const { extractPureNumber, eliteNumbers } = require('../Extractions/elite');

module.exports = {
  command: 'خروج',
  description: 'يخلي البوت يغادر القروب بأمر من النخبة',
  category: 'zarf',
  usage: '.خروج',
  ignorePause: true, // ⬅️ لو عندك نظام إيقاف/تشغيل ويدعم هذا

  async execute(sock, msg) {
    const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
    const senderNumber = extractPureNumber(senderJid);

    if (!eliteNumbers.includes(senderNumber)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '*🚫 ما معك صلاحية تطلع البوت!*'
      }, { quoted: msg });
    }

    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '*❗ هذا الأمر يشتغل فقط داخل القروبات.*'
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '👋 *البوت غادر القروب بأمر من النخبة.*'
      }, { quoted: msg });

      await sock.groupLeave(msg.key.remoteJid);
    } catch (err) {
      console.error('فشل في الخروج من القروب:', err);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '⚠️ حدث خطأ أثناء محاولة الخروج من القروب.'
      }, { quoted: msg });
    }
  }
};