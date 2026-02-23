package com.buscaparca.ui.main

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.models.ParkingPrediction
import com.buscaparca.data.models.ParkingZone
import com.buscaparca.data.models.MadridParkingData
import com.buscaparca.data.repository.ParkingRepository
import com.buscaparca.utils.PreferencesManager
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {
    
    private val database = BuscaParcaDatabase.getDatabase(application)
    private val repository = ParkingRepository(database)
    private val preferencesManager = PreferencesManager(application)
    
    // UI State
    private val _parkingZones = MutableStateFlow<List<ParkingZone>>(emptyList())
    val parkingZones: StateFlow<List<ParkingZone>> = _parkingZones
    
    private val _madridParkingData = MutableStateFlow<List<MadridParkingData>>(emptyList())
    val madridParkingData: StateFlow<List<MadridParkingData>> = _madridParkingData
    
    private val _bestParkingSpot = MutableLiveData<ParkingZone?>()
    val bestParkingSpot: LiveData<ParkingZone?> = _bestParkingSpot
    
    private val _currentPrediction = MutableLiveData<ParkingPrediction?>()
    val currentPrediction: LiveData<ParkingPrediction?> = _currentPrediction
    
    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage
    
    private val _navigatingTo = MutableLiveData<LatLng?>()
    val navigatingTo: LiveData<LatLng?> = _navigatingTo
    
    private val _isNavigating = MutableLiveData(false)
    val isNavigating: LiveData<Boolean> = _isNavigating
    
    init {
        loadHotZones()
        loadMadridParkingData()
    }
    
    fun loadHotZones() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.fetchHotZonesFromServer()
                .onSuccess { zones ->
                    _parkingZones.value = zones
                }
                .onFailure { error ->
                    _errorMessage.value = "Failed to load parking zones: ${error.message}"
                }
            _isLoading.value = false
        }
    }
    
    fun loadMadridParkingData() {
        viewModelScope.launch {
            repository.fetchMadridParkingData()
                .onSuccess { data ->
                    _madridParkingData.value = data
                    // Convert Madrid data to parking zones for visualization
                    convertMadridDataToZones(data)
                }
                .onFailure { error ->
                    // Madrid API might not always be available
                    _errorMessage.value = "Madrid data unavailable: ${error.message}"
                }
        }
    }
    
    private suspend fun convertMadridDataToZones(madridData: List<MadridParkingData>) {
        val zones = madridData.map { data ->
            // Convert free spaces to success rate
            val successRate = if (data.totalSpaces > 0) {
                data.freeSpaces.toDouble() / data.totalSpaces
            } else 0.0
            
            ParkingZone(
                latitude = data.latitude,
                longitude = data.longitude,
                radius = 100.0,
                successCount = data.freeSpaces,
                totalCount = data.totalSpaces,
                district = data.district,
                neighborhood = data.neighborhood
            )
        }
        
        repository.insertParkingZones(zones)
        _parkingZones.value = zones
    }
    
    fun findBestParking(currentLocation: LatLng) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.findBestParkingSpots(
                currentLocation.latitude,
                currentLocation.longitude,
                radius = 2000.0
            )
                .onSuccess { spots ->
                    if (spots.isNotEmpty()) {
                        _bestParkingSpot.value = spots.first()
                    } else {
                        _errorMessage.value = "No parking spots found nearby"
                    }
                }
                .onFailure { error ->
                    _errorMessage.value = "Error finding parking: ${error.message}"
                }
            _isLoading.value = false
        }
    }
    
    fun predictProbability(location: LatLng) {
        viewModelScope.launch {
            repository.predictParkingProbability(location.latitude, location.longitude)
                .onSuccess { prediction ->
                    _currentPrediction.value = prediction
                }
                .onFailure { error ->
                    _errorMessage.value = "Prediction failed: ${error.message}"
                }
        }
    }
    
    fun reportParkingSuccess(location: LatLng, searchDuration: Int, streetName: String? = null) {
        viewModelScope.launch {
            val userId = preferencesManager.getUserId()?.toString() ?: "anonymous"
            repository.reportParkingEvent(
                userId = userId,
                latitude = location.latitude,
                longitude = location.longitude,
                foundParking = true,
                searchDuration = searchDuration,
                streetName = streetName
            )
            // Reload hot zones to reflect new data
            loadHotZones()
        }
    }
    
    fun reportParkingFailure(location: LatLng, searchDuration: Int) {
        viewModelScope.launch {
            val userId = preferencesManager.getUserId()?.toString() ?: "anonymous"
            repository.reportParkingEvent(
                userId = userId,
                latitude = location.latitude,
                longitude = location.longitude,
                foundParking = false,
                searchDuration = searchDuration
            )
            loadHotZones()
        }
    }
    
    fun startNavigation(destination: LatLng) {
        _navigatingTo.value = destination
        _isNavigating.value = true
    }
    
    fun stopNavigation() {
        _navigatingTo.value = null
        _isNavigating.value = false
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
}
