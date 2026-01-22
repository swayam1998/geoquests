"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface HeaderProps {
  isLoggedIn?: boolean;
  user?: {
    displayName?: string;
    avatarUrl?: string;
  };
}

export function Header({ isLoggedIn = false, user }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
      <div className="mt-4 mx-4 animate-header-slide-down pointer-events-auto">
        {/* Apple-style frosted glass container */}
        <div 
          className="relative rounded-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] px-6 py-3"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
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
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2.5 group"
            >
              {/* Map pin icon */}
              <span className="text-2xl transition-transform duration-300 group-hover:scale-110">📍</span>
              <span className="text-xl md:text-2xl font-bold text-[#1A1A1A] whitespace-nowrap tracking-tight">
                GeoQuests
              </span>
            </Link>

            {/* Center: Nav Links - hide on scroll */}
            <nav 
              className="hidden md:flex items-center gap-1 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                maxWidth: isScrolled ? 0 : 300,
                opacity: isScrolled ? 0 : 1,
                paddingLeft: isScrolled ? 0 : 16,
                paddingRight: isScrolled ? 0 : 16,
              }}
            >
              <Link 
                href="/quests" 
                className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full transition-all duration-300 hover:bg-black/5 whitespace-nowrap"
              >
                Explore
              </Link>
              <Link 
                href="/create" 
                className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full transition-all duration-300 hover:bg-black/5 whitespace-nowrap"
              >
                Create
              </Link>
              <Link 
                href="/about" 
                className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full transition-all duration-300 hover:bg-black/5 whitespace-nowrap"
              >
                About
              </Link>
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <button className="p-2 hover:bg-black/5 rounded-full transition-all duration-300 relative group">
                    <svg
                      className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </button>
                  <button 
                    className="rounded-full bg-gray-800 flex items-center justify-center text-white font-medium text-sm hover:bg-gray-700 hover:scale-105 transition-all duration-300 w-8 h-8"
                  >
                    {user?.displayName?.[0]?.toUpperCase() || "U"}
                  </button>
                </>
              ) : (
                <Link
                  href="/create"
                  className="font-semibold text-white bg-[#1A1A1A] rounded-full hover:bg-[#333333] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap px-6 py-2.5 text-sm"
                  style={{
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  Create Quest
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
