function createTray() {
  // Crear un ícono simple programáticamente si no tienes uno
  const iconPath = createTrayIcon();
  
  tray = new Tray(iconPath);
  
  // Tooltip que aparece al pasar el mouse
  tray.setToolTip('Mi Aplicación Electron');
  
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

