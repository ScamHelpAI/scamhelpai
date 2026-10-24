import Image from "next/image";
import Link from "next/link";

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-md border-2 border-brand bg-card px-2.5 py-1.5 text-foreground transition-senior hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label="Scam Help AI home"
    >
      <Image
        src="/logo.png"
        alt=""
        width={28}
        height={28}
        className="size-7 rounded-sm"
        priority
      />
      <span className="font-heading text-sm font-bold tracking-wide uppercase sm:text-base">
        Scam Help.AI
      </span>
    </Link>
  );
}
