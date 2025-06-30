import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { S3_BUCKETS, GROUP_POLICIES, USER_GROUPS } from "./config/s3-config";

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

// Create empty policies for unauthenticated and authenticated users
const unauthPolicy = new Policy(backend.stack, "customBucketUnauthPolicy", {
  statements: [
    // No permissions for unauthenticated users by default
  ],
});

const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    // No permissions for regular authenticated users by default
  ],
});

// Create policies for each group and bucket
const groupPolicies = new Map();

// Process all bucket policies from the configuration
Object.entries(GROUP_POLICIES).forEach(([bucketKey, groupMappings]) => {
  groupMappings.forEach(mapping => {
    const { groupName, policies } = mapping;
    
    // Skip if no policies defined for this group
    if (!policies || policies.length === 0) return;
    
    // Create policy statements for this group and bucket
    const policyStatements = policies.map(policy => {
      return new PolicyStatement({
        effect: policy.effect,
        actions: policy.actions,
        resources: policy.resources,
      });
    });
    
    // Create or update policy for this group
    if (!groupPolicies.has(groupName)) {
      groupPolicies.set(groupName, new Policy(backend.stack, `customBucket${groupName}Policy`, {
        statements: policyStatements,
      }));
    } else {
      // Add statements to existing policy
      const existingPolicy = groupPolicies.get(groupName);
      policyStatements.forEach(statement => existingPolicy.addStatements(statement));
    }
  });
});

// Get the admin policy or create empty one if not defined
const adminPolicy = groupPolicies.get(USER_GROUPS.ADMIN) || 
  new Policy(backend.stack, "customBucketAdminPolicy", {
    statements: [],
  });

// Add the empty policy to the unauthenticated user role
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
  unauthPolicy
);

// Add the empty policy to the authenticated user role (public group users)
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);

// Attach policies to each group based on the configuration
Object.values(USER_GROUPS).forEach(groupName => {
  const policy = groupPolicies.get(groupName) || 
    new Policy(backend.stack, `customBucket${groupName}Policy`, {
      statements: [] // Empty policy if not defined in configuration
    });
  
  // Attach policy to group role
  if (backend.auth.resources.groups[groupName]) {
    backend.auth.resources.groups[groupName].role.attachInlinePolicy(policy);
  }
});
