import { QuestIdea } from "@/types";

export const questIdeas: QuestIdea[] = [
  // Emotional Ideas
  {
    id: "where-we-met",
    title: "Where We First Met",
    description: "Send someone special to the exact spot where you first met. Let them rediscover that moment.",
    icon: "💝",
    category: "emotional",
    tips: [
      "Pick the exact spot, not just the building",
      "Add a personal hint only they'd understand",
      "Share it on their birthday or anniversary",
    ],
  },
  {
    id: "secret-coffee",
    title: "Secret Coffee Spot",
    description: "Share that cafe only locals know about. The one tourists never find.",
    icon: "☕",
    category: "emotional",
    tips: [
      "Describe what makes it special",
      "Mention your favorite drink or seat",
      "Best time to visit",
    ],
  },
  {
    id: "sunset-view",
    title: "Best Sunset View",
    description: "Your favorite spot to watch the sunset. Share the magic with others.",
    icon: "🌅",
    category: "emotional",
    tips: [
      "Mention the best time of year",
      "Describe what you see",
      "Any tips for getting there",
    ],
  },
  {
    id: "street-art",
    title: "Street Art Hunt",
    description: "Found an amazing mural hidden in an alley? Let others discover it too.",
    icon: "🎨",
    category: "emotional",
    tips: [
      "Describe the art style or theme",
      "Include nearby landmarks",
      "Note if it might be temporary",
    ],
  },
  {
    id: "childhood-spot",
    title: "Childhood Playground",
    description: "Share your favorite childhood spot with someone special.",
    icon: "🏠",
    category: "emotional",
    tips: [
      "Share a memory from there",
      "Describe what made it special",
      "How has it changed?",
    ],
  },
  {
    id: "hidden-waterfall",
    title: "Hidden Waterfall",
    description: "That nature spot you discovered by accident. A secret worth sharing.",
    icon: "🌊",
    category: "emotional",
    tips: [
      "Describe the trail or path",
      "Best season to visit",
      "What to bring",
    ],
  },
  {
    id: "best-bench",
    title: "Best Bench in Town",
    description: "Sometimes it's just about sitting and watching. Share your favorite thinking spot.",
    icon: "🪑",
    category: "emotional",
    tips: [
      "What makes the view special?",
      "Best time of day",
      "What do you think about there?",
    ],
  },
  // Practical Ideas
  {
    id: "queue-check",
    title: "Queue Length Check",
    description: "Need to know if somewhere is busy before you go? Get a real photo of the current line.",
    icon: "⏱️",
    category: "practical",
    tips: [
      "Great for restaurants, government offices",
      "Theme park rides, store releases",
      "Be specific about which entrance",
    ],
  },
  {
    id: "parking-check",
    title: "Parking Situation",
    description: "Is there parking available? Get a verified photo before you drive there.",
    icon: "🅿️",
    category: "practical",
    tips: [
      "Specify the parking lot or street",
      "Include time of day in description",
      "Mention if paid or free matters",
    ],
  },
  {
    id: "crowd-check",
    title: "Is it Crowded?",
    description: "See how busy a place is right now. Beach, gym, cafe, or park.",
    icon: "👥",
    category: "practical",
    tips: [
      "Ask for a wide shot",
      "Specify indoor or outdoor",
      "Time-sensitive quests work best",
    ],
  },
  {
    id: "trail-conditions",
    title: "Trail Conditions",
    description: "How muddy, snowy, or clear is the hiking path? Know before you go.",
    icon: "🥾",
    category: "practical",
    tips: [
      "Specify the section of trail",
      "Ask about water crossings",
      "Recent weather context helps",
    ],
  },
  {
    id: "is-it-open",
    title: "Is it Open?",
    description: "Verify if a small shop, food truck, or pop-up is actually open today.",
    icon: "🚪",
    category: "practical",
    tips: [
      "Great for irregular hours",
      "Food trucks and markets",
      "Holiday schedules",
    ],
  },
  {
    id: "beach-status",
    title: "Beach Status",
    description: "Is it crowded? Clean? Safe to swim? Get the real picture.",
    icon: "🏖️",
    category: "practical",
    tips: [
      "Ask about water conditions",
      "Lifeguard on duty?",
      "Specific section of beach",
    ],
  },
  {
    id: "construction-update",
    title: "Construction Update",
    description: "Is the road or path still blocked? Get an update before planning your route.",
    icon: "🚧",
    category: "practical",
    tips: [
      "Useful for commute planning",
      "Ask about alternate routes",
      "Is there a detour sign?",
    ],
  },
];

// Get shuffled mix of emotional and practical ideas
export function getShuffledIdeas(count: number = 8): QuestIdea[] {
  const shuffled = [...questIdeas].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get ideas by category
export function getIdeasByCategory(category: "emotional" | "practical"): QuestIdea[] {
  return questIdeas.filter((idea) => idea.category === category);
}
