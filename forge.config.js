const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: ['./src/assets/SystemAudioDump'],
        name: 'Cheating Daddy',
        icon: 'src/assets/logo',
        executableName: 'cheating-daddy',
        // Linux specific configuration
        linux: {
            category: 'Development',
        },
        // use `security find-identity -v -p codesigning` to find your identity
        // for macos signing
        // Note: Apple-related processes can be frustrating at times
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
                createDesktopShortcut: true,
                createStartMenuShortcut: true,
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            platforms: ['linux'],
            config: {
                options: {
                    name: 'cheating-daddy',
                    productName: 'Cheating Daddy',
                    genericName: 'AI Assistant',
                    description: 'AI assistant for interviews and learning',
                    productDescription: 'Cheating Daddy is an AI-powered assistant designed to help with interviews and learning processes.',
                    categories: ['Development', 'Education'],
                    icon: 'src/assets/logo.png',
                    homepage: 'https://github.com/sohzm/cheating-daddy',
                    maintainer: 'sohzm <sohambharambe9@gmail.com>',
                    section: 'devel',
                    priority: 'optional',
                    depends: [],
                    recommends: [],
                    suggests: [],
                    enhances: [],
                    preDepends: [],
                    scripts: {
                        postinst: 'scripts/postinst',
                        prerm: 'scripts/prerm',
                        postrm: 'scripts/postrm',
                    },
                    desktopTemplate: 'src/assets/cheating-daddy.desktop',
                },
            },
        },
        {
            name: '@electron-forge/maker-rpm',
            platforms: ['linux'],
            config: {
                options: {
                    name: 'cheating-daddy',
                    productName: 'Cheating Daddy',
                    genericName: 'AI Assistant',
                    description: 'AI assistant for interviews and learning',
                    productDescription: 'Cheating Daddy is an AI-powered assistant designed to help with interviews and learning processes.',
                    categories: ['Development', 'Education'],
                    icon: 'src/assets/logo.png',
                    homepage: 'https://github.com/sebamar88/cheating-daddy',
                    license: 'GPL-3.0',
                    requires: [],
                    group: 'Development/Tools',
                },
            },
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
                    bin: 'cheating-daddy',
                },
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
