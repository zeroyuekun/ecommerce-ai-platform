import type { ReactNode } from "react";

export interface PageMeta {
  title: string;
  subtitle?: string;
  description: string;
  lastUpdated?: string;
}

export interface PageContent {
  meta: PageMeta;
  content: () => ReactNode;
}
