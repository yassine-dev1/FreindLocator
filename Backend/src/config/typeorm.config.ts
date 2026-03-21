// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { ConfigService } from '@nestjs/config';

// entities
import { User } from '../modules/users/user.entity';
import { Friendship } from '../modules/friends/friendship.entity';
import { Location } from '../modules/location/location.entity';

export const typeOrmConfig = (
                 configService: ConfigService,
           ): TypeOrmModuleOptions => ({

    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [
                User, 
                Friendship, 
                Location
              ],
  synchronize: configService.get('NODE_ENV') === 'development', // Attention: à désactiver en prod
  logging: configService.get('NODE_ENV') === 'development',
  ssl: false,
});
