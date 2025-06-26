// UNO Card Deck System
class UnoCard {
    constructor(color, value, type = 'number') {
        this.color = color;
        this.value = value;
        this.type = type; // 'number', 'action', 'wild'
        this.playable = false;
        this.id = `${color}_${value}_${Date.now()}_${Math.random()}`;
    }

    // Check if this card can be played on top of another card
    canPlayOn(topCard) {
        // Wild cards can always be played
        if (this.type === 'wild') {
            return true;
        }
        
        // Same color or same value
        if (this.color === topCard.color || this.value === topCard.value) {
            return true;
        }
        
        // Wild cards on top can be played on with matching chosen color
        if (topCard.type === 'wild' && topCard.chosenColor && this.color === topCard.chosenColor) {
            return true;
        }
        
        return false;
    }

    // Get the card's display name
    getDisplayName() {
        if (this.type === 'wild') {
            return this.value === 'wild' ? 'Wild' : 'Wild Draw Four';
        }
        return `${this.color} ${this.value}`;
    }

    // Get card score for end-game calculation
    getScore() {
        if (this.type === 'wild') {
            return 50;
        }
        if (this.type === 'action') {
            return 20;
        }
        return parseInt(this.value) || 0;
    }
}

class UnoCardDeck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this.generateDeck();
        this.shuffle();
    }

    // Generate a complete UNO deck
    generateDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const actionCards = ['skip', 'reverse', 'draw_two'];
        
        this.cards = [];
        
        // Number cards (0 has 1 card per color, 1-9 have 2 cards per color)
        colors.forEach(color => {
            // Single 0 card
            this.cards.push(new UnoCard(color, '0', 'number'));
            
            // Double 1-9 cards
            for (let i = 1; i <= 9; i++) {
                this.cards.push(new UnoCard(color, i.toString(), 'number'));
                this.cards.push(new UnoCard(color, i.toString(), 'number'));
            }
            
            // Action cards (2 of each per color)
            actionCards.forEach(action => {
                this.cards.push(new UnoCard(color, action, 'action'));
                this.cards.push(new UnoCard(color, action, 'action'));
            });
        });
        
        // Wild cards (4 wild, 4 wild draw four)
        for (let i = 0; i < 4; i++) {
            this.cards.push(new UnoCard('wild', 'wild', 'wild'));
            this.cards.push(new UnoCard('wild', 'wild_draw_four', 'wild'));
        }
    }

    // Shuffle the deck using Fisher-Yates algorithm
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // Draw a card from the deck
    drawCard() {
        if (this.cards.length === 0) {
            this.reshuffleFromDiscard();
        }
        return this.cards.pop();
    }

    // Draw multiple cards
    drawCards(count) {
        const drawnCards = [];
        for (let i = 0; i < count; i++) {
            const card = this.drawCard();
            if (card) {
                drawnCards.push(card);
            }
        }
        return drawnCards;
    }

    // Add card to discard pile
    discardCard(card) {
        this.discardPile.push(card);
    }

    // Get the top card of the discard pile
    getTopCard() {
        return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
    }

    // Reshuffle discard pile back into deck (keeping top card)
    reshuffleFromDiscard() {
        if (this.discardPile.length <= 1) {
            console.warn('Not enough cards to reshuffle!');
            return;
        }
        
        // Keep the top card in discard pile
        const topCard = this.discardPile.pop();
        
        // Move all other cards back to deck
        this.cards = [...this.discardPile];
        this.discardPile = [topCard];
        
        // Reset wild card chosen colors
        this.cards.forEach(card => {
            if (card.type === 'wild') {
                delete card.chosenColor;
            }
        });
        
        this.shuffle();
        console.log('Deck reshuffled from discard pile');
    }

    // Get remaining cards count
    getRemainingCount() {
        return this.cards.length;
    }

    // Initialize game with starting card
    initializeGame() {
        // Draw cards until we get a valid starting card (not wild or action)
        let startingCard;
        do {
            startingCard = this.drawCard();
            if (!startingCard) {
                this.generateDeck();
                this.shuffle();
                startingCard = this.drawCard();
            }
        } while (startingCard.type !== 'number');
        
        this.discardCard(startingCard);
        return startingCard;
    }
}

// UNO Game Logic Manager
class UnoGameLogic {
    constructor(playerCount = 4, startingCards = 7) {
        this.deck = new UnoCardDeck();
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
        this.gameState = 'waiting'; // 'waiting', 'playing', 'finished'
        this.drawCount = 0; // For stacking draw cards
        this.lastPlayedCard = null;
        this.winner = null;
        this.settings = {
            stackingEnabled: true,
            jumpInEnabled: false,
            startingCards: startingCards
        };
        
        this.initializePlayers(playerCount);
        this.startGame();
    }

    // Initialize players with starting hands
    initializePlayers(playerCount) {
        this.players = [];
        for (let i = 0; i < playerCount; i++) {
            this.players.push({
                id: i,
                name: `Player ${i + 1}`,
                hand: [],
                hasCalledUno: false,
                score: 0
            });
        }
    }

    // Start the game
    startGame() {
        // Deal starting cards to each player
        this.players.forEach(player => {
            player.hand = this.deck.drawCards(this.settings.startingCards);
        });
        
        // Initialize with starting card
        this.lastPlayedCard = this.deck.initializeGame();
        this.gameState = 'playing';
        
        this.updatePlayableCards();
        console.log('Game started!', this.getGameState());
    }

    // Get current game state
    getGameState() {
        return {
            currentPlayer: this.getCurrentPlayer(),
            topCard: this.lastPlayedCard,
            direction: this.direction,
            drawCount: this.drawCount,
            remainingCards: this.deck.getRemainingCount(),
            players: this.players.map(player => ({
                ...player,
                handSize: player.hand.length,
                hand: player.hand // In real game, only send hand to the specific player
            })),
            gameState: this.gameState,
            winner: this.winner
        };
    }

    // Get current player
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // Update which cards are playable for current player
    updatePlayableCards() {
        const currentPlayer = this.getCurrentPlayer();
        const topCard = this.lastPlayedCard;
        
        currentPlayer.hand.forEach(card => {
            card.playable = this.canPlayCard(card, topCard);
        });
    }

    // Check if a card can be played
    canPlayCard(card, topCard) {
        // If there's a draw penalty, only draw cards or matching draw cards can be played
        if (this.drawCount > 0 && this.settings.stackingEnabled) {
            if (card.value === 'draw_two' && topCard.value === 'draw_two') {
                return true;
            }
            if (card.value === 'wild_draw_four' && topCard.value === 'wild_draw_four') {
                return true;
            }
            return false;
        }
        
        return card.canPlayOn(topCard);
    }

    // Play a card
    playCard(playerId, cardId, chosenColor = null) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || playerId !== this.currentPlayerIndex) {
            return { success: false, message: 'Not your turn!' };
        }

        const cardIndex = player.hand.findIndex(card => card.id === cardId);
        if (cardIndex === -1) {
            return { success: false, message: 'Card not found!' };
        }

        const card = player.hand[cardIndex];
        if (!card.playable) {
            return { success: false, message: 'Card cannot be played!' };
        }

        // Remove card from player's hand
        player.hand.splice(cardIndex, 1);
        
        // Handle wild cards
        if (card.type === 'wild' && chosenColor) {
            card.chosenColor = chosenColor;
        }

        // Add to discard pile
        this.deck.discardCard(card);
        this.lastPlayedCard = card;

        // Handle special card effects
        this.handleCardEffect(card);

        // Check for UNO call
        if (player.hand.length === 1 && !player.hasCalledUno) {
            // Player should call UNO (implement penalty later)
            console.log(`${player.name} should call UNO!`);
        }

        // Check for win condition
        if (player.hand.length === 0) {
            this.gameState = 'finished';
            this.winner = player;
            return { success: true, message: `${player.name} wins!`, winner: player };
        }

        // Move to next player
        this.nextPlayer();
        this.updatePlayableCards();

        return { success: true, message: 'Card played successfully!' };
    }

    // Handle special card effects
    handleCardEffect(card) {
        switch (card.value) {
            case 'skip':
                this.nextPlayer(); // Skip next player
                break;
            case 'reverse':
                this.direction *= -1; // Reverse direction
                if (this.players.length === 2) {
                    this.nextPlayer(); // In 2-player game, reverse acts like skip
                }
                break;
            case 'draw_two':
                if (this.settings.stackingEnabled) {
                    this.drawCount += 2;
                } else {
                    this.nextPlayer();
                    this.forceDraw(2);
                }
                break;
            case 'wild_draw_four':
                if (this.settings.stackingEnabled) {
                    this.drawCount += 4;
                } else {
                    this.nextPlayer();
                    this.forceDraw(4);
                }
                break;
        }
    }

    // Force current player to draw cards
    forceDraw(count) {
        const player = this.getCurrentPlayer();
        const drawnCards = this.deck.drawCards(count);
        player.hand.push(...drawnCards);
        this.nextPlayer(); // Skip their turn
    }

    // Player draws a card
    drawCard(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || playerId !== this.currentPlayerIndex) {
            return { success: false, message: 'Not your turn!' };
        }

        if (this.drawCount > 0) {
            // Handle draw penalty
            const drawnCards = this.deck.drawCards(this.drawCount);
            player.hand.push(...drawnCards);
            this.drawCount = 0;
            this.nextPlayer();
            this.updatePlayableCards();
            return { success: true, message: `Drew ${drawnCards.length} cards due to penalty` };
        }

        // Normal draw
        const drawnCard = this.deck.drawCard();
        if (drawnCard) {
            player.hand.push(drawnCard);
            
            // Check if drawn card is playable
            if (this.canPlayCard(drawnCard, this.lastPlayedCard)) {
                drawnCard.playable = true;
                return { success: true, message: 'Card drawn - you can play it!', canPlay: true };
            } else {
                this.nextPlayer();
                this.updatePlayableCards();
                return { success: true, message: 'Card drawn - turn skipped', canPlay: false };
            }
        }
        
        return { success: false, message: 'No cards left to draw!' };
    }

    // Move to next player
    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
    }

    // Call UNO
    callUno(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (player.hand.length === 1) {
            player.hasCalledUno = true;
            return { success: true, message: 'UNO called!' };
        }

        return { success: false, message: 'You must have exactly 1 card to call UNO!' };
    }

    // Challenge last wild draw four (if applicable)
    challengeWildDrawFour(playerId) {
        // Implementation for challenging wild draw four cards
        // This is a complex rule that requires checking if the previous player
        // could have played a different card
        return { success: false, message: 'Challenge not implemented yet' };
    }

    // Calculate final scores
    calculateScores() {
        if (this.gameState !== 'finished' || !this.winner) {
            return null;
        }

        const scores = {};
        this.players.forEach(player => {
            if (player.id === this.winner.id) {
                scores[player.id] = 0;
            } else {
                scores[player.id] = player.hand.reduce((sum, card) => sum + card.getScore(), 0);
            }
        });

        return scores;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UnoCard, UnoCardDeck, UnoGameLogic };
}
