const { proto } = require('@whiskeysockets/baileys');

async function sendMainMenu(sock, jid) {
    await sock.sendMessage(jid, {
        viewOnceMessage: {
            message: {
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: { text: '🚀 أهلاً بك في نظام TROUMA' },
                    footer: { text: 'TROUMA SYSTEM v4.0' },
                    header: {
                        title: '📜 القائمة الرئيسية',
                        subtitle: 'اختر أمرك',
                        hasMediaAttachment: false
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '⚡ بنق',
                                    id: '.ping'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: 'ℹ️ معلومات',
                                    id: '.info'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '📂 الأوامر',
                                    id: '.menu'
                                })
                            }
                        ]
                    }
                })
            }
        }
    });
}

module.exports = {
    sendMainMenu
};