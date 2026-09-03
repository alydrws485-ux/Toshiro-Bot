const fs = require('fs')
const path = require('path')
const { getPlugins } = require('../Shapes/plugins.js')

module.exports = {
  command: ['اوامر'],
  description: 'قائمة الأوامر الشاملة',
  category: 'tools',

  async execute(sock, msg) {
    try {
      const plugins = getPlugins()
      const categories = {}

      // تجميع الأوامر حسب الفئات
      Object.values(plugins).forEach(p => {
        if (p.hidden) return
        const cat = p.category ? p.category.toUpperCase() : 'غير مصنف'
        if (!categories[cat]) categories[cat] = []

        const cmd = Array.isArray(p.command) ? p.command.join(' | ') : p.command
        const desc = p.description || 'بدون وصف'
        categories[cat].push({ cmd, desc })
      })

      // بناء قائمة الأوامر الترتيبية
      let menu = `\`❖════⊰ TOSHIRO BOT ꚸ ⊱════❖\`\n\n`

      for (const [category, cmds] of Object.entries(categories)) {
        menu += `╭───[ 📂 ${category} ]───╮\n`
        cmds.forEach(({ cmd, desc }) => {
          menu += `│ ◈ .${cmd}\n`
          menu += `│   ↳ ${desc}\n`
        })
        menu += `╰────────────────────────╯\n\n`
      }

      menu += `\`❖═══════════════════════❖\``

      // التحقق من وجود الصورة وإرسال الرسالة
      const imgPath = path.join(process.cwd(), 'image.jpeg')
      if (fs.existsSync(imgPath)) {
        return sock.sendMessage(
          msg.key.remoteJid,
          { image: fs.readFileSync(imgPath), caption: menu },
          { quoted: msg }
        )
      }

      return sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg })

    } catch {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: '❌ حدث خطأ أثناء عرض قائمة الأوامر [Toshiro]' },
        { quoted: msg }
      )
    }
  }
}
