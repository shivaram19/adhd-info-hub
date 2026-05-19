#!/bin/bash
# One-command setup for adhd.trelolabs.com
# Run this on the server after SSH login

set -e

DOMAIN="adhd.trelolabs.com"
WEB_ROOT="/var/www/$DOMAIN"
NGINX_AVAILABLE="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"

echo "========================================"
echo "  ADHD Recall Box — Server Setup"
echo "  Domain: $DOMAIN"
echo "========================================"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    echo "❌ This script requires root or passwordless sudo access."
    echo "   Run: curl -fsSL ... | sudo bash"
    exit 1
fi

RUN="sudo"
if [ "$EUID" -eq 0 ]; then
    RUN=""
fi

# 1. Install dependencies if missing
echo "📦 Checking dependencies..."
if ! command -v nginx &> /dev/null; then
    echo "   Installing nginx..."
    if command -v apt-get &> /dev/null; then
        $RUN apt-get update -qq
        $RUN apt-get install -y -qq nginx curl certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        $RUN yum install -y nginx curl certbot python3-certbot-nginx
    else
        echo "❌ Cannot install nginx automatically. Install it manually first."
        exit 1
    fi
else
    echo "   ✓ nginx installed"
fi

if ! command -v certbot &> /dev/null; then
    echo "   Installing certbot..."
    if command -v apt-get &> /dev/null; then
        $RUN apt-get install -y -qq certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        $RUN yum install -y certbot python3-certbot-nginx
    fi
else
    echo "   ✓ certbot installed"
fi

# 2. Download latest static files
echo ""
echo "⬇️  Downloading latest app files..."
$RUN mkdir -p "$WEB_ROOT"
$RUN curl -fsSL https://github.com/shivaram19/adhd-info-hub/archive/refs/heads/main.tar.gz | \
    $RUN tar xz -C "$WEB_ROOT" --strip-components=1 --wildcards "*/index.html" "*/styles.css" "*/app.js"

# Verify download
if [ ! -f "$WEB_ROOT/index.html" ]; then
    echo "❌ Failed to download app files. Check internet connection."
    exit 1
fi

# Clean up extra files
$RUN rm -f "$WEB_ROOT/Dockerfile" "$WEB_ROOT/docker-compose.yml" "$WEB_ROOT/README.md" "$WEB_ROOT/DEPLOY.md" 2>/dev/null || true
$RUN rm -rf "$WEB_ROOT/scripts" "$WEB_ROOT/.github" "$WEB_ROOT/nginx.*.conf" 2>/dev/null || true

echo "   ✓ Files downloaded to $WEB_ROOT"

# 3. Create nginx config
echo ""
echo "🌐 Configuring nginx..."

$RUN tee "$NGINX_AVAILABLE" > /dev/null << 'EOF'
server {
    listen 80;
    server_name adhd.trelolabs.com;
    root /var/www/adhd.trelolabs.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
$RUN ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

# Test nginx config
$RUN nginx -t

echo "   ✓ nginx configured"

# 4. Get SSL certificate
echo ""
echo "🔐 Obtaining SSL certificate..."
if $RUN certbot --nginx -d "$DOMAIN" --agree-tos --no-eff-email --non-interactive 2>/dev/null; then
    echo "   ✓ SSL certificate obtained"
elif $RUN certbot certonly --nginx -d "$DOMAIN" --agree-tos --no-eff-email --non-interactive 2>/dev/null; then
    echo "   ✓ SSL certificate obtained (certonly mode)"
else
    echo "⚠️  SSL certificate failed. This usually means DNS isn't pointed yet."
    echo "   Make sure: $DOMAIN → this server's IP in your DNS settings."
    echo "   Then re-run this script, or run manually:"
    echo "   sudo certbot --nginx -d $DOMAIN"
    echo ""
    echo "   Site will still work over HTTP for now."
fi

# 5. Restart nginx
echo ""
echo "🔄 Restarting nginx..."
$RUN systemctl restart nginx || $RUN service nginx restart

echo ""
echo "========================================"
echo "  ✅ Setup Complete!"
echo "========================================"
echo ""
echo "Your app should be live at:"
echo "  http://$DOMAIN"
echo "  https://$DOMAIN  (after SSL succeeds)"
echo ""
echo "Files location: $WEB_ROOT"
echo "Nginx config:   $NGINX_AVAILABLE"
echo ""
echo "To update to latest version later, just re-run this script."
echo ""
