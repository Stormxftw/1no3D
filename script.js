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

// Game Logic Integration
let currentGame = null;
let currentPlayerId = 0;
let selectedCard = null;
let colorSelectionMode = false;
let gameListener = null;

// 2D Game Setup
function initGame2D() {
    // Setup game state and Firebase listeners
    startUnoGame();
    
    console.log('UNO 2D Multiplayer Game initialized!');
}

// Start UNO game with current room settings
function startUnoGame() {
    if (!gameState.currentRoom) return;
    
    // Get room data to determine player count and settings
    database.ref('rooms/' + gameState.currentRoom).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                const playerCount = Object.keys(roomData.players || {}).length;
                const startingCards = roomData.settings.startingCards || 7;
                
                // Initialize game logic
                currentGame = new UnoGameLogic(playerCount, startingCards);
                currentGame.settings.stackingEnabled = roomData.settings.stackingEnabled;
                currentGame.settings.jumpInEnabled = roomData.settings.jumpInEnabled;
                
                // Set player names from room data
                const playerNames = Object.keys(roomData.players);
                currentGame.players.forEach((player, index) => {
                    if (playerNames[index]) {
                        player.name = playerNames[index];
                    }
                });
                
                // Find current player ID
                currentPlayerId = playerNames.indexOf(gameState.playerData.name);
                
                updateGameUI();
                updateGame3D();
            }
        });
}

// Update 3D game visualization
function updateGame3D() {
    if (!currentGame || !gameTable3D) return;
    
    const gameStateData = currentGame.getGameState();
    
    // Update each player's hand
    gameStateData.players.forEach((player, index) => {
        const isCurrentPlayer = index === currentPlayerId;
        gameTable3D.updatePlayerHand(index, player.hand, isCurrentPlayer);
    });
    
    // Update discard pile
    if (gameStateData.topCard) {
        gameTable3D.updateDiscardPile(gameStateData.topCard);
    }
    
    // Highlight playable cards for current player
    if (gameStateData.currentPlayer && gameStateData.currentPlayer.id === currentPlayerId) {
        gameTable3D.highlightPlayableCards(gameStateData.currentPlayer.hand);
    } else {
        gameTable3D.clearHighlights();
    }
}

// Update game UI elements
function updateGameUI() {
    if (!currentGame) return;
    
    const gameStateData = currentGame.getGameState();
    
    // Update current player display
    document.getElementById('current-player-name').textContent = 
        gameStateData.currentPlayer ? gameStateData.currentPlayer.name : 'Unknown';
    
    // Update deck count
    document.getElementById('deck-count').textContent = gameStateData.remainingCards;
    
    // Update hand cards display (2D fallback)
    updateHandDisplay(gameStateData.players[currentPlayerId]?.hand || []);
    
    // Enable/disable UNO button
    const unoBtn = document.getElementById('uno-btn');
    const currentPlayerData = gameStateData.players[currentPlayerId];
    if (currentPlayerData && currentPlayerData.hand.length === 1 && !currentPlayerData.hasCalledUno) {
        unoBtn.style.display = 'block';
        unoBtn.classList.add('pulse');
    } else {
        unoBtn.style.display = 'none';
        unoBtn.classList.remove('pulse');
    }
}

// Update 2D hand display as fallback
function updateHandDisplay(hand) {
    const handContainer = document.getElementById('hand-cards');
    handContainer.innerHTML = '';
    
    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-2d';
        cardElement.dataset.cardId = card.id;
        cardElement.innerHTML = `
            <div class="card-content" style="background-color: ${getCardColor(card)}">
                <span class="card-value">${getCardDisplayText(card)}</span>
            </div>
        `;
        
        if (card.playable) {
            cardElement.classList.add('playable');
        }
        
        cardElement.addEventListener('click', () => playCard(card.id));
        handContainer.appendChild(cardElement);
    });
}

// Get card color for 2D display
function getCardColor(card) {
    const colorMap = {
        'red': '#FF6B6B',
        'blue': '#4ECDC4',
        'green': '#96CEB4',
        'yellow': '#FFEAA7',
        'wild': '#2C2C2C'
    };
    return colorMap[card.color] || '#FFFFFF';
}

// Get card display text
function getCardDisplayText(card) {
    if (card.type === 'wild') {
        return card.value === 'wild' ? 'WILD' : 'WILD +4';
    }
    if (card.type === 'action') {
        const actionMap = {
            'skip': 'SKIP',
            'reverse': 'REV',
            'draw_two': '+2'
        };
        return actionMap[card.value] || card.value;
    }
    return card.value;
}

// Setup mouse interaction for 3D cards
function setupMouseInteraction(canvas) {
    const mouse = new THREE.Vector2();
    
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (colorSelectionMode) {
            // Handle color selection for wild cards
            handleColorSelection();
        } else {
            // Handle card selection
            const cardId = gameTable3D.getCardAtPosition(mouse, gameCamera);
            if (cardId) {
                playCard(cardId);
            }
        }
    });
    
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Handle card hover effects
        const cardId = gameTable3D.getCardAtPosition(mouse, gameCamera);
        // TODO: Implement hover effects
    });
}

// Play a card
function playCard(cardId) {
    if (!currentGame || colorSelectionMode) return;
    
    const currentPlayer = currentGame.getCurrentPlayer();
    if (currentPlayer.id !== currentPlayerId) {
        alert('Not your turn!');
        return;
    }
    
    const card = currentPlayer.hand.find(c => c.id === cardId);
    if (!card || !card.playable) {
        alert('Cannot play this card!');
        return;
    }
    
    // Check if wild card requires color selection
    if (card.type === 'wild') {
        selectedCard = cardId;
        showColorSelection();
        return;
    }
    
    // Play the card
    const result = currentGame.playCard(currentPlayerId, cardId);
    
    if (result.success) {
        updateGameUI();
        updateGame3D();
        
        if (result.winner) {
            alert(`${result.winner.name} wins the game!`);
            // TODO: Handle game end
        }
    } else {
        alert(result.message);
    }
}

// Show color selection for wild cards
function showColorSelection() {
    colorSelectionMode = true;
    // TODO: Implement color selection UI
    // For now, just pick red as default
    setTimeout(() => {
        playWildCard('red');
    }, 100);
}

// Play wild card with chosen color
function playWildCard(chosenColor) {
    if (!selectedCard) return;
    
    const result = currentGame.playCard(currentPlayerId, selectedCard, chosenColor);
    
    if (result.success) {
        updateGameUI();
        updateGame3D();
        
        if (result.winner) {
            alert(`${result.winner.name} wins the game!`);
        }
    } else {
        alert(result.message);
    }
    
    selectedCard = null;
    colorSelectionMode = false;
}

// Draw a card from deck
function drawCardFromDeck() {
    if (!currentGame) return;
    
    const result = currentGame.drawCard(currentPlayerId);
    
    if (result.success) {
        updateGameUI();
        updateGame3D();
        
        // Show message to player
        if (result.canPlay) {
            alert(result.message);
        }
    } else {
        alert(result.message);
    }
}

// Call UNO
function callUno() {
    if (!currentGame) return;
    
    const result = currentGame.callUno(currentPlayerId);
    alert(result.message);
    
    if (result.success) {
        updateGameUI();
    }
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
            initGame2D();
        }
    });
    
    // Game actions
    document.getElementById('draw-card-btn').addEventListener('click', drawCardFromDeck);
    document.getElementById('uno-btn').addEventListener('click', callUno);
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (gameState.currentRoom && gameState.playerData.name) {
        database.ref('rooms/' + gameState.currentRoom + '/players/' + gameState.playerData.name).remove();
    }
});
