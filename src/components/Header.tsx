import { Link } from "@tanstack/react-router";
import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-primary bg-background px-4 backdrop-blur-lg">
			<nav className="page-wrap flex justify-between items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center text-sm no-underline"
					>
						Image Optimize
					</Link>
				</h2>

				<div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:w-auto sm:flex-nowrap sm:pb-0">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Home
					</Link>
					{/* <Link
						to="/about"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						About
					</Link>
					<Link
						to="/docs"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Docs
					</Link> */}
				</div>
				<div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
					<BetterAuthHeader />

					{/* <ThemeToggle /> */}
				</div>
			</nav>
		</header>
	);
}
