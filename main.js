const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidDecode } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const logger = require('./utils/console');

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
    console.log(COLORS.red + '║                    T R O U M A   S Y S T E M                       ║' + COLORS.reset);  
    console.log(COLORS.blue + '║                         V E R S I O N   4 . 0                         ║' + COLORS.reset);  
    console.log(COLORS.purple + '║                                                                      ║' + COLORS.reset);  
    console.log(COLORS.gold + '╚══════════════════════════════════════════════════════════════════╝' + COLORS.reset);  
    console.log(COLORS.purple + '='.repeat(80) + COLORS.reset);  
    
    console.log(ColorEffects.glow('\n' + '*'.repeat(36) + ' SYSTEM INFO ' + '*'.repeat(36)));  
    console.log(ColorEffects.pulse(' Time: ' + ColorEffects.clock()));  
    console.log(ColorEffects.matrix('─'.repeat(80)));
}

async function loading(text, duration = 400) {
    const frames = ['|', '/', '-', '\\'];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {  
        const frame = frames[i % frames.length];  
        const bar = ColorEffects.glow('#'.repeat(i)) + COLORS.gray + '.'.repeat(steps - i) + COLORS.reset;  
        const percent = Math.floor((i / steps) * 100);  
        
        process.stdout.write(`\r${ColorEffects.glow(frame)} ${ColorEffects.pulse(text)} [${bar}] ${ColorEffects.glow(percent + '%')}`);  
        await new Promise(resolve => setTimeout(resolve, duration / steps));  
    }  
    console.log(' ' + COLORS.green + 'OK' + COLORS.reset);
}

function playSound(name) {
    try {
        const controlPath = path.join(__dirname, 'sounds', 'sound.txt');
        const status = fs.existsSync(controlPath) ? fs.readFileSync(controlPath, 'utf-8').trim() : 'off';
        if (status !== '{on}') return;
        const filePath = path.join(__dirname, 'sounds', name);
        if (fs.existsSync(filePath)) {
            exec(`mpv --no-terminal --really-quiet "${filePath}" > /dev/null 2>&1 &`);
        }
    } catch (e) {}
}

function showMsg(type, message) {
    const icons = { 'info': 'i', 'success': '+', 'error': '!', 'warning': '*', 'connect': '>' };
    const colors = { 'info': COLORS.cyan, 'success': COLORS.green, 'error': COLORS.red, 'warning': COLORS.yellow, 'connect': COLORS.blue };  
    
    console.log(`\n${ColorEffects.glow('[')}${colors[type] || COLORS.white}${icons[type] || '~'}${ColorEffects.glow(']')}`);  
    console.log(ColorEffects.pulse(message));  
    console.log(ColorEffects.glow('─'.repeat(60)));
}

function showCopyright() {
    console.log(ColorEffects.glow('\n' + '#'.repeat(80)));
    console.log(ColorEffects.pulse('           T R O U M A   S Y S T E M   ©   2 0 2 4 - 2 0 2 6           '));
    console.log(ColorEffects.glow('                 Premium WhatsApp Bot System v4.0                 '));
    console.log(ColorEffects.glow('#'.repeat(80) + '\n'));
}

const questionEnhanced = text => new Promise(resolve => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(ColorEffects.glow(text), answer => {
        rl.close();
        resolve(answer);
    });
});

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

        if (contactsCache[groupJid] === true) {
            const isContact = 
                !!m.contactMessage || 
                !!m.contactsArrayMessage ||
                !!m.viewOnceMessage?.message?.contactMessage ||
                !!m.viewOnceMessage?.message?.contactsArrayMessage ||
                !!m.viewOnceMessageV2?.message?.contactMessage ||
                !!m.viewOnceMessageV2?.message?.contactsArrayMessage ||
                !!m.ephemeralMessage?.message?.contactMessage ||
                !!m.ephemeralMessage?.message?.contactsArrayMessage;

            if (isContact) {
                deleteTasks.push(
                    sock.sendMessage(groupJid, {
                        delete: { remoteJid: groupJid, fromMe: false, id: msg.key.id, participant: rawSender }
                    })
                );
                sock.groupSettingUpdate(groupJid, 'announcement').catch(() => {});
                continue;
            }
        }

        if (linksCache[groupJid] === true) {
            const textContent = 
                m.conversation ||
                m.extendedTextMessage?.text ||
                m.imageMessage?.caption ||
                m.videoMessage?.caption ||
                m.documentMessage?.caption ||
                m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
                m.buttonsResponseMessage?.selectedButtonId ||
                m.templateButtonReplyMessage?.selectedId ||
                '';

            const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|net|org|me|io|co|app|xyz|site|online|store|info|tv|cc|cc\/|group|link|page|linktree|top|club|biz|dev|id)[^\s]*|chat\.whatsapp\.com\/[A-Za-z0-9]+|wa\.me\/[0-9]+)/gi;

            if (linkRegex.test(textContent)) {
                const admins = await getGroupAdmins(sock, groupJid);
                if (admins.includes(senderJid)) continue;

                deleteTasks.push(
                    sock.sendMessage(groupJid, {
                        delete: { remoteJid: groupJid, fromMe: false, id: msg.key.id, participant: rawSender }
                    })
                );

                if (!linkSendersToWarn.has(groupJid)) {
                    linkSendersToWarn.set(groupJid, new Set());
                }
                linkSendersToWarn.get(groupJid).add(rawSender);
            }
        }
    }

    if (deleteTasks.length === 0) return;

    Promise.allSettled(deleteTasks);

    for (const [groupJid, senders] of linkSendersToWarn.entries()) {
        const mentions = Array.from(senders).map(s => decode(s));
        const tags = mentions.map(m => `@${m.split('@')[0]}`).join(' ');

        sock.sendMessage(groupJid, {
            text: `⚠️ *تنبيه منع الروابط*\n\nعذراً ${tags}، يُمنع إرسال الروابط داخل المجموعة!\n🗑️ *تم حذف الرسالة فوراً.*`,
            mentions: mentions
        }).catch(() => {});
    }
}

async function startBot() {
    try {
        await showHeader();
        playSound('start.mp3');

        showMsg('info', 'Starting TROUMA System v4.0');  
        showCopyright();  

        const sessionDir = path.join(__dirname, 'ملف_الاتصال');
        await fs.ensureDir(sessionDir);

        await loading('Loading Core', 500);  
        await loading('Security System', 400);  
        await loading('WhatsApp API', 600);  
        await loading('Command Modules', 450);  

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['MacOs', 'Chrome', '1.0.0'],
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true
        });

        fs.watchFile(contactsPath, () => loadCaches());
        fs.watchFile(linksPath, () => loadCaches());

        sock.ev.on('group-participants.update', ({ id }) => {
            groupAdminsCache.delete(id);
        });

        sock.ev.on('groups.upsert', async (groups) => {
            for (const group of groups) {
                try {
                    await sock.groupMetadata(group.id);
                    console.log(COLORS.green + `[+] تم تحميل بيانات مجموعة: ${group.subject}` + COLORS.reset);
                } catch (err) {
                    console.log(COLORS.yellow + `[-] فشل في تحميل بيانات مجموعة: ${group.id}` + COLORS.reset);
                }
            }
        });

        if (!sock.authState.creds.registered) {
            console.log(ColorEffects.glow('\n' + '-'.repeat(36) + ' PAIRING SYSTEM ' + '-'.repeat(36)));
            console.log(COLORS.bold + '\n[ SETUP ] Please enter your phone number to receive the pairing code:');
            console.log(COLORS.gray + '          (Type "#" to cancel)\n');

            let phoneNumber = await questionEnhanced(' Phone Number : ');
            if (phoneNumber.trim() === '#') {
                showMsg('warning', 'Operation cancelled');
                process.exit();
            }

            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (!phoneNumber.match(/^\d{10,15}$/)) {
                showMsg('error', 'Invalid phone number');
                process.exit(1);
            }

            try {
                showMsg('info', 'Fetching latest WhatsApp version...');
                await loading('Creating pairing code', 800);
                
                sock.version = version;
                const code = await sock.requestPairingCode(phoneNumber);
                
                console.log('\n' + ColorEffects.glow('█'.repeat(60)));
                showMsg('success', 'PAIRING CODE GENERATED');
                console.log(`${ColorEffects.pulse(' Code:')} ${ColorEffects.glow(code)}`);
                console.log(`${ColorEffects.pulse(' Phone:')} ${ColorEffects.glow(phoneNumber)}`);
                console.log(`${ColorEffects.pulse(' Time:')} ${ColorEffects.clock()}`);
                console.log(ColorEffects.glow('█'.repeat(60)) + '\n');
                
            } catch (error) {
                showMsg('error', 'Failed to get pairing code');
                showMsg('info', 'Using QR method as backup...');
                sock.printQRInTerminal = true;
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                logger.info('Connecting to WhatsApp...');
            }

            if (connection === 'open') {
                console.log(ColorEffects.glow('\n' + '★'.repeat(20) + ' CONNECTED ' + '★'.repeat(20)));
                logger.success(`CONNECTED! USER ID: ${sock.user.id}`);
                console.log(ColorEffects.glow('★'.repeat(20) + ' CONNECTED ' + '★'.repeat(20)));

                playSound('success.mp3');

                try {
                    const { addEliteNumber } = require('./Extractions/elite');
                    const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
                    const jid = `${botNumber}@s.whatsapp.net`;

                    const [info] = await sock.onWhatsApp(jid);
                    if (!info?.jid || !info?.lid) {
                        logger.error('تعذر الحصول على معلومات الجلسة من onWhatsApp');
                        return;
                    }

                    const lidNumber = info.lid.replace(/[^0-9]/g, '');

                    await addEliteNumber(botNumber);
                    await addEliteNumber(lidNumber);

                    showMsg('success', `ADDED ${botNumber} AND ${lidNumber} TO ELITE!`);
                } catch (e) {
                    logger.error('فشل في إضافة رقم الجلسة إلى النخبة:', e.message);
                }

                // تحميل الأوامر مرة واحدة فقط عند الاتصال
                if (typeof handleMessagesLoader === 'function') {
                    handleMessagesLoader();
                }
                
                setInterval(() => {  
                    const cursors = ['>', '>>', '>>>', ' >>', '  >'];  
                    const cursor = cursors[Math.floor(Date.now() / 200) % cursors.length];  
                    process.stdout.write(`\r${ColorEffects.glow(cursor)} ${ColorEffects.pulse('Ready')} | ${ColorEffects.clock()} | ${ColorEffects.glow('.menu')}`);  
                }, 200);
            }

            if (connection === 'close') {
                const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
                logger.warn(`Disconnected: ${lastDisconnect?.error?.message || 'Unknown reason'}`);

                if (isLoggedOut) {
                    playSound('LOGGOUT.mp3');
                    logger.error('You have been logged out.');
                    process.exit(1);
                } else {
                    logger.info('Reconnecting...');
                    setTimeout(startBot, 3000);
                }
            }
        });

        // 🚀 معالجة سريعة وخفيفة جداً بدون أي إعادة قراءة للكاش أثناء المحادثات
        sock.ev.on('messages.upsert', async (m) => {
            try {
                if (!m.messages || m.messages.length === 0) return;
                handleFastProtection(sock, m.messages);
                
                // استدعاء الموديول المحمل مسبقاً في الذاكرة دون تفريغ الكاش
                await handleMessages(sock, m);
            } catch (err) {
                logger.error('Error while handling message:', err);
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        showMsg('error', `Startup error: ${err.message}`);
        playSound('ERROR.mp3');
        setTimeout(startBot, 3000);
    }
}

startBot();
