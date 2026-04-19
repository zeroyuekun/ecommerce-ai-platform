export interface ProductEmbeddingMetadata {
  _id: string;
  slug: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: ProductEmbeddingMetadata;
}

export interface SearchOptions {
  topK?: number;
  filter?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}
