// Multiplayer Game Manager for UNO
class MultiplayerGameManager {
    constructor(database, roomCode, playerName) {
        this.database = database;
        this.roomCode = roomCode;
        this.playerName = playerName;
        this.gameRef = database.ref(`games/${roomCode}`);
        this.playerId = null;
        this.listeners = [];
        this.isHost = false;
        
        this.setupGameListeners();
    }
    
    // Initialize a new multiplayer game
    async initializeGame(roomData) {
        const playerNames = Object.keys(roomData.players);
        this.isHost = roomData.host === this.playerName;
        this.playerId = playerNames.indexOf(this.playerName);
        
        if (this.isHost) {
            // Host creates the game state
            console.log('Host initializing game...');
            
            // Create game logic instance
            const gameLogic = new UnoGameLogic(playerNames.length, roomData.settings.startingCards);
            gameLogic.settings.stackingEnabled = roomData.settings.stackingEnabled;
            gameLogic.settings.jumpInEnabled = roomData.settings.jumpInEnabled;
            
            // Set player names
            gameLogic.players.forEach((player, index) => {
                if (playerNames[index]) {
                    player.name = playerNames[index];
                }
            });
            
            // Convert game state to Firebase-friendly format
            const gameState = this.serializeGameState(gameLogic);
            
            // Save to Firebase
            await this.gameRef.set({
                ...gameState,
                roomCode: this.roomCode,
                playerOrder: playerNames,
                createdAt: this.database.ServerValue.TIMESTAMP,
                lastAction: {
                    type: 'game_started',
                    timestamp: this.database.ServerValue.TIMESTAMP,
                    player: this.playerName
                }
            });
            
            console.log('Game initialized and saved to Firebase');
        } else {
            console.log('Waiting for host to initialize game...');
        }
    }
    
    // Setup Firebase listeners for real-time updates
    setupGameListeners() {
        // Listen for game state changes
        const gameListener = this.gameRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                this.handleGameStateUpdate(gameData);
            }
        });
        
        this.listeners.push(() => this.gameRef.off('value', gameListener));
        
        // Listen for player actions
        const actionsListener = this.gameRef.child('lastAction').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const action = snapshot.val();
                this.handlePlayerAction(action);
            }
        });
        
        this.listeners.push(() => this.gameRef.child('lastAction').off('value', actionsListener));
    }
    
    // Handle game state updates from Firebase
    handleGameStateUpdate(gameData) {
        if (!gameData) return;
        
        // Reconstruct game logic from Firebase data
        const gameLogic = this.deserializeGameState(gameData);
        
        // Update UI
        this.updateUI(gameLogic, gameData);
        
        // Store current game state globally
        window.currentGame = gameLogic;
        window.currentPlayerId = this.playerId;
    }
    
    // Handle player actions
    handlePlayerAction(action) {
        if (!action || action.player === this.playerName) return;
        
        console.log('Player action received:', action);
        
        // Show notifications for other players' actions
        switch (action.type) {
            case 'card_played':
                this.showNotification(`${action.player} played a ${action.cardDescription}`);
                break;
            case 'card_drawn':
                this.showNotification(`${action.player} drew a card`);
                break;
            case 'uno_called':
                this.showNotification(`${action.player} called UNO!`);
                break;
            case 'game_won':
                this.showNotification(`🎉 ${action.player} wins the game!`);
                break;
        }
    }
    
    // Play a card (multiplayer version)
    async playCard(cardId, chosenColor = null) {
        if (!window.currentGame) return { success: false, message: 'Game not loaded' };
        
        const currentPlayer = window.currentGame.getCurrentPlayer();
        if (currentPlayer.id !== this.playerId) {
            return { success: false, message: 'Not your turn!' };
        }
        
        const card = currentPlayer.hand.find(c => c.id === cardId);
        if (!card || !card.playable) {
            return { success: false, message: 'Cannot play this card!' };
        }
        
        // Play the card locally first
        const result = window.currentGame.playCard(this.playerId, cardId, chosenColor);
        
        if (result.success) {
            // Update Firebase with new game state
            const gameState = this.serializeGameState(window.currentGame);
            
            const updates = {
                ...gameState,
                lastAction: {
                    type: result.winner ? 'game_won' : 'card_played',
                    player: this.playerName,
                    cardDescription: this.getCardDescription(card, chosenColor),
                    timestamp: this.database.ServerValue.TIMESTAMP,
                    winner: result.winner ? result.winner.name : null
                }
            };
            
            await this.gameRef.update(updates);
            
            // Show local notification
            if (result.winner) {
                this.showNotification(`🎉 You win!`);
            }
        }
        
        return result;
    }
    
    // Draw a card (multiplayer version)
    async drawCard() {
        if (!window.currentGame) return { success: false, message: 'Game not loaded' };
        
        const currentPlayer = window.currentGame.getCurrentPlayer();
        if (currentPlayer.id !== this.playerId) {
            return { success: false, message: 'Not your turn!' };
        }
        
        // Draw the card locally first
        const result = window.currentGame.drawCard(this.playerId);
        
        if (result.success) {
            // Update Firebase with new game state
            const gameState = this.serializeGameState(window.currentGame);
            
            const updates = {
                ...gameState,
                lastAction: {
                    type: 'card_drawn',
                    player: this.playerName,
                    timestamp: this.database.ServerValue.TIMESTAMP
                }
            };
            
            await this.gameRef.update(updates);
        }
        
        return result;
    }
    
    // Call UNO (multiplayer version)
    async callUno() {
        if (!window.currentGame) return { success: false, message: 'Game not loaded' };
        
        const result = window.currentGame.callUno(this.playerId);
        
        if (result.success) {
            // Update Firebase
            const gameState = this.serializeGameState(window.currentGame);
            
            const updates = {
                ...gameState,
                lastAction: {
                    type: 'uno_called',
                    player: this.playerName,
                    timestamp: this.database.ServerValue.TIMESTAMP
                }
            };
            
            await this.gameRef.update(updates);
        }
        
        return result;
    }
    
    // Convert game logic to Firebase-friendly format
    serializeGameState(gameLogic) {
        const gameState = gameLogic.getGameState();
        
        return {
            currentPlayerIndex: gameLogic.currentPlayerIndex,
            direction: gameLogic.direction,
            drawCount: gameLogic.drawCount,
            gameState: gameLogic.gameState,
            remainingCards: gameState.remainingCards,
            topCard: gameState.topCard,
            players: gameState.players.map(player => ({
                id: player.id,
                name: player.name,
                handSize: player.hand.length,
                hand: player.hand, // In production, only send hand to specific player
                hasCalledUno: player.hasCalledUno,
                score: player.score
            })),
            winner: gameLogic.winner
        };
    }
    
    // Reconstruct game logic from Firebase data
    deserializeGameState(gameData) {
        // Create a new game logic instance
        const gameLogic = new UnoGameLogic(gameData.players.length, 7);
        
        // Restore state
        gameLogic.currentPlayerIndex = gameData.currentPlayerIndex;
        gameLogic.direction = gameData.direction;
        gameLogic.drawCount = gameData.drawCount;
        gameLogic.gameState = gameData.gameState;
        gameLogic.lastPlayedCard = gameData.topCard;
        gameLogic.winner = gameData.winner;
        
        // Restore players
        gameLogic.players = gameData.players.map(playerData => ({
            id: playerData.id,
            name: playerData.name,
            hand: playerData.hand || [],
            hasCalledUno: playerData.hasCalledUno,
            score: playerData.score
        }));
        
        // Update deck count (simplified)
        gameLogic.deck.cards = new Array(gameData.remainingCards).fill(null);
        
        return gameLogic;
    }
    
    // Update UI with current game state
    updateUI(gameLogic, gameData) {
        if (!gameLogic) return;
        
        const gameState = gameLogic.getGameState();
        
        // Update game info
        if (document.getElementById('current-player')) {
            document.getElementById('current-player').textContent = 
                gameState.currentPlayer ? gameState.currentPlayer.name : 'Unknown';
        }
        
        if (document.getElementById('deck-count')) {
            document.getElementById('deck-count').textContent = gameState.remainingCards;
        }
        
        if (document.getElementById('top-card')) {
            const topCard = gameState.topCard;
            document.getElementById('top-card').textContent = topCard ? 
                `${topCard.color} ${topCard.value}` : 'None';
        }
        
        // Update discard pile
        if (gameState.topCard && typeof window.updateDiscardPile === 'function') {
            window.updateDiscardPile(gameState.topCard);
        }
        
        // Update hand display for current player
        const myPlayerData = gameState.players[this.playerId];
        if (myPlayerData && typeof window.updateHandDisplay === 'function') {
            window.updateHandDisplay(myPlayerData.hand);
        }
        
        // Update UNO button
        if (document.getElementById('uno-btn')) {
            const unoBtn = document.getElementById('uno-btn');
            if (myPlayerData && myPlayerData.hand.length === 1 && !myPlayerData.hasCalledUno) {
                unoBtn.style.display = 'inline-block';
            } else {
                unoBtn.style.display = 'none';
            }
        }
        
        // Check if it's this player's turn
        const isMyTurn = gameState.currentPlayer && gameState.currentPlayer.id === this.playerId;
        document.body.classList.toggle('my-turn', isMyTurn);
    }
    
    // Get card description for notifications
    getCardDescription(card, chosenColor = null) {
        if (card.type === 'wild') {
            const colorText = chosenColor ? ` (${chosenColor})` : '';
            return card.value === 'wild' ? `Wild${colorText}` : `Wild +4${colorText}`;
        }
        if (card.type === 'action') {
            const actionMap = {
                'skip': 'Skip',
                'reverse': 'Reverse',
                'draw_two': '+2'
            };
            return `${card.color} ${actionMap[card.value] || card.value}`;
        }
        return `${card.color} ${card.value}`;
    }
    
    // Show notification
    showNotification(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message);
        } else {
            console.log('Notification:', message);
        }
    }
    
    // Clean up listeners
    cleanup() {
        this.listeners.forEach(cleanup => cleanup());
        this.listeners = [];
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.MultiplayerGameManager = MultiplayerGameManager;
}
