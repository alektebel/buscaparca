package com.buscaparca

import com.buscaparca.utils.LocationUtils
import com.google.android.gms.maps.model.LatLng
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for LocationUtils
 */
class LocationUtilsTest {

    @Test
    fun calculateDistance_samePoint_returnsZero() {
        val madrid = LatLng(40.4168, -3.7038)
        val distance = LocationUtils.calculateDistance(madrid, madrid)
        assertEquals(0.0, distance, 0.1)
    }

    @Test
    fun calculateDistance_madridToBarcelona_correctDistance() {
        val madrid = LatLng(40.4168, -3.7038)
        val barcelona = LatLng(41.3851, 2.1734)
        val distance = LocationUtils.calculateDistance(madrid, barcelona)
        // Approximately 504 km
        assertTrue(distance > 500000 && distance < 510000)
    }

    @Test
    fun calculateDistance_shortDistance_accurate() {
        val puertaDelSol = LatLng(40.4168, -3.7038)
        val palacioReal = LatLng(40.4179, -3.7142)
        val distance = LocationUtils.calculateDistance(puertaDelSol, palacioReal)
        // Approximately 800 meters
        assertTrue(distance > 700 && distance < 900)
    }

    @Test
    fun formatDistance_lessThan1km_returnsMeters() {
        val formatted = LocationUtils.formatDistance(750.0)
        assertEquals("750 m", formatted)
    }

    @Test
    fun formatDistance_moreThan1km_returnsKilometers() {
        val formatted = LocationUtils.formatDistance(2500.0)
        assertEquals("2.5 km", formatted)
    }

    @Test
    fun formatDuration_lessThanMinute_returnsLessThan1Min() {
        val formatted = LocationUtils.formatDuration(30)
        assertEquals("< 1 min", formatted)
    }

    @Test
    fun formatDuration_minutes_returnsMinutes() {
        val formatted = LocationUtils.formatDuration(300) // 5 minutes
        assertEquals("5 min", formatted)
    }

    @Test
    fun formatDuration_hours_returnsHoursAndMinutes() {
        val formatted = LocationUtils.formatDuration(5400) // 90 minutes = 1h 30min
        assertEquals("1 h 30 min", formatted)
    }

    @Test
    fun calculateBearing_northDirection_returns0() {
        val start = LatLng(40.0, -3.7)
        val end = LatLng(41.0, -3.7)
        val bearing = LocationUtils.calculateBearing(start, end)
        assertTrue(bearing >= 0 && bearing <= 1)
    }

    @Test
    fun calculateBearing_eastDirection_returns90() {
        val start = LatLng(40.0, -3.7)
        val end = LatLng(40.0, -2.7)
        val bearing = LocationUtils.calculateBearing(start, end)
        assertTrue(bearing > 85 && bearing < 95)
    }
}
