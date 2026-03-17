/**
 * Process GitHub issue to extract project data and update files
 * Handles both "Add Project" and "Update Project" issues
 */

const fs = require("fs");
const path = require("path");

const ISSUE_BODY = process.argv[2];
const ISSUE_TITLE = process.argv[3];
const ISSUE_LABELS = process.argv[4] || "[]";

const DATA_DIR = path.join(__dirname, "../public/data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const MAPS_DIR = path.join(DATA_DIR, "maps");

// Helper function to slugify
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Extract JSON from markdown code block
function extractJsonFromMarkdown(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Failed to parse JSON from markdown:", e.message);
      return null;
    }
  }
  return null;
}

// Parse changes from "Changes Made" section
function parseChanges(text) {
  const changes = {};
  console.log("Parsing changes from issue body...");

  // Match the "Changes Made" section - be more flexible with the ending
  const changesSection = text.match(
    /## Changes Made\s*\n([\s\S]*?)(?:\nThank you|Thank you for your time|$)/i
  );
  if (!changesSection) {
    console.log('Could not find "Changes Made" section in issue body');
    return null;
  }

  const changesText = changesSection[1];
  console.log("Changes text:", changesText.substring(0, 200));

  // Match both formats: "value" → "value" and value → value (for null)
  // Use a more flexible regex that handles the arrow character
  const changeLines = changesText.match(/- \*\*([^*]+)\*\*:\s*([^\n]+)/g) || [];
  console.log(`Found ${changeLines.length} change lines`);

  changeLines.forEach((line) => {
    // Match format: - **Field**: "old" → "new" or - **Field**: null → null
    const match = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/);
    if (match) {
      const field = match[1].trim().toLowerCase();
      const changePart = match[2].trim();
      console.log(
        `Processing field: ${field}, change: ${changePart.substring(0, 50)}`
      );

      // Parse the change part (can be "value" → "value" or null → null)
      // Handle both Unicode arrow (→) and ASCII arrow (->)
      // Use a more flexible pattern that matches the arrow character
      const arrowMatch = changePart.match(/(.+?)\s*(?:→|->)\s*(.+)/);
      if (!arrowMatch) {
        console.log(`  ⚠️  Could not parse arrow in: ${changePart}`);
        return;
      }

      let oldValue = arrowMatch[1].trim();
      let newValue = arrowMatch[2].trim();

      // Remove quotes if present, but preserve null as string first
      if (oldValue.startsWith('"') && oldValue.endsWith('"')) {
        oldValue = oldValue.slice(1, -1);
      }
      if (newValue.startsWith('"') && newValue.endsWith('"')) {
        newValue = newValue.slice(1, -1);
      }

      console.log(`  Old: "${oldValue}", New: "${newValue}"`);

      // Map field names to JSON paths
      if (field === "description") {
        changes.description = newValue;
      } else if (field === "founded") {
        changes.founded =
          newValue === "null" || newValue === "" ? null : parseInt(newValue);
      } else if (field === "funding") {
        if (newValue === "null" || newValue === "") {
          changes.funding = null;
        } else {
          try {
            changes.funding = JSON.parse(newValue);
          } catch {
            changes.funding = newValue;
          }
        }
      } else if (field === "homepage") {
        if (!changes.links) changes.links = {};
        changes.links.homepage = newValue === "(empty)" ? "" : newValue;
      } else if (field === "logo") {
        if (!changes.links) changes.links = {};
        // Logo values don't have https://buildermaps.io prefix in the issue (removed for display)
        // So we add it if it's a relative path
        const logoValue = newValue === "(empty)" ? "" : newValue;
        changes.links.logo = logoValue.startsWith("/")
          ? `https://buildermaps.io${logoValue}`
          : logoValue;
      } else if (field === "twitter") {
        if (!changes.links) changes.links = {};
        changes.links.twitter = newValue === "(empty)" ? "" : newValue;
      } else if (field === "github") {
        if (!changes.links) changes.links = {};
        changes.links.github = newValue === "(empty)" ? "" : newValue;
      } else if (field === "location") {
        changes.location = newValue === "(empty)" ? "" : newValue;
      } else if (field === "category") {
        changes.category = newValue;
      } else if (field === "subcategory") {
        changes.subcategory = newValue;
      }
    }
  });

  console.log("Parsed changes:", JSON.stringify(changes, null, 2));
  return changes;
}

// Get project ID from issue title
function getProjectIdFromTitle(title) {
  // "Add Project: ProjectName" or "Update Project: ProjectName"
  const match = title.match(/(?:Add|Update) Project:\s*(.+)/);
  if (match) {
    return slugify(match[1].trim());
  }
  return null;
}

// Update map file
function updateMapFile(sectorName, typeName, projectId, isAdd) {
  const mapFileName = `${slugify(sectorName)}.json`;
  const mapFilePath = path.join(MAPS_DIR, mapFileName);

  let mapData;
  if (fs.existsSync(mapFilePath)) {
    mapData = JSON.parse(fs.readFileSync(mapFilePath, "utf-8"));
  } else {
    mapData = {
      sector: sectorName,
      types: [],
    };
  }

  const typeId = slugify(typeName);
  let typeEntry = mapData.types.find((t) => t.id === typeId);

  if (!typeEntry) {
    typeEntry = {
      id: typeId,
      name: typeName,
      projects: [],
    };
    mapData.types.push(typeEntry);
  }

  if (isAdd && !typeEntry.projects.includes(projectId)) {
    typeEntry.projects.push(projectId);
    typeEntry.projects.sort();
  }

  fs.writeFileSync(mapFilePath, JSON.stringify(mapData, null, 2) + "\n");
  console.log(`✅ Updated map file: ${mapFileName}`);
}

// Main processing function
function processIssue() {
  try {
    const labels = JSON.parse(ISSUE_LABELS);
    const isUpdate = labels.some((l) => l.name === "project:update");
    const isAdd = labels.some((l) => l.name === "project:add");

    if (!isUpdate && !isAdd) {
      console.log("Issue does not have project:add or project:update label");
      process.exit(1);
    }

    const projectId = getProjectIdFromTitle(ISSUE_TITLE);
    if (!projectId) {
      console.error("Could not extract project ID from issue title");
      process.exit(1);
    }

    let projectData;

    if (isAdd) {
      // Extract JSON from markdown code block
      projectData = extractJsonFromMarkdown(ISSUE_BODY);
      if (!projectData) {
        console.error("Could not extract project JSON from issue body");
        process.exit(1);
      }

      // Ensure ID matches
      projectData.id = projectId;

      // Save project file
      const projectFilePath = path.join(PROJECTS_DIR, `${projectId}.json`);
      fs.writeFileSync(
        projectFilePath,
        JSON.stringify(projectData, null, 2) + "\n"
      );
      console.log(`✅ Created project file: ${projectId}.json`);

      // Extract sector and type from issue body
      // Pattern: Find the map file `public/data/maps/${slugify(sectorName)}.json` and add `"${projectId}"` to the `projects` array of the type with `id: "${typeId}"` (name: "${typeName}")
      const sectorMatch = ISSUE_BODY.match(
        /Find the map file `public\/data\/maps\/([^`]+)\.json`/
      );
      const typeMatch = ISSUE_BODY.match(/`id: "([^"]+)"` \(name: "([^"]+)"\)/);

      if (sectorMatch && typeMatch) {
        // Extract sector name from the file path (it's already slugified)
        const sectorSlug = sectorMatch[1];
        // We need to find the actual sector name from the map file or use the slug
        // For now, we'll use the slug and try to find the map file
        const mapFilePath = path.join(MAPS_DIR, `${sectorSlug}.json`);
        let sectorName = sectorSlug; // Default to slug

        if (fs.existsSync(mapFilePath)) {
          const mapData = JSON.parse(fs.readFileSync(mapFilePath, "utf-8"));
          sectorName = mapData.sector || sectorSlug;
        }

        const typeName = typeMatch[2];
        updateMapFile(sectorName, typeName, projectId, true);
      } else {
        console.warn(
          "⚠️  Could not extract sector/type from issue body - map file not updated"
        );
      }
    } else if (isUpdate) {
      // For updates, load existing project and apply changes
      const projectFilePath = path.join(PROJECTS_DIR, `${projectId}.json`);

      if (!fs.existsSync(projectFilePath)) {
        console.error(`Project file not found: ${projectId}.json`);
        process.exit(1);
      }

      projectData = JSON.parse(fs.readFileSync(projectFilePath, "utf-8"));
      console.log(`Loaded existing project: ${projectId}`);

      const changes = parseChanges(ISSUE_BODY);

      if (!changes || Object.keys(changes).length === 0) {
        console.log("No changes detected in issue body");
        console.log("Issue body preview:", ISSUE_BODY.substring(0, 500));
        process.exit(0);
      }

      console.log("Applying changes to project data...");

      // Apply changes to project data
      if (changes.description !== undefined)
        projectData.description = changes.description;
      if (changes.founded !== undefined) projectData.founded = changes.founded;
      if (changes.funding !== undefined) projectData.funding = changes.funding;
      // Note: location is not stored in project JSON files, so we skip it

      if (changes.links) {
        if (!projectData.links) projectData.links = {};
        if (changes.links.homepage !== undefined) {
          projectData.links.homepage = changes.links.homepage || undefined;
          if (!projectData.links.homepage) delete projectData.links.homepage;
        }
        if (changes.links.logo !== undefined) {
          projectData.links.logo = changes.links.logo || undefined;
          if (!projectData.links.logo) delete projectData.links.logo;
        }
        if (changes.links.twitter !== undefined) {
          projectData.links.twitter = changes.links.twitter || undefined;
          if (!projectData.links.twitter) delete projectData.links.twitter;
        }
        if (changes.links.github !== undefined) {
          projectData.links.github = changes.links.github || undefined;
          if (!projectData.links.github) delete projectData.links.github;
        }
      }

      // Remove empty links object
      if (projectData.links && Object.keys(projectData.links).length === 0) {
        delete projectData.links;
      }

      // Save updated project file
      fs.writeFileSync(
        projectFilePath,
        JSON.stringify(projectData, null, 2) + "\n"
      );
      console.log(`✅ Updated project file: ${projectId}.json`);

      // Note: Category/subcategory changes would require updating map files
      // This is complex and may need manual review, so we'll log it
      if (changes.category || changes.subcategory) {
        console.log(
          "⚠️  Category/subcategory changes detected - manual review may be needed for map files"
        );
      }
    }

    console.log("✅ Issue processed successfully");
  } catch (error) {
    console.error("Error processing issue:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

processIssue();
