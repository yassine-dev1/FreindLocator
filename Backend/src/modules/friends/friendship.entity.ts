// src/modules/friends/friendship.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

@Entity('friendships')
@Unique(['user', 'friend']) // Empêche les doublons de relations
@Index(['user', 'status'])
@Index(['friend', 'status'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.friendships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.friendOf, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'friendId' })
  friend: User;

  @Column({ type: 'uuid' })
  friendId: string;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    notificationSent?: boolean;
    seen?: boolean;
    message?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}