/*
 * Microsoft Azure.
 * Probes: each region's public Azure AI services endpoint
 * (<region>.api.cognitive.microsoft.com); regions without one use a regional
 * Azure Monitor endpoint instead. These hosts don't send CORS headers, so
 * they are timed with `no-cors` fetches (the response is opaque but the
 * round trip is real).
 * Price index: on-demand general-purpose (D-series) VM cost, eastus = 1.00.
 * CFE: Azure does not publish per-region carbon-free energy, so this is an
 * approximate low-carbon share of the local grid.
 * Pairs: Microsoft's published region pairs. Pairs that point at a
 * restricted-access region are kept for the explanation only.
 */
import { defineCloud } from "../core/registry.js";

const NEWEST = ["mexicocentral", "chilecentral", "indonesiacentral", "malaysiawest", "newzealandnorth"];
const NEWER = ["israelcentral", "italynorth", "polandcentral", "qatarcentral", "spaincentral"];
const LIMITED = ["westcentralus", "australiacentral", "westindia", "koreasouth"];
const MOST = { except: NEWEST };
const BROAD = { except: [...NEWEST, ...LIMITED] };
const ESTABLISHED = { except: [...NEWEST, ...NEWER, ...LIMITED] };
// Regions where the public AI services endpoint does not resolve.
const NO_AI_SERVICES = ["mexicocentral", "chilecentral", "israelcentral", "westindia", "koreasouth", "australiasoutheast", "australiacentral"];

const GPU = [
  "eastus", "eastus2", "centralus", "northcentralus", "southcentralus", "westus", "westus2",
  "westus3", "canadacentral", "brazilsouth", "northeurope", "westeurope", "uksouth",
  "francecentral", "germanywestcentral", "swedencentral", "switzerlandnorth", "norwayeast",
  "polandcentral", "italynorth", "uaenorth", "qatarcentral", "southafricanorth",
  "centralindia", "southindia", "japaneast", "japanwest", "koreacentral", "eastasia",
  "southeastasia", "australiaeast",
];
const OPENAI = [
  "eastus", "eastus2", "northcentralus", "southcentralus", "westus", "westus3",
  "canadaeast", "brazilsouth", "francecentral", "germanywestcentral", "italynorth",
  "norwayeast", "polandcentral", "spaincentral", "swedencentral", "switzerlandnorth",
  "uksouth", "westeurope", "japaneast", "koreacentral", "australiaeast", "southindia",
  "centralindia", "uaenorth", "southafricanorth",
];
const VISION = [
  "eastus", "westus", "westus2", "southcentralus", "westeurope", "northeurope",
  "francecentral", "uksouth", "swedencentral", "switzerlandnorth", "southeastasia",
  "eastasia", "australiaeast", "japaneast", "koreacentral", "centralindia",
];
const AVS = [
  "eastus", "eastus2", "centralus", "northcentralus", "southcentralus", "westus",
  "westus2", "westus3", "canadacentral", "canadaeast", "brazilsouth", "northeurope",
  "westeurope", "uksouth", "ukwest", "francecentral", "germanywestcentral",
  "swedencentral", "switzerlandnorth", "italynorth", "uaenorth", "qatarcentral",
  "southafricanorth", "centralindia", "japaneast", "japanwest", "eastasia",
  "southeastasia", "australiaeast", "australiasoutheast",
];

const AZ = "1,2,3";
const cog = (id) => `${id}.api.cognitive.microsoft.com`;
const mon = (id) => `${id}.monitoring.azure.com`;
const live = (id) => `${id}.livediagnostics.monitor.azure.com`;

export default defineCloud({
  id: "azure",
  name: "Azure",
  short: "Azure",
  baseline: "eastus",
  cfeLabel: "approx. low-carbon share of the local grid (Azure does not publish per-region CFE)",
  cfeShort: "low-carbon grid (est.)",
  zoneName: (id, z) => z,
  probe: {
    mode: "no-cors",
    url: (r, x) => `https://${x.host || cog(r.id)}/`,
    describe: `a public regional endpoint in each region (Azure AI services, or Azure Monitor where AI services aren't offered)`,
  },
  dr: {
    pairs: true,
    note: `Azure publishes <a href="https://learn.microsoft.com/azure/reliability/cross-region-replication-azure" target="_blank" rel="noopener">official region pairs</a>; this tool picks the pair when it meets your requirements, otherwise it falls back to its own rules.`,
  },
  sources: [
    ["products by region", "https://azure.microsoft.com/explore/global-infrastructure/products-by-region/"],
    ["VM pricing", "https://azure.microsoft.com/pricing/details/virtual-machines/"],
    ["region pairs", "https://learn.microsoft.com/azure/reliability/cross-region-replication-azure"],
    ["Azure OpenAI regions", "https://learn.microsoft.com/azure/ai-services/openai/concepts/models"],
    ["Azure status", "https://azure.status.microsoft/"],
  ],

  categories: [
    "Compute", "Containers & serverless", "Databases", "Storage",
    "Data & analytics", "AI & ML", "Networking", "Security & identity",
    "Integration & operations",
  ],
  services: [
    // Compute
    { id: "vm", label: "Virtual Machines", cat: "Compute", where: "all" },
    { id: "gpu", label: "GPU VMs (N-series)", cat: "Compute", where: GPU },
    { id: "vmss", label: "Virtual Machine Scale Sets", cat: "Compute", where: "all" },
    { id: "avd", label: "Azure Virtual Desktop (session hosts)", cat: "Compute", where: MOST },
    { id: "batch", label: "Azure Batch", cat: "Compute", where: MOST },
    { id: "avs", label: "Azure VMware Solution", cat: "Compute", where: AVS },
    { id: "dedicated-host", label: "Dedicated Host", cat: "Compute", where: BROAD },

    // Containers & serverless
    { id: "aks", label: "AKS", cat: "Containers & serverless", where: "all" },
    { id: "container-apps", label: "Container Apps", cat: "Containers & serverless", where: MOST },
    { id: "aci", label: "Container Instances", cat: "Containers & serverless", where: MOST },
    { id: "acr", label: "Container Registry", cat: "Containers & serverless", where: "all" },
    { id: "app-service", label: "App Service", cat: "Containers & serverless", where: "all" },
    { id: "functions", label: "Azure Functions", cat: "Containers & serverless", where: "all" },
    { id: "static-web-apps", label: "Static Web Apps", cat: "Containers & serverless", where: "global" },
    { id: "logic-apps", label: "Logic Apps", cat: "Containers & serverless", where: MOST },
    { id: "service-fabric", label: "Service Fabric", cat: "Containers & serverless", where: BROAD },

    // Databases
    { id: "sql-db", label: "Azure SQL Database", cat: "Databases", where: "all" },
    { id: "sql-mi", label: "Azure SQL Managed Instance", cat: "Databases", where: MOST },
    { id: "cosmos", label: "Cosmos DB", cat: "Databases", where: "all" },
    { id: "postgres", label: "Database for PostgreSQL", cat: "Databases", where: MOST },
    { id: "mysql", label: "Database for MySQL", cat: "Databases", where: MOST },
    { id: "redis", label: "Azure Managed Redis / Cache for Redis", cat: "Databases", where: "all" },
    { id: "dms", label: "Database Migration Service", cat: "Databases", where: BROAD },

    // Storage
    { id: "blob", label: "Blob Storage", cat: "Storage", where: "all" },
    { id: "managed-disks", label: "Managed Disks", cat: "Storage", where: "all" },
    { id: "files", label: "Azure Files", cat: "Storage", where: "all" },
    { id: "adls", label: "Data Lake Storage", cat: "Storage", where: "all" },
    { id: "netapp", label: "Azure NetApp Files", cat: "Storage", where: ESTABLISHED },
    { id: "backup", label: "Azure Backup", cat: "Storage", where: "all" },
    { id: "site-recovery", label: "Azure Site Recovery", cat: "Storage", where: MOST },

    // Data & analytics
    { id: "synapse", label: "Synapse Analytics", cat: "Data & analytics", where: ESTABLISHED },
    { id: "fabric", label: "Microsoft Fabric", cat: "Data & analytics", where: MOST },
    { id: "databricks", label: "Azure Databricks", cat: "Data & analytics", where: BROAD },
    { id: "data-factory", label: "Data Factory", cat: "Data & analytics", where: BROAD },
    { id: "event-hubs", label: "Event Hubs", cat: "Data & analytics", where: "all" },
    { id: "stream-analytics", label: "Stream Analytics", cat: "Data & analytics", where: BROAD },
    { id: "hdinsight", label: "HDInsight", cat: "Data & analytics", where: ESTABLISHED },
    { id: "data-explorer", label: "Data Explorer", cat: "Data & analytics", where: MOST },
    { id: "purview", label: "Microsoft Purview", cat: "Data & analytics", where: ESTABLISHED },

    // AI & ML
    { id: "openai", label: "Azure OpenAI", cat: "AI & ML", where: OPENAI },
    { id: "ai-foundry", label: "Azure AI Foundry", cat: "AI & ML", where: OPENAI },
    { id: "ml", label: "Azure Machine Learning", cat: "AI & ML", where: ESTABLISHED },
    { id: "ai-search", label: "Azure AI Search", cat: "AI & ML", where: BROAD },
    { id: "ai-language", label: "AI Language", cat: "AI & ML", where: { except: NO_AI_SERVICES } },
    { id: "ai-speech", label: "AI Speech", cat: "AI & ML", where: { except: NO_AI_SERVICES } },
    { id: "ai-vision", label: "AI Vision", cat: "AI & ML", where: VISION },
    { id: "doc-intelligence", label: "Document Intelligence", cat: "AI & ML", where: { except: NO_AI_SERVICES } },
    { id: "translator", label: "AI Translator", cat: "AI & ML", where: "global" },

    // Networking
    { id: "vnet", label: "Virtual Network", cat: "Networking", where: "all" },
    { id: "load-balancer", label: "Load Balancer", cat: "Networking", where: "all" },
    { id: "app-gateway", label: "Application Gateway", cat: "Networking", where: "all" },
    { id: "front-door", label: "Front Door & CDN", cat: "Networking", where: "global" },
    { id: "dns", label: "Azure DNS", cat: "Networking", where: "global" },
    { id: "traffic-manager", label: "Traffic Manager", cat: "Networking", where: "global" },
    { id: "expressroute", label: "ExpressRoute", cat: "Networking", where: "all" },
    { id: "vpn-gateway", label: "VPN Gateway", cat: "Networking", where: "all" },
    { id: "firewall", label: "Azure Firewall", cat: "Networking", where: "all" },
    { id: "private-link", label: "Private Link", cat: "Networking", where: "all" },
    { id: "nat-gateway", label: "NAT Gateway", cat: "Networking", where: "all" },

    // Security & identity
    { id: "entra", label: "Microsoft Entra ID", cat: "Security & identity", where: "global" },
    { id: "key-vault", label: "Key Vault", cat: "Security & identity", where: "all" },
    { id: "managed-hsm", label: "Key Vault Managed HSM", cat: "Security & identity", where: ESTABLISHED },
    { id: "defender", label: "Defender for Cloud", cat: "Security & identity", where: "global" },
    { id: "sentinel", label: "Microsoft Sentinel", cat: "Security & identity", where: MOST },
    { id: "ddos", label: "DDoS Protection", cat: "Security & identity", where: "all" },
    { id: "bastion", label: "Azure Bastion", cat: "Security & identity", where: BROAD },

    // Integration & operations
    { id: "service-bus", label: "Service Bus", cat: "Integration & operations", where: "all" },
    { id: "event-grid", label: "Event Grid", cat: "Integration & operations", where: "all" },
    { id: "apim", label: "API Management", cat: "Integration & operations", where: MOST },
    { id: "signalr", label: "SignalR Service", cat: "Integration & operations", where: ESTABLISHED },
    { id: "monitor", label: "Azure Monitor", cat: "Integration & operations", where: "global" },
    { id: "log-analytics", label: "Log Analytics", cat: "Integration & operations", where: "all" },
    { id: "automation", label: "Azure Automation", cat: "Integration & operations", where: BROAD },
  ],

  // [id, city, cc, country, continent, lat, lon, zones, price, cfe, { host, pair }]
  regions: [
    ["eastus", "Virginia", "US", "United States", "NA", 36.67, -78.39, AZ, 1.0, 40, { pair: "westus" }],
    ["eastus2", "Virginia", "US", "United States", "NA", 36.67, -78.39, AZ, 1.0, 40, { pair: "centralus" }],
    ["centralus", "Iowa", "US", "United States", "NA", 41.59, -93.62, AZ, 1.1, 60, { pair: "eastus2" }],
    ["northcentralus", "Illinois", "US", "United States", "NA", 41.88, -87.63, "", 1.05, 55, { pair: "southcentralus" }],
    ["southcentralus", "Texas", "US", "United States", "NA", 29.42, -98.49, AZ, 1.05, 40, { pair: "northcentralus" }],
    ["westcentralus", "Wyoming", "US", "United States", "NA", 41.14, -104.82, "", 1.1, 20, { pair: "westus2" }],
    ["westus", "California", "US", "United States", "NA", 37.78, -122.42, "", 1.2, 60, { pair: "eastus" }],
    ["westus2", "Washington", "US", "United States", "NA", 47.23, -119.85, AZ, 1.0, 85, { pair: "westcentralus" }],
    ["westus3", "Arizona", "US", "United States", "NA", 33.45, -112.07, AZ, 1.0, 45, { pair: "eastus" }],
    ["canadacentral", "Toronto", "CA", "Canada", "NA", 43.65, -79.38, AZ, 1.1, 90, { pair: "canadaeast" }],
    ["canadaeast", "Québec City", "CA", "Canada", "NA", 46.81, -71.21, "", 1.1, 99, { pair: "canadacentral" }],
    ["mexicocentral", "Querétaro", "MX", "Mexico", "NA", 20.59, -100.39, AZ, 1.2, 25, { host: live("mexicocentral") }],
    ["brazilsouth", "São Paulo", "BR", "Brazil", "SA", -23.55, -46.63, AZ, 1.55, 88, { pair: "southcentralus" }],
    ["chilecentral", "Santiago", "CL", "Chile", "SA", -33.45, -70.67, AZ, 1.4, 65, { host: live("chilecentral") }],
    ["northeurope", "Dublin", "IE", "Ireland", "EU", 53.35, -6.26, AZ, 1.05, 45, { pair: "westeurope" }],
    ["westeurope", "Amsterdam", "NL", "Netherlands", "EU", 52.37, 4.9, AZ, 1.15, 55, { pair: "northeurope" }],
    ["uksouth", "London", "GB", "United Kingdom", "EU", 51.51, -0.13, AZ, 1.15, 60, { pair: "ukwest" }],
    ["ukwest", "Cardiff", "GB", "United Kingdom", "EU", 51.48, -3.18, "", 1.18, 60, { pair: "uksouth" }],
    ["francecentral", "Paris", "FR", "France", "EU", 48.86, 2.35, AZ, 1.18, 92, { pair: "francesouth" }],
    ["germanywestcentral", "Frankfurt", "DE", "Germany", "EU", 50.11, 8.68, AZ, 1.18, 55, { pair: "germanynorth" }],
    ["swedencentral", "Gävle", "SE", "Sweden", "EU", 60.67, 17.14, AZ, 1.05, 98, { pair: "swedensouth" }],
    ["switzerlandnorth", "Zürich", "CH", "Switzerland", "EU", 47.38, 8.54, AZ, 1.32, 97, { pair: "switzerlandwest" }],
    ["norwayeast", "Oslo", "NO", "Norway", "EU", 59.91, 10.75, AZ, 1.25, 99, { pair: "norwaywest" }],
    ["polandcentral", "Warsaw", "PL", "Poland", "EU", 52.23, 21.01, AZ, 1.18, 30],
    ["italynorth", "Milan", "IT", "Italy", "EU", 45.46, 9.19, AZ, 1.18, 45],
    ["spaincentral", "Madrid", "ES", "Spain", "EU", 40.42, -3.7, AZ, 1.15, 75],
    ["uaenorth", "Dubai", "AE", "United Arab Emirates", "ME", 25.27, 55.3, AZ, 1.2, 25, { pair: "uaecentral" }],
    ["qatarcentral", "Doha", "QA", "Qatar", "ME", 25.29, 51.53, AZ, 1.2, 2],
    ["israelcentral", "Israel", "IL", "Israel", "ME", 32.09, 34.78, AZ, 1.25, 12, { host: mon("israelcentral") }],
    ["southafricanorth", "Johannesburg", "ZA", "South Africa", "AF", -26.2, 28.05, AZ, 1.25, 15, { pair: "southafricawest" }],
    ["centralindia", "Pune", "IN", "India", "AS", 18.52, 73.86, AZ, 1.05, 25, { pair: "southindia" }],
    ["southindia", "Chennai", "IN", "India", "AS", 13.08, 80.27, "", 1.1, 30, { pair: "centralindia" }],
    ["westindia", "Mumbai", "IN", "India", "AS", 19.08, 72.88, "", 1.15, 25, { pair: "southindia", host: mon("westindia") }],
    ["japaneast", "Tokyo", "JP", "Japan", "AS", 35.68, 139.69, AZ, 1.27, 30, { pair: "japanwest" }],
    ["japanwest", "Osaka", "JP", "Japan", "AS", 34.69, 135.5, AZ, 1.3, 35, { pair: "japaneast" }],
    ["koreacentral", "Seoul", "KR", "South Korea", "AS", 37.57, 126.98, AZ, 1.2, 40, { pair: "koreasouth" }],
    ["koreasouth", "Busan", "KR", "South Korea", "AS", 35.18, 129.08, "", 1.1, 40, { pair: "koreacentral", host: mon("koreasouth") }],
    ["eastasia", "Hong Kong", "HK", "Hong Kong", "AS", 22.32, 114.17, AZ, 1.35, 30, { pair: "southeastasia" }],
    ["southeastasia", "Singapore", "SG", "Singapore", "AS", 1.35, 103.82, AZ, 1.15, 4, { pair: "eastasia" }],
    ["indonesiacentral", "Jakarta", "ID", "Indonesia", "AS", -6.21, 106.85, AZ, 1.2, 15],
    ["malaysiawest", "Kuala Lumpur", "MY", "Malaysia", "AS", 3.14, 101.69, AZ, 1.15, 20],
    ["australiaeast", "Sydney", "AU", "Australia", "OC", -33.87, 151.21, AZ, 1.25, 35, { pair: "australiasoutheast" }],
    ["australiasoutheast", "Melbourne", "AU", "Australia", "OC", -37.81, 144.96, "", 1.25, 40, { pair: "australiaeast", host: mon("australiasoutheast") }],
    ["australiacentral", "Canberra", "AU", "Australia", "OC", -35.28, 149.13, "", 1.3, 35, { pair: "australiacentral2", host: mon("australiacentral") }],
    ["newzealandnorth", "Auckland", "NZ", "New Zealand", "OC", -36.85, 174.76, AZ, 1.3, 85],
  ],

  exports: [
    {
      id: "cli",
      label: "Azure CLI",
      render: (p, d) =>
        `# Default location for this CLI session\n` +
        `az configure --defaults location=${p.id}\n` +
        `\n# Resource groups in each region\n` +
        `az group create --name rg-app-primary --location ${p.id}\n` +
        (d ? `az group create --name rg-app-dr --location ${d.id}\n` : "") +
        `\n# Example: AKS cluster in the primary region${p.zones.length ? ", spread across zones" : ""}\n` +
        `az aks create --resource-group rg-app-primary --name aks-app-primary --location ${p.id}` +
        (p.zones.length ? ` --zones ${p.zones.join(" ")}` : "") +
        `\n` +
        (d
          ? `\n# Example: storage account for backups in the DR region\n` +
            `az storage account create --name YOURSTORAGEDR --resource-group rg-app-dr --location ${d.id} --sku Standard_LRS\n`
          : ""),
    },
    {
      id: "terraform",
      label: "Terraform",
      render: (p, d) =>
        `variable "primary_location" {\n  type    = string\n  default = "${p.id}"\n}\n\n` +
        `variable "dr_location" {\n  type    = string\n  default = "${d ? d.id : "NO_DR_REGION_AVAILABLE"}"\n}\n\n` +
        `provider "azurerm" {\n  features {}\n}\n\n` +
        `resource "azurerm_resource_group" "primary" {\n  name     = "rg-app-primary"\n  location = var.primary_location\n}\n\n` +
        `resource "azurerm_resource_group" "dr" {\n  name     = "rg-app-dr"\n  location = var.dr_location\n}\n`,
    },
  ],
});
