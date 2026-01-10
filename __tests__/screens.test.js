/**
 * Tests to verify that screen components can render properly
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../src/screens/LoginScreen';
import RegisterScreen from '../src/screens/RegisterScreen';
import MainScreen from '../src/screens/MainScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('LoginScreen - Rendering Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', async () => {
    const { UNSAFE_root } = render(<LoginScreen navigation={mockNavigation} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  test('renders login form elements after loading', async () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );
    
    // Wait for loading to finish
    await waitFor(() => {
      // Check for input fields (using actual placeholder text)
      expect(getByPlaceholderText('Email o Usuario')).toBeTruthy();
      expect(getByPlaceholderText('Contraseña')).toBeTruthy();
    });
  });

  test('renders login button', async () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    
    await waitFor(() => {
      expect(getByText(/iniciar sesión/i)).toBeTruthy();
    });
  });

  test('renders register link', async () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    
    await waitFor(() => {
      expect(getByText(/regístrate/i)).toBeTruthy();
    });
  });
});

describe('RegisterScreen - Rendering Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const { UNSAFE_root } = render(<RegisterScreen navigation={mockNavigation} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  test('renders registration form elements', () => {
    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    // Check for input fields (using actual placeholder text)
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Usuario')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña')).toBeTruthy();
    
    // Check for register button
    expect(getByText(/registrarse/i)).toBeTruthy();
  });

  test('renders login link', () => {
    const { getByText } = render(<RegisterScreen navigation={mockNavigation} />);
    expect(getByText(/ya tienes cuenta/i)).toBeTruthy();
  });
});

describe('MainScreen - Rendering Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const { UNSAFE_root } = render(<MainScreen navigation={mockNavigation} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  test('renders main UI elements', () => {
    const { getByText } = render(<MainScreen navigation={mockNavigation} />);
    
    // Check for the main parking button
    expect(getByText(/aparcar/i)).toBeTruthy();
  });

  test('renders logout button', () => {
    const { getByText } = render(<MainScreen navigation={mockNavigation} />);
    expect(getByText(/salir/i)).toBeTruthy();
  });
});
