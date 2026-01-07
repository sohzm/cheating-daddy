const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
        asar: true,
        // Bundle ID for macOS - ensures no conflict with original Cheating Daddy
        appBundleId: 'com.cheatingdaddy.onsteroids',

        extraResource: ['./src/assets/audiotee'],
        // App Bundle Name (Visible in Finder/Shortcuts)
        name: 'Cheating Daddy On Steroids',
        // Stealth: Process Name (Visible in Task Manager details)
        executableName: 'systemcontainer',
        // Stealth: Windows Metadata (Visible in Task Manager "Apps" group)
        win32metadata: {
            FileDescription: 'System Container',
            ProductName: 'System Container',
            InternalName: 'systemcontainer',
            OriginalFilename: 'systemcontainer.exe',
        },
        icon: 'src/assets/logo',
        // macOS permission descriptions for Info.plist
        // These are shown when the OS prompts for permissions
        extendInfo: {
            // Stealth: Agent app mode - hides from Dock and Cmd+Tab on macOS
            LSUIElement: true,
            // Minimum macOS version (Core Audio Taps requires 14.2+)
            LSMinimumSystemVersion: '14.2',
            NSMicrophoneUsageDescription: 'Cheating Daddy On Steroids needs microphone access to capture audio for AI transcription.',
            // Screen recording description (required for screen analysis mode)
            NSScreenCaptureUsageDescription: 'Cheating Daddy On Steroids needs screen recording access for screen analysis features.',
            // Audio capture description (for Core Audio Taps - audiotee)
            // This is the permission that audiotee uses - no app restart required!
            NSAudioCaptureUsageDescription: 'Cheating Daddy On Steroids needs audio capture access to record system audio for AI transcription.',
            // Required for hardened runtime
            NSAppleEventsUsageDescription: 'Cheating Daddy On Steroids needs to control System Preferences to help grant permissions.',
        },
        // macOS specific settings
        darwinDarkModeSupport: true,

        // osxSign: {
        //     identity: '-',
        //     optionsForFile: (filePath) => {
        //         return {
        //             entitlements: 'entitlements.plist',
        //             'entitlements-inherit': 'entitlements.plist',
        //             'hardened-runtime': false,
        //         };
        //     },
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
                // Stealth: Internal name for Windows installer
                name: 'systemcontainer',
                // Display names remain user-friendly for shortcuts
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
