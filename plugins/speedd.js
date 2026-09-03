module.exports = {
    command: 'سرعة',
    description: 'يقيس سرعة استجابة البوت بدقة وفخامة',
    usage: '.سرعة',
    category: 'zarf',

    async execute(sock, msg) {
        const start = Date.now(); 

        await sock.sendMessage(msg.key.remoteJid, {
            text: '`جارٍ قياس سرعة البوت...`'
        }, { quoted: msg });

        const end = Date.now();
        const delay = end - start;

        const decoratedText = `
╔════════════════════╗
║         𝗦𝗽𝗲𝗲𝗱 𝗣𝗮𝗻𝗲𝗹         ║
╠════════════════════╣
║  ⌛ الاستجابة: [ ${delay}ms ] ║
╚════════════════════╝
          Bot Toshiro 
`;

        return sock.sendMessage(msg.key.remoteJid, {
            text: decoratedText
        }, { quoted: msg });
    }
};