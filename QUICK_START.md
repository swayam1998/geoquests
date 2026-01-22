# GeoQuests Quick Start Guide

Get your development environment up and running in minutes!

## Prerequisites

Before starting, make sure you have:
- **Docker** (for PostgreSQL database)
- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **npm** (comes with Node.js)

## 🚀 Fast Setup (Recommended)

### Option 1: Using the Setup Script (Easiest)

```bash
# One command to set up everything
./dev.sh setup
```

This will:
- ✅ Check all prerequisites
- ✅ Set up Python virtual environment
- ✅ Install backend dependencies
- ✅ Install frontend dependencies
- ✅ Create `.env` files if missing
- ✅ Start the database
- ✅ Run database migrations

### Option 2: Using Make (Industry Standard)

```bash
# Set up environment
make setup

# Start all services
make start
```

## 📋 Manual Setup (If Needed)

If you prefer to set up manually or the script doesn't work:

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit .env with your values
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Edit .env.local with your values
```

### 3. Database Setup

```bash
# From project root
docker compose up -d
```

### 4. Run Migrations

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

## 🎯 Starting Services

### Quick Start (Background Mode)

```bash
# Start everything in background
./dev.sh start --background
# or
make start
```

Services will run in the background:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

### Foreground Mode (Separate Terminals)

```bash
# Start in separate terminals (macOS/Linux)
./dev.sh start
```

### Individual Services

```bash
# Start database only
make db-up

# Start backend only
make backend

# Start frontend only
make frontend
```

## 🛠️ Common Commands

### Using Make (Recommended)

```bash
make help          # Show all available commands
make setup         # Initial setup
make start         # Start all services
make stop          # Stop all services
make restart       # Restart all services
make status        # Check service status
make migrate       # Run database migrations
make test          # Run tests
make logs          # View all logs
make clean         # Clean up temporary files
```

### Using dev.sh Script

```bash
./dev.sh setup     # Initial setup
./dev.sh start     # Start services (foreground)
./dev.sh start -b  # Start services (background)
./dev.sh stop      # Stop services
./dev.sh restart   # Restart services
./dev.sh status    # Check status
```

## 📝 Environment Variables

### Backend (.env)

Required for basic functionality:
```bash
DATABASE_URL=postgresql://geoquests:geoquests_dev@localhost:5432/geoquests
SECRET_KEY=your-random-secret-key-min-32-characters-long
MAGIC_LINK_SECRET_KEY=another-random-secret-key-for-magic-links
FRONTEND_URL=http://localhost:3000
```

Optional (for OAuth and email):
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@resend.dev
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key  # Optional
```

## 🔍 Verifying Setup

### Check Service Status

```bash
make status
# or
./dev.sh status
```

### Test Backend

```bash
# Health check
curl http://localhost:8000/health

# Or visit API docs
open http://localhost:8000/docs
```

### Test Frontend

```bash
# Open in browser
open http://localhost:3000
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if database is running
docker compose ps

# Restart database
make db-down
make db-up

# View database logs
make db-logs
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000  # Backend
lsof -i :3000  # Frontend

# Kill the process or change ports in .env files
```

### Backend Import Errors

```bash
# Make sure virtual environment is activated
cd backend
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Build Errors

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules .next
npm install
```

## 📚 Next Steps

1. **Review Environment Variables**: Check `.env` files and update with your values
2. **Set up Google OAuth** (optional): See `docs/implementation/google-oauth-local-setup.md`
3. **Set up Resend** (optional): See `docs/implementation/resend-setup.md`
4. **Set up Google Maps** (optional): See `docs/implementation/google-maps-quick-start.md`
5. **Run Tests**: `make test` or `cd backend && pytest`
6. **Explore API**: Visit http://localhost:8000/docs

## 🎓 Development Workflow

### Daily Development

```bash
# Start your day
make start

# Make changes to code...

# Run tests
make test

# Check logs if needed
make logs-backend
make logs-frontend

# End of day
make stop
```

### Database Changes

```bash
# After modifying models, create migration
make migrate-create NAME=add_new_field

# Review the migration file in backend/alembic/versions/

# Apply migration
make migrate
```

## 💡 Tips

- **Use Make**: It's the industry standard and works on all platforms
- **Background Mode**: Use `make start` for background services (logs in files)
- **Foreground Mode**: Use `./dev.sh start` to see logs in real-time
- **Check Status**: Use `make status` to see what's running
- **View Logs**: Use `make logs` or `tail -f backend.log`

## 📖 Additional Documentation

- **Backend Setup**: `backend/QUICK_START.md`
- **Architecture**: `docs/architecture/`
- **Implementation Guides**: `docs/implementation/`
- **Testing**: `backend/docs/pytest-guide.md`

---

**Happy Coding! 🚀**
