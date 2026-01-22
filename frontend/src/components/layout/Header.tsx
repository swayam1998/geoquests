"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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
              {/* Create Quest Button - Always visible */}
              <Link
                href="/create"
                className="font-semibold text-white bg-[#1A1A1A] rounded-full hover:bg-[#333333] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap px-6 py-2.5 text-sm"
                style={{
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                }}
              >
                Create Quest
              </Link>

              {/* User Menu - Only shown when authenticated */}
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    {user?.avatar_url && !avatarError ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || user.email}
                        className="rounded-full w-8 h-8 object-cover hover:scale-105 transition-transform duration-300 border-2 border-transparent hover:border-gray-300"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="rounded-full bg-gray-800 flex items-center justify-center text-white font-medium text-sm hover:bg-gray-700 hover:scale-105 transition-all duration-300 w-8 h-8">
                        {user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user?.display_name || "User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {user?.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Settings
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-1 mt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="font-medium text-gray-700 hover:text-gray-900 transition-colors duration-300 whitespace-nowrap px-4 py-2 text-sm"
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
