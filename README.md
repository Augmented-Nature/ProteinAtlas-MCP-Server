# Human Protein Atlas MCP Server

A comprehensive Model Context Protocol (MCP) server for accessing Human Protein Atlas data, providing information about protein expression, subcellular localization, pathology, and more.

## Overview

The Human Protein Atlas MCP Server enables seamless access to the vast repository of protein data from the Human Protein Atlas (https://www.proteinatlas.org). This server provides tools and resources for:

- **Protein Search and Information**: Search for proteins by name, gene symbol, or description
- **Tissue Expression**: Access tissue-specific expression profiles
- **Subcellular Localization**: Retrieve protein localization data
- **Pathology Data**: Access cancer-related protein information
- **Blood and Brain Expression**: Specialized expression data for blood cells and brain regions
- **Antibody Information**: Validation and staining data for antibodies
- **Batch Processing**: Efficient lookup of multiple proteins
- **Advanced Search**: Complex queries with multiple filters

## Features

### Core Capabilities

- **🔍 Comprehensive Search**: Find proteins using various identifiers and keywords
- **🧬 Multi-Modal Data**: Access expression, localization, and pathology information
- **🩸 Specialized Atlases**: Blood Atlas and Brain Atlas data integration
- **📊 Batch Processing**: Efficient handling of multiple protein queries
- **🔬 Research-Grade Data**: High-quality, peer-reviewed protein information
- **⚡ Fast Response**: Optimized for quick data retrieval

### Data Types Available

1. **Basic Protein Information**

   - Gene symbols and Ensembl IDs
   - Protein descriptions and classifications
   - UniProt cross-references

2. **Expression Data**

   - Tissue-specific RNA expression
   - Blood cell expression profiles
   - Brain region expression data
   - Single-cell expression information

3. **Subcellular Localization**

   - Protein localization patterns
   - Reliability scores
   - Immunofluorescence data

4. **Pathology Information**

   - Cancer prognostic markers
   - Disease associations
   - Therapeutic targets

5. **Antibody Data**
   - Antibody validation information
   - Staining patterns
   - Reliability assessments

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Setup

1. Clone or download the server code
2. Install dependencies:

   ```bash
   cd proteinatlas-server
   npm install
   ```

3. Build the server:

   ```bash
   npm run build
   ```

4. The server is now ready to use!

## Usage

### Command Line

Run the server directly:

```bash
npm start
# or
node build/index.js
```

### MCP Client Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "proteinatlas": {
      "command": "node",
      "args": ["/path/to/proteinatlas-server/build/index.js"]
    }
  }
}
```

## Available Tools

### Basic Search and Retrieval

#### `search_proteins`

Search Human Protein Atlas for proteins by name, gene symbol, or description.

**Parameters:**

- `query` (required): Search query (gene name, protein name, or keyword)
- `format`: Output format (json, tsv) - default: json
- `columns`: Specific columns to include in results
- `maxResults`: Maximum number of results (1-10000) - default: 100
- `compress`: Whether to compress the response - default: false

**Example:**

```javascript
{
  "query": "BRCA1",
  "format": "json",
  "maxResults": 10
}
```

#### `get_protein_info`

Get detailed information for a specific protein by gene symbol.

**Parameters:**

- `gene` (required): Gene symbol (e.g., BRCA1, TP53)
- `format`: Output format (json, tsv, xml, trig) - default: json

#### `get_protein_by_ensembl`

Get protein information using Ensembl gene ID.

**Parameters:**

- `ensemblId` (required): Ensembl gene ID (e.g., ENSG00000139618)
- `format`: Output format (json, tsv, xml, trig) - default: json

### Expression Analysis

#### `get_tissue_expression`

Get tissue-specific expression data for a protein.

**Parameters:**

- `gene` (required): Gene symbol
- `format`: Output format (json, tsv) - default: json

#### `search_by_tissue`

Find proteins highly expressed in specific tissues.

**Parameters:**

- `tissue` (required): Tissue name (e.g., liver, brain, heart)
- `expressionLevel`: Expression level filter (high, medium, low, not detected)
- `format`: Output format (json, tsv) - default: json
- `maxResults`: Maximum number of results (1-10000) - default: 100

#### `get_blood_expression`

Get blood cell expression data for a protein.

#### `get_brain_expression`

Get brain region expression data for a protein.

### Subcellular Localization

#### `get_subcellular_location`

Get subcellular localization data for a protein.

#### `search_by_subcellular_location`

Find proteins localized to specific subcellular compartments.

**Parameters:**

- `location` (required): Subcellular location (e.g., nucleus, mitochondria, cytosol)
- `reliability`: Reliability filter (approved, enhanced, supported, uncertain)
- `format`: Output format (json, tsv) - default: json
- `maxResults`: Maximum number of results (1-10000) - default: 100

### Pathology and Cancer

#### `get_pathology_data`

Get cancer and pathology data for a protein.

#### `search_cancer_markers`

Find proteins associated with specific cancers or with prognostic value.

**Parameters:**

- `cancer`: Cancer type (e.g., breast cancer, lung cancer)
- `prognostic`: Prognostic filter (favorable, unfavorable)
- `format`: Output format (json, tsv) - default: json
- `maxResults`: Maximum number of results (1-10000) - default: 100

### Advanced Features

#### `advanced_search`

Perform advanced search with multiple filters and criteria.

**Parameters:**

- `query`: Base search query
- `tissueSpecific`: Tissue-specific expression filter
- `subcellularLocation`: Subcellular localization filter
- `cancerPrognostic`: Cancer prognostic filter
- `proteinClass`: Protein class filter
- `chromosome`: Chromosome filter
- `antibodyReliability`: Antibody reliability filter
- `format`: Output format (json, tsv) - default: json
- `columns`: Specific columns to include in results
- `maxResults`: Maximum number of results (1-10000) - default: 100

#### `batch_protein_lookup`

Look up multiple proteins simultaneously.

**Parameters:**

- `genes` (required): Array of gene symbols (max 100)
- `format`: Output format (json, tsv) - default: json
- `columns`: Specific columns to include in results

#### `compare_expression_profiles`

Compare expression profiles between multiple proteins.

**Parameters:**

- `genes` (required): Array of gene symbols to compare (2-10)
- `expressionType`: Type of expression data (tissue, brain, blood, single_cell) - default: tissue
- `format`: Output format (json, tsv) - default: json

## Available Resources

The server provides several resource templates for direct data access:

### Resource Templates

- `hpa://protein/{gene}`: Complete protein atlas data for a gene symbol
- `hpa://ensembl/{ensemblId}`: Complete protein atlas data for an Ensembl gene ID
- `hpa://tissue/{gene}`: Tissue-specific expression data for a gene
- `hpa://subcellular/{gene}`: Subcellular localization information for a gene
- `hpa://pathology/{gene}`: Cancer and pathology data for a gene
- `hpa://blood/{gene}`: Blood cell expression data for a gene
- `hpa://brain/{gene}`: Brain region expression data for a gene
- `hpa://antibody/{gene}`: Antibody validation and staining information for a gene
- `hpa://search/{query}`: Search results for proteins matching the query

### Example Resource Access

```javascript
// Access tissue expression data for BRCA1
const resource = await client.readResource("hpa://tissue/BRCA1");

// Search for insulin-related proteins
const searchResults = await client.readResource("hpa://search/insulin");
```

## Data Sources

This server accesses data from:

- **Human Protein Atlas**: Main protein atlas database
- **Tissue Atlas**: Normal tissue expression data
- **Blood Atlas**: Blood cell expression profiles
- **Brain Atlas**: Brain region expression data
- **Pathology Atlas**: Cancer-related protein data
- **Cell Atlas**: Single-cell expression information

## Rate Limiting and Best Practices

- The server implements appropriate rate limiting to respect the Human Protein Atlas API
- For batch operations, consider breaking large requests into smaller chunks
- Use specific column selections to reduce response size when possible
- Cache frequently accessed data when appropriate

## Error Handling

The server provides comprehensive error handling:

- **Invalid Parameters**: Clear error messages for incorrect input
- **Network Issues**: Retry logic for transient failures
- **Data Format Errors**: Graceful handling of unexpected response formats
- **Rate Limiting**: Appropriate backoff strategies

## Examples

### Basic Protein Lookup

```javascript
// Search for BRCA1 protein
const result = await callTool("search_proteins", {
  query: "BRCA1",
  format: "json",
});
```

### Tissue Expression Analysis

```javascript
// Get tissue expression for multiple genes
const comparison = await callTool("compare_expression_profiles", {
  genes: ["BRCA1", "BRCA2", "TP53"],
  expressionType: "tissue",
});
```

### Cancer Research

```javascript
// Find breast cancer prognostic markers
const markers = await callTool("search_cancer_markers", {
  cancer: "breast cancer",
  prognostic: "unfavorable",
  maxResults: 50,
});
```

### Batch Processing

```javascript
// Look up multiple proteins at once
const batchResult = await callTool("batch_protein_lookup", {
  genes: ["BRCA1", "BRCA2", "TP53", "EGFR", "MYC"],
  format: "json",
});
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run the server
npm start

# Test with MCP client or direct stdio communication
```

## Contributing

Contributions are welcome! Please ensure:

1. Code follows TypeScript best practices
2. Error handling is comprehensive
3. Documentation is updated for new features
4. Tests are included for new functionality

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the Human Protein Atlas documentation: https://www.proteinatlas.org/about/help
2. Review the MCP specification: https://modelcontextprotocol.io/
3. Submit issues via the project repository

## Acknowledgments

- Human Protein Atlas team for providing the comprehensive protein database
- Model Context Protocol community for the standardized communication framework
- TypeScript and Node.js communities for the development tools

---

_This server provides programmatic access to Human Protein Atlas data for research and educational purposes. Please cite appropriate sources when using this data in publications._
