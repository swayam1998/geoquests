"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isAuthenticated, user, logout } = useAuthContext();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar_url]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
      <div className="mt-4 header-safe-top mx-4 header-safe-x animate-header-slide-down pointer-events-auto">
        {/* Apple-style frosted glass container */}
        <div 
          className="relative rounded-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] px-3 sm:px-6 py-2 sm:py-3 bg-card/75 backdrop-blur-xl  "
          style={{
            boxShadow: isScrolled 
              ? `
                0 2px 8px rgba(0, 0, 0, 0.08),
                0 4px 16px rgba(0, 0, 0, 0.06),
                0 8px 32px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.8),
                inset 0 -1px 0 rgba(0, 0, 0, 0.05)
              `
              : `
                0 4px 12px rgba(0, 0, 0, 0.1),
                0 8px 24px rgba(0, 0, 0, 0.08),
                0 16px 48px rgba(0, 0, 0, 0.06),
                0 24px 64px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.9),
                inset 0 -1px 0 rgba(0, 0, 0, 0.05)
              `,
          }}
        >
          <div className="flex items-center justify-center">
            {/* 1. Logo - very large margin for clear separation before Create Quest */}
            <Link 
              href="/" 
              className="flex items-center gap-1.5 sm:gap-2.5 group mr-16 sm:mr-24 md:mr-32"
            >
              <GlobeHemisphereWestIcon size={40} weight="fill" className="text-brand transition-transform duration-300 group-hover:scale-110 shrink-0" />
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground whitespace-nowrap tracking-tight">
                GeoQuests
              </span>
            </Link>

            {/* 2. Create Quest + Profile/Sign in - tight gap between these two */}
            <div className="flex items-center gap-1">
            <Button asChild size="lg" className="whitespace-nowrap px-3 sm:px-6 text-sm sm:text-base">
              <Link href="/#map">Create Quest</Link>
            </Button>

            {/* 3. Sign in or User menu - to the right of Create Quest */}
            {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-0 h-auto"
                  >
                    {user?.avatar_url && !avatarError ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || user.email}
                        className="rounded-full w-8 h-8 object-cover hover:scale-105 transition-transform duration-300 border-2 border-transparent hover:border-border"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm hover:bg-primary/80 hover:scale-105 transition-all duration-300 w-8 h-8">
                        {user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </Button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl bg-card shadow-2xl border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {user?.display_name || "User"}
                        </p>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {user?.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href={user ? `/user/${user.id}` : "/profile"}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Profile
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-border pt-1 mt-1">
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors justify-start"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Sign out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 whitespace-nowrap px-2 sm:px-4 h-10 text-sm sm:text-base"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
