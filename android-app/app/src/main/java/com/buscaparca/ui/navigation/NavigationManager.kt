package com.buscaparca.ui.navigation

import android.content.Context
import android.graphics.Color
import com.buscaparca.R
import com.buscaparca.data.api.GoogleDirectionsApi
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.*
import com.google.maps.android.PolyUtil
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class NavigationManager(private val context: Context) {
    
    private val directionsApi = GoogleDirectionsApi.create()
    private var currentRoute: Polyline? = null
    private var destinationMarker: Marker? = null
    
    suspend fun startNavigation(
        origin: LatLng,
        destination: LatLng,
        map: GoogleMap
    ) = withContext(Dispatchers.IO) {
        try {
            val apiKey = context.getString(R.string.google_maps_key)
            val originStr = "${origin.latitude},${origin.longitude}"
            val destStr = "${destination.latitude},${destination.longitude}"
            
            val response = directionsApi.getDirections(
                origin = originStr,
                destination = destStr,
                mode = "driving",
                apiKey = apiKey
            )
            
            if (response.isSuccessful && response.body() != null) {
                val directionsResponse = response.body()!!
                
                if (directionsResponse.routes.isNotEmpty()) {
                    val route = directionsResponse.routes.first()
                    
                    withContext(Dispatchers.Main) {
                        drawRoute(route, map, destination)
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback: draw straight line
            withContext(Dispatchers.Main) {
                drawStraightLine(origin, destination, map)
            }
        }
    }
    
    private fun drawRoute(
        route: com.buscaparca.data.api.Route,
        map: GoogleMap,
        destination: LatLng
    ) {
        // Remove previous route
        currentRoute?.remove()
        
        // Decode polyline
        val points = PolyUtil.decode(route.overviewPolyline.points)
        
        // Draw route
        currentRoute = map.addPolyline(
            PolylineOptions()
                .addAll(points)
                .color(Color.BLUE)
                .width(12f)
                .geodesic(true)
        )
        
        // Add destination marker
        destinationMarker?.remove()
        destinationMarker = map.addMarker(
            MarkerOptions()
                .position(destination)
                .title("Navigate Here")
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE))
        )
        
        // Adjust camera to show full route
        val bounds = LatLngBounds.Builder().apply {
            points.forEach { include(it) }
        }.build()
        
        map.animateCamera(com.google.android.gms.maps.CameraUpdateFactory.newLatLngBounds(bounds, 100))
    }
    
    private fun drawStraightLine(
        origin: LatLng,
        destination: LatLng,
        map: GoogleMap
    ) {
        // Remove previous route
        currentRoute?.remove()
        
        // Draw straight line as fallback
        currentRoute = map.addPolyline(
            PolylineOptions()
                .add(origin, destination)
                .color(Color.BLUE)
                .width(12f)
                .geodesic(true)
                .pattern(listOf(Dot(), Gap(20f)))
        )
        
        // Add destination marker
        destinationMarker?.remove()
        destinationMarker = map.addMarker(
            MarkerOptions()
                .position(destination)
                .title("Navigate Here")
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE))
        )
    }
    
    fun stopNavigation() {
        currentRoute?.remove()
        currentRoute = null
        destinationMarker?.remove()
        destinationMarker = null
    }
}
