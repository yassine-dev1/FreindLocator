// src/modules/users/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Friendship } from '../friends/friendship.entity';
import { Location } from '../location/location.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActive: Date;

  @Column({ type: 'jsonb', default: {
    shareLocation: true,
    shareWithFriendsOnly: true,
    allowFriendsOfFriends: false,
    showExactLocation: true,
  }})
  privacySettings: {
    shareLocation: boolean;
    shareWithFriendsOnly: boolean;
    allowFriendsOfFriends: boolean;
    showExactLocation: boolean;
  };

  // Relations
  @OneToMany(() => Friendship, (friendship) => friendship.user)
  friendships: Friendship[];

  @OneToMany(() => Friendship, (friendship) => friendship.friend)
  friendOf: Friendship[];

  @OneToMany(() => Location, (location) => location.user)
  locations: Location[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}