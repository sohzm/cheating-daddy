const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: ['./src/assets/SystemAudioDump'],
        name: 'Cheating Daddy On Steroids',
        icon: 'src/assets/logo',
        // macOS permission descriptions for Info.plist
        // These are shown when the OS prompts for permissions
        extendInfo: {
            NSMicrophoneUsageDescription: 'Cheating Daddy On Steroids needs microphone access to capture audio for AI transcription.',
            NSCameraUsageDescription: 'Cheating Daddy On Steroids needs camera access for video capture.',
            // Screen recording description (informational - user must grant manually)
            NSScreenCaptureUsageDescription: 'Cheating Daddy On Steroids needs screen recording access to capture system audio.',
            // Required for hardened runtime
            NSAppleEventsUsageDescription: 'Cheating Daddy On Steroids needs to control System Preferences to help grant permissions.',
        },
        // macOS specific settings
        darwinDarkModeSupport: true,
        // use `security find-identity -v -p codesigning` to find your identity
        // for macos signing
        // osxSign: {
        //    identity: '<paste your identity here>',
        //    optionsForFile: (filePath) => {
        //        return {
        //            entitlements: 'entitlements.plist',
        //        };
        //    },
        // },
        // notarize is off - requires Apple Developer account
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
                productName: 'Cheating Daddy On Steroids',
                shortcutName: 'Cheating Daddy On Steroids',
                createDesktopShortcut: true,
                createStartMenuShortcut: true,
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
            config: {
                name: 'Cheating Daddy On Steroids',
                icon: 'src/assets/logo.icns',
                format: 'ULFO', // Lzfse compression - best for modern macOS
                window: {
                    size: {
                        width: 540,
                        height: 380
                    }
                },
            },
        },
        {
            name: '@reforged/maker-appimage',
            platforms: ['linux'],
            config: {
                options: {
                    name: 'Cheating Daddy On Steroids',
                    productName: 'Cheating Daddy On Steroids',
                    genericName: 'AI Assistant',
                    description: 'AI assistant for interviews and learning',
                    categories: ['Development', 'Education'],
                    icon: 'src/assets/logo.png'
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
