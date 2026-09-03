const fs = require('fs');
const { eliteNumbers } = require('../Extractions/elite.js'); // لو تحمي الأمر للنخبة

module.exports = {
  command: ['طلبات'],
  description: 'إدارة طلبات الانضمام للمجموعة (عرض، قبول، رفض)',
  usage: '.طلبات قائمة\n.طلبات قبول 1|2\n.طلبات رفض 1|2\n.طلبات قبول الكل\n.طلبات رفض الكل',
  category: 'المجموعات',

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;

      // قراءة النص الكامل للرسالة
      const fullText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      const parts = fullText.trim().split(/\s+/);
      const subCommand = parts[1] ? parts[1].toLowerCase() : '';
      const options = parts.slice(2).join(' ').toLowerCase();

      const imagePath = 'image.jpeg';
      const imageBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;

      const reply = async (text) => {
        await sock.sendMessage(chatId, {
          text,
          contextInfo: {
            externalAdReply: {
              title: 'بوت الإدارة',
              body: 'إدارة طلبات الانضمام',
              thumbnail: imageBuffer,
              mediaType: 1,
              sourceUrl: 'https://t.me/YourChannel',
              renderLargerThumbnail: false,
              showAdAttribution: true
            }
          }
        }, { quoted: msg });
      };

      const joinRequestList = await sock.groupRequestParticipantsList(chatId);

      if (subCommand === 'قائمة') {
        if (joinRequestList.length === 0) return reply('لا توجد طلبات انضمام معلقة حالياً.');
        const listText = joinRequestList.map((r, i) => {
          const date = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                       .format(new Date(r.request_time * 1000));
          return `*${i + 1}.* الرقم: ${r.jid.split('@')[0]} - طريقة الطلب: ${r.request_method} - التاريخ: ${date}`;
        }).join('\n\n');
        return reply(`*قائمة طلبات الانضمام:*\n\n${listText}`);
      }

      if (subCommand === 'قبول' || subCommand === 'رفض') {
        if (!options) return reply(`يرجى تحديد الأعضاء أو استخدام "الكل".\nمثال: .طلبات ${subCommand} الكل أو .طلبات ${subCommand} 1|2`);

        let targets = [];
        if (options === 'الكل') {
          targets = joinRequestList.map(r => r.jid);
        } else {
          const indices = options.split('|').map(x => parseInt(x.trim()) - 1)
                                 .filter(i => i >= 0 && i < joinRequestList.length);
          targets = indices.map(i => joinRequestList[i].jid);
        }

        if (targets.length === 0) return reply('لم يتم العثور على طلبات تناسب الأرقام المدخلة.');

        // هنا المعالجة بالتوازي
        const results = await Promise.all(targets.map(async jid => {
          try {
            const res = await sock.groupRequestParticipantsUpdate(chatId, [jid], subCommand === 'قبول' ? 'approve' : 'reject');
            const status = res[0]?.status === 'success' ? 'نجح' : 'فشل';
            return `• الرقم: ${jid.split('@')[0]} - الحالة: ${status}`;
          } catch {
            return `• الرقم: ${jid.split('@')[0]} - الحالة: خطأ`;
          }
        }));

        return reply(`تم ${subCommand === 'قبول' ? 'قبول' : 'رفض'} الطلبات:\n\n${results.join('\n')}`);
      }

      return reply(`أمر غير معروف.\nيرجى استخدام:\n- .طلبات قائمة\n- .طلبات قبول [رقم|الكل]\n- .طلبات رفض [رقم|الكل]`);

    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة لاحقاً.' }, { quoted: msg });
    }
  }
};