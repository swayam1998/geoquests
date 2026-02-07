import { QuestIdea } from "@/types";

export const questIdeas: QuestIdea[] = [
  // Disaster & Emergency
  {
    id: "road-condition",
    title: "Road Condition After Storm",
    description:
      "Is the road passable? Take a photo of the road surface showing any damage, debris, or flooding.",
    icon: "compass",
    category: "practical",
  },
  {
    id: "flood-level",
    title: "Flood Level Check",
    description:
      "How flooded is this street or intersection? Photo showing water level and whether it's safe to drive or walk.",
    icon: "compass",
    category: "practical",
  },
  {
    id: "building-damage",
    title: "Building Damage Assessment",
    description:
      "Assess this building: photo of any structural damage and street access for relief planning.",
    icon: "compass",
    category: "practical",
  },
  {
    id: "relief-point",
    title: "Shelter / Relief Point Status",
    description:
      "Is this shelter or relief point open and accessible? Photo of entrance and any signage.",
    icon: "compass",
    category: "practical",
  },
  // Roads & Travel
  {
    id: "snow-cleared",
    title: "Snow Clearance Check",
    description:
      "Is the snow cleared from this road? Photo of the road surface — safe to drive?",
    icon: "compass",
    category: "practical",
  },
  {
    id: "bridge-open",
    title: "Bridge / Pass Open?",
    description:
      "Is this bridge or mountain pass open? Photo of the crossing or any closure signs.",
    icon: "compass",
    category: "practical",
  },
  // Local Business & Amenities
  {
    id: "storefront-check",
    title: "Business Storefront Check",
    description:
      "How does this business look from the street? Photo of the storefront and entrance — is it open?",
    icon: "compass",
    category: "practical",
  },
  {
    id: "queue-check",
    title: "Queue / Wait Time Check",
    description:
      "How long is the queue at this location right now? One photo from the back of the line.",
    icon: "compass",
    category: "practical",
  },
  // Traffic & Parking
  {
    id: "parking-check",
    title: "Parking Availability",
    description:
      "How full is the parking lot? Photo from a clear vantage point showing available spaces.",
    icon: "compass",
    category: "practical",
  },
  {
    id: "traffic-check",
    title: "Traffic Conditions",
    description:
      "How is the traffic at this intersection right now? One photo showing current conditions.",
    icon: "compass",
    category: "practical",
  },
  // Neighborhood & Community
  {
    id: "playground-condition",
    title: "Playground Condition",
    description:
      "Is the playground in good condition? Photo of equipment and surface — safe for kids?",
    icon: "compass",
    category: "practical",
  },
  {
    id: "school-route",
    title: "School Route Safety",
    description:
      "Is the school route safe? Photo of the critical segment — any flooding, ice, or obstruction?",
    icon: "compass",
    category: "practical",
  },
  // Environmental
  {
    id: "trail-conditions",
    title: "Trail Conditions",
    description:
      "Is the trail clear of fallen trees or debris? Photo of the path showing current conditions.",
    icon: "compass",
    category: "practical",
  },
  {
    id: "river-level",
    title: "River / Creek Water Level",
    description:
      "How high is the river or creek? Photo showing water level compared to the banks.",
    icon: "compass",
    category: "practical",
  },
  // Journalist / Verification
  {
    id: "ground-truth",
    title: "Ground Truth Verification",
    description:
      "Reports coming in about this location. Can you send a photo of the current situation from a safe distance?",
    icon: "compass",
    category: "practical",
  },
  {
    id: "crowd-assessment",
    title: "Crowd / Event Assessment",
    description:
      "How crowded is this venue or public space right now? One wide photo showing the scene.",
    icon: "compass",
    category: "practical",
  },
  // Construction & Real Estate
  {
    id: "construction-progress",
    title: "Construction Progress",
    description:
      "Document the construction site — fencing, machinery, and progress. Is the project on track?",
    icon: "compass",
    category: "practical",
  },
  {
    id: "property-check",
    title: "Property Condition Check",
    description:
      "Current state of the property: photo of the front and any 'for sale' or construction signs.",
    icon: "compass",
    category: "practical",
  },
  // Emergency & Safety
  {
    id: "emergency-access",
    title: "Emergency Vehicle Access",
    description:
      "Can ambulances or fire trucks access this address? Photo of road width, obstructions, or gates.",
    icon: "compass",
    category: "practical",
  },
  {
    id: "power-lines-down",
    title: "Power Lines / Trees Down",
    description:
      "Document any downed power lines or fallen trees at this location — one clear photo for utilities.",
    icon: "compass",
    category: "practical",
  },
];

// Get shuffled mix of ideas
export function getShuffledIdeas(count: number = 10): QuestIdea[] {
  const shuffled = [...questIdeas].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get ideas by category
export function getIdeasByCategory(
  category: "emotional" | "practical"
): QuestIdea[] {
  return questIdeas.filter((idea) => idea.category === category);
}
