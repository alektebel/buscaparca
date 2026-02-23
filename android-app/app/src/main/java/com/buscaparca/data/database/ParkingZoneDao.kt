package com.buscaparca.data.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.buscaparca.data.models.ParkingZone
import kotlinx.coroutines.flow.Flow

@Dao
interface ParkingZoneDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(zones: List<ParkingZone>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(zone: ParkingZone): Long

    @Query("SELECT * FROM parking_zones WHERE totalCount >= 3")
    fun getAllZones(): Flow<List<ParkingZone>>

    @Query("SELECT * FROM parking_zones WHERE totalCount >= 3")
    suspend fun getAllZonesOnce(): List<ParkingZone>

    @Query("""
        SELECT * FROM parking_zones 
        WHERE totalCount >= 3
        AND latitude BETWEEN :minLat AND :maxLat
        AND longitude BETWEEN :minLon AND :maxLon
    """)
    suspend fun getZonesInBounds(
        minLat: Double,
        maxLat: Double,
        minLon: Double,
        maxLon: Double
    ): List<ParkingZone>

    @Query("DELETE FROM parking_zones")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM parking_zones")
    suspend fun getCount(): Int
}
