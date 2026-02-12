import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useRef,
} from "react";
import { Modal, Box, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCategories,
  type Category,
  type Subcategory,
} from "../lib/category-utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Link as LinkIcon, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

// Context for managing modal state
interface SubmitProjectModalContextType {
  open: boolean;
  setOpen: (
    open: boolean,
    initialValues?: {
      categoryId?: string;
      subcategoryName?: string;
      lockCategory?: boolean;
    }
  ) => void;
  initialValues: { categoryId?: string; subcategoryName?: string };
  lockCategory: boolean;
}

const SubmitProjectModalContext = createContext<
  SubmitProjectModalContextType | undefined
>(undefined);

export function useSubmitProjectModal() {
  const context = useContext(SubmitProjectModalContext);
  if (!context) {
    throw new Error(
      "useSubmitProjectModal must be used within SubmitProjectModalProvider"
    );
  }
  return context;
}

// Provider component
export function SubmitProjectModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<{
    categoryId?: string;
    subcategoryName?: string;
  }>({});
  const [lockCategory, setLockCategory] = useState(false);

  const handleSetOpen = (
    isOpen: boolean,
    values?: {
      categoryId?: string;
      subcategoryName?: string;
      lockCategory?: boolean;
    }
  ) => {
    setOpen(isOpen);
    if (isOpen && values) {
      setInitialValues({
        categoryId: values.categoryId,
        subcategoryName: values.subcategoryName,
      });
      setLockCategory(values.lockCategory || false);
    } else if (!isOpen) {
      setInitialValues({});
      setLockCategory(false);
    }
  };

  return (
    <SubmitProjectModalContext.Provider
      value={{ open, setOpen: handleSetOpen, initialValues, lockCategory }}
    >
      {children}
      <SubmitProjectModalContent />
    </SubmitProjectModalContext.Provider>
  );
}

// Helper function to load all projects
function loadAllProjects(): any[] {
  try {
    // @ts-ignore - require.context is a webpack feature
    const projectsContext = require.context(
      "../../public/data/projects",
      false,
      /\.json$/
    );
    const projects: any[] = [];
    projectsContext.keys().forEach((key: string) => {
      const project = projectsContext(key);
      if (project && project.id) {
        projects.push(project);
      }
    });
    return projects;
  } catch (error) {
    console.error("Error loading projects:", error);
    return [];
  }
}

// Helper function to search for a project by name
function searchProjectByName(projectName: string): any | null {
  if (!projectName || projectName.trim().length === 0) {
    return null;
  }

  const projects = loadAllProjects();
  const normalizedSearchName = projectName.trim().toLowerCase();

  // Try exact match first (case-insensitive)
  let match = projects.find(
    (p) => p.name && p.name.toLowerCase() === normalizedSearchName
  );

  // If no exact match, try partial match
  if (!match) {
    match = projects.find(
      (p) => p.name && p.name.toLowerCase().includes(normalizedSearchName)
    );
  }

  return match || null;
}

// Helper function to normalize logo URL - add domain prefix if it's a relative path
function normalizeLogoUrl(url: string): string {
  if (!url || !url.trim()) {
    return url;
  }

  const trimmedUrl = url.trim();

  // If it starts with '/', add the buildermaps.io domain
  if (trimmedUrl.startsWith("/")) {
    return `https://buildermaps.io${trimmedUrl}`;
  }

  // If it's already a full URL, return as is
  return trimmedUrl;
}

// Modal content component
function SubmitProjectModalContent() {
  const { open, setOpen, initialValues, lockCategory } =
    useSubmitProjectModal();
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [categoryData, setCategoryData] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [initialValuesApplied, setInitialValuesApplied] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoFilledProjectNameRef = useRef<string | null>(null);
  const originalAutoFilledValuesRef = useRef<Partial<ProjectFormData> | null>(
    null
  );
  const originalProjectJsonRef = useRef<any | null>(null);
  const originalCategoryRef = useRef<{
    categoryId: string;
    subcategoryName: string;
  } | null>(null);

  // New category/subcategory dialogs
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newSubcategoryDialog, setNewSubcategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  interface ProjectFormData {
    name: string;
    location?: string;
    description: string;
    founded?: string;
    raised?: string;
    website?: string;
    twitter?: string;
    github?: string;
    logo?: string;
    categoryId: string;
    subcategoryName: string;
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormData>();

  const watchCategoryId = watch("categoryId");
  const watchSubcategoryName = watch("subcategoryName");
  const watchLogoUrl = watch("logo");
  const watchProjectName = watch("name");
  const watchDescription = watch("description");
  const watchFounded = watch("founded");
  const watchRaised = watch("raised");
  const watchWebsite = watch("website");
  const watchTwitter = watch("twitter");
  const watchGithub = watch("github");
  const watchLocation = watch("location");

  // Watch all form values to trigger re-renders when they change
  const allFormValues = watch();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setLogoPreview("");
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setInitialValuesApplied(false);
      setIsAutoFilling(false);
      lastAutoFilledProjectNameRef.current = null;
      originalAutoFilledValuesRef.current = null;
      originalProjectJsonRef.current = null;
      originalCategoryRef.current = null;
      // Clear any pending search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }
  }, [open, reset]);

  // Debounced search for existing projects when name changes
  useEffect(() => {
    // Don't search if modal is closed
    if (!open) {
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if name is empty or if we're currently auto-filling
    if (
      !watchProjectName ||
      watchProjectName.trim().length === 0 ||
      isAutoFilling
    ) {
      return;
    }

    const normalizedName = watchProjectName.trim().toLowerCase();

    // Don't search if we've already auto-filled for this exact project name
    // This prevents infinite loops when setValue triggers re-renders
    if (lastAutoFilledProjectNameRef.current === normalizedName) {
      return;
    }

    // Set up debounced search (3 seconds)
    searchTimeoutRef.current = setTimeout(() => {
      const matchedProject = searchProjectByName(watchProjectName);

      if (matchedProject) {
        // Mark that we've auto-filled for this project name
        lastAutoFilledProjectNameRef.current = normalizedName;
        // Immediately clear original values to ensure button is disabled
        originalAutoFilledValuesRef.current = null;
        setIsAutoFilling(true);

        // Auto-fill form fields
        if (matchedProject.description) {
          setValue("description", matchedProject.description);
        }

        if (matchedProject.founded) {
          setValue("founded", String(matchedProject.founded));
        }

        if (matchedProject.funding) {
          // Format funding value for display
          const funding = matchedProject.funding;
          if (typeof funding === "number") {
            if (funding >= 1000000000) {
              setValue("raised", `$${(funding / 1000000000).toFixed(1)}B`);
            } else if (funding >= 1000000) {
              setValue("raised", `$${(funding / 1000000).toFixed(1)}M`);
            } else if (funding >= 1000) {
              setValue("raised", `$${(funding / 1000).toFixed(1)}K`);
            } else {
              setValue("raised", `$${funding}`);
            }
          } else {
            setValue("raised", String(funding));
          }
        }

        if (matchedProject.links) {
          if (matchedProject.links.homepage) {
            setValue("website", matchedProject.links.homepage);
          }
          if (matchedProject.links.logo) {
            setValue("logo", normalizeLogoUrl(matchedProject.links.logo));
          }
          if (matchedProject.links.twitter) {
            setValue("twitter", matchedProject.links.twitter);
          }
          if (matchedProject.links.github) {
            setValue("github", matchedProject.links.github);
          }
        }

        // Prepare original values for comparison
        let foundCategoryId = "";
        let foundSubcategoryName = "";

        // Try to find and set category/subcategory if available
        if (categoryData.length > 0) {
          // Search through categories to find where this project belongs
          let found = false;

          for (const category of categoryData) {
            if (found) break;
            for (const subcategory of category.subcategories) {
              const projectInSubcategory = subcategory.projects.find(
                (p) =>
                  p.id === matchedProject.id || p.name === matchedProject.name
              );
              if (projectInSubcategory) {
                foundCategoryId = category.id;
                foundSubcategoryName = subcategory.name;
                found = true;
                break;
              }
            }
          }

          // Set category first, then subcategory after a delay to ensure category is set
          if (found) {
            // Set category first
            setValue("categoryId", foundCategoryId);
            // Use a small delay to ensure category is set first before setting subcategory
            // This also allows the selectedCategory state to update before we set the subcategory
            setTimeout(() => {
              setValue("subcategoryName", foundSubcategoryName);
            }, 200);
          }
        }

        // Calculate formatted funding value
        const formattedFunding = matchedProject.funding
          ? typeof matchedProject.funding === "number"
            ? matchedProject.funding >= 1000000000
              ? `$${(matchedProject.funding / 1000000000).toFixed(1)}B`
              : matchedProject.funding >= 1000000
              ? `$${(matchedProject.funding / 1000000).toFixed(1)}M`
              : matchedProject.funding >= 1000
              ? `$${(matchedProject.funding / 1000).toFixed(1)}K`
              : `$${matchedProject.funding}`
            : String(matchedProject.funding)
          : "";

        // Store original project JSON for comparison
        originalProjectJsonRef.current = {
          id: matchedProject.id,
          name: matchedProject.name,
          description: matchedProject.description || "",
          founded: matchedProject.founded ?? null,
          funding: matchedProject.funding ?? null,
          links: matchedProject.links || {},
        };

        // Store original category/subcategory
        if (foundCategoryId && foundSubcategoryName) {
          originalCategoryRef.current = {
            categoryId: foundCategoryId,
            subcategoryName: foundSubcategoryName,
          };
        }

        // Store original values after a delay to ensure all form values are set
        // Wait for category/subcategory to be set as well (200ms + buffer)
        // Capture the actual form values after they're all set
        setTimeout(() => {
          // Get the actual current form values to ensure we capture exactly what was set
          const currentFormValues = getValues();
          const originalValues: Partial<ProjectFormData> = {
            name: currentFormValues.name || "",
            description: currentFormValues.description || "",
            founded: currentFormValues.founded || "",
            raised: currentFormValues.raised || "",
            website: currentFormValues.website || "",
            logo: currentFormValues.logo || "",
            twitter: currentFormValues.twitter || "",
            github: currentFormValues.github || "",
            categoryId: currentFormValues.categoryId || "",
            subcategoryName: currentFormValues.subcategoryName || "",
            location: currentFormValues.location || "", // Location might be empty, that's fine
          };
          originalAutoFilledValuesRef.current = originalValues;
          setIsAutoFilling(false);
        }, 400);

        toast.success(`Found existing project: ${matchedProject.name}.`, {
          duration: 4000,
        });
      }

      searchTimeoutRef.current = null;
    }, 1000);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [open, watchProjectName, categoryData, setValue, isAutoFilling]);

  // Update categoryData when categories are loaded
  useEffect(() => {
    if (categories) {
      setCategoryData(categories);
    }
  }, [categories]);

  // Update logo preview when URL changes
  useEffect(() => {
    if (watchLogoUrl) {
      setLogoPreview(normalizeLogoUrl(watchLogoUrl));
    }
  }, [watchLogoUrl]);

  // Set initial values when modal opens with initial values (only once)
  useEffect(() => {
    if (open && initialValues.categoryId && !initialValuesApplied) {
      // Use categoryData if available, otherwise use categories directly
      const dataToUse =
        categoryData.length > 0 ? categoryData : categories || [];

      if (dataToUse.length > 0) {
        // Check if the category exists
        const categoryExists = dataToUse.some(
          (cat) => cat.id === initialValues.categoryId
        );
        if (categoryExists) {
          setValue("categoryId", initialValues.categoryId);
          setInitialValuesApplied(true);
          if (initialValues.subcategoryName) {
            // Use a small delay to ensure category is set first
            const timer = setTimeout(() => {
              setValue("subcategoryName", initialValues.subcategoryName!);
            }, 100);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [
    open,
    initialValues.categoryId,
    initialValues.subcategoryName,
    categoryData,
    categories,
    setValue,
    initialValuesApplied,
  ]);

  // Update selected category when category changes
  useEffect(() => {
    if (watchCategoryId && categoryData.length > 0) {
      const category = categoryData.find((cat) => cat.id === watchCategoryId);
      setSelectedCategory(category || null);
      // Only clear subcategory if we're not setting an initial value and not auto-filling
      if (
        !initialValues.subcategoryName ||
        watchCategoryId !== initialValues.categoryId
      ) {
        // Don't clear if we're currently auto-filling or if subcategory is already set
        if (!isAutoFilling && !watchSubcategoryName) {
          setValue("subcategoryName", "");
          setSelectedSubcategory(null);
        }
      }
    }
  }, [
    watchCategoryId,
    categoryData,
    setValue,
    initialValues,
    isAutoFilling,
    watchSubcategoryName,
  ]);

  // Update selected subcategory
  useEffect(() => {
    if (selectedCategory && watchSubcategoryName) {
      const subcat = selectedCategory.subcategories.find(
        (sub) => sub.name === watchSubcategoryName
      );
      setSelectedSubcategory(subcat || null);
    }
  }, [selectedCategory, watchSubcategoryName]);

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const newCategory: Category = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, "-"),
      name: newCategoryName,
      subcategories: [],
    };

    setCategoryData([...categoryData, newCategory]);
    setValue("categoryId", newCategory.id);
    setNewCategoryName("");
    setNewCategoryDialog(false);
    toast.success("Category added successfully");
  };

  const handleAddNewSubcategory = () => {
    if (!selectedCategory) {
      toast.error("Please select a category first");
      return;
    }
    if (!newSubcategoryName.trim()) {
      toast.error("Please enter a subcategory name");
      return;
    }

    const newSubcategory: Subcategory = {
      name: newSubcategoryName,
      projects: [],
    };

    const updatedCategories = categoryData.map((cat) => {
      if (cat.id === selectedCategory.id) {
        return {
          ...cat,
          subcategories: [...cat.subcategories, newSubcategory],
        };
      }
      return cat;
    });

    setCategoryData(updatedCategories);
    setValue("subcategoryName", newSubcategoryName);
    setNewSubcategoryName("");
    setNewSubcategoryDialog(false);
    toast.success("Subcategory added successfully");
  };

  // Helper function to convert string to kebab-case
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Helper function to parse funding value
  const parseFunding = (value?: string): number | string | null => {
    if (!value || !value.trim()) return null;
    // Try to extract number from strings like "$10M", "$1.5B", etc.
    const numberMatch = value.match(/[\d.]+/);
    if (numberMatch) {
      const num = parseFloat(numberMatch[0]);
      if (value.toUpperCase().includes("B")) return num * 1000000000;
      if (value.toUpperCase().includes("M")) return num * 1000000;
      if (value.toUpperCase().includes("K")) return num * 1000;
      return num;
    }
    // If it's a funding round like "Series A", return as string
    return value;
  };

  // Helper function to parse founded year
  const parseFounded = (value?: string): number | null => {
    if (!value || !value.trim()) return null;
    const year = parseInt(value, 10);
    return isNaN(year) ? null : year;
  };

  // Helper function to check if form has changed from original auto-filled values
  const hasFormChanged = (): boolean => {
    const original = originalAutoFilledValuesRef.current;
    // If no original values yet, consider form as unchanged (button stays disabled)
    if (!original) return false;

    // Normalize values for comparison (trim and handle empty strings)
    const normalize = (val: string | undefined | null): string => {
      return (val || "").trim();
    };

    // Compare all fields using current form values from watch()
    const current = allFormValues;

    // Compare each field - return true if any field has changed
    // Handle undefined/null values by using || '' to ensure comparison works
    if (normalize(current.name || "") !== normalize(original.name || ""))
      return true;
    if (
      normalize(current.description || "") !==
      normalize(original.description || "")
    )
      return true;
    if (normalize(current.founded || "") !== normalize(original.founded || ""))
      return true;
    if (normalize(current.raised || "") !== normalize(original.raised || ""))
      return true;
    if (normalize(current.website || "") !== normalize(original.website || ""))
      return true;
    if (normalize(current.logo || "") !== normalize(original.logo || ""))
      return true;
    if (normalize(current.twitter || "") !== normalize(original.twitter || ""))
      return true;
    if (normalize(current.github || "") !== normalize(original.github || ""))
      return true;
    if (
      normalize(current.categoryId || "") !==
      normalize(original.categoryId || "")
    )
      return true;
    if (
      normalize(current.subcategoryName || "") !==
      normalize(original.subcategoryName || "")
    )
      return true;
    // Include location in comparison
    if (
      normalize(current.location || "") !== normalize(original.location || "")
    )
      return true;

    return false;
  };

  // Check if we're in update mode
  const isUpdateMode =
    lastAutoFilledProjectNameRef.current ===
    (watchProjectName?.trim().toLowerCase() || "");

  // Check if form has changed (only relevant in update mode)
  // In update mode: disabled if no changes, enabled if changes
  const formHasChanged = hasFormChanged();

  // Button should be disabled if:
  // - We're in update mode AND form hasn't changed
  const shouldDisableButton = isUpdateMode && !formHasChanged;

  const onSubmit = (data: ProjectFormData) => {
    // Generate project ID from name
    const projectId = slugify(data.name);

    // Check if we're updating an existing project (was auto-filled)
    const normalizedName = data.name.trim().toLowerCase();
    const isUpdate = lastAutoFilledProjectNameRef.current === normalizedName;

    // Build project JSON
    const projectJson = {
      id: projectId,
      name: data.name,
      description: data.description || "",
      founded: parseFounded(data.founded),
      funding: parseFunding(data.raised),
      links: {
        ...(data.website && { homepage: data.website }),
        ...(data.logo && { logo: normalizeLogoUrl(data.logo) }),
        ...(data.twitter && { twitter: data.twitter }),
        ...(data.github && { github: data.github }),
      },
    };

    // Build map JSON snippet
    const selectedCategoryObj = categoryData.find(
      (cat) => cat.id === data.categoryId
    );
    const sectorName = selectedCategoryObj?.name || data.categoryId;
    const typeName = data.subcategoryName;
    const typeId = slugify(typeName);

    // Build GitHub issue URL
    const title = encodeURIComponent(
      isUpdate ? `Update Project: ${data.name}` : `Add Project: ${data.name}`
    );
    const labels = encodeURIComponent(
      isUpdate ? "project:update" : "project:add"
    );

    let body = "";

    if (isUpdate && originalProjectJsonRef.current) {
      // Generate diff for update
      const original = originalProjectJsonRef.current;
      const changes: string[] = [];

      // Compare project fields (skip name as it shouldn't change in update mode)
      if (projectJson.description !== original.description) {
        changes.push(
          `- **Description**: "${original.description}" → "${projectJson.description}"`
        );
      }
      if (projectJson.founded !== original.founded) {
        changes.push(
          `- **Founded**: ${original.founded ?? "null"} → ${
            projectJson.founded ?? "null"
          }`
        );
      }
      if (
        JSON.stringify(projectJson.funding) !== JSON.stringify(original.funding)
      ) {
        changes.push(
          `- **Funding**: ${JSON.stringify(
            original.funding
          )} → ${JSON.stringify(projectJson.funding)}`
        );
      }

      // Compare links - only show if actually changed
      const originalLinks: any = original.links || {};
      const newLinks: any = projectJson.links || {};

      // Normalize logo URLs for comparison (remove domain prefix for comparison)
      const normalizeLogoForComparison = (url: string | undefined): string => {
        if (!url) return "";
        // Remove https://buildermaps.io prefix if present for comparison
        return url.replace(/^https:\/\/buildermaps\.io/, "").trim();
      };

      const originalHomepage = (originalLinks.homepage || "").trim();
      const newHomepage = (newLinks.homepage || "").trim();
      if (
        originalHomepage !== newHomepage &&
        !(originalHomepage === "" && newHomepage === "")
      ) {
        changes.push(
          `- **Homepage**: "${originalHomepage || "(empty)"}" → "${
            newHomepage || "(empty)"
          }"`
        );
      }

      const originalLogo = normalizeLogoForComparison(originalLinks.logo);
      const newLogo = normalizeLogoForComparison(newLinks.logo);
      if (
        originalLogo !== newLogo &&
        !(originalLogo === "" && newLogo === "")
      ) {
        // Remove https://buildermaps.io prefix for display in issue
        const displayOriginalLogo = originalLinks.logo
          ? originalLinks.logo.replace(/^https:\/\/buildermaps\.io/, "")
          : "(empty)";
        const displayNewLogo = newLinks.logo
          ? newLinks.logo.replace(/^https:\/\/buildermaps\.io/, "")
          : "(empty)";
        changes.push(
          `- **Logo**: "${displayOriginalLogo}" → "${displayNewLogo}"`
        );
      }

      const originalTwitter = (originalLinks.twitter || "").trim();
      const newTwitter = (newLinks.twitter || "").trim();
      if (
        originalTwitter !== newTwitter &&
        !(originalTwitter === "" && newTwitter === "")
      ) {
        changes.push(
          `- **Twitter**: "${originalTwitter || "(empty)"}" → "${
            newTwitter || "(empty)"
          }"`
        );
      }

      const originalGithub = (originalLinks.github || "").trim();
      const newGithub = (newLinks.github || "").trim();
      if (
        originalGithub !== newGithub &&
        !(originalGithub === "" && newGithub === "")
      ) {
        changes.push(
          `- **GitHub**: "${originalGithub || "(empty)"}" → "${
            newGithub || "(empty)"
          }"`
        );
      }

      // Compare location (stored in form values, not in project JSON)
      const originalValues = originalAutoFilledValuesRef.current;
      if (originalValues) {
        const originalLocation = (originalValues.location || "").trim();
        const newLocation = (data.location || "").trim();
        if (
          originalLocation !== newLocation &&
          !(originalLocation === "" && newLocation === "")
        ) {
          changes.push(
            `- **Location**: "${originalLocation || "(empty)"}" → "${
              newLocation || "(empty)"
            }"`
          );
        }
      }

      // Compare category/subcategory
      const originalCategory = originalCategoryRef.current;
      if (originalCategory) {
        if (data.categoryId !== originalCategory.categoryId) {
          const oldCategory = categoryData.find(
            (cat) => cat.id === originalCategory.categoryId
          );
          const newCategory = categoryData.find(
            (cat) => cat.id === data.categoryId
          );
          changes.push(
            `- **Category**: "${
              oldCategory?.name || originalCategory.categoryId
            }" → "${newCategory?.name || data.categoryId}"`
          );
        }
        if (data.subcategoryName !== originalCategory.subcategoryName) {
          changes.push(
            `- **Subcategory**: "${originalCategory.subcategoryName}" → "${data.subcategoryName}"`
          );
        }
      }

      body = `Please review the following changes to the project:

## Changes Made

${
  changes.length > 0
    ? changes.join("\n")
    : "- No changes detected (please verify manually)"
}

Thank you for your time.
`;
    } else {
      // Original add project flow
      body = `Please paste or review the complete project JSON below. The \`id\` must be kebab-case and match the filename in \`public/data/projects/\`.

\`\`\`json
${JSON.stringify(projectJson, null, 2)}
\`\`\`

Step 2: Please add this project to the appropriate sector and type map. Find the map file \`public/data/maps/${slugify(
        sectorName
      )}.json\` and add \`"${projectId}"\` to the \`projects\` array of the type with \`id: "${typeId}"\` (name: "${typeName}").

Example - add \`"${projectId}"\` to the projects array:

\`\`\`json
{
  "sector": "${sectorName}",
  "types": [
    {
      "id": "${typeId}",
      "name": "${typeName}",
      "projects": [
        "${projectId}",
        "existing-project-1",
        "existing-project-2"
      ]
    }
  ]
}
\`\`\`
`;
    }

    const encodedBody = encodeURIComponent(body);

    const githubUrl = `https://github.com/chainbase-labs/buildermaps.io/issues/new?title=${title}&labels=${labels}&body=${encodedBody}`;

    // Open GitHub issue in new tab
    window.open(githubUrl, "_blank");

    toast.success("Opening GitHub issue...", {
      duration: 3000,
    });
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="submit-project-modal-title"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
        zIndex: 1300,
      }}
      disablePortal={false}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "90vh",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            id="submit-project-modal-title"
            variant="h6"
            component="h2"
          >
            Submit Project
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              color: "text.secondary",
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content - Scrollable */}
        <Box
          sx={{
            overflowY: "auto",
            flex: 1,
            p: 0,
          }}
        >
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <Typography color="text.secondary">
                Loading categories...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1, mb: 2 }}>
              <Typography color="error.dark">
                Failed to load categories. Please try again later.
              </Typography>
            </Box>
          )}

          {categories && (
            <div>
              <CardHeader className="pb-6">
                <CardTitle>Project Information</CardTitle>
                <CardDescription>
                  Please fill in all required fields. Your submission will be
                  reviewed before being added to the map.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Logo URL Section */}
                  <div className="space-y-2">
                    <Label htmlFor="logo">Project Logo URL</Label>
                    <Input
                      {...register("logo")}
                      placeholder="https://example.com/logo.png"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Enter the URL of your logo image
                    </p>
                    {logoPreview && (
                      <div className="mt-3 p-4 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="max-h-20 max-w-[200px] object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name *</Label>
                      <Input
                        {...register("name", {
                          required: "Project name is required",
                        })}
                        placeholder="e.g., Circle"
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        {...register("location")}
                        placeholder="e.g., United States"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      {...register("description", {
                        required: "Description is required",
                      })}
                      placeholder="Describe your project in a few sentences..."
                      rows={4}
                      className={errors.description ? "border-red-500" : ""}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-600">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="founded">Founded Year</Label>
                      <Input
                        {...register("founded")}
                        placeholder="e.g., 2020"
                        type="text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="raised">Funding Raised</Label>
                      <Input
                        {...register("raised")}
                        placeholder="e.g., $10M"
                        type="text"
                      />
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <h3 className="text-sm text-gray-900">Categories *</h3>

                    {/* Primary Category */}
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Primary Category *</Label>
                      <Select
                        value={watch("categoryId") || ""}
                        onValueChange={(value) => setValue("categoryId", value)}
                        disabled={lockCategory}
                      >
                        <SelectTrigger
                          className={errors.categoryId ? "border-red-500" : ""}
                          disabled={lockCategory}
                        >
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {categoryData.length > 0 ? (
                            categoryData.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Loading categories...
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <input
                        type="hidden"
                        {...register("categoryId", {
                          required: "Primary category is required",
                        })}
                      />
                      {errors.categoryId && (
                        <p className="text-xs text-red-600">
                          {errors.categoryId.message}
                        </p>
                      )}
                    </div>

                    {/* Secondary Category */}
                    {selectedCategory && (
                      <div className="space-y-2">
                        <Label htmlFor="subcategoryName">
                          Secondary Category *
                        </Label>
                        <Select
                          value={watch("subcategoryName") || ""}
                          onValueChange={(value) =>
                            setValue("subcategoryName", value)
                          }
                        >
                          <SelectTrigger
                            className={
                              errors.subcategoryName ? "border-red-500" : ""
                            }
                          >
                            <SelectValue placeholder="Select a subcategory" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            {selectedCategory.subcategories.map((subcat) => (
                              <SelectItem key={subcat.name} value={subcat.name}>
                                {subcat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input
                          type="hidden"
                          {...register("subcategoryName", {
                            required: "Secondary category is required",
                          })}
                        />
                        {errors.subcategoryName && (
                          <p className="text-xs text-red-600">
                            {errors.subcategoryName.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  <div className="space-y-4">
                    <h3 className="text-sm text-gray-900">Links</h3>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Input
                          {...register("website")}
                          placeholder="https://example.com"
                          type="url"
                          className="pl-8"
                        />
                        <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter">X (Twitter)</Label>
                      <div className="relative">
                        <Input
                          {...register("twitter")}
                          placeholder="https://x.com/username"
                          type="url"
                          className="pl-8"
                        />
                        <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub</Label>
                      <div className="relative">
                        <Input
                          {...register("github")}
                          placeholder="https://github.com/username"
                          type="url"
                          className="pl-8"
                        />
                        <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={shouldDisableButton}
                    >
                      {isUpdateMode ? "Update Project" : "Submit Project"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
