import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import db from "#/db/index";
import { optimizations } from "#/db/schema";
import { auth } from "./auth";
import { UNAUTHORIZED_OPTIMIZATION_LIMIT } from "./constants";

const inputSchema = z.object({
	file: z.instanceof(File),
	fileType: z.enum(["webp", "avif", "png", "jpg", "jpeg"]),
	quality: z.string(),
	width: z.string().optional(),
	userId: z.string().optional(),
	sessionId: z.string(),
});

export const optimizeImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		if (!(data instanceof FormData)) {
			throw new Error("Expected FormData");
		}
		if (!data.get("sessionId") || data.get("sessionId") === "undefined") {
			throw new Error("Session ID is required");
		}
		return inputSchema.parse({
			file: data.get("file"),
			fileType: data.get("fileType"),
			quality: data.get("quality"),
			width: data.get("width") || undefined,
			userId: data.get("userId") || undefined,
			sessionId: data.get("sessionId"),
		});
	})
	.handler(async ({ data }) => {
		const { file, fileType: type, quality, width, sessionId } = data;
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		const user = session?.user;

		if (!user || !user?.subscriptionProductId) {
			const optimizationCount = await getOptimizationsBySession({
				data: { sessionId },
			});

			if (optimizationCount > UNAUTHORIZED_OPTIMIZATION_LIMIT) {
				throw new Error("Daily optimization limit reached.");
			}
		}
		const arrayBuffer = await file.arrayBuffer();
		const bytes = new Uint8Array(arrayBuffer);

		const qualityNum = Number.parseInt(quality, 10);
		let outputBytes: Uint8Array;
		switch (type) {
			case "webp":
				outputBytes = width
					? await sharp(bytes)
							.resize({ width: Number(width) })
							.webp({ quality: qualityNum })
							.toBuffer()
					: await sharp(bytes).webp({ quality: qualityNum }).toBuffer();
				break;
			case "avif":
				outputBytes = width
					? await sharp(bytes)
							.resize({ width: Number(width) })
							.avif({ quality: qualityNum })
							.toBuffer()
					: await sharp(bytes).avif({ quality: qualityNum }).toBuffer();
				break;
			case "jpg":
			case "jpeg":
				outputBytes = width
					? await sharp(bytes)
							.resize({ width: Number(width) })
							.jpeg({ quality: qualityNum })
							.toBuffer()
					: await sharp(bytes).jpeg({ quality: qualityNum }).toBuffer();
				break;
			case "png":
				outputBytes = width
					? await sharp(bytes)
							.resize({ width: Number(width) })
							.png({ quality: qualityNum })
							.toBuffer()
					: await sharp(bytes).png({ quality: qualityNum }).toBuffer();
				break;
			default:
				throw new Error(`Unsupported file type: ${type}`);
		}

		return Buffer.from(outputBytes);
	});

export const getOptimizationsBySession = createServerFn()
	.inputValidator(z.object({ sessionId: z.string() }))
	.handler(async ({ data }) => {
		try {
			const optimizationsList = await db.$count(
				optimizations,
				eq(optimizations.sessionId, data.sessionId),
			);
			return optimizationsList;
		} catch (error) {
			console.error("Error getting optimizations:", error);
			throw new Error("Failed to get optimizations");
		}
	});

export const getOptimizationsCountBySession = createServerFn()
	.inputValidator(z.object({ sessionId: z.string() }))
	.handler(async ({ data }) => {
		try {
			const optimizationsCount = await db.$count(
				optimizations,
				eq(optimizations.sessionId, data.sessionId),
			);
			return optimizationsCount;
		} catch (error) {
			console.error("Error getting optimizations count:", error);
			throw new Error("Failed to get optimizations count");
		}
	});

export const createOptimizationRecord = createServerFn()
	.inputValidator(
		z.object({
			fileName: z.string(),
			fileType: z.string(),
			quality: z.string(),
			width: z.string().optional(),
			userId: z.string().optional(),
			sessionId: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const optimization = await db
				.insert(optimizations)
				.values({
					fileName: data.fileName,
					fileType: data.fileType,
					quality: data.quality,
					width: data.width,
					sessionId: data.sessionId,
					userId: data.userId,
				})
				.returning();

			return optimization[0];
		} catch (error) {
			console.error("Error creating optimization record:", error);
			throw new Error("Failed to create optimization record");
		}
	});
