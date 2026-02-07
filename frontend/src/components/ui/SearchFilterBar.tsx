"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass } from "@phosphor-icons/react";

interface SearchFilterBarProps {
  onSearch?: (query: string) => void;
  onCountryChange?: (country: string) => void;
  onNearbyToggle?: () => void;
  selectedCountry?: string;
  isNearbyActive?: boolean;
}

const countries = [
  { code: "all", name: "All Countries", flag: "🌍" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "FR", name: "France", flag: "🇫🇷" },
];

export function SearchFilterBar({
  onSearch,
  onCountryChange,
  onNearbyToggle,
  selectedCountry = "all",
  isNearbyActive = false,
}: SearchFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const currentCountry = countries.find((c) => c.code === selectedCountry) || countries[0];

  return (
    <div className="px-4 py-3 bg-card border-b border-border">
      {/* Search Input */}
      <div className="relative mb-3">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" weight="regular" />
        <Input
          type="text"
          placeholder="Search quests..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm focus:ring-2 focus:ring-action-blue focus:bg-card"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {/* Country Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsCountryOpen(!isCountryOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <span>{currentCountry.flag}</span>
            <span>{currentCountry.code === "all" ? "Country" : currentCountry.name}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isCountryOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* Dropdown */}
          {isCountryOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-card rounded-xl shadow-lg border border-border py-1 z-50">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    onCountryChange?.(country.code);
                    setIsCountryOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-hover ${
                    selectedCountry === country.code ? "bg-action-blue/10 text-action-blue" : ""
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nearby Toggle */}
        <Button
          variant={isNearbyActive ? "default" : "outline"}
          onClick={onNearbyToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
            isNearbyActive
              ? "bg-tab-active text-white hover:bg-action-blue-hover"
              : "bg-muted hover:bg-surface-hover"
          }`}
        >
          <span>📍</span>
          <span>Nearby</span>
        </Button>

        {/* Top Filter */}
        <Button
          variant="outline"
          className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          <span>🔥</span>
          <span>Top</span>
        </Button>

        {/* New Filter */}
        <Button
          variant="outline"
          className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          <span>🆕</span>
          <span>New</span>
        </Button>
      </div>
    </div>
  );
}
