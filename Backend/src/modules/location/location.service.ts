// src/modules/location/location.service.ts
// Version corrigée avec typage explicite

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, In } from 'typeorm';
import { Location, LocationSharingMode } from './location.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { FriendsService } from '../friends/friends.service';

// ✅ Définir un type pour la position sanitizée
export interface SanitizedLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  isMoving?: boolean;
}

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private usersService: UsersService,
    private friendsService: FriendsService,
  ) {}

  /**
   * Mettre à jour la position d'un utilisateur
   */
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
    speed?: number,
    heading?: number,
    metadata?: any,
  ) {
    // Vérifier que l'utilisateur existe
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si le partage est activé
    if (!user.privacySettings?.shareLocation) {
      throw new ForbiddenException('Le partage de position est désactivé');
    }

    // Créer l'objet de location
    const locationData = {
      userId: userId,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      timestamp: new Date(),
      isSharing: true,
      sharingMode: this.getSharingModeFromUser(user),
      metadata: metadata || {},
    };

    const location = this.locationRepository.create(locationData as any);
    const savedLocation = await this.locationRepository.save(location);


    // Nettoyer les anciennes positions
    await this.cleanOldLocations(userId);

    return savedLocation;
  }

  /**
   * Récupérer la dernière position d'un utilisateur
   */
  async getLastLocation(viewerId: string, targetId: string): Promise<SanitizedLocation | null> {
    const canView = await this.canViewLocation(viewerId, targetId);
    if (!canView) {
      throw new ForbiddenException('Vous n\'avez pas la permission de voir cette position');
    }

    const location = await this.locationRepository.findOne({
      where: { 
        userId: targetId, 
        isSharing: true 
      },
      order: { timestamp: 'DESC' },
    });

    if (!location) {
      return null;
    }

    if (location.shareUntil && new Date() > new Date(location.shareUntil)) {
      return null;
    }

    return this.sanitizeLocation(location, viewerId, targetId);
  }

  /**
   * Récupérer les positions des amis
   */
  async getFriendsLocations(userId: string): Promise<SanitizedLocation[]> {
    // Récupérer la liste des amis
    const friends = await this.friendsService.getFriends(userId);
    const friendIds = friends.map(f => f.id);

    if (friendIds.length === 0) {
      return [];
    }

    // Récupérer la dernière position de chaque ami
    const locations = await this.locationRepository
      .createQueryBuilder('l1')
      .innerJoin(
        subQuery => {
          return subQuery
            .select('l2.userId', 'userId')
            .addSelect('MAX(l2.timestamp)', 'maxTimestamp')
            .from(Location, 'l2')
            .where('l2.userId IN (:...friendIds)', { friendIds })
            .andWhere('l2.isSharing = :isSharing', { isSharing: true })
            .groupBy('l2.userId');
        },
        'latest',
        'l1.userId = latest."userId" AND l1.timestamp = latest."maxTimestamp"'
      )
      .getMany();

    // ✅ CORRECTION : Typage explicite du tableau
    const validLocations: SanitizedLocation[] = [];
    
    for (const location of locations) {
      const canView = await this.canViewLocation(userId, location.userId);
      if (canView) {
        const isNotExpired = !location.shareUntil || new Date() <= new Date(location.shareUntil);
        if (isNotExpired) {
          const sanitized = this.sanitizeLocation(location, userId, location.userId);
          validLocations.push(sanitized);
        }
      }
    }

    return validLocations;
  }

  /**
   * Modifier les paramètres de partage
   */
  async updateSharingSettings(
    userId: string,
    isSharing: boolean,
    sharingMode?: LocationSharingMode,
    selectedFriends?: string[],
    shareUntil?: Date,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    
    const updatedPrivacySettings = {
      ...user.privacySettings,
      shareLocation: isSharing,
    };
    
    await this.usersService.update(userId, { 
      privacySettings: updatedPrivacySettings 
    });

    const lastLocation = await this.locationRepository.findOne({
      where: { userId },
      order: { timestamp: 'DESC' },
    });

    if (lastLocation) {
      lastLocation.isSharing = isSharing;
      if (sharingMode) lastLocation.sharingMode = sharingMode;
      if (selectedFriends) lastLocation.selectedFriends = selectedFriends;
      if (shareUntil) lastLocation.shareUntil = shareUntil;
      await this.locationRepository.save(lastLocation);
    }

    return {
      message: 'Paramètres de partage mis à jour',
      settings: {
        isSharing,
        sharingMode: sharingMode || (user.privacySettings?.shareWithFriendsOnly ? LocationSharingMode.FRIENDS_ONLY : LocationSharingMode.PUBLIC),
        shareUntil: shareUntil || null,
      },
    };
  }

  /**
   * Vérifier si un utilisateur peut voir la position d'un autre
   */
  private async canViewLocation(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;

    const target = await this.usersService.findOne(targetId);
    if (!target) return false;

    if (!target.privacySettings?.shareLocation) return false;

    const areFriends = await this.friendsService.areFriends(viewerId, targetId);

    if (target.privacySettings.shareWithFriendsOnly) {
      return areFriends;
    }

    return true;
  }

  /**
   * Nettoyer les anciennes positions
   */
  private async cleanOldLocations(userId: string) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    await this.locationRepository.delete({
      userId,
      timestamp: LessThan(twentyFourHoursAgo),
    });
  }

  /**
   * Obtenir le mode de partage
   */
  private getSharingModeFromUser(user: User): LocationSharingMode {
    if (!user.privacySettings?.shareLocation) {
      return LocationSharingMode.NOBODY;
    }
    if (user.privacySettings.shareWithFriendsOnly) {
      return LocationSharingMode.FRIENDS_ONLY;
    }
    return LocationSharingMode.PUBLIC;
  }

  /**
   * Nettoyer la position pour l'affichage
   */
  private sanitizeLocation(
    location: Location,
    viewerId: string,
    targetId: string,
  ): SanitizedLocation {
    const isSelf = viewerId === targetId;
    const isMoving = location.speed ? location.speed > 0.5 : false;

    // Base de la réponse
    const result: SanitizedLocation = {
      userId: location.userId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
      isMoving,
    };

    // Ajouter l'accuracy si disponible
    if (location.accuracy) {
      result.accuracy = location.accuracy;
    }

    return result;
  }

  /**
   * Récupérer l'historique des positions
   */
  async getLocationHistory(userId: string, hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const locations = await this.locationRepository.find({
      where: {
        userId,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'ASC' },
      take: 1000,
    });

    return locations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      timestamp: loc.timestamp,
      accuracy: loc.accuracy,
      speed: loc.speed,
    }));
  }

  /**
   * Supprimer toutes les positions
   */
  async deleteAllLocations(userId: string) {
    await this.locationRepository.delete({ userId });
    return { message: 'Toutes les positions ont été supprimées' };
  }

  /**
   * Récupérer les amis qui partagent leur position
   */
  async getSharingFriends(userId: string): Promise<string[]> {
    const friends = await this.friendsService.getFriends(userId);
    const sharingFriendIds: string[] = [];

    for (const friend of friends) {
      const lastLocation = await this.locationRepository.findOne({
        where: { 
          userId: friend.id, 
          isSharing: true 
        },
        order: { timestamp: 'DESC' },
      });

      if (lastLocation) {
        const isNotExpired = !lastLocation.shareUntil || new Date() <= new Date(lastLocation.shareUntil);
        if (isNotExpired) {
          sharingFriendIds.push(friend.id);
        }
      }
    }

    return sharingFriendIds;
  }
}