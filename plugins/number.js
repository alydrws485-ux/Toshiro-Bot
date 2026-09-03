const { getUniqueKicked } = require('../Extractions/dataUtils');

module.exports = {
    command: 'عدد',
    description: 'يعرض عدد الأعضاء المطرودين والمستوى',
    usage: '.عدد',
    category: 'zarf',

    async execute(sock, msg) {
        const kickedData = getUniqueKicked();
        const total = kickedData.count;

        const levels = [
            { threshold: 0, rank: 'مبتدئ' },
            { threshold: 50, rank: 'متدرب' },
            { threshold: 100, rank: 'نشيط' },
            { threshold: 200, rank: 'محترف' },
            { threshold: 400, rank: 'خبير' },
            { threshold: 800, rank: 'قائد' },
            { threshold: 1600, rank: 'نخبة' },
            { threshold: 3200, rank: 'أسطورة' },
            { threshold: 6400, rank: 'بطل' },
            { threshold: 12800, rank: 'سيد' },
            { threshold: 25600, rank: 'زعيم' },
            { threshold: 51200, rank: 'حاكم' },
            { threshold: 102400, rank: 'ملك' },
            { threshold: 204800, rank: 'ملك عظيم' },
            { threshold: 409600, rank: 'إمبراطور' }
        ];

        let level = 0;
        let rank = 'مبتدئ';

        for (let i = levels.length - 1; i >= 0; i--) {
            if (total >= levels[i].threshold) {
                level = i;
                rank = levels[i].rank;
                break;
            }
        }

        const message =
            `المستوى : ${level}\n` +
            `الرتبة : ${rank}\n` +
            `المطرودين : ${total}`;

        await sock.sendMessage(msg.key.remoteJid, { text: message }, { quoted: msg });
    }
};