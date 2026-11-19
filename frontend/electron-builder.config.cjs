const path = require("path");
const os = require("os");
const fs = require("fs");

// Output outside OneDrive (and use D:\ if available so C:\ never runs out of disk space)
const hasD = fs.existsSync("D:\\");
const tempOutputDir = hasD
  ? "D:\\brp-dist-output"
  : path.join(os.tmpdir(), "brp-dist-output");
const stagedServerDir = hasD
  ? "D:\\brp-staging\\server"
  : path.resolve(__dirname, "electron/server");

module.exports = {
  appId: "com.mat3amy.restauranterp",
  productName: "Mat3amy",
  extraMetadata: {
    version: require("./package.json").version,
  },
  electronVersion: "31.2.0",
  npmRebuild: false,
  asar: true,
  asarUnpack: [
    "**/dist/**/*",
  ],
  extraResources: [
    {
      from: stagedServerDir,
      to: "server",
      filter: ["**/*"],
    },
    {
      from: path.join(stagedServerDir, "node_modules"),
      to: "server/node_modules",
      filter: ["**/*", "!.cache/**/*", "!**/.cache/**/*"],
    },
  ],
  directories: {
    output: tempOutputDir,
    buildResources: "build",
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "!electron/server/**/*",
    "build/**/*",
  ],
  win: {
    target: ["nsis"],
    icon: "build/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    perMachine: false,
    runAfterFinish: false,
    installerIcon: "build/icon.ico",
    uninstallerIcon: "build/icon.ico",
    installerHeaderIcon: "build/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Mat3amy",
    artifactName: "Mat3amy-Setup-${version}.${ext}",
  },
};

