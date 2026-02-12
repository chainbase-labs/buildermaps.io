# API Documentation

## Core Functions

### `process_csv(csv_path, output_dir, verbose=False, quiet=False, skip_logos=False, skip_descriptions=False, rate_limit=0.5)`

Main function to process a CSV file and generate JSON output.

#### Parameters

| Parameter           | Type  | Default | Description                                                               |
| ------------------- | ----- | ------- | ------------------------------------------------------------------------- |
| `csv_path`          | str   | -       | Path to input CSV file                                                    |
| `output_dir`        | str   | -       | Path to output directory                                                  |
| `verbose`           | bool  | False   | Enable verbose output                                                     |
| `quiet`             | bool  | False   | Suppress output except errors                                             |
| `skip_logos`        | bool  | False   | Skip logo downloading                                                     |
| `skip_descriptions` | bool  | False   | Skip fetching website descriptions when missing (use placeholder instead) |
| `rate_limit`        | float | 0.5     | Delay between requests in seconds                                         |

#### Returns

- `bool` - True if successful, False otherwise

#### Example

```python
from processor import process_csv

success = process_csv(
    csv_path="projects.csv",
    output_dir="./output",
    verbose=True,
    rate_limit=1.0
)
```

### `slugify(text)`

Convert text to slug format (kebab-case).

#### Parameters

| Parameter | Type | Description     |
| --------- | ---- | --------------- |
| `text`    | str  | Text to convert |

#### Returns

- `str` - Slugified text

#### Example

```python
from processor import slugify

slug = slugify("Hello World")  # Returns: "hello-world"
```

### `download_logo(twitter_url, save_path, verbose=False)`

Download Twitter/X avatar using unavatar API.

#### Parameters

| Parameter     | Type | Description           |
| ------------- | ---- | --------------------- |
| `twitter_url` | str  | Twitter/X profile URL |
| `save_path`   | str  | Path to save the logo |
| `verbose`     | bool | Enable verbose output |

#### Returns

- `bool` - True if download successful, False otherwise

### `fetch_website_description(url, verbose=False)`

Fetch description from website meta tags.

#### Parameters

| Parameter | Type | Description           |
| --------- | ---- | --------------------- |
| `url`     | str  | Website URL           |
| `verbose` | bool | Enable verbose output |

#### Returns

- `str` - Website description or empty string

## CSV Format Specification

### Required Columns

- `name` - Project name
- `sector` - Project sector/category
- `type` - Project type/subcategory
- `website` - Project homepage URL

### Optional Columns

- `x` or `twitter` - Twitter/X profile URL
- `github` - GitHub repository URL
- `description` - Project description
- `location` - Project location

## Output Schema

### Project JSON

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "location": "string",
  "links": {
    "logo": "string",
    "homepage": "string",
    "twitter": "string",
    "github": "string"
  }
}
```

### Map JSON

```json
{
  "sector": "string",
  "types": [
    {
      "id": "string",
      "name": "string",
      "projects": ["string"]
    }
  ]
}
```
