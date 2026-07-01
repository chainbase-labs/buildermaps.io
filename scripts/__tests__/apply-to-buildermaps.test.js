const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

describe("apply_to_buildermaps.py", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buildermaps-apply-"));
    fs.mkdirSync(path.join(tempDir, "public", "data", "projects"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tempDir, "public", "data", "maps"), {
      recursive: true,
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("imports logo url values from CSV attachments", () => {
    const csvPath = path.join(tempDir, "input.csv");
    fs.writeFileSync(
      csvPath,
      [
        "name,sector,type,website,x,logo url,description",
        'Example Project,AI Tools,Coding,https://example.com,https://x.com/example,https://cdn.example.com/logo.png,"Example description"',
      ].join("\n")
    );

    execFileSync(
      "python3",
      [
        path.join(
          process.cwd(),
          "process-builder-data",
          "apply_to_buildermaps.py"
        ),
        csvPath,
        "--repo-root",
        tempDir,
      ],
      { cwd: process.cwd() }
    );

    const project = JSON.parse(
      fs.readFileSync(
        path.join(
          tempDir,
          "public",
          "data",
          "projects",
          "example-project.json"
        ),
        "utf-8"
      )
    );
    const map = JSON.parse(
      fs.readFileSync(
        path.join(tempDir, "public", "data", "maps", "ai-tools.json"),
        "utf-8"
      )
    );

    expect(project.links.logo).toBe("https://cdn.example.com/logo.png");
    expect(map).toEqual({
      sector: "AI Tools",
      types: [
        {
          id: "coding",
          name: "Coding",
          projects: ["example-project"],
        },
      ],
    });
  });
});
