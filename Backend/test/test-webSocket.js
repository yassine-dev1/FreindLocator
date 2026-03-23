// test-ws.js
const io = require('socket.io-client');
const axios = require('axios');

async function testWebSocket() {
  try {
    // 1. Login pour obtenir le token
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'Test123!'
    });
    
    const token = loginRes.data.data.access_token;
    const userId = loginRes.data.data.user.id;
    console.log('✅ Utilisateur connecté:', userId);
    
    // 2. Connexion WebSocket
    const socket = io('http://localhost:3000/location', {
      transports: ['websocket'],
      auth: {
        token: `Bearer ${token}`
      }
    });
    
    socket.on('connect', () => {
      console.log('✅ Connecté au WebSocket!');
      
      // Envoyer une mise à jour de position
      console.log('📍 Envoi de la position...');
      socket.emit('updateLocation', {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
        speed: 0
      });
    });
    
    socket.on('connected', (data) => {
      console.log('📡 Réponse du serveur:', data);
    });
    
    socket.on('friendLocationUpdate', (data) => {
      console.log('👥 Position d\'un ami reçue:', data);
    });
    
    socket.on('friendsLocations', (data) => {
      console.log('📍 Liste des positions des amis:', data);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Erreur WebSocket:', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Déconnecté:', reason);
    });
    
    // 2 secondes après l'envoi, demander les positions des amis
    setTimeout(() => {
      console.log('📡 Demande des positions des amis...');
      socket.emit('getFriendsLocations');
    }, 2000);
    
    // 5 secondes après, arrêter le partage
    setTimeout(() => {
      console.log('🛑 Arrêt du partage...');
      socket.emit('stopSharing');
    }, 5000);
    
    // 7 secondes après, redémarrer le partage
    setTimeout(() => {
      console.log('▶️ Redémarrage du partage...');
      socket.emit('startSharing', { sharingMode: 'friends_only' });
    }, 7000);
    
    // 10 secondes après, envoyer une nouvelle position
    setTimeout(() => {
      console.log('📍 Envoi d\'une nouvelle position...');
      socket.emit('updateLocation', {
        latitude: 48.8584,
        longitude: 2.2945,
        accuracy: 15,
        speed: 5.2
      });
    }, 10000);
    
    // 15 secondes après, se déconnecter
    setTimeout(() => {
      console.log('🔌 Déconnexion...');
      socket.disconnect();
      process.exit(0);
    }, 15000);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

testWebSocket();