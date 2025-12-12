# Cheating Daddy - Linux Installation

## Available Installation Formats

Cheating Daddy is available in several formats for different Linux distributions:

### 1. .deb Package (Ubuntu, Debian, Linux Mint, etc.)

```bash
# Download the .deb file
sudo dpkg -i cheating-daddy_*.deb

# If you encounter dependency issues, run:
sudo apt-get install -f
```

### 2. .rpm Package (Fedora, RHEL, CentOS, openSUSE, etc.)

```bash
# Fedora/RHEL/CentOS
sudo rpm -i cheating-daddy_*.rpm
# or
sudo dnf install cheating-daddy_*.rpm

# openSUSE
sudo zypper install cheating-daddy_*.rpm
```

### 3. AppImage (Universal - any distribution)

```bash
# Make the file executable
chmod +x Cheating-Daddy-*.AppImage

# Run directly
./Cheating-Daddy-*.AppImage
```

## Building from Source

If you prefer to build the installers from source code:

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libnss3-dev libgtk-3-dev libxss1 libasound2-dev

# Fedora
sudo dnf install gcc-c++ make nss-devel gtk3-devel libXScrnSaver-devel alsa-lib-devel

# Arch Linux
sudo pacman -S base-devel nss gtk3 libxss alsa-lib
```

### Build

```bash
# Clone the repository
git clone https://github.com/sohzm/cheating-daddy.git
cd cheating-daddy

# Install dependencies
npm install

# Build all formats for Linux
npm run make:linux

# Or build specific formats:
npm run make:deb      # Only .deb
npm run make:rpm      # Only .rpm
npm run make:appimage # Only AppImage
```

The generated installers will be found in the `out/make/` folder.

## Uninstallation

### .deb

```bash
sudo apt-get remove cheating-daddy
```

### .rpm

```bash
# Fedora/RHEL/CentOS
sudo rpm -e cheating-daddy
# or
sudo dnf remove cheating-daddy

# openSUSE
sudo zypper remove cheating-daddy
```

### AppImage

Simply delete the AppImage file.

## Common Issues

### Issue: The application does not appear in the menu

**Solution:**

```bash
sudo update-desktop-database
sudo gtk-update-icon-cache -f -t /usr/share/icons/hicolor
```

### Issue: Audio permission error

**Solution:**

```bash
# Add user to the audio group
sudo usermod -a -G audio $USER
# Then restart your session
```

### Issue: Missing dependencies

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get install --fix-broken

# Fedora
sudo dnf install -y --best --allowerasing
```

## Support

If you encounter issues during installation, please:

1. Check the logs: `journalctl -u cheating-daddy`
2. Verify system dependencies
3. Open an issue at: https://github.com/sohzm/cheating-daddy/issues
