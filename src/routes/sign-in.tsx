/** biome-ignore-all lint/correctness/noChildrenProp: <explanation> */
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { GoogleIcon } from "#/components/GoogleIcon";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { getSocialProviderForEmail } from "#/lib/session-functions";

export const Route = createFileRoute("/sign-in")({
	component: RouteComponent,
});

function RouteComponent() {
	const [signInError, setSignInError] = useState<string | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);

	const signIn = async () => {
		const data = await authClient.signIn.social({
			provider: "google",
		});
	};

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			try {
				setIsLoading(true);
				const data = await authClient.signIn.email({
					email: value.email,
					password: value.password,
					callbackURL: process.env.VITE_SERVER_URL || "http://localhost:3000",
				});
				if (data.error) {
					console.log("Sign-in error:", data.error);
					const provider = await getSocialProviderForEmail({
						data: { email: value.email },
					});
					if (provider) {
						setSignInError(
							`This email is linked to a ${provider.charAt(0).toUpperCase() + provider.slice(1)} account. Please sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)} instead.`,
						);
					} else {
						setSignInError(data.error.message);
					}
				}
				setIsLoading(false);
			} catch (error) {
				console.error("Error signing in:", error);
				setIsLoading(false);
			}
		},
	});

	return (
		<main className="max-w-lg mx-auto px-4 pb-8 pt-14">
			<section className="flex flex-col justify-center">
				<h1 className="text-2xl font-bold mb-4">Sign In</h1>
				<div className="rounded-3xl bg-card p-6 border">
					<Button
						onClick={signIn}
						className="py-6 w-full mb-4"
						variant={"secondary"}
					>
						<GoogleIcon className="mr-2" />
						Sign In with Google
					</Button>
					<div className="relative mb-4">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs">
							<span className="bg-card px-2 text-muted-foreground">or</span>
						</div>
					</div>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit(e);
						}}
					>
						<div className="mb-4">
							<form.Field
								name="email"
								validators={{
									onBlur: ({ value }) =>
										!value ? "Email required" : undefined,
								}}
								children={(field) => (
									<>
										<Label htmlFor={field.name} className="mb-2">
											Email
										</Label>
										<Input
											id={field.name}
											placeholder="example@email.com"
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										></Input>
										{!field.state.meta.isValid && (
											<em className="text-xs text-destructive">
												{field.state.meta.errors.join(",")}
											</em>
										)}
									</>
								)}
							/>
						</div>
						<div className="mb-4">
							<form.Field
								name="password"
								validators={{
									onBlur: ({ value }) =>
										!value ? "Password required" : undefined,
								}}
								children={(field) => (
									<>
										<Label htmlFor={field.name} className="mb-2">
											Password
										</Label>
										<Input
											id={field.name}
											placeholder="Enter your password"
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										></Input>
										{!field.state.meta.isValid && (
											<em className="text-xs text-destructive">
												{field.state.meta.errors.join(",")}
											</em>
										)}
									</>
								)}
							/>
						</div>
						<Button type="submit" className="w-full">
							{!isLoading ? (
								"Sign In"
							) : (
								<LoaderCircle className="animate-spin" />
							)}
						</Button>
					</form>
					{signInError && (
						<div className="mt-4 text-sm text-destructive">{signInError}</div>
					)}
				</div>
			</section>
		</main>
	);
}
