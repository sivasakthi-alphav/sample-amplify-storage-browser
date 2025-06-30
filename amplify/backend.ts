import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
});

/**
 * Note: This code assumes the existence of an S3 bucket named 'my-existing-bucket'.
 * Replace 'my-existing-bucket' with your actual bucket name and adjust the paths and permissions as needed.
 * For more information on authorization access, visit: https://docs.amplify.aws/react/build-a-backend/storage/authorization/#available-actions
 *
 * Requirements for this sample:
 * 1. An S3 bucket named 'my-existing-bucket' must exist in your AWS account.
 * 2. The bucket should contain two folders:
 *    - 'public/' - Accessible by all authenticated and unauthenticated users.
 *    - 'admin/' - Accessible only by users in the admin group and authenticated users.
 *
 * Note: Ensure the bucket exists before deploying this code, as it only sets up IAM policies and does not create the S3 bucket.
 */
const customBucketName = "my-existing-bucket-one";

backend.addOutput({
  version: "1.3",
  storage: {
    aws_region: "eu-north-1",
    bucket_name: customBucketName,
    buckets: [
      {
        name: customBucketName,
        bucket_name: customBucketName,
        aws_region: "eu-north-1",
        //@ts-expect-error amplify backend type issue https://github.com/aws-amplify/amplify-backend/issues/2569
        paths: {
          "public/*": {
            // Only admin group can access public folder
            groupsadmin: ["get", "list", "write", "delete"],
            // No access for regular authenticated users
          },
          "admin/*": {
            // Only admin group can access admin folder
            groupsadmin: ["get", "list", "write", "delete"],
            // No access for regular authenticated users
          },
        },
      },
    ],
  },
});

/**
 * Define an inline policy to attach to Amplify's un-auth role
 * This policy defines how unauthenticated users can access your existing bucket
 * For this use case, we're not allowing any access to unauthenticated users
 */
const unauthPolicy = new Policy(backend.stack, "customBucketUnauthPolicy", {
  statements: [
    // No statements = no permissions
  ],
});

/**
 * Define an inline policy to attach to Amplify's auth role
 * This policy defines how authenticated users can access your existing bucket
 * For this use case, default group users (regular authenticated users) have no access
 */
const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    // No statements = no permissions for regular authenticated users
    // This ensures users in the 'default' group (which is all authenticated users
    // not in the admin group) won't have any access to the bucket
  ],
});

/**
 * Define an inline policy to attach to Admin user role
 * This policy defines how admin users can access your existing bucket
 * Only users in the admin group will have access to the bucket
 */
const adminPolicy = new Policy(backend.stack, "customBucketAdminPolicy", {
  statements: [
    // Full CRUD access to both public and admin folders
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      resources: [
        `arn:aws:s3:::${customBucketName}/public/*`,
        `arn:aws:s3:::${customBucketName}/admin/*`
      ],
    }),
    // Allow listing the entire bucket
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:ListBucket"],
      resources: [
        `arn:aws:s3:::${customBucketName}`,
        `arn:aws:s3:::${customBucketName}/*`,
      ],
      conditions: {
        StringLike: {
          "s3:prefix": ["public/*", "public/", "admin/*", "admin/"],
        },
      },
    }),
  ],
});

// Add the policies to the unauthenticated user role
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
  unauthPolicy
);

// Add the policies to the authenticated user role
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);

// Add the policies to the admin user role
backend.auth.resources.groups["admin"].role.attachInlinePolicy(adminPolicy);
