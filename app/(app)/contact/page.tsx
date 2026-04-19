import { Clock, Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            We&apos;re here to help. Reach out to us with any questions.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact info */}
          <div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Get in Touch
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Our customer service team is available to assist you Monday to
              Friday, 9am to 5pm AEST.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Phone
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    02 9000 1234
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Email
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    hello@kozy.com.au
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Head Office
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    123 George Street, Sydney NSW 2000
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Business Hours
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Monday &ndash; Friday: 9am &ndash; 5pm AEST
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Send a Message
            </h2>
            <form className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Subject
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                  placeholder="Tell us more..."
                />
              </div>
              <button
                type="submit"
                className="w-full border border-zinc-900 bg-zinc-900 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
