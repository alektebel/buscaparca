package com.buscaparca.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "parking_events")
data class ParkingEvent(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val dayOfWeek: Int, // 1-7 (Calendar.SUNDAY = 1)
    val hour: Int, // 0-23
    val foundParking: Boolean,
    val searchDuration: Int, // in seconds
    val streetName: String? = null,
    val district: String? = null,
    val neighborhood: String? = null
)
