package com.buscaparca.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query

interface GoogleDirectionsApi {
    
    @GET("maps/api/directions/json")
    suspend fun getDirections(
        @Query("origin") origin: String,
        @Query("destination") destination: String,
        @Query("mode") mode: String = "driving",
        @Query("key") apiKey: String
    ): Response<DirectionsResponse>
    
    companion object {
        private const val BASE_URL = "https://maps.googleapis.com/"
        
        fun create(): GoogleDirectionsApi {
            return Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(GoogleDirectionsApi::class.java)
        }
    }
}

data class DirectionsResponse(
    @SerializedName("routes")
    val routes: List<Route>,
    
    @SerializedName("status")
    val status: String
)

data class Route(
    @SerializedName("overview_polyline")
    val overviewPolyline: OverviewPolyline,
    
    @SerializedName("legs")
    val legs: List<Leg>,
    
    @SerializedName("bounds")
    val bounds: Bounds
)

data class OverviewPolyline(
    @SerializedName("points")
    val points: String
)

data class Leg(
    @SerializedName("distance")
    val distance: Distance,
    
    @SerializedName("duration")
    val duration: Duration,
    
    @SerializedName("steps")
    val steps: List<Step>
)

data class Distance(
    @SerializedName("text")
    val text: String,
    
    @SerializedName("value")
    val value: Int
)

data class Duration(
    @SerializedName("text")
    val text: String,
    
    @SerializedName("value")
    val value: Int
)

data class Step(
    @SerializedName("html_instructions")
    val htmlInstructions: String,
    
    @SerializedName("distance")
    val distance: Distance,
    
    @SerializedName("duration")
    val duration: Duration,
    
    @SerializedName("polyline")
    val polyline: OverviewPolyline
)

data class Bounds(
    @SerializedName("northeast")
    val northeast: LatLngDto,
    
    @SerializedName("southwest")
    val southwest: LatLngDto
)

data class LatLngDto(
    @SerializedName("lat")
    val lat: Double,
    
    @SerializedName("lng")
    val lng: Double
)
