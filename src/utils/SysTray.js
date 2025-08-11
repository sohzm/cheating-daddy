const path = require('path');
const fs = require('fs');

function createTray() {
  // Validar y seleccionar el ícono según el sistema operativo
  let iconFile;

  if (process.platform === 'win32') {
    iconFile = path.join(__dirname, '../assets/logo.ico');
  } else if (process.platform === 'darwin') {
    iconFile = path.join(__dirname, '../assets/logo.icns');
  } else {
    iconFile = path.join(__dirname, '../assets/logo.png');
  }

  // Verificar si el archivo existe, si no, usar un ícono por defecto
  const iconPath = fs.existsSync(iconFile) ? iconFile : createTrayIcon();
  tray = new Tray(iconPath);
    // Tooltip que aparece al pasar el mouse
  tray.setToolTip('Cheating Daddy');
  
  // Menú contextual del tray
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar/Ocultar',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Mostrar Tray',
      click: () => {
        showTray();
      }
    },
    {
      label: 'Ocultar Tray',
      click: () => {
        hideTray();
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}

