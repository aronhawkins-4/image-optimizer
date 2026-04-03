import { CloudUpload, ImageUp, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { type DropzoneOptions, useDropzone } from "react-dropzone";

import { DropzoneRow } from "./DropzoneRow";

interface FileDropzoneProps {
	files: File[] | undefined;
	setFiles: (files: File[]) => void;
	maxSizeMb?: number;
	maxFiles?: number;
	setError: (message: string) => void;
	// clearError: () => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
	files,
	setFiles,
	maxSizeMb,
	maxFiles,
	setError,
}) => {
	const [data, setData] = useState<
		{ file: File; width: number; height: number }[]
	>([]);

	const [isLoading, setIsLoading] = useState(false);

	const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
		useDropzone({
			accept: {
				"image/png": [".png"],
				"image/jpg": [".jpg"],
				"image/jpeg": [".jpeg"],
				"image/webp": [".webp"],
				"image/avif": [".avif"],
			},
			maxFiles: maxFiles,
			maxSize: maxSizeMb ? maxSizeMb * 1024 * 1024 : undefined,
			onDrop: (acceptedFiles, rejectedFiles, event) => {
				const currentFiles = files ?? [];
				const remaining = maxFiles
					? maxFiles - currentFiles.length
					: acceptedFiles.length;
				if (remaining <= 0) {
					setError(`Too many files. Max number of files is ${maxFiles}.`);
					return;
				}
				const filesToAdd = acceptedFiles.slice(0, remaining);
				setFiles([...currentFiles, ...filesToAdd]);

				if (
					rejectedFiles.length > 0 ||
					filesToAdd.length < acceptedFiles.length
				) {
					setError(`Too many files. Max number of files is ${maxFiles}.`);
				} else {
					setError("");
				}
			},
		});

	const getImageDimensions = async (
		file: File,
	): Promise<{ width: number; height: number } | Error> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);

			img.onload = () => {
				const dimensions = { width: img.width, height: img.height };
				URL.revokeObjectURL(objectUrl); // Clean up
				resolve(dimensions);
			};

			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				reject(new Error(`Failed to load image: ${file.name}`));
			};

			img.src = objectUrl;
		});
	};

	const removeRow = (
		fileName: string,
		event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	): void => {
		event.preventDefault();
		event.stopPropagation();
		setData((current) => current.filter((item) => item.file.name !== fileName));
		setFiles(files?.filter((file) => file.name !== fileName) || []);
	};

	useEffect(() => {
		try {
			(async () => {
				setIsLoading(true);
				setData([]);
				const promises =
					files?.map(async (file, index) => {
						const dimensions = await getImageDimensions(file);
						if (!(dimensions instanceof Error)) {
							setData((current) => [
								...current,
								{ file, width: dimensions.width, height: dimensions.height },
							]);
						}
						return dimensions;
					}) || [];
				await Promise.all(promises);
			})();
		} catch (error: any) {
			console.log(error);
		} finally {
			setIsLoading(false);
		}
	}, [files]);

	return (
		<div>
			<div
				{...getRootProps({
					className: `dropzone p-6 rounded-3xl bg-card border border-dashed ${isDragActive ? "border-foreground" : ""} w-full min-h-96 flex flex-col gap-2 justify-center items-center`,
				})}
			>
				<input {...getInputProps()} />
				{(!data || data.length === 0) && <ImageUp className="w-12 h-12" />}
				{/* <p>Drop files here</p> */}

				{data && data.length > 0 && (
					<ul className="w-full max-h-64 overflow-y-scroll py-6 gap-2 inset-shadow-2xs grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
						{data.map((item, index) => (
							<DropzoneRow
								file={item.file}
								width={item.width}
								height={item.height}
								// biome-ignore lint/suspicious/noArrayIndexKey: Index is stable because the files cannot be reordered and there is no better unique identifier available
								key={index}
								removeRow={removeRow}
							/>
						))}
					</ul>
				)}
				{isLoading && <LoaderCircle className="animate-spin" />}
			</div>
		</div>
	);
};
