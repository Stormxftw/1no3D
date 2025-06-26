# Uno3D - Multiplayer 3D Card Game

A 3D version of the classic UNO card game with multiplayer support using Firebase for real-time gameplay and hosting.

## Features

- 🎮 **3D Game Environment** - Built with Three.js for immersive gameplay
- 🌐 **Real-time Multiplayer** - Firebase Realtime Database for synchronized gameplay
- 🎨 **Custom Avatars** - Choose colors and Giphy images for your player avatar
- 🏠 **Room System** - Create and join rooms with unique codes
- ⚙️ **Lobby Settings** - Customize game rules before starting
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Quick Start

### 1. Setup Firebase
Follow the instructions in `firebase-setup.md` to create your Firebase project and get your configuration keys.

### 2. Configure API Keys
Edit `script.js` and replace the placeholder values:
- Replace `firebaseConfig` with your actual Firebase configuration
- Replace `GIPHY_API_KEY` with your Giphy API key (get one at https://developers.giphy.com/)

### 3. Run the Game
Simply open `index.html` in your web browser, or serve it using a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## How to Play

### Creating a Room
1. Click "Create Room"
2. Enter your name and room name
3. Choose your avatar color
4. Optionally search for a Giphy image as your avatar
5. Click "Create Room" to generate a room code
6. Share the room code with friends

### Joining a Room
1. Click "Join Room"
2. Enter your name and the room code
3. Customize your avatar
4. Click "Join Room" to enter the lobby

### Lobby Settings (Host Only)
- **Max Players**: 2-8 players
- **Starting Cards**: 5, 7, or 10 cards per player
- **Card Stacking**: Allow players to stack Draw +2/+4 cards
- **Jump-in**: Allow players to play out of turn with matching cards

### Game Controls
- Click cards to play them
- Draw cards when you can't play
- Click "UNO!" when you have one card left
- First player to empty their hand wins!

## Project Structure

```
Uno3D/
├── index.html          # Main game interface
├── style.css           # Game styling
├── script.js           # Game logic and Firebase integration
├── assets/             # Game assets (currently empty)
├── firebase-setup.md   # Firebase configuration guide
└── README.md          # This file
```

## Technologies Used

- **HTML5/CSS3/JavaScript** - Frontend framework
- **Three.js** - 3D graphics and rendering
- **Firebase Realtime Database** - Backend and real-time synchronization
- **Firebase Hosting** - Web hosting (optional)
- **Giphy API** - Avatar images

## Development Roadmap

### Phase 1: Core Functionality ✅
- [x] Basic UI/UX design
- [x] Room creation and joining
- [x] Player customization
- [x] Lobby system
- [x] 3D scene setup

### Phase 2: Game Logic (In Progress)
- [ ] Card deck generation
- [ ] Game state management
- [ ] Turn-based gameplay
- [ ] UNO rules implementation
- [ ] Win conditions

### Phase 3: Enhanced Features
- [ ] Sound effects and music
- [ ] Animated card movements
- [ ] Chat system
- [ ] Player statistics
- [ ] Reconnection handling

### Phase 4: Polish
- [ ] Mobile optimization
- [ ] Improved 3D graphics
- [ ] Game replay system
- [ ] Tournament mode

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## Known Issues

- Giphy integration requires API key setup
- Game logic is currently basic (work in progress)
- Mobile experience needs optimization

## License

This project is for educational and personal use.
