"use client";

import { useState, useMemo } from "react";
import { Quest } from "@/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineDistance, formatDistance } from "@/lib/geo";

interface QuestsTableProps {
  quests: Quest[];
  onQuestClick?: (quest: Quest) => void;
}

const COUNTRIES = [
  { code: "ALL", name: "All Countries" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "IN", name: "India" },
];

export function QuestsTable({ quests, onQuestClick }: QuestsTableProps) {
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "nearest">("newest");
  const { location: userLocation } = useUserLocation();

  // Pre-compute distances for each quest
  const questDistances = useMemo(() => {
    if (!userLocation) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const quest of quests) {
      map.set(
        quest.id,
        haversineDistance(userLocation.lat, userLocation.lng, quest.location.lat, quest.location.lng)
      );
    }
    return map;
  }, [quests, userLocation]);

  const filteredQuests = useMemo(() => {
    let filtered = [...quests];

    // Filter by country
    if (selectedCountry !== "ALL") {
      filtered = filtered.filter((q) => q.countryCode === selectedCountry);
    }

    // Sort
    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => b.completionCount - a.completionCount);
        break;
      case "nearest":
        if (userLocation) {
          filtered.sort((a, b) => (questDistances.get(a.id) ?? Infinity) - (questDistances.get(b.id) ?? Infinity));
        }
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [quests, selectedCountry, sortBy, userLocation, questDistances]);

  // Show all quests (with scrollbar limiting visible area to ~10 quests)
  const displayedQuests = useMemo(() => {
    return filteredQuests;
  }, [filteredQuests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Quests
        </h2>
        <span className="text-sm text-text-secondary">
          {filteredQuests.length} {filteredQuests.length === 1 ? "quest" : "quests"}
        </span>
      </div>

      {/* Filters - stack on small screens for full-width selects */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        {/* Country Filter */}
        <div className="relative w-full sm:w-auto min-w-0">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 bg-card rounded-full text-sm font-medium text-foreground border border-border hover:border-text-tertiary focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent cursor-pointer transition-colors"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Sort */}
        <div className="relative w-full sm:w-auto sm:ml-auto min-w-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "popular" | "nearest")}
            className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 bg-card rounded-full text-sm font-medium text-foreground border border-border hover:border-text-tertiary focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent cursor-pointer transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            {userLocation && <option value="nearest">Nearest</option>}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Table - white background; horizontal scroll on narrow screens */}
      <div className="overflow-hidden rounded-2xl border border-border-warm bg-card">
        <div className="overflow-x-auto overflow-y-auto quest-list-scrollbar max-h-[50vh] md:max-h-[650px]">
          <table className="w-full min-w-[400px]">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border-warm">
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Quest
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Completed
                </th>
                {userLocation && (
                  <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell">
                    Distance
                  </th>
                )}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm">
              {filteredQuests.length === 0 ? (
                <tr>
                  <td colSpan={userLocation ? 4 : 3} className="py-12 text-center text-text-secondary">
                    No quests found matching your filters
                  </td>
                </tr>
              ) : (
                displayedQuests.map((quest) => {
                  const dist = questDistances.get(quest.id);
                  return (
                    <tr
                      key={quest.id}
                      onClick={() => onQuestClick?.(quest)}
                      className="hover:bg-surface-hover cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{quest.title}</p>
                            <p className="text-sm text-text-secondary truncate max-w-[200px] sm:max-w-[300px]">
                              {quest.description}
                            </p>
                            {/* Show distance inline on mobile when location available */}
                            {userLocation && dist !== undefined && (
                              <p className="text-xs text-text-tertiary mt-0.5 sm:hidden">
                                {formatDistance(dist)} away
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-foreground">
                          {quest.completionCount}
                        </span>
                      </td>
                      {userLocation && (
                        <td className="py-4 px-4 text-center hidden sm:table-cell">
                          <span className="text-sm text-text-secondary">
                            {dist !== undefined ? formatDistance(dist) : "—"}
                          </span>
                        </td>
                      )}
                      <td className="py-4 px-2">
                        <svg
                          className="w-5 h-5 text-text-tertiary group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
