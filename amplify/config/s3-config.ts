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

// Group Policy Configurations
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
  // Add more bucket policies as needed
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
  const bucketPolicies = GROUP_POLICIES[bucketKey];
  if (!bucketPolicies) return [];

  const groupMapping = bucketPolicies.find(mapping => mapping.groupName === groupName);
  return groupMapping ? groupMapping.policies : [];
}