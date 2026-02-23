package com.buscaparca.data.models

data class MadridParkingData(
    val id: String,
    val name: String,
    val address: String,
    val district: String,
    val neighborhood: String,
    val latitude: Double,
    val longitude: Double,
    val totalSpaces: Int,
    val freeSpaces: Int,
    val occupiedSpaces: Int,
    val lastUpdate: Long
) {
    val occupancyRate: Double
        get() = if (totalSpaces > 0) occupiedSpaces.toDouble() / totalSpaces else 0.0
}
