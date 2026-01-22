"use client";

import { useState, useMemo } from "react";
import { Quest, QuestCategory } from "@/types";

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

const CATEGORIES: { value: QuestCategory | "ALL"; label: string; icon: string }[] = [
  { value: "ALL", label: "All", icon: "🌍" },
  { value: "nature", label: "Nature", icon: "🌅" },
  { value: "food", label: "Food", icon: "🍜" },
  { value: "art", label: "Art", icon: "🎨" },
  { value: "adventure", label: "Adventure", icon: "🏔️" },
  { value: "hidden_gem", label: "Hidden Gems", icon: "💎" },
  { value: "memories", label: "Memories", icon: "📸" },
  { value: "social", label: "Social", icon: "👥" },
  { value: "practical", label: "Practical", icon: "⏱️" },
];

export function QuestsTable({ quests, onQuestClick }: QuestsTableProps) {
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "popular">("newest");

  const filteredQuests = useMemo(() => {
    let filtered = [...quests];

    // Filter by country
    if (selectedCountry !== "ALL") {
      filtered = filtered.filter((q) => q.countryCode === selectedCountry);
    }

    // Filter by category
    if (selectedCategory !== "ALL") {
      filtered = filtered.filter((q) => q.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case "popular":
        filtered.sort((a, b) => b.completionCount - a.completionCount);
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [quests, selectedCountry, selectedCategory, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight">
          Quests
        </h2>
        <span className="text-sm text-[#6B7280]">
          {filteredQuests.length} {filteredQuests.length === 1 ? "quest" : "quests"}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Country Filter */}
        <div className="relative">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white rounded-full text-sm font-medium text-[#1A1A1A] border border-[#E5E7EB] hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent cursor-pointer transition-colors"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as QuestCategory | "ALL")}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white rounded-full text-sm font-medium text-[#1A1A1A] border border-[#E5E7EB] hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent cursor-pointer transition-colors"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Sort */}
        <div className="relative ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "rating" | "popular")}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white rounded-full text-sm font-medium text-[#1A1A1A] border border-[#E5E7EB] hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent cursor-pointer transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="popular">Most Popular</option>
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Quest
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">
                Category
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden md:table-cell">
                Rating
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Completed
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filteredQuests.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                  No quests found matching your filters
                </td>
              </tr>
            ) : (
              filteredQuests.map((quest) => (
                <tr
                  key={quest.id}
                  onClick={() => onQuestClick?.(quest)}
                  className="hover:bg-[#FAFAFA] cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{quest.categoryIcon}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1A1A] truncate">{quest.title}</p>
                        <p className="text-sm text-[#6B7280] truncate max-w-[200px] sm:max-w-[300px]">
                          {quest.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#1A1A1A] capitalize">
                      {quest.category.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center hidden md:table-cell">
                    {quest.avgRating ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#1A1A1A]">
                        <span className="text-amber-500">★</span>
                        {quest.avgRating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm text-[#9CA3AF]">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {quest.completionCount}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <svg
                      className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all duration-200"
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
