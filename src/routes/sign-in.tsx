import { createFileRoute } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
	component: RouteComponent,
});

function RouteComponent() {
	const signIn = async () => {
		const data = await authClient.signIn.social({
			provider: "google",
		});
	};

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="flex justify-center items-center">
				<div className="rounded-3xl bg-card p-6 border">
					<h1 className="text-xl font-bold mb-4">Sign In</h1>
					<Button onClick={signIn}>Sign In with Google</Button>
				</div>
			</section>
		</main>
	);
}
