package com.buscaparca.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

/**
 * Madrid Open Data API for parking information
 * API Documentation: https://datos.madrid.es/portal/site/egob/
 */
interface MadridOpenDataApi {
    
    /**
     * Get real-time parking availability
     * Dataset: Aparcamientos públicos (disponibilidad en tiempo real)
     */
    @GET("datos/catalogo/{datasetId}.json")
    suspend fun getParkingAvailability(
        @Path("datasetId") datasetId: String = "208862-0-aparcamientos-publicos"
    ): Response<MadridParkingResponse>
}

data class MadridParkingResponse(
    @SerializedName("@graph")
    val graph: List<MadridParkingItem>
)

data class MadridParkingItem(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("address")
    val address: MadridAddress?,
    
    @SerializedName("location")
    val location: MadridLocation?,
    
    @SerializedName("organization")
    val organization: MadridOrganization?,
    
    // Parking specific fields
    @SerializedName("capacity")
    val capacity: Int?,
    
    @SerializedName("free-places")
    val freePlaces: Int?,
    
    @SerializedName("occupied-places")
    val occupiedPlaces: Int?
)

data class MadridAddress(
    @SerializedName("district")
    val district: MadridDistrict?,
    
    @SerializedName("area")
    val area: MadridArea?,
    
    @SerializedName("street-address")
    val streetAddress: String?
)

data class MadridDistrict(
    @SerializedName("@id")
    val id: String?,
    
    @SerializedName("title")
    val title: String?
)

data class MadridArea(
    @SerializedName("@id")
    val id: String?,
    
    @SerializedName("title")
    val title: String?
)

data class MadridLocation(
    @SerializedName("latitude")
    val latitude: Double?,
    
    @SerializedName("longitude")
    val longitude: Double?
)

data class MadridOrganization(
    @SerializedName("organization-name")
    val name: String?,
    
    @SerializedName("accesibility")
    val accessibility: String?
)
