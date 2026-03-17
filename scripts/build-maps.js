/**
 * 数据构建脚本
 * 将拆分的数据合并回 builder-maps.json：
 * - 读取 projects/ 下的所有项目文件
 * - 读取 maps/ 下的所有映射文件
 * - 合并生成完整的 builder-maps.json
 */

const fs = require("fs");
const path = require("path");

// 路径配置
const DATA_DIR = path.join(__dirname, "../public/data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const MAPS_DIR = path.join(DATA_DIR, "maps");
const OUTPUT_FILE = path.join(DATA_DIR, "builder-maps.json");

function buildData() {
  console.log("🔨 Starting to build builder-maps.json...\n");

  // 1. 加载所有项目
  console.log("📦 Loading project files...");
  const projectFiles = fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const projects = new Map();

  projectFiles.forEach((file) => {
    const projectData = JSON.parse(
      fs.readFileSync(path.join(PROJECTS_DIR, file), "utf-8")
    );
    projects.set(projectData.id, projectData);
  });

  console.log(`✅ Loaded ${projects.size} projects\n`);

  // 2. 加载所有映射
  console.log("🗺️  Loading map files...");
  const mapFiles = fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith(".json"));
  const maps = [];

  mapFiles.forEach((file) => {
    const mapData = JSON.parse(
      fs.readFileSync(path.join(MAPS_DIR, file), "utf-8")
    );
    maps.push(mapData);
  });

  console.log(`✅ Loaded ${maps.length} map files\n`);

  // 3. 构建完整数据
  console.log("🔄 Building data structure...");
  const builderMaps = [];
  const projectSectors = new Map(); // 存储每个项目的sectors

  // 遍历所有映射，收集每个项目的sectors信息
  maps.forEach((map) => {
    const sectorName = map.sector;
    const types = map.types || [];

    // 遍历每个type及其项目列表
    types.forEach((type) => {
      const typeName = type.name;
      const projectIds = type.projects || [];

      projectIds.forEach((projectId) => {
        // 获取或初始化项目的sectors数组
        if (!projectSectors.has(projectId)) {
          projectSectors.set(projectId, []);
        }

        // 查找是否已存在该sector
        let sectorEntry = projectSectors
          .get(projectId)
          .find((s) => s.sector === sectorName);

        if (sectorEntry) {
          // sector已存在，添加type
          if (!sectorEntry.types.includes(typeName)) {
            sectorEntry.types.push(typeName);
          }
        } else {
          // 新建sector entry
          projectSectors.get(projectId).push({
            sector: sectorName,
            types: [typeName],
          });
        }
      });
    });
  });

  // 为每个项目创建完整的entry
  let warnings = [];

  for (const [projectId, sectors] of projectSectors) {
    const project = projects.get(projectId);

    if (!project) {
      warnings.push(`⚠️  Project not found: ${projectId}`);
      continue;
    }

    // 创建完整的项目entry
    builderMaps.push({
      name: project.name,
      description: project.description,
      sectors: sectors,
      founded: project.founded,
      funding: project.funding,
      links: project.links,
    });
  }

  // 按项目名称排序
  builderMaps.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`✅ Built ${builderMaps.length} project entries\n`);

  // 4. 输出警告
  if (warnings.length > 0) {
    console.log("⚠️  Warnings:");
    warnings.forEach((warning) => console.log(`   ${warning}`));
    console.log("");
  }

  // 5. 写入文件
  console.log("💾 Writing builder-maps.json...");
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(builderMaps, null, 2));
  console.log(`✅ Successfully wrote ${OUTPUT_FILE}\n`);

  // 6. 统计信息
  console.log("📊 Build statistics:");
  console.log(`   - Output projects: ${builderMaps.length}`);
  console.log(
    `   - File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`
  );

  // 统计每个sector的项目数
  const sectorCounts = new Map();
  builderMaps.forEach((entry) => {
    entry.sectors.forEach((s) => {
      const count = sectorCounts.get(s.sector) || 0;
      sectorCounts.set(s.sector, count + 1);
    });
  });

  console.log("\n📋 Sector distribution:");
  const sortedSectors = Array.from(sectorCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [sector, count] of sortedSectors) {
    console.log(`   - ${sector}: ${count} projects`);
  }

  console.log("\n✨ Build complete!");
}

// 执行构建
try {
  buildData();
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}
