package com.buscaparca

import com.buscaparca.data.api.*
import org.junit.Assert.*
import org.junit.Test

class BuscaParcaApiTest {

    // ===== DATA MODEL TESTS =====

    @Test
    fun `HotZoneDto has valid structure`() {
        // Given
        val dto = HotZoneDto(
            latitude = 40.4168,
            longitude = -3.7038,
            radius = 100.0,
            weight = 0.8,
            successCount = 10,
            totalCount = 15
        )

        // Then
        assertEquals(40.4168, dto.latitude, 0.0001)
        assertEquals(-3.7038, dto.longitude, 0.0001)
        assertEquals(100.0, dto.radius, 0.0001)
        assertEquals(0.8, dto.weight, 0.0001)
        assertEquals(10, dto.successCount)
        assertEquals(15, dto.totalCount)
    }

    @Test
    fun `HotZonesResponse contains list of zones`() {
        // Given
        val zones = listOf(
            HotZoneDto(40.4168, -3.7038, 100.0, 0.8, 10, 15),
            HotZoneDto(40.4200, -3.7100, 150.0, 0.6, 5, 10)
        )
        val response = HotZonesResponse(zones)

        // Then
        assertEquals(2, response.zones.size)
        assertEquals(40.4168, response.zones[0].latitude, 0.0001)
        assertEquals(40.4200, response.zones[1].latitude, 0.0001)
    }

    @Test
    fun `ParkingSuggestion has valid structure`() {
        // Given
        val suggestion = ParkingSuggestion(
            latitude = 40.4168,
            longitude = -3.7038,
            probability = 75,
            distance = 250.5,
            estimatedSearchTime = 5
        )

        // Then
        assertEquals(40.4168, suggestion.latitude, 0.0001)
        assertEquals(-3.7038, suggestion.longitude, 0.0001)
        assertEquals(75, suggestion.probability)
        assertEquals(250.5, suggestion.distance, 0.0001)
        assertEquals(5, suggestion.estimatedSearchTime)
    }

    @Test
    fun `FindParkingResponse contains list of suggestions`() {
        // Given
        val suggestions = listOf(
            ParkingSuggestion(40.4168, -3.7038, 75, 250.5, 5),
            ParkingSuggestion(40.4200, -3.7100, 60, 500.0, 8)
        )
        val response = FindParkingResponse(suggestions)

        // Then
        assertEquals(2, response.suggestions.size)
        assertEquals(75, response.suggestions[0].probability)
        assertEquals(60, response.suggestions[1].probability)
    }

    @Test
    fun `PredictionResponse has valid factors`() {
        // Given
        val response = PredictionResponse(
            probability = 70,
            timeFactor = 0.8,
            spatialFactor = 0.6,
            locationFactor = 0.7
        )

        // Then
        assertEquals(70, response.probability)
        assertEquals(0.8, response.timeFactor, 0.0001)
        assertEquals(0.6, response.spatialFactor, 0.0001)
        assertEquals(0.7, response.locationFactor, 0.0001)
    }

    @Test
    fun `TrajectoryRequest has correct structure`() {
        // Given
        val request = TrajectoryRequest(
            user_id = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = System.currentTimeMillis(),
            speed = 10.5f,
            heading = 90f,
            accuracy = 5f
        )

        // Then
        assertEquals("user123", request.user_id)
        assertEquals(40.4168, request.latitude, 0.0001)
        assertEquals(-3.7038, request.longitude, 0.0001)
        assertTrue(request.timestamp > 0)
        assertEquals(10.5f, request.speed ?: 0f, 0.01f)
        assertEquals(90f, request.heading ?: 0f, 0.01f)
        assertEquals(5f, request.accuracy ?: 0f, 0.01f)
    }

    @Test
    fun `TrajectoryRequest handles null optional fields`() {
        // Given
        val request = TrajectoryRequest(
            user_id = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = System.currentTimeMillis(),
            speed = null,
            heading = null,
            accuracy = null
        )

        // Then
        assertEquals("user123", request.user_id)
        assertNull(request.speed)
        assertNull(request.heading)
        assertNull(request.accuracy)
    }

    @Test
    fun `ParkingEventRequest has correct structure`() {
        // Given
        val timestamp = System.currentTimeMillis()
        val request = ParkingEventRequest(
            user_id = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = timestamp,
            day_of_week = 3,
            hour = 14,
            found_parking = true,
            search_duration = 5,
            street_name = "Calle Mayor"
        )

        // Then
        assertEquals("user123", request.user_id)
        assertEquals(40.4168, request.latitude, 0.0001)
        assertEquals(-3.7038, request.longitude, 0.0001)
        assertEquals(timestamp, request.timestamp)
        assertEquals(3, request.day_of_week)
        assertEquals(14, request.hour)
        assertTrue(request.found_parking)
        assertEquals(5, request.search_duration)
        assertEquals("Calle Mayor", request.street_name)
    }

    @Test
    fun `ParkingEventRequest handles null street name`() {
        // Given
        val request = ParkingEventRequest(
            user_id = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = System.currentTimeMillis(),
            day_of_week = 3,
            hour = 14,
            found_parking = false,
            search_duration = 10,
            street_name = null
        )

        // Then
        assertNull(request.street_name)
        assertFalse(request.found_parking)
    }

    @Test
    fun `StatsResponse has valid structure`() {
        // Given
        val response = StatsResponse(
            trajectories = 1000,
            events = 500,
            zones = 50
        )

        // Then
        assertEquals(1000, response.trajectories)
        assertEquals(500, response.events)
        assertEquals(50, response.zones)
    }

    // ===== VALIDATION TESTS =====

    @Test
    fun `HotZoneDto coordinates are in valid range`() {
        // Given
        val dto = HotZoneDto(
            latitude = 40.4168,
            longitude = -3.7038,
            radius = 100.0,
            weight = 0.8,
            successCount = 10,
            totalCount = 15
        )

        // Then
        assertTrue(dto.latitude in -90.0..90.0)
        assertTrue(dto.longitude in -180.0..180.0)
        assertTrue(dto.radius > 0)
        assertTrue(dto.weight in 0.0..1.0)
        assertTrue(dto.successCount >= 0)
        assertTrue(dto.totalCount >= dto.successCount)
    }

    @Test
    fun `ParkingSuggestion probability is percentage`() {
        // Given
        val suggestion = ParkingSuggestion(
            latitude = 40.4168,
            longitude = -3.7038,
            probability = 75,
            distance = 250.5,
            estimatedSearchTime = 5
        )

        // Then
        assertTrue(suggestion.probability in 0..100)
        assertTrue(suggestion.distance >= 0)
        assertTrue(suggestion.estimatedSearchTime >= 0)
    }

    @Test
    fun `PredictionResponse factors are normalized`() {
        // Given
        val response = PredictionResponse(
            probability = 70,
            timeFactor = 0.8,
            spatialFactor = 0.6,
            locationFactor = 0.7
        )

        // Then
        assertTrue(response.probability in 0..100)
        assertTrue(response.timeFactor in 0.0..1.0)
        assertTrue(response.spatialFactor in 0.0..1.0)
        assertTrue(response.locationFactor in 0.0..1.0)
    }

    @Test
    fun `ParkingEventRequest has valid time fields`() {
        // Given
        val request = ParkingEventRequest(
            user_id = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            timestamp = System.currentTimeMillis(),
            day_of_week = 3,
            hour = 14,
            found_parking = true,
            search_duration = 5,
            street_name = null
        )

        // Then
        assertTrue(request.timestamp > 0)
        assertTrue(request.day_of_week in 1..7)
        assertTrue(request.hour in 0..23)
        assertTrue(request.search_duration >= 0)
    }

    @Test
    fun `empty HotZonesResponse is valid`() {
        // Given
        val response = HotZonesResponse(emptyList())

        // Then
        assertEquals(0, response.zones.size)
    }

    @Test
    fun `empty FindParkingResponse is valid`() {
        // Given
        val response = FindParkingResponse(emptyList())

        // Then
        assertEquals(0, response.suggestions.size)
    }
}
