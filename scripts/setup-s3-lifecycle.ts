/**
 * Sets a 1-year expiration lifecycle rule on the S3 bucket.
 * Run once: npx tsx --env-file=.env.local scripts/setup-s3-lifecycle.ts
 */

import { S3Client, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "expire-after-1-year",
            Status: "Enabled",
            Filter: { Prefix: "" }, // applies to all objects
            Expiration: { Days: 365 },
          },
        ],
      },
    })
  );

  console.log(`✓ Lifecycle rule set: all objects in "${process.env.AWS_S3_BUCKET}" expire after 365 days.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
