package com.buscaparca.ui.main

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.buscaparca.R
import com.buscaparca.data.models.ParkingZone
import com.buscaparca.services.LocationTrackingService
import com.buscaparca.ui.navigation.NavigationManager
import com.buscaparca.utils.LocationUtils
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.*
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textview.MaterialTextView
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var googleMap: GoogleMap
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var navigationManager: NavigationManager
    private val viewModel: MainViewModel by viewModels()
    
    private var currentLocation: Location? = null
    private val hotZoneCircles = mutableListOf<Circle>()
    private var bestParkingMarker: Marker? = null
    private var currentLocationMarker: Marker? = null
    
    // UI Components
    private lateinit var btnFindParking: MaterialButton
    private lateinit var btnParkedHere: MaterialButton
    private lateinit var btnNoParking: MaterialButton
    private lateinit var btnStopNavigation: MaterialButton
    private lateinit var progressBar: CircularProgressIndicator
    private lateinit var infoCard: MaterialCardView
    private lateinit var tvProbability: MaterialTextView
    private lateinit var tvDistance: MaterialTextView
    private lateinit var tvEstimatedTime: MaterialTextView
    
    // Madrid center coordinates
    private val madridCenter = LatLng(40.4168, -3.7038)
    
    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        when {
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true -> {
                enableMyLocation()
                startLocationTracking()
            }
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true -> {
                enableMyLocation()
                startLocationTracking()
            }
            else -> {
                Toast.makeText(this, "Location permission required", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        navigationManager = NavigationManager(this)
        
        setupUI()
        setupMap()
        setupObservers()
        checkPermissions()
    }
    
    private fun setupUI() {
        btnFindParking = findViewById(R.id.btn_find_parking)
        btnParkedHere = findViewById(R.id.btn_parked_here)
        btnNoParking = findViewById(R.id.btn_no_parking)
        btnStopNavigation = findViewById(R.id.btn_stop_navigation)
        progressBar = findViewById(R.id.progress_bar)
        infoCard = findViewById(R.id.info_card)
        tvProbability = findViewById(R.id.tv_probability)
        tvDistance = findViewById(R.id.tv_distance)
        tvEstimatedTime = findViewById(R.id.tv_estimated_time)
        
        btnFindParking.setOnClickListener {
            currentLocation?.let { location ->
                val latLng = LatLng(location.latitude, location.longitude)
                viewModel.findBestParking(latLng)
            }
        }
        
        btnParkedHere.setOnClickListener {
            reportParkingSuccess()
        }
        
        btnNoParking.setOnClickListener {
            reportParkingFailure()
        }
        
        btnStopNavigation.setOnClickListener {
            stopNavigation()
        }
    }
    
    private fun setupMap() {
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map_fragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }
    
    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        
        // Configure map
        googleMap.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMyLocationButtonEnabled = true
        }
        
        // Move camera to Madrid
        googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(madridCenter, 12f))
        
        // Enable location if permission granted
        if (hasLocationPermission()) {
            enableMyLocation()
        }
        
        // Load hot zones
        viewModel.loadHotZones()
    }
    
    private fun setupObservers() {
        // Observe parking zones
        lifecycleScope.launch {
            viewModel.parkingZones.collectLatest { zones ->
                updateHotZones(zones)
            }
        }
        
        // Observe best parking spot
        viewModel.bestParkingSpot.observe(this) { zone ->
            zone?.let {
                showBestParkingSpot(it)
                startNavigationToZone(it)
            }
        }
        
        // Observe current prediction
        viewModel.currentPrediction.observe(this) { prediction ->
            prediction?.let {
                tvProbability.text = "${it.probability}%"
                infoCard.visibility = View.VISIBLE
            }
        }
        
        // Observe loading state
        viewModel.isLoading.observe(this) { isLoading ->
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            btnFindParking.isEnabled = !isLoading
        }
        
        // Observe errors
        viewModel.errorMessage.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_SHORT).show()
                viewModel.clearError()
            }
        }
        
        // Observe navigation state
        viewModel.isNavigating.observe(this) { isNavigating ->
            btnStopNavigation.visibility = if (isNavigating) View.VISIBLE else View.GONE
            btnParkedHere.visibility = if (isNavigating) View.VISIBLE else View.GONE
            btnNoParking.visibility = if (isNavigating) View.VISIBLE else View.GONE
        }
    }
    
    private fun updateHotZones(zones: List<ParkingZone>) {
        // Clear existing circles
        hotZoneCircles.forEach { it.remove() }
        hotZoneCircles.clear()
        
        // Add new circles
        zones.forEach { zone ->
            val circle = googleMap.addCircle(
                CircleOptions()
                    .center(LatLng(zone.latitude, zone.longitude))
                    .radius(zone.radius)
                    .fillColor(zone.getHotZoneColor())
                    .strokeColor(Color.TRANSPARENT)
                    .strokeWidth(0f)
            )
            hotZoneCircles.add(circle)
        }
    }
    
    private fun showBestParkingSpot(zone: ParkingZone) {
        // Remove previous marker
        bestParkingMarker?.remove()
        
        // Add marker
        val position = LatLng(zone.latitude, zone.longitude)
        bestParkingMarker = googleMap.addMarker(
            MarkerOptions()
                .position(position)
                .title("Best Parking Spot")
                .snippet("Success rate: ${(zone.successRate * 100).toInt()}%")
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
        )
        
        // Animate camera
        googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(position, 15f))
        
        // Calculate distance
        currentLocation?.let { location ->
            val distance = LocationUtils.calculateDistance(
                LatLng(location.latitude, location.longitude),
                position
            )
            tvDistance.text = LocationUtils.formatDistance(distance)
        }
    }
    
    private fun startNavigationToZone(zone: ParkingZone) {
        currentLocation?.let { location ->
            val origin = LatLng(location.latitude, location.longitude)
            val destination = LatLng(zone.latitude, zone.longitude)
            
            viewModel.startNavigation(destination)
            
            lifecycleScope.launch {
                navigationManager.startNavigation(origin, destination, googleMap)
            }
        }
    }
    
    private fun stopNavigation() {
        viewModel.stopNavigation()
        navigationManager.stopNavigation()
        bestParkingMarker?.remove()
        infoCard.visibility = View.GONE
    }
    
    private fun reportParkingSuccess() {
        currentLocation?.let { location ->
            val latLng = LatLng(location.latitude, location.longitude)
            viewModel.reportParkingSuccess(latLng, searchDuration = 300) // 5 minutes example
            Toast.makeText(this, "Thank you for your feedback!", Toast.LENGTH_SHORT).show()
            stopNavigation()
        }
    }
    
    private fun reportParkingFailure() {
        currentLocation?.let { location ->
            val latLng = LatLng(location.latitude, location.longitude)
            viewModel.reportParkingFailure(latLng, searchDuration = 600) // 10 minutes example
            Toast.makeText(this, "Looking for other options...", Toast.LENGTH_SHORT).show()
            // Find next best spot
            viewModel.findBestParking(latLng)
        }
    }
    
    private fun checkPermissions() {
        if (!hasLocationPermission()) {
            locationPermissionRequest.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        } else {
            enableMyLocation()
            startLocationTracking()
        }
    }
    
    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun enableMyLocation() {
        if (!hasLocationPermission()) return
        
        try {
            googleMap.isMyLocationEnabled = true
            
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                location?.let {
                    currentLocation = it
                    val latLng = LatLng(it.latitude, it.longitude)
                    googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 14f))
                }
            }
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }
    
    private fun startLocationTracking() {
        if (!hasLocationPermission()) return
        
        val intent = Intent(this, LocationTrackingService::class.java)
        ContextCompat.startForegroundService(this, intent)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopService(Intent(this, LocationTrackingService::class.java))
    }
}
