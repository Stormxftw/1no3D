# Firebase Setup Instructions

## 1. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Create a project"
3. Enter project name (e.g., "uno3d-game")
4. Disable Google Analytics (optional)
5. Click "Create project"

## 2. Setup Realtime Database
1. In your Firebase console, click "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" for now
4. Select your preferred location
5. Click "Done"

## 3. Setup Hosting (Optional)
1. In Firebase console, click "Hosting"
2. Click "Get started"
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Run `firebase init` in your project directory
5. Select Hosting
6. Choose your Firebase project
7. Set public directory to current directory (.)
8. Configure as single-page app: Yes
9. Set up automatic builds: No

## 4. Get Configuration
1. In Firebase console, click the gear icon (Settings)
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click "Web" (</> icon)
5. Register app with nickname "Uno3D"
6. Copy the configuration object
7. Replace the firebaseConfig in script.js with your actual config

## 5. Security Rules (Important!)
In Realtime Database, go to "Rules" tab and update:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt"]
      }
    }
  }
}
```

**Note:** These are development rules. For production, implement proper authentication and security rules.

## 6. Giphy API Setup
1. Go to https://developers.giphy.com/
2. Create account and get API key
3. Replace 'your-giphy-api-key' in script.js with your actual key

## Example Firebase Config
```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```
