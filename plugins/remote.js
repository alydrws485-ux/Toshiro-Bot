const { getPlugins } = require('../Shapes/plugins.js');
const { isElite } = require('../Extractions/elite');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: 'ج',
  description: '📂 تنفيذ أوامر في مجموعات أخرى بسرعة وفخامة',
  category: 'tools',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;
    const sender = decode(msg.key.participant || msg.participant || chatId);
    const senderLid = sender.split('@')[0];

    if (!(await isElite(senderLid))) {
      return sock.sendMessage(chatId, {
        text: '🚫 *︙هذا الأمر مخصص للنخبة فقط.*',
      }, { quoted: msg });
    }

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const input = text.trim().split(/\s+/).slice(1);
    const indexOrCommand = input[0];
    const commandText = input.slice(1).join(' ');

    const allChats = await sock.groupFetchAllParticipating();
    const groups = Object.values(allChats);

    if (!indexOrCommand || indexOrCommand === 'عرض') {
      const list = groups.map((group, i) => `*${i + 1}.* ${group.subject}`).join('\n');
      return sock.sendMessage(chatId, {
        text:
`╭━━━ ⪩ 📋 𝑮𝑹𝑶𝑼𝑷𝑺 ⪨ ━━━╮

${list}

╰━━━ ⪩ ✦ ⪨ ━━━╯

⚙️ لاستخدام الأمر:
*.ب [رقم] [أمر]*  
مثال: *ب 3 .اوامر*
`
      }, { quoted: msg });
    }

    const index = parseInt(indexOrCommand);
    if (isNaN(index) || !commandText) {
      return sock.sendMessage(chatId, {
        text: '⚠️ *︙الاستخدام الصحيح:*\n*.ب [رقم] [أمر]*\nمثال: *ب 2 .منشن*'
      }, { quoted: msg });
    }

    const group = groups[index - 1];
    if (!group) {
      return sock.sendMessage(chatId, {
        text: `❌ *︙لا يوجد مجموعة بالرقم:* ${index}`
      }, { quoted: msg });
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo || {};

    const fakeMsg = {
      key: {
        remoteJid: group.id,
        participant: sender,
        fromMe: false,
        id: msg.key.id
      },
      message: {
        extendedTextMessage: {
          text: commandText,
          contextInfo: {
            ...contextInfo,
            participant: sender,
            mentionedJid: [sender]
          }
        }
      }
    };

    const allPlugins = getPlugins();
    const cmdName = commandText.trim().split(/\s+/)[0].replace(/^\./, '').toLowerCase();
    const cmdArgs = commandText.trim().split(/\s+/).slice(1);

    const plugin = Object.values(allPlugins).find(p => {
      if (!p.command) return false;
      const commands = Array.isArray(p.command) ? p.command : [p.command];
      return commands.some(c => c.replace(/^\./, '').toLowerCase() === cmdName);
    });

    if (!plugin) {
      return sock.sendMessage(chatId, {
        text: `🚫 *︙الأمر غير موجود:* ${cmdName}`
      }, { quoted: msg });
    }

    try {
      const start = Date.now();

      await plugin.execute(sock, fakeMsg, cmdArgs);

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      await sock.sendMessage(chatId, {
        text: 
`✅ *︙تم تنفيذ الأمر بنجاح داخل المجموعة:*
*${group.subject}*
🕒 *(في ${duration} ثانية)*`
      }, { quoted: msg });
    } catch (err) {
      console.error('⛔ خطأ أثناء التنفيذ:', err);
      await sock.sendMessage(chatId, {
        text: '⚠️ *︙حدث خطأ أثناء تنفيذ الأمر داخل المجموعة.*'
      }, { quoted: msg });
    }
  }
};