import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory path in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
});

// Read buckets.json
const bucketsPath = join(__dirname, '..', 'buckets.json');
const bucketsConfig = JSON.parse(readFileSync(bucketsPath, 'utf-8')) as {
  buckets: Array<{
    bucket: string;
    region: string;
    prefix: string;
    id: string;
    type: string;
    permissions: string[];
    accesablegroups: string[];
  }>
};

// Create empty policy for unauthenticated users
const unauthPolicy = new Policy(backend.stack, "customBucketUnauthPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ],
});

// Create policy for authenticated users with access to all buckets
const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      resources: (bucketsConfig as BucketsConfig).buckets.reduce((resources: string[], bucket: BucketConfig) => {
        resources.push(`arn:aws:s3:::${bucket.bucket}`);
        resources.push(`arn:aws:s3:::${bucket.bucket}/*`);
        return resources;
      }, []),
    }),
  ],
});

// Create policies for each group based on bucket access
const groupPolicies = new Map<string, Policy>();

interface BucketConfig {
  bucket: string;
  region: string;
  prefix: string;
  id: string;
  type: string;
  permissions: string[];
  accesablegroups: string[];
}

interface BucketsConfig {
  buckets: BucketConfig[];
}

// Get all unique groups from buckets.json
const allGroups = Array.from(new Set(
  (bucketsConfig as BucketsConfig).buckets.reduce((groups: string[], bucket: BucketConfig) => {
    return groups.concat(bucket.accesablegroups);
  }, [])
));

// Create policies for each group
allGroups.forEach((groupName) => {
  // Get buckets accessible to this group
  const accessibleBuckets = (bucketsConfig as BucketsConfig).buckets.filter((bucket: BucketConfig) => 
    bucket.accesablegroups.includes(groupName)
  );

  // Create policy for this group
  const groupPolicy = new Policy(backend.stack, `customBucket${groupName}Policy`, {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        resources: accessibleBuckets.reduce((resources: string[], bucket: BucketConfig) => {
          resources.push(`arn:aws:s3:::${bucket.bucket}`);
          resources.push(`arn:aws:s3:::${bucket.bucket}/*`);
          return resources;
        }, []),
      }),
    ],
  });

  groupPolicies.set(groupName, groupPolicy);
});

// Attach policies to roles
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(unauthPolicy);
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);

// Attach policies to groups
allGroups.forEach((groupName) => {
  const policy = groupPolicies.get(groupName);
  if (policy && backend.auth.resources.groups[groupName]) {
    backend.auth.resources.groups[groupName].role.attachInlinePolicy(policy);
    console.log(`Attached S3 policy to ${groupName} group`);
  }
});

console.log('S3 bucket access policies configured successfully');