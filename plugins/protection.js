const { eliteNumbers } = require('../Extractions/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';
const protectionState = { active: false };

module.exports = {
command: 'ح',
description: 'تشغيل حماية المشرفين ومنع التلاعب بالاسم والوصف',
usage: '.ح',
category: 'protection',
protectionState,

async execute(sock, msg) {
const groupJid = msg.key.remoteJid;
const sender = decode(msg.key.participant || groupJid);
const senderNum = sender.split('@')[0];

if (!groupJid.endsWith('@g.us'))  
  return await sock.sendMessage(groupJid, { text: '❗ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });  

if (!eliteNumbers.includes(senderNum))  
  return await sock.sendMessage(groupJid, { text: '❗ لا تملك صلاحية استخدام هذا الأمر.' }, { quoted: msg });  

protectionState.active = true;  

await sock.sendMessage(groupJid, {  
  text: '✅ تم تفعيل الحماية بنجاح.'  
}, { quoted: msg });  

let currentSubject = '';  
let currentDescription = '';  
let currentAdmins = [];  

const updateMeta = async () => {  
  const meta = await sock.groupMetadata(groupJid);  
  currentSubject = meta?.subject || '';  
  currentDescription = meta?.desc || '';  
  currentAdmins = meta.participants  
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')  
    .map(p => decode(p.id));  
};  

await updateMeta();  

sock.ev.on('groups.update', async updates => {  
  if (!protectionState.active) return;  

  for (const update of updates) {  
    if (update.id !== groupJid) continue;  

    const author = update.author || '';  
    const authorNum = decode(author).split('@')[0];  
    if (eliteNumbers.includes(authorNum)) continue;  

    let changed = false;  
    let warning = `🚨 **تحذير شديد** 🚨\nمين سمح للعبد بالتلاعب🫦!\n\n`;  
    warning += `📛 الرقم: @${authorNum}\n`;  
    warning += `📅 التاريخ: ${new Date().toLocaleString()}\n`;  
    warning += `⚠️ تم محاولة تغيير `;  

    if (typeof update.subject !== 'undefined' && update.subject !== currentSubject) {  
      changed = true;  
      warning += 'اسم المجموعة';  
      await sock.groupUpdateSubject(groupJid, currentSubject).catch(() => {});  
    }  

    if (typeof update.desc !== 'undefined' && update.desc !== currentDescription) {  
      warning += (changed ? ' و ' : '') + 'وصف المجموعة';  
      changed = true;  
      await sock.groupUpdateDescription(groupJid, currentDescription).catch(() => {});  
    }  

    if (changed) {  
      warning += `\n\n⛔️ لا يسمح لغير النخبة بتغيير إعدادات المجموعة.\n🛡️ تم إعادة الإعدادات إلى الوضع الآمن.\n🔔 سيتم سحب الإشراف من أي محاولة تلاعب.\n⚔️ احترم القوانين ولا تحاول التلاعب مرة أخرى!`;  

      const groupMetadata = await sock.groupMetadata(groupJid);  
      const botNumber = decode(sock.user.id);  
      const target = groupMetadata.participants.find(p => decode(p.id) === decode(author));  

      if (target?.admin && target.id !== botNumber) {  
        await sock.groupParticipantsUpdate(groupJid, [target.id], 'demote');  
      }  

      await sock.sendMessage(groupJid, {  
        text: warning,  
        mentions: [author]  
      });  
    }  
  }  
});  

sock.ev.on('group-participants.update', async update => {  
  if (!protectionState.active || update.id !== groupJid) return;  

  const groupMetadata = await sock.groupMetadata(groupJid);  
  const botNumber = decode(sock.user.id);  
  const author = update.author || '';  
  const authorNum = decode(author).split('@')[0];  

  if (author === botNumber || eliteNumbers.includes(authorNum)) return;  

  const toDemote = [];  

  for (const participant of update.participants) {  
    const participantNum = decode(participant).split('@')[0];  
    const targetNow = groupMetadata.participants.find(p => decode(p.id) === decode(participant));  
    const isNowAdmin = targetNow?.admin === 'admin' || targetNow?.admin === 'superadmin';  
    const wasAdminBefore = currentAdmins.includes(decode(participant));  

    // منع إعطاء إشراف لغير النخبة  
    if (update.action === 'promote' && isNowAdmin && !eliteNumbers.includes(participantNum)) {  
      toDemote.push(targetNow.id);  
    }  

    // إذا شخص مش من النخبة سحب إشراف شخص كان مشرف  
    if (update.action === 'demote' && wasAdminBefore && author !== participant) {  
      await sock.groupParticipantsUpdate(groupJid, [participant], 'promote').catch(() => {});  
      await sock.groupParticipantsUpdate(groupJid, [author], 'demote').catch(() => {});  

      const message = `🚨 محاولة تلاعب تم كشفها 🚨

📛 المتلاعب: @${authorNum}
🎯 الضحية: @${participantNum}
📅 التاريخ: ${new Date().toLocaleString()}

⚔️ تم استرجاع الإشراف للضحية وسحب الإشراف من المتلاعب.
🔔 لا يُسمح بإزالة إشراف دون صلاحية.`;

await sock.sendMessage(groupJid, {  
        text: message,  
        mentions: [author, participant]  
      });  
    }  
  }  

  // إذا عطى إشراف وتم التحقق أنه هو مش من النخبة، يتم سحب إشرافه  
  const authorInGroup = groupMetadata.participants.find(p => decode(p.id) === decode(author));  
  if (authorInGroup?.admin && author !== botNumber && update.action === 'promote') {  
    toDemote.push(authorInGroup.id);  
  }  

  if (toDemote.length > 0) {  
    await sock.groupParticipantsUpdate(groupJid, toDemote, 'demote');  
    const mentions = [author, ...toDemote];  
    const demotedNums = toDemote.map(id => `@${decode(id).split('@')[0]}`).join(', ');  

    const message = `🚨 كشف عملية تلاعب بالإشراف 🚨

📛 المتلاعب: @${authorNum}
🗓️ التاريخ: ${new Date().toLocaleString()}
⚠️ تم إعطاء إشراف بدون صلاحية!
⚔️ تم سحب الإشراف من: ${demotedNums}
🔔 تكرار التلاعب = عقوبات أشد.`;

await sock.sendMessage(groupJid, {  
      text: message,  
      mentions  
    });  
  }  

  // تحديث قائمة المشرفين بعد كل تعديل  
  await updateMeta();  
});

}
};