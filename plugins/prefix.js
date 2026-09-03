const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const { isElite } = require('../Extractions/elite.js');

const configPath = path.join(__dirname, '../config.js');
const imagePath = path.join(process.cwd(), 'media', 'mode.jpg');

module.exports = {
  command: 'بريفكس',
  description: 'تغيير بريفكس الأوامر (للنخبة فقط)',
  usage: '.بريفكس [رمز جديد]',
  category: 'tools',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const sender = senderJid.split('@')[0];

    if (!isElite(sender)) {
      return sock.sendMessage(chatId, {
        text: '*ليس لديك صلاحية استخدام هذا الأمر*'
      }, { quoted: msg });
    }

    const fullText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const currentPrefix = config.prefix || config.defaultPrefix || '.';
    const input = fullText.startsWith(currentPrefix)
      ? fullText.slice((currentPrefix + 'بريفكس').length).trim()
      : '';

    if (!input) {
      return sock.sendMessage(chatId, {
        text: '*❌ الرجاء كتابة البريفكس الجديد.*\nمثال: `.بريفكس $` أو `.بريفكس فارغ`'
      }, { quoted: msg });
    }

    const newPrefix = (input === 'فارغ') ? '' : input;
    config.prefix = newPrefix;

    const updatedContent = `let prefix = '${newPrefix}';

module.exports = {
    botName: 'Trauma',
    version: '2.5.0',
    owner: '972532731932',

    defaultPrefix: '.',
    get prefix() { return prefix; },
    set prefix(newPrefix) { if (newPrefix && typeof newPrefix === 'string') prefix = newPrefix; },

    allowedGroups: [],
    messages: {},
    colors: {}
};
`;

    try {
      fs.writeFileSync(configPath, updatedContent);
    } catch (err) {
      return sock.sendMessage(chatId, { text: `❌ فشل في تحديث البريفكس:\n${err.message}` }, { quoted: msg });
    }

    const display = newPrefix === '' ? 'فارغ (بدون بريفكس)' : `\`${newPrefix}\``;
    let thumbnailBuffer = null;
    if (fs.existsSync(imagePath)) {
      thumbnailBuffer = fs.readFileSync(imagePath);
    }

    await sock.sendMessage(chatId, {
      text: `\`❖════⊰ 𝐓𝐑𝐀𝐔𝐌𝐀 𝐁𝐎𝐓 ⊱════❖\`\n\n✅ تم تغيير بريفكس الأوامر إلى: ${display}`,
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
  }
};