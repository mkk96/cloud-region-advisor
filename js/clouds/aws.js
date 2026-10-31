/*
 * Amazon Web Services.
 * Probes: DynamoDB's public regional health endpoint
 * (https://dynamodb.<region>.amazonaws.com/ping), which allows CORS.
 * Price index: on-demand general-purpose EC2 cost, us-east-1 = 1.00.
 * CFE: AWS does not publish per-region carbon-free energy, so this is an
 * approximate low-carbon share of the local grid.
 */
import { defineCloud } from "../core/registry.js";

// Regions launched most recently carry the fewest services.
const NEWEST = ["mx-central-1", "ap-southeast-5", "ap-southeast-6", "ap-southeast-7", "ap-east-2", "ca-west-1"];
const NEWER = ["eu-central-2", "eu-south-2", "ap-south-2", "ap-southeast-4", "me-central-1", "il-central-1"];
const MOST = { except: NEWEST };
const ESTABLISHED = { except: [...NEWEST, ...NEWER] };

const CORE_AI = [
  "us-east-1", "us-east-2", "us-west-2", "ca-central-1", "eu-west-1", "eu-west-2",
  "eu-central-1", "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
  "ap-northeast-2",
];
const BEDROCK = [
  "us-east-1", "us-east-2", "us-west-2", "ca-central-1", "sa-east-1", "eu-west-1",
  "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2", "eu-north-1", "eu-south-1",
  "eu-south-2", "ap-south-1", "ap-south-2", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
];
const GPU = {
  except: [...NEWEST, "eu-central-2", "eu-south-2", "ap-southeast-4", "me-south-1"],
};
const TRAINIUM = ["us-east-1", "us-east-2", "us-west-2", "eu-north-1", "ap-northeast-1", "ap-southeast-2"];
const INFERENTIA = [
  "us-east-1", "us-east-2", "us-west-2", "ca-central-1", "sa-east-1", "eu-west-1",
  "eu-west-3", "eu-central-1", "ap-south-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1",
];
const APP_RUNNER = [
  "us-east-1", "us-east-2", "us-west-2", "eu-west-1", "eu-west-2", "eu-west-3",
  "eu-central-1", "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
];
const LIGHTSAIL = [
  "us-east-1", "us-east-2", "us-west-2", "ca-central-1", "eu-west-1", "eu-west-2",
  "eu-west-3", "eu-central-1", "eu-north-1", "ap-south-1", "ap-southeast-1",
  "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
];
const QUICKSIGHT = [
  "us-east-1", "us-east-2", "us-west-2", "ca-central-1", "sa-east-1", "eu-west-1",
  "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2", "eu-north-1", "eu-south-1",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
];
const TIMESTREAM = [
  "us-east-1", "us-east-2", "us-west-2", "eu-west-1", "eu-central-1", "ap-south-1",
  "ap-southeast-2", "ap-northeast-1",
];
const LEX = [
  "us-east-1", "us-west-2", "ca-central-1", "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "af-south-1",
];
const KENDRA = [
  "us-east-1", "us-east-2", "us-west-2", "ca-central-1", "eu-west-1", "eu-west-2",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
];

// Availability Zone suffixes; us-west-1 and ap-northeast-1 expose non-contiguous letters.
const AZ3 = "a,b,c";

export default defineCloud({
  id: "aws",
  name: "AWS",
  short: "AWS",
  baseline: "us-east-1",
  cfeLabel: "approx. low-carbon share of the local grid (AWS does not publish per-region CFE)",
  cfeShort: "low-carbon grid (est.)",
  zoneName: (id, z) => `${id}${z}`,
  probe: {
    mode: "cors",
    url: (r) => `https://dynamodb.${r.id}.amazonaws.com/ping`,
    describe: `the public DynamoDB health endpoint in each region (<code>dynamodb.&lt;region&gt;.amazonaws.com/ping</code>)`,
  },
  dr: {
    note: `AWS publishes no official region pairs. These DR rules are this tool's own — see the <a href="https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" target="_blank" rel="noopener">AWS disaster-recovery whitepaper</a>.`,
  },
  sources: [
    ["regional product services", "https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/"],
    ["EC2 pricing", "https://aws.amazon.com/ec2/pricing/on-demand/"],
    ["Bedrock model regions", "https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html"],
    ["Regions and Zones", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html"],
    ["Health Dashboard", "https://health.aws.amazon.com/health/status"],
  ],

  categories: [
    "Compute", "Containers & serverless", "Databases", "Storage",
    "Data & analytics", "AI & ML", "Networking", "Security & identity",
    "Integration & operations",
  ],
  services: [
    // Compute
    { id: "ec2", label: "EC2", cat: "Compute", where: "all" },
    { id: "gpu", label: "GPU instances (P / G family)", cat: "Compute", where: GPU },
    { id: "trainium", label: "Trainium (Trn)", cat: "Compute", where: TRAINIUM },
    { id: "inferentia", label: "Inferentia (Inf)", cat: "Compute", where: INFERENTIA },
    { id: "graviton", label: "Graviton (Arm) instances", cat: "Compute", where: "all" },
    { id: "batch", label: "AWS Batch", cat: "Compute", where: MOST },
    { id: "lightsail", label: "Lightsail", cat: "Compute", where: LIGHTSAIL },
    { id: "outposts", label: "Outposts (home region)", cat: "Compute", where: ESTABLISHED },

    // Containers & serverless
    { id: "lambda", label: "Lambda", cat: "Containers & serverless", where: "all" },
    { id: "ecs", label: "ECS", cat: "Containers & serverless", where: "all" },
    { id: "eks", label: "EKS", cat: "Containers & serverless", where: "all" },
    { id: "fargate", label: "Fargate", cat: "Containers & serverless", where: MOST },
    { id: "ecr", label: "ECR", cat: "Containers & serverless", where: "all" },
    { id: "app-runner", label: "App Runner", cat: "Containers & serverless", where: APP_RUNNER },
    { id: "beanstalk", label: "Elastic Beanstalk", cat: "Containers & serverless", where: MOST },
    { id: "step-functions", label: "Step Functions", cat: "Containers & serverless", where: "all" },
    { id: "eventbridge", label: "EventBridge", cat: "Containers & serverless", where: "all" },
    { id: "api-gateway", label: "API Gateway", cat: "Containers & serverless", where: "all" },

    // Databases
    { id: "rds", label: "RDS (MySQL / PostgreSQL / SQL Server / Oracle)", cat: "Databases", where: "all" },
    { id: "aurora", label: "Aurora", cat: "Databases", where: MOST },
    { id: "aurora-dsql", label: "Aurora DSQL", cat: "Databases", where: ["us-east-1", "us-east-2", "us-west-2", "eu-west-1", "eu-west-2", "eu-west-3", "ap-northeast-1", "ap-northeast-3", "ap-northeast-2"] },
    { id: "dynamodb", label: "DynamoDB", cat: "Databases", where: "all" },
    { id: "elasticache", label: "ElastiCache", cat: "Databases", where: "all" },
    { id: "memorydb", label: "MemoryDB", cat: "Databases", where: ESTABLISHED },
    { id: "documentdb", label: "DocumentDB", cat: "Databases", where: { except: [...NEWEST, ...NEWER, "af-south-1", "me-south-1"] } },
    { id: "neptune", label: "Neptune", cat: "Databases", where: ESTABLISHED },
    { id: "keyspaces", label: "Keyspaces (Cassandra)", cat: "Databases", where: MOST },
    { id: "timestream", label: "Timestream", cat: "Databases", where: TIMESTREAM },
    { id: "dms", label: "Database Migration Service", cat: "Databases", where: "all" },

    // Storage
    { id: "s3", label: "S3", cat: "Storage", where: "all" },
    { id: "ebs", label: "EBS", cat: "Storage", where: "all" },
    { id: "efs", label: "EFS", cat: "Storage", where: "all" },
    { id: "fsx", label: "FSx", cat: "Storage", where: MOST },
    { id: "glacier", label: "S3 Glacier", cat: "Storage", where: "all" },
    { id: "backup", label: "AWS Backup", cat: "Storage", where: "all" },
    { id: "storage-gateway", label: "Storage Gateway", cat: "Storage", where: MOST },
    { id: "datasync", label: "DataSync", cat: "Storage", where: MOST },

    // Data & analytics
    { id: "redshift", label: "Redshift", cat: "Data & analytics", where: MOST },
    { id: "athena", label: "Athena", cat: "Data & analytics", where: MOST },
    { id: "emr", label: "EMR", cat: "Data & analytics", where: MOST },
    { id: "glue", label: "Glue", cat: "Data & analytics", where: MOST },
    { id: "kinesis", label: "Kinesis Data Streams", cat: "Data & analytics", where: "all" },
    { id: "firehose", label: "Data Firehose", cat: "Data & analytics", where: MOST },
    { id: "msk", label: "MSK (Kafka)", cat: "Data & analytics", where: MOST },
    { id: "opensearch", label: "OpenSearch Service", cat: "Data & analytics", where: MOST },
    { id: "quicksight", label: "QuickSight", cat: "Data & analytics", where: QUICKSIGHT },
    { id: "lake-formation", label: "Lake Formation", cat: "Data & analytics", where: MOST },

    // AI & ML
    { id: "bedrock", label: "Bedrock (generative AI)", cat: "AI & ML", where: BEDROCK },
    { id: "sagemaker", label: "SageMaker AI", cat: "AI & ML", where: MOST },
    { id: "q-business", label: "Amazon Q Business", cat: "AI & ML", where: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-2"] },
    { id: "rekognition", label: "Rekognition", cat: "AI & ML", where: [...CORE_AI, "us-west-1"] },
    { id: "textract", label: "Textract", cat: "AI & ML", where: [...CORE_AI, "us-west-1", "eu-west-3"] },
    { id: "comprehend", label: "Comprehend", cat: "AI & ML", where: CORE_AI },
    { id: "transcribe", label: "Transcribe", cat: "AI & ML", where: ESTABLISHED },
    { id: "polly", label: "Polly", cat: "AI & ML", where: ESTABLISHED },
    { id: "translate", label: "Translate", cat: "AI & ML", where: ESTABLISHED },
    { id: "lex", label: "Lex", cat: "AI & ML", where: LEX },
    { id: "kendra", label: "Kendra", cat: "AI & ML", where: KENDRA },

    // Networking
    { id: "vpc", label: "VPC", cat: "Networking", where: "all" },
    { id: "elb", label: "Elastic Load Balancing", cat: "Networking", where: "all" },
    { id: "cloudfront", label: "CloudFront", cat: "Networking", where: "global" },
    { id: "route53", label: "Route 53", cat: "Networking", where: "global" },
    { id: "global-accelerator", label: "Global Accelerator", cat: "Networking", where: "global" },
    { id: "direct-connect", label: "Direct Connect", cat: "Networking", where: "all" },
    { id: "transit-gateway", label: "Transit Gateway", cat: "Networking", where: "all" },
    { id: "privatelink", label: "PrivateLink", cat: "Networking", where: "all" },
    { id: "vpn", label: "Site-to-Site VPN", cat: "Networking", where: "all" },

    // Security & identity
    { id: "iam", label: "IAM", cat: "Security & identity", where: "global" },
    { id: "kms", label: "KMS", cat: "Security & identity", where: "all" },
    { id: "cloudhsm", label: "CloudHSM", cat: "Security & identity", where: MOST },
    { id: "secrets-manager", label: "Secrets Manager", cat: "Security & identity", where: "all" },
    { id: "acm", label: "Certificate Manager", cat: "Security & identity", where: "all" },
    { id: "cognito", label: "Cognito", cat: "Security & identity", where: MOST },
    { id: "guardduty", label: "GuardDuty", cat: "Security & identity", where: "all" },
    { id: "security-hub", label: "Security Hub", cat: "Security & identity", where: "all" },
    { id: "waf", label: "WAF", cat: "Security & identity", where: "all" },
    { id: "shield", label: "Shield", cat: "Security & identity", where: "global" },

    // Integration & operations
    { id: "sqs", label: "SQS", cat: "Integration & operations", where: "all" },
    { id: "sns", label: "SNS", cat: "Integration & operations", where: "all" },
    { id: "mq", label: "Amazon MQ", cat: "Integration & operations", where: MOST },
    { id: "appsync", label: "AppSync", cat: "Integration & operations", where: MOST },
    { id: "cloudwatch", label: "CloudWatch", cat: "Integration & operations", where: "all" },
    { id: "cloudtrail", label: "CloudTrail", cat: "Integration & operations", where: "all" },
    { id: "systems-manager", label: "Systems Manager", cat: "Integration & operations", where: "all" },
    { id: "cloudformation", label: "CloudFormation", cat: "Integration & operations", where: "all" },
  ],

  // [id, city, cc, country, continent, lat, lon, zones, price, cfe]
  regions: [
    ["us-east-1", "N. Virginia", "US", "United States", "NA", 38.95, -77.45, "a,b,c,d,e,f", 1.0, 40],
    ["us-east-2", "Ohio", "US", "United States", "NA", 39.96, -83.0, AZ3, 1.0, 40],
    ["us-west-1", "N. California", "US", "United States", "NA", 37.35, -121.96, "a,c", 1.17, 60],
    ["us-west-2", "Oregon", "US", "United States", "NA", 45.84, -119.7, "a,b,c,d", 1.0, 75],
    ["ca-central-1", "Montréal", "CA", "Canada", "NA", 45.5, -73.57, "a,b,d", 1.1, 99],
    ["ca-west-1", "Calgary", "CA", "Canada", "NA", 51.05, -114.07, AZ3, 1.1, 15],
    ["mx-central-1", "Querétaro", "MX", "Mexico", "NA", 20.59, -100.39, AZ3, 1.15, 25],
    ["sa-east-1", "São Paulo", "BR", "Brazil", "SA", -23.55, -46.63, AZ3, 1.6, 88],
    ["eu-west-1", "Dublin", "IE", "Ireland", "EU", 53.35, -6.26, AZ3, 1.11, 45],
    ["eu-west-2", "London", "GB", "United Kingdom", "EU", 51.51, -0.13, AZ3, 1.16, 60],
    ["eu-west-3", "Paris", "FR", "France", "EU", 48.86, 2.35, AZ3, 1.17, 92],
    ["eu-central-1", "Frankfurt", "DE", "Germany", "EU", 50.11, 8.68, AZ3, 1.19, 55],
    ["eu-central-2", "Zürich", "CH", "Switzerland", "EU", 47.38, 8.54, AZ3, 1.31, 97],
    ["eu-north-1", "Stockholm", "SE", "Sweden", "EU", 59.33, 18.07, AZ3, 1.06, 98],
    ["eu-south-1", "Milan", "IT", "Italy", "EU", 45.46, 9.19, AZ3, 1.17, 45],
    ["eu-south-2", "Aragón", "ES", "Spain", "EU", 41.65, -0.88, AZ3, 1.12, 75],
    ["me-south-1", "Bahrain", "BH", "Bahrain", "ME", 26.07, 50.56, AZ3, 1.22, 1],
    ["me-central-1", "UAE", "AE", "United Arab Emirates", "ME", 24.45, 54.38, AZ3, 1.22, 25],
    ["il-central-1", "Tel Aviv", "IL", "Israel", "ME", 32.09, 34.78, AZ3, 1.2, 12],
    ["af-south-1", "Cape Town", "ZA", "South Africa", "AF", -33.92, 18.42, AZ3, 1.31, 15],
    ["ap-south-1", "Mumbai", "IN", "India", "AS", 19.08, 72.88, AZ3, 1.05, 25],
    ["ap-south-2", "Hyderabad", "IN", "India", "AS", 17.39, 78.49, AZ3, 1.05, 25],
    ["ap-southeast-1", "Singapore", "SG", "Singapore", "AS", 1.35, 103.82, AZ3, 1.25, 4],
    ["ap-southeast-2", "Sydney", "AU", "Australia", "OC", -33.87, 151.21, AZ3, 1.25, 35],
    ["ap-southeast-3", "Jakarta", "ID", "Indonesia", "AS", -6.21, 106.85, AZ3, 1.25, 15],
    ["ap-southeast-4", "Melbourne", "AU", "Australia", "OC", -37.81, 144.96, AZ3, 1.25, 40],
    ["ap-southeast-5", "Malaysia", "MY", "Malaysia", "AS", 3.14, 101.69, AZ3, 1.15, 20],
    ["ap-southeast-6", "New Zealand", "NZ", "New Zealand", "OC", -36.85, 174.76, AZ3, 1.3, 85],
    ["ap-southeast-7", "Thailand", "TH", "Thailand", "AS", 13.75, 100.5, AZ3, 1.15, 20],
    ["ap-northeast-1", "Tokyo", "JP", "Japan", "AS", 35.68, 139.69, "a,c,d", 1.29, 30],
    ["ap-northeast-2", "Seoul", "KR", "South Korea", "AS", 37.57, 126.98, "a,b,c,d", 1.23, 40],
    ["ap-northeast-3", "Osaka", "JP", "Japan", "AS", 34.69, 135.5, AZ3, 1.29, 35],
    ["ap-east-1", "Hong Kong", "HK", "Hong Kong", "AS", 22.32, 114.17, AZ3, 1.38, 30],
    ["ap-east-2", "Taipei", "TW", "Taiwan", "AS", 25.03, 121.57, AZ3, 1.3, 20],
  ],

  exports: [
    {
      id: "cli",
      label: "AWS CLI",
      render: (p, d) =>
        `# Default region for the CLI, plus a "dr" profile\n` +
        `aws configure set region ${p.id}\n` +
        (d ? `aws configure set region ${d.id} --profile dr\n` : "") +
        `\n# Example: EKS cluster in each region (eksctl)\n` +
        `eksctl create cluster --name app-primary --region ${p.id}\n` +
        (d ? `eksctl create cluster --name app-dr --region ${d.id}\n` : "") +
        (d
          ? `\n# Example: S3 bucket for backups in the DR region\n` +
            `aws s3api create-bucket --bucket YOUR_BUCKET-dr --region ${d.id}` +
            (d.id === "us-east-1" ? "\n" : ` \\\n  --create-bucket-configuration LocationConstraint=${d.id}\n`)
          : ""),
    },
    {
      id: "terraform",
      label: "Terraform",
      render: (p, d) =>
        `variable "primary_region" {\n  type    = string\n  default = "${p.id}"\n}\n\n` +
        `variable "dr_region" {\n  type    = string\n  default = "${d ? d.id : "NO_DR_REGION_AVAILABLE"}"\n}\n\n` +
        `provider "aws" {\n  region = var.primary_region\n}\n\n` +
        `provider "aws" {\n  alias  = "dr"\n  region = var.dr_region\n}\n\n` +
        `# Example: backup bucket in the DR region\n` +
        `resource "aws_s3_bucket" "dr_backups" {\n  provider = aws.dr\n  bucket   = "YOUR_BUCKET-dr-backups"\n}\n`,
    },
  ],
});
