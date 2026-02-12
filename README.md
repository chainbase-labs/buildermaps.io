# BuilderMaps

**BuilderMaps is a public good that maps the crypto landscape.**

Most industry ecosystem maps come from VCs showing their portfolio or media outlets pushing their own content. Data platforms lock things behind paywalls. You see pieces, not the whole picture.

**Initiated and sponsored by Chainbase, BuilderMaps is built as an open database.** Anyone can add projects, update info, or explore what exists. All edits are tracked and verifiable. No company controls it, no one decides what gets shown.

Over time it becomes a shared reference for understanding how crypto is actually structured and who's building what.

## Contributing

We welcome contributions from the community! There are several ways to contribute:

- **Add new projects** to the ecosystem map
- **Update existing project information** (descriptions, links, funding, etc.)
- **Suggest new categories or subcategories**
- **Report bugs or suggest improvements**
- **Contribute code improvements** via pull requests

## Local Development

To develop and test BuilderMaps locally:

1. **Visit the testnet environment**: Open [https://net-static-dev.chainbasehq.com/buildermaps](https://net-static-dev.chainbasehq.com/buildermaps) in your browser

2. **Install dependencies**:

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the development server**:

   ```bash
   npm start
   ```

   This will start a local development server at `http://localhost:8080/`

4. **Configure the browser to use your local build**:
   - Open the browser Developer Tools (F12 or right-click → Inspect)
   - Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Navigate to **Local Storage** → `https://net-static-dev.chainbasehq.com`
   - Add a new entry:
     - **Key**: `import-map-override:@chainbase-labs/buildermaps-io`
     - **Value**: `http://localhost:8080/chainbase-labs-buildermaps-io.js`
   - Refresh the page to load your local changes

<img width="1402" height="415" alt="image" src="https://github.com/user-attachments/assets/a907fd80-6a1b-43a4-aa68-cf1cf46cc68b" />

Now you can make changes to the codebase and see them reflected in the testnet environment by reloading the page.

## Data Structure

BuilderMaps uses a split data structure for better maintainability:

- **Projects**: Individual JSON files in `public/data/projects/` (one file per project)
- **Maps**: Sector mapping files in `public/data/maps/` (one file per sector)
- **Generated**: `builder-maps.json` is automatically generated in CI from the split data

This structure makes it easier to:

- Add or update individual projects without editing a large file
- Manage sector/type mappings separately
- Avoid merge conflicts when multiple contributors work simultaneously

## Adding a New Project

To add a new project, you need to:

1. Create a project file in `public/data/projects/`
2. Add the project to the appropriate map file(s) in `public/data/maps/`

### Step 1: Create Project File

Create a new JSON file in `public/data/projects/` with the project ID as the filename:

**File Location:**

```
public/data/projects/project-id.json
```

**Project Data Structure:**

```json
{
  "id": "project-id",
  "name": "Project Name",
  "description": "Brief description of the project",
  "founded": 2020,
  "funding": 1000000,
  "links": {
    "homepage": "https://example.com",
    "logo": "https://example.com/logo.jpg",
    "twitter": "https://x.com/username",
    "telegram": "https://t.me/username",
    "discord": "https://discord.gg/invite",
    "medium": "https://medium.com/@username",
    "github": "https://github.com/username",
    "linkedin": "https://www.linkedin.com/company/companyname",
    "reddit": "https://reddit.com/r/subreddit"
  }
}
```

**Note**: The `id` field should match the filename (without `.json`). Use lowercase, kebab-case format (e.g., `my-awesome-project`).

### Step 2: Add Project to Map File(s)

Add the project ID to the appropriate sector map file(s) in `public/data/maps/`. Each map file represents a sector and contains types with their associated projects.

**File Location:**

```
public/data/maps/sector-name.json
```

**Map File Structure:**

```json
{
  "sector": "Sector Name",
  "types": [
    {
      "id": "type-id",
      "name": "Type Name",
      "projects": ["project-id-1", "project-id-2", "project-id-3"]
    }
  ]
}
```

**Example Map File** (`public/data/maps/x402.json`):

```json
{
  "sector": "x402",
  "types": [
    {
      "id": "consumer-apps",
      "name": "Consumer Apps",
      "projects": ["example-project", "another-project"]
    },
    {
      "id": "infra-devtools",
      "name": "Infra & Devtools",
      "projects": ["dev-tool-project"]
    }
  ]
}
```

### Field Descriptions

#### Project File Fields

**Required Fields:**

- **`id`** (string): Unique identifier for the project (must match filename, lowercase kebab-case)
- **`name`** (string): The official name of the project

**Optional Fields:**

- **`description`** (string): A brief description of what the project does
- **`founded`** (number | null): The year the project was founded (e.g., 2020). Use `null` if unknown
- **`funding`** (number | string | null): Total funding amount (e.g., 1000000 or "Series A"). Use `null` if unknown
- **`links`** (object): Object containing various links (all optional):
  - **`homepage`**: Main website URL
  - **`logo`**: URL to the project logo image. You can use either:
    - A local path starting with `/imgs/` (e.g., `/imgs/project-logo.jpg`) - see [Uploading Logo Images](#uploading-logo-images) below
    - A direct external URL (e.g., `https://example.com/logo.jpg`)
  - **`twitter`**: X (Twitter) profile URL
  - **`telegram`**: Telegram channel/group URL
  - **`discord`**: Discord server invite URL
  - **`medium`**: Medium publication URL
  - **`github`**: GitHub repository URL
  - **`linkedin`**: LinkedIn company page URL
  - **`reddit`**: Reddit community URL

#### Map File Fields

- **`sector`** (string): The main category name (e.g., "Stablecoins", "x402", "AI & Crypto")
- **`types`** (array): Array of type objects, each containing:
  - **`id`** (string): Unique identifier for the type (lowercase kebab-case, e.g., "consumer-apps")
  - **`name`** (string): Display name for the type (e.g., "Consumer Apps")
  - **`projects`** (array of strings): Array of project IDs that belong to this type

### Examples

#### Example 1: Simple Project

**Project File** (`public/data/projects/example-project.json`):

```json
{
  "id": "example-project",
  "name": "Example Project",
  "description": "A decentralized finance platform for lending and borrowing",
  "founded": 2023,
  "funding": null,
  "links": {
    "homepage": "https://example.com",
    "logo": "/imgs/example-project.jpg",
    "twitter": "https://x.com/example"
  }
}
```

**Map File Update** (add to `public/data/maps/x402.json`):

```json
{
  "sector": "x402",
  "types": [
    {
      "id": "consumer-apps",
      "name": "Consumer Apps",
      "projects": ["example-project", "other-existing-projects"]
    }
  ]
}
```

#### Example 2: Project in Multiple Sectors

A project can belong to multiple sectors by adding its ID to multiple map files.

**Project File** (`public/data/projects/multi-sector-project.json`):

```json
{
  "id": "multi-sector-project",
  "name": "Multi-Sector Project",
  "description": "A project that spans multiple categories",
  "founded": 2022,
  "funding": 5000000,
  "links": {
    "homepage": "https://multisector.com",
    "logo": "https://multisector.com/logo.jpg",
    "twitter": "https://x.com/multisector",
    "github": "https://github.com/multisector"
  }
}
```

**Add to `public/data/maps/stablecoins.json`:**

```json
{
  "sector": "Stablecoins",
  "types": [
    {
      "id": "infra",
      "name": "Infra",
      "projects": ["multi-sector-project", "other-projects"]
    }
  ]
}
```

**Add to `public/data/maps/x402.json`:**

```json
{
  "sector": "x402",
  "types": [
    {
      "id": "wallet-payments",
      "name": "Wallet & Payments",
      "projects": ["multi-sector-project", "other-projects"]
    }
  ]
}
```

#### Example 3: Project with Multiple Types in One Sector

A project can belong to multiple types within the same sector by adding its ID to multiple type arrays:

**Project File** (`public/data/projects/complex-project.json`):

```json
{
  "id": "complex-project",
  "name": "Complex Project",
  "description": "A project with multiple subcategories",
  "founded": 2021,
  "funding": null,
  "links": {
    "homepage": "https://complex.com",
    "logo": "https://complex.com/logo.jpg"
  }
}
```

**Add to `public/data/maps/x402.json` (in multiple types):**

```json
{
  "sector": "x402",
  "types": [
    {
      "id": "infra-devtools",
      "name": "Infra & Devtools",
      "projects": ["complex-project", "other-projects"]
    },
    {
      "id": "consumer-apps",
      "name": "Consumer Apps",
      "projects": ["complex-project", "other-projects"]
    }
  ]
}
```

### Step-by-Step Guide to Add a Project

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:

   **Option A: Using Command Line**

   ```bash
   git clone https://github.com/YOUR_USERNAME/buildermaps.io.git
   cd buildermaps.io
   ```

   **Option B: Using GitHub Desktop**

   - Go to your fork's page on GitHub
   - Click the green "Code" button
   - Select "Open with GitHub Desktop"
   - Choose a local path and click "Clone"

3. **Create the project file**:

   - Create a new file in `public/data/projects/` with the format `project-id.json`
   - Use lowercase, kebab-case for the project ID (e.g., `my-awesome-project.json`)
   - Copy the structure from an existing project file and modify it

4. **Add project to map file(s)**:

   - Open the appropriate map file(s) in `public/data/maps/` (e.g., `x402.json`, `stablecoins.json`)
   - Find the relevant type(s) and add your project ID to the `projects` array
   - If the project belongs to multiple sectors or types, add it to each relevant map file/type

5. **Validate JSON syntax**: Ensure your JSON files are valid. You can use:

   - An online JSON validator
   - Your code editor's JSON validation
   - Command line:
     ```bash
     node -e "JSON.parse(require('fs').readFileSync('public/data/projects/your-project-id.json', 'utf8'))"
     node -e "JSON.parse(require('fs').readFileSync('public/data/maps/sector-name.json', 'utf8'))"
     ```

6. **Commit your changes**:

   **Option A: Using Command Line**

   ```bash
   git add public/data/projects/your-project-id.json
   git add public/data/maps/sector-name.json
   git commit -m "Add [Project Name] to BuilderMaps"
   ```

   **Option B: Using GitHub Desktop**

   - Open GitHub Desktop
   - You should see your changes listed in the left sidebar
   - Select the project file and map file(s) to stage them
   - Write a commit message: "Add [Project Name] to BuilderMaps"
   - Click "Commit to main" (or your branch name)

7. **Push to your fork**:

   **Option A: Using Command Line**

   ```bash
   git push origin master
   ```

   **Option B: Using GitHub Desktop**

   - Click the "Push origin" button in the top toolbar
   - Or go to Repository → Push

8. **Create a Pull Request** on GitHub with:
   - A clear title describing the addition
   - A description of the project being added
   - Any relevant links or context

### Uploading Logo Images

To upload a project logo image:

1. **Place your logo image** in the `/public/imgs/` directory:

   ```bash
   # Example: Save your logo as project-name.jpg in the imgs folder
   # The file should be at: public/imgs/project-name.jpg
   ```

2. **Reference the image** in your project file using a path starting with `/imgs/`:

   ```json
   {
     "links": {
       "logo": "/imgs/project-name.jpg"
     }
   }
   ```

3. **Commit both files** together:
   ```bash
   git add public/imgs/project-name.jpg
   git add public/data/projects/project-id.json
   git commit -m "Add [Project Name] with logo to BuilderMaps"
   ```

**Note**:

- Use common image formats (`.jpg`, `.png`, `.webp`, etc.)
- Keep file names descriptive and lowercase (e.g., `my-project-logo.jpg`)
- The path must start with `/imgs/` (not `/public/imgs/`)
- Alternatively, you can use an external URL if the logo is hosted elsewhere

### Best Practices

1. **Project IDs**: Use lowercase, kebab-case format (e.g., `my-awesome-project`). The ID should be descriptive and match the filename
2. **Project Names**: Use the official, commonly recognized name of the project
3. **Descriptions**: Keep descriptions concise (1-2 sentences) and factual
4. **Sectors & Types**:
   - Use existing sector and type names when possible
   - Check existing map files to see available sectors and types
   - If you need a new category, mention it in your PR description
   - Type IDs should be lowercase kebab-case (e.g., `consumer-apps`)
5. **Logo Images**:
   - **Preferred**: Upload logo images to `/public/imgs/` and reference them with `/imgs/filename.jpg` in the project file
   - **Alternative**: Use direct external image URLs (ending in .jpg, .png, etc.) rather than HTML pages
   - Use descriptive, lowercase filenames for uploaded logos
6. **URLs**: Always use full URLs with `https://` protocol
7. **Funding**: Use numbers for dollar amounts (e.g., `1000000` for $1M) or strings for funding rounds (e.g., `"Series A"`)
8. **Founded Year**: Use a 4-digit year (e.g., `2023`), or `null` if unknown
9. **JSON Formatting**: Maintain consistent formatting with the rest of the files
10. **Project IDs in Maps**: Keep project IDs in alphabetical order within each type's projects array when possible

### Common Sectors

Based on the current data, common sectors include:

- `x402`
- `Stablecoins`
- `Public Chain`
- And more on the way...

### Common Types (Subcategories)

Common types vary by sector but include:

- `Infra` / `Infra & Devtools`
- `Consumer Apps`
- `Wallet & Payments`
- `Chains & Protocols`
- `Emerging`
- `Crypto Backed`
- `T-Bills Backed`
- And many more..

Check existing map files in `public/data/maps/` to see what sectors and types are available.

## Updating Existing Projects

To update an existing project:

1. **Find the project file** in `public/data/projects/` (e.g., `project-id.json`)
2. **Modify the relevant fields** in the project file
3. **If changing sectors/types**: Update the map files accordingly:
   - Remove the project ID from old type(s) in the relevant map file(s)
   - Add the project ID to new type(s) in the appropriate map file(s)
4. **Follow the same commit and PR process** as adding a new project
5. **In your PR**, clearly describe what information was updated and why

## Data Generation

The `builder-maps.json` file is automatically generated during CI/CD from the split data structure:

- Individual project files in `public/data/projects/`
- Sector map files in `public/data/maps/`

You don't need to manually create or edit `builder-maps.json`. It's generated before deployment and uploaded to OSS for production use.

## Code of Conduct

- Be respectful and constructive in all interactions
- Focus on factual, accurate information
- Follow the project's coding standards and conventions
- Help maintain the quality and integrity of the data

## Questions?

If you have questions about contributing:

- Open an issue on GitHub
- Check existing issues and pull requests for similar questions
- Review the codebase to understand how data is processed

## License

This project is open source. Please check the LICENSE file for details.

---

**Thank you for contributing to BuilderMaps!** Your contributions help make crypto ecosystem data more accessible and transparent for everyone.
