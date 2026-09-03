const { loadPlugins } = require('./plugins');
const config = require('../config');
const fs = require('fs-extra');
const path = require('path');
const { isElite } = require('../Extractions/elite');
const { playSound } = require('../main');
const chokidar = require('chokidar');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';
const contactsSettingsPath = path.join(__dirname, '../data/جهات.json');
const linksSettingsPath = path.join(__dirname, '../data/روابط.json');

const COLORS = {
    d: '\x1b[1;38;5;51m',
    g: '\x1b[1;38;5;220m',
    r: '\x1b[1;38;5;196m',
    e: '\x1b[1;38;5;46m',
    s: '\x1b[1;38;5;27m',
    p: '\x1b[1;38;5;129m',
    rs: '\x1b[0m'
};

const LUXURY = [
    '\x1b[1;38;5;51m', '\x1b[1;38;5;201m', '\x1b[1;38;5;220m',
    '\x1b[1;38;5;46m', '\x1b[1;38;5;196m', '\x1b[1;38;5;27m',
    '\x1b[1;38;5;129m', '\x1b[1;38;5;214m', '\x1b[1;38;5;45m',
    '\x1b[1;38;5;198m'
];

const randomColor = () => LUXURY[Math.floor(Math.random() * LUXURY.length)];
const speedColor = (t) => t < 100 ? COLORS.e : t < 300 ? COLORS.g : t < 800 ? '\x1b[1;38;5;214m' : COLORS.r;

class Status {
    static c = 0;
    static update() { this.c++; }
}

const commands = new Map();
let displayed = false;
let cache = null;
let watcher = null;
let reloading = false;

// دالة التحقق مما إذا كان العضو مشرفاً (Admin)
async function isAdmin(sock, chatId, senderJid) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const user = participants.find(p => decode(p.id) === decode(senderJid));
        return user ? (user.admin === 'admin' || user.admin === 'superadmin') : false;
    } catch (e) {
        return false;
    }
}

async function registerPluginCommands(plugins) {
    commands.clear();
    for (const [name, plugin] of Object.entries(plugins)) {
        if (plugin && typeof plugin === 'object') {
            const pluginData = {
                n: name,
                e: plugin.execute || (() => {}),
                c: plugin.category || 'g',
                o: plugin.owner || false,
                g: plugin.group || false
            };
            
            // تسجيل الاسم الرئيسي
            commands.set(name.toLowerCase(), pluginData);

            // تسجيل جميع الأسماء الترافقية والأوامر الممررة كمصفوفة
            if (plugin.command) {
                const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                cmds.forEach(c => commands.set(c.toLowerCase(), pluginData));
            }
        }
    }
}

async function reloadPlugins() {
    if (reloading) return;
    reloading = true;
    
    try {
        Object.keys(require.cache).forEach(key => {
            if (key.includes('/plugins/')) {
                delete require.cache[key];
            }
        });
        
        cache = await loadPlugins();
        await registerPluginCommands(cache);
        
        const c = randomColor();
        console.log(`\n${c}╔════════════════════════════════════╗${COLORS.rs}`);
        console.log(`${c}║      🔄  PLUGINS  RELOADED  🔄   ║${COLORS.rs}`);
        console.log(`${c}╠════════════════════════════════════╣${COLORS.rs}`);
        console.log(`${c}║  📦 ${commands.size.toString().padStart(3)} COMMANDS LOADED     ║${COLORS.rs}`);
        console.log(`${c}║  ⚡ UPDATED SUCCESSFULLY         ║${COLORS.rs}`);
        console.log(`${c}╚════════════════════════════════════╝${COLORS.rs}\n`);
        
        playSound('SUCCESS');
    } catch (error) {
        console.error(`\x1b[1;38;5;196m❌ خطأ في تحميل البلجنز: ${error.message}\x1b[0m`);
        playSound('ERROR');
    } finally {
        reloading = false;
    }
}

function startWatching() {
    if (watcher) return;
    
    const pluginsPath = path.join(__dirname, '../plugins');
    
    watcher = chokidar.watch(pluginsPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });
    
    watcher.on('add', (filePath) => {
        if (filePath.endsWith('.js')) {
            console.log(`\x1b[1;38;5;46m📁 تمت إضافة ملف جديد: ${path.basename(filePath)}\x1b[0m`);
            reloadPlugins();
        }
    });
    
    watcher.on('change', (filePath) => {
        if (filePath.endsWith('.js')) {
            console.log(`\x1b[1;38;5;220m✏️ تم تعديل ملف: ${path.basename(filePath)}\x1b[0m`);
            reloadPlugins();
        }
    });
    
    watcher.on('unlink', (filePath) => {
        if (filePath.endsWith('.js')) {
            console.log(`\x1b[1;38;5;196m🗑️ تم حذف ملف: ${path.basename(filePath)}\x1b[0m`);
            reloadPlugins();
        }
    });
    
    console.log(`\x1b[1;38;5;27m🔍 جاري مراقبة مجلد البلجنز للتحديثات...\x1b[0m`);
}

function cmd(o = {}) {
    if (!o.name || !o.exec) throw new Error('⚠️');
    commands.set(o.name.toLowerCase(), {
        n: o.name,
        e: o.exec,
        c: o.category || 'g',
        o: o.owner || false,
        g: o.group || false
    });
    return o.name.toLowerCase();
}

function createPluginHandler(o = {}) {
    const h = o.execute || (() => {});
    h.elite = o.elite || false;
    h.group = o.group || false;
    return h;
}

async function handleMessages(sock, { messages }) {
    let m;
    try {
        m = messages[0];
        if (!m || !m.message) return;

        const chatId = m.key.remoteJid;
        const senderParticipant = m.key.participant || m.participant || chatId;
        const rawSenderNumber = senderParticipant.split('@')[0].replace(/[^0-9]/g, '');

        // ==========================================
        // 🔒 فحص حالة وضع المود (Elite Mode Guard)
        // ==========================================
        const modePath = path.join(__dirname, '../data/mode.txt');
        let isEliteModeOn = false;
        try {
            if (fs.existsSync(modePath)) {
                isEliteModeOn = fs.readFileSync(modePath, 'utf8').trim().toUpperCase() === '[ON]';
            }
        } catch (e) {}

        // إذا كان المود مفعلاً والمرسل ليس من أعضاء النخبة وليس البوت نفسه -> تجاهل تام
        if (isEliteModeOn && !isElite(rawSenderNumber) && !m.key.fromMe) {
            return;
        }

        // ==========================================
        // 1. فحص الحمايات التلقائية في المجموعات (جهات وروابط)
        // ==========================================
        if (chatId?.endsWith('@g.us') && !m.key.fromMe) {
            
            // --- أ) فحص وحذف جهات الاتصال ---
            try {
                if (fs.existsSync(contactsSettingsPath)) {
                    const contactsSettings = fs.readJsonSync(contactsSettingsPath);
                    if (contactsSettings[chatId] === true) {
                        const messageType = Object.keys(m.message)[0];
                        const isContact = 
                            messageType === 'contactMessage' || 
                            messageType === 'contactsArrayMessage' ||
                            m.message?.viewOnceMessage?.message?.contactMessage ||
                            m.message?.viewOnceMessageV2?.message?.contactMessage;

                        if (isContact) {
                            await sock.sendMessage(chatId, {
                                delete: {
                                    remoteJid: chatId,
                                    fromMe: false,
                                    id: m.key.id,
                                    participant: senderParticipant
                                }
                            });
                            console.log(`\x1b[1;38;5;196m🗑️ تم حذف جهة اتصال في القروب: ${chatId}\x1b[0m`);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('❌ خطأ في فحص جهات الاتصال:', err);
            }

            // --- ب) فحص وحذف الروابط وإرسال تحذير (استثناء المشرفين) ---
            try {
                if (fs.existsSync(linksSettingsPath)) {
                    const linksSettings = fs.readJsonSync(linksSettingsPath);
                    if (linksSettings[chatId] === true) {
                        const textContent = 
                            m.message?.conversation ||
                            m.message?.extendedTextMessage?.text ||
                            m.message?.imageMessage?.caption ||
                            m.message?.videoMessage?.caption ||
                            m.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
                            m.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation ||
                            m.message?.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text || '';

                        const linkRegex = /(chat\.whatsapp\.com\/[A-Za-z0-9]|wa\.me\/|https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                        
                        if (linkRegex.test(textContent)) {
                            const adminStatus = await isAdmin(sock, chatId, senderParticipant);
                            if (!adminStatus) {
                                // 1. حذف الرسالة
                                await sock.sendMessage(chatId, {
                                    delete: {
                                        remoteJid: chatId,
                                        fromMe: false,
                                        id: m.key.id,
                                        participant: senderParticipant
                                    }
                                });

                                // 2. إرسال رسالة تحذير مع إشارة للمرسل
                                const targetJid = decode(senderParticipant);
                                const userTag = `@${targetJid.split('@')[0]}`;
                                
                                await sock.sendMessage(chatId, {
                                    text: `⚠️ *تنبيه منع الروابط*\n\nعذراً ${userTag}، يُمنع إرسال الروابط داخل المجموعة!\n🗑️ *تم حذف رسالتك تلقائياً.*`,
                                    mentions: [targetJid]
                                });

                                console.log(`\x1b[1;38;5;196m🔗 تم حذف رابط وتحذير العضو: ${targetJid} في القروب: ${chatId}\x1b[0m`);
                                return;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('❌ خطأ في فحص الروابط:', err);
            }
        }

        // ==========================================
        // 2. الفحص العادي للأوامر والنصوص
        // ==========================================
        const body = m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption || '';
        if (!body) return;

        const p = config.prefix;
        if (!body.toLowerCase().startsWith(p.toLowerCase())) return;

        const parts = body.slice(p.length).trim().split(/\s+/);
        const cmd = parts[0]?.toLowerCase();
        const args = parts.slice(1);
        if (!cmd) return;

        const cmdName = cmd.replace(p, '');

        const botPath = path.join(__dirname, '../data/bot.txt');
        let botStatus = '[on]';
        try { if (fs.existsSync(botPath)) botStatus = fs.readFileSync(botPath, 'utf8').trim(); } catch (e) {}
        if (botStatus === '[off]' && cmdName !== 'bot') return;

        let sender;
        if (m.key.remoteJid.endsWith('@g.us')) {
            sender = m.key.participant?.split('@')[0] || 'User';
        } else {
            sender = m.key.remoteJid.split('@')[0] || 'User';
        }

        if (!cache) {
            cache = await loadPlugins();
            await registerPluginCommands(cache);
        }
        
        let handler = cache[cmdName];

        // البحث في خريطة الأوامر المسجلة لضمان مطابقة الأسماء الترافقية (Aliases)
        if (!handler) {
            const mappedCmd = commands.get(cmdName);
            if (mappedCmd) {
                handler = cache[mappedCmd.n];
            }
        }
        
        if (!handler) {
            const c = randomColor();
            console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
            console.log(`${c}┃      ❓  UNKNOWN  ❓            ┃${COLORS.rs}`);
            console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
            console.log(`${c}┃  ⚡ ${cmdName.padEnd(18)}       ┃${COLORS.rs}`);
            console.log(`${c}┃  ⛔ NOT FOUND                   ┃${COLORS.rs}`);
            console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
            return;
        }

        m.args = args;
        m.command = cmd;
        m.prefix = p;

        if (handler.elite && !config.owners.includes(sender)) {
            const c = randomColor();
            console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
            console.log(`${c}┃      👑  OWNER  👑             ┃${COLORS.rs}`);
            console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
            console.log(`${c}┃  ⚡ ${cmdName.padEnd(18)}       ┃${COLORS.rs}`);
            console.log(`${c}┃  🔒 OWNER ONLY                 ┃${COLORS.rs}`);
            console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
            await sock.sendMessage(m.key.remoteJid, { text: config.messages.ownerOnly });
            return;
        }

        if (handler.group && !m.key.remoteJid.endsWith('@g.us')) {
            const c = randomColor();
            console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
            console.log(`${c}┃      👥  GROUP  👥             ┃${COLORS.rs}`);
            console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
            console.log(`${c}┃  ⚡ ${cmdName.padEnd(18)}       ┃${COLORS.rs}`);
            console.log(`${c}┃  🔓 GROUP ONLY                 ┃${COLORS.rs}`);
            console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
            await sock.sendMessage(m.key.remoteJid, { text: config.messages.groupOnly });
            return;
        }

        const start = Date.now();

        try {
            if (typeof handler === 'function') await handler(sock, m);
            else if (typeof handler.execute === 'function') await handler.execute(sock, m);

            const time = Date.now() - start;
            const sc = speedColor(time);
            const bar = '▰'.repeat(Math.min(Math.floor(time / 100), 10)) + '▱'.repeat(10 - Math.min(Math.floor(time / 100), 10));
            const c = randomColor();
            
            console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
            console.log(`${c}┃      💎  EXECUTED  💎          ┃${COLORS.rs}`);
            console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
            console.log(`${c}┃  ⚡ ${cmdName.padEnd(18)}       ┃${COLORS.rs}`);
            console.log(`${c}┃  ✅ SUCCESS                    ┃${COLORS.rs}`);
            console.log(`${c}┃  ⏱️ ${time.toString().padEnd(4)}ms ${bar}   ┃${COLORS.rs}`);
            console.log(`${c}┃  🚀 ${time < 500 ? 'FAST' : time < 1000 ? 'MEDIUM' : 'SLOW'}${' '.repeat(12)}┃${COLORS.rs}`);
            console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);

            Status.update();

        } catch (error) {
            const c = randomColor();
            console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
            console.log(`${c}┃      🔥  ERROR  🔥             ┃${COLORS.rs}`);
            console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
            console.log(`${c}┃  ⚡ ${cmdName.padEnd(18)}       ┃${COLORS.rs}`);
            console.log(`${c}┃  ❌ ${error.message.substring(0, 15).padEnd(18)}┃${COLORS.rs}`);
            console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
            throw error;
        }

    } catch (error) {
        playSound('ERROR');
        if (m?.key?.remoteJid) {
            await sock.sendMessage(m.key.remoteJid, { text: config.messages.error }).catch(() => {});
        }
    }
}

async function handleCommand(sock, msg, command, args) {
    const cmd = commands.get(command.toLowerCase());
    if (!cmd) {
        const c = randomColor();
        console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
        console.log(`${c}┃      ❓  UNKNOWN  ❓            ┃${COLORS.rs}`);
        console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
        console.log(`${c}┃  ⚡ ${command.padEnd(18)}       ┃${COLORS.rs}`);
        console.log(`${c}┃  ⛔ NOT FOUND                   ┃${COLORS.rs}`);
        console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
        return;
    }

    try {
        if (cmd.o && !config.owners.includes(msg.sender)) {
            const c = randomColor();
            console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
            console.log(`${c}┃      👑  OWNER  👑             ┃${COLORS.rs}`);
            console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
            console.log(`${c}┃  ⚡ ${command.padEnd(18)}       ┃${COLORS.rs}`);
            console.log(`${c}┃  🔒 OWNER ONLY                 ┃${COLORS.rs}`);
            console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
            return msg.reply(config.messages.ownerOnly);
        }
        
        const start = Date.now();
        await cmd.e(sock, msg, args);
        const time = Date.now() - start;
        const sc = speedColor(time);
        const bar = '▰'.repeat(Math.min(Math.floor(time / 100), 10)) + '▱'.repeat(10 - Math.min(Math.floor(time / 100), 10));
        const c = randomColor();
        
        console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
        console.log(`${c}┃      💎  EXECUTED  💎          ┃${COLORS.rs}`);
        console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
        console.log(`${c}┃  ⚡ ${command.padEnd(18)}       ┃${COLORS.rs}`);
        console.log(`${c}┃  ⏱️ ${time.toString().padEnd(4)}ms ${bar}   ┃${COLORS.rs}`);
        console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
        
    } catch (error) {
        const c = randomColor();
        console.log(`\n${c}╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${COLORS.rs}`);
        console.log(`${c}┃      🔥  ERROR  🔥             ┃${COLORS.rs}`);
        console.log(`${c}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${COLORS.rs}`);
        console.log(`${c}┃  ⚡ ${command.padEnd(18)}       ┃${COLORS.rs}`);
        console.log(`${c}┃  ❌ ${error.message.substring(0, 15).padEnd(18)}┃${COLORS.rs}`);
        console.log(`${c}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${COLORS.rs}\n`);
        playSound('ERROR');
        msg.reply(config.messages.error);
    }
}

function handleMessagesLoader() {
    setTimeout(() => {
        if (!displayed && commands.size > 0) {
            const c = randomColor();
            console.log(`\n${c}╔════════════════════════════════════╗${COLORS.rs}`);
            console.log(`${c}║      💎  BOT  READY  💎        ║${COLORS.rs}`);
            console.log(`${c}╠════════════════════════════════════╣${COLORS.rs}`);
            console.log(`${c}║  📦 ${commands.size.toString().padStart(3)} COMMANDS ACTIVE     ║${COLORS.rs}`);
            console.log(`${c}║  ⚡ ONLINE                       ║${COLORS.rs}`);
            console.log(`${c}╚════════════════════════════════════╝${COLORS.rs}\n`);
            displayed = true;
            startWatching();
        }
    }, 50);
}

module.exports = {
    handleMessages,
    handleCommand,
    cmd,
    commands,
    createPluginHandler,
    handleMessagesLoader,
    reloadPlugins
};
