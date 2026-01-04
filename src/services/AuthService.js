import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_STORAGE_KEY = '@buscaparca_users';
const SESSION_STORAGE_KEY = '@buscaparca_session';

// Simple in-memory user database (for demo purposes)
// In production, this would connect to a real backend API
export const AuthService = {
  // Register a new user
  async register(email, username, password) {
    try {
      // Validate input
      if (!email || !username || !password) {
        throw new Error('Todos los campos son requeridos');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Email inválido');
      }

      // Password must be at least 6 characters
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Get existing users
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];

      // Check if user already exists
      const existingUser = users.find(
        u => u.email === email || u.username === username
      );

      if (existingUser) {
        throw new Error('El usuario o email ya existe');
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(),
        email,
        username,
        password, // In production, this should be hashed
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      return { success: true, user: { id: newUser.id, email, username } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login user
  async login(emailOrUsername, password) {
    try {
      if (!emailOrUsername || !password) {
        throw new Error('Email/Usuario y contraseña son requeridos');
      }

      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];

      const user = users.find(
        u => (u.email === emailOrUsername || u.username === emailOrUsername) 
             && u.password === password
      );

      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Create session
      const session = {
        userId: user.id,
        email: user.email,
        username: user.username,
        loginAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      return { success: true, user: session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Check if user is logged in
  async checkSession() {
    try {
      const sessionJson = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        return { success: true, user: session };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  },

  // Logout
  async logout() {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
