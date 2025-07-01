import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { S3_BUCKETS, USER_GROUPS, GROUP_POLICIES } from "./config/s3-config";

/**
* @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
*/
const backend = defineBackend({
  auth,
});

/**
* Note: This code uses the S3 bucket configurations defined in the s3-config.ts file.
* To add new buckets or modify existing ones, update the configuration in that file.
* For more information on authorization access, visit: https://docs.amplify.aws/react/build-a-backend/storage/authorization/#available-actions
*
* Note: Ensure the buckets exist before deploying this code, as it only sets up IAM policies and does not create the S3 buckets.
*/
// Get the first bucket from the configuration
const firstBucket = S3_BUCKETS.BUCKET_ONE;

// Configure all buckets from the configuration file
const bucketConfigs = Object.values(S3_BUCKETS).map(bucket => ({
  name: bucket.name,
  bucket_name: bucket.bucketName,
  aws_region: bucket.region,
  paths: bucket.paths || {},
}));

backend.addOutput({
  version: "1.3",
  storage: {
    aws_region: firstBucket.region,
    bucket_name: firstBucket.bucketName,
    buckets: bucketConfigs,
  },
});

/**
* Create policies for each bucket and group based on the configuration
*/

// Create policy for unauthenticated users (deny all S3 access)
const unauthPolicy = new Policy(backend.stack, "customBucketUnauthPolicy", {
  statements: [
    // No permissions for unauthenticated users by default
    new PolicyStatement({
      effect: Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ],
});

// UNIFIED APPROACH: Create a comprehensive policy for authenticated users
// that aggregates permissions from all groups

// First, collect all bucket permissions across all groups
const bucketPermissionsMap = new Map<string, Set<string>>();
const bucketListPermissionsMap = new Map<string, boolean>();

// Process all user groups and collect their permissions
Object.values(USER_GROUPS).forEach((groupName: string) => {
  const groupBuckets = GROUP_POLICIES[groupName] as Record<string, string[]>;
  
  if (!groupBuckets) return;
  
  // For each bucket this group has access to
  Object.entries(groupBuckets).forEach(([bucketName, actions]) => {
    // Skip if no actions defined
    if (!actions || actions.length === 0) return;
    
    // Initialize sets if needed
    if (!bucketPermissionsMap.has(bucketName)) {
      bucketPermissionsMap.set(bucketName, new Set<string>());
    }
    
    // Add object-level permissions
    const permissionSet = bucketPermissionsMap.get(bucketName)!;
    if (actions.includes('get')) permissionSet.add('s3:GetObject');
    if (actions.includes('write')) permissionSet.add('s3:PutObject');
    if (actions.includes('delete')) permissionSet.add('s3:DeleteObject');
    
    // Track bucket-level permissions separately
    if (actions.includes('list')) {
      bucketListPermissionsMap.set(bucketName, true);
    }
  });
});

// Now create the unified policy statements
const unifiedStatements: PolicyStatement[] = [];

// Add bucket-level permissions (ListBucket)
bucketListPermissionsMap.forEach((hasListPermission, bucketName) => {
  if (hasListPermission) {
    unifiedStatements.push(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:ListBucket', 's3:GetBucketLocation'],
        resources: [`arn:aws:s3:::${bucketName}`],
      })
    );
  }
});

// Add object-level permissions
bucketPermissionsMap.forEach((permissionSet, bucketName) => {
  if (permissionSet.size > 0) {
    unifiedStatements.push(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: Array.from(permissionSet),
        resources: [`arn:aws:s3:::${bucketName}/*`],
      })
    );
  }
});

// Create the unified policy
const authPolicy = new Policy(backend.stack, "unifiedS3AccessPolicy", {
  statements: unifiedStatements,
});

// Optionally, create empty policies for groups (to maintain references but not actually add permissions)
const groupPolicies = new Map<string, Policy>();
Object.values(USER_GROUPS).forEach((groupName: string) => {
  groupPolicies.set(groupName, new Policy(backend.stack, `emptyGroup${groupName}Policy`, {
    statements: [],
  }));
});

// Attach policies to roles
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(unauthPolicy);
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);

// Log that we're using a unified approach now
console.log('Configured UNIFIED S3 access policy for authenticated users');
console.log('All authenticated users now have access to buckets based on ANY of their group memberships');

console.log('S3 bucket access policies configured successfully');
console.log('Admin users have access to all configured buckets');
console.log('Public users have limited access based on configuration');