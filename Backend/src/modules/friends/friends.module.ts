// // src/modules/friends/friends.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Friendship } from './friendship.entity';
// import { FriendsService } from './friends.service';
// import { FriendsController } from './friends.controller';
// import { UsersModule } from '../users/users.module';
// // import { NotificationsModule } from '../notifications/notifications.module';

// const NotificationsModule = () =>  "hjdjfgj" ;
// @Module({
//   imports: [
//     TypeOrmModule.forFeature([Friendship]),
//     UsersModule,
//     NotificationsModule,
//   ],
//   providers: [FriendsService],
//   controllers: [FriendsController],
//   exports: [FriendsService],
// })
// export class FriendsModule {}