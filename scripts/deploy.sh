#!/bin/bash
set -e

APP_NAME="adhd"
DOMAIN="adhd.trelolabs.com"
SERVER_IP="20.193.129.119"
COMPOSE_FILE="docker-compose.yml"

echo "========================================"
echo "  ADHD Recall Box - Deploy Script"
echo "  Domain: $DOMAIN"
echo "========================================"
echo ""

# Pre-flight checks
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose first."
    exit 1
fi

# Use HTTP config if no active config exists
if [ ! -f nginx.conf ]; then
    echo "📄 Setting up initial nginx config (HTTP mode)..."
    cp nginx.http.conf nginx.conf
fi

# Build and start
echo "🐳 Building and starting containers..."
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
docker-compose -f "$COMPOSE_FILE" up --build -d

# Health check
echo ""
echo "⏳ Waiting for service to be ready..."
sleep 3

if curl -sf http://localhost:8085/ > /dev/null; then
    echo "✅ App is running on http://localhost:8085"
else
    echo "⚠️  App may not be ready yet. Check logs with: docker-compose logs -f"
fi

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Ensure DNS A-record '$DOMAIN' → '$SERVER_IP' is set"
echo "  2. Run: ./scripts/init-ssl.sh  (for HTTPS)"
echo ""
echo "Logs:    docker-compose logs -f"
echo "Stop:    docker-compose down"
echo ""
