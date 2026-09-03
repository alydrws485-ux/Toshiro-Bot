const { isElite, extractPureNumber } = require('../Extractions/elite');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: 'مخفي',
  category: 'tools',
  description: 'إرسال رسالة أو وسائط بمنشن مخفي (للنخبة فقط)',

  async execute(sock, msg) {
    try {
      const groupJid = msg.key.remoteJid;
      const senderJid = msg.key.participant || msg.participant || groupJid;
      const senderNumber = extractPureNumber(senderJid);

      if (!groupJid.endsWith('@g.us')) {
        return sock.sendMessage(
          groupJid,
          { text: '*هذا الأمر يعمل داخل القروبات فقط*' },
          { quoted: msg }
        );
      }

      if (!isElite(senderNumber)) {
        return sock.sendMessage(
          groupJid,
          { text: '*هذا الأمر مخصص للنخبة فقط*' },
          { quoted: msg }
        );
      }

      const metadata = await sock.groupMetadata(groupJid);
      const mentions = metadata.participants.map(p => p.id);

      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      const cleanText = body.replace(/^(\.|،)?مخفي\s*/i, '').trim();

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedMsgKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

      if (quoted) {
        const messageType = Object.keys(quoted)[0];

        if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(messageType)) {
          const buffer = await downloadMediaMessage(
            {
              key: {
                remoteJid: groupJid,
                id: quotedMsgKey,
                fromMe: false,
                participant: quotedParticipant
              },
              message: quoted
            },
            'buffer',
            {},
            { logger: console }
          );

          const sendObj = {
            contextInfo: { mentionedJid: mentions }
          };

          if (messageType === 'imageMessage') sendObj.image = buffer;
          else if (messageType === 'videoMessage') sendObj.video = buffer;
          else if (messageType === 'audioMessage') sendObj.audio = buffer;
          else if (messageType === 'documentMessage') {
            sendObj.document = buffer;
            sendObj.mimetype = quoted[messageType].mimetype;
            sendObj.fileName = quoted[messageType].fileName || 'file';
          }
          else if (messageType === 'stickerMessage') sendObj.sticker = buffer;

          return sock.sendMessage(groupJid, sendObj, { quoted: msg });

        } else if (quoted.conversation || quoted.extendedTextMessage?.text) {
          const text = quoted.conversation || quoted.extendedTextMessage.text;
          return sock.sendMessage(
            groupJid,
            { text: `*${text}*`, mentions },
            { quoted: msg }
          );
        } else {
          return sock.sendMessage(
            groupJid,
            { text: '*لا يمكن إعادة إرسال هذا النوع من الرسائل*' },
            { quoted: msg }
          );
        }
      }

      if (!cleanText) {
        return sock.sendMessage(
          groupJid,
          { text: '*TS - Toshi*', mentions },
          { quoted: msg }
        );
      }

      return sock.sendMessage(
        groupJid,
        { text: `*${cleanText}*`, mentions },
        { quoted: msg }
      );

    } catch (err) {
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: `*حدث خطأ غير متوقع*\n\n${err.message || err.toString()}` },
        { quoted: msg }
      );
    }
  }
};