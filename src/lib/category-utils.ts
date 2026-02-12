export interface Project {
  id: string;
  name: string;
  location: string;
  description: string;
  yearFounded?: number;
  totalFunding?: number | string;
  homepage?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  medium?: string;
  github?: string;
  linkedin?: string;
  reddit?: string;
  logoUrl?: string;
}

export interface Subcategory {
  name: string;
  projects: Project[];
  subcategories?: Subcategory[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

interface SectorEntry {
  sector: string;
  types: string[];
}

interface BuilderMapEntry {
  name: string;
  description?: string;
  sectors: SectorEntry[];
  founded?: number | null;
  funding?: number | string | null;
  links?: {
    homepage?: string;
    logo?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    medium?: string;
    github?: string;
    linkedin?: string;
    reddit?: string;
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function processBuilderMapsData(builderMaps: BuilderMapEntry[]): Category[] {
  // Map to store unique projects by name to avoid duplication
  const projectMap = new Map<string, Project>();
  console.log({ mode: process.env.NODE_ENV });
  // Map to store categories and their subcategories
  const categoryAccumulator = new Map<
    string,
    {
      category: Category;
      subcategories: Map<string, Subcategory>;
    }
  >();

  builderMaps.forEach((entry, index) => {
    // Use project name as the key for consistent IDs
    const projectId = entry.name ? slugify(entry.name) : `project-${index}`;

    // Create or get the project
    let project = projectMap.get(entry.name);
    if (!project) {
      const links = entry.links || {};
      project = {
        id: projectId,
        name: entry.name,
        location: "Unknown", // Location not in new structure
        description: entry.description || "",
        yearFounded: entry.founded ?? undefined,
        totalFunding: entry.funding ?? undefined,
        homepage: links.homepage,
        twitter: links.twitter,
        telegram: links.telegram,
        discord: links.discord,
        medium: links.medium,
        github: links.github,
        linkedin: links.linkedin,
        reddit: links.reddit,
        logoUrl: links.logo,
      };
      projectMap.set(entry.name, project);
    }

    // Process each sector the project belongs to
    const sectors = entry.sectors || [];
    if (sectors.length === 0) {
      // Skip projects with no sectors - do not display them
      return;
    } else {
      // Process each sector
      sectors.forEach((sectorEntry) => {
        const sectorName = sectorEntry.sector?.trim() || "Uncategorized";
        const categoryId = slugify(sectorName);

        let record = categoryAccumulator.get(categoryId);
        if (!record) {
          record = {
            category: {
              id: categoryId,
              name: sectorName,
              subcategories: [],
            },
            subcategories: new Map(),
          };
          categoryAccumulator.set(categoryId, record);
        }

        // Process each type within the sector
        const types = sectorEntry.types || [];
        if (types.length === 0) {
          // If no types, add to "General" subcategory
          const subcategoryName = "General";
          let subcategory = record.subcategories.get(subcategoryName);
          if (!subcategory) {
            subcategory = {
              name: subcategoryName,
              projects: [],
            };
            record.subcategories.set(subcategoryName, subcategory);
            record.category.subcategories.push(subcategory);
          }
          if (!subcategory.projects.find((p) => p.id === project.id)) {
            subcategory.projects.push(project);
          }
        } else {
          // Add project to each type subcategory
          types.forEach((typeName) => {
            const subcategoryName = typeName.trim() || "General";
            let subcategory = record.subcategories.get(subcategoryName);
            if (!subcategory) {
              subcategory = {
                name: subcategoryName,
                projects: [],
              };
              record.subcategories.set(subcategoryName, subcategory);
              record.category.subcategories.push(subcategory);
            }
            // Only add if not already present (avoid duplicates)
            if (!subcategory.projects.find((p) => p.id === project.id)) {
              subcategory.projects.push(project);
            }
          });
        }
      });
    }
  });

  return Array.from(categoryAccumulator.values()).map((record) => ({
    ...record.category,
    subcategories: record.category.subcategories.map((subcategory) => ({
      ...subcategory,
    })),
  }));
}

/**
 * Builds builder maps data from local projects and maps directories
 * This function is used in development to build data on-the-fly
 * Uses webpack's require.context to dynamically load JSON files
 */
function buildFromLocalData(): BuilderMapEntry[] {
  // Use webpack's require.context to load all JSON files
  // @ts-ignore - require.context is a webpack feature
  const projectsContext = require.context(
    "../../public/data/projects",
    false,
    /\.json$/
  );
  // @ts-ignore - require.context is a webpack feature
  const mapsContext = require.context(
    "../../public/data/maps",
    false,
    /\.json$/
  );

  // Load all projects
  const projects = new Map<string, any>();
  projectsContext.keys().forEach((key: string) => {
    const project = projectsContext(key);
    if (project && project.id) {
      projects.set(project.id, project);
    }
  });

  // Load all maps and build the data structure
  const projectSectors = new Map<string, SectorEntry[]>();

  mapsContext.keys().forEach((key: string) => {
    const mapData = mapsContext(key);
    if (!mapData || !mapData.sector) return;

    const sectorName = mapData.sector;
    const types = mapData.types || [];

    types.forEach((type: { id: string; name: string; projects: string[] }) => {
      if (!type || !type.name) return;

      const typeName = type.name;
      const projectIds = type.projects || [];

      projectIds.forEach((projectId: string) => {
        if (!projectId) return;

        if (!projectSectors.has(projectId)) {
          projectSectors.set(projectId, []);
        }

        let sectorEntry = projectSectors
          .get(projectId)!
          .find((s) => s.sector === sectorName);

        if (sectorEntry) {
          if (!sectorEntry.types.includes(typeName)) {
            sectorEntry.types.push(typeName);
          }
        } else {
          projectSectors.get(projectId)!.push({
            sector: sectorName,
            types: [typeName],
          });
        }
      });
    });
  });

  // Build the final structure
  const builderMaps: BuilderMapEntry[] = [];

  for (const [projectId, sectors] of projectSectors) {
    const project = projects.get(projectId);
    if (!project) {
      console.warn(`Project not found: ${projectId}`);
      continue;
    }

    builderMaps.push({
      name: project.name,
      description: project.description || "",
      sectors: sectors,
      founded: project.founded ?? null,
      funding: project.funding ?? null,
      links: project.links || {},
    });
  }

  // Sort by name
  builderMaps.sort((a, b) => a.name.localeCompare(b.name));

  return builderMaps;
}

/**
 * Fetches builder maps data from the remote URL and processes it into categories
 */
export async function fetchCategories(): Promise<Category[]> {
  if (process.env.NODE_ENV === "development") {
    // In development, build from local projects and maps
    const builderMaps = buildFromLocalData();
    return processBuilderMapsData(builderMaps);
  }

  // In production, fetch from OSS (path depends on hostname)
  const hostname = window.location.hostname;
  const dataPath =
    hostname === "net-static-dev.chainbasehq.com"
      ? "https://net-static-dev.chainbasehq.com/public/buildermaps/test/data/builder-maps.json"
      : hostname.endsWith("buildermaps.io")
      ? "https://net-static-dev.chainbasehq.com/public/buildermaps/data/builder-maps.json"
      : "https://net-static-dev.chainbasehq.com/public/buildermaps/data/builder-maps.json";

  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch builder maps data: ${response.statusText}`
    );
  }
  const builderMaps: BuilderMapEntry[] = await response.json();
  return processBuilderMapsData(builderMaps);
}

export function countSubcategoryProjects(subcategory: Subcategory): number {
  return subcategory.projects.length;
}

export function countCategoryProjects(category: Category): number {
  return category.subcategories.reduce(
    (total, subcategory) => total + countSubcategoryProjects(subcategory),
    0
  );
}

export function countTotalProjects(categories: Category[]): number {
  return categories.reduce(
    (total, category) => total + countCategoryProjects(category),
    0
  );
}

/**
 * Sorts projects so that projects starting with numbers are placed at the end
 */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const aStartsWithNumber = /^\d/.test(a.name.trim());
    const bStartsWithNumber = /^\d/.test(b.name.trim());

    // If both start with numbers or both don't, sort alphabetically
    if (aStartsWithNumber === bStartsWithNumber) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }

    // If only one starts with a number, put it at the end
    return aStartsWithNumber ? 1 : -1;
  });
}
