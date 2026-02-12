/**
 * Pre-commit hook script to check for duplicate project IDs
 * Validates that newly added/modified project files don't have IDs that already exist
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECTS_DIR = path.join(__dirname, "../public/data/projects");
const MAPS_DIR = path.join(__dirname, "../public/data/maps");

function getAllExistingProjectIds() {
  const projectFiles = fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const projectIds = new Map(); // Map<id, filename>

  projectFiles.forEach((file) => {
    try {
      const filePath = path.join(PROJECTS_DIR, file);
      const projectData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      if (projectData.id) {
        // If ID already exists, track both files
        if (projectIds.has(projectData.id)) {
          const existingFile = projectIds.get(projectData.id);
          projectIds.set(projectData.id, [existingFile, file].flat());
        } else {
          projectIds.set(projectData.id, file);
        }
      }
    } catch (error) {
      // Skip invalid JSON files
      console.warn(`⚠️  Warning: Could not parse ${file}: ${error.message}`);
    }
  });

  return projectIds;
}

function getStagedProjectFiles() {
  try {
    // Get staged files that are in the projects directory
    const output = execSync(
      "git diff --cached --name-only --diff-filter=ACMR",
      {
        encoding: "utf-8",
        cwd: path.join(__dirname, ".."),
      }
    );

    const stagedFiles = output
      .split("\n")
      .filter((file) => file.trim())
      .filter((file) => file.startsWith("public/data/projects/"))
      .filter((file) => file.endsWith(".json"));

    return stagedFiles;
  } catch (error) {
    // If not a git repo or no staged files, return empty array
    return [];
  }
}

function getStagedMapFiles() {
  try {
    // Get staged files that are in the maps directory
    const output = execSync(
      "git diff --cached --name-only --diff-filter=ACMR",
      {
        encoding: "utf-8",
        cwd: path.join(__dirname, ".."),
      }
    );

    const stagedFiles = output
      .split("\n")
      .filter((file) => file.trim())
      .filter((file) => file.startsWith("public/data/maps/"))
      .filter((file) => file.endsWith(".json"));

    return stagedFiles;
  } catch (error) {
    // If not a git repo or no staged files, return empty array
    return [];
  }
}

function checkMapsForDuplicates(existingProjectIds) {
  console.log("🗺️  Checking maps files for duplicate project IDs...\n");

  const mapFiles = fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith(".json"));
  const errors = [];
  const missingProjects = [];

  mapFiles.forEach((mapFile) => {
    try {
      const mapPath = path.join(MAPS_DIR, mapFile);
      const mapData = JSON.parse(fs.readFileSync(mapPath, "utf-8"));

      const sector = mapData.sector || "Unknown";

      // Check each type's projects array individually for duplicates
      if (mapData.types && Array.isArray(mapData.types)) {
        mapData.types.forEach((type, typeIndex) => {
          const typeName = type.name || type.id || `type[${typeIndex}]`;
          if (type.projects && Array.isArray(type.projects)) {
            // Check for duplicates within this specific projects array
            const projectIdCounts = new Map();
            const projectIdIndices = new Map();

            type.projects.forEach((projectId, projectIndex) => {
              if (!projectIdCounts.has(projectId)) {
                projectIdCounts.set(projectId, 0);
                projectIdIndices.set(projectId, []);
              }
              projectIdCounts.set(
                projectId,
                projectIdCounts.get(projectId) + 1
              );
              projectIdIndices.get(projectId).push(projectIndex);

              // Check if project exists in projects directory
              if (!existingProjectIds.has(projectId)) {
                missingProjects.push({
                  mapFile: mapFile,
                  sector: sector,
                  projectId: projectId,
                  type: typeName,
                });
              }
            });

            // Check for duplicates within this single projects array
            projectIdCounts.forEach((count, projectId) => {
              if (count > 1) {
                const indices = projectIdIndices.get(projectId);
                errors.push({
                  mapFile: mapFile,
                  sector: sector,
                  projectId: projectId,
                  type: typeName,
                  count: count,
                  indices: indices,
                });
              }
            });
          }
        });
      }
    } catch (error) {
      errors.push({
        mapFile: mapFile,
        error: `Invalid JSON: ${error.message}`,
      });
    }
  });

  if (errors.length > 0) {
    console.log("❌ Found duplicate project IDs within projects arrays:\n");
    errors.forEach((err) => {
      if (err.error) {
        console.log(`   - ${err.mapFile}: ${err.error}`);
      } else {
        console.log(`   - ${err.mapFile} (${err.sector}):`);
        console.log(
          `     Project ID "${err.projectId}" appears ${err.count} times in "${
            err.type
          }" at indices: ${err.indices.join(", ")}`
        );
      }
    });
    console.log("");
  }

  if (missingProjects.length > 0) {
    console.log(
      "❌ Found project IDs in maps that don't exist in projects directory:\n"
    );
    const missingByMap = new Map();
    missingProjects.forEach((missing) => {
      const key = missing.mapFile;
      if (!missingByMap.has(key)) {
        missingByMap.set(key, []);
      }
      missingByMap.get(key).push(missing);
    });

    missingByMap.forEach((missingList, mapFile) => {
      console.log(`   - ${mapFile}:`);
      missingList.forEach((missing) => {
        console.log(
          `     • "${missing.projectId}" in ${missing.type} (does not exist in projects/)`
        );
      });
    });
    console.log("");
  }

  return errors.length === 0 && missingProjects.length === 0;
}

function checkDuplicateIds() {
  console.log("🔍 Checking for duplicate project IDs...\n");

  // Get all existing project IDs
  const existingIds = getAllExistingProjectIds();

  let hasErrors = false;

  // First, check for duplicates already in the repository
  const repositoryDuplicates = [];
  existingIds.forEach((files, id) => {
    const fileArray = Array.isArray(files) ? files : [files];
    if (fileArray.length > 1) {
      repositoryDuplicates.push({
        id: id,
        files: fileArray,
      });
    }
  });

  if (repositoryDuplicates.length > 0) {
    console.log("❌ Found duplicate project IDs already in the repository:\n");
    repositoryDuplicates.forEach((dup) => {
      console.log(`   - ID "${dup.id}" found in: ${dup.files.join(", ")}`);
    });
    console.log("");
    hasErrors = true;
  } else {
    console.log(`📦 Found ${existingIds.size} existing project IDs \n`);
  }

  // Check maps files for duplicates and missing projects (always check, even if project duplicates exist)
  const mapsValid = checkMapsForDuplicates(existingIds);
  if (!mapsValid) {
    hasErrors = true;
  }

  // Get staged project files
  const stagedFiles = getStagedProjectFiles();

  // Get staged map files
  const stagedMapFiles = getStagedMapFiles();

  // Initialize errors array for staged files validation
  const errors = [];

  // Check staged map files
  if (stagedMapFiles.length > 0) {
    console.log(`📝 Checking ${stagedMapFiles.length} staged map file(s):\n`);

    stagedMapFiles.forEach((relativePath) => {
      const filePath = path.join(__dirname, "..", relativePath);
      const fileName = path.basename(relativePath);

      try {
        if (!fs.existsSync(filePath)) {
          console.log(`   ⏭️  ${fileName} (deleted, skipping)`);
          return;
        }

        const mapData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const sector = mapData.sector || "Unknown";
        let totalUniqueIds = 0;

        if (mapData.types && Array.isArray(mapData.types)) {
          mapData.types.forEach((type, typeIndex) => {
            const typeName = type.name || type.id || `type[${typeIndex}]`;
            if (type.projects && Array.isArray(type.projects)) {
              const projectIdCounts = new Map();
              const projectIdIndices = new Map();

              type.projects.forEach((projectId, projectIndex) => {
                if (!projectIdCounts.has(projectId)) {
                  projectIdCounts.set(projectId, 0);
                  projectIdIndices.set(projectId, []);
                }
                projectIdCounts.set(
                  projectId,
                  projectIdCounts.get(projectId) + 1
                );
                projectIdIndices.get(projectId).push(projectIndex);

                // Check if project exists
                if (!existingIds.has(projectId)) {
                  errors.push({
                    file: fileName,
                    error: `Project ID "${projectId}" in ${typeName} does not exist in projects directory`,
                  });
                }
              });

              totalUniqueIds += projectIdCounts.size;

              // Check for duplicates within this specific projects array
              projectIdCounts.forEach((count, projectId) => {
                if (count > 1) {
                  const indices = projectIdIndices.get(projectId);
                  errors.push({
                    file: fileName,
                    error: `Project ID "${projectId}" appears ${count} times in "${typeName}" at indices: ${indices.join(
                      ", "
                    )}`,
                  });
                }
              });
            }
          });
        }

        if (
          totalUniqueIds > 0 &&
          errors.filter(
            (e) => e.file === fileName && !e.error.includes("does not exist")
          ).length === 0
        ) {
          console.log(
            `   ✅ ${fileName} (${sector}): ${totalUniqueIds} unique project IDs across all types`
          );
        }
      } catch (error) {
        errors.push({
          file: fileName,
          error: `Invalid JSON: ${error.message}`,
        });
        console.log(`   ❌ ${fileName}: Invalid JSON - ${error.message}`);
      }
    });
    console.log("");
  }

  if (stagedFiles.length === 0 && stagedMapFiles.length === 0) {
    if (hasErrors) {
      console.log("💡 Please fix the errors above before committing.\n");
      return false;
    }
    console.log(
      "✅ No project or map files staged for commit. Repository is clean.\n"
    );
    return true;
  }

  console.log(`📝 Checking ${stagedFiles.length} staged project file(s):\n`);

  const newIds = new Map(); // Track IDs in staged files

  stagedFiles.forEach((relativePath) => {
    const filePath = path.join(__dirname, "..", relativePath);
    const fileName = path.basename(relativePath);

    try {
      if (!fs.existsSync(filePath)) {
        // File is being deleted, skip
        console.log(`   ⏭️  ${fileName} (deleted, skipping)`);
        return;
      }

      const projectData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const projectId = projectData.id;

      if (!projectId) {
        errors.push({
          file: fileName,
          error: 'Missing "id" field',
        });
        console.log(`   ❌ ${fileName}: Missing "id" field`);
        return;
      }

      // Check if this ID already exists in other staged files
      if (newIds.has(projectId)) {
        const existingFile = newIds.get(projectId);
        errors.push({
          file: fileName,
          id: projectId,
          error: `Duplicate ID in staged files: also found in ${existingFile}`,
        });
        console.log(
          `   ❌ ${fileName}: Duplicate ID "${projectId}" (also in ${existingFile})`
        );
      } else {
        newIds.set(projectId, fileName);
      }

      // Check if this ID already exists in the repository
      if (existingIds.has(projectId)) {
        const existingFile = existingIds.get(projectId);
        // existingFile could be a string or array (if duplicates exist, but we already checked for that)
        const existingFilePath = Array.isArray(existingFile)
          ? existingFile[0]
          : existingFile;

        // Only error if it's a different file
        if (existingFilePath !== fileName) {
          errors.push({
            file: fileName,
            id: projectId,
            error: `Project ID "${projectId}" already exists in ${existingFilePath}`,
          });
          console.log(
            `   ❌ ${fileName}: Project ID "${projectId}" already exists in ${existingFilePath}`
          );
        } else {
          console.log(
            `   ✅ ${fileName}: ID "${projectId}" (updating existing project)`
          );
        }
      } else {
        console.log(`   ✅ ${fileName}: ID "${projectId}" (new project)`);
      }
    } catch (error) {
      errors.push({
        file: fileName,
        error: `Invalid JSON: ${error.message}`,
      });
      console.log(`   ❌ ${fileName}: Invalid JSON - ${error.message}`);
    }
  });

  console.log("");

  if (errors.length > 0) {
    console.log("❌ Validation failed:\n");
    errors.forEach((err) => {
      console.log(`   - ${err.file}: ${err.error}`);
    });
    console.log("");
    hasErrors = true;
  }

  if (hasErrors) {
    console.log("💡 Please fix the errors above before committing.\n");
    return false;
  }

  console.log("✅ All project IDs are unique in both projects and maps!\n");
  return true;
}

// Run the check
try {
  const isValid = checkDuplicateIds();
  process.exit(isValid ? 0 : 1);
} catch (error) {
  console.error("❌ Error checking duplicate IDs:", error);
  process.exit(1);
}
