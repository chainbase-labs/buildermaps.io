import { ArrowRight, Github, Plus, Twitter } from "lucide-react";

import {
  countCategoryProjects,
  countTotalProjects,
  type Category,
} from "../lib/category-utils";
import { Button } from "./ui/button";
import { useSubmitProjectModal } from "./SubmitProjectModal";

interface HomePageProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
}

export function HomePage({ categories, onCategoryClick }: HomePageProps) {
  const { setOpen } = useSubmitProjectModal();
  const lastUpdated = process.env.LAST_BUILD_TIME ?? "Unknown";

  // Filter out "Uncategorized" category
  const filteredCategories = categories.filter(
    (category) => category.name.toLowerCase() !== "uncategorized"
  );

  const totalProjects = countTotalProjects(filteredCategories);
  const totalCategories = filteredCategories.length;

  // Sort categories alphabetically
  const sortedCategories = [...filteredCategories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-3 max-[568px]:px-3 max-[568px]:py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 max-[568px]:gap-2">
            <div className="text-lg font-semibold text-gray-900 shrink-0">
              BuilderMaps
            </div>
            <div className="flex items-center gap-3 max-[568px]:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 max-[568px]:text-xs max-[568px]:px-2"
                onClick={() => {
                  window.open(
                    "https://x.com/buildermaps_io",
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                <Twitter className="h-4 w-4 max-[568px]:h-3 max-[568px]:w-3" />
                <span className="max-[568px]:hidden">Follow on X</span>
                <span className="hidden max-[568px]:inline">X</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 max-[568px]:text-xs max-[568px]:px-2"
                onClick={() => {
                  window.open(
                    "https://github.com/chainbase-labs/buildermaps.io",
                    "_blank",
                    "noopener"
                  );
                }}
              >
                <Github className="h-4 w-4 max-[568px]:h-3 max-[568px]:w-3" />
                <span className="max-[568px]:hidden">View on GitHub</span>
                <span className="hidden max-[568px]:inline">GitHub</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 max-[568px]:text-xs max-[568px]:px-2"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-4 w-4 max-[568px]:h-3 max-[568px]:w-3" />
                <span className="max-[568px]:hidden">Submit Project</span>
                <span className="hidden max-[568px]:inline">Submit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <header className="border-b bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-3 text-4xl leading-tight linux-libertine-bold">
              BuilderMaps: Open-Source Crypto Ecosystem Landscape Mapping
            </h1>

            <div className="flex items-center justify-center gap-6 pt-2 text-sm text-gray-600">
              <span>Last updated: {lastUpdated}</span>
              <span className="text-gray-400">|</span>
              <span>{totalProjects} projects tracked</span>
              <span className="text-gray-400">|</span>
              <span>{totalCategories} major categories</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-5 py-12">
        <section className="mb-16">
          <h2 className="mb-6 border-b border-gray-200 pb-2 text-2xl linux-libertine-bold">
            Abstract
          </h2>
          <div className="space-y-5 leading-relaxed text-gray-800">
            <p className="!mb-4">
              <strong>
                BuilderMaps is a public good that maps the crypto landscape.
              </strong>{" "}
              Most industry ecosystem maps come from VCs showing their portfolio
              or media outlets pushing their own content. Data platforms lock
              things behind paywalls. You see pieces, not the whole picture.
            </p>
            <p className="!mb-4">
              <strong>
                Initiated and sponsored by Chainbase, BuilderMaps is built as an
                open database.
              </strong>{" "}
              Anyone can add projects, update info, or explore what exists. All
              edits are tracked and verifiable. No company controls it, no one
              decides what gets shown. Over time it becomes a shared reference
              for understanding how crypto is actually structured and who's
              building what.
            </p>
            <p className="!mb-4">
              Currently tracking <strong>{totalProjects} projects</strong>{" "}
              across <strong>{totalCategories} major categories</strong>,
              BuilderMaps serves as a comprehensive reference for understanding
              the competitive landscape and participant relationships within the
              cryptocurrency ecosystem.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-6 border-b border-gray-200 pb-2 text-2xl linux-libertine-bold">
            Ecosystem Categories
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sortedCategories.map((category) => {
              const projectCount = countCategoryProjects(category);
              return (
                <button
                  className="group cursor-pointer rounded-md border border-gray-300 hover:border-black bg-white p-6 text-left"
                  key={category.id}
                  onClick={() => onCategoryClick(category.id)}
                >
                  <h3 className="mb-2 text-lg group-hover:font-bold linux-libertine">
                    {category.name}
                  </h3>
                  <p className="mb-3 text-sm text-gray-600">
                    {projectCount} projects
                  </p>
                  <div className="flex items-center text-sm text-black">
                    View landscape
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="mb-6 border-b border-gray-200 pb-2 text-2xl linux-libertine-bold">
            How It Works
          </h2>
          <div className="space-y-5 text-gray-800">
            <div className="space-y-5 text-gray-800">
              <div>
                <strong>1. Community-Driven Curation:</strong> Projects are
                submitted and verified by community contributors, ensuring
                comprehensive coverage of the crypto ecosystem.
              </div>
              <div>
                <strong>2. Systematic Categorization:</strong> Each project is
                carefully categorized into relevant sectors and subcategories,
                following a systematic framework similar to VC research
                methodologies.
              </div>
              <div>
                <strong>3. Visual Landscape Maps:</strong> Interactive
                visualizations help users quickly understand market structures,
                identify key players, and discover emerging projects in each
                sector.
              </div>
              <div>
                <strong>4. Public Goods Model:</strong> BuilderMaps operates as
                a public goods project, relying on grants and community support
                to maintain independence and comprehensive coverage.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="mb-6 border-b border-gray-200 pb-2 text-2xl linux-libertine-bold">
            Contributing
          </h2>
          <div className="space-y-5 text-gray-800">
            <p>
              BuilderMaps.io is an <strong>open-source project</strong> and
              welcomes contributions from the community. You can contribute by:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Submitting new projects for inclusion in the landscape</li>
              <li>Updating project information and verifying accuracy</li>
              <li>Suggesting new categories or subcategories</li>
              <li>Contributing code improvements via GitHub</li>
              <li>Supporting the project through grants</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
