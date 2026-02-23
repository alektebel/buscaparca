package com.buscaparca.data.models

data class ParkingPrediction(
    val latitude: Double,
    val longitude: Double,
    val probability: Int, // 0-100
    val timeFactor: Double,
    val spatialFactor: Double,
    val locationFactor: Double,
    val nearbyZones: List<ParkingZone> = emptyList()
)
