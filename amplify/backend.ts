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
          "*": {
            groupsadmin: ["get", "list", "write", "delete"],
          },
        },
      },
    ],
  },
});

/**
 * Define an inline policy to attach to Amplify's un-auth role
 * This policy defines how unauthenticated users can access your existing bucket
 * For your requirements, unauthenticated users have no access
 */
const unauthPolicy = new Policy(backend.stack, "customBucketUnauthPolicy", {
  statements: [
    // No permissions for unauthenticated users
  ],
});

/**
 * Define an inline policy to attach to Amplify's auth role
 * This policy defines how authenticated users can access your existing bucket
 * For your requirements, regular authenticated users (public group) have no access
 */
const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    // No permissions for regular authenticated users (public group)
  ],
});

/**
 * Define an inline policy to attach to Admin user role
 * This policy defines how admin group users can access your existing bucket
 * Only admin group users have full access to the bucket
 */
const adminPolicy = new Policy(backend.stack, "customBucketAdminPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      resources: [`arn:aws:s3:::${customBucketName}/*`],
    }),
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:ListBucket"],
      resources: [`arn:aws:s3:::${customBucketName}`],
    }),
  ],
});

// Add the empty policy to the unauthenticated user role
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
  unauthPolicy
);

// Add the empty policy to the authenticated user role (public group users)
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);

// Add full access policy to the admin user role
backend.auth.resources.groups["admin"].role.attachInlinePolicy(adminPolicy);

// Add empty policy to the public group role
backend.auth.resources.groups["public"].role.attachInlinePolicy(
  new Policy(backend.stack, "customBucketPublicGroupPolicy", {
    statements: [] // No permissions for public group
  })
);
