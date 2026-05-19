# ADHD Recall Box — Deployment Guide

**Domain:** `adhd.trelolabs.com`  
**Server:** `20.193.129.119`

---

## Option 1: Manual Deploy via SSH (Fastest for static site)

This is the simplest approach since ADHD Recall Box is a pure static HTML/CSS/JS app.

### Step 1: DNS

In Namecheap (or your DNS provider), add an **A Record**:
- **Host:** `adhd`
- **Value:** `20.193.129.119`
- **TTL:** Automatic

### Step 2: SSH to server and deploy

```bash
# SSH to the server
ssh <your-user>@20.193.129.119

# Create directory
sudo mkdir -p /var/www/adhd.trelolabs.com
sudo chown $USER:$USER /var/www/adhd.trelolabs.com

# Clone or copy files
cd /var/www/adhd.trelolabs.com
git clone https://github.com/shivaram19/adhd-info-hub.git .
# OR just copy index.html, styles.css, app.js

# Add nginx config
sudo tee /etc/nginx/sites-available/adhd.trelolabs.com << 'EOF'
server {
    listen 80;
    server_name adhd.trelolabs.com;
    root /var/www/adhd.trelolabs.com;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/adhd.trelolabs.com /etc/nginx/sites-enabled/
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d adhd.trelolabs.com --agree-tos --no-eff-email

# Reload nginx
sudo systemctl reload nginx
```

Done! Visit `https://adhd.trelolabs.com`

---

## Option 2: Docker Compose Deploy

Use this if you prefer containerized deployment or want isolation from other apps.

```bash
# SSH to server
ssh <your-user>@20.193.129.119

# Clone repo
cd ~
git clone https://github.com/shivaram19/adhd-info-hub.git
cd adhd-info-hub

# Deploy
./scripts/deploy.sh

# Then set up SSL
./scripts/init-ssl.sh
```

> Note: This runs on port `8085`. You must add a reverse proxy in the **host nginx**:

```nginx
server {
    listen 443 ssl http2;
    server_name adhd.trelolabs.com;
    
    ssl_certificate /etc/letsencrypt/live/adhd.trelolabs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/adhd.trelolabs.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Option 3: GitHub Actions Auto-Deploy

The repo includes `.github/workflows/deploy.yml` for CI/CD.

### Required GitHub Secrets

Go to **GitHub Repo → Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|-------|
| `VM_HOST` | `20.193.129.119` |
| `VM_USER` | your SSH username |
| `VM_SSH_KEY` | your private SSH key (contents of `~/.ssh/id_rsa`) |

Then push to `main` or trigger the workflow manually.

---

## Option 4: GitHub Pages (No server needed)

For instant deployment without touching the server:

1. Go to **GitHub Repo → Settings → Pages**
2. **Source:** Deploy from a branch → `main` → `/ (root)`
3. **Custom domain:** `adhd.trelolabs.com`
4. In Namecheap DNS, add a **CNAME Record**:
   - **Host:** `adhd`
   - **Value:** `shivaram19.github.io`

Wait a few minutes for DNS + SSL certificate generation.

---

## Recommended: Option 1 (Host Nginx Direct)

Since this is a static site, Option 1 is the simplest and most performant. No Docker overhead, no port conflicts.

If the host already has nginx running (like `meet-assistant.trelolabs.com`), just add the new server block.
