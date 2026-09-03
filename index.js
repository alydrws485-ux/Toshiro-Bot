const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');

// =======================
// TRAUMA ANSI COLORS
// =======================
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
    gray: '\x1b[38;5;245m'
};

// =======================
// TRAUMA MOTION EFFECTS
// =======================
class FX {
    static frame = 0;

    static glow(text) {
        this.frame++;
        const c = [COLORS.purple, COLORS.red, COLORS.blue, COLORS.gold];
        return c[Math.floor(this.frame / 2) % c.length] + text + COLORS.reset;
    }

    static pulse(text) {
        const v = (Math.sin(Date.now() / 180) + 1) / 2;
        if (v > 0.7) return COLORS.gold + text + COLORS.reset;
        if (v > 0.4) return COLORS.red + text + COLORS.reset;
        return COLORS.purple + text + COLORS.reset;
    }

    static bar(percent, size = 26) {
        const filled = Math.floor((percent / 100) * size);
        return (
            COLORS.gold +
            '█'.repeat(filled) +
            COLORS.gray +
            '░'.repeat(size - filled) +
            COLORS.reset
        );
    }

    static clock() {
        const d = new Date();
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return this.glow(`[${h}:${m}:${s}]`);
    }
}

// =======================
// HEADER
// =======================
function showHeader() {
    console.clear();

    console.log(COLORS.purple + '='.repeat(80) + COLORS.reset);
    console.log(FX.glow('╔══════════════════════════════════════════════════════════════════╗'));
    console.log(FX.glow('║                                                                  ║'));
    console.log(FX.glow('║        T R O U M A   S U P E R V I S O R   S Y S T E M             ║'));
    console.log(FX.glow('║                                                                  ║'));
    console.log(FX.glow('║        PROCESS CONTROL  |  AUTO RECOVERY  |  WATCHDOG            ║'));
    console.log(FX.glow('║                                                                  ║'));
    console.log(FX.glow('╚══════════════════════════════════════════════════════════════════╝'));
    console.log(COLORS.purple + '='.repeat(80) + COLORS.reset);

    console.log(FX.pulse(' INDEX CONTROLLER ACTIVE ') + ' ' + FX.clock());
    console.log(FX.glow('─'.repeat(80)));
}

// =======================
// LOADER
// =======================
async function loading(text, speed = 30) {
    for (let i = 0; i <= 100; i += 4) {
        process.stdout.write(
            `\r${FX.glow(text)} ${FX.bar(i)} ${FX.glow(i + '%')}`
        );
        await new Promise(r => setTimeout(r, speed));
    }
    console.log(' ' + COLORS.green + 'OK' + COLORS.reset);
}

// =======================
// MAIN FUNCTION
// =======================
async function startSystem() {
    showHeader();

    await loading('INITIALIZING SYSTEM');
    await loading('CHECKING REQUIREMENTS');
    await loading('PREPARING MODULES');
    
    console.log(FX.glow('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(FX.glow('║                 SYSTEM INFORMATION                      ║'));
    console.log(FX.glow('╠══════════════════════════════════════════════════════════╣'));
    console.log(FX.glow('║') + COLORS.cyan + '  • This is the MAIN LAUNCHER                     ' + FX.glow('║'));
    console.log(FX.glow('║') + COLORS.gold + '  • Direct WhatsApp connection                     ' + FX.glow('║'));
    console.log(FX.glow('║') + COLORS.green + '  • Using ملف_الاتصال folder                      ' + FX.glow('║'));
    console.log(FX.glow('║') + COLORS.purple + '  • Starting WhatsApp Bot directly...             ' + FX.glow('║'));
    console.log(FX.glow('╚══════════════════════════════════════════════════════════╝\n'));

    const connectionFolder = join(process.cwd(), 'ملف_الاتصال');
    
    if (!fs.existsSync(connectionFolder)) {
        fs.mkdirSync(connectionFolder, { recursive: true });
        console.log(FX.glow('[✓] Created: ') + 'ملف_الاتصال');
    }

    console.log(FX.glow('[▶] Starting WhatsApp Bot...\n'));

    // بدء البوت مباشرة بدون fork
    try {
        require('./main.js');
    } catch (error) {
        console.log(FX.glow('[✗] Error: ') + COLORS.red + error.message + COLORS.reset);
        console.log(FX.glow('[↻] Restarting in 3 seconds...\n'));
        setTimeout(startSystem, 3000);
    }
}

// =======================
// SIGNAL HANDLING
// =======================
process.on('SIGINT', () => {
    console.log(FX.glow('\n[ SHUTDOWN REQUESTED ]'));
    process.exit(0);
});

// =======================
// START
// =======================
startSystem();