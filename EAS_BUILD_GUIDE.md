# 🚀 BuscaParca - EAS Build Instructions

## Step-by-Step Guide to Build Your Android APK

---

## ✅ Everything is Ready!

I've already configured:
- ✅ app.json with Android settings
- ✅ eas.json with build profiles
- ✅ EAS CLI installed
- ✅ Project ready for build

---

## 🔑 Step 1: Create Expo Account (if you don't have one)

Go to: **https://expo.dev/signup**

- Use any email
- Create a password
- Verify your email
- **FREE** (no credit card needed)

---

## 📱 Step 2: Login to EAS

In your terminal, run:

```bash
npx eas-cli login
```

It will ask for:
- **Email:** (your Expo account email)
- **Password:** (your Expo account password)

---

## 🏗️ Step 3: Start the Build

Once logged in, run:

```bash
npx eas-cli build --platform android --profile preview
```

**What happens:**
1. EAS will ask some questions (I'll tell you what to answer)
2. It uploads your code to Expo's servers
3. Builds the APK in the cloud (~15-20 minutes)
4. Gives you a download link

---

## ❓ Questions EAS Might Ask

### "Would you like to automatically create an EAS project for @username/buscaparca?"
**Answer:** `Y` (yes)

### "Generate a new Android Keystore?"
**Answer:** `Y` (yes)

### Any other questions?
**Answer:** Just press Enter (use default)

---

## ⏱️ Step 4: Wait for Build

You'll see:
```
✔ Build started, it may take a few minutes to complete.
🔗 https://expo.dev/accounts/yourname/projects/buscaparca/builds/xxxxxx
```

**Open that link in your browser to watch progress!**

Build takes: **15-20 minutes** ☕

---

## 📥 Step 5: Download APK

When build completes:

1. **Click the download link** in terminal or on the web page
2. Download the `.apk` file to your computer
3. Transfer to your phone via:
   - USB cable
   - Email attachment
   - Google Drive
   - Bluetooth
   - Or run: `adb install path/to/app.apk`

---

## 📲 Step 6: Install on Android

On your phone:

1. **Open the APK file**
2. Android will say "Install blocked" or "Unknown sources"
3. **Tap "Settings"** → Enable "Install from this source"
4. **Tap "Install"**
5. **Open the app!**

---

## 🎯 After Installation

1. Open BuscaParca app
2. Register/Login
3. Grant location permissions
4. Tap "Demo" button
5. See hot zones on map
6. Tap "APARCAR" to test!

**Make sure computer with backend server is running:**
```bash
cd server && npm start
```

---

## 🔧 Troubleshooting

### Build fails
- Check your internet connection
- Make sure you're logged in: `npx eas-cli whoami`
- Try again: `npx eas-cli build --platform android --profile preview`

### Can't install APK
- Enable "Unknown sources" in Android settings
- Make sure you downloaded the complete file
- Try sending via different method

### App crashes
- Make sure backend server is running
- Check IP in src/services/ApiService.js (192.168.1.120)
- Phone must be on same WiFi as computer

---

## 📋 Quick Command Summary

```bash
# 1. Login (one time)
npx eas-cli login

# 2. Build APK
npx eas-cli build --platform android --profile preview

# 3. Check build status
npx eas-cli build:list

# 4. Download APK
# Click the link from terminal or expo.dev
```

---

## 🆘 Need Help?

If you get stuck at any step, just tell me:
1. What command you ran
2. What question appeared
3. Any error message

I'll help you through it!

---

**Ready? Run this command to start:**

```bash
npx eas-cli login
```

**Then tell me when you're logged in!** 🚀
