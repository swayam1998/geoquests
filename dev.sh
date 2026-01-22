#!/bin/bash
# GeoQuests Development Environment Setup Script
# This script sets up and starts all services needed for development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Function to print colored output
print_status() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing=0
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        missing=1
    else
        print_success "Docker found"
    fi
    
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3.8+ first."
        missing=1
    else
        print_success "Python 3 found: $(python3 --version)"
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        missing=1
    else
        print_success "Node.js found: $(node --version)"
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        missing=1
    else
        print_success "npm found: $(npm --version)"
    fi
    
    if [ $missing -eq 1 ]; then
        exit 1
    fi
    
    echo ""
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    cd "$BACKEND_DIR"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_success "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    print_status "Upgrading pip..."
    pip install --upgrade pip --quiet
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt --quiet
    print_success "Backend dependencies installed"
    
    # Setup .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created (please review and update if needed)"
        else
            print_warning ".env.example not found. You may need to create .env manually"
        fi
    else
        print_success ".env file exists"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing Node.js dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies already installed"
    fi
    
    # Setup .env.local file if it doesn't exist
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            # Add default values if not present
            if ! grep -q "NEXT_PUBLIC_API_URL" .env.local; then
                echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" >> .env.local
            fi
            print_success ".env.local file created (please review and update if needed)"
        else
            # Create basic .env.local
            cat > .env.local << EOF
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Google Maps API Key (optional - add your key here)
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
EOF
            print_success ".env.local file created with defaults"
        fi
    else
        print_success ".env.local file exists"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

# Start database
start_database() {
    print_status "Starting PostgreSQL database..."
    
    # Check if database is already running
    if docker compose ps db 2>/dev/null | grep -q "Up"; then
        print_success "Database is already running"
    else
        docker compose up -d db
        print_status "Waiting for database to be ready..."
        
        # Wait for database to be ready (max 30 seconds)
        local max_attempts=30
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if docker compose exec -T db pg_isready -U geoquests >/dev/null 2>&1; then
                print_success "Database is ready"
                break
            fi
            attempt=$((attempt + 1))
            sleep 1
        done
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Database failed to start in time"
            exit 1
        fi
    fi
    
    echo ""
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    cd "$BACKEND_DIR"
    
    source venv/bin/activate
    alembic upgrade head
    
    print_success "Database migrations completed"
    cd "$PROJECT_ROOT"
    echo ""
}

# Start all services
start_services() {
    print_status "Starting development services..."
    echo ""
    
    # Check if services should run in background
    if [ "$1" == "--background" ] || [ "$1" == "-b" ]; then
        print_status "Starting services in background..."
        
        # Start backend in background
        cd "$BACKEND_DIR"
        source venv/bin/activate
        nohup uvicorn app.main:app --reload > ../backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > ../backend.pid
        print_success "Backend started (PID: $BACKEND_PID, logs: backend.log)"
        
        # Start frontend in background
        cd "$FRONTEND_DIR"
        nohup npm run dev > ../frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > ../frontend.pid
        print_success "Frontend started (PID: $FRONTEND_PID, logs: frontend.log)"
        
        cd "$PROJECT_ROOT"
        echo ""
        print_success "All services started in background!"
        echo ""
        echo "Services:"
        echo "  • Backend:  http://localhost:8000 (PID: $BACKEND_PID)"
        echo "  • Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
        echo "  • API Docs: http://localhost:8000/docs"
        echo ""
        echo "To stop services:"
        echo "  ./dev.sh stop"
        echo "  or: make stop"
        echo ""
        echo "To view logs:"
        echo "  tail -f backend.log"
        echo "  tail -f frontend.log"
    else
        print_status "Starting services in foreground (use Ctrl+C to stop)..."
        echo ""
        print_success "Services will start in separate terminals"
        echo ""
        echo "To start services in background instead, run:"
        echo "  ./dev.sh start --background"
        echo "  or: make start"
        echo ""
        
        # Start backend in new terminal (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            osascript -e "tell app \"Terminal\" to do script \"cd '$BACKEND_DIR' && source venv/bin/activate && uvicorn app.main:app --reload\""
            print_success "Backend starting in new terminal: http://localhost:8000"
        else
            # Linux - use gnome-terminal or xterm
            if command_exists gnome-terminal; then
                gnome-terminal -- bash -c "cd '$BACKEND_DIR' && source venv/bin/activate && uvicorn app.main:app --reload; exec bash"
            elif command_exists xterm; then
                xterm -e "cd '$BACKEND_DIR' && source venv/bin/activate && uvicorn app.main:app --reload" &
            else
                print_warning "Could not open new terminal. Please start backend manually:"
                echo "  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
            fi
        fi
        
        # Start frontend in new terminal
        if [[ "$OSTYPE" == "darwin"* ]]; then
            osascript -e "tell app \"Terminal\" to do script \"cd '$FRONTEND_DIR' && npm run dev\""
            print_success "Frontend starting in new terminal: http://localhost:3000"
        else
            if command_exists gnome-terminal; then
                gnome-terminal -- bash -c "cd '$FRONTEND_DIR' && npm run dev; exec bash"
            elif command_exists xterm; then
                xterm -e "cd '$FRONTEND_DIR' && npm run dev" &
            else
                print_warning "Could not open new terminal. Please start frontend manually:"
                echo "  cd frontend && npm run dev"
            fi
        fi
        
        echo ""
        print_success "Setup complete! Services are starting..."
        echo ""
        echo "Services:"
        echo "  • Backend:  http://localhost:8000"
        echo "  • Frontend: http://localhost:3000"
        echo "  • API Docs: http://localhost:8000/docs"
    fi
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    
    # Stop backend
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            print_success "Backend stopped (PID: $BACKEND_PID)"
        fi
        rm -f backend.pid
    fi
    
    # Stop frontend
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            print_success "Frontend stopped (PID: $FRONTEND_PID)"
        fi
        rm -f frontend.pid
    fi
    
    # Also try to kill by port (fallback)
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    print_success "All services stopped"
}

# Main script logic
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   GeoQuests Dev Environment Setup     ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    case "${1:-setup}" in
        setup)
            check_prerequisites
            setup_backend
            setup_frontend
            start_database
            run_migrations
            echo ""
            print_success "Setup complete! 🎉"
            echo ""
            echo "Next steps:"
            echo "  1. Review and update .env files if needed:"
            echo "     - backend/.env"
            echo "     - frontend/.env.local"
            echo ""
            echo "  2. Start services:"
            echo "     ./dev.sh start          # Start in separate terminals"
            echo "     ./dev.sh start -b       # Start in background"
            echo "     make start              # Same as above"
            echo ""
            ;;
        start)
            start_database
            start_services "$2"
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_database
            start_services "$2"
            ;;
        status)
            print_status "Service status:"
            echo ""
            if docker compose ps db 2>/dev/null | grep -q "Up"; then
                print_success "Database: Running"
            else
                print_error "Database: Stopped"
            fi
            
            if [ -f "backend.pid" ] && kill -0 $(cat backend.pid) 2>/dev/null; then
                print_success "Backend: Running (PID: $(cat backend.pid))"
            else
                print_error "Backend: Stopped"
            fi
            
            if [ -f "frontend.pid" ] && kill -0 $(cat frontend.pid) 2>/dev/null; then
                print_success "Frontend: Running (PID: $(cat frontend.pid))"
            else
                print_error "Frontend: Stopped"
            fi
            ;;
        *)
            echo "Usage: $0 {setup|start|stop|restart|status}"
            echo ""
            echo "Commands:"
            echo "  setup     - Set up development environment (first time)"
            echo "  start     - Start all services (use -b for background)"
            echo "  stop      - Stop all services"
            echo "  restart   - Restart all services"
            echo "  status    - Check service status"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"
