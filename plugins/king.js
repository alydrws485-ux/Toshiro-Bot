//حقوق زوفان محفوضه 
const { eliteNumbers, extractPureNumber } = require('../Extractions/elite');

module.exports = {
  command: 'تفعيل',
  description: '.تست',
  category: 'التفاعل',
  usage: '.تفعيل',

  async execute(sock, msg) {
    try {
      const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
      const senderNumber = extractPureNumber(senderJid);
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      if (!eliteNumbers.includes(senderNumber)) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: '🚫 هذا الأمر مخصص للنخبة فقط.\n\n⚪︎ 𝓟𝓸𝔀𝓮𝓻𝓮𝓭 𝓫𝔂 𝓩𝓞𝓤𝓕𝓐𝓝 ⚪︎'
        }, { quoted: msg });
      }

      if (!sock.eliteReactionListenerSet) {
        sock.ev.on('messages.upsert', async ({ messages }) => {
          const m = messages[0];
          if (!m.message || !m.key) return;
          const from = m.key.remoteJid;
          if (!from.endsWith('@g.us')) return;

          const sender = m.key.participant || m.key.remoteJid;
          const senderPure = extractPureNumber(sender);
          if (!eliteNumbers.includes(senderPure) && sender !== botJid) return;

          const reactions = [
            // الوجوه التعبيرية
            "💱", "💲", "👽", "🐦‍⬛", "🐦", "🧨", "❌", "🕹", "📧", "🎥",
            // الإيماءات
             "🧁", "📼", "🧧", "❤", "💋", "🫦", "🍷", "🍾", "🥂",
            // الطعام والشراب
            "🍕", "🍔", "🍟", "🌮", "🍣", "🍩", "🍫", "🍪", "🍭", "🥤",
            // السفر والأماكن الممتعة
            "🚗", "✈️", "🏰", "🚀", "🗽", "🌆", "🏞️", "🏝️", "🌇", "🏜️",
            // الأنشطة
            "⚽", "🏀", "🏆", "🎯", "🎮", "🎲", "🎸", "🎤", "🎧", "🥇",
            // الأشياء
            "📱", "💻", "💡", "🎁", "💎", "📦", "🕹️", "💣", "🔮", "🛡️",
            // الرموز الشائعة
            "❤️", "💔", "🔥", "💯", "🌟", "✨", "⚡", "🎉", "💥", "💤"
          ];

          const reactEmoji = reactions[Math.floor(Math.random() * reactions.length)];

          try {
            await sock.sendMessage(from, {
              react: { text: reactEmoji, key: m.key }
            });
          } catch (error) {
            console.error('❌ خطأ في إرسال رد الفعل:', error.message || error);
          }
        });

        sock.eliteReactionListenerSet = true;
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: 'حاضر'
      }, { quoted: msg });

    } catch (err) {
      console.error('❌ خطأ في أمر تفعيل:', err);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n${err.message || err.toString()}`
      }, { quoted: msg });
    }
  }
};