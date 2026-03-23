// test-ws-multi.js
const io = require('socket.io-client');
const axios = require('axios');

async function createUser(email, name) {
  try {
    await axios.post('http://localhost:3000/api/auth/register', {
      email,
      password: 'Test123!',
      name
    }).catch(() => {});
    
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email,
      password: 'Test123!'
    });
    
    return {
      token: loginRes.data.data.access_token,
      userId: loginRes.data.data.user.id,
      name
    };
  } catch (error) {
    return null;
  }
}

async function testMultiUser() {
  console.log('🚀 Test multi-utilisateurs\n');
  
  // 1. Créer/connecter deux utilisateurs
  console.log('1. Connexion des utilisateurs...');
  const user1 = await createUser('alice@test.com', 'Alice');
  const user2 = await createUser('bob@test.com', 'Bob');
  
  if (!user1 || !user2) {
    console.error('❌ Impossible de créer les utilisateurs');
    process.exit(1);
  }
  
  console.log(`✅ ${user1.name} connecté (${user1.userId})`);
  console.log(`✅ ${user2.name} connecté (${user2.userId})`);
  
  // 2. Envoyer une demande d'ami de user1 à user2
  console.log('\n2. Envoi demande d\'ami...');
  await axios.post('http://localhost:3000/api/friends/request', 
    { email: 'bob@test.com' },
    { headers: { Authorization: `Bearer ${user1.token}` } }
  );
  
  // 3. Accepter la demande
  const requests = await axios.get('http://localhost:3000/api/friends/requests/pending', {
    headers: { Authorization: `Bearer ${user2.token}` }
  });
  
  const requestId = requests.data.data[0]?.id;
  if (requestId) {
    await axios.post(`http://localhost:3000/api/friends/requests/${requestId}/accept`, {}, {
      headers: { Authorization: `Bearer ${user2.token}` }
    });
    console.log('✅ Demande d\'ami acceptée');
  }
  
  // 4. Connexion WebSocket des deux utilisateurs
  console.log('\n3. Connexion WebSocket...');
  
  const socket1 = io('http://localhost:3000/location', {
    transports: ['websocket'],
    auth: { token: `Bearer ${user1.token}` }
  });
  
  const socket2 = io('http://localhost:3000/location', {
    transports: ['websocket'],
    auth: { token: `Bearer ${user2.token}` }
  });
  
  socket1.on('connected', (data) => {
    console.log(`✅ ${user1.name} connecté au WebSocket`);
  });
  
  socket2.on('connected', (data) => {
    console.log(`✅ ${user2.name} connecté au WebSocket`);
  });
  
  // 5. Écouter les positions des amis
  socket1.on('friendLocationUpdate', (data) => {
    console.log(`📍 ${user1.name} voit la position de ${user2.name}: (${data.latitude}, ${data.longitude})`);
  });
  
  socket2.on('friendLocationUpdate', (data) => {
    console.log(`📍 ${user2.name} voit la position de ${user1.name}: (${data.latitude}, ${data.longitude})`);
  });
  
  // 6. Envoyer des positions
  setTimeout(() => {
    console.log('\n4. Envoi des positions...');
    socket1.emit('updateLocation', {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10
    });
    
    setTimeout(() => {
      socket2.emit('updateLocation', {
        latitude: 45.7640,
        longitude: 4.8357,
        accuracy: 15
      });
    }, 1000);
  }, 2000);
  
  // 7. Demander les positions des amis
  setTimeout(() => {
    console.log('\n5. Demande des positions...');
    socket1.emit('getFriendsLocations');
    
    socket1.once('friendsLocations', (locations) => {
      console.log(`📡 ${user1.name} reçoit les positions des amis:`, locations);
    });
  }, 5000);
  
  // 8. Déconnexion après 10 secondes
  setTimeout(() => {
    console.log('\n6. Déconnexion...');
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  }, 10000);
}

testMultiUser().catch(console.error);