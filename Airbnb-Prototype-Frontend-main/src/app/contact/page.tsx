import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="page-shell px-4 md:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-brand text-4xl text-ink">Contact</h1>
        <p className="mt-3 text-muted">
          Questions about dates, arrivals, or a longer stay? Call or email us.
        </p>

        <div className="mt-8 space-y-6 border border-line bg-white p-6">
          <div>
            <p className="text-sm font-semibold text-ink">Phone</p>
            <p className="mt-1">
              <a href="tel:+9779814818429" className="hover:underline">
                +977 9814818429
              </a>
            </p>
            <p>
              <a href="tel:+9779700810681" className="hover:underline">
                +977 9700810681
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Email</p>
            <p className="mt-1">
              <a
                href="mailto:thelanternstay@gmail.com"
                className="hover:underline"
              >
                thelanternstay@gmail.com
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Location</p>
            <p className="mt-1 text-muted">Kathmandu, Nepal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
