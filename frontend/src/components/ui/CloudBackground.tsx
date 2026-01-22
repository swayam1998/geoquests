"use client";

export function CloudBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cloud 1 - Top left */}
      <div className="cloud absolute top-20 left-[5%] opacity-90">
        <svg width="180" height="80" viewBox="0 0 180 80" fill="none">
          <ellipse cx="50" cy="50" rx="40" ry="25" fill="white" fillOpacity="0.9" />
          <ellipse cx="90" cy="45" rx="50" ry="30" fill="white" fillOpacity="0.9" />
          <ellipse cx="130" cy="50" rx="35" ry="22" fill="white" fillOpacity="0.9" />
        </svg>
      </div>

      {/* Cloud 2 - Top right */}
      <div className="cloud-slow absolute top-32 right-[10%] opacity-80">
        <svg width="150" height="70" viewBox="0 0 150 70" fill="none">
          <ellipse cx="40" cy="40" rx="35" ry="22" fill="white" fillOpacity="0.85" />
          <ellipse cx="80" cy="35" rx="45" ry="28" fill="white" fillOpacity="0.85" />
          <ellipse cx="115" cy="40" rx="30" ry="20" fill="white" fillOpacity="0.85" />
        </svg>
      </div>

      {/* Cloud 3 - Middle left */}
      <div className="cloud-fast absolute top-[40%] left-[2%] opacity-70">
        <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
          <ellipse cx="35" cy="35" rx="28" ry="18" fill="white" fillOpacity="0.8" />
          <ellipse cx="65" cy="30" rx="35" ry="22" fill="white" fillOpacity="0.8" />
          <ellipse cx="95" cy="35" rx="25" ry="16" fill="white" fillOpacity="0.8" />
        </svg>
      </div>

      {/* Cloud 4 - Middle right */}
      <div className="cloud absolute top-[50%] right-[5%] opacity-60">
        <svg width="140" height="65" viewBox="0 0 140 65" fill="none">
          <ellipse cx="40" cy="38" rx="32" ry="20" fill="white" fillOpacity="0.75" />
          <ellipse cx="75" cy="32" rx="42" ry="26" fill="white" fillOpacity="0.75" />
          <ellipse cx="110" cy="38" rx="28" ry="18" fill="white" fillOpacity="0.75" />
        </svg>
      </div>

      {/* Cloud 5 - Bottom */}
      <div className="cloud-slow absolute bottom-[20%] left-[20%] opacity-50">
        <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
          <ellipse cx="55" cy="55" rx="45" ry="28" fill="white" fillOpacity="0.7" />
          <ellipse cx="100" cy="48" rx="55" ry="35" fill="white" fillOpacity="0.7" />
          <ellipse cx="150" cy="55" rx="40" ry="25" fill="white" fillOpacity="0.7" />
        </svg>
      </div>
    </div>
  );
}
