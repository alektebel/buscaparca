package com.buscaparca

import com.buscaparca.data.models.ParkingZone
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for data models
 */
class DataModelsTest {

    @Test
    fun parkingZone_toLatLng_convertsCorrectly() {
        val zone = ParkingZone(
            latitude = 40.4168,
            longitude = -3.7038,
            successCount = 50,
            totalCount = 100
        )

        val latLng = zone.toLatLng()
        assertEquals(40.4168, latLng.latitude, 0.0001)
        assertEquals(-3.7038, latLng.longitude, 0.0001)
    }

    @Test
    fun parkingZone_weight_equalsSuccessRate() {
        val zone = ParkingZone(
            latitude = 40.4168,
            longitude = -3.7038,
            successCount = 70,
            totalCount = 100
        )

        assertEquals(0.7, zone.weight, 0.01)
    }

    @Test
    fun parkingZone_successRate_zeroWhenNoData() {
        val zone = ParkingZone(
            latitude = 40.4168,
            longitude = -3.7038,
            successCount = 0,
            totalCount = 0
        )

        assertEquals(0.0, zone.successRate, 0.01)
    }

    @Test
    fun parkingZone_defaultRadius_is100() {
        val zone = ParkingZone(
            latitude = 40.4168,
            longitude = -3.7038,
            successCount = 50,
            totalCount = 100
        )

        assertEquals(100.0, zone.radius, 0.01)
    }
}
