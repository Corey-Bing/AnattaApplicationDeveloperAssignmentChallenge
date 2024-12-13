# Shopify Product Variant Fetcher

This script communicates with the Shopify Admin GraphQL API to fetch products that match a given name and list their variants in ascending order by price.

## Features

- **Search by Product Name**: Provide a keyword to find products whose titles contain that keyword.
- **GraphQL Query**: Uses Shopify’s GraphQL Admin API for efficient data retrieval.
- **Pagination**: Handles pagination to retrieve all matching products.
- **Sorting**: Variants are sorted by price in ascending order.
- **Retry on Rate Limits**: Automatically retries if the Shopify API rate limit is hit.
