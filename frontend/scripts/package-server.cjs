const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "../..");
const serverDir = path.join(rootDir, "Backend");
// Stage embedded server on D:\ when available to avoid OneDrive locks and low C:\ disk space
const stagingBase = fs.existsSync("D:\\")
  ? "D:\\brp-staging"
  : path.resolve(__dirname, "../electron");
const destDir = path.join(stagingBase, "server");

console.log(`📦 Packaging BRP-System Backend for Electron build -> ${destDir}`);

// 1. Clean & create destination directory
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    if (file === "node_modules" || file === "local_data" || file === ".git") continue;
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

// 2. Copy Backend source files (server.js, src/, package.json, .env)
fs.copyFileSync(path.join(serverDir, "server.js"), path.join(destDir, "server.js"));
copyFolderRecursiveSync(path.join(serverDir, "src"), path.join(destDir, "src"));
fs.copyFileSync(path.join(serverDir, "package.json"), path.join(destDir, "package.json"));
console.log("✓ Copied Backend server.js, src/, and package.json");

// 3. Copy .env file
const envFile = path.join(serverDir, ".env");
if (fs.existsSync(envFile)) {
  fs.copyFileSync(envFile, path.join(destDir, ".env"));
  console.log("✓ Copied Backend/.env");
} else {
  console.warn("⚠ No Backend/.env file found");
}

// 4. Copy pre-downloaded local mongod.exe binary if available so installer runs 100% offline immediately
const binCandidates = [
  path.join(serverDir, "mongodb-bin", "mongod.exe"),
  "D:\\BRP-System-Data\\mongodb-binaries\\mongod.exe",
];
const foundMongod = binCandidates.find((p) => fs.existsSync(p));
if (foundMongod) {
  const targetBinDir = path.join(destDir, "mongodb-bin");
  if (!fs.existsSync(targetBinDir)) fs.mkdirSync(targetBinDir, { recursive: true });
  fs.copyFileSync(foundMongod, path.join(targetBinDir, "mongod.exe"));
  console.log(`✓ Bundled portable mongod.exe (${foundMongod}) into server/mongodb-bin`);
} else {
  console.warn("⚠ Portable mongod.exe not found; app will download on first run if online.");
}

// 5. Install production node_modules for server
console.log("⚙ Installing production node_modules for embedded server...");
try {
  const env = { ...process.env };
  if (fs.existsSync("D:\\")) {
    const tmpDir = "D:\\brp-build-temp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    env.TEMP = tmpDir;
    env.TMP = tmpDir;
    env.npm_config_cache = path.join(tmpDir, "npm-cache");
  }
  execSync("npm install --omit=dev --no-audit --no-fund", {
    cwd: destDir,
    stdio: "inherit",
    env: { ...env, MONGOMS_DISABLE_POSTINSTALL: "1" },
  });
  // Ensure no duplicate mongodb binary cache sneaks inside node_modules/.cache
  const nmCache = path.join(destDir, "node_modules", ".cache");
  if (fs.existsSync(nmCache)) {
    fs.rmSync(nmCache, { recursive: true, force: true });
    console.log("✓ Cleaned node_modules/.cache to keep installer compact");
  }
  console.log("✓ Successfully installed production node_modules for server");
} catch (err) {
  console.error("❌ Failed to install production dependencies for server:", err.message);
  process.exit(1);
}

console.log("🎉 Server packaging completed successfully.");

