import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Singleton — one client per Lambda instance, reused across requests
let _serviceClient: SupabaseClient<any> | null = null;

function peek(value: string | undefined): string {
  if (!value) return "(undefined)";
  return value.slice(0, 5) + "…";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceClient(): SupabaseClient<any> {
  if (_serviceClient) return _serviceClient;

  console.log("[env] NEXT_PUBLIC_SUPABASE_URL   :", peek(process.env.NEXT_PUBLIC_SUPABASE_URL));
  console.log("[env] NEXT_PUBLIC_SUPABASE_ANON_KEY:", peek(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  console.log("[env] SUPABASE_SERVICE_ROLE_KEY  :", peek(process.env.SUPABASE_SERVICE_ROLE_KEY));
  console.log("[env] AUTH_SECRET                :", peek(process.env.AUTH_SECRET));
  console.log("[env] NEXTAUTH_URL               :", peek(process.env.NEXTAUTH_URL));
  console.log("[env] APP_AWS_REGION             :", peek(process.env.APP_AWS_REGION));
  console.log("[env] APP_AWS_ACCESS_KEY_ID      :", peek(process.env.APP_AWS_ACCESS_KEY_ID));
  console.log("[env] APP_AWS_SECRET_ACCESS_KEY  :", peek(process.env.APP_AWS_SECRET_ACCESS_KEY));
  console.log("[env] APP_S3_BUCKET              :", peek(process.env.APP_S3_BUCKET));
  console.log("[env] SES_FROM_EMAIL             :", peek(process.env.SES_FROM_EMAIL));

  _serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  return _serviceClient;
}
