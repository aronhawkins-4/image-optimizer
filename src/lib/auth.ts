import {
	checkout,
	polar,
	portal,
	usage,
	webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import db from "#/db/index";
import * as schema from "#/db/schema";
import { user } from "#/db/schema";

const polarClient = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN,
	server: "sandbox",
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		},
	},
	user: {
		additionalFields: {
			subscriptionProductId: {
				type: "string",
				required: false,
			},
		},
		deleteUser: {
			enabled: true,
			afterDelete: async (user, request) => {
				await polar.customers.deleteExternal({
					externalId: user.id,
				});
			},
		},
	},
	baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
	plugins: [
		tanstackStartCookies(),
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId:
								process.env.VITE_POLAR_PRO_SUBSCRIPTION_PRODUCT_ID || "",
							slug: "pro",
						},
					],
					successUrl: "/success?checkout_id={CHECKOUT_ID}",
					authenticatedUsersOnly: true,
					// An optional URL which renders a back-button in the Checkout
					returnUrl: process.env.VITE_SERVER_URL || "http://localhost:3000",
				}),
				portal(),
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET || "",
					onSubscriptionActive: async (payload) => {
						payload.data.productId ===
							process.env.VITE_POLAR_PRO_SUBSCRIPTION_PRODUCT_ID &&
							console.log("Subscription is active!");
						const matchingUser = (
							await db
								.select()
								.from(user)
								.where(eq(user.id, payload.data.customer.externalId))
								.limit(1)
						)?.at(0);
						if (matchingUser) {
							const updatedUser = await db
								.update(user)
								.set({
									subscriptionProductId: payload.data.productId,
								})
								.where(eq(user.id, matchingUser.id))
								.returning();
							if (updatedUser.length > 0) {
								console.log("User subscription updated:", updatedUser[0]);
							}
						} else {
							console.log(
								"No matching user found for customer with external ID:",
								payload.data.customer.externalId,
							);
						}
					},
				}),
			],
		}),
	],
	secret: process.env.BETTER_AUTH_SECRET,
});
