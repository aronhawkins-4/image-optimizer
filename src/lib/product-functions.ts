import { createServerFn } from "@tanstack/react-start";
import { polarClient } from "./auth";

export const getProducts = createServerFn().handler(async () => {
	const products = await polarClient.products.list({});
	return products.result.items;
});
