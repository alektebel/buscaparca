package com.buscaparca

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.models.ParkingEvent
import com.buscaparca.data.models.ParkingZone
import com.buscaparca.data.models.Trajectory
import com.buscaparca.data.models.User
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import java.util.*

/**
 * Instrumented tests for Room Database
 */
@RunWith(AndroidJUnit4::class)
class DatabaseTest {

    private lateinit var database: BuscaParcaDatabase

    @Before
    fun createDb() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(
            context,
            BuscaParcaDatabase::class.java
        ).build()
    }

    @After
    fun closeDb() {
        database.close()
    }

    @Test
    fun userDao_insertAndRetrieve() = runBlocking {
        val user = User(
            username = "testuser",
            email = "test@example.com",
            passwordHash = "hashedpassword123"
        )

        val userId = database.userDao().insert(user)
        val retrieved = database.userDao().getUserById(userId)

        assertNotNull(retrieved)
        assertEquals("testuser", retrieved?.username)
        assertEquals("test@example.com", retrieved?.email)
    }

    @Test
    fun userDao_getUserByEmail() = runBlocking {
        val user = User(
            username = "testuser",
            email = "test@example.com",
            passwordHash = "hashedpassword123"
        )

        database.userDao().insert(user)
        val retrieved = database.userDao().getUserByEmail("test@example.com")

        assertNotNull(retrieved)
        assertEquals("testuser", retrieved?.username)
    }

    @Test
    fun userDao_getUserByUsername() = runBlocking {
        val user = User(
            username = "testuser",
            email = "test@example.com",
            passwordHash = "hashedpassword123"
        )

        database.userDao().insert(user)
        val retrieved = database.userDao().getUserByUsername("testuser")

        assertNotNull(retrieved)
        assertEquals("test@example.com", retrieved?.email)
    }

    @Test
    fun parkingZoneDao_insertAndRetrieve() = runBlocking {
        val zones = listOf(
            ParkingZone(
                latitude = 40.4168,
                longitude = -3.7038,
                successCount = 70,
                totalCount = 100
            ),
            ParkingZone(
                latitude = 40.4200,
                longitude = -3.7100,
                successCount = 50,
                totalCount = 100
            )
        )

        database.parkingZoneDao().insertAll(zones)
        val retrieved = database.parkingZoneDao().getAllZonesOnce()

        assertEquals(2, retrieved.size)
    }

    @Test
    fun parkingZoneDao_filtersByMinimumSamples() = runBlocking {
        val zones = listOf(
            ParkingZone(
                latitude = 40.4168,
                longitude = -3.7038,
                successCount = 2,
                totalCount = 2
            ),
            ParkingZone(
                latitude = 40.4200,
                longitude = -3.7100,
                successCount = 50,
                totalCount = 100
            )
        )

        database.parkingZoneDao().insertAll(zones)
        val retrieved = database.parkingZoneDao().getAllZonesOnce()

        // Should only return zones with totalCount >= 3
        assertEquals(1, retrieved.size)
        assertEquals(100, retrieved[0].totalCount)
    }

    @Test
    fun parkingZoneDao_getZonesInBounds() = runBlocking {
        val zones = listOf(
            ParkingZone(latitude = 40.4168, longitude = -3.7038, successCount = 50, totalCount = 100),
            ParkingZone(latitude = 40.5000, longitude = -3.8000, successCount = 50, totalCount = 100),
            ParkingZone(latitude = 40.4200, longitude = -3.7100, successCount = 50, totalCount = 100)
        )

        database.parkingZoneDao().insertAll(zones)
        
        val retrieved = database.parkingZoneDao().getZonesInBounds(
            minLat = 40.41,
            maxLat = 40.43,
            minLon = -3.72,
            minLon = -3.70
        )

        assertTrue(retrieved.isNotEmpty())
    }

    @Test
    fun parkingEventDao_insertAndRetrieve() = runBlocking {
        val calendar = Calendar.getInstance()
        val event = ParkingEvent(
            userId = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK),
            hour = calendar.get(Calendar.HOUR_OF_DAY),
            foundParking = true,
            searchDuration = 300
        )

        database.parkingEventDao().insert(event)
        val retrieved = database.parkingEventDao().getUserEvents("user123")

        assertEquals(1, retrieved.size)
        assertTrue(retrieved[0].foundParking)
        assertEquals(300, retrieved[0].searchDuration)
    }

    @Test
    fun parkingEventDao_getRecentEvents() = runBlocking {
        val events = (1..5).map {
            ParkingEvent(
                userId = "user$it",
                latitude = 40.4168,
                longitude = -3.7038,
                dayOfWeek = 1,
                hour = 10,
                foundParking = true,
                searchDuration = 300
            )
        }

        database.parkingEventDao().insertAll(events)
        val retrieved = database.parkingEventDao().getRecentEvents(3)

        assertEquals(3, retrieved.size)
    }

    @Test
    fun trajectoryDao_insertAndRetrieve() = runBlocking {
        val trajectory = Trajectory(
            userId = "user123",
            latitude = 40.4168,
            longitude = -3.7038,
            speed = 5.5f,
            heading = 90.0f,
            accuracy = 10.0f
        )

        database.trajectoryDao().insert(trajectory)
        val retrieved = database.trajectoryDao().getUserTrajectories("user123")

        assertEquals(1, retrieved.size)
        assertEquals(5.5f, retrieved[0].speed ?: 0f, 0.01f)
        assertEquals(90.0f, retrieved[0].heading ?: 0f, 0.01f)
    }

    @Test
    fun trajectoryDao_deleteOldTrajectories() = runBlocking {
        val oldTime = System.currentTimeMillis() - (48 * 60 * 60 * 1000) // 48 hours ago
        
        val trajectories = listOf(
            Trajectory(
                userId = "user123",
                latitude = 40.4168,
                longitude = -3.7038,
                timestamp = oldTime
            ),
            Trajectory(
                userId = "user123",
                latitude = 40.4168,
                longitude = -3.7038,
                timestamp = System.currentTimeMillis()
            )
        )

        database.trajectoryDao().insertAll(trajectories)
        
        val cutoffTime = System.currentTimeMillis() - (24 * 60 * 60 * 1000) // 24 hours ago
        database.trajectoryDao().deleteOldTrajectories(cutoffTime)
        
        val retrieved = database.trajectoryDao().getUserTrajectories("user123")
        
        // Should only have the recent trajectory
        assertEquals(1, retrieved.size)
        assertTrue(retrieved[0].timestamp > cutoffTime)
    }

    @Test
    fun database_counts() = runBlocking {
        // Insert test data
        database.userDao().insert(User(username = "test", email = "test@test.com", passwordHash = "hash"))
        database.parkingZoneDao().insertAll(listOf(
            ParkingZone(latitude = 40.0, longitude = -3.0, successCount = 50, totalCount = 100)
        ))
        database.parkingEventDao().insert(
            ParkingEvent(userId = "test", latitude = 40.0, longitude = -3.0, dayOfWeek = 1, hour = 10, foundParking = true, searchDuration = 300)
        )
        database.trajectoryDao().insert(
            Trajectory(userId = "test", latitude = 40.0, longitude = -3.0)
        )

        val zoneCount = database.parkingZoneDao().getCount()
        val eventCount = database.parkingEventDao().getCount()
        val trajectoryCount = database.trajectoryDao().getCount()

        assertTrue(zoneCount > 0)
        assertTrue(eventCount > 0)
        assertTrue(trajectoryCount > 0)
    }
}
