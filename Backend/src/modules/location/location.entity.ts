// src/modules/location/location.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum LocationSharingMode {
  PUBLIC = 'public',
  FRIENDS_ONLY = 'friends_only',
  SELECTED_FRIENDS = 'selected_friends',
  NOBODY = 'nobody',
}

@Entity('locations')
@Index(['userId', 'timestamp'])
@Index(['userId', 'isSharing'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.locations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  accuracy: number; // Précision en mètres

  @Column({ type: 'float', nullable: true })
  altitude: number;

  @Column({ type: 'float', nullable: true })
  speed: number; // Vitesse en m/s

  @Column({ type: 'float', nullable: true })
  heading: number; // Direction en degrés

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ default: true })
  isSharing: boolean;

  @Column({
    type: 'enum',
    enum: LocationSharingMode,
    default: LocationSharingMode.FRIENDS_ONLY,
  })
  sharingMode: LocationSharingMode;

  @Column({ type: 'jsonb', nullable: true })
  selectedFriends: string[]; // Liste des IDs des amis sélectionnés pour le partage

  @Column({ type: 'timestamp', nullable: true })
  shareUntil: Date; // Date d'expiration du partage

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    isMoving?: boolean;
    batteryLevel?: number;
    deviceType?: string;
    appVersion?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}