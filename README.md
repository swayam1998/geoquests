# GeoQuests

A location-based quest platform built with Next.js, FastAPI, and PostgreSQL.

## 🚀 Quick Start

**Get started in 2 minutes!**

```bash
# Set up everything
./dev.sh setup

# Start all services
make start
```

👉 **See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions**

## 📁 Project Structure

```
GeoQuests/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── docs/             # Documentation
├── docker-compose.yml # Database configuration
├── dev.sh            # Development setup script
└── Makefile          # Common development commands
```

## 🛠️ Development

### Quick Commands

```bash
make help      # Show all available commands
make setup     # Initial setup
make start     # Start all services
make stop      # Stop all services
make status    # Check service status
make test      # Run tests
```

### Services

- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## 📚 Documentation

- **[Quick Start Guide](./QUICK_START.md)** - Get started fast (local development)
- **[Deploy to Railway (geoquests.io)](./docs/RAILWAY-DEPLOY-GUIDE.md)** - Step-by-step production deploy
- **[Backend README](./backend/README.md)** - Backend documentation
- **[Frontend README](./frontend/README.md)** - Frontend documentation
- **[Architecture Docs](./docs/architecture/)** - System architecture
- **[Implementation Guides](./docs/implementation/)** - Setup guides

## 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.8+, SQLAlchemy, Alembic
- **Database**: PostgreSQL with PostGIS
- **Authentication**: JWT, Magic Links, OAuth (Google)

## 📝 License

[Add your license here]

---

**Need help?** Check the [Quick Start Guide](./QUICK_START.md) or open an issue.
