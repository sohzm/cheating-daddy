const path = require('path');

module.exports = {
    packagerConfig: {
        asar: true,
        icon: './src/assets/logo',
        extraResource: ['./src/assets/SystemAudioDump']
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'cheating_daddy',
                setupIcon: './src/assets/logo.ico'
            }
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin', 'win32']
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                icon: './src/assets/logo.icns',
                format: 'ULFO'
            }
        }
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {}
        },
        {
            name: '@electron-forge/plugin-fuses',
            config: {
                version: '1.0.0',
                resetAdHocDarwinSignature: true,
                runAsNode: false,
                enableCookieEncryption: true,
                enableNodeOptionsEnvironmentVariable: false,
                enableNodeCliInspectArguments: false
            }
        }
    ]
};