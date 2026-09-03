const { isElite } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: "برا",
  description: "طرد عضو إذا قام عضو من النخبة بالرد على رسالته أو منشنته.",
  usage: ".طير",

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;
      if (!chatId.endsWith('@g.us')) return; 

      const sender = decode(msg.key.participant || chatId);
      const senderLid = sender.split('@')[0];

      if (!(await isElite(senderLid))) {
        return await sock.sendMessage(chatId, {
          text: '❌ هذا الأمر مخصص فقط للنخبة!'
        }, { quoted: msg });
      }

      const metadata = await sock.groupMetadata(chatId);
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const reply = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const target = mention || reply;

      if (!target) {
        return await sock.sendMessage(chatId, {
          text: '❗ الرجاء الرد على رسالة العضو المراد طرده أو منشنه.'
        }, { quoted: msg });
      }

      const isParticipant = metadata.participants.some(p => p.id === target);
      if (!isParticipant) {
        return await sock.sendMessage(chatId, {
          text: '❌ العضو غير موجود في المجموعة.'
        }, { quoted: msg });
      }

      await sock.groupParticipantsUpdate(chatId, [target], 'remove');
      await sock.sendMessage(chatId, {
        text: `تم طرد الحشره بنجاح🫦: @${target.split('@')[0]}`,
        mentions: [target]
      });

    } catch (error) {
      console.error('✗ خطأ في أمر الطير:', error);
    }
  }
};