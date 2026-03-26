import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import db from "#/db/index";
import { account, user } from "#/db/schema";
import { sessionMiddleware } from "./session-middleware";

export const getSessionId = createServerFn()
	.middleware([sessionMiddleware])
	.handler(async ({ context }) => {
		return context.sessionId;
	});

export const getSocialProviderForEmail = createServerFn()
	.inputValidator(z.object({ email: z.string().email() }))
	.handler(async ({ data }) => {
		const result = await db
			.select({ providerId: account.providerId })
			.from(account)
			.innerJoin(user, eq(account.userId, user.id))
			.where(and(eq(user.email, data.email), ne(account.providerId, "credential")))
			.limit(1);

		return result.length > 0 ? result[0].providerId : null;
	});
