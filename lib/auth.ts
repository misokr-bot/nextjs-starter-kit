import { db } from "@/db/drizzle";
import { account, session, subscription, user, verification } from "@/db/schema";
// Polar disabled for development without payment features
// import {
//   checkout,
//   polar,
//   portal,
//   usage,
//   webhooks,
// } from "@polar-sh/better-auth";
// import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

// Utility function to safely parse dates
function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

// Polar disabled for development without payment features
// const polarClient = new Polar({
//   accessToken: process.env.POLAR_ACCESS_TOKEN,
//   server: "sandbox",
// });

export const auth = betterAuth({
  trustedOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  allowedDevOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // Cache duration in seconds
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      subscription,
    },
  }),
  // Google OAuth - optional, only enabled if credentials are provided
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  plugins: [
    // Polar plugin disabled for development without payment features
    // polar({
    //   client: polarClient,
    //   createCustomerOnSignUp: true,
    //   use: [
    //     checkout({
    //       products: [
    //         {
    //           productId: process.env.NEXT_PUBLIC_STARTER_TIER || "",
    //           slug: process.env.NEXT_PUBLIC_STARTER_SLUG || "",
    //         },
    //       ],
    //       successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${process.env.POLAR_SUCCESS_URL}`,
    //       authenticatedUsersOnly: true,
    //     }),
    //     portal(),
    //     usage(),
    //     webhooks({
    //       secret: process.env.POLAR_WEBHOOK_SECRET || "",
    //       onPayload: async ({ data, type }) => {
    //         // Webhook handling code...
    //       },
    //     }),
    //   ],
    // }),
    nextCookies(),
  ],
});
