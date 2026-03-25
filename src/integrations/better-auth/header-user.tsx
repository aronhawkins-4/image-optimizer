import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
	const { data: session, isPending } = authClient.useSession();

	// if (isPending) {
	// 	return (
	// 		<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
	// 	);
	// }

	if (session?.user) {
		return (
			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger className="rounded-full">
						{session.user.image ? (
							<img
								src={session.user.image}
								alt=""
								className="h-8 w-8 rounded-full overflow-hidden"
							/>
						) : (
							<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
								<span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
									{session.user.name?.charAt(0).toUpperCase() || "U"}
								</span>
							</div>
						)}
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem>
							<Button
								variant={"link"}
								className="w-full"
								onClick={() => {
									void authClient.signOut();
								}}
							>
								Sign out
							</Button>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	return (
		<Button asChild className="rounded-full">
			<Link to="/sign-in">Sign in</Link>
		</Button>
	);
}
