.PHONY: help setup start stop restart status clean logs backend frontend db-up db-down migrate test

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)GeoQuests Development Commands$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

setup: ## Set up development environment (first time setup)
	@./dev.sh setup

start: ## Start all services in background
	@./dev.sh start --background

start-foreground: ## Start all services in separate terminals
	@./dev.sh start

stop: ## Stop all services
	@./dev.sh stop

restart: ## Restart all services
	@./dev.sh restart --background

status: ## Check status of all services
	@./dev.sh status

# Database commands
db-up: ## Start database
	@echo "$(BLUE)▶ Starting database...$(NC)"
	@docker compose up -d db
	@echo "$(GREEN)✓ Database started$(NC)"

db-down: ## Stop database
	@echo "$(BLUE)▶ Stopping database...$(NC)"
	@docker compose down
	@echo "$(GREEN)✓ Database stopped$(NC)"

db-logs: ## View database logs
	@docker compose logs -f db

db-shell: ## Open database shell
	@docker compose exec db psql -U geoquests -d geoquests

# Migration commands
migrate: ## Run database migrations
	@echo "$(BLUE)▶ Running migrations...$(NC)"
	@cd backend && source venv/bin/activate && alembic upgrade head
	@echo "$(GREEN)✓ Migrations completed$(NC)"

migrate-create: ## Create a new migration (usage: make migrate-create NAME=migration_name)
	@cd backend && source venv/bin/activate && alembic revision --autogenerate -m "$(NAME)"

migrate-downgrade: ## Rollback last migration
	@cd backend && source venv/bin/activate && alembic downgrade -1

# Backend commands
backend: ## Start backend server
	@echo "$(BLUE)▶ Starting backend...$(NC)"
	@cd backend && source venv/bin/activate && uvicorn app.main:app --reload

backend-install: ## Install backend dependencies
	@echo "$(BLUE)▶ Installing backend dependencies...$(NC)"
	@cd backend && python3 -m venv venv && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt
	@echo "$(GREEN)✓ Backend dependencies installed$(NC)"

backend-test: ## Run backend tests
	@cd backend && source venv/bin/activate && pytest

# Frontend commands
frontend: ## Start frontend server
	@echo "$(BLUE)▶ Starting frontend...$(NC)"
	@cd frontend && npm run dev

frontend-install: ## Install frontend dependencies
	@echo "$(BLUE)▶ Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"

frontend-build: ## Build frontend for production
	@cd frontend && npm run build

# Testing
test: ## Run all tests
	@echo "$(BLUE)▶ Running tests...$(NC)"
	@cd backend && source venv/bin/activate && pytest
	@echo "$(GREEN)✓ Tests completed$(NC)"

# Logs
logs: ## View all service logs
	@echo "$(BLUE)Backend logs:$(NC)"
	@tail -f backend.log 2>/dev/null || echo "No backend.log found"
	@echo ""
	@echo "$(BLUE)Frontend logs:$(NC)"
	@tail -f frontend.log 2>/dev/null || echo "No frontend.log found"

logs-backend: ## View backend logs
	@tail -f backend.log 2>/dev/null || echo "No backend.log found. Start backend with 'make start' first."

logs-frontend: ## View frontend logs
	@tail -f frontend.log 2>/dev/null || echo "No frontend.log found. Start frontend with 'make start' first."

# Cleanup
clean: ## Clean up generated files and caches
	@echo "$(BLUE)▶ Cleaning up...$(NC)"
	@rm -f backend.pid frontend.pid
	@rm -f backend.log frontend.log
	@find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Cleanup completed$(NC)"

clean-all: clean ## Clean everything including node_modules and venv
	@echo "$(YELLOW)⚠ Removing node_modules and venv...$(NC)"
	@rm -rf frontend/node_modules
	@rm -rf backend/venv
	@echo "$(GREEN)✓ Full cleanup completed$(NC)"

# Quick development workflow
dev: start ## Alias for start (quick dev workflow)
	@echo "$(GREEN)✓ Development environment ready!$(NC)"
