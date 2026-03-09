import { CartStoreProvider } from "@/lib/store/cart-store-provider";
import { ChatStoreProvider } from "@/lib/store/chat-store-provider";
import { RecentlyViewedStoreProvider } from "@/lib/store/recently-viewed-store-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { SanityLive } from "@/sanity/lib/live";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/app/Header";
import { CartSheet } from "@/components/app/CartSheet";
import { ChatSheet } from "@/components/app/ChatSheet";
import { AppShell } from "@/components/app/AppShell";
import { ChatFab } from "@/components/app/ChatFab";
import { Footer } from "@/components/app/Footer";
import { NewsletterBanner } from "@/components/app/NewsletterBanner";
import { sanityFetch } from "@/sanity/lib/live";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";

async function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: categories } = await sanityFetch({
    query: ALL_CATEGORIES_QUERY,
  });

  return (
    <ClerkProvider
      appearance={{
        variables: {
          borderRadius: "0px",
        },
      }}
    >
      <CartStoreProvider>
        <RecentlyViewedStoreProvider>
        <ChatStoreProvider>
          <AppShell>
            <Header categories={categories} />
            <main className="pt-[calc(4rem+41px)]">{children}</main>
            <NewsletterBanner />
            <Footer />
          </AppShell>
          <CartSheet />
          <ChatSheet />
          <ChatFab />
          <Toaster position="bottom-center" />
          <SanityLive />
        </ChatStoreProvider>
        </RecentlyViewedStoreProvider>
      </CartStoreProvider>
    </ClerkProvider>
  );
}

export default AppLayout;
