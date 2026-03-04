import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <section>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-center text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Every Kozy. product comes with a 365-day warranty
          </p>
          <p className="mt-2 text-center text-sm">
            We stand behind the quality of our furniture. If something isn&apos;t right, we&apos;ll
            make it right.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          What&apos;s Covered
        </h2>
        <p className="mb-3">
          Our 365-day warranty covers manufacturing defects and faults that occur under normal
          household use. This includes:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Structural defects in frames, joints, and load-bearing components</li>
          <li>Faulty mechanisms (drawers, hinges, sliders, recline functions)</li>
          <li>Defects in materials (peeling, cracking, or bubbling of surfaces under normal use)</li>
          <li>Manufacturing faults in upholstery, stitching, or fabric</li>
          <li>Missing or defective hardware or parts</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          What&apos;s Not Covered
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Damage caused by misuse, neglect, or improper assembly</li>
          <li>Normal wear and tear, including fabric fading, pilling, or minor scratches</li>
          <li>Damage from exposure to extreme conditions (direct sunlight, moisture, heat)</li>
          <li>Modifications or alterations made to the product</li>
          <li>Damage caused during self-transport after delivery</li>
          <li>Natural variations in wood grain, colour, or texture — these are features of real materials, not defects</li>
          <li>Commercial use — our warranty covers domestic household use only</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          How to Make a Warranty Claim
        </h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Document the issue
            </span>{" "}
            — Take clear photos of the defect or fault from multiple angles.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Contact us</span> —
            Email warranty@kozy.com.au with your order number, photos, and a description of the
            issue. You can also call us on 1800 KOZY.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Assessment</span> —
            Our team will review your claim within 2–3 business days and may request additional
            information or photos.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Resolution</span> —
            Depending on the nature of the fault, we&apos;ll offer one of the following: replacement
            parts, a full product replacement, store credit, or a refund.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Care &amp; Maintenance Tips
        </h2>
        <p className="mb-3">
          A little care goes a long way in keeping your Kozy. furniture looking its best:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Wood furniture</span> —
            Dust regularly with a soft, dry cloth. Avoid placing hot items directly on surfaces. Use
            coasters and placemats to prevent marks.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Upholstered items</span>{" "}
            — Vacuum regularly to remove dust and debris. Blot spills immediately with a clean, damp
            cloth. Avoid harsh chemicals or abrasive cleaners.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Metal components</span>{" "}
            — Wipe down with a soft cloth. Avoid abrasive cleaners that may scratch finishes.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">General</span> — Keep
            furniture away from direct sunlight to prevent fading. Tighten bolts and screws
            periodically. Follow all assembly instructions carefully.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Australian Consumer Law
        </h2>
        <p>
          Our warranty is in addition to your rights under the Australian Consumer Law. Goods come
          with guarantees that cannot be excluded. You are entitled to a replacement or refund for a
          major failure and compensation for any other reasonably foreseeable loss or damage. You are
          also entitled to have the goods repaired or replaced if the goods fail to be of acceptable
          quality and the failure does not amount to a major failure.
        </p>
      </section>
    </div>
  );
}

export const warrantyPage: PageContent = {
  meta: {
    title: "Warranty Information",
    subtitle: "We stand behind every piece",
    description:
      "Kozy. offers a 365-day warranty on all products covering manufacturing defects and faults. Learn about coverage and claims.",
    lastUpdated: "March 2026",
  },
  content: Content,
};
