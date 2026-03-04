import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PAGE_SLUGS, getPage } from "@/lib/content/pages";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) return {};
  return {
    title: `${page.meta.title} | Kozy.`,
    description: page.meta.description,
  };
}

export default async function StaticPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPage(slug);

  if (!page) {
    notFound();
  }

  const Content = page.content;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
            {page.meta.title}
          </h1>
          {page.meta.subtitle && (
            <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-400">
              {page.meta.subtitle}
            </p>
          )}
          {page.meta.lastUpdated && (
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Last updated: {page.meta.lastUpdated}
            </p>
          )}
        </div>
        <Separator className="mb-8" />
        <Content />
      </div>
    </div>
  );
}
