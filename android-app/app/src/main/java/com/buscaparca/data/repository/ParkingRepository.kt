package com.buscaparca.data.repository

import com.buscaparca.data.api.ApiClient
import com.buscaparca.data.api.ParkingEventRequest
import com.buscaparca.data.api.TrajectoryRequest
import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.models.*
import com.buscaparca.utils.LocationUtils
import com.buscaparca.utils.ParkingMLModel
import kotlinx.coroutines.flow.Flow
import java.util.*

class ParkingRepository(private val database: BuscaParcaDatabase) {
    
    private val parkingMLModel = ParkingMLModel()
    
    // Database operations
    fun getAllZones(): Flow<List<ParkingZone>> = database.parkingZoneDao().getAllZones()
    
    suspend fun getZonesInBounds(
        minLat: Double,
        maxLat: Double,
        minLon: Double,
        maxLon: Double
    ): List<ParkingZone> {
        return database.parkingZoneDao().getZonesInBounds(minLat, maxLat, minLon, maxLon)
    }
    
    suspend fun insertParkingZones(zones: List<ParkingZone>) {
        database.parkingZoneDao().insertAll(zones)
    }
    
    suspend fun insertParkingEvent(event: ParkingEvent) {
        database.parkingEventDao().insert(event)
    }
    
    suspend fun insertTrajectory(trajectory: Trajectory) {
        database.trajectoryDao().insert(trajectory)
    }
    
    // API operations - Hot Zones
    suspend fun fetchHotZonesFromServer(): Result<List<ParkingZone>> {
        return try {
            val response = ApiClient.buscaParcaApi.getHotZones()
            if (response.isSuccessful && response.body() != null) {
                val zones = response.body()!!.zones.map { dto ->
                    ParkingZone(
                        latitude = dto.latitude,
                        longitude = dto.longitude,
                        radius = dto.radius,
                        successCount = dto.successCount,
                        totalCount = dto.totalCount
                    )
                }
                // Cache in database
                insertParkingZones(zones)
                Result.success(zones)
            } else {
                Result.failure(Exception("Failed to fetch hot zones: ${response.code()}"))
            }
        } catch (e: Exception) {
            // Try to return cached data
            val cachedZones = database.parkingZoneDao().getAllZonesOnce()
            if (cachedZones.isNotEmpty()) {
                Result.success(cachedZones)
            } else {
                Result.failure(e)
            }
        }
    }
    
    // Find best parking spots
    suspend fun findBestParkingSpots(
        latitude: Double,
        longitude: Double,
        radius: Double = 1000.0
    ): Result<List<ParkingZone>> {
        return try {
            val response = ApiClient.buscaParcaApi.findParking(latitude, longitude, radius)
            if (response.isSuccessful && response.body() != null) {
                val zones = database.parkingZoneDao().getAllZonesOnce()
                val bestSpots = parkingMLModel.findBestParkingSpots(
                    latitude, longitude, zones, radius
                )
                Result.success(bestSpots)
            } else {
                // Fallback to local calculation
                val zones = database.parkingZoneDao().getAllZonesOnce()
                val bestSpots = parkingMLModel.findBestParkingSpots(
                    latitude, longitude, zones, radius
                )
                Result.success(bestSpots)
            }
        } catch (e: Exception) {
            // Fallback to local calculation
            val zones = database.parkingZoneDao().getAllZonesOnce()
            val bestSpots = parkingMLModel.findBestParkingSpots(
                latitude, longitude, zones, radius
            )
            Result.success(bestSpots)
        }
    }
    
    // Predict probability
    suspend fun predictParkingProbability(
        latitude: Double,
        longitude: Double
    ): Result<ParkingPrediction> {
        return try {
            val events = database.parkingEventDao().getRecentEvents(1000)
            val zones = database.parkingZoneDao().getAllZonesOnce()
            val timestamp = System.currentTimeMillis()
            
            val prediction = parkingMLModel.predictProbability(
                latitude, longitude, timestamp, events, zones
            )
            
            Result.success(prediction)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Send parking event to server
    suspend fun reportParkingEvent(
        userId: String,
        latitude: Double,
        longitude: Double,
        foundParking: Boolean,
        searchDuration: Int,
        streetName: String? = null
    ): Result<Unit> {
        val calendar = Calendar.getInstance()
        val event = ParkingEvent(
            userId = userId,
            latitude = latitude,
            longitude = longitude,
            timestamp = System.currentTimeMillis(),
            dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK),
            hour = calendar.get(Calendar.HOUR_OF_DAY),
            foundParking = foundParking,
            searchDuration = searchDuration,
            streetName = streetName
        )
        
        // Save locally first
        insertParkingEvent(event)
        
        // Try to send to server
        return try {
            val request = ParkingEventRequest(
                user_id = userId,
                latitude = latitude,
                longitude = longitude,
                timestamp = event.timestamp,
                day_of_week = event.dayOfWeek,
                hour = event.hour,
                found_parking = foundParking,
                search_duration = searchDuration,
                street_name = streetName
            )
            val response = ApiClient.buscaParcaApi.sendParkingEvent(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to send event: ${response.code()}"))
            }
        } catch (e: Exception) {
            // Event is saved locally, so this is not critical
            Result.success(Unit)
        }
    }
    
    // Fetch Madrid parking data
    suspend fun fetchMadridParkingData(): Result<List<MadridParkingData>> {
        return try {
            val response = ApiClient.madridApi.getParkingAvailability()
            if (response.isSuccessful && response.body() != null) {
                val parkingData = response.body()!!.graph.mapNotNull { item ->
                    val lat = item.location?.latitude
                    val lon = item.location?.longitude
                    val capacity = item.capacity
                    val free = item.freePlaces
                    val occupied = item.occupiedPlaces
                    
                    if (lat != null && lon != null && capacity != null) {
                        MadridParkingData(
                            id = item.id,
                            name = item.title,
                            address = item.address?.streetAddress ?: "",
                            district = item.address?.district?.title ?: "",
                            neighborhood = item.address?.area?.title ?: "",
                            latitude = lat,
                            longitude = lon,
                            totalSpaces = capacity,
                            freeSpaces = free ?: 0,
                            occupiedSpaces = occupied ?: 0,
                            lastUpdate = System.currentTimeMillis()
                        )
                    } else null
                }
                Result.success(parkingData)
            } else {
                Result.failure(Exception("Failed to fetch Madrid data: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
