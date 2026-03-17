# Process Builder Data

[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Transform CSV project data into structured JSON files with logos and metadata. Perfect for building project directories, crypto ecosystem maps, and builder databases.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Nowhitestar/process-builder-data.git
cd process-builder-data

# Install dependencies
pip install -r requirements.txt

# Process your CSV file
python processor.py examples/sample.csv ./output
```

## Features

- **CSV to JSON Transformation** - Converts project data from CSV to structured JSON
- **Logo Download** - Automatically downloads project logos from Twitter/X avatars
- **Description Fetching** - Scrapes website meta tags for project descriptions
- **Sector Organization** - Groups projects by sector and type
- **Progress Tracking** - Visual progress bar with tqdm
- **CLI Interface** - Full command-line interface with arguments
- **Rate Limiting** - Configurable delays to respect API limits

## Installation

### From Source

```bash
git clone https://github.com/Nowhitestar/process-builder-data.git
cd process-builder-data
pip install -r requirements.txt
```

### Requirements

- Python 3.7+
- requests
- beautifulsoup4
- tqdm

## Usage

### Basic Usage

```bash
python processor.py input.csv ./output
```

### With Options

```bash
# Verbose mode with detailed output
python processor.py projects.csv ./output --verbose

# Skip logo downloading
python processor.py projects.csv ./output --skip-logos

# Skip website description fetching (use placeholder when missing)
python processor.py projects.csv ./output --skip-descriptions

# Quiet mode (errors only)
python processor.py projects.csv ./output --quiet

# Custom rate limiting (seconds between requests)
python processor.py projects.csv ./output --rate-limit 1.0
```

### Command Line Options

```
usage: processor.py [-h] [-v] [-q] [--skip-logos] [--rate-limit RATE_LIMIT]
                    [--version]
                    csv_file output_dir

Process Builder Data - Transform CSV project data into structured JSON files

positional arguments:
  csv_file              Path to input CSV file
  output_dir            Path to output directory

optional arguments:
  -h, --help            show this help message and exit
  -v, --verbose         Enable verbose output
  -q, --quiet           Suppress output except errors
  --skip-logos          Skip logo downloading
  --skip-descriptions   Skip fetching website descriptions when missing (use placeholder instead)
  --rate-limit RATE_LIMIT
                        Delay between requests in seconds (default: 0.5)
  --version             show program's version number and exit
```

## CSV Format

### Required Columns

| Column    | Description              | Example                |
| --------- | ------------------------ | ---------------------- |
| `name`    | Project name             | "Ethereum"             |
| `sector`  | Project sector/category  | "Layer1"               |
| `type`    | Project type/subcategory | "Infrastructure"       |
| `website` | Project homepage URL     | "https://ethereum.org" |

### Optional Columns

| Column           | Description                                 | Example                       |
| ---------------- | ------------------------------------------- | ----------------------------- |
| `x` or `twitter` | Twitter/X profile URL                       | "https://x.com/ethereum"      |
| `github`         | GitHub repository URL                       | "https://github.com/ethereum" |
| `description`    | Project description (auto-fetched if empty) | "Decentralized platform..."   |
| `location`       | Project location/region                     | "Global"                      |

### Example CSV

```csv
name,sector,type,website,x,github,location,description
Ethereum,Layer1,Infrastructure,https://ethereum.org,https://x.com/ethereum,https://github.com/ethereum,Global,Decentralized platform that runs smart contracts
Uniswap,DeFi,DEX,https://uniswap.org,https://x.com/Uniswap,https://github.com/Uniswap,Global,Automated liquidity protocol
```

## Output Structure

```
output/
├── data/
│   ├── projects/          # Individual project JSON files
│   │   ├── ethereum.json
│   │   ├── uniswap.json
│   │   └── ...
│   └── maps/              # Sector map files
│       ├── layer1.json
│       ├── defi.json
│       └── ...
└── imgs/                  # Downloaded logos
    ├── Layer1/
    │   └── Infrastructure/
    │       └── ethereum.png
    └── DeFi/
        └── DEX/
            └── uniswap.png
```

### Project JSON Format

```json
{
  "id": "ethereum",
  "name": "Ethereum",
  "description": "Decentralized platform that runs smart contracts",
  "location": "Global",
  "links": {
    "logo": "/imgs/Layer1/Infrastructure/ethereum.png",
    "homepage": "https://ethereum.org",
    "twitter": "https://x.com/ethereum",
    "github": "https://github.com/ethereum"
  }
}
```

### Map JSON Format

```json
{
  "sector": "Layer1",
  "types": [
    {
      "id": "infrastructure",
      "name": "Infrastructure",
      "projects": ["ethereum", "solana", "avalanche"]
    }
  ]
}
```

## Configuration

### Environment Variables

No environment variables required. All configuration is done via command-line arguments.

### Rate Limiting

By default, the processor waits 0.5 seconds between requests. Adjust with `--rate-limit`:

```bash
# Faster processing (be careful with rate limits)
python processor.py input.csv ./output --rate-limit 0.2

# Slower, more respectful
python processor.py input.csv ./output --rate-limit 2.0
```

## Examples

See the `examples/` directory for sample data:

- `examples/sample.csv` - Sample CSV with various project types
- `examples/sample-output/` - Expected output structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Logo downloading powered by [unavatar](https://unavatar.io/)
- Built for the crypto builder community
