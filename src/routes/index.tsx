import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import JSZip from "jszip";
import { ArrowRight, Download, LoaderCircle, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FileDropzone } from "#/components/FileDropzone";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Slider } from "#/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { authClient } from "#/lib/auth-client";
import { UNAUTHORIZED_OPTIMIZATION_LIMIT } from "#/lib/constants";
import {
	createOptimizationRecord,
	getOptimizationsCountBySession,
	optimizeImage,
} from "#/lib/optimization-functions";
import { formatFileSize } from "#/lib/utils";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		const initialDailyOptimizations = await getOptimizationsCountBySession({
			data: { sessionId: context.sessionId },
		});
		return {
			initialDailyOptimizations,
			products: context.products,
		};
	},
	component: App,
});

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

function App() {
	const { initialDailyOptimizations, products } = Route.useLoaderData();
	const [dailyOptimizations, setDailyOptimizations] = useState(
		initialDailyOptimizations,
	);
	const [dailyLimitReached, setDailyLimitReached] = useState(false);
	const [downloadData, setDownloadData] = useState<DownloadData[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubscriptionActive, setIsSubscriptionActive] = useState<
		boolean | null
	>(null);
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const prevUserIdRef = useRef(session?.user?.id);
	const { sessionId } = Route.useRouteContext();

	const [error, setError] = useState<string | null>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const checkDailyOptimizationLimit = () => {
		if (
			!isSubscriptionActive &&
			!sessionPending &&
			dailyOptimizations >= UNAUTHORIZED_OPTIMIZATION_LIMIT
		) {
			setDailyLimitReached(true);
			setError("Daily optimization limit reached");
			return true;
		} else {
			setDailyLimitReached(false);
			return false;
		}
	};

	const form = useForm({
		defaultValues: {
			files: [],
			fileType: "webp",
			quality: "75",
			width: "",
		} as FormInput,
		onSubmit: async ({ value }) => {
			try {
				if (!value.files || value.files.length === 0) {
					setError("No files selected");
					return;
				}
				if (dailyLimitReached) {
					return;
				}

				setDownloadData([]);
				setIsLoading(true);

				const failures: { reason: unknown }[] = [];
				for (const file of value.files) {
					if (!file) continue;
					if (checkDailyOptimizationLimit()) {
						return;
					}
					try {
						const fileType =
							value.fileType === "original"
								? file.name.split(".").at(-1) || "webp"
								: value.fileType;
						const formData = new FormData();
						formData.append("file", file);
						formData.append("fileType", fileType);
						formData.append("quality", value.quality);
						formData.append("width", value.width || "");
						formData.append("sessionId", sessionId);
						formData.append("userId", session?.user?.id || "");
						const optimizedImageBuffer = await optimizeImage({
							data: formData,
						});

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
							await createOptimizationRecord({
								data: {
									fileName: file.name,
									fileType: fileType,
									quality: value.quality,
									width: value.width || undefined,
									sessionId: sessionId,
									userId: session?.user?.id,
								},
							});
						}
						setDailyOptimizations((current) => current + 1);
					} catch (reason) {
						failures.push({ reason });
					}
				}
				if (failures.length > 0) {
					console.error("Some images failed:", failures);
					setError(
						failures[0].reason instanceof Error
							? failures[0].reason.message
							: String(failures[0].reason) ||
									"An unknown error occurred during optimization",
					);
				}
				setIsLoading(false);
			} catch (err) {
				console.error("Error optimizing images:", err);
				setError("An unknown error occurred");
				setIsLoading(false);
				setDownloadData([]);
			}
		},
	});

	const files = useStore(form.store, (state) => state.values.files);
	const fileType = useStore(form.store, (state) => state.values.fileType);
	const quality = useStore(form.store, (state) => state.values.quality);
	const width = useStore(form.store, (state) => state.values.width);

	const setFilesValue = (files: File[]) => {
		form.setFieldValue("files", files);
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

	const resetData = () => {
		form.reset({
			files: [],
			fileType: "webp",
			quality: "75",
			width: "",
		});
		setDownloadData([]);
		setFilesValue([]);
		setError(null);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (!files || files.length === 0) {
			setDownloadData([]);
			return;
		}
		setError(null);
		if (downloadData && downloadData.length > 0) {
			setDownloadData((current) =>
				current.filter((item) =>
					files.some(
						(file) => file.name.split(".")[0] === item.filename.split(".")[0],
					),
				),
			);
		}
	}, [files]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (prevUserIdRef.current !== session?.user?.id) {
			prevUserIdRef.current = session?.user?.id;
			if (!sessionPending) {
				resetData();
			}
		}
	}, [session, sessionPending]);

	useEffect(() => {
		checkDailyOptimizationLimit();
	}, [initialDailyOptimizations, sessionPending, isSubscriptionActive]);

	useEffect(() => {
		if (sessionPending) return;
		setIsSubscriptionActive(
			products.some((p) => p.id === session?.user?.subscriptionProductId),
		);
	}, [session, sessionPending, products]);

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="grid grid-cols-3 gap-6">
				<div className="col-span-2 space-y-4">
					<div
						className={`${dailyLimitReached ? "opacity-50 pointer-events-none" : ""}`}
					>
						<FileDropzone files={files} setFiles={setFilesValue} />
					</div>
					{files &&
						files.length > 0 &&
						downloadData &&
						downloadData.length > 0 && (
							<div
								className={`space-y-8 col-span-2 ${isLoading ? "animate-pulse" : ""}`}
							>
								<div className="grid grid-cols-2 gap-6">
									{downloadData.map((item, index) => {
										const originalFile = files?.find(
											(f) =>
												f.name.split(".")[0] === item.filename.split(".")[0],
										);
										if (!originalFile) return null;
										const originalFileSize = formatFileSize(originalFile.size);

										const fileSize = formatFileSize(item.size);
										const optimizedImageData = {
											url: item.url,
											filename: item.filename,
											size: item.size,
										};
										const originalImageData = {
											url: URL.createObjectURL(originalFile as File),
											filename: originalFile?.name,
											size: originalFile?.size,
										};
										return (
											<div
												key={item.filename}
												className="rounded-xl overflow-hidden flex flex-col"
											>
												<div className="w-full relative aspect-3/2">
													<img
														src={optimizedImageData.url}
														alt={item.filename}
														className="absolute top-0 left-0 w-full h-full object-cover"
													/>
												</div>
												<div className="flex gap-2 justify-between items-center bg-muted flex-1 p-4">
													<div className="flex gap-4">
														<div className="flex flex-col gap-1">
															<span className="text-xs uppercase">
																{item.filename.split(".")[1]}
															</span>
															<div className="flex gap-2 items-center">
																<span className="text-sm flex items-center gap-1">
																	{originalFileSize}{" "}
																	<ArrowRight className="w-4" /> {fileSize}{" "}
																	<span className="text-muted-foreground">
																		({item.saved.toFixed(1)}%)
																	</span>
																</span>
															</div>
														</div>
													</div>
													<Button
														variant={"default"}
														className="flex justify-center items-center w-8 h-8 min-w-8 min-h-8 rounded-full"
														asChild
													>
														<a
															href={item.url}
															download={item.filename}
															className="flex justify-center items-center w-8 h-8 min-w-8 min-h-8 rounded-full"
														>
															<Download className="w-4 h-4" />
														</a>
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					{downloadData && downloadData.length > 0 && (
						<div className="flex justify-between items-center gap-6 p-4 rounded-3xl border bg-card">
							<div className="flex gap-1">
								<div className="text-sm font-semibold">
									{downloadData.reduce(
										(sum, item) =>
											sum +
											((files?.find(
												(f) =>
													f.name.split(".")[0] === item.filename.split(".")[0],
											)?.size || 0) -
												item.size),
										0,
									) >= 1000000
										? (
												downloadData.reduce(
													(sum, item) =>
														sum +
														((files?.find(
															(f) =>
																f.name.split(".")[0] ===
																item.filename.split(".")[0],
														)?.size || 0) -
															item.size),
													0,
												) / 1000000
											).toFixed(2)
										: (
												downloadData.reduce(
													(sum, item) =>
														sum +
														((files?.find(
															(f) =>
																f.name.split(".")[0] ===
																item.filename.split(".")[0],
														)?.size || 0) -
															item.size),
													0,
												) / 1000
											).toFixed(2)}{" "}
									{downloadData.reduce(
										(sum, item) =>
											sum +
											((files?.find(
												(f) =>
													f.name.split(".")[0] === item.filename.split(".")[0],
											)?.size || 0) -
												item.size),
										0,
									) >= 1000000
										? "MB"
										: "KB"}{" "}
									saved
								</div>
								<div className="text-sm">
									(
									{(
										downloadData.reduce((sum, item) => sum + item.saved, 0) /
										downloadData.length
									).toFixed(1)}
									%)
								</div>
							</div>

							<Button
								onClick={() => downloadZip(downloadData)}
								className="cursor-pointer rounded-full"
							>
								<Download className="w-4 h-4 mr-2" />
								Download All (.zip)
							</Button>
						</div>
					)}
					{error && (
						<span className="block text-destructive mb-4">{error}</span>
					)}
					{session?.user &&
						!sessionPending &&
						isSubscriptionActive === false && (
							<div className="p-6 rounded-3xl border bg-card max-w-lg">
								<h2 className="text-xl font-bold mb-4">Upgrade Now</h2>
								<div className="flex gap-2">
									{products.map((product) => (
										<Button
											key={product.id}
											className="flex-1 rounded-full"
											onClick={async () => {
												await authClient.checkout({
													products: [product.id],
												});
											}}
										>
											Upgrade to {product.name}
										</Button>
									))}
								</div>
							</div>
						)}
				</div>
				<div className="col-span-1">
					<form
						ref={formRef}
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit(e);
						}}
						className="flex flex-col gap-6 rounded-3xl bg-card p-6 border"
					>
						<div className="space-y-10">
							<div className="flex flex-col gap-2">
								<Label
									htmlFor="file-type"
									className="uppercase text-xs font-bold"
								>
									Output Format
								</Label>
								<ToggleGroup
									type="single"
									variant={"outline"}
									value={fileType}
									id="file-type"
									className="grid grid-cols-3 gap-2 w-full font-bold"
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
									<ToggleGroupItem
										value="webp"
										className="min-w-fit rounded-xl! border! p-4"
									>
										.webp
									</ToggleGroupItem>
									<ToggleGroupItem
										value="avif"
										className="min-w-fit rounded-xl! border! p-4"
										variant={"outline"}
									>
										.avif
									</ToggleGroupItem>

									<ToggleGroupItem
										value="png"
										className="min-w-fit rounded-xl! border! p-4"
									>
										.png
									</ToggleGroupItem>
									<ToggleGroupItem
										value="jpg"
										className="min-w-fit rounded-xl! border! p-4"
									>
										.jpg
									</ToggleGroupItem>
									<ToggleGroupItem
										value="original"
										className="min-w-fit rounded-xl! border! p-4 col-span-2"
									>
										original
									</ToggleGroupItem>
								</ToggleGroup>
							</div>

							<div className="flex flex-col gap-2 flex-1">
								<div className="flex items-center justify-between gap-6">
									<Label
										htmlFor="quality"
										className="uppercase text-xs font-bold"
									>
										Quality
									</Label>
									<span className="min-w-fit">{quality}%</span>
								</div>
								<div className="flex items-center gap-4 mt-[.35rem]">
									<Slider
										value={[quality ? parseInt(quality, 10) : 75]}
										max={100}
										step={5}
										min={5}
										onValueChange={(value) => {
											form.setFieldValue("quality", String(value[0]));
										}}
									/>
								</div>
								<div className="flex items-center justify-between gap-6 text-xs">
									<span>Smallest</span>
									<span>Lossless</span>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="width" className="uppercase text-xs font-bold">
									Width
								</Label>
								<Input
									type="number"
									placeholder="1920"
									value={width}
									onChange={(e) => {
										form.setFieldValue("width", e.target.value);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											e.currentTarget.blur();
											formRef.current?.requestSubmit();
										}
									}}
								></Input>
							</div>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={(e) => {
									e.preventDefault();
									resetData();
								}}
								className="cursor-pointer rounded-full"
							>
								<RefreshCcw className="w-4 h-4" />
								<span className="sr-only">Reset</span>
							</Button>
							<Button
								type="submit"
								className="cursor-pointer rounded-full flex-1"
								disabled={isLoading || dailyLimitReached}
							>
								{isLoading ? (
									<LoaderCircle className="animate-spin" />
								) : (
									"Optimize"
								)}
							</Button>
						</div>
					</form>
					<div className="my-6 text-sm text-muted-foreground">
						{!sessionPending && !isSubscriptionActive && (
							<>
								<strong>
									{UNAUTHORIZED_OPTIMIZATION_LIMIT - dailyOptimizations}/
									{UNAUTHORIZED_OPTIMIZATION_LIMIT}
								</strong>{" "}
								daily optimizations remaining.
							</>
						)}
					</div>
					{!session?.user && !sessionPending && (
						<div className="p-6 rounded-3xl border bg-card max-w-max">
							<h2 className="text-xl font-bold mb-4">Sign In to Upgrade</h2>
							<div className="flex gap-2">
								<Button className="flex-1 rounded-full" asChild>
									<Link to="/sign-in">Sign In</Link>
								</Button>
							</div>
						</div>
					)}
				</div>
			</section>
		</main>
	);
}
