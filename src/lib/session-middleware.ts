import { randomUUID } from "node:crypto";
import { createMiddleware } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export const sessionMiddleware = createMiddleware().server(async ({ next }) => {
	let sessionId = getCookie("session_id");
	if (!sessionId) {
		sessionId = randomUUID();
		setCookie("session_id", sessionId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24, // 1 day
			path: "/",
		});
	}
	return next({ context: { sessionId } });
});
