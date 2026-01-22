#!/bin/bash
# Quick setup script for GeoQuests backend

set -e

echo "🚀 Setting up GeoQuests Backend..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Copy .env.example to .env: cp .env.example .env"
echo "  3. Edit .env with your values"
echo "  4. Start database: docker compose up -d (from project root)"
echo "  5. Run migrations: alembic upgrade head"
echo "  6. Start server: uvicorn app.main:app --reload"
echo ""
echo "To view database schema:"
echo "  python view_schema.py html"
echo ""
