package com.buscaparca.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "trajectories")
data class Trajectory(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val speed: Float? = null,
    val heading: Float? = null,
    val accuracy: Float? = null
)
