#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

// Human Protein Atlas API interfaces
interface ProteinSearchResult {
  gene: string;
  geneSynonym?: string;
  ensembl: string;
  geneDescription?: string;
  uniprot?: string;
  chromosome?: string;
  position?: string;
  proteinClass?: string;
  evidence?: string;
}

interface ProteinInfo {
  gene: string;
  ensembl: string;
  uniprot?: string;
  geneDescription?: string;
  tissueExpression?: any;
  subcellularLocation?: any;
  pathologyData?: any;
  antibodyInfo?: any;
  bloodExpression?: any;
  brainExpression?: any;
}

// Type guards and validation functions
const isValidSearchArgs = (
  args: any
): args is {
  query: string;
  format?: string;
  columns?: string[];
  compress?: boolean;
  maxResults?: number;
} => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.query === 'string' &&
    args.query.length > 0 &&
    (args.format === undefined || ['json', 'tsv', 'xml', 'trig'].includes(args.format)) &&
    (args.columns === undefined || Array.isArray(args.columns)) &&
    (args.compress === undefined || typeof args.compress === 'boolean') &&
    (args.maxResults === undefined || (typeof args.maxResults === 'number' && args.maxResults > 0 && args.maxResults <= 10000))
  );
};

const isValidGeneArgs = (
  args: any
): args is { gene: string; format?: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.gene === 'string' &&
    args.gene.length > 0 &&
    (args.format === undefined || ['json', 'tsv', 'xml', 'trig'].includes(args.format))
  );
};

const isValidEnsemblArgs = (
  args: any
): args is { ensemblId: string; format?: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.ensemblId === 'string' &&
    args.ensemblId.length > 0 &&
    (args.format === undefined || ['json', 'tsv', 'xml', 'trig'].includes(args.format))
  );
};

const isValidAdvancedSearchArgs = (
  args: any
): args is {
  query?: string;
  tissueSpecific?: string;
  subcellularLocation?: string;
  cancerPrognostic?: string;
  proteinClass?: string;
  chromosome?: string;
  antibodyReliability?: string;
  format?: string;
  columns?: string[];
  maxResults?: number;
} => {
  return (
    typeof args === 'object' &&
    args !== null &&
    (args.query === undefined || typeof args.query === 'string') &&
    (args.tissueSpecific === undefined || typeof args.tissueSpecific === 'string') &&
    (args.subcellularLocation === undefined || typeof args.subcellularLocation === 'string') &&
    (args.cancerPrognostic === undefined || typeof args.cancerPrognostic === 'string') &&
    (args.proteinClass === undefined || typeof args.proteinClass === 'string') &&
    (args.chromosome === undefined || typeof args.chromosome === 'string') &&
    (args.antibodyReliability === undefined || ['approved', 'enhanced', 'supported', 'uncertain'].includes(args.antibodyReliability)) &&
    (args.format === undefined || ['json', 'tsv'].includes(args.format)) &&
    (args.columns === undefined || Array.isArray(args.columns)) &&
    (args.maxResults === undefined || (typeof args.maxResults === 'number' && args.maxResults > 0 && args.maxResults <= 10000))
  );
};

const isValidBatchArgs = (
  args: any
): args is { genes: string[]; format?: string; columns?: string[] } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    Array.isArray(args.genes) &&
    args.genes.length > 0 &&
    args.genes.length <= 100 &&
    args.genes.every((gene: any) => typeof gene === 'string' && gene.length > 0) &&
    (args.format === undefined || ['json', 'tsv'].includes(args.format)) &&
    (args.columns === undefined || Array.isArray(args.columns))
  );
};

const isValidTissueSearchArgs = (
  args: any
): args is { tissue: string; expressionLevel?: string; format?: string; maxResults?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.tissue === 'string' &&
    args.tissue.length > 0 &&
    (args.expressionLevel === undefined || ['high', 'medium', 'low', 'not detected'].includes(args.expressionLevel)) &&
    (args.format === undefined || ['json', 'tsv'].includes(args.format)) &&
    (args.maxResults === undefined || (typeof args.maxResults === 'number' && args.maxResults > 0 && args.maxResults <= 10000))
  );
};

const isValidSubcellularSearchArgs = (
  args: any
): args is { location: string; reliability?: string; format?: string; maxResults?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.location === 'string' &&
    args.location.length > 0 &&
    (args.reliability === undefined || ['approved', 'enhanced', 'supported', 'uncertain'].includes(args.reliability)) &&
    (args.format === undefined || ['json', 'tsv'].includes(args.format)) &&
    (args.maxResults === undefined || (typeof args.maxResults === 'number' && args.maxResults > 0 && args.maxResults <= 10000))
  );
};

const isValidPathologySearchArgs = (
  args: any
): args is { cancer?: string; prognostic?: string; format?: string; maxResults?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    (args.cancer === undefined || typeof args.cancer === 'string') &&
    (args.prognostic === undefined || ['favorable', 'unfavorable'].includes(args.prognostic)) &&
    (args.format === undefined || ['json', 'tsv'].includes(args.format)) &&
    (args.maxResults === undefined || (typeof args.maxResults === 'number' && args.maxResults > 0 && args.maxResults <= 10000))
  );
};

class ProteinAtlasServer {
  private server: Server;
  private apiClient: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'proteinatlas-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize Human Protein Atlas API client
    this.apiClient = axios.create({
      baseURL: 'https://www.proteinatlas.org',
      timeout: 30000,
      headers: {
        'User-Agent': 'ProteinAtlas-MCP-Server/0.1.0',
      },
    });

    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List available resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'hpa://protein/{gene}',
            name: 'Human Protein Atlas protein entry',
            mimeType: 'application/json',
            description: 'Complete protein atlas data for a gene symbol',
          },
          {
            uriTemplate: 'hpa://ensembl/{ensemblId}',
            name: 'Human Protein Atlas Ensembl entry',
            mimeType: 'application/json',
            description: 'Complete protein atlas data for an Ensembl gene ID',
          },
          {
            uriTemplate: 'hpa://tissue/{gene}',
            name: 'Tissue expression data',
            mimeType: 'application/json',
            description: 'Tissue-specific expression data for a gene',
          },
          {
            uriTemplate: 'hpa://subcellular/{gene}',
            name: 'Subcellular localization data',
            mimeType: 'application/json',
            description: 'Subcellular localization information for a gene',
          },
          {
            uriTemplate: 'hpa://pathology/{gene}',
            name: 'Pathology data',
            mimeType: 'application/json',
            description: 'Cancer and pathology data for a gene',
          },
          {
            uriTemplate: 'hpa://blood/{gene}',
            name: 'Blood expression data',
            mimeType: 'application/json',
            description: 'Blood cell expression data for a gene',
          },
          {
            uriTemplate: 'hpa://brain/{gene}',
            name: 'Brain expression data',
            mimeType: 'application/json',
            description: 'Brain region expression data for a gene',
          },
          {
            uriTemplate: 'hpa://antibody/{gene}',
            name: 'Antibody information',
            mimeType: 'application/json',
            description: 'Antibody validation and staining information for a gene',
          },
          {
            uriTemplate: 'hpa://search/{query}',
            name: 'Search results',
            mimeType: 'application/json',
            description: 'Search results for proteins matching the query',
          },
        ],
      })
    );

    // Handle resource requests
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;

        try {
          // Handle protein by gene symbol requests
          const proteinMatch = uri.match(/^hpa:\/\/protein\/([^/]+)$/);
          if (proteinMatch) {
            const gene = decodeURIComponent(proteinMatch[1]);
            const data = await this.fetchProteinData(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle protein by Ensembl ID requests
          const ensemblMatch = uri.match(/^hpa:\/\/ensembl\/([^/]+)$/);
          if (ensemblMatch) {
            const ensemblId = decodeURIComponent(ensemblMatch[1]);
            const data = await this.fetchProteinDataByEnsembl(ensemblId);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle tissue expression requests
          const tissueMatch = uri.match(/^hpa:\/\/tissue\/([^/]+)$/);
          if (tissueMatch) {
            const gene = decodeURIComponent(tissueMatch[1]);
            const data = await this.fetchTissueExpression(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle subcellular localization requests
          const subcellularMatch = uri.match(/^hpa:\/\/subcellular\/([^/]+)$/);
          if (subcellularMatch) {
            const gene = decodeURIComponent(subcellularMatch[1]);
            const data = await this.fetchSubcellularLocalization(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle pathology requests
          const pathologyMatch = uri.match(/^hpa:\/\/pathology\/([^/]+)$/);
          if (pathologyMatch) {
            const gene = decodeURIComponent(pathologyMatch[1]);
            const data = await this.fetchPathologyData(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle blood expression requests
          const bloodMatch = uri.match(/^hpa:\/\/blood\/([^/]+)$/);
          if (bloodMatch) {
            const gene = decodeURIComponent(bloodMatch[1]);
            const data = await this.fetchBloodExpression(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle brain expression requests
          const brainMatch = uri.match(/^hpa:\/\/brain\/([^/]+)$/);
          if (brainMatch) {
            const gene = decodeURIComponent(brainMatch[1]);
            const data = await this.fetchBrainExpression(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle antibody information requests
          const antibodyMatch = uri.match(/^hpa:\/\/antibody\/([^/]+)$/);
          if (antibodyMatch) {
            const gene = decodeURIComponent(antibodyMatch[1]);
            const data = await this.fetchAntibodyInfo(gene);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          // Handle search requests
          const searchMatch = uri.match(/^hpa:\/\/search\/(.+)$/);
          if (searchMatch) {
            const query = decodeURIComponent(searchMatch[1]);
            const data = await this.searchProteins(query);
            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid URI format: ${uri}`
          );
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch resource: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Basic search and retrieval tools
        {
          name: 'search_proteins',
          description: 'Search Human Protein Atlas for proteins by name, gene symbol, or description',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query (gene name, protein name, or keyword)' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
              columns: { type: 'array', items: { type: 'string' }, description: 'Specific columns to include in results' },
              maxResults: { type: 'number', description: 'Maximum number of results (1-10000, default: 100)', minimum: 1, maximum: 10000 },
              compress: { type: 'boolean', description: 'Whether to compress the response (default: false)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_protein_info',
          description: 'Get detailed information for a specific protein by gene symbol',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol (e.g., BRCA1, TP53)' },
              format: { type: 'string', enum: ['json', 'tsv', 'xml', 'trig'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        {
          name: 'get_protein_by_ensembl',
          description: 'Get protein information using Ensembl gene ID',
          inputSchema: {
            type: 'object',
            properties: {
              ensemblId: { type: 'string', description: 'Ensembl gene ID (e.g., ENSG00000139618)' },
              format: { type: 'string', enum: ['json', 'tsv', 'xml', 'trig'], description: 'Output format (default: json)' },
            },
            required: ['ensemblId'],
          },
        },
        // Tissue and expression analysis tools
        {
          name: 'get_tissue_expression',
          description: 'Get tissue-specific expression data for a protein',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        {
          name: 'search_by_tissue',
          description: 'Find proteins highly expressed in specific tissues',
          inputSchema: {
            type: 'object',
            properties: {
              tissue: { type: 'string', description: 'Tissue name (e.g., liver, brain, heart)' },
              expressionLevel: { type: 'string', enum: ['high', 'medium', 'low', 'not detected'], description: 'Expression level filter' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
              maxResults: { type: 'number', description: 'Maximum number of results (1-10000, default: 100)', minimum: 1, maximum: 10000 },
            },
            required: ['tissue'],
          },
        },
        {
          name: 'get_blood_expression',
          description: 'Get blood cell expression data for a protein',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        {
          name: 'get_brain_expression',
          description: 'Get brain region expression data for a protein',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        // Subcellular localization tools
        {
          name: 'get_subcellular_location',
          description: 'Get subcellular localization data for a protein',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        {
          name: 'search_by_subcellular_location',
          description: 'Find proteins localized to specific subcellular compartments',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'Subcellular location (e.g., nucleus, mitochondria, cytosol)' },
              reliability: { type: 'string', enum: ['approved', 'enhanced', 'supported', 'uncertain'], description: 'Reliability filter' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
              maxResults: { type: 'number', description: 'Maximum number of results (1-10000, default: 100)', minimum: 1, maximum: 10000 },
            },
            required: ['location'],
          },
        },
        // Pathology and cancer tools
        {
          name: 'get_pathology_data',
          description: 'Get cancer and pathology data for a protein',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        {
          name: 'search_cancer_markers',
          description: 'Find proteins associated with specific cancers or with prognostic value',
          inputSchema: {
            type: 'object',
            properties: {
              cancer: { type: 'string', description: 'Cancer type (e.g., breast cancer, lung cancer)' },
              prognostic: { type: 'string', enum: ['favorable', 'unfavorable'], description: 'Prognostic filter' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
              maxResults: { type: 'number', description: 'Maximum number of results (1-10000, default: 100)', minimum: 1, maximum: 10000 },
            },
            required: [],
          },
        },
        // Antibody and validation tools
        {
          name: 'get_antibody_info',
          description: 'Get antibody validation and staining information for a protein',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
        // Advanced search and batch processing
        {
          name: 'advanced_search',
          description: 'Perform advanced search with multiple filters and criteria',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Base search query' },
              tissueSpecific: { type: 'string', description: 'Tissue-specific expression filter' },
              subcellularLocation: { type: 'string', description: 'Subcellular localization filter' },
              cancerPrognostic: { type: 'string', description: 'Cancer prognostic filter' },
              proteinClass: { type: 'string', description: 'Protein class filter' },
              chromosome: { type: 'string', description: 'Chromosome filter' },
              antibodyReliability: { type: 'string', enum: ['approved', 'enhanced', 'supported', 'uncertain'], description: 'Antibody reliability filter' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
              columns: { type: 'array', items: { type: 'string' }, description: 'Specific columns to include in results' },
              maxResults: { type: 'number', description: 'Maximum number of results (1-10000, default: 100)', minimum: 1, maximum: 10000 },
            },
            required: [],
          },
        },
        {
          name: 'batch_protein_lookup',
          description: 'Look up multiple proteins simultaneously',
          inputSchema: {
            type: 'object',
            properties: {
              genes: { type: 'array', items: { type: 'string' }, description: 'Array of gene symbols (max 100)', minItems: 1, maxItems: 100 },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
              columns: { type: 'array', items: { type: 'string' }, description: 'Specific columns to include in results' },
            },
            required: ['genes'],
          },
        },
        // Analysis and comparison tools
        {
          name: 'compare_expression_profiles',
          description: 'Compare expression profiles between multiple proteins',
          inputSchema: {
            type: 'object',
            properties: {
              genes: { type: 'array', items: { type: 'string' }, description: 'Array of gene symbols to compare (2-10)', minItems: 2, maxItems: 10 },
              expressionType: { type: 'string', enum: ['tissue', 'brain', 'blood', 'single_cell'], description: 'Type of expression data to compare (default: tissue)' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['genes'],
          },
        },
        {
          name: 'get_protein_classes',
          description: 'Get protein classification and functional annotation data',
          inputSchema: {
            type: 'object',
            properties: {
              gene: { type: 'string', description: 'Gene symbol' },
              format: { type: 'string', enum: ['json', 'tsv'], description: 'Output format (default: json)' },
            },
            required: ['gene'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        // Basic search and retrieval tools
        case 'search_proteins':
          return this.handleSearchProteins(args);
        case 'get_protein_info':
          return this.handleGetProteinInfo(args);
        case 'get_protein_by_ensembl':
          return this.handleGetProteinByEnsembl(args);
        // Tissue and expression analysis tools
        case 'get_tissue_expression':
          return this.handleGetTissueExpression(args);
        case 'search_by_tissue':
          return this.handleSearchByTissue(args);
        case 'get_blood_expression':
          return this.handleGetBloodExpression(args);
        case 'get_brain_expression':
          return this.handleGetBrainExpression(args);
        // Subcellular localization tools
        case 'get_subcellular_location':
          return this.handleGetSubcellularLocation(args);
        case 'search_by_subcellular_location':
          return this.handleSearchBySubcellularLocation(args);
        // Pathology and cancer tools
        case 'get_pathology_data':
          return this.handleGetPathologyData(args);
        case 'search_cancer_markers':
          return this.handleSearchCancerMarkers(args);
        // Antibody and validation tools
        case 'get_antibody_info':
          return this.handleGetAntibodyInfo(args);
        // Advanced search and batch processing
        case 'advanced_search':
          return this.handleAdvancedSearch(args);
        case 'batch_protein_lookup':
          return this.handleBatchProteinLookup(args);
        // Analysis and comparison tools
        case 'compare_expression_profiles':
          return this.handleCompareExpressionProfiles(args);
        case 'get_protein_classes':
          return this.handleGetProteinClasses(args);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  // Helper methods for API interactions
  private async searchProteins(query: string, format: string = 'json', columns?: string[], maxResults?: number): Promise<any> {
    // Default columns if none provided - basic protein information
    const defaultColumns = ['g', 'gs', 'eg', 'gd', 'up', 'chr', 'pc', 'pe'];
    const searchColumns = columns && columns.length > 0 ? columns : defaultColumns;

    const params: any = {
      search: query,
      format: format,
      columns: searchColumns.join(','),
      compress: 'no',
    };

    const response = await this.apiClient.get('/api/search_download.php', { params });

    if (format === 'json') {
      return this.parseResponse(response.data, format);
    }

    return response.data;
  }

  private async fetchProteinData(gene: string, format: string = 'json'): Promise<any> {
    // Use searchProteins method which properly handles columns parameter
    return this.searchProteins(gene, format, undefined, 1);
  }

  private async fetchProteinDataByEnsembl(ensemblId: string, format: string = 'json'): Promise<any> {
    const response = await this.apiClient.get(`/${ensemblId}.${format}`);
    return this.parseResponse(response.data, format);
  }

  private async fetchTissueExpression(gene: string): Promise<any> {
    const columns = ['g', 'eg', 'rnats', 'rnatd', 'rnatss', 't_RNA_adipose_tissue', 't_RNA_adrenal_gland', 't_RNA_brain', 't_RNA_breast', 't_RNA_colon', 't_RNA_heart_muscle', 't_RNA_kidney', 't_RNA_liver', 't_RNA_lung', 't_RNA_ovary', 't_RNA_pancreas', 't_RNA_prostate', 't_RNA_skeletal_muscle', 't_RNA_skin_1', 't_RNA_spleen', 't_RNA_stomach_1', 't_RNA_testis', 't_RNA_thyroid_gland'];
    return this.searchProteins(gene, 'json', columns, 1);
  }

  private async fetchSubcellularLocalization(gene: string): Promise<any> {
    const columns = ['g', 'eg', 'scl', 'scml', 'scal', 'relce'];
    return this.searchProteins(gene, 'json', columns, 1);
  }

  private async fetchPathologyData(gene: string): Promise<any> {
    const columns = ['g', 'eg', 'prognostic_Breast_Invasive_Carcinoma_(TCGA)', 'prognostic_Colon_Adenocarcinoma_(TCGA)', 'prognostic_Lung_Adenocarcinoma_(TCGA)', 'prognostic_Prostate_Adenocarcinoma_(TCGA)'];
    return this.searchProteins(gene, 'json', columns, 1);
  }

  private async fetchBloodExpression(gene: string): Promise<any> {
    const columns = ['g', 'eg', 'rnabcs', 'rnabcd', 'rnabcss', 'blood_RNA_basophil', 'blood_RNA_classical_monocyte', 'blood_RNA_eosinophil', 'blood_RNA_neutrophil', 'blood_RNA_NK-cell'];
    return this.searchProteins(gene, 'json', columns, 1);
  }

  private async fetchBrainExpression(gene: string): Promise<any> {
    const columns = ['g', 'eg', 'rnabrs', 'rnabrd', 'rnabrss', 'brain_RNA_amygdala', 'brain_RNA_cerebellum', 'brain_RNA_cerebral_cortex', 'brain_RNA_hippocampal_formation', 'brain_RNA_hypothalamus'];
    return this.searchProteins(gene, 'json', columns, 1);
  }

  private async fetchAntibodyInfo(gene: string): Promise<any> {
    const columns = ['g', 'eg', 'ab', 'abrr', 'relih', 'relmb', 'relce'];
    return this.searchProteins(gene, 'json', columns, 1);
  }

  private parseResponse(data: any, format: string): any {
    if (format === 'json') {
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          // If it's TSV data, convert to JSON-like structure
          const lines = data.split('\n');
          if (lines.length > 1) {
            const headers = lines[0].split('\t');
            const results = [];
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split('\t');
                const row: any = {};
                headers.forEach((header, index) => {
                  row[header] = values[index] || '';
                });
                results.push(row);
              }
            }
            return results;
          }
        }
      }
      return data;
    }
    return data;
  }

  // Tool handler methods
  private async handleSearchProteins(args: any) {
    if (!isValidSearchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid search arguments');
    }

    try {
      const result = await this.searchProteins(args.query, args.format || 'json', args.columns, args.maxResults);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching proteins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetProteinInfo(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchProteinData(args.gene, args.format || 'json');
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching protein info: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetProteinByEnsembl(args: any) {
    if (!isValidEnsemblArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid Ensembl arguments');
    }

    try {
      const result = await this.fetchProteinDataByEnsembl(args.ensemblId, args.format || 'json');
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching protein by Ensembl ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetTissueExpression(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchTissueExpression(args.gene);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching tissue expression: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearchByTissue(args: any) {
    if (!isValidTissueSearchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid tissue search arguments');
    }

    try {
      let searchQuery = `tissue:"${args.tissue}"`;
      if (args.expressionLevel) {
        searchQuery += ` AND expression:"${args.expressionLevel}"`;
      }

      const result = await this.searchProteins(searchQuery, args.format || 'json', undefined, args.maxResults);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching by tissue: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetBloodExpression(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchBloodExpression(args.gene);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching blood expression: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetBrainExpression(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchBrainExpression(args.gene);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching brain expression: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetSubcellularLocation(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchSubcellularLocalization(args.gene);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching subcellular location: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearchBySubcellularLocation(args: any) {
    if (!isValidSubcellularSearchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid subcellular search arguments');
    }

    try {
      let searchQuery = `location:"${args.location}"`;
      if (args.reliability) {
        searchQuery += ` AND reliability:"${args.reliability}"`;
      }

      const result = await this.searchProteins(searchQuery, args.format || 'json', undefined, args.maxResults);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching by subcellular location: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetPathologyData(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchPathologyData(args.gene);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching pathology data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearchCancerMarkers(args: any) {
    if (!isValidPathologySearchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid pathology search arguments');
    }

    try {
      let searchQuery = '';
      if (args.cancer) {
        searchQuery = `cancer:"${args.cancer}"`;
      }
      if (args.prognostic) {
        searchQuery += searchQuery ? ` AND prognostic:"${args.prognostic}"` : `prognostic:"${args.prognostic}"`;
      }
      if (!searchQuery) {
        searchQuery = 'prognostic:*'; // Search for any prognostic markers
      }

      const result = await this.searchProteins(searchQuery, args.format || 'json', undefined, args.maxResults);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching cancer markers: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetAntibodyInfo(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const result = await this.fetchAntibodyInfo(args.gene);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching antibody info: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleAdvancedSearch(args: any) {
    if (!isValidAdvancedSearchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid advanced search arguments');
    }

    try {
      let searchQuery = args.query || '';

      if (args.tissueSpecific) {
        searchQuery += (searchQuery ? ' AND ' : '') + `tissue:"${args.tissueSpecific}"`;
      }
      if (args.subcellularLocation) {
        searchQuery += (searchQuery ? ' AND ' : '') + `location:"${args.subcellularLocation}"`;
      }
      if (args.cancerPrognostic) {
        searchQuery += (searchQuery ? ' AND ' : '') + `prognostic:"${args.cancerPrognostic}"`;
      }
      if (args.proteinClass) {
        searchQuery += (searchQuery ? ' AND ' : '') + `class:"${args.proteinClass}"`;
      }
      if (args.chromosome) {
        searchQuery += (searchQuery ? ' AND ' : '') + `chromosome:"${args.chromosome}"`;
      }
      if (args.antibodyReliability) {
        searchQuery += (searchQuery ? ' AND ' : '') + `reliability:"${args.antibodyReliability}"`;
      }

      if (!searchQuery) {
        searchQuery = '*'; // Search for everything if no criteria specified
      }

      const result = await this.searchProteins(searchQuery, args.format || 'json', args.columns, args.maxResults);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error in advanced search: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleBatchProteinLookup(args: any) {
    if (!isValidBatchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid batch lookup arguments');
    }

    try {
      const results = await Promise.all(
        args.genes.map(async (gene: string) => {
          try {
            const data = await this.fetchProteinData(gene, args.format || 'json');
            return { gene, data, success: true };
          } catch (error) {
            return { gene, error: error instanceof Error ? error.message : 'Unknown error', success: false };
          }
        })
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ batchResults: results }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error in batch lookup: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleCompareExpressionProfiles(args: any) {
    if (!isValidBatchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid comparison arguments');
    }

    try {
      const expressionType = (args as any).expressionType || 'tissue';
      const comparisons = [];

      for (const gene of args.genes) {
        let expressionData;
        switch (expressionType) {
          case 'tissue':
            expressionData = await this.fetchTissueExpression(gene);
            break;
          case 'brain':
            expressionData = await this.fetchBrainExpression(gene);
            break;
          case 'blood':
            expressionData = await this.fetchBloodExpression(gene);
            break;
          default:
            expressionData = await this.fetchTissueExpression(gene);
        }
        comparisons.push({ gene, expressionData });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ expressionComparison: comparisons }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error comparing expression profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetProteinClasses(args: any) {
    if (!isValidGeneArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid gene arguments');
    }

    try {
      const columns = ['g', 'eg', 'pc', 'upbp', 'up_mf', 'pe'];
      const result = await this.searchProteins(args.gene, args.format || 'json', columns, 1);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching protein classes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Human Protein Atlas MCP server running on stdio');
  }
}

const server = new ProteinAtlasServer();
server.run().catch(console.error);
