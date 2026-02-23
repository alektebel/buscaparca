# 🚗 TEST THE SERVER - DO THIS FIRST!

## On Your Phone's Browser, Open:

```
http://192.168.1.120:3000/test/index.html
```

### You should see:
- ✅ **Green checkmark** saying "Si ves esta página, el servidor está funcionando!"
- **5 blue buttons** with links

### If you see this = Server is working! ✅

---

## Then Try This:

```
http://192.168.1.120:3000/test/test.html
```

### Click all 4 buttons:
1. 🔌 Probar Conexión → Should show green success
2. 📊 Estadísticas → Should show 100/256/8 
3. 🗺️ Zonas Calientes → Should show 8 zones
4. 🎯 Probar Predicción → Should show a percentage

### If all 4 work = Everything perfect! ✅

---

## If Nothing Works:

1. Check you're on same WiFi as computer
2. On computer, run: `cd server && npm start`
3. Try again

---

## Once Server Works:

1. Install **Expo Go** from Play Store
2. On computer run: `./start-buscaparca.sh`
3. Scan QR code with Expo Go
4. Use the app!

---

**For detailed help, see: PHONE_TEST.md**
