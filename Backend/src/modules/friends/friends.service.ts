// src/modules/friends/friends.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Friendship, FriendshipStatus } from './friendship.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    private usersService: UsersService,
  ) {}

  /**
   * Envoyer une demande d'ami
   */
  async sendFriendRequest(userId: string, friendEmail: string) {
    // Trouver l'ami par email
    const friend = await this.usersService.findByEmail(friendEmail);
    if (!friend) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (userId === friend.id) {
      throw new BadRequestException('Vous ne pouvez pas vous ajouter vous-même');
    }

    // Vérifier si une demande existe déjà
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { userId, friendId: friend.id },
        { userId: friend.id, friendId: userId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Vous êtes déjà amis');
      }
      if (existingFriendship.status === FriendshipStatus.PENDING) {
        throw new ConflictException('Une demande est déjà en attente');
      }
      if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        throw new ConflictException('Cette action est bloquée');
      }
    }

    // Créer la demande
    const friendship = this.friendshipRepository.create({
      userId,
      friendId: friend.id,
      status: FriendshipStatus.PENDING,
    });

    await this.friendshipRepository.save(friendship);

    return {
      message: 'Demande d\'ami envoyée',
      friendship: {
        id: friendship.id,
        user: { id: userId },
        friend: { id: friend.id, name: friend.name, email: friend.email },
        status: friendship.status,
        createdAt: friendship.createdAt,
      },
    };
  }

  /**
   * Accepter une demande d'ami
   */
  async acceptFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: friendshipId, friendId: userId, status: FriendshipStatus.PENDING },
      relations: ['user'],
    });

    if (!friendship) {
      throw new NotFoundException('Demande d\'ami non trouvée');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    friendship.acceptedAt = new Date();
    await this.friendshipRepository.save(friendship);

    return {
      message: 'Demande d\'ami acceptée',
      friendship: {
        id: friendship.id,
        user: friendship.user,
        status: friendship.status,
        acceptedAt: friendship.acceptedAt,
      },
    };
  }

  /**
   * Rejeter une demande d'ami
   */
  async rejectFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: friendshipId, friendId: userId, status: FriendshipStatus.PENDING },
    });

    if (!friendship) {
      throw new NotFoundException('Demande d\'ami non trouvée');
    }

    friendship.status = FriendshipStatus.REJECTED;
    await this.friendshipRepository.save(friendship);

    return { message: 'Demande d\'ami rejetée' };
  }

  /**
   * Supprimer un ami
   */
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { userId, friendId, status: FriendshipStatus.ACCEPTED },
        { userId: friendId, friendId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Amitié non trouvée');
    }

    await this.friendshipRepository.remove(friendship);

    return { message: 'Ami supprimé avec succès' };
  }

  /**
   * Récupérer la liste des amis d'un utilisateur
   */
  async getFriends(userId: string) {
    const friendships = await this.friendshipRepository.find({
      where: [
        { userId, status: FriendshipStatus.ACCEPTED },
        { friendId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['user', 'friend'],
    });

    const friends = friendships.map((friendship) => {
      const friend = friendship.userId === userId ? friendship.friend : friendship.user;
      return {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        avatar: friend.avatar,
        isOnline: friend.isOnline,
        lastActive: friend.lastActive,
        friendshipId: friendship.id,
        acceptedAt: friendship.acceptedAt,
      };
    });

    return friends;
  }

  /**
   * Récupérer les demandes d'ami en attente
   */
  async getPendingRequests(userId: string) {
    const pendingRequests = await this.friendshipRepository.find({
      where: { friendId: userId, status: FriendshipStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return pendingRequests.map((request) => ({
      id: request.id,
      user: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
        avatar: request.user.avatar,
      },
      createdAt: request.createdAt,
    }));
  }

  /**
   * Récupérer les demandes d'ami envoyées
   */
  async getSentRequests(userId: string) {
    const sentRequests = await this.friendshipRepository.find({
      where: { userId, status: FriendshipStatus.PENDING },
      relations: ['friend'],
      order: { createdAt: 'DESC' },
    });

    return sentRequests.map((request) => ({
      id: request.id,
      friend: {
        id: request.friend.id,
        name: request.friend.name,
        email: request.friend.email,
        avatar: request.friend.avatar,
      },
      createdAt: request.createdAt,
    }));
  }

  /**
   * Vérifier si deux utilisateurs sont amis
   */
  async areFriends(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { userId, friendId, status: FriendshipStatus.ACCEPTED },
        { userId: friendId, friendId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });
    return !!friendship;
  }

  /**
   * Récupérer les amis en ligne
   */
  async getOnlineFriends(userId: string) {
    const friends = await this.getFriends(userId);
    return friends.filter((friend) => friend.isOnline);
  }
}