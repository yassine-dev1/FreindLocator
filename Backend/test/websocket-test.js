// backend/test/websocket-test.js
const io = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000/location';

async function testWebSocket() {
  console.log('🧪 Test WebSocket Friend Locato\n');

  // 1. Créer deux utilisateurs
  console.log('1. Création des utilisateurs...');
  
  const user1 = await axios.post(`${API_URL}/auth/register`, {
    email: 'alice@test.com',
    password: 'Test123!',
    name: 'Alice',
  });
  const token1 = user1.data.data.access_token;
  const userId1 = user1.data.data.user.id;
  console.log(`   ✅ Alice créée (ID: ${userId1})`);

  const user2 = await axios.post(`${API_URL}/auth/register`, {
    email: 'bob@test.com',
    password: 'Test123!',
    name: 'Bob',
  });
  const token2 = user2.data.data.access_token;
  const userId2 = user2.data.data.user.id;
  console.log(`   ✅ Bob créé (ID: ${userId2})`);

  // 2. Envoyer une demande d'ami
  console.log('\n2. Envoi de demande d\'ami...');
  await axios.post(`${API_URL}/friends/request`, 
    { email: 'bob@test.com' },
    { headers: { Authorization: `Bearer ${token1}` } }
  );
  console.log('   ✅ Demande envoyée de Alice vers Bob');

  // 3. Accepter la demande
  const requests = await axios.get(`${API_URL}/friends/requests/pending`, {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const requestId = requests.data.data[0].id;
  
  await axios.post(`${API_URL}/friends/requests/${requestId}/accept`, {}, {
    headers: { Authorization: `Bearer ${token2}` }
  });
  console.log('   ✅ Demande acceptée');

  // 4. Connexion WebSocket
  console.log('\n3. Connexion WebSocket...');
  
  const socket1 = io(SOCKET_URL, {
    auth: { token: `Bearer ${token1}` },
    transports: ['websocket'],
  });

  const socket2 = io(SOCKET_URL, {
    auth: { token: `Bearer ${token2}` },
    transports: ['websocket'],
  });

  socket1.on('connect', () => {
    console.log('   ✅ Alice connectée');
  });

  socket2.on('connect', () => {
    console.log('   ✅ Bob connecté');
  });

  // 5. Écouter les événements
  socket1.on('friendLocationUpdate', (data) => {
    console.log(`   📍 Alice reçoit position de Bob: (${data.latitude}, ${data.longitude})`);
  });

  socket2.on('friendLocationUpdate', (data) => {
    console.log(`   📍 Bob reçoit position de Alice: (${data.latitude}, ${data.longitude})`);
  });

  socket1.on('friendStatusChanged', (data) => {
    console.log(`   👤 ${data.name} est ${data.isOnline ? 'en ligne' : 'hors ligne'}`);
  });

  // 6. Mettre à jour les positions
  setTimeout(() => {
    console.log('\n4. Mise à jour des positions...');
    
    socket1.emit('updateLocation', {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10,
    });
    
    setTimeout(() => {
      socket2.emit('updateLocation', {
        latitude: 48.8584,
        longitude: 2.2945,
        accuracy: 15,
      });
    }, 2000);
  }, 2000);

  // 7. Nettoyage
  setTimeout(() => {
    console.log('\n5. Déconnexion...');
    socket1.disconnect();
    socket2.disconnect();
    console.log('✅ Test terminé');
    process.exit(0);
  }, 10000);
}

testWebSocket().catch(console.error);