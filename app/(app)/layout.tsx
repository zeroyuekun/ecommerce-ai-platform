import { CartStoreProvider } from "@/lib/store/cart-store-provider";
import { ChatStoreProvider } from "@/lib/store/chat-store-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { SanityLive } from "@/sanity/lib/live";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/storefront/Header";
import { CartSheet } from "@/components/storefront/CartSheet";
import { ChatSheet } from "@/components/storefront/ChatSheet";
import { ChatFab } from "@/components/storefront/ChatFab";
import { AppShell } from "@/components/storefront/AppShell";
import { Footer } from "@/components/storefront/Footer";
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <CartStoreProvider>
        <ChatStoreProvider>
          <AppShell>
            <Header />
            <main>{children}</main>
            <Footer />
          </AppShell>
          <CartSheet />
          <ChatSheet />
          <ChatFab />
          <Toaster position="bottom-center" />
          <SanityLive />
        </ChatStoreProvider>
      </CartStoreProvider>
    </ClerkProvider>
  );
}

export default AppLayout;
