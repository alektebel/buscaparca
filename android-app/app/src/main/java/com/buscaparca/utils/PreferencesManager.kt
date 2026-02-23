package com.buscaparca.utils

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "buscaparca_prefs")

class PreferencesManager(private val context: Context) {
    
    companion object {
        private val USER_ID = longPreferencesKey("user_id")
        private val USERNAME = stringPreferencesKey("username")
        private val EMAIL = stringPreferencesKey("email")
        private val IS_LOGGED_IN = stringPreferencesKey("is_logged_in")
        private val SERVER_URL = stringPreferencesKey("server_url")
    }
    
    suspend fun saveUserId(userId: Long) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID] = userId
        }
    }
    
    suspend fun getUserId(): Long? {
        return context.dataStore.data.map { preferences ->
            preferences[USER_ID]
        }.first()
    }
    
    suspend fun saveUsername(username: String) {
        context.dataStore.edit { preferences ->
            preferences[USERNAME] = username
        }
    }
    
    fun getUsernameFlow(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[USERNAME]
        }
    }
    
    suspend fun saveEmail(email: String) {
        context.dataStore.edit { preferences ->
            preferences[EMAIL] = email
        }
    }
    
    suspend fun setLoggedIn(isLoggedIn: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[IS_LOGGED_IN] = isLoggedIn.toString()
        }
    }
    
    suspend fun isLoggedIn(): Boolean {
        return context.dataStore.data.map { preferences ->
            preferences[IS_LOGGED_IN]?.toBoolean() ?: false
        }.first()
    }
    
    suspend fun saveServerUrl(url: String) {
        context.dataStore.edit { preferences ->
            preferences[SERVER_URL] = url
        }
    }
    
    suspend fun getServerUrl(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[SERVER_URL]
        }.first()
    }
    
    suspend fun clearAll() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
