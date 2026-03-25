import { files } from "jszip";
import { ChevronsLeftRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImageCompareItem {
	url: string; // URL or base64 string of the image
	filename: string; // Original filename of the image
	size: number; // Size of the image in bytes
}

interface ImageCompareProps {
	topImage: ImageCompareItem; // URL or base64 string of the original image
	bottomImage: ImageCompareItem; // URL or base64 string of the optimized image
}

export const ImageCompare: React.FC<ImageCompareProps> = ({
	topImage,
	bottomImage,
}) => {
	const [isResizing, setIsResizing] = useState(false);
	const topImageRef = useRef<HTMLImageElement>(null);
	const handleRef = useRef<HTMLButtonElement>(null);

	const setPositioning = useCallback((x) => {
		const { left, width } = topImageRef?.current?.getBoundingClientRect() || {};
		const handleWidth = handleRef?.current?.offsetWidth || 0;

		if (x >= left && x <= width + left - handleWidth) {
			handleRef.current.style.left = `${((x - left) / width) * 100}%`;
			topImageRef.current.style.clipPath = `inset(0 ${100 - ((x - left) / width) * 100}% 0 0)`;
		}
	}, []);

	const handleResize = useCallback(
		(e) => {
			setPositioning(e.clientX);
		},
		[setPositioning],
	);

	const handleResizeEnd = useCallback(() => {
		setIsResizing(false);
		window.removeEventListener("mousemove", handleResize);
		window.removeEventListener("mouseup", handleResizeEnd);
	}, [handleResize]);

	useEffect(() => {
		const { left, width } = topImageRef?.current?.getBoundingClientRect();
		const handleWidth = handleRef?.current?.offsetWidth;

		setPositioning(width / 2 + left - handleWidth / 2);
		// generateOriginalImageData().then((res) => console.log(res.filename));

		return () => {
			// if (originalImageData) {
			// 	URL.revokeObjectURL(originalImageData.url);
			// }
		};
	}, []);

	useEffect(() => {
		if (isResizing) {
			window.addEventListener("mousemove", handleResize);
			window.addEventListener("mouseup", handleResizeEnd);
		}

		return () => {
			window.removeEventListener("mousemove", handleResize);
			window.removeEventListener("mouseup", handleResizeEnd);
		};
	}, [isResizing, handleResize, handleResizeEnd]);

	return (
		<div className="relative">
			<div className="comparison-slider w-full relative mb-2 mx-auto max-w-3xl overflow-hidden rounded-lg shadow-2xl">
				<button
					ref={handleRef}
					className="handle absolute w-0.75 h-full bg-white z-20 cursor-col-resize top-0 left-1/2 -translate-x-1/2"
					type="button"
					onMouseDown={() => setIsResizing(true)}
				>
					<ChevronsLeftRight className="text-2xl text-black w-6 h-6 bg-white rounded-full absolute top-1/2 left-1/2 -translate-1/2" />
				</button>
				<div className="relative w-full aspect-3/2 rounded-lg overflow-hidden">
					<div
						ref={topImageRef}
						className="comparison-item top z-10 absolute w-full h-full top-0 left-0"
					>
						<img
							src={topImage.url}
							alt="Original"
							className="w-full h-full object-cover select-none pointer-events-none"
							draggable="false"
						/>
					</div>

					<div className="comparison-item w-full h-full">
						<img
							src={bottomImage.url}
							alt="Optimized"
							className="w-full h-full object-cover select-none pointer-events-none"
							draggable="false"
						/>
					</div>
				</div>
			</div>
			{/* <div className="flex justify-between absolute left-0 bottom-2 w-full px-2 z-10">
				<span className="p-2 rounded-full border border-white leading-none text-xs text-white font-bold bg-white/10 backdrop-blur-2xl">
					Original
				</span>
				<span className="p-2 rounded-full border border-white leading-none text-xs text-white font-bold bg-white/10 backdrop-blur-2xl">
					Optimized
				</span>
			</div> */}
		</div>
	);
};
