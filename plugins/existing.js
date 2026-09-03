const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'bannedWords.json');

module.exports = {
  command: "قائمة",
  description: "يعرض قائمة الكلمات المحظورة",
  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;

    if (!fs.existsSync(filePath)) {
      return await sock.sendMessage(chatId, { text: "⚠️ لا توجد قائمة محظورة حتى الآن." }, { quoted: msg });
    }

    const bannedWords = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (bannedWords.length === 0) {
      return await sock.sendMessage(chatId, { text: "⚠️ لا توجد كلمات محظورة." }, { quoted: msg });
    }

    const list = bannedWords.map((w, i) => `🔸 ${i + 1} - ${w}`).join("\n");

    await sock.sendMessage(chatId, {
      text: `📛 *قائمة الكلمات المحظورة:*\n\n${list}`
    }, { quoted: msg });
  }
};