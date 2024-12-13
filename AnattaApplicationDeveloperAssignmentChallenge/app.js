// Import dependencies
const axios = require("axios");
const yargs = require("yargs");

// Anatta Test Store Shopify Credentials & Configuration
const SHOPIFY_STORE_URL = "https://anatta-test-store.myshopify.com/admin/api/2023-07/graphql.json";
const SHOPIFY_ACCESS_TOKEN = "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";

const RETRY_LIMIT = 3;
const RETRY_DELAY = 2000;

// Parsing Input Arguments
// Usage: node app.js --name "product name"
const argv = yargs
	.option("name", {
		alias: "n",
		description: "Product name to search for",
		type: "string",
		demandOption: true,
	})
	.help()
	.alias("help", "h").argv;

/**
 * Constructs a query string for searching products by name
 * @param {sting} productName
 * @returns {string} - A serach query string
 */
function buildSearchQuery(productName) {
	return `title:*${productName}*`;

}

/**
 * Fetch products that match the provided product name.
 * Use pagination and handles retires for rate limits.
 * 
 * @param {any} productName - The product name (or part of it) to search for. 
 * @returns
 */

async function fetchProductsByName(productName) {
	const query = `
		query ($query: String!, $cursor: String) {
			products(first: 20, query: $query, after: $cursor) {
				edges {
					cursor
					node {
						title
						variants(first: 50) {
							edges {
								node {
									title
									price
								}
							}
						}
					}
				}
				pageInfo {
					hasNextPage
				}
			}
		}
	`;

	let cursor = null;
	let hasNextPage = true;
	const allVariants = [];


	// Build the search query
	const searchQuery = buildSearchQuery(productName);

	try {
		while (hasNextPage) {			
			const response = await fetchWithRetry(
				SHOPIFY_STORE_URL,
				{	query, variables: { query: searchQuery, cursor } },
				RETRY_LIMIT
			);

			const { products } = response.data;
			if (!products || !products.edges) {
				console.error("Unexpected response format:", response);
				return;
			}

			const productEdges = products.edges;
			if (productEdges.length === 0 && !cursor) {
				console.log(`No products found for "${productName}".`);
				return;
			}

			for (const { node: product } of productEdges) {
				if(!product.title) {
					continue; // Skip products without a title 
				}

				const variantsEdge = product.variants?.edges || [];
				for (const { node: variant } of variantsEdge) {
					allVariants.push({
						productName: product.title,
						variantTitle: variant.title,
						price: parseFloat(variant.price),
					});
				}
			}

			hasNextPage = products.pageInfo.hasNextPage;
			cursor = productEdges[productEdges.length - 1]?.cursor || null;
		}

		// Sort variants by price
		allVariants.sort((a, b) => a.price - b.price);

		// Display results
		if (allVariants.length === 0) {
			console.log(`No variants found for "${productName}".`);
		} else {
			allVariants.forEach((variant) => {
				console.log(
					`${variant.productName} - ${variant.variantTitle} - $${variant.price}`
				);
			});
		}
	} catch (error) {
		console.error("Error fetching products:", error.message);
	}
}

/**
 * @param {string} url - The API endpoint
 * @param {object} options - GraphQL query and variables
 * @param {number} retries - Number of retry attempts
 */

async function fetchWithRetry(url, options, retries = RETRY_LIMIT) {
	while (retries > 0) {
		try {
			const response = await axios.post(url, options, {
				headers: {
					"Content-Type": "application/json",
					"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
				},
			});
			return response.data;
		} catch (error) {
			if (error.response?.status === 429) {
				// Rate limit exceeded
				consle.log("Rate limit exceeded. Retrying...");
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
				retries--;
			} else {
				throw error;
			}
		}
	}
	throw new Error("Failed after multiple retries");
}

// Run the script with the provided product name
fetchProductsByName(argv.name);
