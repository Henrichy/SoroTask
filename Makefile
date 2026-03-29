.PHONY: help build test lint clean build-contract build-keeper build-frontend test-contract test-keeper test-frontend lint-contract lint-keeper lint-frontend lint-js clean-contract clean-keeper clean-frontend

# Default target
help:
	@echo "SoroTask Makefile - Common Development Tasks"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build                 Build all components (contract, frontend)"
	@echo "  build-contract        Build Soroban smart contract (Rust)"
	@echo "  build-keeper          Keeper doesn't require build (Node.js runtime)"
	@echo "  build-frontend        Build Frontend component (Next.js)"
	@echo ""
	@echo "  test                  Run tests for all components"
	@echo "  test-contract         Run contract tests (Rust)"
	@echo "  test-keeper           Run keeper tests (Jest)"
	@echo "  test-frontend         Run frontend tests (N/A - echo only)"
	@echo ""
	@echo "  lint                  Lint all components"
	@echo "  lint-contract         Lint contract code (cargo clippy)"
	@echo "  lint-keeper           Lint keeper code (ESLint)"
	@echo "  lint-frontend         Lint frontend code (ESLint)"
	@echo ""
	@echo "  clean                 Clean all build artifacts"
	@echo "  clean-contract        Clean contract build artifacts"
	@echo "  clean-keeper          Clean keeper build artifacts"
	@echo "  clean-frontend        Clean frontend build artifacts"
	@echo ""
	@echo "  install               Install all dependencies"
	@echo "  format                Format all code"
	@echo "  check                 Run lint + test"
	@echo "  dev                   Show dev workflow"
	@echo ""

# ==============================================================================
# BUILD TARGETS
# ==============================================================================

build: build-contract build-frontend
	@echo "✓ All buildable components built successfully"

build-contract:
	@echo "Building Soroban smart contract..."
	cd contract && cargo build --release
	@echo "✓ Contract built successfully"

build-keeper:
	@echo "Keeper is a Node.js runtime application - no build step needed"
	@echo "Run 'npm start' in keeper/ directory to start the service"

build-frontend:
	@echo "Building Frontend component (Next.js)..."
	cd frontend && npm install && npm run build
	@echo "✓ Frontend built successfully"

# ==============================================================================
# TEST TARGETS
# ==============================================================================

test: test-contract test-keeper test-frontend
	@echo "✓ All tests completed"

test-contract:
	@echo "Running contract tests..."
	cd contract && cargo test --release
	@echo "✓ Contract tests passed"

test-keeper:
	@echo "Running keeper tests (Jest)..."
	cd keeper && npm test
	@echo "✓ Keeper tests passed"

test-frontend:
	@echo "Frontend tests not specified (echo only)"
	cd frontend && npm test

# ==============================================================================
# LINT TARGETS
# ==============================================================================

lint: lint-contract lint-keeper lint-frontend lint-js
	@echo "✓ All components linted successfully"

lint-contract:
	@echo "Linting contract code (cargo clippy)..."
	cd contract && cargo clippy --all-targets --all-features -- -D warnings
	@echo "✓ Contract linting passed"

lint-keeper:
	@echo "Linting keeper code (ESLint)..."
	cd keeper && npm run lint
	@echo "✓ Keeper linting passed"

lint-frontend:
	@echo "Linting frontend code (ESLint)..."
	cd frontend && npm run lint
	@echo "✓ Frontend linting passed"

lint-js:
	@echo "Running lint-staged on staged files..."
	npx lint-staged
	@echo "✓ Lint-staged passed"

# ==============================================================================
# CLEAN TARGETS
# ==============================================================================

clean: clean-contract clean-keeper clean-frontend
	@echo "✓ All build artifacts cleaned"

clean-contract:
	@echo "Cleaning contract build artifacts..."
	cd contract && cargo clean
	@echo "✓ Contract cleaned"

clean-keeper:
	@echo "Cleaning keeper build artifacts..."
	cd keeper && rm -rf node_modules coverage .nyc_output
	@echo "✓ Keeper cleaned"

clean-frontend:
	@echo "Cleaning frontend build artifacts..."
	cd frontend && rm -rf node_modules .next dist build out
	@echo "✓ Frontend cleaned"

# ==============================================================================
# UTILITY TARGETS
# ==============================================================================

install:
	@echo "Installing dependencies for all components..."
	npm install
	cd contract && cargo fetch
	cd keeper && npm install
	cd frontend && npm install
	@echo "✓ All dependencies installed"

format:
	@echo "Formatting all code..."
	cd contract && cargo fmt
	cd keeper && npm run lint:fix 2>/dev/null || npx prettier --write "src/**/*.{ts,js}" "__tests__/**/*.{ts,js}" 2>/dev/null || echo "  (prettier not configured for keeper)"
	cd frontend && npm run lint:fix 2>/dev/null || echo "  (lint:fix not configured for frontend)"
	@echo "✓ Code formatted"

check: lint test
	@echo "✓ All checks passed (lint + test)"

dev:
	@echo "Development workflow - Run each in a separate terminal:"
	@echo ""
	@echo "Contract (Rust):"
	@echo "  cd contract && cargo watch -x build"
	@echo ""
	@echo "Keeper (Node.js - background service):"
	@echo "  cd keeper && npm run dev"
	@echo ""
	@echo "Frontend (Next.js):"
	@echo "  cd frontend && npm run dev"
	@echo ""

.DEFAULT_GOAL := help
