package com.buscaparca.services

import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.buscaparca.R
import com.buscaparca.data.api.ApiClient
import com.buscaparca.data.api.TrajectoryRequest
import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.models.Trajectory
import com.buscaparca.utils.PreferencesManager
import com.google.android.gms.location.*
import kotlinx.coroutines.*

class LocationTrackingService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var database: BuscaParcaDatabase
    private lateinit var preferencesManager: PreferencesManager

    companion object {
        const val CHANNEL_ID = "LocationTrackingChannel"
        const val NOTIFICATION_ID = 1
        private const val LOCATION_UPDATE_INTERVAL = 30000L // 30 seconds
        private const val LOCATION_FASTEST_INTERVAL = 15000L // 15 seconds
    }

    override fun onCreate() {
        super.onCreate()
        
        database = BuscaParcaDatabase.getDatabase(this)
        preferencesManager = PreferencesManager(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        createNotificationChannel()
        setupLocationCallback()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tracking your location to find parking"
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    handleNewLocation(location)
                }
            }
        }
    }

    private fun handleNewLocation(location: Location) {
        serviceScope.launch {
            try {
                val userId = preferencesManager.getUserId()?.toString() ?: "anonymous"
                
                val trajectory = Trajectory(
                    userId = userId,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    timestamp = System.currentTimeMillis(),
                    speed = if (location.hasSpeed()) location.speed.toFloat() else null,
                    heading = if (location.hasBearing()) location.bearing.toFloat() else null,
                    accuracy = if (location.hasAccuracy()) location.accuracy.toFloat() else null
                )
                
                // Save locally
                database.trajectoryDao().insert(trajectory)
                
                // Send to server
                try {
                    val request = TrajectoryRequest(
                        user_id = userId,
                        latitude = location.latitude,
                        longitude = location.longitude,
                        timestamp = System.currentTimeMillis(),
                        speed = if (location.hasSpeed()) location.speed.toFloat() else null,
                        heading = if (location.hasBearing()) location.bearing.toFloat() else null,
                        accuracy = if (location.hasAccuracy()) location.accuracy.toFloat() else null
                    )
                    ApiClient.buscaParcaApi.sendTrajectory(request)
                } catch (e: Exception) {
                    // Server might be offline, data is already saved locally
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            LOCATION_UPDATE_INTERVAL
        ).apply {
            setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL)
            setWaitForAccurateLocation(false)
        }.build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    private fun stopLocationUpdates() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)
        startLocationUpdates()
        
        return START_STICKY
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, Class.forName("com.buscaparca.ui.main.MainActivity"))
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("BuscaParca")
            .setContentText("Tracking your location to help find parking")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        stopLocationUpdates()
        serviceScope.cancel()
    }
}
