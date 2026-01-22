"use client";

import { useState } from "react";

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
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      {/* Search Input */}
      <div className="relative mb-3">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search quests..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {/* Country Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCountryOpen(!isCountryOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
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
          </button>

          {/* Dropdown */}
          {isCountryOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    onCountryChange?.(country.code);
                    setIsCountryOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                    selectedCountry === country.code ? "bg-blue-50 text-blue-600" : ""
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
        <button
          onClick={onNearbyToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
            isNearbyActive
              ? "bg-blue-600 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <span>📍</span>
          <span>Nearby</span>
        </button>

        {/* Top Filter */}
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
          <span>🔥</span>
          <span>Top</span>
        </button>

        {/* New Filter */}
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
          <span>🆕</span>
          <span>New</span>
        </button>
      </div>
    </div>
  );
}
