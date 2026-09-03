const fs = require('fs');
const path = require('path');
const { isElite, eliteNumbers, vipNumbers, extractPureNumber } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const dataDir = path.join(__dirname, '..', 'data');
const monitorFile = path.join(dataDir, 'monitorState.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(monitorFile)) fs.writeFileSync(monitorFile, JSON.stringify({}));

const loadMonitorState = () => {
  try {
    return JSON.parse(fs.readFileSync(monitorFile));
  } catch (err) {
    console.error("📛 خطأ في قراءة ملف المراقبة:", err);
    return {};
  }
};

const saveMonitorState = (data) => {
  try {
    fs.writeFileSync(monitorFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("📛 خطأ في حفظ ملف المراقبة:", err);
  }
};

let handlerAttached = false;

const BOT_ID = '68831817015450';
const BOT_PHONE = '212609968650';

module.exports = {
  command: 'مراقبة',
  description: 'يراقب الترقية أو الخفض ويعيد الإشراف للنخبة فقط',
  usage: '.مراقبة / .راقب',
  category: 'zarf',

  async execute(sock, msg) {
    const groupId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
    const senderNumber = extractPureNumber(sender);

    if (!groupId || !groupId.endsWith('@g.us')) {
      return sock.sendMessage(groupId, { text: '❌ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });
    }

    // فحص الصلاحية عبر دالة isElite المعدلة
    if (!isElite(senderNumber)) {
      return sock.sendMessage(groupId, { text: '⚠️ هذا الأمر مخصص فقط لأعضاء النخبة [Toshiro].' }, { quoted: msg });
    }

    const state = loadMonitorState();

    if (state[groupId]) {
      delete state[groupId];
      saveMonitorState(state);
      return sock.sendMessage(groupId, { text: '🛑 تم إلغاء مراقبة هذه المجموعة.' }, { quoted: msg });
    }

    state[groupId] = true;
    saveMonitorState(state);
    await sock.sendMessage(groupId, { text: '✅ تم تفعيل مراقبة الإشراف على هذه المجموعة.' }, { quoted: msg });

    if (handlerAttached) return;

    sock.ev.on('group-participants.update', async (update) => {
      const activeState = loadMonitorState();
      const isMonitored = activeState[update.id];

      if (!isMonitored || !['promote', 'demote'].includes(update.action)) return;

      try {
        const metadata = await sock.groupMetadata(update.id);
        const ownerId = metadata.owner;

        // سحب الإشراف من المشرفين غير النخبة، غير VIP، غير البوت، وغير مالك القروب
        const allAdminsToDemote = metadata.participants
          .filter(p => {
            const userNum = extractPureNumber(p.id);
            return (
              p.admin === 'admin' &&
              userNum !== BOT_ID &&
              userNum !== BOT_PHONE &&
              p.id !== ownerId &&
              !isElite(userNum)
            );
          })
          .map(p => p.id);

        if (allAdminsToDemote.length > 0) {
          await sock.groupParticipantsUpdate(update.id, allAdminsToDemote, 'demote');
        }

        // ترقية النخبة والـ VIP تلقائياً إذا لم يكونوا مشرفين
        const eliteToPromote = metadata.participants
          .filter(p => {
            const userNum = extractPureNumber(p.id);
            return isElite(userNum) && userNum !== BOT_ID && userNum !== BOT_PHONE && p.admin !== 'admin';
          })
          .map(p => p.id);

        if (eliteToPromote.length > 0) {
          await sock.groupParticipantsUpdate(update.id, eliteToPromote, 'promote');
        }

      } catch (err) {
        console.error("❌ خطأ أثناء تنفيذ مراقبة الإشراف:", err);
      }
    });

    handlerAttached = true;
  }
};
