'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left: Logo + Text */}
        <Link href="/" className="flex items-center gap-3 text-white font-bold text-xl no-underline">
          <Image
            src="/nailart.png"
            alt="Nailart AI Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span>Nailart AI</span>
        </Link>

        {/* Center: Navigation Links */}
        <div className="flex gap-8 items-center">
          <Link
            href="#features"
            className="text-white/90 no-underline text-sm font-medium transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-white/90 no-underline text-sm font-medium transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="#contact"
            className="text-white/90 no-underline text-sm font-medium transition-colors hover:text-white"
          >
            Contact
          </Link>
        </div>

        {/* Right: Get Started Button */}
        <Link
          href="/auth"
          className="px-6 py-2.5 rounded-lg bg-gradient-to-b from-white/22 to-white/10 text-white no-underline font-semibold text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,.3),0_8px_24px_rgba(0,0,0,.15)] backdrop-blur-sm transition-all hover:from-white/28 hover:to-white/16 hover:-translate-y-px"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
