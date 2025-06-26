// Firebase configuration (you'll need to replace this with your actual config)
const firebaseConfig = {
    // Replace with your actual Firebase config
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Game state
let gameState = {
    currentPlayer: null,
    currentRoom: null,
    playerData: {
        name: '',
        color: '#FF6B6B',
        avatar: null
    },
    isHost: false
};

// Giphy API key (you'll need to get your own)
const GIPHY_API_KEY = 'your-giphy-api-key';

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Color picker functionality
function setupColorPickers() {
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from siblings
            this.parentElement.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            // Add selected class to clicked option
            this.classList.add('selected');
            gameState.playerData.color = this.dataset.color;
        });
    });
}

// Giphy search functionality
function searchGiphy(query, resultsContainer) {
    if (!query.trim()) return;
    
    fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=6&rating=g`)
        .then(response => response.json())
        .then(data => {
            resultsContainer.innerHTML = '';
            data.data.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.images.fixed_height_small.url;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.margin = '5px';
                img.style.cursor = 'pointer';
                img.style.borderRadius = '5px';
                img.addEventListener('click', () => {
                    gameState.playerData.avatar = gif.images.fixed_height.url;
                    resultsContainer.querySelectorAll('img').forEach(i => i.style.border = 'none');
                    img.style.border = '3px solid #007bff';
                });
                resultsContainer.appendChild(img);
            });
        })
        .catch(error => {
            console.error('Error fetching Giphy:', error);
            resultsContainer.innerHTML = '<p>Error loading images</p>';
        });
}

// Room management
function createRoom() {
    const playerName = document.getElementById('player-name').value.trim();
    const roomName = document.getElementById('room-name').value.trim();
    
    if (!playerName || !roomName) {
        alert('Please fill in all required fields');
        return;
    }
    
    gameState.playerData.name = playerName;
    gameState.isHost = true;
    
    const roomCode = generateRoomCode();
    gameState.currentRoom = roomCode;
    
    const roomData = {
        name: roomName,
        code: roomCode,
        host: playerName,
        players: {
            [playerName]: gameState.playerData
        },
        settings: {
            maxPlayers: 4,
            startingCards: 7,
            stackingEnabled: true,
            jumpInEnabled: false
        },
        gameStarted: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('rooms/' + roomCode).set(roomData)
        .then(() => {
            setupLobby();
            showScreen('game-lobby');
        })
        .catch(error => {
            console.error('Error creating room:', error);
            alert('Error creating room. Please try again.');
        });
}

function joinRoom() {
    const playerName = document.getElementById('join-player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if (!playerName || !roomCode) {
        alert('Please fill in all required fields');
        return;
    }
    
    gameState.playerData.name = playerName;
    gameState.currentRoom = roomCode;
    
    database.ref('rooms/' + roomCode).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                const playerCount = Object.keys(roomData.players || {}).length;
                
                if (playerCount >= roomData.settings.maxPlayers) {
                    alert('Room is full!');
                    return;
                }
                
                if (roomData.players && roomData.players[playerName]) {
                    alert('Player name already taken in this room!');
                    return;
                }
                
                // Add player to room
                database.ref('rooms/' + roomCode + '/players/' + playerName).set(gameState.playerData)
                    .then(() => {
                        setupLobby();
                        showScreen('game-lobby');
                    });
            } else {
                alert('Room not found!');
            }
        })
        .catch(error => {
            console.error('Error joining room:', error);
            alert('Error joining room. Please try again.');
        });
}

function setupLobby() {
    const roomCode = gameState.currentRoom;
    document.getElementById('lobby-room-code').textContent = roomCode;
    
    // Listen for room updates
    database.ref('rooms/' + roomCode).on('value', snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            document.getElementById('lobby-room-name').textContent = roomData.name;
            
            // Update players list
            const playersList = document.getElementById('players-list');
            playersList.innerHTML = '';
            
            Object.entries(roomData.players || {}).forEach(([name, data]) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-item';
                playerDiv.innerHTML = `
                    <div class="player-avatar" style="background-color: ${data.color}">
                        ${data.avatar ? `<img src="${data.avatar}" alt="${name}" style="width: 40px; height: 40px; border-radius: 50%;">` : ''}
                    </div>
                    <span>${name}</span>
                    ${name === roomData.host ? '<span class="host-badge">HOST</span>' : ''}
                `;
                playersList.appendChild(playerDiv);
            });
            
            // Show/hide settings based on host status
            const settingsSection = document.getElementById('lobby-settings');
            if (gameState.isHost) {
                settingsSection.style.display = 'block';
            } else {
                settingsSection.style.display = 'none';
            }
        }
    });
}

function leaveRoom() {
    if (gameState.currentRoom && gameState.playerData.name) {
        database.ref('rooms/' + gameState.currentRoom + '/players/' + gameState.playerData.name).remove();
        
        // If host leaves, delete the room
        if (gameState.isHost) {
            database.ref('rooms/' + gameState.currentRoom).remove();
        }
        
        gameState.currentRoom = null;
        gameState.isHost = false;
        showScreen('main-menu');
    }
}

function copyRoomCode() {
    const roomCode = gameState.currentRoom;
    navigator.clipboard.writeText(roomCode).then(() => {
        alert('Room code copied to clipboard!');
    });
}

// Three.js setup for 3D game
function initGame3D() {
    const canvas = document.getElementById('game-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Add some basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // Create a simple table
    const tableGeometry = new THREE.CylinderGeometry(3, 3, 0.1, 32);
    const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    scene.add(table);
    
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);
    
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    
    animate();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    document.getElementById('create-room-btn').addEventListener('click', () => showScreen('create-room'));
    document.getElementById('join-room-btn').addEventListener('click', () => showScreen('join-room'));
    document.getElementById('back-from-create-btn').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('back-from-join-btn').addEventListener('click', () => showScreen('main-menu'));
    
    // Room actions
    document.getElementById('create-room-confirm-btn').addEventListener('click', createRoom);
    document.getElementById('join-room-confirm-btn').addEventListener('click', joinRoom);
    document.getElementById('leave-room-btn').addEventListener('click', leaveRoom);
    document.getElementById('copy-code-btn').addEventListener('click', copyRoomCode);
    
    // Giphy search
    document.getElementById('search-giphy-btn').addEventListener('click', () => {
        const query = document.getElementById('giphy-search').value;
        searchGiphy(query, document.getElementById('giphy-results'));
    });
    
    document.getElementById('join-search-giphy-btn').addEventListener('click', () => {
        const query = document.getElementById('join-giphy-search').value;
        searchGiphy(query, document.getElementById('join-giphy-results'));
    });
    
    // Setup color pickers
    setupColorPickers();
    
    // Game start
    document.getElementById('start-game-btn').addEventListener('click', () => {
        if (gameState.isHost) {
            showScreen('game-screen');
            initGame3D();
        }
    });
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (gameState.currentRoom && gameState.playerData.name) {
        database.ref('rooms/' + gameState.currentRoom + '/players/' + gameState.playerData.name).remove();
    }
});
