package com.buscaparca.data.api

import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    
    // Configure this to your PC's local IP
    private const val BUSCAPARCA_BASE_URL = "http://192.168.1.120:3000/"
    private const val MADRID_OPEN_DATA_BASE_URL = "https://datos.madrid.es/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = GsonBuilder()
        .setLenient()
        .create()
    
    private val buscaParcaRetrofit = Retrofit.Builder()
        .baseUrl(BUSCAPARCA_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()
    
    private val madridRetrofit = Retrofit.Builder()
        .baseUrl(MADRID_OPEN_DATA_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()
    
    val buscaParcaApi: BuscaParcaApi by lazy {
        buscaParcaRetrofit.create(BuscaParcaApi::class.java)
    }
    
    val madridApi: MadridOpenDataApi by lazy {
        madridRetrofit.create(MadridOpenDataApi::class.java)
    }
}
