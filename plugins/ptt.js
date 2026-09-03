const fs = require('fs');
const path = require('path');

// دالة الرسالة الوهمية
function fakeQuoted(chatId) {
    return {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: chatId,
            id: "RICLX_klash" + Date.now()
        },
        message: {
            videoMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7118-24/12345678_gif.mp4",
                mimetype: "video/mp4",
                caption: "Toshiro_Snow ",
                fileLength: "12345",
                seconds: 3,
                gifPlayback: true,
                jpegThumbnail: null
            }
        }
    };
}

module.exports = {
    command: 'ptt',
    description: 'يرسل فيديو محدد كرسالة دائرية (PTV)',
    usage: '.ptt',
    category: 'fun',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        // مسار الفيديو
        const filePath = 'media/video.mp4';
        const absolutePath = path.join(process.cwd(), filePath);

        // التأكد من وجود الملف
        if (!fs.existsSync(absolutePath)) {
            console.error(`[PTV] Error: File not found: ${filePath}`);
            return await sock.sendMessage(jid, {
                text: "❌ الملف المطلوب غير موجود."
            }, { quoted: msg });
        }

        try {
            // قراءة الفيديو
            const fileBuffer = fs.readFileSync(absolutePath);

            // إعداد الرسالة كـ PTV
            const messageOptions = {
                video: fileBuffer,
                mimetype: 'video/mp4',
                ptv: true
            };

            // إرسال الفيديو
            await sock.sendMessage(jid, messageOptions, { quoted: fakeQuoted(jid) });

        } catch (error) {
            console.error("Error sending PTV:", error);
            await sock.sendMessage(jid, {
                text: "❌ حدث خطأ أثناء إرسال الفيديو."
            }, { quoted: msg });
        }
    }
};