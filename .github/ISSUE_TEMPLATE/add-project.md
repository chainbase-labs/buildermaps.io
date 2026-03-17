---
name: "Add Project to BuilderMaps"
about: "Submit a new Web3 project (project file + map placement)"
title: "Add Project: <Project Name>"
labels: ["project:add"]
assignees: []
---

Thanks for contributing to **BuilderMaps**
To add a new project, **both Step 1 and Step 2 are required**.

---

## Step 1: Project file

**Location:** `public/data/projects/<project-id>.json`

### Requirements

- `id` must be **lowercase kebab-case**
- `id` must match the filename (without `.json`)
- Unknown values should be `null`
- URLs should include `https://`

Paste the **complete project JSON** below:

```json
{
  "id": "<project-id>",
  "name": "<Project Name>",
  "description": "<Brief factual description (1–2 sentences)>",
  "founded": null,
  "funding": null,
  "links": {
    "homepage": "https://",
    "logo": "/imgs/<logo-file>.(png|jpg|webp) OR https://.../logo.png",
    "twitter": "https://x.com/<handle>",
    "telegram": null,
    "discord": null,
    "medium": null,
    "github": null,
    "linkedin": null,
    "reddit": null
  }
}
```

## Step 2: Add Project to Map File(s)

**Location:** `public/data/maps/<sector>.json`

### What to provide

- Which sector map file(s) should include this project?
- Which type `id`(s) inside that sector?

Fill the placement plan below (you can list multiple sectors/types):

```json
{
  "placements": [
    {
      "sector_file": "public/data/maps/<sector>.json",
      "type_id": "<type-id>",
      "project_id": "<project-id>"
    }
  ]
}
```

### Notes

- A project can belong to multiple sectors (add multiple items in placements)
- A project can be in multiple types (add multiple items)
- If you are requesting a new sector/type, describe it here:

#### New sector/type request (optional):

- Sector name:
- Type id (kebab-case):
- Type display name:
- Reason:
