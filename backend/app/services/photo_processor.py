"""Photo processing service for quest submissions."""
import io
from PIL import Image, ImageFilter, ImageStat
import mediapipe as mp
import exifread
from typing import Dict, Tuple, Optional
from datetime import datetime
import numpy as np  # Only needed for MediaPipe (MediaPipe requires numpy arrays)


# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(
    model_selection=0,  # 0 for short-range, 1 for full-range
    min_detection_confidence=0.5
)


def detect_and_blur_faces(image_bytes: bytes) -> Tuple[bytes, int, int]:
    """
    Detect faces in image and blur them for privacy.
    
    Args:
        image_bytes: Image file bytes
    
    Returns:
        Tuple of (processed_image_bytes, faces_detected, faces_blurred)
    """
    try:
        # Load image with PIL
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Convert to numpy array for MediaPipe
        img_array = np.array(img)
        
        # Detect faces
        results = face_detection.process(img_array)
        
        faces_detected = 0
        faces_blurred = 0
        
        if results.detections:
            h, w = img.size
            
            for detection in results.detections:
                faces_detected += 1
                
                # Get bounding box
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                
                # Add padding (20px)
                padding = 20
                x = max(0, x - padding)
                y = max(0, y - padding)
                width = min(w - x, width + 2 * padding)
                height = min(h - y, height + 2 * padding)
                
                # Extract face region
                face_roi = img.crop((x, y, x + width, y + height))
                
                if face_roi.size[0] > 0 and face_roi.size[1] > 0:
                    # Apply Gaussian blur (using PIL's GaussianBlur filter)
                    # Use a large radius for strong blur
                    blurred_face = face_roi.filter(ImageFilter.GaussianBlur(radius=20))
                    
                    # Paste blurred face back onto image
                    img.paste(blurred_face, (x, y))
                    faces_blurred += 1
        
        # Convert back to bytes
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=90)
        processed_bytes = output.getvalue()
        
        return processed_bytes, faces_detected, faces_blurred
    
    except Exception as e:
        # If processing fails, return original
        return image_bytes, 0, 0


def extract_exif_metadata(image_bytes: bytes) -> Dict:
    """
    Extract EXIF metadata from image.
    
    Args:
        image_bytes: Image file bytes
    
    Returns:
        Dictionary with extracted metadata:
        {
            "has_gps": bool,
            "gps_lat": float | None,
            "gps_lng": float | None,
            "timestamp": datetime | None,
            "camera_model": str | None,
            ...
        }
    """
    result = {
        "has_gps": False,
        "gps_lat": None,
        "gps_lng": None,
        "timestamp": None,
        "camera_model": None,
        "has_exif": False
    }
    
    try:
        # Read EXIF data
        tags = exifread.process_file(io.BytesIO(image_bytes), details=False)
        
        if not tags:
            return result
        
        result["has_exif"] = True
        
        # Extract GPS coordinates
        if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
            lat_ref = tags.get('GPS GPSLatitudeRef', 'N')
            lat = tags['GPS GPSLatitude']
            lon_ref = tags.get('GPS GPSLongitudeRef', 'E')
            lon = tags['GPS GPSLongitude']
            
            # Convert to decimal degrees
            lat_decimal = float(lat.values[0]) + float(lat.values[1]) / 60.0 + float(lat.values[2]) / 3600.0
            if lat_ref.values[0] == 'S':
                lat_decimal = -lat_decimal
            
            lon_decimal = float(lon.values[0]) + float(lon.values[1]) / 60.0 + float(lon.values[2]) / 3600.0
            if lon_ref.values[0] == 'W':
                lon_decimal = -lon_decimal
            
            result["has_gps"] = True
            result["gps_lat"] = lat_decimal
            result["gps_lng"] = lon_decimal
        
        # Extract timestamp
        if 'EXIF DateTimeOriginal' in tags:
            try:
                dt_str = str(tags['EXIF DateTimeOriginal'])
                result["timestamp"] = datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S')
            except:
                pass
        
        # Extract camera model
        if 'Image Model' in tags:
            result["camera_model"] = str(tags['Image Model'])
        elif 'EXIF LensModel' in tags:
            result["camera_model"] = str(tags['EXIF LensModel'])
    
    except Exception as e:
        # If EXIF extraction fails, return default result
        pass
    
    return result


def check_image_quality(image_bytes: bytes) -> Dict:
    """
    Check image quality (blur, brightness, size).
    
    Args:
        image_bytes: Image file bytes
    
    Returns:
        Dictionary with quality metrics:
        {
            "score": int (0-100),
            "is_blurry": bool,
            "is_too_dark": bool,
            "is_too_small": bool,
            "width": int,
            "height": int,
            "blur_score": float
        }
    """
    result = {
        "score": 100,
        "is_blurry": False,
        "is_too_dark": False,
        "is_too_small": False,
        "width": 0,
        "height": 0,
        "blur_score": 0.0
    }
    
    try:
        # Load image with PIL
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'L':
            img = img.convert('L')  # Convert to grayscale
        
        w, h = img.size
        result["width"] = w
        result["height"] = h
        
        # Check size (minimum 640x480)
        min_width, min_height = 640, 480
        if w < min_width or h < min_height:
            result["is_too_small"] = True
            result["score"] -= 30
        
        # Check blur using PIL's built-in statistics
        # Use edge enhancement filter to detect sharpness
        # Sharp images will have more edge content
        # Apply edge detection filter
        edges = img.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)
        
        # Variance of edge pixels indicates sharpness
        # Sharp images have higher variance in edge detection
        edge_variance = edge_stat.var[0] if edge_stat.var else 0
        result["blur_score"] = edge_variance
        
        # Threshold for blur detection
        if edge_variance < 500:  # Adjusted threshold
            result["is_blurry"] = True
            result["score"] -= 40
        
        # Check brightness using PIL's statistics
        brightness_stat = ImageStat.Stat(img)
        avg_brightness = brightness_stat.mean[0] if brightness_stat.mean else 0
        
        # Too dark if average < 50 (out of 255)
        if avg_brightness < 50:
            result["is_too_dark"] = True
            result["score"] -= 20
        
        # Ensure score is between 0 and 100
        result["score"] = max(0, min(100, result["score"]))
    
    except Exception as e:
        # If processing fails, set low score
        result["score"] = 0
    
    return result


def validate_exif_location(
    exif_data: Dict,
    submitted_lat: float,
    submitted_lng: float,
    tolerance_meters: float = 50.0
) -> Dict:
    """
    Validate that EXIF GPS coordinates match submitted location.
    
    Args:
        exif_data: EXIF metadata from extract_exif_metadata
        submitted_lat: Submitted latitude
        submitted_lng: Submitted longitude
        tolerance_meters: Maximum allowed difference in meters
    
    Returns:
        Dictionary with validation result:
        {
            "matches": bool,
            "distance_meters": float | None,
            "reason": str
        }
    """
    if not exif_data.get("has_gps"):
        return {
            "matches": True,  # Missing EXIF is a warning, not rejection
            "distance_meters": None,
            "reason": "No GPS data in EXIF (warning only)"
        }
    
    # Calculate distance between EXIF GPS and submitted location
    from app.utils.gps_verification import haversine_distance
    
    distance = haversine_distance(
        exif_data["gps_lat"],
        exif_data["gps_lng"],
        submitted_lat,
        submitted_lng
    )
    
    if distance > tolerance_meters:
        return {
            "matches": False,
            "distance_meters": distance,
            "reason": f"EXIF GPS location ({distance:.0f}m away) doesn't match submitted location"
        }
    
    return {
        "matches": True,
        "distance_meters": distance,
        "reason": "EXIF GPS location matches submitted location"
    }
