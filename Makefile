# Makefile for Cheating Daddy Linux builds

.PHONY: all clean install-deps build-deb build-rpm build-appimage build-all help

# Variables
NPM := npm
OUTPUT_DIR := out/make

# Default target
all: build-all

# Help target
help:
	@echo "Available targets:"
	@echo "  install-deps  - Install build dependencies"
	@echo "  build-deb     - Build .deb package"
	@echo "  build-rpm     - Build .rpm package"
	@echo "  build-appimage- Build AppImage"
	@echo "  build-all     - Build all Linux packages"
	@echo "  clean         - Clean build artifacts"
	@echo "  help          - Show this help"

# Install dependencies
install-deps:
	@echo "Installing npm dependencies..."
	$(NPM) install

# Build .deb package
build-deb: install-deps
	@echo "Building .deb package..."
	$(NPM) run make:deb
	@echo "✓ .deb package built successfully!"
	@echo "Location: $(OUTPUT_DIR)/deb/"

# Build .rpm package  
build-rpm: install-deps
	@echo "Building .rpm package..."
	$(NPM) run make:rpm
	@echo "✓ .rpm package built successfully!"
	@echo "Location: $(OUTPUT_DIR)/rpm/"

# Build AppImage
build-appimage: install-deps
	@echo "Building AppImage..."
	$(NPM) run make:appimage
	@echo "✓ AppImage built successfully!"
	@echo "Location: $(OUTPUT_DIR)/AppImage/"
	mkdir -p $(OUTPUT_DIR)/AppImage
	mv $(OUTPUT_DIR)/*.AppImage $(OUTPUT_DIR)/AppImage/

# Build all Linux packages
build-all: install-deps
	@echo "Building all Linux packages..."
	$(NPM) run make:linux
	@echo "✓ All packages built successfully!"
	@echo "Packages location: $(OUTPUT_DIR)/"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf out/
	rm -rf node_modules/.cache/
	@echo "✓ Clean completed!"

# Install system dependencies (Ubuntu/Debian)
install-system-deps-deb:
	@echo "Installing system dependencies for Ubuntu/Debian..."
	sudo apt-get update
	sudo apt-get install -y build-essential libnss3-dev libgtk-3-dev libxss1 libasound2-dev

# Install system dependencies (Fedora)
install-system-deps-rpm:
	@echo "Installing system dependencies for Fedora..."
	sudo dnf install -y gcc-c++ make nss-devel gtk3-devel libXScrnSaver-devel alsa-lib-devel

# Install system dependencies (Arch)
install-system-deps-arch:
	@echo "Installing system dependencies for Arch Linux..."
	sudo pacman -S --needed base-devel nss gtk3 libxss alsa-lib
