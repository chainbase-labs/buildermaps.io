/**
 * 数据完整性验证脚本
 * 验证拆分后的数据：
 * - 所有映射的projectId都存在对应的项目文件
 * - 统计总数与原始数据一致
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../public/data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const MAPS_DIR = path.join(DATA_DIR, "maps");

function verifyData() {
  console.log("🔍 开始验证数据完整性...\n");

  // 1. 加载所有项目
  const projectFiles = fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const projects = new Set();

  console.log(`📦 加载 ${projectFiles.length} 个项目文件...`);
  projectFiles.forEach((file) => {
    const projectData = JSON.parse(
      fs.readFileSync(path.join(PROJECTS_DIR, file), "utf-8")
    );
    projects.add(projectData.id);
  });
  console.log(`✅ 成功加载 ${projects.size} 个项目\n`);

  // 2. 加载所有映射并验证
  const mapFiles = fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith(".json"));

  console.log(`🗺️  验证 ${mapFiles.length} 个映射文件...\n`);

  let totalMappings = 0;
  let errors = [];
  const sectorStats = [];

  mapFiles.forEach((file) => {
    const mapData = JSON.parse(
      fs.readFileSync(path.join(MAPS_DIR, file), "utf-8")
    );

    const sectorName = mapData.sector;
    const types = mapData.types || [];

    console.log(`📍 ${sectorName}:`);

    let sectorTotal = 0;
    const missingProjects = [];

    // 遍历每个type及其项目列表
    types.forEach((type) => {
      const typeName = type.name;
      const projectIds = type.projects || [];
      sectorTotal += projectIds.length;

      // 验证每个projectId
      projectIds.forEach((projectId) => {
        totalMappings++;
        if (!projects.has(projectId)) {
          missingProjects.push(`${projectId} (${typeName})`);
          errors.push({
            sector: sectorName,
            type: typeName,
            projectId: projectId,
            error: "项目文件不存在",
          });
        }
      });
    });

    console.log(`   - 映射项目数: ${sectorTotal}`);
    console.log(`   - Types数量: ${types.length}`);

    // 显示每个type的统计
    types.forEach((type) => {
      const typeName = type.name;
      const projectIds = type.projects || [];
      console.log(`     * ${typeName}: ${projectIds.length} 个项目`);
    });

    if (missingProjects.length > 0) {
      console.log(`   ❌ 缺失项目: ${missingProjects.join(", ")}`);
    } else {
      console.log(`   ✅ 所有项目引用完整`);
    }

    sectorStats.push({
      sector: sectorName,
      count: sectorTotal,
      typeCount: types.length,
      valid: missingProjects.length === 0,
    });

    console.log("");
  });

  // 3. 输出汇总
  console.log("=".repeat(50));
  console.log("📊 验证汇总:\n");
  console.log(`   - 项目文件总数: ${projects.size}`);
  console.log(`   - 映射关系总数: ${totalMappings}`);
  console.log(`   - Sector数量: ${mapFiles.length}`);

  if (errors.length > 0) {
    console.log(`\n   ❌ 发现 ${errors.length} 个错误:`);
    errors.forEach((err) => {
      console.log(`      - ${err.sector}: ${err.projectId} (${err.error})`);
    });
    process.exit(1);
  } else {
    console.log("\n   ✅ 数据完整性验证通过！");
  }

  console.log("\n📋 Sector统计:");
  sectorStats.forEach((stat) => {
    const status = stat.valid ? "✅" : "❌";
    console.log(
      `   ${status} ${stat.sector}: ${stat.count} 个项目 (${stat.typeCount} 个types)`
    );
  });

  console.log("\n✨ 验证完成！");
}

// 执行验证
try {
  verifyData();
} catch (error) {
  console.error("❌ 验证失败:", error);
  process.exit(1);
}
