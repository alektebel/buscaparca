package com.buscaparca

import com.buscaparca.data.models.ParkingEvent
import com.buscaparca.data.models.ParkingZone
import com.buscaparca.utils.ParkingMLModel
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.util.*

/**
 * Unit tests for ParkingMLModel
 */
class ParkingMLModelTest {

    private lateinit var mlModel: ParkingMLModel

    @Before
    fun setup() {
        mlModel = ParkingMLModel()
    }

    @Test
    fun predictProbability_noData_returnsBaselinePrediction() {
        val prediction = mlModel.predictProbability(
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = System.currentTimeMillis(),
            historicalEvents = emptyList(),
            parkingZones = emptyList()
        )

        assertNotNull(prediction)
        assertTrue(prediction.probability >= 0 && prediction.probability <= 100)
    }

    @Test
    fun predictProbability_withZones_usesZoneData() {
        val zones = listOf(
            ParkingZone(
                latitude = 40.4168,
                longitude = -3.7038,
                successCount = 70,
                totalCount = 100
            )
        )

        val prediction = mlModel.predictProbability(
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = System.currentTimeMillis(),
            historicalEvents = emptyList(),
            parkingZones = zones
        )

        assertTrue(prediction.probability > 0)
        assertTrue(prediction.spatialFactor > 0)
    }

    @Test
    fun predictProbability_rushHour_lowerProbability() {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 8) // Rush hour
            set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        }

        val prediction = mlModel.predictProbability(
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = calendar.timeInMillis,
            historicalEvents = emptyList(),
            parkingZones = emptyList()
        )

        // Time factor should be lower during rush hour
        assertTrue(prediction.timeFactor < 0.6)
    }

    @Test
    fun predictProbability_nightTime_higherProbability() {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 23) // Night time
        }

        val prediction = mlModel.predictProbability(
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = calendar.timeInMillis,
            historicalEvents = emptyList(),
            parkingZones = emptyList()
        )

        // Time factor should be higher at night
        assertTrue(prediction.timeFactor > 0.5)
    }

    @Test
    fun predictProbability_weekend_higherProbability() {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.DAY_OF_WEEK, Calendar.SATURDAY)
            set(Calendar.HOUR_OF_DAY, 14)
        }

        val prediction = mlModel.predictProbability(
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = calendar.timeInMillis,
            historicalEvents = emptyList(),
            parkingZones = emptyList()
        )

        // Weekend should have better parking
        assertTrue(prediction.timeFactor > 0.5)
    }

    @Test
    fun findBestParkingSpots_returnsTopResults() {
        val zones = listOf(
            ParkingZone(latitude = 40.417, longitude = -3.704, successCount = 80, totalCount = 100),
            ParkingZone(latitude = 40.418, longitude = -3.705, successCount = 60, totalCount = 100),
            ParkingZone(latitude = 40.419, longitude = -3.706, successCount = 90, totalCount = 100),
            ParkingZone(latitude = 40.420, longitude = -3.707, successCount = 40, totalCount = 100)
        )

        val bestSpots = mlModel.findBestParkingSpots(
            currentLat = 40.4168,
            currentLon = -3.7038,
            zones = zones,
            radius = 5000.0,
            limit = 2
        )

        assertEquals(2, bestSpots.size)
        // First spot should have highest success rate
        assertTrue(bestSpots[0].successRate >= bestSpots[1].successRate)
    }

    @Test
    fun findBestParkingSpots_filtersMinimumSamples() {
        val zones = listOf(
            ParkingZone(latitude = 40.417, longitude = -3.704, successCount = 2, totalCount = 2),
            ParkingZone(latitude = 40.418, longitude = -3.705, successCount = 8, totalCount = 10)
        )

        val bestSpots = mlModel.findBestParkingSpots(
            currentLat = 40.4168,
            currentLon = -3.7038,
            zones = zones,
            radius = 5000.0
        )

        // Should only include zones with >= 3 samples
        assertEquals(1, bestSpots.size)
        assertEquals(10, bestSpots[0].totalCount)
    }

    @Test
    fun parkingZone_successRate_calculatedCorrectly() {
        val zone = ParkingZone(
            successCount = 75,
            totalCount = 100,
            latitude = 40.4168,
            longitude = -3.7038
        )

        assertEquals(0.75, zone.successRate, 0.01)
    }

    @Test
    fun parkingZone_getHotZoneColor_greenForHighSuccess() {
        val zone = ParkingZone(
            successCount = 80,
            totalCount = 100,
            latitude = 40.4168,
            longitude = -3.7038
        )

        val color = zone.getHotZoneColor()
        // Green color with transparency
        assertEquals(0x8000FF00.toInt(), color)
    }

    @Test
    fun parkingZone_getHotZoneColor_yellowForMediumSuccess() {
        val zone = ParkingZone(
            successCount = 50,
            totalCount = 100,
            latitude = 40.4168,
            longitude = -3.7038
        )

        val color = zone.getHotZoneColor()
        // Yellow color with transparency
        assertEquals(0x80FFFF00.toInt(), color)
    }

    @Test
    fun parkingZone_getHotZoneColor_redForLowSuccess() {
        val zone = ParkingZone(
            successCount = 20,
            totalCount = 100,
            latitude = 40.4168,
            longitude = -3.7038
        )

        val color = zone.getHotZoneColor()
        // Red color with transparency
        assertEquals(0x80FF0000.toInt(), color)
    }
}
