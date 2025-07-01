import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { S3_BUCKETS, USER_GROUPS, generatePolicyStatementsForGroup } from "./config/s3-config";

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
    new PolicyStatement({
      effect: Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ],
});

const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    // No permissions for regular authenticated users by default
    new PolicyStatement({
      effect: Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ],
});

// Create policies for each group based on the new GROUP_POLICIES structure
const groupPolicies = new Map<string, Policy>();

// Process all user groups
Object.values(USER_GROUPS).forEach((groupName: string) => {
  // Generate policy statements for this group using our helper function
  const policyStatements = generatePolicyStatementsForGroup(groupName);
  
  // Create a policy for this group if there are any statements
  if (policyStatements.length > 0) {
    // Convert PolicyConfig objects to PolicyStatement objects
    const statements = policyStatements.map(policy => {
      return new PolicyStatement({
        effect: policy.effect,
        actions: policy.actions,
        resources: policy.resources,
      });
    });
    
    // Create a policy for this group
    groupPolicies.set(groupName, new Policy(backend.stack, `customBucket${groupName}Policy`, {
      statements,
    }));
  } else {
    // Create an empty policy for groups with no permissions
    groupPolicies.set(groupName, new Policy(backend.stack, `customBucket${groupName}Policy`, {
      statements: [],
    }));
  }
});

// Add the policy to the unauthenticated user role
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
  unauthPolicy
);

// Add the policy to the authenticated user role
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);

// Attach policies to each group based on the configuration
Object.values(USER_GROUPS).forEach((groupName: string) => {
  const policy = groupPolicies.get(groupName);
  
  // Attach policy to group role if it exists
  if (policy && backend.auth.resources.groups[groupName]) {
    backend.auth.resources.groups[groupName].role.attachInlinePolicy(policy);
    console.log(`Attached S3 policy to ${groupName} group`);
  }
});

console.log('S3 bucket access policies configured successfully');
console.log('Admin users have access to all configured buckets');
console.log('Public users have limited access based on configuration');