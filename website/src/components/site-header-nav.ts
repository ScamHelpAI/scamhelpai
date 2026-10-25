export const siteHeaderNavItems = [
  { href: "#", label: "How it works" },
  { href: "/extension", label: "Extension" },
  { href: "#", label: "About" },
  {
    href: "https://studentsagainstscams.org",
    label: "Students Against Scams",
    external: true,
  },
] as const;

export type SiteHeaderNavItem = (typeof siteHeaderNavItems)[number];

export function siteHeaderNavLinkProps(item: SiteHeaderNavItem) {
  return "external" in item && item.external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};
}
