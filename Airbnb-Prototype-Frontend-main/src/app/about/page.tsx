import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="page-shell px-4 md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-brand text-4xl text-ink md:text-5xl">
          About The Lantern Stay
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          We are a vacation home rental in Kathmandu. Our stays are meant for
          travelers who want a calm place to sleep, cook, and explore from, with
          a host who answers the phone.
        </p>

        <div className="relative mt-10 aspect-[16/9] overflow-hidden bg-line">
          <Image
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80"
            alt="Kathmandu vacation home exterior"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-ink">What we host</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Entire homes and private suites around Kathmandu: courtyard homes
              near Thamel, valley lofts near Swayambhu, garden suites, and
              apartments close to Patan.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">How to reach us</h2>
            <div className="mt-3 space-y-1 text-muted">
              <p>+977 9814818429</p>
              <p>+977 9700810681</p>
              <p>thelanternstay@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
