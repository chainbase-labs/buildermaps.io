import { useMemo, useRef, useState } from "react";
import {
  Building2,
  Globe,
  Github,
  Twitter,
  Linkedin,
  Download,
} from "lucide-react";
import { FaTelegram, FaDiscord, FaReddit } from "react-icons/fa";
import { SiMedium } from "react-icons/si";
import * as htmlToImage from "html-to-image";

import type { Category, Project, Subcategory } from "../lib/category-utils";
import { countSubcategoryProjects, sortProjects } from "../lib/category-utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  getProductionImageUrl,
  getLocalhostFallback,
} from "../utils/image-fallback";

// Used by html-to-image when any logo URL fails (e.g. temporary 404 from third-party hosts).
const EXPORT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Ccircle cx='28' cy='28' r='27' fill='%23f3f4f6' stroke='%23d1d5db'/%3E%3Crect x='17' y='22' width='22' height='16' rx='3' fill='%239ca3af'/%3E%3C/svg%3E";

// Threshold for project count below which flex-wrap is disabled to prevent overflow
const PROJECT_WRAP_THRESHOLD = 5;

interface LandscapeViewProps {
  category: Category;
  exportRef?: React.RefObject<HTMLDivElement>;
}

export function LandscapeView({ category, exportRef }: LandscapeViewProps) {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const subcatRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setSubcatRef = (key: string) => (el: HTMLDivElement | null) => {
    subcatRefs.current[key] = el;
  };

  // Create internal ref if exportRef is not provided
  const internalExportRef = useRef<HTMLDivElement>(null);
  const mapExportRef = exportRef || internalExportRef;

  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [hoveredSubcategoryKey, setHoveredSubcategoryKey] = useState<
    string | null
  >(null);
  const [exportingWholeMap, setExportingWholeMap] = useState(false);
  const [hoveredMapBox, setHoveredMapBox] = useState(false);

  const waitForExportImages = async (container: HTMLElement) => {
    const images = container.querySelectorAll("img");
    if (images.length === 0) return;

    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            let settled = false;
            const done = () => {
              if (settled) return;
              settled = true;
              resolve();
            };

            const decodeAndDone = () => {
              if (typeof img.decode === "function") {
                img.decode().catch(() => undefined).finally(done);
                return;
              }
              done();
            };

            if (img.complete && img.naturalWidth > 0) {
              decodeAndDone();
              return;
            }

            // Whole-map exports include many logos; allow longer for slower image loads.
            const timeout = setTimeout(done, 10000);
            img.onload = () => {
              clearTimeout(timeout);
              decodeAndDone();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              done();
            };
          })
      )
    );
  };

  const sortedSubcategories = useMemo(() => {
    return [...category.subcategories].sort(
      (a, b) => countSubcategoryProjects(b) - countSubcategoryProjects(a)
    );
  }, [category.subcategories]);
  async function exportSubcategoryPng(subcategory: Subcategory) {
    const key = `${category.name}__${subcategory.name}`;
    const node = subcatRefs.current[key];
    if (!node) return;

    try {
      setOpenPopoverId(null);
      setExportingKey(key);

      await new Promise((r) => requestAnimationFrame(r));

      // Get computed styles and dimensions from the original node
      const computedStyle = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();

      // Create an off-screen container for cloning (visible but positioned off-screen)
      const invisibleContainer = document.createElement("div");
      invisibleContainer.setAttribute("data-export-container", "true");
      invisibleContainer.style.position = "fixed";
      invisibleContainer.style.left = "-9999px";
      invisibleContainer.style.top = "0";
      invisibleContainer.style.width = `${rect.width}px`;
      invisibleContainer.style.height = "auto"; // Allow container to expand for footer
      invisibleContainer.style.minHeight = `${rect.height}px`;
      invisibleContainer.style.overflow = "visible";
      invisibleContainer.style.pointerEvents = "none";
      invisibleContainer.style.zIndex = "-9999";
      invisibleContainer.style.visibility = "visible";
      invisibleContainer.style.opacity = "1";
      invisibleContainer.style.backgroundColor = "#ffffff";
      document.body.appendChild(invisibleContainer);

      // Clone the entire element (not just its children)
      const clonedNode = node.cloneNode(true) as HTMLDivElement;

      // Copy computed styles to the clone
      clonedNode.style.width = `${rect.width}px`;
      clonedNode.style.height = "auto"; // Allow height to expand for footer
      clonedNode.style.minHeight = `${rect.height}px`;
      clonedNode.style.position = "relative";
      clonedNode.style.visibility = "visible";
      clonedNode.style.opacity = "1";

      // Hide the export button in the clone
      const exportButton = clonedNode.querySelector(
        "button[data-export-button]"
      ) as HTMLButtonElement | null;
      if (exportButton) {
        exportButton.style.display = "none";
      }

      // Update the subcategory title to include category name
      const subcategoryTitle = clonedNode.querySelector("h3");
      if (subcategoryTitle) {
        subcategoryTitle.textContent = `${category.name} Ecosystem Map - ${subcategory.name}`;
      }

      // Ensure inner content div doesn't have overflow constraints
      const innerContentDiv = clonedNode.querySelector(
        'div[class*="border"]'
      ) as HTMLDivElement | null;
      if (innerContentDiv) {
        innerContentDiv.style.overflow = "visible";
        innerContentDiv.style.height = "auto";
      }

      // Add watermark to the clone
      const watermark = document.createElement("div");
      watermark.innerText = "BuilderMaps.io";
      watermark.style.position = "absolute";
      watermark.style.inset = "0";
      watermark.style.display = "flex";
      watermark.style.alignItems = "center";
      watermark.style.justifyContent = "center";
      watermark.style.pointerEvents = "none";
      watermark.style.userSelect = "none";
      watermark.style.fontSize = "64px";
      watermark.style.fontWeight = "700";
      watermark.style.opacity = "0.08";
      watermark.style.transform = "rotate(-12deg)";
      watermark.style.color = "#000";
      watermark.style.zIndex = "50";

      clonedNode.appendChild(watermark);

      // Add footer to the innerContentDiv
      if (innerContentDiv) {
        const formatDate = () => {
          const today = new Date();
          const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const month = months[today.getMonth()];
          const day = today.getDate();
          const year = today.getFullYear();
          return `${month} ${day},${year}`;
        };

        const footer = document.createElement("footer");
        footer.style.paddingTop = "1rem";
        footer.style.paddingBottom = "1rem";
        footer.style.width = "100%";
        footer.style.position = "relative";
        footer.style.zIndex = "10";

        const footerContainer = document.createElement("div");
        footerContainer.style.maxWidth = "100%";
        footerContainer.style.marginLeft = "auto";
        footerContainer.style.marginRight = "auto";
        footerContainer.style.paddingLeft = "1rem";
        footerContainer.style.paddingRight = "1rem";

        const footerGrid = document.createElement("div");
        footerGrid.style.display = "grid";
        footerGrid.style.gridTemplateColumns = "auto 1fr 1fr"; // Date shrinks, Source and Disclaimer share remaining space
        footerGrid.style.gap = "1rem";
        footerGrid.style.fontSize = "0.875rem";
        footerGrid.style.color = "#4b5563";
        footerGrid.style.paddingTop = "0.5rem";

        // Date
        const dateDiv = document.createElement("div");
        dateDiv.style.textAlign = "left";
        dateDiv.style.whiteSpace = "nowrap";
        dateDiv.textContent = `Date: ${formatDate()}`;

        // Source
        const sourceDiv = document.createElement("div");
        sourceDiv.style.textAlign = "center";
        sourceDiv.style.whiteSpace = "nowrap";
        const sourceText = document.createTextNode("Source: buildermaps.io ");
        const sourceLink = document.createElement("a");
        sourceLink.href = "https://x.com/ChainbaseHQ";
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        sourceLink.style.color = "#2563eb";
        sourceLink.style.textDecoration = "none";
        sourceLink.textContent = "@ChainbaseHQ";
        sourceDiv.appendChild(sourceText);
        sourceDiv.appendChild(sourceLink);

        // Disclaimer
        const disclaimerDiv = document.createElement("div");
        disclaimerDiv.style.textAlign = "right";
        disclaimerDiv.style.whiteSpace = "nowrap";
        disclaimerDiv.textContent = "Disclaimer: Listed ≠ endorsement. DYOR.";

        footerGrid.appendChild(dateDiv);
        footerGrid.appendChild(sourceDiv);
        footerGrid.appendChild(disclaimerDiv);
        footerContainer.appendChild(footerGrid);
        footer.appendChild(footerContainer);

        innerContentDiv.appendChild(footer);
      }

      // Append the clone to the container
      invisibleContainer.appendChild(clonedNode);

      // Wait for the clone to be rendered and images to load
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 200));

      // Wait for footer to be fully rendered, then check width and adjust layout
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 100));

      // Check if footer needs vertical layout (if width is too narrow)
      if (innerContentDiv) {
        const footerGrid = innerContentDiv.querySelector(
          'footer > div > div[style*="grid"]'
        ) as HTMLDivElement | null;
        if (footerGrid) {
          const footerRect = footerGrid.getBoundingClientRect();
          const dateDiv = footerGrid.children[0] as HTMLElement;
          const sourceDiv = footerGrid.children[1] as HTMLElement;
          const disclaimerDiv = footerGrid.children[2] as HTMLElement;

          // Estimate minimum width needed (rough estimate: ~600px for 3 columns)
          const minWidthForHorizontal = 600;

          if (footerRect.width < minWidthForHorizontal) {
            // Switch to vertical layout
            footerGrid.style.gridTemplateColumns = "1fr";
            footerGrid.style.gap = "0.5rem";
            dateDiv.style.textAlign = "left";
            sourceDiv.style.textAlign = "left";
            disclaimerDiv.style.textAlign = "left";
          }
        }
      }

      // Wait for all images in the clone to load at full resolution
      await waitForExportImages(clonedNode);

      // Additional wait to ensure everything is fully rendered
      await new Promise((r) => setTimeout(r, 100));

      // Get the final height including footer and update container
      const finalRect = clonedNode.getBoundingClientRect();
      clonedNode.style.height = `${finalRect.height}px`;
      invisibleContainer.style.height = `${finalRect.height}px`;

      // Use higher pixel ratio for better image quality (3-4x for crisp images)
      const basePixelRatio = window.devicePixelRatio || 1;
      const pixelRatio = Math.min(4, Math.max(3, basePixelRatio * 2));

      // Export the cloned node which now includes the footer
      const dataUrl = await htmlToImage.toPng(clonedNode, {
        cacheBust: false,
        backgroundColor: "#ffffff",
        pixelRatio: pixelRatio,
        imagePlaceholder: EXPORT_IMAGE_PLACEHOLDER,
      });

      const safe = (s: string) =>
        s.replace(/[\/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${safe(category.name)}-${safe(subcategory.name)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up: remove the invisible container and clone
      invisibleContainer.remove();
      setExportingKey(null);
    } catch (err) {
      console.error("Export failed:", err);
      // Clean up container in case of error
      const container = document.querySelector("[data-export-container]");
      if (container) {
        container.remove();
      }
      setExportingKey(null);
    }
  }

  const exportWholeMap = async () => {
    console.log("exportWholeMap called");
    const node = mapExportRef.current;
    if (!node) {
      console.error("Export ref is not available");
      return;
    }
    console.log("Node found, starting export");

    try {
      setExportingWholeMap(true);

      await new Promise((r) => requestAnimationFrame(r));

      // Get computed styles and dimensions from the original node
      const rect = node.getBoundingClientRect();

      // Create an off-screen container for cloning (visible but positioned off-screen)
      const invisibleContainer = document.createElement("div");
      invisibleContainer.setAttribute("data-export-container", "true");
      invisibleContainer.style.position = "fixed";
      invisibleContainer.style.left = "-9999px";
      invisibleContainer.style.top = "0";
      invisibleContainer.style.width = `${rect.width}px`;
      invisibleContainer.style.height = "auto";
      invisibleContainer.style.minHeight = `${rect.height}px`;
      invisibleContainer.style.overflow = "visible";
      invisibleContainer.style.pointerEvents = "none";
      invisibleContainer.style.zIndex = "-9999";
      invisibleContainer.style.visibility = "visible";
      invisibleContainer.style.opacity = "1";
      invisibleContainer.style.backgroundColor = "#ffffff";
      document.body.appendChild(invisibleContainer);

      // Clone the entire element (not just its children)
      const clonedNode = node.cloneNode(true) as HTMLDivElement;

      // Copy computed styles to the clone
      clonedNode.style.width = `${rect.width}px`;
      clonedNode.style.height = "auto";
      clonedNode.style.minHeight = `${rect.height}px`;
      clonedNode.style.position = "relative";
      clonedNode.style.visibility = "visible";
      clonedNode.style.opacity = "1";

      // Hide all export buttons in the clone (both subcategory and main map export buttons)
      const exportButtons = clonedNode.querySelectorAll(
        "button[data-export-button], button[data-export-whole-map-button]"
      );
      exportButtons.forEach((button) => {
        (button as HTMLElement).style.display = "none";
      });

      // Append the clone to the container
      invisibleContainer.appendChild(clonedNode);

      // Wait for the clone to be rendered
      // Two frames needed: first for DOM insertion, second for layout calculation
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      // Fix subcategory boxes to maintain their layout during export
      // Find all subcategory boxes using the data attribute
      const subcategoryBoxes = clonedNode.querySelectorAll(
        "[data-subcategory-box]"
      );
      subcategoryBoxes.forEach((box) => {
        const htmlBox = box as HTMLElement;
        // Get the computed dimensions to lock them in
        const boxRect = htmlBox.getBoundingClientRect();
        if (boxRect.width > 0 && boxRect.height > 0) {
          htmlBox.style.width = `${boxRect.width}px`;
          htmlBox.style.minHeight = `${boxRect.height}px`;
          // Keep title badges visible above borders
          htmlBox.style.overflow = "visible";
        }
      });

      // Wait for layout to settle after dimension fixes
      // 200ms allows browser to complete reflow and repaint
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 200));

      // Wait for all images in the clone to load at full resolution
      await waitForExportImages(clonedNode);

      // Additional wait to ensure everything is fully rendered
      await new Promise((r) => setTimeout(r, 100));

      // Use higher pixel ratio for better image quality (3-4x for crisp images)
      const basePixelRatio = window.devicePixelRatio || 1;
      const pixelRatio = Math.min(4, Math.max(3, basePixelRatio * 2));

      const dataUrl = await htmlToImage.toPng(clonedNode, {
        cacheBust: false,
        backgroundColor: "#ffffff",
        pixelRatio: pixelRatio,
        imagePlaceholder: EXPORT_IMAGE_PLACEHOLDER,
      });

      const safe = (s: string) =>
        s.replace(/[\/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${safe(category.name)}-Ecosystem-Map.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up: remove the invisible container and clone
      invisibleContainer.remove();
      setExportingWholeMap(false);
    } catch (err) {
      console.error("Export failed:", err);
      // Clean up container in case of error
      const container = document.querySelector("[data-export-container]");
      if (container) {
        container.remove();
      }
      setExportingWholeMap(false);
    }
  };

  const subcategoryItems = sortedSubcategories.map(
    (subcategory, sortIndex) => ({
      subcategory,
      sortIndex,
      projectCount: countSubcategoryProjects(subcategory),
    })
  );

  const renderSubcategoryCard = (
    subcategory: Subcategory,
    background: string
  ) => {
    const refKey = `${category.name}__${subcategory.name}`;
    const isExporting = exportingKey === refKey;
    const isHovered = hoveredSubcategoryKey === refKey;
    const projectCount = countSubcategoryProjects(subcategory);
    const maxWidthClass =
      projectCount > 20
        ? "max-w-full"
        : projectCount > 9
        ? "max-w-[50%]"
        : "max-w-[70%]";
    const wrapClass =
      projectCount < PROJECT_WRAP_THRESHOLD ? "flex-nowrap" : "flex-wrap";

    return (
      <div
        key={refKey}
        ref={setSubcatRef(refKey)}
        className={`relative py-4 px-1 w-fit ${maxWidthClass} max-[568px]:max-w-full`}
        onMouseEnter={() => setHoveredSubcategoryKey(refKey)}
        onMouseLeave={() => setHoveredSubcategoryKey(null)}
      >
        <div
          data-subcategory-box
          className={`relative border border-black rounded ${background} px-1 pb-2 pt-7 max-[968px]:col-span-12 max-[568px]:px-2 max-[568px]:pb-1 inline-block w-fit max-w-full`}
        >
          <button
            type="button"
            data-export-button
            onClick={() => exportSubcategoryPng(subcategory)}
            disabled={isExporting || exportingWholeMap}
            style={exportingWholeMap ? { display: "none" } : undefined}
            className={`cursor-pointer absolute right-3 top-3 z-50 inline-flex items-center gap-1 rounded border border-black bg-white px-2 py-1 text-xs text-black hover:bg-gray-50 disabled:opacity-60 transition-opacity duration-200 ${
              isHovered
                ? "md:opacity-80 max-md:opacity-80"
                : "md:opacity-0 max-md:opacity-80"
            }`}
            title="Export this section"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export"}
          </button>

          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 max-[568px]:py-0.5 z-10">
            <h3 className="text-black text-sm linux-libertine text-center linux-libertine-bold whitespace-nowrap">
              {subcategory.name}
            </h3>
          </div>

          <div className={`flex ${wrapClass}`}>
            {sortProjects(subcategory.projects || []).map((project) => {
              const uniqueKey = `${project.id}-${category.name}-${subcategory.name}`;
              return (
                <ProjectLogo
                  key={uniqueKey}
                  project={project}
                  categoryName={category.name}
                  subcategoryName={subcategory.name}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={mapExportRef}
      className="relative rounded-lg border-[1.5px] border-black bg-white py-12 px-3 pb-4 shadow-lg max-[568px]:border-0 max-[568px]:w-full max-[568px]:px-3 max-[568px]:py-6"
      onMouseEnter={() => setHoveredMapBox(true)}
      onMouseLeave={() => setHoveredMapBox(false)}
    >
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="select-none text-9xl max-[568px]:text-4xl text-gray-400/20 -rotate-12">
          BuilderMaps.io
        </div>
      </div>

      {/* Export Map Button - Top Right */}
      <div className="absolute top-6 right-6 z-20 max-[568px]:top-1 max-[568px]:right-1">
        <button
          type="button"
          data-export-whole-map-button
          onClick={() => exportWholeMap()}
          disabled={exportingWholeMap}
          className={`inline-flex items-center gap-1.5 rounded border cursor-pointer border-black bg-white px-3 py-1.5 text-sm text-black hover:bg-gray-50 disabled:opacity-60 transition-opacity duration-200 max-[568px]:px-2 max-[568px]:py-1 max-[568px]:text-xs ${
            hoveredMapBox ? "md:opacity-80" : "md:opacity-0"
          } max-md:opacity-80`}
          title="Export entire ecosystem map"
        >
          <Download className="h-4 w-4 max-[568px]:h-3.5 max-[568px]:w-3.5" />
          {exportingWholeMap ? "Exporting..." : "Export Map"}
        </button>
      </div>

      <h2 className="relative z-20 mb-3 text-3xl max-[568px]:text-2xl text-black tracking-wide linux-libertine-bold font-bold text-center">
        {category.name} Ecosystem Map
      </h2>

      <div className="relative z-0 flex w-full flex-wrap gap-0">
        {subcategoryItems.map((item) => {
          const { subcategory, sortIndex } = item;
          const hasDirectProjects =
            subcategory.projects && subcategory.projects.length > 0;
          const background = hasDirectProjects
            ? "bg-white"
            : getSubcategoryStyle(sortIndex).bg;

          return renderSubcategoryCard(subcategory, background);
        })}
      </div>

      <footer className="pt-4 g-gray-50">
        <div className="container mx-auto">
          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 max-[568px]:grid-cols-1 max-[568px]:gap-3 max-[568px]:text-xs">
            <div className="text-left">Date: {formatDate()}</div>
            <div className="text-center max-[568px]:text-left">
              Source: buildermaps.io{" "}
              <a
                href="https://x.com/ChainbaseHQ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                @ChainbaseHQ
              </a>
            </div>
            <div className="text-right max-[568px]:text-left">
              Disclaimer: Listed ≠ endorsement. DYOR.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProjectLogo({
  project,
  categoryName,
  subcategoryName,
  openPopoverId,
  setOpenPopoverId,
}: {
  project: Project;
  categoryName: string;
  subcategoryName: string;
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
}) {
  // Create a unique ID for this project instance based on its location
  const uniqueId = `${project.id}-${categoryName}-${subcategoryName}`;
  const isOpen = openPopoverId === uniqueId;
  const [imageError, setImageError] = useState(false);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => setOpenPopoverId(open ? uniqueId : null)}
    >
      <PopoverTrigger asChild>
        <div
          className="group relative z-20 h-[96px] w-fit max-[568px]:h-[90px] max-[568px]:w-[90px] cursor-pointer max-[568px]:cursor-default max-[568px]:pointer-events-none"
          title={project.name}
        >
          <div
            className={`flex flex-col h-full w-full items-center justify-center px-2 py-1 transition-all ${
              isOpen
                ? "border border-blue-600 bg-blue-50/20 shadow-md"
                : "border border-transparent hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex h-[56px] w-[56px] max-[568px]:h-[50px] max-[568px]:w-[50px] items-center justify-center rounded-full">
              {project.logoUrl && !imageError ? (
                <img
                  src={getProductionImageUrl(project.logoUrl)}
                  alt={project.name}
                  className="h-full w-full object-contain rounded-full"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = getLocalhostFallback(
                      project.logoUrl || ""
                    );
                    const attempted =
                      img.dataset.localFallbackAttempted === "1";

                    if (!attempted && fallback && img.src !== fallback) {
                      img.dataset.localFallbackAttempted = "1";
                      img.src = fallback;
                      return;
                    }

                    setImageError(true);
                  }}
                />
              ) : (
                <div className="flex h-[56px] w-[56px] max-[568px]:h-[50px] max-[568px]:w-[50px] items-center justify-center rounded-full border border-gray-200 bg-gray-100">
                  <Building2 className="h-7 w-7 max-[568px]:h-6 max-[568px]:w-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="mt-1 min-h-[28px] max-[568px]:min-h-[26px] text-center text-xs font-bold leading-tight text-gray-900 transition-colors group-hover:text-blue-600 whitespace-normal break-words">
              {formatProjectName(project.name)}
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-80 border border-gray-300 p-0 shadow-lg max-[568px]:hidden"
      >
        <ProjectCard
          project={project}
          categoryName={categoryName}
          subcategoryName={subcategoryName}
        />
      </PopoverContent>
    </Popover>
  );
}

function ProjectCard({
  project,
  categoryName,
  subcategoryName,
}: {
  project: Project;
  categoryName: string;
  subcategoryName: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
          {project.logoUrl && !logoFailed ? (
            <img
              src={getProductionImageUrl(project.logoUrl)}
              alt={project.name}
              className="h-12 w-12 object-contain rounded-full"
              onError={(e) => {
                const img = e.currentTarget;
                const fallback = getLocalhostFallback(project.logoUrl || "");
                const attempted = img.dataset.localFallbackAttempted === "1";

                if (!attempted && fallback && img.src !== fallback) {
                  img.dataset.localFallbackAttempted = "1";
                  img.src = fallback;
                  return;
                }

                setLogoFailed(true);
              }}
            />
          ) : (
            <Building2 className="h-6 w-6 text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="mb-1.5 line-clamp-2 text-base leading-tight">
            {project.name}
          </h4>
          <div className="flex items-center gap-2">
            {project.homepage && (
              <a
                href={project.homepage}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="Website"
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
            {project.twitter && (
              <a
                href={project.twitter}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {project.telegram && (
              <a
                href={project.telegram}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="Telegram"
              >
                {/* @ts-expect-error - react-icons type compatibility issue with React 17 */}
                <FaTelegram className="h-4 w-4" />
              </a>
            )}
            {project.discord && (
              <a
                href={project.discord}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="Discord"
              >
                {/* @ts-expect-error - react-icons type compatibility issue with React 17 */}
                <FaDiscord className="h-4 w-4" />
              </a>
            )}
            {project.medium && (
              <a
                href={project.medium}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="Medium"
              >
                {/* @ts-expect-error - react-icons type compatibility issue with React 17 */}
                <SiMedium className="h-4 w-4" />
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {project.linkedin && (
              <a
                href={project.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {project.reddit && (
              <a
                href={project.reddit}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600"
                title="Reddit"
              >
                {/* @ts-expect-error - react-icons type compatibility issue with React 17 */}
                <FaReddit className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
      <p className="line-clamp-4 text-xs leading-relaxed text-gray-700">
        {project.description}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        {project.yearFounded && (
          <div>
            <div className="mb-0.5 text-gray-500">Founded</div>
            <div className="text-gray-900">{project.yearFounded}</div>
          </div>
        )}
        {project.totalFunding && project.totalFunding !== "N/A" && (
          <div>
            <div className="mb-0.5 text-gray-500">Total funding</div>
            <div className="text-gray-900">{project.totalFunding}</div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
          {categoryName}
        </span>
        <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
          {subcategoryName}
        </span>
      </div>
    </div>
  );
}

function getSubcategoryStyle(index: number) {
  const styles = [
    { border: "border-purple-400", bg: "bg-purple-50/60" },
    { border: "border-green-400", bg: "bg-green-50/60" },
    { border: "border-blue-400", bg: "bg-blue-50/60" },
    { border: "border-orange-400", bg: "bg-orange-50/60" },
    { border: "border-pink-400", bg: "bg-pink-50/60" },
    { border: "border-yellow-400", bg: "bg-yellow-50/60" },
    { border: "border-indigo-400", bg: "bg-indigo-50/60" },
    { border: "border-teal-400", bg: "bg-teal-50/60" },
  ];
  return styles[index % styles.length];
}

function formatDate() {
  const today = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[today.getMonth()];
  const day = today.getDate();
  const year = today.getFullYear();
  return `${month} ${day},${year}`;
}

function formatProjectName(name: string, maxLength: number = 20): string {
  // Remove parenthetical content
  let formatted = name.replace(/\s*\([^)]*\)/g, "");

  // If length exceeds maxLength, remove last word repeatedly
  while (formatted.length > maxLength) {
    const words = formatted.trim().split(/\s+/);
    if (words.length <= 1) break; // Can't remove more words
    words.pop(); // Remove last word
    formatted = words.join(" ");
  }

  return formatted;
}
