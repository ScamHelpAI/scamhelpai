"use client";

import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  siteHeaderNavItems,
  siteHeaderNavLinkProps,
} from "@/components/site-header-nav";
import { SiteLogo } from "@/components/site-logo";
import { cn } from "cn";

const desktopNavLinkClassName =
  "text-[15px] font-medium text-muted-foreground transition-senior hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const mobileNavLinkClassName =
  "block rounded-lg px-3 py-3 text-[17px] font-medium text-foreground transition-senior hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function SiteHeaderInner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, closeMenu]);

  return (
    <>
      <header className="relative flex items-center justify-center px-5 py-5 sm:px-8">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 sm:left-8">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="sm:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>

        <SiteLogo />

        <nav
          aria-label="Primary"
          className="absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-6 sm:right-8 sm:flex"
        >
          {siteHeaderNavItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              {...siteHeaderNavLinkProps(item)}
              className={desktopNavLinkClassName}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] transition-opacity sm:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />

      <nav
        id={menuId}
        aria-label="Primary"
        aria-hidden={!menuOpen}
        className={cn(
          "absolute inset-x-0 top-full z-50 border-b border-border bg-card px-5 py-3 shadow-md transition-[transform,opacity] duration-200 ease-out sm:hidden",
          menuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <ul className="flex flex-col gap-1">
          {siteHeaderNavItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                {...siteHeaderNavLinkProps(item)}
                className={mobileNavLinkClassName}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
