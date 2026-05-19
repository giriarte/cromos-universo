import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    APP_AWS_REGION: process.env.APP_AWS_REGION,
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID,
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY,
    APP_S3_BUCKET: process.env.APP_S3_BUCKET,
    APP_SES_REGION: process.env.APP_SES_REGION,
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
