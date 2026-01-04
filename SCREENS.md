# BuscaParca - Screen Mockups and Flow

## Screen Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                   App Launches                      │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
           ┌─────────────────────┐
           │  Check Session?     │
           └──────┬─────┬────────┘
                  │     │
            Yes   │     │  No
                  │     │
         ┌────────┘     └────────┐
         │                       │
         ▼                       ▼


╔════════════════════════╗         ╔════════════════════════╗
║   LOGIN SCREEN         ║         ║   MAIN SCREEN          ║
║                        ║         ║                        ║
║  ┌──────────────────┐ ║         ║  ┌──────────────────┐  ║
║  │  BuscaParca      │ ║         ║  │ Welcome: user123 │  ║
║  │  Find parking    │ ║         ║  │            [Salir]│  ║
║  └──────────────────┘ ║         ║  └──────────────────┘  ║
║                        ║         ║                        ║
║  ┌──────────────────┐ ║         ║  ┌──────────────────┐  ║
║  │ Email/Username   │ ║         ║  │                  │  ║
║  └──────────────────┘ ║         ║  │   [MAP VIEW]     │  ║
║                        ║         ║  │                  │  ║
║  ┌──────────────────┐ ║         ║  │   📍 User Loc    │  ║
║  │ •••••••••••••    │ ║         ║  │   🅿️  Parking    │  ║
║  └──────────────────┘ ║         ║  │                  │  ║
║                        ║         ║  └──────────────────┘  ║
║  ┌──────────────────┐ ║         ║                        ║
║  │  Iniciar Sesión  │ ║         ║  ┌──────────────────┐  ║
║  └──────────────────┘ ║         ║  │ Probability: 75% │  ║
║                        ║         ║  │ Parking Centro   │  ║
║  ¿No tienes cuenta?   ║         ║  │ Distance: 250m   │  ║
║     Regístrate        ║         ║  └──────────────────┘  ║
║                        ║         ║                        ║
╚═══════════┬════════════╝         ║  ┌──────────────────┐  ║
            │                      ║  │                  │  ║
            │                      ║  │    APARCAR       │  ║
            ▼                      ║  │                  │  ║
                                   ║  └──────────────────┘  ║
╔════════════════════════╗         ║                        ║
║  REGISTER SCREEN       ║         ╚════════════════════════╝
║                        ║
║  ┌──────────────────┐ ║
║  │  Crear Cuenta    │ ║
║  └──────────────────┘ ║
║                        ║
║  ┌──────────────────┐ ║
║  │ Email            │ ║
║  └──────────────────┘ ║
║                        ║
║  ┌──────────────────┐ ║
║  │ Usuario          │ ║
║  └──────────────────┘ ║
║                        ║
║  ┌──────────────────┐ ║
║  │ •••••••••••••    │ ║
║  └──────────────────┘ ║
║                        ║
║  ┌──────────────────┐ ║
║  │ •••••••••••••    │ ║
║  └──────────────────┘ ║
║                        ║
║  ┌──────────────────┐ ║
║  │   Registrarse    │ ║
║  └──────────────────┘ ║
║                        ║
║  ¿Ya tienes cuenta?   ║
║   Inicia sesión       ║
║                        ║
╚════════════════════════╝
```

## Screen Details

### 1. Login Screen

**Visual Elements:**
- Title: "BuscaParca" (Large, bold, blue)
- Subtitle: "Encuentra estacionamiento fácilmente"
- Input Field 1: Email or Username
- Input Field 2: Password (masked)
- Primary Button: "Iniciar Sesión" (Blue, prominent)
- Link: "¿No tienes cuenta? Regístrate"

**States:**
- Loading: Spinner shown while checking credentials
- Error: Alert dialog for invalid credentials
- Success: Navigate to Main Screen

**Features:**
- Auto-fill supported
- Remember session
- Show/hide password option (secureTextEntry)

### 2. Register Screen

**Visual Elements:**
- Title: "Crear Cuenta" (Large, bold, blue)
- Subtitle: "Regístrate para usar BuscaParca"
- Input Field 1: Email
- Input Field 2: Username
- Input Field 3: Password
- Input Field 4: Confirm Password
- Primary Button: "Registrarse" (Blue, prominent)
- Link: "¿Ya tienes cuenta? Inicia sesión"

**Validation:**
- Email: Must match pattern (user@domain.com)
- Username: Required, alphanumeric
- Password: Minimum 6 characters
- Confirm: Must match password

**States:**
- Loading: Spinner while creating account
- Error: Alert for validation failures
- Success: Alert + navigate to Login

### 3. Main Screen (Map View)

**Visual Elements:**

**Header:**
- Left: "Bienvenido" + Username
- Right: "Salir" button

**Map Area (Full Screen):**
- Interactive map (zoom, pan)
- User location marker (blue dot)
- Search radius (circle, 500m)
- Parking markers (pins)
- My location button

**Probability Card:**
- Large percentage (e.g., "75%")
- Label: "Probabilidad de Estacionamiento"
- Parking name
- Distance in meters
- Parking type

**Bottom Button:**
- Large "APARCAR" button
- Blue background
- White text
- Bold, uppercase
- Prominent size (80px height)

**States:**
- Loading: "Obteniendo ubicación..."
- Searching: Button shows spinner
- Result: Shows probability card + marker
- Error: Alert for location errors

## Interactive Elements

### Login Screen
```
┌─────────────────────────────────┐
│ Email/Username [_____________ ] │  ← Text Input
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Password       [•••••••••••••  ] │  ← Secure Input
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       [ Iniciar Sesión ]        │  ← Button (tap)
└─────────────────────────────────┘

    ¿No tienes cuenta? Regístrate    ← Link (tap)
```

### Main Screen - APARCAR Button
```
┌─────────────────────────────────┐
│                                 │
│         A P A R C A R           │  ← Large Button
│                                 │  ← 80px height
│         (Tap to search)         │  ← Blue #4A90E2
│                                 │
└─────────────────────────────────┘
```

### Probability Display
```
┌─────────────────────────────────┐
│ Probabilidad de Estacionamiento │
│                                 │
│            7 5 %                │  ← Large 48px
│                                 │
│      Parking Principal          │
│        250m de distancia        │
└─────────────────────────────────┘
```

## Color Palette

```
Primary Blue:   #4A90E2  ████
Background:     #F5F5F5  ████
White:          #FFFFFF  ████
Text Dark:      #333333  ████
Text Light:     #666666  ████
Border:         #DDDDDD  ████
Accent:         #A0C4E8  ████ (disabled state)
```

## Typography

```
App Title:        36px, Bold
Screen Title:     32px, Bold
Button Text:      18-32px, Bold
Body Text:        16px, Regular
Label Text:       14px, Regular
Probability:      48px, Bold
```

## Spacing

```
Screen Padding:   20px
Element Gap:      15px
Button Height:    50-80px
Input Height:     50px
Border Radius:    8-15px
```

## Gestures

### Login/Register Screens
- **Tap**: Buttons, links
- **Type**: Text inputs
- **Scroll**: Keyboard shows

### Main Screen
- **Tap**: APARCAR button
- **Pan**: Move map
- **Pinch**: Zoom map
- **Tap marker**: Show parking info
- **Tap "My Location"**: Center on user

## Transitions

```
Login → Register:     Slide left
Register → Login:     Slide right
Login → Main:         Replace (no back)
Main → Login:         Replace (logout)
```

## Loading States

### Login Screen
```
┌─────────────────────────────────┐
│         [  Loading...  ]        │
│            ⟳                    │  ← Spinner
└─────────────────────────────────┘
```

### Main Screen
```
┌─────────────────────────────────┐
│     Obteniendo ubicación...     │
│            ⟳                    │  ← Spinner
└─────────────────────────────────┘
```

### Searching
```
┌─────────────────────────────────┐
│         [     ⟳     ]           │  ← Spinner in button
└─────────────────────────────────┘
```

## Error States

### Alert Dialog
```
┌─────────────────────────────────┐
│             Error               │
│                                 │
│  Credenciales inválidas         │
│                                 │
│          [    OK    ]           │
└─────────────────────────────────┘
```

## Responsive Design

### Phone Portrait (Primary)
- Full screen layouts
- Stacked elements
- Bottom-aligned buttons
- Scrollable content

### Tablet (Supported)
- Wider inputs
- Larger buttons
- More padding
- Same layout structure

## Accessibility

- Large touch targets (44x44px minimum)
- High contrast text
- Clear labels
- Loading indicators
- Error messages
- Safe area support

## Platform Differences

### iOS
- System status bar
- Rounded corners
- iOS keyboard
- Back gesture

### Android
- Material Design ripples
- Android keyboard
- Back button support
- Google Maps

---

**Note**: These are ASCII mockups. The actual app has polished UI with proper styling, shadows, and smooth animations.
