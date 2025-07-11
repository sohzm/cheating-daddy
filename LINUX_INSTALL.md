# Cheating Daddy - Instalación en Linux

## Formatos de instalación disponibles

Cheating Daddy está disponible en varios formatos para diferentes distribuciones de Linux:

### 1. Paquete .deb (Ubuntu, Debian, Linux Mint, etc.)

```bash
# Descargar el archivo .deb
sudo dpkg -i cheating-daddy_*.deb

# Si hay problemas de dependencias, ejecutar:
sudo apt-get install -f
```

### 2. Paquete .rpm (Fedora, RHEL, CentOS, openSUSE, etc.)

```bash
# Fedora/RHEL/CentOS
sudo rpm -i cheating-daddy_*.rpm
# o
sudo dnf install cheating-daddy_*.rpm

# openSUSE
sudo zypper install cheating-daddy_*.rpm
```

### 3. AppImage (Universal - cualquier distribución)

```bash
# Hacer el archivo ejecutable
chmod +x Cheating-Daddy-*.AppImage

# Ejecutar directamente
./Cheating-Daddy-*.AppImage
```

## Construcción desde el código fuente

Si prefieres construir los instaladores desde el código fuente:

### Prerrequisitos

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libnss3-dev libgtk-3-dev libxss1 libasound2-dev

# Fedora
sudo dnf install gcc-c++ make nss-devel gtk3-devel libXScrnSaver-devel alsa-lib-devel

# Arch Linux
sudo pacman -S base-devel nss gtk3 libxss alsa-lib
```

### Construcción

```bash
# Clonar el repositorio
git clone https://github.com/sebamar88/cheating-daddy.git
cd cheating-daddy

# Instalar dependencias
npm install

# Construir todos los formatos para Linux
npm run make:linux

# O construir formatos específicos:
npm run make:deb      # Solo .deb
npm run make:rpm      # Solo .rpm
npm run make:appimage # Solo AppImage
```

Los instaladores generados se encontrarán en la carpeta `out/make/`.

## Desinstalación

### .deb

```bash
sudo apt-get remove cheating-daddy
```

### .rpm

```bash
# Fedora/RHEL/CentOS
sudo rpm -e cheating-daddy
# o
sudo dnf remove cheating-daddy

# openSUSE
sudo zypper remove cheating-daddy
```

### AppImage

Simplemente elimina el archivo AppImage.

## Problemas comunes

### Problema: La aplicación no aparece en el menú

**Solución:**

```bash
sudo update-desktop-database
sudo gtk-update-icon-cache -f -t /usr/share/icons/hicolor
```

### Problema: Error de permisos con audio

**Solución:**

```bash
# Agregar usuario al grupo audio
sudo usermod -a -G audio $USER
# Luego reiniciar sesión
```

### Problema: Dependencias faltantes

**Solución:**

```bash
# Ubuntu/Debian
sudo apt-get install --fix-broken

# Fedora
sudo dnf install -y --best --allowerasing
```

## Soporte

Si encuentras problemas durante la instalación, por favor:

1. Revisa los logs: `journalctl -u cheating-daddy`
2. Verifica las dependencias del sistema
3. Abre un issue en: https://github.com/sebamar88/cheating-daddy/issues
