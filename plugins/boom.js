const fs = require('fs');
const path = require('path');
const { isElite } = require('../Extractions/elite.js');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'bannedWords.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));

module.exports = {
  command: "حظر",
  description: "إضافة كلمة إلى قائمة الكلمات المحظورة.",
  usage: ".حظر [الكلمة]",

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;
      const sender = msg.key.participant || chatId;

      if (!(await isElite(sender))) {
        return await sock.sendMessage(chatId, {
          text: "هذا الأمر مخصص للنخبة فقط."
        }, { quoted: msg });
      }

      const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
      const wordToBan = body.replace('.حظر', '').trim();

      if (!wordToBan) {
        return await sock.sendMessage(chatId, {
          text: "يجب كتابة الكلمة المراد حظرها."
        }, { quoted: msg });
      }

      let bannedWords = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (bannedWords.includes(wordToBan)) {
        return await sock.sendMessage(chatId, {
          text: `الكلمة "${wordToBan}" محظورة بالفعل.`
        }, { quoted: msg });
      }

      bannedWords.push(wordToBan);
      fs.writeFileSync(filePath, JSON.stringify(bannedWords, null, 2), 'utf8');

      await sock.sendMessage(chatId, {
        text: `تم إضافة "${wordToBan}" إلى قائمة الكلمات المحظورة.`
      }, { quoted: msg });

    } catch (error) {
      console.error('خطأ في أمر الحظر:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `حدث خطأ أثناء تنفيذ الأمر: ${error.message || error.toString()}`
      }, { quoted: msg });
    }
  }
};