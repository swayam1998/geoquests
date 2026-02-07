"""GPS verification utilities for quest submissions."""
import math
from typing import Dict


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth using Haversine formula.
    
    Args:
        lat1: Latitude of first point in degrees
        lon1: Longitude of first point in degrees
        lat2: Latitude of second point in degrees
        lon2: Longitude of second point in degrees
    
    Returns:
        Distance in meters
    """
    # Earth's radius in meters
    R = 6371000
    
    # Convert degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (
        math.sin(delta_phi / 2) ** 2 +
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance


def verify_gps_location(
    explorer_lat: float,
    explorer_lng: float,
    explorer_accuracy: float,
    quest_lat: float,
    quest_lng: float,
    quest_radius: int
) -> Dict[str, any]:
    """
    Verify if explorer's GPS location is within quest radius and has acceptable accuracy.
    
    Args:
        explorer_lat: Explorer's latitude
        explorer_lng: Explorer's longitude
        explorer_accuracy: GPS accuracy in meters
        quest_lat: Quest location latitude
        quest_lng: Quest location longitude
        quest_radius: Quest radius in meters
    
    Returns:
        Dictionary with verification result:
        {
            "verified": bool,
            "distance_meters": float,
            "reason": str
        }
    """
    # Calculate distance
    distance = haversine_distance(explorer_lat, explorer_lng, quest_lat, quest_lng)
    
    # Check accuracy (must be less than 100m)
    if explorer_accuracy is not None and explorer_accuracy >= 100:
        return {
            "verified": False,
            "distance_meters": distance,
            "reason": f"GPS accuracy too low ({explorer_accuracy:.1f}m). Move to an open area for better signal."
        }
    
    # Check if within radius
    if distance > quest_radius:
        return {
            "verified": False,
            "distance_meters": distance,
            "reason": f"You are {distance:.0f}m away from the quest location. Get within {quest_radius}m to complete it."
        }
    
    return {
        "verified": True,
        "distance_meters": distance,
        "reason": "Location verified successfully"
    }
