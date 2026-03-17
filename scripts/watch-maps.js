/**
 * 文件监听脚本
 * 监听 projects/ 和 maps/ 目录的 JSON 文件变化
 * 自动触发构建 builder-maps.json
 */

const chokidar = require("chokidar");
const { execSync } = require("child_process");
const path = require("path");

// 配置
const DEBOUNCE_DELAY = 500; // 防抖延迟（毫秒）
const WATCH_PATHS = [
  "public/data/projects/**/*.json",
  "public/data/maps/**/*.json",
];

// 防抖计时器
let buildTimeout = null;
let isBuilding = false;

/**
 * 执行构建
 */
function buildMaps() {
  if (isBuilding) {
    console.log("⏳ 构建进行中，跳过...");
    return;
  }

  isBuilding = true;
  console.log("🔨 构建中...");

  try {
    const startTime = Date.now();

    // 执行构建脚本
    execSync("node scripts/build-maps.js", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ 构建完成 (${duration}ms)\n`);
  } catch (error) {
    console.error("❌ 构建失败:", error.message);
  } finally {
    isBuilding = false;
  }
}

/**
 * 防抖构建
 */
function debouncedBuild(changedFile) {
  // 清除之前的计时器
  if (buildTimeout) {
    clearTimeout(buildTimeout);
  }

  // 显示检测到的变化
  const relativePath = path.relative(process.cwd(), changedFile);
  console.log(`📝 检测到变化: ${relativePath}`);

  // 设置新的计时器
  buildTimeout = setTimeout(() => {
    buildMaps();
  }, DEBOUNCE_DELAY);
}

/**
 * 主函数
 */
function watch() {
  console.log("👀 监听数据文件变化...");
  console.log(`   - 监听路径: ${WATCH_PATHS.join(", ")}`);
  console.log(`   - 防抖延迟: ${DEBOUNCE_DELAY}ms\n`);

  // 首次启动时构建一次
  console.log("🚀 执行初始构建...");
  buildMaps();

  // 创建文件监听器
  const watcher = chokidar.watch(WATCH_PATHS, {
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/builder-maps.json", // 忽略生成的文件
      "**/*.swp", // vim 临时文件
      "**/*.tmp", // 临时文件
      "**/*~", // 备份文件
    ],
    persistent: true,
    ignoreInitial: true, // 忽略初始文件扫描
    awaitWriteFinish: {
      // 等待文件写入完成
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  // 监听文件变化
  watcher
    .on("add", debouncedBuild)
    .on("change", debouncedBuild)
    .on("unlink", debouncedBuild)
    .on("error", (error) => {
      console.error("❌ 监听错误:", error);
    });

  // 优雅退出
  process.on("SIGINT", () => {
    console.log("\n\n👋 停止监听...");
    watcher.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    watcher.close();
    process.exit(0);
  });
}

// 启动监听
try {
  watch();
} catch (error) {
  console.error("❌ 启动失败:", error);
  process.exit(1);
}
