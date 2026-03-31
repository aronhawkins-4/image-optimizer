import { useForm, useStore } from "@tanstack/react-form";
import JSZip from "jszip";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { optimizeImage } from "#/lib/optimization-functions";
import { FileDropzone } from "./FileDropzone";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Slider } from "./ui/slider";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export interface FormInput {
	files: File[] | undefined;
	fileType: "webp" | "avif" | "png" | "jpg" | "original";
	quality: string;
	width: string | undefined;
}
export interface DownloadData {
	filename: string;
	url: string;
	size: number;
	saved: number;
}

export const UploadForm = () => {
	const [downloadData, setDownloadData] = useState<DownloadData[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	// const [fileType, setFileType] = useState<FormInput["fileType"]>("webp");

	const [error, setError] = useState<string | null>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const form = useForm({
		defaultValues: {
			files: [],
			fileType: "webp",
			quality: "75",
			width: undefined,
		} as FormInput,
		onSubmit: async ({ value }) => {
			if (!value.files || value.files.length === 0) {
				setError("No files selected");
				return;
			}
			setDownloadData([]);
			setIsLoading(true);
			const promises = value.files.map(async (file) => {
				if (!file) return;
				const fileType =
					value.fileType === "original"
						? file.name.split(".").at(-1) || "webp"
						: value.fileType;
				const formData = new FormData();
				formData.append("file", file);
				formData.append("fileType", fileType);
				formData.append("quality", value.quality);
				formData.append("width", value.width || "");
				const optimizedImageBuffer = await optimizeImage({ data: formData });
				if (optimizedImageBuffer) {
					const blob = new Blob([new Uint8Array(optimizedImageBuffer)], {
						type: `image/${fileType}`,
					});

					const url = URL.createObjectURL(blob);
					const newFile = new File(
						[blob],
						`${file.name.split(".", -1)[0]}.${fileType}`,
						{
							type: blob.type,
						},
					);
					const saved = 100 - (newFile.size / file.size) * 100;
					setDownloadData((current) => [
						...current,
						{
							filename: newFile.name,
							url,
							size: newFile.size,
							saved: saved,
						},
					]);
				}
				if (error) {
					console.error(
						`Error compressing image: ${JSON.stringify({ error })} `,
					);
				}
			});
			await Promise.all(promises);
			setIsLoading(false);
		},
	});

	const files = useStore(form.store, (state) => state.values.files);
	const fileType = useStore(form.store, (state) => state.values.fileType);
	const quality = useStore(form.store, (state) => state.values.quality);
	const width = useStore(form.store, (state) => state.values.width);

	const setFilesValue = (files: File[]) => {
		form.setFieldValue("files", files);
	};
	const setFilesError = (message: string) => {
		// setError("files", { message });
	};
	const clearFilesError = () => {
		// clearErrors("files");
	};

	const downloadZip = async (data: DownloadData[]) => {
		const zip = new JSZip();
		const folder = zip.folder("optimized_images");
		const promises = data.map(async (item) => {
			const response = await fetch(item.url);
			const blob = await response.blob();
			folder?.file(item.filename, blob);
			return;
		});
		await Promise.all(promises);
		zip.generateAsync({ type: "blob" }).then((content) => {
			const a = document.createElement("a");
			a.href = URL.createObjectURL(content);
			a.download = folder?.name || "optimized_images";
			a.click();
		});
	};

	return (
		<div className="flex flex-col gap-8">
			<form
				ref={formRef}
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit(e);
				}}
				className="flex flex-col gap-6"
			>
				<FileDropzone
					files={files}
					setFiles={setFilesValue}
					setError={setFilesError}
					clearError={clearFilesError}
				/>
				{error && <span className="text-destructive">{error}</span>}
				<div className="flex items-stretch gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="file-type">File Type</Label>
						<ToggleGroup
							type="single"
							variant={"outline"}
							value={fileType}
							id="file-type"
							onValueChange={(value) => {
								if (value) {
									// setFileType(value as FormInput["fileType"]);
									form.setFieldValue(
										"fileType",
										value as FormInput["fileType"],
									);
								}
							}}
						>
							<ToggleGroupItem value="webp" className="min-w-fit rounded-lg">
								.webp
							</ToggleGroupItem>
							<ToggleGroupItem value="avif" className="min-w-fit rounded-lg">
								.avif
							</ToggleGroupItem>

							<ToggleGroupItem value="png" className="min-w-fit rounded-lg">
								.png
							</ToggleGroupItem>
							<ToggleGroupItem value="jpg" className="min-w-fit rounded-lg">
								.jpg
							</ToggleGroupItem>
							<ToggleGroupItem
								value="original"
								className="min-w-fit rounded-lg"
							>
								original
							</ToggleGroupItem>
						</ToggleGroup>
					</div>
					<Separator
						orientation={"vertical"}
						className="data-[orientation=vertical]:h-auto"
					/>
					<div className="flex flex-col gap-2 flex-1">
						<Label htmlFor="quality">Quality</Label>
						<div className="flex items-center gap-4 mt-[.35rem] flex-1">
							<Slider
								defaultValue={[75]}
								max={100}
								step={5}
								min={5}
								onValueChange={(value) => {
									form.setFieldValue("quality", String(value[0]));
								}}
							/>
							<span className="min-w-fit">{quality}</span>
						</div>
					</div>
					<Separator
						orientation={"vertical"}
						className="data-[orientation=vertical]:h-auto"
					/>
					<div className="flex flex-col gap-2">
						<Label htmlFor="width">Width</Label>
						<Input
							type="number"
							placeholder="Default"
							value={width}
							onChange={(e) => {
								form.setFieldValue("width", e.target.value);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									formRef.current?.requestSubmit();
								}
							}}
						></Input>
					</div>
				</div>
				<Button type="submit" className="cursor-pointer">
					{isLoading ? <LoaderCircle className="animate-spin" /> : "Optimize"}
				</Button>
			</form>

			{downloadData && downloadData.length > 0 && (
				<div className="flex flex-col gap-6">
					{downloadData.map((item, index) => {
						const isMb = item.size / 1000 >= 1000;
						const fileSize = isMb
							? `${(item.size / 1000000).toFixed(2)} MB`
							: `${(item.size / 1000).toFixed(2)} KB`;
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<div key={index} className="flex flex-col gap-2 items-stretch">
								<div className="flex gap-4 items-center">
									<img
										src={item.url}
										alt={item.filename}
										className="w-16 min-w-16 h-auto aspect-square rounded overflow-hidden object-center object-cover"
									/>
									<div className="flex flex-col gap-1">
										<span>{item.filename.split(".", -1)[0]}</span>
										<div className="flex gap-2 items-center">
											<span className="text-sm p-1 rounded bg-muted border">
												.{item.filename.split(".", -1)[1]}
											</span>
											<span className="text-sm">{fileSize}</span>
										</div>
									</div>
									<div className="flex flex-col gap-2 ml-auto">
										<span className="text-right">
											Saved {item.saved.toFixed(1)}%
										</span>
										<Button className="w-full" asChild variant={"outline"}>
											<a
												href={item.url}
												download={item.filename}
												className="w-full"
											>
												{downloadData.length === 1
													? "Download"
													: "Download Single"}
											</a>
										</Button>
									</div>
								</div>
							</div>
						);
					})}
					{downloadData.length > 1 && !isLoading && (
						<Button
							onClick={() => downloadZip(downloadData)}
							className="cursor-pointer"
						>
							Download All Files
						</Button>
					)}
				</div>
			)}
		</div>
	);
};
