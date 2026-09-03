const config = require('../config');
const { loadPlugins } = require('./plugins');
const crypto = require('crypto');
const { playSound } = require('../main');

// 🎨 TROUMA Premium Color System
class TroumaColors {
    static frame = 0;
    
    static get eliteColors() {
        return [
            '\x1b[1;38;5;196m',  // Bright Red
            '\x1b[1;38;5;208m',  // Orange
            '\x1b[1;38;5;220m',  // Gold
            '\x1b[1;38;5;226m',  // Yellow
            '\x1b[1;38;5;46m',   // Green
            '\x1b[1;38;5;39m',   // Blue
            '\x1b[1;38;5;201m',  // Pink
            '\x1b[1;38;5;165m'   // Purple
        ];
    }
    
    static reset = '\x1b[0m';
    
    // 🔥 TROUMA Signature Effect
    static troumaEffect(text) {
        this.frame++;
        let result = '';
        const colors = this.eliteColors;
        
        for (let i = 0; i < text.length; i++) {
            const colorIndex = (Math.floor(this.frame / 3) + i) % colors.length;
            result += colors[colorIndex] + text[i];
        }
        return result + this.reset;
    }
    
    // ⚡ Elite Pulse Effect
    static elitePulse(text) {
        const intensity = (Math.sin(Date.now() / 200) + 1) / 2;
        if (intensity > 0.7) return '\x1b[1;38;5;196m' + text + this.reset;
        if (intensity > 0.4) return '\x1b[1;38;5;208m' + text + this.reset;
        return '\x1b[1;38;5;220m' + text + this.reset;
    }
    
    // 💎 Diamond Glow Effect
    static diamondGlow(text) {
        const glow = Math.sin(Date.now() / 150) * 127 + 128;
        return `\x1b[1;38;2;${Math.floor(glow)};0;0m${text}${this.reset}`;
    }
    
    // 🎯 Get Status Color
    static statusColor(type) {
        const colors = {
            'info': '\x1b[38;5;39m',
            'success': '\x1b[38;5;46m',
            'warning': '\x1b[38;5;226m',
            'error': '\x1b[38;5;196m',
            'elite': '\x1b[1;38;5;208m',
            'owner': '\x1b[1;38;5;196m',
            'system': '\x1b[1;38;5;201m'
        };
        return colors[type] || colors.info;
    }
    
    // 📊 Command Execution Display
    static showCommandExecution(command, user, time) {
        const speed = time < 1000 ? '\x1b[1;38;5;46m' : '\x1b[1;38;5;196m';
        
        console.log('\n' + this.elitePulse('╔' + '═'.repeat(50) + '╗'));
        console.log(this.elitePulse('║') + ' ' + this.diamondGlow('⚡ COMMAND EXECUTION ⚡') + ' '.repeat(22) + this.elitePulse('║'));
        console.log(this.elitePulse('║') + ' ' + this.troumaEffect('▸ Command: ') + this.elitePulse(command.padEnd(30)) + this.elitePulse('║'));
        console.log(this.elitePulse('║') + ' ' + this.troumaEffect('▸ User: ') + this.diamondGlow(user.substring(0, 25).padEnd(30)) + this.elitePulse('║'));
        console.log(this.elitePulse('║') + ' ' + this.troumaEffect('▸ Time: ') + speed + time + 'ms' + this.reset + 
                   ' '.repeat(30 - time.toString().length) + this.elitePulse('║'));
        console.log(this.elitePulse('╚' + '═'.repeat(50) + '╝') + '\n');
    }
}

// 📊 TROUMA Statistics System
class TroumaStats {
    static commandsExecuted = 0;
    static eliteCommands = 0;
    static responseTimes = [];
    
    static addCommand(isElite = false, responseTime = 0) {
        this.commandsExecuted++;
        if (isElite) this.eliteCommands++;
        this.responseTimes.push(responseTime);
        
        // Show stats every 5 commands
        if (this.commandsExecuted % 5 === 0) {
            this.displayStats();
        }
    }
    
    static displayStats() {
        const avgTime = this.responseTimes.length > 0 
            ? Math.round(this.responseTimes.reduce((a, b) => a + b) / this.responseTimes.length)
            : 0;
        
        console.log(TroumaColors.elitePulse('\n' + '★'.repeat(30)));
        console.log(TroumaColors.diamondGlow('📊 TROUMA SYSTEM STATS'));
        console.log(TroumaColors.elitePulse('─'.repeat(30)));
        console.log(TroumaColors.troumaEffect('▸ Total Commands: ') + TroumaColors.elitePulse(this.commandsExecuted.toString()));
        console.log(TroumaColors.troumaEffect('▸ Elite Commands: ') + TroumaColors.diamondGlow(this.eliteCommands.toString()));
        console.log(TroumaColors.troumaEffect('▸ Avg Response: ') + 
                   (avgTime < 500 ? '\x1b[1;38;5;46m' : '\x1b[1;38;5;196m') + avgTime + 'ms' + TroumaColors.reset);
        console.log(TroumaColors.elitePulse('★'.repeat(30)));
    }
}

async function handleMessages(sock, { messages }) {
    if (!messages || !messages[0]) return;
    
    const msg = messages[0];
    const startTime = Date.now();
    
    try {
        const messageText = msg.message?.conversation ||
                            msg.message?.extendedTextMessage?.text ||
                            msg.message?.imageMessage?.caption ||
                            msg.message?.videoMessage?.caption || '';

        msg.isGroup = msg.key.remoteJid.endsWith('@g.us');
        msg.sender = msg.key.participant || msg.key.remoteJid;
        msg.chat = msg.key.remoteJid;
        
        // 🎯 Enhanced Reply Function
        msg.reply = async (text, options = {}) => {
            try {
                await sock.sendMessage(msg.chat, { text }, { 
                    quoted: msg,
                    ...options
                });
            } catch (error) {
                console.log(TroumaColors.statusColor('error') + '✗ Reply Error: ' + error.message + TroumaColors.reset);
            }
        };

        // Check if message starts with prefix
        if (!messageText.toLowerCase().startsWith(config.prefix.toLowerCase())) return;

        const args = messageText.slice(config.prefix.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();
        
        if (!command) return;
        
        // 🌟 Display Command Reception
        console.log('\n' + TroumaColors.elitePulse('╭' + '─'.repeat(40) + '╮'));
        console.log(TroumaColors.elitePulse('│') + ' ' + TroumaColors.diamondGlow('📥 COMMAND DETECTED') + ' '.repeat(20) + TroumaColors.elitePulse('│'));
        console.log(TroumaColors.elitePulse('│') + ' ' + TroumaColors.troumaEffect('» Command: ') + 
                   TroumaColors.elitePulse(command.padEnd(25)) + TroumaColors.elitePulse('│'));
        console.log(TroumaColors.elitePulse('│') + ' ' + TroumaColors.troumaEffect('» User ID: ') + 
                   TroumaColors.diamondGlow((msg.sender.split('@')[0] || 'Unknown').padEnd(25)) + TroumaColors.elitePulse('│'));
        console.log(TroumaColors.elitePulse('│') + ' ' + TroumaColors.troumaEffect('» Group: ') + 
                   (msg.isGroup ? TroumaColors.statusColor('success') + 'Yes' : TroumaColors.statusColor('info') + 'No') + 
                   TroumaColors.reset + ' '.repeat(25) + TroumaColors.elitePulse('│'));
        console.log(TroumaColors.elitePulse('╰' + '─'.repeat(40) + '╯'));

        // 🔍 Load plugins and find handler
        const plugins = await loadPlugins();
        const plugin = plugins[command];

        if (plugin) {
            // ⏳ Show Processing Animation
            const frames = ['▰▱▱▱▱', '▰▰▱▱▱', '▰▰▰▱▱', '▰▰▰▰▱', '▰▰▰▰▰'];
            let frameIdx = 0;
            
            const interval = setInterval(() => {
                process.stdout.write(`\r${TroumaColors.elitePulse(frames[frameIdx])} ${TroumaColors.troumaEffect('Processing...')}`);
                frameIdx = (frameIdx + 1) % frames.length;
            }, 100);
            
            try {
                await plugin.execute(sock, msg, args);
                
                clearInterval(interval);
                process.stdout.write('\r' + ' '.repeat(40) + '\r');
                
                const responseTime = Date.now() - startTime;
                
                // ✅ Show Success Display
                TroumaColors.showCommandExecution(command, msg.sender.split('@')[0], responseTime);
                
                // Update Statistics
                TroumaStats.addCommand(plugin.elite || false, responseTime);
                
            } catch (error) {
                clearInterval(interval);
                process.stdout.write('\r' + ' '.repeat(40) + '\r');
                
                // ❌ Show Error Display
                console.log('\n' + TroumaColors.statusColor('error') + '╔' + '═'.repeat(50) + '╗' + TroumaColors.reset);
                console.log(TroumaColors.statusColor('error') + '║' + TroumaColors.reset + ' ' + 
                          '❌ ' + TroumaColors.diamondGlow('EXECUTION FAILED') + ' '.repeat(28) + TroumaColors.statusColor('error') + '║' + TroumaColors.reset);
                console.log(TroumaColors.statusColor('error') + '║' + TroumaColors.reset + ' ' + 
                          TroumaColors.troumaEffect('» Command: ') + TroumaColors.elitePulse(command) + ' '.repeat(30 - command.length) + TroumaColors.statusColor('error') + '║' + TroumaColors.reset);
                console.log(TroumaColors.statusColor('error') + '║' + TroumaColors.reset + ' ' + 
                          TroumaColors.troumaEffect('» Error: ') + TroumaColors.diamondGlow(error.message.substring(0, 40)) + ' '.repeat(10) + TroumaColors.statusColor('error') + '║' + TroumaColors.reset);
                console.log(TroumaColors.statusColor('error') + '╚' + '═'.repeat(50) + '╝' + TroumaColors.reset + '\n');
                
                playSound('ERROR');
                
                // Send Error Message
                try {
                    await sock.sendMessage(msg.chat, { 
                        text: config.messages.error 
                    }, { quoted: msg });
                } catch (sendError) {
                    console.log(TroumaColors.statusColor('warning') + '⚠️ Failed to send error message' + TroumaColors.reset);
                }
            }
            
        } else {
            // 🚫 Unknown Command Display
            console.log('\n' + TroumaColors.statusColor('warning') + '╭' + '─'.repeat(35) + '╮' + TroumaColors.reset);
            console.log(TroumaColors.statusColor('warning') + '│' + TroumaColors.reset + ' ' + 
                      '❓ ' + TroumaColors.diamondGlow('UNKNOWN COMMAND') + ' '.repeat(18) + TroumaColors.statusColor('warning') + '│' + TroumaColors.reset);
            console.log(TroumaColors.statusColor('warning') + '│' + TroumaColors.reset + ' ' + 
                      TroumaColors.troumaEffect('» Command: ') + TroumaColors.elitePulse(command) + ' '.repeat(15) + TroumaColors.statusColor('warning') + '│' + TroumaColors.reset);
            console.log(TroumaColors.statusColor('warning') + '╰' + '─'.repeat(35) + '╯' + TroumaColors.reset);
            
            // Send unknown command message
            try {
                await sock.sendMessage(msg.chat, {
                    text: `❌ Unknown command: ${command}\nUse ${config.prefix}menu to see available commands`
                }, { quoted: msg });
            } catch (sendError) {
                console.log(TroumaColors.statusColor('warning') + '⚠️ Failed to send unknown command message' + TroumaColors.reset);
            }
        }

    } catch (error) {
        // 🚨 Critical Error Display
        console.log('\n' + TroumaColors.statusColor('error') + '🔥'.repeat(25) + TroumaColors.reset);
        console.log(TroumaColors.statusColor('error') + '🚨 CRITICAL SYSTEM ERROR 🚨' + TroumaColors.reset);
        console.log(TroumaColors.statusColor('error') + '🔥'.repeat(25) + TroumaColors.reset);
        console.log(TroumaColors.statusColor('error') + 'Error: ' + error.message + TroumaColors.reset);
        console.log(TroumaColors.statusColor('error') + 'Stack: ' + error.stack?.substring(0, 100) + '...' + TroumaColors.reset);
        
        playSound('ERROR');
        
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                text: config.messages.error
            });
        } catch (sendError) {
            console.log(TroumaColors.statusColor('error') + '✗ Failed to send error notification' + TroumaColors.reset);
        }
    }
}

// 🎯 Initialize TROUMA System
function initializeTroumaSystem() {
    console.log('\n' + TroumaColors.elitePulse('╔' + '═'.repeat(55) + '╗'));
    console.log(TroumaColors.elitePulse('║') + ' ' + TroumaColors.diamondGlow('🚀 TROUMA MESSAGE HANDLER INITIALIZED') + ' '.repeat(15) + TroumaColors.elitePulse('║'));
    console.log(TroumaColors.elitePulse('║') + ' ' + TroumaColors.troumaEffect('» Version: ') + TroumaColors.elitePulse('4.0.0') + ' '.repeat(35) + TroumaColors.elitePulse('║'));
    console.log(TroumaColors.elitePulse('║') + ' ' + TroumaColors.troumaEffect('» Prefix: ') + TroumaColors.diamondGlow(config.prefix) + ' '.repeat(35) + TroumaColors.elitePulse('║'));
    console.log(TroumaColors.elitePulse('║') + ' ' + TroumaColors.troumaEffect('» Status: ') + '\x1b[1;38;5;46mACTIVE' + TroumaColors.reset + ' '.repeat(35) + TroumaColors.elitePulse('║'));
    console.log(TroumaColors.elitePulse('╚' + '═'.repeat(55) + '╝') + '\n');
    
    playSound('start.mp3');
}

module.exports = {
    handleMessages,
    initializeTroumaSystem,
    TroumaColors,
    TroumaStats
};