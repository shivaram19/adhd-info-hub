#!/bin/bash
set -e

DOMAIN="adhd.trelolabs.com"
SERVER_IP="20.193.129.119"
EMAIL="shivaramgoud@trelolabs.com"

echo "========================================"
echo "  ADHD Recall Box - SSL Setup"
echo "  Domain: $DOMAIN"
echo "========================================"
echo ""

# Check DNS resolution
echo "🔍 Checking DNS..."
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null || echo "")
if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo "⚠️  Warning: DNS for $DOMAIN does not resolve to $SERVER_IP"
    echo "   Resolved: $RESOLVED_IP"
    echo "   Expected: $SERVER_IP"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install certbot if needed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    else
        echo "❌ Could not install certbot. Install it manually."
        exit 1
    fi
fi

# Ensure certbot webroot exists
mkdir -p certbot-www

# Get certificate
echo ""
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
certbot certonly --standalone -d "$DOMAIN" --agree-tos --non-interactive --email "$EMAIL" || {
    echo "❌ Certbot failed. Trying with webroot method..."
    docker-compose up -d
    certbot certonly --webroot -w ./certbot-www -d "$DOMAIN" --agree-tos --non-interactive --email "$EMAIL"
}

# Switch to SSL config
echo ""
echo "📄 Switching to SSL nginx config..."
cp nginx.ssl.conf nginx.conf

# Restart container to pick up new config
echo "🔄 Restarting container..."
docker-compose restart

echo ""
echo "✅ SSL configured!"
echo ""

# Setup auto-renewal cron
echo "🕐 Setting up auto-renewal cron..."
CRON_CMD="0 3 * * * certbot renew --quiet --deploy-hook 'cd $(pwd) && docker-compose restart'"
(crontab -l 2>/dev/null | grep -v "$DOMAIN" || true; echo "$CRON_CMD") | crontab -

echo ""
echo "========================================"
echo "  SSL Setup Complete!"
echo "========================================"
echo ""
echo "Your site should now be available at:"
echo "  https://$DOMAIN"
echo ""
echo "Auto-renewal: Enabled (daily at 3 AM)"
echo ""
