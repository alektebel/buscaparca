package com.buscaparca.data.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.buscaparca.data.models.ParkingEvent

@Dao
interface ParkingEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: ParkingEvent): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(events: List<ParkingEvent>)

    @Query("SELECT * FROM parking_events WHERE userId = :userId ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getUserEvents(userId: String, limit: Int = 100): List<ParkingEvent>

    @Query("""
        SELECT * FROM parking_events 
        WHERE latitude BETWEEN :minLat AND :maxLat
        AND longitude BETWEEN :minLon AND :maxLon
        ORDER BY timestamp DESC
    """)
    suspend fun getEventsInBounds(
        minLat: Double,
        maxLat: Double,
        minLon: Double,
        maxLon: Double
    ): List<ParkingEvent>

    @Query("SELECT * FROM parking_events ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentEvents(limit: Int = 1000): List<ParkingEvent>

    @Query("DELETE FROM parking_events WHERE timestamp < :timestamp")
    suspend fun deleteOldEvents(timestamp: Long)

    @Query("SELECT COUNT(*) FROM parking_events")
    suspend fun getCount(): Int
}
