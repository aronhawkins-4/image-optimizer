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
import { and, eq } from "drizzle-orm";
import db from "#/db/index";
import * as schema from "#/db/schema";
import { user } from "#/db/schema";
import { slugify } from "./utils";

export const polarClient = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN,
	server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
});

let productItems: Awaited<
	ReturnType<typeof polarClient.products.list>
>["result"]["items"] = [];

try {
	const products = await polarClient.products.list({ limit: 100 });
	productItems = products.result?.items ?? [];
} catch (err) {
	console.error("Failed to fetch Polar products:", err);
}

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
			afterDelete: async (user) => {
				await polarClient.customers.deleteExternal({
					externalId: user.id,
				});
			},
		},
	},
	baseURL: process.env.VITE_SERVER_URL || "http://localhost:3000",
	plugins: [
		tanstackStartCookies(),
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: productItems.map((p) => ({
						productId: p.id,
						slug: slugify(p.name),
					})),
					successUrl: "/?checkout_id={CHECKOUT_ID}",
					authenticatedUsersOnly: true,
					// An optional URL which renders a back-button in the Checkout
					returnUrl: process.env.VITE_SERVER_URL || "http://localhost:3000",
				}),
				portal({
					returnUrl: process.env.VITE_SERVER_URL || "http://localhost:3000",
				}),
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET || "",
					onSubscriptionActive: async (payload) => {
						const matchingUser = (
							await db
								.select()
								.from(user)
								.where(eq(user.id, payload?.data?.customer?.externalId || ""))
								.limit(1)
						)?.at(0);
						console.log("Matching user for activation:", matchingUser);
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
					onSubscriptionCanceled: async (payload) => {
						const matchingUser = (
							await db
								.select()
								.from(user)
								.where(
									and(
										eq(user.id, payload?.data?.customer?.externalId || ""),
										eq(user.subscriptionProductId, payload.data.productId),
									),
								)
								.limit(1)
						)?.at(0);
						console.log("Matching user for cancellation:", matchingUser);
						if (matchingUser) {
							const updatedUser = await db
								.update(user)
								.set({
									subscriptionProductId: null,
								})
								.where(eq(user.id, matchingUser.id))
								.returning();
							if (updatedUser.length > 0) {
								console.log("User subscription cleared:", updatedUser[0]);
							}
						}
					},
				}),
			],
		}),
	],
	secret: process.env.BETTER_AUTH_SECRET,
});
