import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface DropzoneRowProps {
	file: File;
	width: number;
	height: number;
	removeRow: (
		fileName: string,
		event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => void;
}

export const DropzoneRow: React.FC<DropzoneRowProps> = ({
	file,
	width,
	height,
	removeRow,
}) => {
	const [url, setUrl] = useState<string>(URL.createObjectURL(file));
	const isMb = file.size / 1000 >= 1000;
	const fileSize = isMb
		? `${(file.size / 1000000).toFixed(2)} MB`
		: `${(file.size / 1000).toFixed(2)} KB`;
	return (
		<li className="text-sm w-full flex gap-4 justify-between items-center p-4 rounded-lg border overflow-hidden">
			<div className="min-w-0 flex-1 text-sm flex gap-4 items-center">
				<img
					src={url}
					alt={file.name}
					className="w-16 h-16 shrink-0 object-cover rounded"
				/>
				<div className="min-w-0 flex-1">
					<span className="truncate block font-bold">{file.name}</span>
					<span className="block text-muted-foreground">{fileSize}</span>
					<span className="block text-muted-foreground">
						{width} x {height}
					</span>
				</div>
				<Button
					variant={"ghost"}
					className="has-[>svg]:px-2 py-2 leading-0 h-auto"
					onClick={(e) => removeRow(file.name, e)}
				>
					<X />
				</Button>
			</div>
		</li>
	);
};
