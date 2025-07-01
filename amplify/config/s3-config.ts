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
 
// Define global policy mapping that applies to all buckets
export interface GlobalPolicyMapping {
  groupName: string;
  policies: (bucket: BucketConfig) => PolicyConfig[];
}
 
// S3 Buckets Configuration
export const S3_BUCKETS: Record<string, BucketConfig> = {
  BUCKET_ONE: {
    name: "my-existing-bucket-one",
    bucketName: "my-existing-bucket-one",
    region: AWS_REGIONS.EU_NORTH_1,
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
 
// Global Policy Configurations (applies to all buckets)
export const GLOBAL_POLICIES: GlobalPolicyMapping[] = [
  {
    groupName: USER_GROUPS.ADMIN,
    policies: (bucket: BucketConfig) => [
      {
        name: `AdminFullAccess-${bucket.name}`,
        effect: Effect.ALLOW,
        actions: S3_ACTIONS.FULL_ACCESS,
        resources: [
          `arn:aws:s3:::${bucket.bucketName}/*`,
          `arn:aws:s3:::${bucket.bucketName}`,
        ],
      },
    ],
  },
  {
    groupName: USER_GROUPS.PUBLIC_USER,
    policies: (bucket: BucketConfig) => [
      {
        name: `PublicReadOnly-${bucket.name}`,
        effect: Effect.ALLOW,
        actions: S3_ACTIONS.READ,
        resources: [
          `arn:aws:s3:::${bucket.bucketName}/public/*`,
        ],
      },
    ],
  },
  // Add more global policies as needed
];
 
// Bucket-specific Policy Configurations (override or extend global policies)
export const GROUP_POLICIES: Record<string, GroupPolicyMapping[]> = {
  // Policies for BUCKET_ONE
  BUCKET_ONE: [
    {
      groupName: USER_GROUPS.ADMIN,
      policies: [
        {
          name: "AdminFullAccess",
          effect: Effect.ALLOW,
          actions: S3_ACTIONS.FULL_ACCESS,
          resources: [
            `arn:aws:s3:::${S3_BUCKETS.BUCKET_ONE.bucketName}/*`,
            `arn:aws:s3:::${S3_BUCKETS.BUCKET_ONE.bucketName}`,
          ],
        },
      ],
    },
    {
      groupName: USER_GROUPS.PUBLIC_USER,
      policies: [], // No permissions for public users
    },
  ],
  // Add more bucket-specific policies as needed
};

// Helper function to get bucket by name
export function getBucketByName(bucketName: string): BucketConfig | undefined {
  return Object.values(S3_BUCKETS).find(bucket => bucket.bucketName === bucketName);
}

// Helper function to get policies for a group and bucket
export function getPoliciesForGroupAndBucket(
  groupName: string,
  bucketKey: string
): PolicyConfig[] {
  const bucket = S3_BUCKETS[bucketKey];
  if (!bucket) return [];
  
  // Get bucket-specific policies
  const bucketPolicies = GROUP_POLICIES[bucketKey];
  let specificPolicies: PolicyConfig[] = [];
  
  if (bucketPolicies) {
    const groupMapping = bucketPolicies.find(mapping => mapping.groupName === groupName);
    if (groupMapping) {
      specificPolicies = groupMapping.policies;
    }
  }
  
  // Get global policies that apply to all buckets
  const globalMapping = GLOBAL_POLICIES.find(mapping => mapping.groupName === groupName);
  const globalPolicies = globalMapping ? globalMapping.policies(bucket) : [];
  
  // Combine both policy sets (bucket-specific policies take precedence)
  return [...globalPolicies, ...specificPolicies];
}