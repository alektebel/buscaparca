package com.buscaparca

import com.buscaparca.data.database.BuscaParcaDatabase
import com.buscaparca.data.database.UserDao
import com.buscaparca.data.models.User
import com.buscaparca.data.repository.AuthRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever

@ExperimentalCoroutinesApi
class AuthRepositoryTest {

    @Mock
    private lateinit var database: BuscaParcaDatabase

    @Mock
    private lateinit var userDao: UserDao

    private lateinit var repository: AuthRepository

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        whenever(database.userDao()).thenReturn(userDao)
        repository = AuthRepository(database)
    }

    // ===== REGISTRATION TESTS =====

    @Test
    fun `register successful creates new user`() = runTest {
        // Given
        val username = "testuser"
        val email = "test@example.com"
        val password = "password123"
        val userId = 1L

        whenever(userDao.getUserByEmail(email)).thenReturn(null)
        whenever(userDao.getUserByUsername(username)).thenReturn(null)
        whenever(userDao.insert(any())).thenReturn(userId)

        // When
        val result = repository.register(username, email, password)

        // Then
        assertTrue(result.isSuccess)
        val user = result.getOrNull()
        assertNotNull(user)
        assertEquals(username, user?.username)
        assertEquals(email, user?.email)
        assertEquals(userId, user?.id)
    }

    @Test
    fun `register fails when email already exists`() = runTest {
        // Given
        val username = "testuser"
        val email = "test@example.com"
        val password = "password123"
        val existingUser = User(
            id = 1L,
            username = "existing",
            email = email,
            passwordHash = "hash"
        )

        whenever(userDao.getUserByEmail(email)).thenReturn(existingUser)

        // When
        val result = repository.register(username, email, password)

        // Then
        assertTrue(result.isFailure)
        assertEquals("User with this email already exists", result.exceptionOrNull()?.message)
    }

    @Test
    fun `register fails when username already exists`() = runTest {
        // Given
        val username = "testuser"
        val email = "test@example.com"
        val password = "password123"
        val existingUser = User(
            id = 1L,
            username = username,
            email = "other@example.com",
            passwordHash = "hash"
        )

        whenever(userDao.getUserByEmail(email)).thenReturn(null)
        whenever(userDao.getUserByUsername(username)).thenReturn(existingUser)

        // When
        val result = repository.register(username, email, password)

        // Then
        assertTrue(result.isFailure)
        assertEquals("Username already taken", result.exceptionOrNull()?.message)
    }

    @Test
    fun `register handles database error gracefully`() = runTest {
        // Given
        val username = "testuser"
        val email = "test@example.com"
        val password = "password123"

        whenever(userDao.getUserByEmail(email)).thenReturn(null)
        whenever(userDao.getUserByUsername(username)).thenReturn(null)
        whenever(userDao.insert(any())).thenThrow(RuntimeException("Database error"))

        // When
        val result = repository.register(username, email, password)

        // Then
        assertTrue(result.isFailure)
        assertEquals("Database error", result.exceptionOrNull()?.message)
    }

    @Test
    fun `register hashes password correctly`() = runTest {
        // Given
        val username = "testuser"
        val email = "test@example.com"
        val password = "password123"
        val userId = 1L

        whenever(userDao.getUserByEmail(email)).thenReturn(null)
        whenever(userDao.getUserByUsername(username)).thenReturn(null)
        whenever(userDao.insert(any())).thenReturn(userId)

        // When
        val result = repository.register(username, email, password)

        // Then
        assertTrue(result.isSuccess)
        val user = result.getOrNull()
        assertNotNull(user?.passwordHash)
        assertNotEquals(password, user?.passwordHash) // Password should be hashed, not plain text
        assertEquals(64, user?.passwordHash?.length) // SHA-256 hex string length
    }

    // ===== LOGIN TESTS =====

    @Test
    fun `login successful with email`() = runTest {
        // Given
        val email = "test@example.com"
        val password = "password123"
        val passwordHash = "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" // SHA-256 of "password123"
        val user = User(
            id = 1L,
            username = "testuser",
            email = email,
            passwordHash = passwordHash
        )

        whenever(userDao.getUserByEmail(email)).thenReturn(user)

        // When
        val result = repository.login(email, password)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(user, result.getOrNull())
    }

    @Test
    fun `login successful with username`() = runTest {
        // Given
        val username = "testuser"
        val password = "password123"
        val passwordHash = "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" // SHA-256 of "password123"
        val user = User(
            id = 1L,
            username = username,
            email = "test@example.com",
            passwordHash = passwordHash
        )

        whenever(userDao.getUserByEmail(username)).thenReturn(null)
        whenever(userDao.getUserByUsername(username)).thenReturn(user)

        // When
        val result = repository.login(username, password)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(user, result.getOrNull())
    }

    @Test
    fun `login fails when user not found`() = runTest {
        // Given
        val emailOrUsername = "nonexistent@example.com"
        val password = "password123"

        whenever(userDao.getUserByEmail(emailOrUsername)).thenReturn(null)
        whenever(userDao.getUserByUsername(emailOrUsername)).thenReturn(null)

        // When
        val result = repository.login(emailOrUsername, password)

        // Then
        assertTrue(result.isFailure)
        assertEquals("User not found", result.exceptionOrNull()?.message)
    }

    @Test
    fun `login fails with incorrect password`() = runTest {
        // Given
        val email = "test@example.com"
        val correctPassword = "password123"
        val incorrectPassword = "wrongpassword"
        val passwordHash = "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" // SHA-256 of "password123"
        val user = User(
            id = 1L,
            username = "testuser",
            email = email,
            passwordHash = passwordHash
        )

        whenever(userDao.getUserByEmail(email)).thenReturn(user)

        // When
        val result = repository.login(email, incorrectPassword)

        // Then
        assertTrue(result.isFailure)
        assertEquals("Invalid password", result.exceptionOrNull()?.message)
    }

    @Test
    fun `login handles database error gracefully`() = runTest {
        // Given
        val email = "test@example.com"
        val password = "password123"

        whenever(userDao.getUserByEmail(email)).thenThrow(RuntimeException("Database error"))

        // When
        val result = repository.login(email, password)

        // Then
        assertTrue(result.isFailure)
        assertEquals("Database error", result.exceptionOrNull()?.message)
    }

    // ===== GET USER BY ID TESTS =====

    @Test
    fun `getUserById returns user when exists`() = runTest {
        // Given
        val userId = 1L
        val user = User(
            id = userId,
            username = "testuser",
            email = "test@example.com",
            passwordHash = "hash"
        )

        whenever(userDao.getUserById(userId)).thenReturn(user)

        // When
        val result = repository.getUserById(userId)

        // Then
        assertNotNull(result)
        assertEquals(user, result)
    }

    @Test
    fun `getUserById returns null when user does not exist`() = runTest {
        // Given
        val userId = 999L

        whenever(userDao.getUserById(userId)).thenReturn(null)

        // When
        val result = repository.getUserById(userId)

        // Then
        assertNull(result)
    }
}
