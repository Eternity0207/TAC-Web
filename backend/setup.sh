#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_header "Unified Order Management System - Setup Script"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    print_status "Node.js version $NODE_VERSION is compatible"
else
    print_error "Node.js version $NODE_VERSION is not compatible. Please install Node.js v18 or higher."
    exit 1
fi

# Check if MongoDB is running (if using local MongoDB)
if command -v mongod &> /dev/null; then
    if pgrep mongod > /dev/null; then
        print_status "MongoDB is running"
    else
        print_warning "MongoDB daemon not found running. Make sure MongoDB is installed and running, or update MONGODB_URI in .env"
    fi
else
    print_warning "MongoDB not found locally. Make sure to configure MONGODB_URI in .env for remote MongoDB"
fi

# Install dependencies
print_header "Installing Dependencies"
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_status ".env file created. Please review and update the configuration."
else
    print_status ".env file exists"
fi

# Build the TypeScript project
print_header "Building TypeScript Project"
if npm run build; then
    print_status "TypeScript build completed successfully"
else
    print_error "TypeScript build failed"
    exit 1
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    mkdir -p uploads
    print_status "Created uploads directory"
fi

print_header "Setup Complete!"
print_status "Unified Order Management System is ready to run."
echo
echo -e "${GREEN}Next steps:${NC}"
echo "1. Review and update the .env file with your configuration"
echo "2. Ensure MongoDB is running and accessible"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Run 'npm run init-admin' to create the initial admin user"
echo "5. Access the API at <BACKEND_URL>/api (configured in .env)"
echo "6. Access the Admin Panel at <ADMIN_URL> (configured in .env)"
echo
echo -e "${BLUE}Available commands:${NC}"
echo "  npm run dev          - Start development server with hot reload"
echo "  npm run build        - Build TypeScript to JavaScript"
echo "  npm run start        - Start production server"
echo "  npm run init-admin   - Initialize admin user"
echo "  npm run build:frontend - Build and copy frontend assets"