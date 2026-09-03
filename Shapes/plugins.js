const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

// 🎨 Premium Animated Color System
class PremiumColors {
    static frame = 0;
    
    // Premium gradient colors for borders
    static get borderColors() {
        return [
            '\x1b[1;38;5;196m', // Bright Red
            '\x1b[1;38;5;202m', // Red-Orange
            '\x1b[1;38;5;208m', // Orange
            '\x1b[1;38;5;214m', // Dark Orange
            '\x1b[1;38;5;220m', // Yellow-Orange
            '\x1b[1;38;5;226m', // Yellow
            '\x1b[1;38;5;190m', // Lime
            '\x1b[1;38;5;154m', // Green-Yellow
            '\x1b[1;38;5;118m', // Green
            '\x1b[1;38;5;82m',  // Bright Green
            '\x1b[1;38;5;46m',  // Emerald
            '\x1b[1;38;5;40m',  // Sea Green
            '\x1b[1;38;5;34m',  // Forest Green
            '\x1b[1;38;5;28m',  // Dark Green
            '\x1b[1;38;5;22m'   // Deep Green
        ];
    }
    
    // Text colors for different plugin types
    static get textColors() {
        return {
            'loaded': '\x1b[1;38;5;46m',      // Green for loaded
            'ignored': '\x1b[1;38;5;226m',    // Yellow for ignored
            'error': '\x1b[1;38;5;196m',      // Red for errors
            'info': '\x1b[1;38;5;39m',        // Blue for info
            'success': '\x1b[1;38;5;82m',     // Bright Green for success
            'warning': '\x1b[1;38;5;214m',    // Orange for warnings
            'system': '\x1b[1;38;5;201m'      // Pink for system
        };
    }
    
    static reset = '\x1b[0m';
    
    // 🌈 Animated Border Effect
    static animatedBorder(length = 50) {
        this.frame++;
        let border = '';
        const colors = this.borderColors;
        
        for (let i = 0; i < length; i++) {
            const colorIndex = (Math.floor(this.frame / 2) + i) % colors.length;
            border += colors[colorIndex] + '═';
        }
        return border + this.reset;
    }
    
    // 🔥 Animated Text with Border Effect
    static animatedText(text) {
        let result = '';
        const colors = this.borderColors;
        
        for (let i = 0; i < text.length; i++) {
            const wave = Math.sin(Date.now() / 300 + i * 0.3) * 0.5 + 0.5;
            const colorIndex = Math.floor(wave * (colors.length - 1));
            result += colors[colorIndex] + text[i];
        }
        return result + this.reset;
    }
    
    // 💫 Pulsing Effect for Important Messages
    static pulse(text, type = 'info') {
        const pulseIntensity = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        const color = this.textColors[type] || this.textColors.info;
        const intensity = Math.floor(pulseIntensity * 255);
        return `\x1b[1;38;2;${intensity};${intensity};${intensity}m${text}${this.reset}`;
    }
    
    // 🎯 Get Text Color by Type
    static colorize(text, type = 'info') {
        const color = this.textColors[type] || this.textColors.info;
        return color + text + this.reset;
    }
    
    // 📊 Display Loading Animation
    static showLoading(text) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const frame = frames[Math.floor(Date.now() / 100) % frames.length];
        return this.animatedText(frame + ' ' + text);
    }
}

// 📦 Premium Plugin Display System
class PluginDisplay {
    static pluginCount = 0;
    static loadedCount = 0;
    static errorCount = 0;
    
    static resetCounters() {
        this.pluginCount = 0;
        this.loadedCount = 0;
        this.errorCount = 0;
    }
    
    // 🎨 Display Plugin Loading Header
    static showHeader() {
        const borderLength = 50;
        const topBorder = '╔' + PremiumColors.animatedBorder(borderLength) + '╗';
        const bottomBorder = '╚' + PremiumColors.animatedBorder(borderLength) + '╝';
        
        console.log('\n' + topBorder);
        console.log(PremiumColors.colorize('║', 'system') + ' '.repeat(52) + PremiumColors.colorize('║', 'system'));
        console.log(PremiumColors.colorize('║', 'system') + '  ' + 
                   PremiumColors.animatedText('🔄 PREMIUM PLUGIN LOADER 🔄') + ' '.repeat(15) + 
                   PremiumColors.colorize('║', 'system'));
        console.log(PremiumColors.colorize('║', 'system') + ' '.repeat(52) + PremiumColors.colorize('║', 'system'));
        console.log(bottomBorder);
    }
    
    // 🎯 Display Individual Plugin Status
    static showPluginStatus(file, status, details = '') {
        this.pluginCount++;
        
        const statusConfig = {
            'loaded': { symbol: '✓', type: 'success' },
            'ignored': { symbol: '⚠', type: 'warning' },
            'error': { symbol: '✗', type: 'error' },
            'info': { symbol: 'ℹ', type: 'info' }
        };
        
        const config = statusConfig[status] || statusConfig.info;
        
        if (status === 'loaded') this.loadedCount++;
        if (status === 'error') this.errorCount++;
        
        // Create animated border for each plugin
        const midBorder = '├' + PremiumColors.animatedBorder(48) + '┤';
        
        console.log(midBorder);
        console.log(PremiumColors.colorize('│', 'system') + ' ' + 
                   PremiumColors.colorize(config.symbol + ' ', config.type) + 
                   PremiumColors.animatedText(file.padEnd(30)) + 
                   PremiumColors.colorize('│', 'system'));
        
        if (details) {
            console.log(PremiumColors.colorize('│', 'system') + '  ' + 
                       PremiumColors.colorize('» ', 'info') + 
                       PremiumColors.pulse(details.padEnd(40), 'info') + 
                       PremiumColors.colorize('│', 'system'));
        }
    }
    
    // 📊 Display Loading Summary
    static showSummary() {
        const successRate = this.pluginCount > 0 
            ? Math.round((this.loadedCount / this.pluginCount) * 100) 
            : 0;
        
        const finalBorder = '╠' + PremiumColors.animatedBorder(48) + '╣';
        const bottomBorder = '╚' + PremiumColors.animatedBorder(48) + '╝';
        
        console.log(finalBorder);
        console.log(PremiumColors.colorize('│', 'system') + ' ' + 
                   PremiumColors.animatedText('📊 LOADING SUMMARY') + ' '.repeat(30) + 
                   PremiumColors.colorize('│', 'system'));
        console.log(PremiumColors.colorize('│', 'system') + '  ' + 
                   PremiumColors.colorize('» Total: ', 'info') + 
                   PremiumColors.pulse(this.pluginCount.toString().padEnd(40), 'success') + 
                   PremiumColors.colorize('│', 'system'));
        console.log(PremiumColors.colorize('│', 'system') + '  ' + 
                   PremiumColors.colorize('» Loaded: ', 'info') + 
                   PremiumColors.pulse(this.loadedCount.toString().padEnd(40), 'success') + 
                   PremiumColors.colorize('│', 'system'));
        console.log(PremiumColors.colorize('│', 'system') + '  ' + 
                   PremiumColors.colorize('» Errors: ', 'info') + 
                   PremiumColors.pulse(this.errorCount.toString().padEnd(40), 'error') + 
                   PremiumColors.colorize('│', 'system'));
        console.log(PremiumColors.colorize('│', 'system') + '  ' + 
                   PremiumColors.colorize('» Success Rate: ', 'info') + 
                   PremiumColors.pulse(successRate + '%'.padEnd(40), 
                                      successRate > 80 ? 'success' : 
                                      successRate > 50 ? 'warning' : 'error') + 
                   PremiumColors.colorize('│', 'system'));
        console.log(bottomBorder);
    }
}

let loadedPlugins = {};

function startsWithPrefix(text) {
    return text.startsWith(config.prefix);
}

async function loadPlugins() {
    try {
        PluginDisplay.resetCounters();
        PluginDisplay.showHeader();
        
        const pluginsDir = path.join(__dirname, '../plugins');
        await fs.ensureDir(pluginsDir);
        
        // Show scanning animation
        process.stdout.write(PremiumColors.showLoading('Scanning plugin directory...'));
        await new Promise(resolve => setTimeout(resolve, 500));
        process.stdout.write('\r' + ' '.repeat(50) + '\r');
        
        const files = await fs.readdir(pluginsDir);
        const pluginFiles = files.filter(file => file.endsWith('.js'));
        
        if (pluginFiles.length === 0) {
            PluginDisplay.showPluginStatus('No Plugins', 'warning', 'No plugin files found');
            PluginDisplay.showSummary();
            return {};
        }
        
        // Clear require cache
        for (const file of pluginFiles) {
            const pluginPath = path.join(pluginsDir, file);
            delete require.cache[require.resolve(pluginPath)];
        }
        
        loadedPlugins = {};
        
        // Load each plugin with animation
        for (const file of pluginFiles) {
            process.stdout.write(PremiumColors.showLoading(`Loading: ${file}`));
            await new Promise(resolve => setTimeout(resolve, 100));
            process.stdout.write('\r' + ' '.repeat(50) + '\r');
            
            try {
                const pluginPath = path.join(pluginsDir, file);
                const plugin = require(pluginPath);
                
                if (plugin && typeof plugin.execute === 'function') {
                    if (!plugin.command) {
                        PluginDisplay.showPluginStatus(file, 'ignored', 'Missing command name');
                        continue;
                    }
                    
                    loadedPlugins[plugin.command] = plugin;
                    PluginDisplay.showPluginStatus(file, 'loaded', `Command: ${plugin.command}`);
                    
                } else {
                    PluginDisplay.showPluginStatus(file, 'ignored', 'No execute function');
                }
                
            } catch (error) {
                PluginDisplay.showPluginStatus(file, 'error', error.message.substring(0, 40));
            }
        }
        
        PluginDisplay.showSummary();
        
        // Final success message
        const successBorder = '╔' + PremiumColors.animatedBorder(50) + '╗';
        const successBottom = '╚' + PremiumColors.animatedBorder(50) + '╝';
        
        console.log('\n' + successBorder);
        console.log(PremiumColors.colorize('║', 'system') + '  ' + 
                   PremiumColors.animatedText('🚀 PLUGINS LOADED SUCCESSFULLY') + ' '.repeat(15) + 
                   PremiumColors.colorize('║', 'system'));
        console.log(PremiumColors.colorize('║', 'system') + '  ' + 
                   PremiumColors.pulse('Ready to process commands', 'success') + ' '.repeat(20) + 
                   PremiumColors.colorize('║', 'system'));
        console.log(successBottom + '\n');
        
        return loadedPlugins;
        
    } catch (error) {
        const errorBorder = '╔' + PremiumColors.animatedBorder(50) + '╗';
        const errorBottom = '╚' + PremiumColors.animatedBorder(50) + '╝';
        
        console.log('\n' + errorBorder);
        console.log(PremiumColors.colorize('║', 'error') + '  ' + 
                   PremiumColors.animatedText('❌ PLUGIN LOADING FAILED') + ' '.repeat(25) + 
                   PremiumColors.colorize('║', 'error'));
        console.log(PremiumColors.colorize('║', 'error') + '  ' + 
                   PremiumColors.pulse(`Error: ${error.message}`, 'error') + ' '.repeat(10) + 
                   PremiumColors.colorize('║', 'error'));
        console.log(errorBottom);
        
        return {};
    }
}

module.exports = {
    loadPlugins,
    getPlugins: () => loadedPlugins,
    PremiumColors,
    PluginDisplay
};