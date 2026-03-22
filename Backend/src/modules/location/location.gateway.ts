// src/modules/location/location.gateway.ts
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
import { UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { FriendsService } from '../friends/friends.service';
import { UsersService } from '../users/users.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*', // En production, limitez aux origines autorisées
    credentials: true,
  },
  namespace: 'location', // Espace de noms pour les positions
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Stocker les sockets connectés par utilisateur
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private socketUser: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private locationService: LocationService,
    private friendsService: FriendsService,
    private usersService: UsersService,
  ) {}

  /**
   * Quand un client se connecte
   */
  async handleConnection(client: Socket) {
    try {
      // Extraire le token du handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      
      if (!token) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Vérifier et décoder le token JWT (à implémenter)
      const userId = await this.authenticateToken(token);
      if (!userId) {
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Stocker la connexion
      const userIdStr = userId.toString();
      this.socketUser.set(client.id, userIdStr);
      
      if (!this.userSockets.has(userIdStr)) {
        this.userSockets.set(userIdStr, []);
      }
      this.userSockets.get(userIdStr)?.push(client.id);

      // Mettre à jour le statut en ligne
      await this.usersService.updateOnlineStatus(userIdStr, true);
      
      // Joindre la room personnelle de l'utilisateur
      client.join(`user:${userIdStr}`);
      
      // Notifier les amis que l'utilisateur est en ligne
      await this.notifyFriendsStatus(userIdStr, true);

      console.log(`✅ User ${userIdStr} connected. Socket: ${client.id}`);
      client.emit('connected', { message: 'Connected successfully', userId: userIdStr });
      
    } catch (error) {
      console.error('Connection error:', error);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  /**
   * Quand un client se déconnecte
   */
  async handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (userId) {
      // Retirer le socket de la liste
      const sockets = this.userSockets.get(userId) || [];
      const index = sockets.indexOf(client.id);
      if (index !== -1) sockets.splice(index, 1);
      
      if (sockets.length === 0) {
        this.userSockets.delete(userId);
        // Mettre à jour le statut hors ligne
        await this.usersService.updateOnlineStatus(userId, false);
        // Notifier les amis que l'utilisateur est hors ligne
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
      // Sauvegarder la position en base de données
      const location = await this.locationService.updateLocation(
        userId,
        data.latitude,
        data.longitude,
        data.accuracy,
        data.speed,
        data.heading,
      );

      // Récupérer les amis qui peuvent voir cette position
      const friends = await this.friendsService.getFriends(userId);
      
      // Diffuser la position aux amis connectés
      const locationData = {
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date(),
        isMoving: data.speed && data.speed > 0.5,
      };

      for (const friend of friends) {
        const friendSockets = this.userSockets.get(friend.id);
        if (friendSockets && friendSockets.length > 0) {
          // Envoyer la position à chaque socket de l'ami
          friendSockets.forEach(socketId => {
            this.server.to(socketId).emit('friendLocationUpdate', locationData);
          });
        }
      }

      return { success: true, timestamp: locationData.timestamp};
      
    } catch (error) {
      console.error('Error updating location:', error);
      throw new WsException('Failed to update location');
    }
  }

  /**
   * Demander les positions des amis (à la connexion)
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
      throw new WsException('Failed to get friends locations');
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
      
      // Notifier les amis que le partage est activé
      await this.notifyFriendsSharingStatus(userId, true);
      
      return { success: true, message: 'Location sharing started' };
    } catch (error) {
      throw new WsException('Failed to start sharing');
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
      
      // Notifier les amis que le partage est désactivé
      await this.notifyFriendsSharingStatus(userId, false);
      
      return { success: true, message: 'Location sharing stopped' };
    } catch (error) {
      throw new WsException('Failed to stop sharing');
    }
  }

  /**
   * Notifier les amis du changement de statut en ligne
   */
  private async notifyFriendsStatus(userId: string, isOnline: boolean) {
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
  }

  /**
   * Notifier les amis du changement de statut de partage
   */
  private async notifyFriendsSharingStatus(userId: string, isSharing: boolean) {
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
  }

  /**
   * Authentifier le token JWT (à améliorer avec JwtService)
   */
  private async authenticateToken(token: string): Promise<string | null> {
    try {
      // Retirer 'Bearer ' si présent
      const cleanToken = token.replace('Bearer ', '');
      
      // TODO: Utiliser JwtService pour vérifier le token
      // Pour l'instant, on fait une vérification simplifiée
      // Dans la vraie implémentation, utilisez JwtService.verify()
      
      // Simulation - à remplacer par la vraie vérification
      const decoded = this.decodeSimpleToken(cleanToken);
      if (decoded && decoded.sub) {
        return decoded.sub;
      }
      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Décodage simple du token (à remplacer par JwtService)
   */
  private decodeSimpleToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}