import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import { z } from "zod";

const inputSchema = z.object({
	file: z.instanceof(File),
	fileType: z.enum(["webp", "avif", "png", "jpg", "jpeg"]),
	quality: z.string(),
	width: z.string().optional(),
});

export const optimizeImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		if (!(data instanceof FormData)) {
			throw new Error("Expected FormData");
		}
		return inputSchema.parse({
			file: data.get("file"),
			fileType: data.get("fileType"),
			quality: data.get("quality"),
			width: data.get("width") || undefined,
		});
	})
	.handler(async ({ data }) => {
		const { file, fileType: type, quality, width } = data;
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
