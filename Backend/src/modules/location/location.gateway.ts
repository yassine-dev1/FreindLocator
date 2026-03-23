import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationService } from './location.service';
import { FriendsService } from '../friends/friends.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'location',
  transports: ['websocket', 'polling'], // Ajouter polling pour plus de compatibilité
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string[]> = new Map();
  private socketUser: Map<string, string> = new Map();

  constructor(
    private locationService: LocationService,
    private friendsService: FriendsService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Quand un client se connecte
   */
  async handleConnection(client: Socket) {
    try {
      console.log('🔌 Nouvelle connexion WebSocket');
      console.log('Headers:', client.handshake.headers);
      console.log('Auth:', client.handshake.auth);
      
      // Extraire le token de différentes sources possibles
      let token = client.handshake.auth.token || 
                  client.handshake.headers.authorization ||
                  client.handshake.query.token;
      
      console.log('Token extrait:', token ? 'Présent' : 'Non trouvé');
      
      if (!token) {
        console.error('❌ Pas de token trouvé');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Retirer 'Bearer ' si présent
      const cleanToken = token.toString().replace('Bearer ', '');
      
      // Vérifier et décoder le token JWT avec JwtService
      try {
        const secret = this.configService.get('JWT_SECRET');
        const decoded = this.jwtService.verify(cleanToken, { secret });
        const userId = decoded.sub;
        
        if (!userId) {
          throw new Error('Invalid token payload');
        }

        console.log(`✅ Utilisateur authentifié: ${userId}`);

        // Stocker la connexion
        const userIdStr = userId.toString();
        this.socketUser.set(client.id, userIdStr);
        
        if (!this.userSockets.has(userIdStr)) {
          this.userSockets.set(userIdStr, []);
        }
        this.userSockets.get(userIdStr)?.push(client.id);

        // Mettre à jour le statut en ligne
        await this.usersService.updateOnlineStatus(userIdStr, true);
        
        // Joindre la room personnelle
        client.join(`user:${userIdStr}`);
        
        // Notifier les amis
        await this.notifyFriendsStatus(userIdStr, true);

        console.log(`✅ User ${userIdStr} connected. Socket: ${client.id}`);
        client.emit('connected', { message: 'Connected successfully', userId: userIdStr });
        
      } catch (err) {
        console.error('❌ Token invalide:', err.message);
        client.emit('error', { message: 'Invalid token: ' + err.message });
        client.disconnect();
      }
      
    } catch (error) {
      console.error('❌ Connection error:', error);
      client.emit('error', { message: 'Connection failed: ' + error.message });
      client.disconnect();
    }
  }

  /**
   * Quand un client se déconnecte
   */
  async handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const index = sockets.indexOf(client.id);
      if (index !== -1) sockets.splice(index, 1);
      
      if (sockets.length === 0) {
        this.userSockets.delete(userId);
        await this.usersService.updateOnlineStatus(userId, false);
        await this.notifyFriendsStatus(userId, false);
      }
      
      this.socketUser.delete(client.id);
      console.log(`❌ User ${userId} disconnected. Socket: ${client.id}`);
    }
  }

  /**
   * Mettre à jour la position en temps réel
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) {
      throw new WsException('User not authenticated');
    }

    try {
      console.log(`📍 User ${userId} updating location:`, data);
      
      const location = await this.locationService.updateLocation(
        userId,
        data.latitude,
        data.longitude,
        data.accuracy,
        data.speed,
        data.heading,
      );

      const friends = await this.friendsService.getFriends(userId);
      
      const locationData = {
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date(),
        isMoving: data.speed ? data.speed > 0.5 : false,
      };

      for (const friend of friends) {
        const friendSockets = this.userSockets.get(friend.id);
        if (friendSockets && friendSockets.length > 0) {
          friendSockets.forEach(socketId => {
            this.server.to(socketId).emit('friendLocationUpdate', locationData);
          });
        }
      }

      return { success: true, timestamp: locationData.timestamp };
      
    } catch (error) {
      console.error('Error updating location:', error);
      throw new WsException('Failed to update location: ' + error.message);
    }
  }

  /**
   * Demander les positions des amis
   */
  @SubscribeMessage('getFriendsLocations')
  async handleGetFriendsLocations(@ConnectedSocket() client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (!userId) {
      throw new WsException('User not authenticated');
    }

    try {
      const friendsLocations = await this.locationService.getFriendsLocations(userId);
      client.emit('friendsLocations', friendsLocations);
      return { success: true };
    } catch (error) {
      console.error('Error getting friends locations:', error);
      throw new WsException('Failed to get friends locations: ' + error.message);
    }
  }

  /**
   * Démarrer le partage de position
   */
  @SubscribeMessage('startSharing')
  async handleStartSharing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      sharingMode?: string;
      shareUntil?: Date;
    },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) {
      throw new WsException('User not authenticated');
    }

    try {
      await this.locationService.updateSharingSettings(
        userId,
        true,
        data.sharingMode as any,
        undefined,
        data.shareUntil,
      );
      
      await this.notifyFriendsSharingStatus(userId, true);
      
      return { success: true, message: 'Location sharing started' };
    } catch (error) {
      throw new WsException('Failed to start sharing: ' + error.message);
    }
  }

  /**
   * Arrêter le partage de position
   */
  @SubscribeMessage('stopSharing')
  async handleStopSharing(@ConnectedSocket() client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (!userId) {
      throw new WsException('User not authenticated');
    }

    try {
      await this.locationService.updateSharingSettings(userId, false);
      await this.notifyFriendsSharingStatus(userId, false);
      
      return { success: true, message: 'Location sharing stopped' };
    } catch (error) {
      throw new WsException('Failed to stop sharing: ' + error.message);
    }
  }

  /**
   * Notifier les amis du changement de statut en ligne
   */
  private async notifyFriendsStatus(userId: string, isOnline: boolean) {
    try {
      const friends = await this.friendsService.getFriends(userId);
      const user = await this.usersService.findOne(userId);
      
      const statusData = {
        userId,
        name: user.name,
        isOnline,
        timestamp: new Date(),
      };

      for (const friend of friends) {
        const friendSockets = this.userSockets.get(friend.id);
        if (friendSockets && friendSockets.length > 0) {
          friendSockets.forEach(socketId => {
            this.server.to(socketId).emit('friendStatusChanged', statusData);
          });
        }
      }
    } catch (error) {
      console.error('Error notifying friends status:', error);
    }
  }

  /**
   * Notifier les amis du changement de statut de partage
   */
  private async notifyFriendsSharingStatus(userId: string, isSharing: boolean) {
    try {
      const friends = await this.friendsService.getFriends(userId);
      
      const sharingData = {
        userId,
        isSharing,
        timestamp: new Date(),
      };

      for (const friend of friends) {
        const friendSockets = this.userSockets.get(friend.id);
        if (friendSockets && friendSockets.length > 0) {
          friendSockets.forEach(socketId => {
            this.server.to(socketId).emit('friendSharingChanged', sharingData);
          });
        }
      }
    } catch (error) {
      console.error('Error notifying sharing status:', error);
    }
  }
}