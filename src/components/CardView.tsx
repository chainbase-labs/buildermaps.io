import { useState } from "react";
import { Building2, Globe, Github, Linkedin, Twitter } from "lucide-react";
import { FaTelegram, FaDiscord, FaReddit } from "react-icons/fa";
import { SiMedium } from "react-icons/si";

import type { Category, Project } from "../lib/category-utils";
import { sortProjects } from "../lib/category-utils";
import {
  getProductionImageUrl,
  getLocalhostFallback,
} from "../utils/image-fallback";

interface CardViewProps {
  category: Category;
}

export function CardView({ category }: CardViewProps) {
  const groups = category.subcategories.map((subcategory) => {
    return {
      title: subcategory.name,
      sections: [
        {
          heading: undefined,
          projects: subcategory.projects,
        },
      ],
    };
  });

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.title} className="space-y-5">
          <div className="border-l-4 border-blue-500 bg-blue-50/80 px-5 py-3">
            <h3 className="text-sm text-blue-900 linux-libertine">
              {group.title}
            </h3>
          </div>
          <div className="space-y-8">
            {group.sections.map((section) => (
              <div key={section.heading ?? "default"}>
                {section.heading && (
                  <div className="mb-4 inline-block rounded bg-gray-100 px-3 py-1 text-xs text-gray-800">
                    {section.heading}
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sortProjects(section.projects).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      categoryName={category.name}
                      subcategoryName={group.title}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
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
    <div className="flex flex-col overflow-hidden rounded-sm border border-gray-300 bg-white transition-all hover:border-blue-400 hover:shadow-lg">
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-sm border-2 border-gray-200 bg-white shadow-sm">
            {project.logoUrl && !logoFailed ? (
              <img
                src={getProductionImageUrl(project.logoUrl)}
                alt={project.name}
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  const fallback = getLocalhostFallback(project.logoUrl || "");
                  const attempted = img.dataset.localFallbackAttempted === "1";

                  if (!attempted && fallback && img.src !== fallback) {
                    img.dataset.localFallbackAttempted = "1";
                    img.src = fallback;
                    return;
                  }

                  // Stop retry loop: render icon instead of <img>
                  setLogoFailed(true);
                }}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-gray-100">
                <Building2 className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="mb-1.5 line-clamp-2 text-base leading-tight">
              {project.name}
            </h4>
            <div className="flex items-center gap-3">
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
        <p className="mb-3 line-clamp-4 text-xs leading-relaxed text-gray-700">
          {project.description}
        </p>
        <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
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
        <div className="mb-3 flex flex-wrap gap-1">
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
            {categoryName}
          </span>
          <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
            {subcategoryName}
          </span>
        </div>
      </div>
    </div>
  );
}
