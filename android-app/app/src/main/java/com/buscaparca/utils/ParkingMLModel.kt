package com.buscaparca.utils

import com.buscaparca.data.models.ParkingEvent
import com.buscaparca.data.models.ParkingPrediction
import com.buscaparca.data.models.ParkingZone
import java.util.*
import kotlin.math.max
import kotlin.random.Random

class ParkingMLModel {
    
    companion object {
        private const val TIME_WEIGHT = 0.4
        private const val SPATIAL_WEIGHT = 0.3
        private const val LOCATION_WEIGHT = 0.3
        private const val MIN_SAMPLES = 3
        private const val NEARBY_RADIUS = 500.0 // meters
    }
    
    /**
     * Predict parking probability at a given location
     */
    fun predictProbability(
        latitude: Double,
        longitude: Double,
        timestamp: Long,
        historicalEvents: List<ParkingEvent>,
        parkingZones: List<ParkingZone>
    ): ParkingPrediction {
        
        val timeFactor = calculateTimeFactor(timestamp, historicalEvents)
        val spatialFactor = calculateSpatialFactor(latitude, longitude, parkingZones)
        val locationFactor = calculateLocationFactor(latitude, longitude, timestamp, historicalEvents)
        
        // Weighted combination
        val baseProbability = (TIME_WEIGHT * timeFactor + 
                              SPATIAL_WEIGHT * spatialFactor + 
                              LOCATION_WEIGHT * locationFactor)
        
        // Add some randomness (±10%)
        val randomVariation = (Random.nextDouble() - 0.5) * 0.2
        val finalProbability = (baseProbability + randomVariation).coerceIn(0.0, 1.0)
        
        val nearbyZones = findNearbyZones(latitude, longitude, parkingZones)
        
        return ParkingPrediction(
            latitude = latitude,
            longitude = longitude,
            probability = (finalProbability * 100).toInt(),
            timeFactor = timeFactor,
            spatialFactor = spatialFactor,
            locationFactor = locationFactor,
            nearbyZones = nearbyZones
        )
    }
    
    /**
     * Calculate time-based probability (0-1)
     * Based on historical patterns at similar times
     */
    private fun calculateTimeFactor(timestamp: Long, events: List<ParkingEvent>): Double {
        if (events.isEmpty()) {
            return getTimeFactorRuleBased(timestamp)
        }
        
        val calendar = Calendar.getInstance().apply {
            timeInMillis = timestamp
        }
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
        
        // Find similar time slots (±2 hours)
        val similarEvents = events.filter {
            val hourDiff = Math.abs(it.hour - hour)
            hourDiff <= 2
        }
        
        if (similarEvents.size < MIN_SAMPLES) {
            return getTimeFactorRuleBased(timestamp)
        }
        
        val successRate = similarEvents.count { it.foundParking }.toDouble() / similarEvents.size
        return successRate
    }
    
    /**
     * Rule-based time factor when not enough data
     */
    private fun getTimeFactorRuleBased(timestamp: Long): Double {
        val calendar = Calendar.getInstance().apply {
            timeInMillis = timestamp
        }
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
        
        var factor = 0.5 // Base probability
        
        // Rush hours (7-9 AM, 5-7 PM) - harder to find parking
        if (hour in 7..9 || hour in 17..19) {
            factor -= 0.25
        }
        
        // Night time (10 PM - 6 AM) - easier to find parking
        if (hour >= 22 || hour <= 6) {
            factor += 0.20
        }
        
        // Weekend bonus
        if (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY) {
            factor += 0.15
        }
        
        return factor.coerceIn(0.0, 1.0)
    }
    
    /**
     * Calculate spatial proximity factor (0-1)
     * Based on nearby hot zones
     */
    private fun calculateSpatialFactor(
        latitude: Double,
        longitude: Double,
        zones: List<ParkingZone>
    ): Double {
        if (zones.isEmpty()) return 0.5
        
        val nearbyZones = findNearbyZones(latitude, longitude, zones)
        
        if (nearbyZones.isEmpty()) return 0.3
        
        // Weight by inverse distance and success rate
        var totalWeight = 0.0
        var weightedSum = 0.0
        
        nearbyZones.forEach { zone ->
            val distance = LocationUtils.calculateDistance(
                latitude, longitude,
                zone.latitude, zone.longitude
            )
            
            if (distance < NEARBY_RADIUS) {
                val weight = (1.0 - distance / NEARBY_RADIUS) * zone.successRate
                weightedSum += weight * zone.successRate
                totalWeight += weight
            }
        }
        
        return if (totalWeight > 0) {
            (weightedSum / totalWeight).coerceIn(0.0, 1.0)
        } else {
            0.5
        }
    }
    
    /**
     * Calculate location-specific factor (0-1)
     * Based on historical success at this exact location
     */
    private fun calculateLocationFactor(
        latitude: Double,
        longitude: Double,
        timestamp: Long,
        events: List<ParkingEvent>
    ): Double {
        val calendar = Calendar.getInstance().apply {
            timeInMillis = timestamp
        }
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        
        // Find events very close to this location (within 50 meters)
        val nearbyEvents = events.filter {
            val distance = LocationUtils.calculateDistance(
                latitude, longitude,
                it.latitude, it.longitude
            )
            distance <= 50.0
        }
        
        if (nearbyEvents.size < MIN_SAMPLES) {
            return 0.5 // Neutral when not enough data
        }
        
        // Filter by similar time slot
        val relevantEvents = nearbyEvents.filter {
            Math.abs(it.hour - hour) <= 1
        }
        
        if (relevantEvents.isEmpty()) {
            // Use all nearby events if no time-specific data
            return nearbyEvents.count { it.foundParking }.toDouble() / nearbyEvents.size
        }
        
        return relevantEvents.count { it.foundParking }.toDouble() / relevantEvents.size
    }
    
    /**
     * Find zones within NEARBY_RADIUS meters
     */
    private fun findNearbyZones(
        latitude: Double,
        longitude: Double,
        zones: List<ParkingZone>
    ): List<ParkingZone> {
        return zones.filter { zone ->
            val distance = LocationUtils.calculateDistance(
                latitude, longitude,
                zone.latitude, zone.longitude
            )
            distance <= NEARBY_RADIUS
        }.sortedByDescending { it.successRate }
    }
    
    /**
     * Find best parking spots around a location
     */
    fun findBestParkingSpots(
        currentLat: Double,
        currentLon: Double,
        zones: List<ParkingZone>,
        radius: Double = 1000.0,
        limit: Int = 5
    ): List<ParkingZone> {
        return zones
            .filter { zone ->
                val distance = LocationUtils.calculateDistance(
                    currentLat, currentLon,
                    zone.latitude, zone.longitude
                )
                distance <= radius && zone.totalCount >= MIN_SAMPLES
            }
            .sortedByDescending { it.successRate }
            .take(limit)
    }
}
