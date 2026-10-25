import { SiteLogo } from "@/components/site-logo";

const navItems = [
  { href: "#", label: "How it works" },
  { href: "/extension", label: "Extension" },
  { href: "#", label: "About" },
  {
    href: "https://studentsagainstscams.org",
    label: "Students Against Scams",
    external: true,
  },
] as const;

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <SiteLogo />
      <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            {...("external" in item && item.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="text-[15px] font-medium text-muted-foreground transition-senior hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
