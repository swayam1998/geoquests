"use client";

import Link from "next/link";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          {/* Logo + Title + Tagline */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 w-fit group"
            >
              <GlobeHemisphereWestIcon
                size={32}
                weight="fill"
                className="text-brand transition-transform duration-300 group-hover:scale-110 shrink-0"
              />
              <span className="text-xl sm:text-2xl font-extrabold text-foreground whitespace-nowrap tracking-tight">
                GeoQuests
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Get a reason to explore the world. Create and complete location-based photo quests.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-10 gap-y-8 sm:gap-x-12">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#map"
                    className="text-sm text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Create Quest
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Contact
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:support@geoquests.io"
                    className="text-sm text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    support@geoquests.io
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {currentYear} GeoQuests. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
