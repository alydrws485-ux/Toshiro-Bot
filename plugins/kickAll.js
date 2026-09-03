const { addKicked, getUniqueKicked } = require('../Extractions/dataUtils');
const { jidDecode } = require('@whiskeysockets/baileys');
const { isElite } = require('../Extractions/elite.js');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'تصفية',
    description: 'طرد الأعضاء غير الإداريين من المجموعة (للنخبة فقط)',
    category: 'zarf',
    usage: '.طرد',

    async execute(sock, msg) {
        const groupJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!isElite(sender)) {
            return sock.sendMessage(groupJid, { text: '❌ هذا الأمر مخصص للنخبة فقط.' }, { quoted: msg });
        }

        const botJid = decode(sock.user.id);
        const groupMetadata = await sock.groupMetadata(groupJid);

        const admins = groupMetadata.participants
            .filter(p => p.admin || p.isAdmin)
            .map(p => p.id);

        const toRemove = groupMetadata.participants
            .filter(p => !admins.includes(p.id) && p.id !== botJid)
            .map(p => p.id);

        if (toRemove.length === 0) {
            return sock.sendMessage(groupJid, { text: 'لا يوجد أعضاء يمكن طردهم.' }, { quoted: msg });
        }

        await sock.groupParticipantsUpdate(groupJid, toRemove, 'remove');

        const lids = toRemove.map(id => decode(id));
        const totalAfter = addKicked(lids).count;

        await sock.sendMessage(
            groupJid,
            { text: `✅ تم طرد ${lids.length} عضو.\n📦 العدد الإجمالي الفريد للطرد: ${totalAfter}` },
            { quoted: msg }
        );
    }
};