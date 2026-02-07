"use client";

interface MapPlaceholderProps {
  questCount?: number;
}

export function MapPlaceholder({ questCount = 12 }: MapPlaceholderProps) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #EFF6FF, #FFF5F2)' }}>
      {/* Mock Map Background */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[...Array(10)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={i * 10}
              x2="100"
              y2={i * 10}
              stroke="#94a3b8"
              strokeWidth="0.2"
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 10}
              y1="0"
              x2={i * 10}
              y2="100"
              stroke="#94a3b8"
              strokeWidth="0.2"
            />
          ))}
        </svg>
      </div>

      {/* Quest Markers (mock) */}
      <div className="absolute inset-0">
        {[
          { x: 25, y: 30 },
          { x: 45, y: 20 },
          { x: 65, y: 35 },
          { x: 30, y: 55 },
          { x: 55, y: 50 },
          { x: 75, y: 60 },
          { x: 40, y: 70 },
          { x: 60, y: 75 },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
              📍
            </div>
          </div>
        ))}

        {/* User Location */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "50%", top: "45%" }}
        >
          <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
          <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping" />
        </div>
      </div>

      {/* Map will be integrated here */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          🗺️ Map loading... ({questCount} quests nearby)
        </p>
      </div>

      {/* Recenter Button */}
      <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50">
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
}
