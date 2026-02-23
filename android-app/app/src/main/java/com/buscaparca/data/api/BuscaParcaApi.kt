package com.buscaparca.data.api

import com.buscaparca.data.models.ParkingEvent
import com.buscaparca.data.models.ParkingPrediction
import com.buscaparca.data.models.ParkingZone
import com.buscaparca.data.models.Trajectory
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface BuscaParcaApi {
    
    @GET("api/parking/hot-zones")
    suspend fun getHotZones(): Response<HotZonesResponse>
    
    @GET("api/parking/find-parking")
    suspend fun findParking(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Double = 1000.0
    ): Response<FindParkingResponse>
    
    @GET("api/parking/predict")
    suspend fun predictProbability(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): Response<PredictionResponse>
    
    @POST("api/parking/trajectory")
    suspend fun sendTrajectory(@Body trajectory: TrajectoryRequest): Response<Unit>
    
    @POST("api/parking/parking-event")
    suspend fun sendParkingEvent(@Body event: ParkingEventRequest): Response<Unit>
    
    @GET("api/parking/stats")
    suspend fun getStats(): Response<StatsResponse>
}

data class HotZonesResponse(
    val zones: List<HotZoneDto>
)

data class HotZoneDto(
    val latitude: Double,
    val longitude: Double,
    val radius: Double,
    val weight: Double,
    val successCount: Int,
    val totalCount: Int
)

data class FindParkingResponse(
    val suggestions: List<ParkingSuggestion>
)

data class ParkingSuggestion(
    val latitude: Double,
    val longitude: Double,
    val probability: Int,
    val distance: Double,
    val estimatedSearchTime: Int
)

data class PredictionResponse(
    val probability: Int,
    val timeFactor: Double,
    val spatialFactor: Double,
    val locationFactor: Double
)

data class TrajectoryRequest(
    val user_id: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
    val speed: Float?,
    val heading: Float?,
    val accuracy: Float?
)

data class ParkingEventRequest(
    val user_id: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
    val day_of_week: Int,
    val hour: Int,
    val found_parking: Boolean,
    val search_duration: Int,
    val street_name: String?
)

data class StatsResponse(
    val trajectories: Int,
    val events: Int,
    val zones: Int
)
