package com.buscaparca.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.android.gms.maps.model.LatLng

@Entity(tableName = "parking_zones")
data class ParkingZone(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val latitude: Double,
    val longitude: Double,
    val radius: Double = 100.0,
    val successCount: Int = 0,
    val totalCount: Int = 0,
    val lastUpdated: Long = System.currentTimeMillis(),
    val district: String? = null,
    val neighborhood: String? = null
) {
    val successRate: Double
        get() = if (totalCount > 0) successCount.toDouble() / totalCount else 0.0
    
    val weight: Double
        get() = successRate
    
    fun toLatLng(): LatLng = LatLng(latitude, longitude)
    
    fun getHotZoneColor(): Int {
        return when {
            successRate >= 0.7 -> 0x8000FF00.toInt() // Green with transparency
            successRate >= 0.4 -> 0x80FFFF00.toInt() // Yellow with transparency
            else -> 0x80FF0000.toInt() // Red with transparency
        }
    }
}
