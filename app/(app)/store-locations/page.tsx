import { Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";

const stores = [
  {
    name: "Kozy — Sydney",
    address: "123 George Street, Sydney NSW 2000",
    phone: "+61 2 9000 1234",
    hours: "Mon–Sat: 9am – 6pm | Sun: 10am – 5pm",
    image: "/stores/sydney.jpg",
    mapUrl: "https://maps.google.com/?q=123+George+Street+Sydney+NSW+2000",
  },
  {
    name: "Kozy — Melbourne",
    address: "456 Collins Street, Melbourne VIC 3000",
    phone: "+61 3 9000 5678",
    hours: "Mon–Sat: 9am – 6pm | Sun: 10am – 5pm",
    image: "/stores/melbourne.jpg",
    mapUrl: "https://maps.google.com/?q=456+Collins+Street+Melbourne+VIC+3000",
  },
  {
    name: "Kozy — Brisbane",
    address: "78 Queen Street, Brisbane QLD 4000",
    phone: "+61 7 3000 9012",
    hours: "Mon–Sat: 9am – 5:30pm | Sun: 10am – 4pm",
    image: "/stores/brisbane.jpg",
    mapUrl: "https://maps.google.com/?q=78+Queen+Street+Brisbane+QLD+4000",
  },
  {
    name: "Kozy — Perth",
    address: "22 Murray Street, Perth WA 6000",
    phone: "+61 8 6000 3456",
    hours: "Mon–Sat: 9am – 5:30pm | Sun: 11am – 4pm",
    image: "/stores/perth.jpg",
    mapUrl: "https://maps.google.com/?q=22+Murray+Street+Perth+WA+6000",
  },
  {
    name: "Kozy — Adelaide",
    address: "15 Rundle Mall, Adelaide SA 5000",
    phone: "+61 8 8000 7890",
    hours: "Mon–Sat: 9am – 5:30pm | Sun: 11am – 4pm",
    image: "/stores/adelaide.jpg",
    mapUrl: "https://maps.google.com/?q=15+Rundle+Mall+Adelaide+SA+5000",
  },
  {
    name: "Kozy — Gold Coast",
    address: "100 Cavill Avenue, Surfers Paradise QLD 4217",
    phone: "+61 7 5500 1234",
    hours: "Mon–Sat: 9am – 5pm | Sun: 10am – 4pm",
    image: "/stores/goldcoast.jpg",
    mapUrl:
      "https://maps.google.com/?q=100+Cavill+Avenue+Surfers+Paradise+QLD+4217",
  },
];

export default function StoreLocationsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero */}
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Our Stores
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Visit us in person to experience our furniture collections. Our
            design consultants are ready to help you find the perfect pieces.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* All stores grid */}
        <div>
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            All Locations
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {stores.map((store) => (
              <div
                key={store.name}
                className="group border border-zinc-200 bg-white transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="p-8">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {store.name}
                  </h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {store.address}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {store.hours}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {store.phone}
                      </span>
                    </div>
                  </div>
                  <a
                    href={store.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex w-full items-center justify-center gap-2 border border-zinc-900 py-3 text-sm font-medium uppercase tracking-wider text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact banner */}
        <div className="mt-16 border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <h2 className="text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
            Need Help Finding Us?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Our team is happy to assist. Reach out and we&apos;ll help you find
            the nearest Kozy store.
          </p>
          <Link
            href="mailto:hello@kozy.com.au"
            className="mt-6 inline-flex items-center gap-2 border border-zinc-900 px-6 py-3 text-sm font-medium uppercase tracking-wider text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
