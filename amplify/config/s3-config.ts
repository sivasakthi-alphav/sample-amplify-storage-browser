import { Effect } from "aws-cdk-lib/aws-iam";

/**
 * S3 Bucket Configuration
 * 
 * This file contains all the configuration for S3 buckets, policies, and groups.
 * When you need to add a new bucket, policy, or group, just update this file.
 */

// Define regions
export const AWS_REGIONS = {
  EU_NORTH_1: "eu-north-1",
  US_EAST_1: "us-east-1",
  // Add more regions as needed
};

// Define user groups
export const USER_GROUPS = {
  ADMIN: "admin",
  PUBLIC_USER: "publicUser",
  // Add more groups as needed
  // Example: FINANCE: "finance",
};

// Define S3 action types
export const S3_ACTIONS = {
  READ: ["s3:GetObject", "s3:ListBucket"],
  WRITE: ["s3:PutObject"],
  DELETE: ["s3:DeleteObject"],
  FULL_ACCESS: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
  // Add more action combinations as needed
};

// Define bucket configurations
export interface BucketConfig {
  name: string;
  bucketName: string;
  region: string;
  paths?: Record<string, Record<string, string[]>>;
}

// Define policy configurations
export interface PolicyConfig {
  name: string;
  effect: Effect;
  actions: string[];
  resources: string[];
}

// Define group policy mapping
export interface GroupPolicyMapping {
  groupName: string;
  policies: PolicyConfig[];
}

// S3 Buckets Configuration
export const S3_BUCKETS: Record<string, BucketConfig> = {
  BUCKET_ONE: {
    name: "my-existing-bucket-one",
    bucketName: "my-existing-bucket-one",
    region: AWS_REGIONS.EU_NORTH_1,
    paths: {
      "*": {
        groupsadmin: ["get", "list", "write", "delete"],
        groupspublicUser: ["get", "list", "write", "delete"],
      },
    },
  },
  BUCKET_TWO: {
    name: "my-existing-bucket-two",
    bucketName: "my-existing-bucket-two",
    region: AWS_REGIONS.EU_NORTH_1,
    paths: {
      "*": {
        groupsadmin: ["get", "list", "write", "delete"],
        groupspublicUser: ["get", "list", "write", "delete"],
      },
    },
  },
  // Add more buckets as needed
  // Example:
  // BUCKET_TWO: {
  //   name: "my-second-bucket",
  //   bucketName: "my-second-bucket",
  //   region: AWS_REGIONS.US_EAST_1,
  //   paths: {
  //     "public/*": {
  //       groupspublicUser: ["get", "list"],
  //       groupsadmin: ["get", "list", "write", "delete"],
  //     },
  //     "private/*": {
  //       groupsadmin: ["get", "list", "write", "delete"],
  //     },
  //   },
  // },
};

// Group policies structure that applies to all buckets
export const GROUP_POLICIES: Record<string, Record<string, string[]>> = {
  // Define which buckets each group can access
  [USER_GROUPS.ADMIN]: {
    // Admin can access all buckets with full permissions
    "my-existing-bucket-one": ["get", "list", "write", "delete"],
    "my-existing-bucket-two": ["get", "list", "write", "delete"],
    // Add more buckets here as needed
  },
  [USER_GROUPS.PUBLIC_USER]: {
    // Public users can only access specific buckets with limited permissions
    // For example, no access to bucket one
    "my-existing-bucket-one": ["get", "list", "write", "delete"],
    // But read-only access to bucket two
    "my-existing-bucket-two": ["get", "list", "write", "delete"],
    // Add more buckets here as needed
  },
  // Add more groups here as needed
};

// Helper function to generate IAM policy statements for a group
export function generatePolicyStatementsForGroup(groupName: string): PolicyConfig[] {
  const groupBuckets = GROUP_POLICIES[groupName];
  if (!groupBuckets) return [];
  
  const policies: PolicyConfig[] = [];
  
  // Process each bucket for this group
  Object.entries(groupBuckets).forEach(([bucketName, actions]) => {
    // Skip if no actions defined
    if (!actions || actions.length === 0) return;
    
    // Map actions to S3 actions
    const s3Actions: string[] = [];
    if (actions.includes('list')) s3Actions.push('s3:ListBucket');
    if (actions.includes('get')) s3Actions.push('s3:GetObject');
    if (actions.includes('write')) s3Actions.push('s3:PutObject');
    if (actions.includes('delete')) s3Actions.push('s3:DeleteObject');
    
    // Skip if no S3 actions mapped
    if (s3Actions.length === 0) return;
    
    // Create bucket-level policy if needed
    if (s3Actions.includes('s3:ListBucket')) {
      policies.push({
        name: `${groupName}${bucketName}ListPolicy`,
        effect: Effect.ALLOW,
        actions: ['s3:ListBucket', 's3:GetBucketLocation'],
        resources: [`arn:aws:s3:::${bucketName}`],
      });
    }
    
    // Create object-level policy if needed
    const objectActions = s3Actions.filter(action => action !== 's3:ListBucket');
    if (objectActions.length > 0) {
      policies.push({
        name: `${groupName}${bucketName}ObjectPolicy`,
        effect: Effect.ALLOW,
        actions: objectActions,
        resources: [`arn:aws:s3:::${bucketName}/*`],
      });
    }
  });
  
  return policies;
}

// Helper function to get bucket by name
export function getBucketByName(bucketName: string): BucketConfig | undefined {
  return Object.values(S3_BUCKETS).find(bucket => bucket.bucketName === bucketName);
}

// Helper function to get permissions for a group and bucket
export function getPermissionsForGroupAndBucket(
  groupName: string,
  bucketName: string
): string[] {
  const groupBuckets = GROUP_POLICIES[groupName];
  if (!groupBuckets) return [];
  
  return groupBuckets[bucketName] || [];
}