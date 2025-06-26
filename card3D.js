// 3D Card Renderer for UNO Game
class Card3D {
    constructor(unoCard, scene) {
        this.unoCard = unoCard;
        this.scene = scene;
        this.mesh = null;
        this.group = new THREE.Group();
        this.isHovered = false;
        this.isSelected = false;
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Euler();
        
        this.createCard();
        this.scene.add(this.group);
    }

    createCard() {
        // Card dimensions (much larger for better visibility)
        const cardWidth = 1.5;
        const cardHeight = 2.2;
        const cardThickness = 0.05;

        // Create card geometry
        const geometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);
        
        // Create materials for front and back
        const materials = [
            this.createSideMaterial(), // right
            this.createSideMaterial(), // left
            this.createSideMaterial(), // top
            this.createSideMaterial(), // bottom
            this.createFrontMaterial(), // front
            this.createBackMaterial()  // back
        ];

        this.mesh = new THREE.Mesh(geometry, materials);
        this.group.add(this.mesh);

        // Add selection outline (initially hidden)
        this.createSelectionOutline(cardWidth, cardHeight, cardThickness);
    }

    createFrontMaterial() {
        // Use real UNO card assets
        const imagePath = this.getCardImagePath();
        const texture = new THREE.TextureLoader().load(imagePath);
        
        const material = new THREE.MeshLambertMaterial({ map: texture });
        
        // Add playable indicator overlay if needed
        if (this.unoCard.playable) {
            // Create a glowing overlay for playable cards
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 384;
            
            // Semi-transparent green overlay
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Green border
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 8;
            ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
            
            const overlayTexture = new THREE.CanvasTexture(canvas);
            
            // Combine original texture with overlay
            return [
                new THREE.MeshLambertMaterial({ map: texture }),
                new THREE.MeshLambertMaterial({ map: overlayTexture, transparent: true })
            ];
        }
        
        return material;
    }

    createBackMaterial() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 384;

        // UNO back design
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FF0000');
        gradient.addColorStop(0.5, '#FFFF00');
        gradient.addColorStop(1, '#0000FF');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // UNO logo
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('UNO', canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.MeshLambertMaterial({ map: texture });
    }

    createSideMaterial() {
        return new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
    }

    getCardBackgroundColor() {
        const colorMap = {
            'red': '#FF6B6B',
            'blue': '#4ECDC4',
            'green': '#96CEB4',
            'yellow': '#FFEAA7',
            'wild': '#2C2C2C'
        };
        return colorMap[this.unoCard.color] || '#FFFFFF';
    }

    drawCardContent(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (this.unoCard.type === 'number') {
            // Draw number
            ctx.font = 'bold 72px Arial';
            ctx.fillText(this.unoCard.value, centerX, centerY);
            
            // Draw smaller numbers in corners
            ctx.font = 'bold 24px Arial';
            ctx.fillText(this.unoCard.value, 30, 30);
            ctx.save();
            ctx.translate(width - 30, height - 30);
            ctx.rotate(Math.PI);
            ctx.fillText(this.unoCard.value, 0, 0);
            ctx.restore();
        } else if (this.unoCard.type === 'action') {
            // Draw action symbol
            ctx.font = 'bold 36px Arial';
            const actionText = this.getActionText();
            ctx.fillText(actionText, centerX, centerY);
        } else if (this.unoCard.type === 'wild') {
            // Draw wild card design
            ctx.font = 'bold 32px Arial';
            if (this.unoCard.value === 'wild') {
                ctx.fillText('WILD', centerX, centerY);
            } else {
                ctx.fillText('WILD', centerX, centerY - 20);
                ctx.fillText('+4', centerX, centerY + 20);
            }
        }

        // Add playable indicator
        if (this.unoCard.playable) {
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 6;
            ctx.strokeRect(10, 10, width - 20, height - 20);
        }
    }

    getActionText() {
        const actionMap = {
            'skip': 'SKIP',
            'reverse': '⟲',
            'draw_two': '+2'
        };
        return actionMap[this.unoCard.value] || this.unoCard.value.toUpperCase();
    }
    
    getCardImagePath() {
        const card = this.unoCard;
        
        // Handle special case for card back
        if (card.type === 'back') {
            return 'assets/cards/card back/card_back.png';
        }
        
        // Map UNO card values to file names
        let fileName;
        
        if (card.type === 'wild') {
            if (card.value === 'wild') {
                fileName = 'wild_card.png';
            } else if (card.value === 'wild_draw_four') {
                fileName = '4_plus.png';
            }
            return `assets/cards/wild/${fileName}`;
        }
        
        // For colored cards
        const color = card.color;
        
        if (card.type === 'number') {
            fileName = `${card.value}_${color}.png`;
        } else if (card.type === 'action') {
            // Map action values to file names
            const actionMap = {
                'skip': 'block',
                'reverse': 'inverse', 
                'draw_two': '2plus'
            };
            const actionName = actionMap[card.value] || card.value;
            fileName = `${actionName}_${color}.png`;
        }
        
        return `assets/cards/${color}/${fileName}`;
    }

    createSelectionOutline(width, height, thickness) {
        const outlineGeometry = new THREE.BoxGeometry(
            width + 0.05, 
            height + 0.05, 
            thickness + 0.05
        );
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.3,
            visible: false
        });
        this.outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        this.group.add(this.outline);
    }

    setPosition(x, y, z) {
        this.targetPosition.set(x, y, z);
        this.animateToTarget();
    }

    setRotation(x, y, z) {
        this.targetRotation.set(x, y, z);
        this.animateToTarget();
    }

    animateToTarget() {
        const animate = () => {
            this.group.position.lerp(this.targetPosition, 0.1);
            this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, this.targetRotation.x, 0.1);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetRotation.y, 0.1);
            this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, this.targetRotation.z, 0.1);

            if (this.group.position.distanceTo(this.targetPosition) > 0.01) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    setHovered(hovered) {
        this.isHovered = hovered;
        if (hovered) {
            this.group.position.y += 0.1;
        } else {
            this.group.position.y -= 0.1;
        }
    }

    setSelected(selected) {
        this.isSelected = selected;
        this.outline.material.visible = selected;
    }

    updatePlayableState() {
        // Recreate front material with updated playable state
        this.mesh.material[4] = this.createFrontMaterial();
    }

    dispose() {
        this.scene.remove(this.group);
        this.mesh.geometry.dispose();
        this.mesh.material.forEach(material => {
            if (material.map) material.map.dispose();
            material.dispose();
        });
    }
}

class GameTable3D {
    constructor(scene) {
        this.scene = scene;
        this.cards = new Map();
        this.playerHands = [];
        this.discardPile = [];
        this.deckPosition = new THREE.Vector3(-2, 0.1, 0);
        this.discardPosition = new THREE.Vector3(2, 0.1, 0);
        
        this.createTable();
        this.setupPlayerPositions();
    }

    createTable() {
        // Create table
        const tableGeometry = new THREE.CylinderGeometry(4, 4, 0.2, 32);
        const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        this.table = new THREE.Mesh(tableGeometry, tableMaterial);
        this.table.position.y = -0.1;
        this.scene.add(this.table);

        // Create deck placeholder (matching new card size)
        const deckGeometry = new THREE.BoxGeometry(1.5, 0.05, 2.2);
        const deckMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        this.deckPlaceholder = new THREE.Mesh(deckGeometry, deckMaterial);
        this.deckPlaceholder.position.copy(this.deckPosition);
        this.scene.add(this.deckPlaceholder);

        // Create discard pile placeholder
        this.discardPlaceholder = new THREE.Mesh(deckGeometry, deckMaterial);
        this.discardPlaceholder.position.copy(this.discardPosition);
        this.scene.add(this.discardPlaceholder);
    }

    setupPlayerPositions() {
        // Define positions for up to 8 players around the table
        // Using a circular arrangement around the table
        const tableRadius = 3.5;
        this.playerPositions = [];
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 4) * Math.PI; // Spread players around circle
            const x = Math.sin(angle) * tableRadius;
            const z = Math.cos(angle) * tableRadius;
            
            this.playerPositions.push({
                x: x,
                z: z,
                rotation: angle + Math.PI // Face toward center
            });
        }
        
        // Override for better 4-player layout
        this.playerPositions[0] = { x: 0, z: 3.5, rotation: 0 };        // Bottom (You)
        this.playerPositions[1] = { x: -3.5, z: 0, rotation: Math.PI/2 }; // Left
        this.playerPositions[2] = { x: 0, z: -3.5, rotation: Math.PI };   // Top
        this.playerPositions[3] = { x: 3.5, z: 0, rotation: -Math.PI/2 }; // Right
    }

    addCard(unoCard) {
        const card3D = new Card3D(unoCard, this.scene);
        this.cards.set(unoCard.id, card3D);
        return card3D;
    }

    removeCard(cardId) {
        const card3D = this.cards.get(cardId);
        if (card3D) {
            card3D.dispose();
            this.cards.delete(cardId);
        }
    }

    updatePlayerHand(playerId, hand, isCurrentPlayer = false) {
        // No longer display 3D cards for player hands
        // All hands are shown in 2D UI at bottom of screen
        // This method is now a no-op since we removed 3D hand visualization
        return;
    }

    updateDiscardPile(topCard) {
        // Remove old discard pile visualization
        this.discardPile.forEach(card3D => card3D.dispose());
        this.discardPile = [];

        if (topCard) {
            const card3D = this.addCard(topCard);
            card3D.setPosition(this.discardPosition.x, this.discardPosition.y + 0.03, this.discardPosition.z);
            card3D.setRotation(Math.PI / 2, Math.random() * 0.5 - 0.25, 0); // Lay flat with slight random rotation
            this.discardPile.push(card3D);
        }
    }

    highlightPlayableCards(hand) {
        hand.forEach(unoCard => {
            const card3D = this.cards.get(unoCard.id);
            if (card3D && unoCard.playable) {
                card3D.setSelected(true);
            }
        });
    }

    clearHighlights() {
        this.cards.forEach(card3D => {
            card3D.setSelected(false);
        });
    }

    // Animate a card being played to the discard pile
    animateCardPlay(unoCard, callback) {
        const card3D = this.addCard(unoCard);
        
        // Start card off-screen (bottom of screen)
        card3D.setPosition(0, -2, 5);
        card3D.setRotation(-Math.PI / 2, 0, 0);
        
        // Animate to discard pile
        setTimeout(() => {
            card3D.setPosition(this.discardPosition.x, this.discardPosition.y + 0.1, this.discardPosition.z);
            card3D.setRotation(-Math.PI / 2, Math.random() * 0.5 - 0.25, 0);
            
            setTimeout(() => {
                if (callback) callback();
            }, 800);
        }, 100);
        
        return card3D;
    }
    
    // Animate a card being drawn from the deck
    animateCardDraw(callback) {
        // Create a face-down card for the animation
        const tempCard = { id: 'temp-draw', color: 'wild', value: 'back', type: 'back' };
        const card3D = this.addCard(tempCard);
        
        // Start at deck position
        card3D.setPosition(this.deckPosition.x, this.deckPosition.y + 0.1, this.deckPosition.z);
        card3D.setRotation(-Math.PI / 2, 0, 0);
        
        // Animate off-screen (toward bottom)
        setTimeout(() => {
            card3D.setPosition(0, -2, 5);
            
            setTimeout(() => {
                card3D.dispose();
                this.cards.delete('temp-draw');
                if (callback) callback();
            }, 800);
        }, 100);
    }

    getCardAtPosition(position, camera) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(position, camera);

        const cardMeshes = Array.from(this.cards.values()).map(card3D => card3D.mesh);
        const intersects = raycaster.intersectObjects(cardMeshes);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            for (const [cardId, card3D] of this.cards.entries()) {
                if (card3D.mesh === intersectedMesh) {
                    return cardId;
                }
            }
        }
        return null;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Card3D, GameTable3D };
}
