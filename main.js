>const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidDecode } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const { exec } = require('child_process');
const express = require('express');
const qrcode = require('qrcode');
const logger = require('./utils/console');

// إعداد سيرفر الويب البسيط لعرض الـ QR Code
const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = '';

app.get('/', (req, res) => {
    if (qrCodeData) {
        res.send(`
            <html>
                <head>
                    <title>Toshiro-Bot QR Code</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { background: #0f172a; color: #fff; font-family: sans-serif; text-align: center; padding-top: 50px; }
                        .container { background: #1e293b; display: inline-block; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                        h2 { color: #38bdf8; }
                        img { margin-top: 20px; border-radius: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Toshiro-Bot v4.0 - QR Code</h2>
                        <p>امسح الكود التالي من تطبيق واتساب (الأجهزة المرتبطة > ربط جهاز)</p>
                        <img src="${qrCodeData}" alt="QR Code" />
                    </div>
                </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
                <head>
                    <title>Toshiro-Bot</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { background: #0f172a; color: #fff; font-family: sans-serif; text-align: center; padding-top: 100px; }
                    </style>
                </head>
                <body>
                    <h2>البوت قيد التشغيل أو تم الاتصال بنجاح!</h2>
                    <p>إذا لم يظهر الكود، أعد تشغيل الخدمة في رندر.</p>
                </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

// استدعاء الموديول مرة واحدة فقط لضمان السرعة العالية وخفة الاستجابة
const { handleMessages, handleMessagesLoader } = require('./Shapes/handler');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

const contactsPath = path.join(__dirname, 'data', 'جهات.json');
const linksPath = path.join(__dirname, 'data', 'روابط.json');

// ⚡ ذاكرة سريعة في الرام (In-Memory Cache) للاستجابة اللحظية
let contactsCache = {};
let linksCache = {};
let groupAdminsCache = new Map();

// ⚡ إنشاء خريطة الأوامر العامة
global.commands = new Map();

function loadCaches() {
    try {
        if (fs.existsSync(contactsPath)) contactsCache = fs.readJsonSync(contactsPath);
        if (fs.existsSync(linksPath)) linksCache = fs.readJsonSync(linksPath);
    } catch (e) {}
}
loadCaches();

async function getGroupAdmins(sock, groupJid) {
    if (groupAdminsCache.has(groupJid)) {
        return groupAdminsCache.get(groupJid);
    }
    try {
        const metadata = await sock.groupMetadata(groupJid);
        const admins = metadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => decode(p.id));
        
        groupAdminsCache.set(groupJid, admins);
        setTimeout(() => groupAdminsCache.delete(groupJid), 5 * 60 * 1000);
        return admins;
    } catch (e) {
        return [];
    }
}

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    gold: '\x1b[38;5;220m',  
    red: '\x1b[38;5;196m',  
    blue: '\x1b[38;5;21m',  
    purple: '\x1b[38;5;93m',  
    cyan: '\x1b[38;5;51m',  
    green: '\x1b[38;5;46m',  
    yellow: '\x1b[38;5;226m',  
    white: '\x1b[38;5;255m',  
    gray: '\x1b[38;5;245m'
};

class ColorEffects {
    static frame = 0;

    static glow(text) {  
        this.frame++;  
        const colors = [COLORS.gold, COLORS.red, COLORS.blue, COLORS.purple, COLORS.cyan];  
        const color = colors[Math.floor(this.frame / 3) % colors.length];  
        return color + text + COLORS.reset;  
    }  

    static pulse(text) {  
        const intensity = (Math.sin(Date.now() / 200) + 1) / 2;  
        if (intensity > 0.7) return COLORS.gold + text + COLORS.reset;  
        if (intensity > 0.4) return COLORS.red + text + COLORS.reset;  
        return COLORS.purple + text + COLORS.reset;  
    }  

    static matrix(text) {  
        const green = Math.sin(Date.now() / 150) * 127 + 128;  
        return `\x1b[38;2;0;${Math.floor(green)};0m${text}${COLORS.reset}`;  
    }  

    static clock() {  
        const now = new Date();  
        const h = now.getHours().toString().padStart(2, '0');  
        const m = now.getMinutes().toString().padStart(2, '0');  
        const s = now.getSeconds().toString().padStart(2, '0');  
        return this.glow(`[${h}:${m}:${s}]`);  
    }
}

async function showHeader() {
    console.clear();
    console.log(COLORS.purple + '='.repeat(80) + COLORS.reset);  
    console.log(COLORS.gold + '╔══════════════════════════════════════════════════════════════════╗' + COLORS.reset);  
    console.log(COLORS.red + '║                                                                      ║' + COLORS.reset);  
    console.log(COLORS.blue + '║    ████████╗██████╗  ██████╗ ██╗   ██╗███╗   ███╗ █████╗         ║' + COLORS.reset);  
    console.log(COLORS.purple + '║    ╚══██╔══╝██╔══██╗██╔═══██╗██║   ██║████╗ ████║██╔══██╗        ║' + COLORS.reset);  
    console.log(COLORS.gold + '║       ██║   ██████╔╝██║   ██║██║   ██║██╔████╔██║███████║        ║' + COLORS.reset);  
    console.log(COLORS.red + '║       ██║   ██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║██╔══██║        ║' + COLORS.reset);  
    console.log(COLORS.blue + '║       ██║   ██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║  ██║        ║' + COLORS.reset);  
    console.log(COLORS.purple + '║       ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝        ║' + COLORS.reset);  
    console.log(COLORS.gold + '║                                                                      ║' + COLORS.reset);  
    console.log(COLORS.red + '║                    T O S H I R O   S Y S T E M                       ║' + COLORS.reset);  
    console.log(COLORS.blue + '║                         V E R S I O N   4 . 0                         ║' + COLORS.reset);  
    console.log(COLORS.purple + '║                                                                      ║' + COLORS.reset);  
    console.log(COLORS.gold + '╚══════════════════════════════════════════════════════════════════╝' + COLORS.reset);  
    console.log(COLORS.purple + '='.repeat(80) + COLORS.reset);  
}

async function loading(text, duration = 400) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {  
        await new Promise(resolve => setTimeout(resolve, duration / steps));  
    }  
}

function playSound(name) {}

function showMsg(type, message) {}

function showCopyright() {}

async function handleFastProtection(sock, messages) {
    if (!Array.isArray(messages) || messages.length === 0) return;
    const deleteTasks = [];
    const linkSendersToWarn = new Map();

    for (const msg of messages) {
        if (msg.key?.fromMe) continue;
        const groupJid = msg.key?.remoteJid;
        if (!groupJid || !groupJid.endsWith('@g.us')) continue;

        const rawSender = msg.key.participant || msg.participant || groupJid;
        const senderJid = decode(rawSender);
        const m = msg.message || {};

        if (linksCache[groupJid] === true) {
            const textContent = m.conversation || m.extendedTextMessage?.text || '';
            const linkRegex = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[A-Za-z0-9]+)/gi;

            if (linkRegex.test(textContent)) {
                const admins = await getGroupAdmins(sock, groupJid);
                if (admins.includes(senderJid)) continue;

                deleteTasks.push(
                    sock.sendMessage(groupJid, {
                        delete: { remoteJid: groupJid, fromMe: false, id: msg.key.id, participant: rawSender }
                    })
                );
            }
        }
    }
    if (deleteTasks.length > 0) Promise.allSettled(deleteTasks);
}

async function startBot() {
    try {
        await showHeader();
        const sessionDir = path.join(__dirname, 'ملف_الاتصال');
        await fs.ensureDir(sessionDir);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            browser: ['MacOs', 'Chrome', '1.0.0'],
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCodeData = await qrcode.toDataURL(qr);
                console.log('⚡ QR CODE GENERATED! Open your Render URL to scan it.');
            }

            if (connection === 'open') {
                qrCodeData = ''; // مسح الكود بعد الاتصال الناجح
                console.log('CONNECTED TO WHATSAPP SUCCESSFULLY!');

                if (typeof handleMessagesLoader === 'function') {
                    handleMessagesLoader();
                }
            }

            if (connection === 'close') {
                const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
                if (!isLoggedOut) {
                    setTimeout(startBot, 3000);
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            try {
                if (!m.messages || m.messages.length === 0) return;
                handleFastProtection(sock, m.messages);
                await handleMessages(sock, m);
            } catch (err) {}
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        setTimeout(startBot, 3000);
    }
}

startBot();

