const { jidDecode } = require('@whiskeysockets/baileys');

module.exports = {
    command: 'فحص',
    category: 'tools',
    description: 'عرض حالة البوت وسرعة استجابته بشكل فخم',

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;

            const start = Date.now();
            const uptimeSeconds = process.uptime();
            const uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);
            const end = Date.now();
            const ping = end - start;

            const decoratedStatus = `
╔══════════════════════╗
║      𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦      ║
╠══════════════════════╣
║  مدة التشغيل:  ${uptimeFormatted}  ║
║  سرعة الاستجابة: ${ping} ms ║
╚══════════════════════╝
          bot Toshiro 
      
`.trim();

            await sock.sendMessage(chatId, { text: decoratedStatus }, { quoted: msg });

        } catch (error) {
            console.error('خطأ في كود حالة البوت:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'حدث خطأ أثناء جلب حالة البوت، حاول لاحقًا.' }, { quoted: msg });
        }
    }
};