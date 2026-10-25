import Image from "next/image";
import Link from "next/link";

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-md border-2 border-brand bg-brand-gradient px-2.5 py-1.5 transition-senior hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label="Scam Help AI home"
    >
      <Image
        src="/logo.png"
        alt="Scam Help AI"
        width={1024}
        height={429}
        className="h-9 w-auto sm:h-10"
        priority
      />
    </Link>
  );
}
