module.exports = {
  command: 'بوسة',
  description: 'بوسة من اللي كتب الأمر للي انمنشن 💋',
  category: 'fun',

  async execute(sock, msg) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    // إذا ما في منشن
    if (!mentioned || mentioned.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '👈 استخدم الأمر مع منشن، مثال: .بوسة @فلان',
      });
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    const target = mentioned[0];

    const reply = `بوسة من 💋 @${senderId.split('@')[0]} لـ @${target.split('@')[0]}`;

    await sock.sendMessage(msg.key.remoteJid, {
      text: reply,
      mentions: [senderId, target],
    });
  }
};