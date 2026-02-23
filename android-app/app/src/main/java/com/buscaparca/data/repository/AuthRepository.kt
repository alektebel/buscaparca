package com.buscaparca.data.repository

import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.models.User
import java.security.MessageDigest

class AuthRepository(private val database: BuscaParcaDatabase) {
    
    suspend fun register(username: String, email: String, password: String): Result<User> {
        return try {
            // Check if user already exists
            val existing = database.userDao().getUserByEmail(email)
            if (existing != null) {
                return Result.failure(Exception("User with this email already exists"))
            }
            
            val existingUsername = database.userDao().getUserByUsername(username)
            if (existingUsername != null) {
                return Result.failure(Exception("Username already taken"))
            }
            
            // Hash password
            val passwordHash = hashPassword(password)
            
            val user = User(
                username = username,
                email = email,
                passwordHash = passwordHash
            )
            
            val userId = database.userDao().insert(user)
            val createdUser = user.copy(id = userId)
            
            Result.success(createdUser)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun login(emailOrUsername: String, password: String): Result<User> {
        return try {
            val user = database.userDao().getUserByEmail(emailOrUsername)
                ?: database.userDao().getUserByUsername(emailOrUsername)
            
            if (user == null) {
                return Result.failure(Exception("User not found"))
            }
            
            val passwordHash = hashPassword(password)
            if (user.passwordHash != passwordHash) {
                return Result.failure(Exception("Invalid password"))
            }
            
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getUserById(id: Long): User? {
        return database.userDao().getUserById(id)
    }
    
    private fun hashPassword(password: String): String {
        val bytes = password.toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return digest.fold("") { str, it -> str + "%02x".format(it) }
    }
}
