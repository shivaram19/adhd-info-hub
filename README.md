# 🧠 ADHD Recall Box

Your external brain — a simple, fast webapp for ADHD people to store and retrieve any information they need.

**Live:** https://adhd.trelolabs.com

---

## Features

- **⚡ One-click capture** — Add notes, tasks, links, ideas, or reminders instantly
- **🔍 Powerful search** — Find anything fast (Ctrl+K)
- **📌 Pin important items** — Keep what matters at the top
- **🏷️ Tags** — Cross-reference and group related items
- **⏰ Due dates** — Visual urgency indicators (overdue = red, soon = yellow)
- **📁 Categories** — Notes, Tasks, Links, Ideas, Reminders
- **🔥 Priority levels** — Low / Medium / High / Urgent (urgent items pulse!)
- **🗄️ Archive** — Clean up without losing anything
- **💾 Auto-save** — Everything stored locally in your browser
- **📤 Export / Import** — Backup and restore your data as JSON
- **⌨️ Keyboard shortcuts** — Ctrl+N = new entry, Ctrl+K = search, Esc = close

---

## Screenshots

*(Add screenshots here)*

---

## Tech Stack

- Pure HTML5 + CSS3 + Vanilla JavaScript
- No frameworks, no build step
- No backend required — runs entirely client-side
- Deploys as static files anywhere (nginx, GitHub Pages, Netlify, etc.)

---

## Local Development

```bash
git clone https://github.com/shivaram19/adhd-info-hub.git
cd adhd-info-hub

# Option 1: Just open index.html in your browser
open index.html

# Option 2: Python simple server
python3 -m http.server 8080

# Option 3: Node.js
npx serve .
```

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for full deployment instructions.

Quick deploy (SSH to server):

```bash
# Copy static files to /var/www/adhd.trelolabs.com
# Add nginx server block
# Get SSL via certbot
# Done
```

---

## License

MIT
