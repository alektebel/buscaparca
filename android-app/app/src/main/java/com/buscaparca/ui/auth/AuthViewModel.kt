package com.buscaparca.ui.auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.models.User
import com.buscaparca.data.repository.AuthRepository
import com.buscaparca.utils.PreferencesManager
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    
    private val database = BuscaParcaDatabase.getDatabase(application)
    private val repository = AuthRepository(database)
    private val preferencesManager = PreferencesManager(application)
    
    private val _authState = MutableLiveData<AuthState>()
    val authState: LiveData<AuthState> = _authState
    
    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    sealed class AuthState {
        data class Success(val user: User) : AuthState()
        data class Error(val message: String) : AuthState()
        object Initial : AuthState()
    }
    
    init {
        _authState.value = AuthState.Initial
    }
    
    fun login(emailOrUsername: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.login(emailOrUsername, password)
                .onSuccess { user ->
                    // Save to preferences
                    preferencesManager.saveUserId(user.id)
                    preferencesManager.saveUsername(user.username)
                    preferencesManager.saveEmail(user.email)
                    preferencesManager.setLoggedIn(true)
                    
                    _authState.value = AuthState.Success(user)
                }
                .onFailure { error ->
                    _authState.value = AuthState.Error(error.message ?: "Login failed")
                }
            _isLoading.value = false
        }
    }
    
    fun register(username: String, email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            
            // Validation
            if (username.length < 3) {
                _authState.value = AuthState.Error("Username must be at least 3 characters")
                _isLoading.value = false
                return@launch
            }
            
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                _authState.value = AuthState.Error("Invalid email address")
                _isLoading.value = false
                return@launch
            }
            
            if (password.length < 6) {
                _authState.value = AuthState.Error("Password must be at least 6 characters")
                _isLoading.value = false
                return@launch
            }
            
            repository.register(username, email, password)
                .onSuccess { user ->
                    // Save to preferences
                    preferencesManager.saveUserId(user.id)
                    preferencesManager.saveUsername(user.username)
                    preferencesManager.saveEmail(user.email)
                    preferencesManager.setLoggedIn(true)
                    
                    _authState.value = AuthState.Success(user)
                }
                .onFailure { error ->
                    _authState.value = AuthState.Error(error.message ?: "Registration failed")
                }
            _isLoading.value = false
        }
    }
    
    suspend fun checkLoginStatus(): Boolean {
        return preferencesManager.isLoggedIn()
    }
    
    fun logout() {
        viewModelScope.launch {
            preferencesManager.clearAll()
            _authState.value = AuthState.Initial
        }
    }
}
