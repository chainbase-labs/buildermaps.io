"use strict";

const { spawnSync, spawn } = require("node:child_process");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

// Check for duplicate files (files with " copy" in the name)
const PROJECTS_DIR = path.join(__dirname, "../public/data/projects");

function checkForDuplicateFiles() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return { hasDuplicates: false, files: [] };
  }

  const files = fs.readdirSync(PROJECTS_DIR);
  const duplicateFiles = files.filter((file) => file.includes(" copy"));

  return {
    hasDuplicates: duplicateFiles.length > 0,
    files: duplicateFiles,
  };
}

function reportDuplicateFiles(files) {
  console.error(
    "\n❌ Error: Found duplicate files in public/data/projects/:\n"
  );
  files.forEach((file) => {
    console.error(`   - ${file}`);
  });
  console.error("\n💡 Please remove or rename these duplicate files.\n");
}

// Check for duplicate files before starting webpack
const duplicateCheck = checkForDuplicateFiles();
if (duplicateCheck.hasDuplicates) {
  reportDuplicateFiles(duplicateCheck.files);
  process.exit(1);
}

const webpackCli = require.resolve("webpack-cli/bin/cli.js");
const args = process.argv.slice(2);

// Check if we're in development/serve mode
const isDevelopment =
  args.includes("serve") || args.includes("--mode=development");

const formattedBuildTime = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const env = {
  ...process.env,
  LAST_BUILD_TIME: formattedBuildTime,
};

// Set up file watcher for development mode
let watcher = null;
let webpackChild = null;
let checkTimeout = null;
let periodicCheckInterval = null;

if (isDevelopment) {
  let isExiting = false;

  const handleDuplicateError = () => {
    if (isExiting) return;

    const duplicateCheck = checkForDuplicateFiles();
    if (duplicateCheck.hasDuplicates) {
      isExiting = true;

      // Clear periodic check
      if (periodicCheckInterval) {
        clearInterval(periodicCheckInterval);
        periodicCheckInterval = null;
      }

      // Clear any pending timeout
      if (checkTimeout) {
        clearTimeout(checkTimeout);
        checkTimeout = null;
      }

      reportDuplicateFiles(duplicateCheck.files);
      // Kill webpack process and exit
      if (webpackChild) {
        console.error(
          "\n🛑 Stopping webpack build due to duplicate file error.\n"
        );
        webpackChild.kill("SIGTERM");
        // Give it a moment to clean up, then force exit
        setTimeout(() => {
          if (watcher) {
            watcher.close();
          }
          process.exit(1);
        }, 500);
      } else {
        process.exit(1);
      }
    }
  };

  watcher = chokidar.watch(PROJECTS_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });

  // Check on file additions - check immediately and also after a short delay
  watcher.on("add", (filePath) => {
    const fileName = path.basename(filePath);
    if (fileName.includes(" copy")) {
      handleDuplicateError();
    } else {
      // Also check after a short delay in case of race conditions
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      checkTimeout = setTimeout(() => handleDuplicateError(), 100);
    }
  });

  // Also check on file changes (in case file is renamed to include " copy")
  watcher.on("change", () => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }
    checkTimeout = setTimeout(() => handleDuplicateError(), 100);
  });

  watcher.on("error", (error) => {
    console.error("Watcher error:", error);
  });

  // Periodic check every 500ms to catch any duplicates that might have been missed
  periodicCheckInterval = setInterval(() => {
    if (!isExiting) {
      handleDuplicateError();
    }
  }, 500);
}

// Use spawn for development mode (non-blocking) so watcher can run
// Use spawnSync for production builds (blocking)
if (isDevelopment) {
  webpackChild = spawn(process.execPath, [webpackCli, ...args], {
    stdio: "inherit",
    env,
  });

  // Clean up watcher and intervals on process exit
  const cleanup = () => {
    if (watcher) {
      watcher.close();
    }
    if (periodicCheckInterval) {
      clearInterval(periodicCheckInterval);
      periodicCheckInterval = null;
    }
    if (checkTimeout) {
      clearTimeout(checkTimeout);
      checkTimeout = null;
    }
  };

  webpackChild.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 1);
  });

  process.on("SIGINT", () => {
    cleanup();
    if (webpackChild) {
      webpackChild.kill("SIGINT");
    }
  });

  process.on("SIGTERM", () => {
    cleanup();
    if (webpackChild) {
      webpackChild.kill("SIGTERM");
    }
  });
} else {
  const result = spawnSync(process.execPath, [webpackCli, ...args], {
    stdio: "inherit",
    env,
  });

  if (watcher) {
    watcher.close();
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
