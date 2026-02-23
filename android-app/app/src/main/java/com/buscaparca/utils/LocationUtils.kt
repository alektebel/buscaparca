package com.buscaparca.utils

import com.google.android.gms.maps.model.LatLng
import kotlin.math.*

object LocationUtils {
    
    private const val EARTH_RADIUS_KM = 6371.0
    
    /**
     * Calculate distance between two points using Haversine formula
     * @return distance in meters
     */
    fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return EARTH_RADIUS_KM * c * 1000 // Convert to meters
    }
    
    /**
     * Calculate distance between two LatLng points
     * @return distance in meters
     */
    fun calculateDistance(point1: LatLng, point2: LatLng): Double {
        return calculateDistance(
            point1.latitude,
            point1.longitude,
            point2.latitude,
            point2.longitude
        )
    }
    
    /**
     * Calculate bearing between two points
     * @return bearing in degrees (0-360)
     */
    fun calculateBearing(from: LatLng, to: LatLng): Double {
        val lat1 = Math.toRadians(from.latitude)
        val lat2 = Math.toRadians(to.latitude)
        val dLon = Math.toRadians(to.longitude - from.longitude)
        
        val y = sin(dLon) * cos(lat2)
        val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        
        val bearing = Math.toDegrees(atan2(y, x))
        return (bearing + 360) % 360
    }
    
    /**
     * Format distance for display
     */
    fun formatDistance(meters: Double): String {
        return when {
            meters < 1000 -> "${meters.toInt()} m"
            else -> String.format("%.1f km", meters / 1000)
        }
    }
    
    /**
     * Format duration for display
     */
    fun formatDuration(seconds: Int): String {
        val minutes = seconds / 60
        return when {
            minutes < 1 -> "< 1 min"
            minutes < 60 -> "$minutes min"
            else -> {
                val hours = minutes / 60
                val mins = minutes % 60
                "$hours h $mins min"
            }
        }
    }
}
