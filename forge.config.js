const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: ['./src/assets/SystemAudioDump'],
        name: 'Cheating Daddy',
        icon: 'src/assets/logo',
        // Set executable permissions for SystemAudioDump on macOS
        afterCopy: [
            (buildPath, electronVersion, platform, arch, callback) => {
                if (platform === 'darwin') {
                    const fs = require('fs');
                    const path = require('path');
                    const binaryPath = path.join(buildPath, '../SystemAudioDump');
                    try {
                        fs.chmodSync(binaryPath, 0o755); // rwxr-xr-x
                        console.log(' Set execute permissions for SystemAudioDump');
                    } catch (error) {
                        console.warn(' Failed to set permissions for SystemAudioDump:', error.message);
                    }
                }
                callback();
            }
        ],
        // use `security find-identity -v -p codesigning` to find your identity
        // for macos signing
        // also fuck apple
        // osxSign: {
        //    identity: '<paste your identity here>',
        //   optionsForFile: (filePath) => {
        //       return {
        //           entitlements: 'entitlements.plist',
        //       };
        //   },
        // },
        // notarize if off cuz i ran this for 6 hours and it still didnt finish
        // osxNotarize: {
        //    appleId: 'your apple id',
        //    appleIdPassword: 'app specific password',
        //    teamId: 'your team id',
        // },
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'cheating-daddy',
                productName: 'Cheating Daddy',
                shortcutName: 'Cheating Daddy',
                createDesktopShortcut: false,
                createStartMenuShortcut: true,
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
        },
        {
            name: '@reforged/maker-appimage',
            platforms: ['linux'],
            config: {
                options: {
                    name: 'Cheating Daddy',
                    productName: 'Cheating Daddy',
                    genericName: 'AI Assistant',
                    description: 'AI assistant for interviews and learning',
                    categories: ['Development', 'Education'],
                    icon: 'src/assets/logo.png',
                    desktopIntegration: false  // Prevent automatic desktop shortcut creation
                }
            },
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};
