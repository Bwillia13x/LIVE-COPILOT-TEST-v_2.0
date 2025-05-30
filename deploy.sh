#!/bin/bash

# 🚀 Production Deployment Script for Voice Notes Pro
# This script handles the complete production deployment process

set -e  # Exit on any error

# Default values
DRY_RUN=false
PLATFORM=""
DOMAIN=""
SKIP_CHECKS=false
URL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --url)
            URL="$2"
            shift 2
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run        Perform a dry run without actual deployment"
            echo "  --platform       Deployment platform (netlify|vercel)"
            echo "  --domain         Custom domain to configure"
            echo "  --url            URL for health check"
            echo "  --skip-checks    Skip quality checks"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        print_error "Node.js version $NODE_VERSION is less than required $REQUIRED_VERSION"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check environment variables
    if [ -z "$VITE_GEMINI_API_KEY" ] && [ ! -f ".env.production" ]; then
        print_warning "Production environment variables not set"
        print_status "Please set VITE_GEMINI_API_KEY or create .env.production"
    fi
    
    print_success "Prerequisites check passed"
}

# Clean previous builds
clean_build() {
    print_status "Cleaning previous builds..."
    rm -rf dist/
    rm -rf node_modules/.vite/
    print_success "Clean completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Run quality checks
run_quality_checks() {
    print_status "Running quality checks..."
    
    # Type checking
    print_status "Running TypeScript type checking..."
    if npm run type-check; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        exit 1
    fi
    
    # Linting (optional, don't fail build)
    print_status "Running linting..."
    if npm run lint; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found (non-blocking)"
    fi
}

# Build for production
build_production() {
    print_status "Building for production..."
    
    # Set production environment
    export NODE_ENV=production
    export VITE_APP_ENV=production
    export VITE_ENABLE_DEBUG=false
    export VITE_ENABLE_CONSOLE_LOGS=false
    
    # Build
    if npm run build:production; then
        print_success "Production build completed"
    else
        print_error "Production build failed"
        exit 1
    fi
    
    # Verify build output
    if [ ! -d "dist" ]; then
        print_error "Build output directory not found"
        exit 1
    fi
    
    # Build statistics
    print_status "Build statistics:"
    echo "  📁 Total build size: $(du -sh dist | cut -f1)"
    echo "  📊 Number of files: $(find dist -type f | wc -l)"
    echo "  🎯 Main bundle: $(ls -lh dist/assets/*.js | head -1 | awk '{print $5}')"
}

# Deploy to hosting platform
deploy() {
    PLATFORM=${1:-"netlify"}
    
    print_status "Deploying to $PLATFORM..."
    
    case $PLATFORM in
        "netlify")
            if command -v netlify &> /dev/null; then
                netlify deploy --prod --dir=dist
                print_success "Deployed to Netlify"
            else
                print_error "Netlify CLI not installed. Run: npm install -g netlify-cli"
                exit 1
            fi
            ;;
        "vercel")
            if command -v vercel &> /dev/null; then
                vercel --prod
                print_success "Deployed to Vercel"
            else
                print_error "Vercel CLI not installed. Run: npm install -g vercel"
                exit 1
            fi
            ;;
        "manual")
            print_status "Manual deployment: Upload the 'dist' folder to your hosting provider"
            ;;
        *)
            print_error "Unknown platform: $PLATFORM"
            print_status "Supported platforms: netlify, vercel, manual"
            exit 1
            ;;
    esac
}

# Health check
health_check() {
    URL=${1:-"https://voicenotes.app"}
    
    print_status "Running health check on $URL..."
    
    # Wait for deployment to propagate
    sleep 10
    
    if curl -f -s "$URL" > /dev/null; then
        print_success "Health check passed - $URL is responding"
    else
        print_warning "Health check failed - $URL may not be ready yet"
        print_status "Please check manually: $URL"
    fi
}

# Main deployment process
main() {
    print_status "🚀 Starting Voice Notes Pro production deployment..."
    echo ""
    
    # Set defaults if not provided by command line
    PLATFORM=${PLATFORM:-"netlify"}
    URL=${URL:-"https://voicenotes.app"}
    SKIP_CHECKS=${SKIP_CHECKS:-false}
    
    # Deployment steps
    if [ "$DRY_RUN" = true ]; then
        print_status "🧪 DRY RUN MODE - No actual changes will be made"
        echo ""
    fi
    
    check_prerequisites
    
    if [ "$DRY_RUN" = false ]; then
        clean_build
        install_dependencies
        
        if [ "$SKIP_CHECKS" = false ]; then
            run_quality_checks
        fi
        
        build_production
        deploy "$PLATFORM"
        health_check "$URL"
        
        print_success "🎉 Deployment completed successfully!"
        echo ""
        print_status "📊 Your Voice Notes Pro app is now live!"
        print_status "🌐 URL: $URL"
        print_status "📈 Monitor performance and analytics in your dashboard"
    else
        print_status "✅ Dry run completed - all prerequisites check passed"
        print_status "🚀 Ready for actual deployment. Run without --dry-run to deploy."
    fi
}

# Run main function with all arguments
main "$@"
