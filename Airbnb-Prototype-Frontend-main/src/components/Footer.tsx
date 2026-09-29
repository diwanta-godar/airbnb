import Image from "next/image";
import Link from "next/link";

const INSTAGRAM_URL = "https://www.instagram.com/thelanternstay/";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:px-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative overflow-hidden rounded-md ring-1 ring-white/15">
              <Image
                src="/brand/logo.png"
                alt="The Lantern Stay"
                width={56}
                height={56}
                className="h-14 w-14 object-cover"
              />
            </span>
            <span>
              <span className="block font-brand text-lg tracking-[0.04em]">
                THE LANTERN STAY
              </span>
              <span className="mt-0.5 block text-xs tracking-[0.08em] text-[#D47A3B]">
                Atithi Devo Bhavah
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Vacation home rental in Kathmandu. Cozy stays for travelers who want
            a quiet base in the city.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Explore</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/75">
            <Link href="/stays">All stays</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-white"
            >
              <InstagramIcon className="h-4 w-4" />
              Instagram
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Contact</p>
          <div className="mt-3 space-y-2 text-sm text-white/75">
            <p>
              <a href="tel:+9779814818429">+977 9814818429</a>
            </p>
            <p>
              <a href="tel:+9779700810681">+977 9700810681</a>
            </p>
            <p>
              <a href="https://wa.me/9779814818429" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </p>
            <p>
              <a href="mailto:thelanternstay@gmail.com">
                thelanternstay@gmail.com
              </a>
            </p>
            <p>Kathmandu, Nepal</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/45 md:px-6">
        {new Date().getFullYear()} The Lantern Stay
      </div>
    </footer>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zm8.75 2a1 1 0 110 2 1 1 0 010-2zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
    </svg>
  );
}
