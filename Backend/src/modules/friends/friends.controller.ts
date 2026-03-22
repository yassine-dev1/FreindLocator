// src/modules/friends/friends.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des amis' })
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Get('online')
  @ApiOperation({ summary: 'Récupérer les amis en ligne' })
  async getOnlineFriends(@Request() req) {
    return this.friendsService.getOnlineFriends(req.user.id);
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'Récupérer les demandes d\'ami en attente' })
  async getPendingRequests(@Request() req) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Récupérer les demandes envoyées' })
  async getSentRequests(@Request() req) {
    return this.friendsService.getSentRequests(req.user.id);
  }

  @Post('request')
  @ApiOperation({ summary: 'Envoyer une demande d\'ami' })
  async sendFriendRequest(@Request() req, @Body('email') email: string) {
    return this.friendsService.sendFriendRequest(req.user.id, email);
  }

  @Post('requests/:id/accept')
  @ApiOperation({ summary: 'Accepter une demande d\'ami' })
  async acceptFriendRequest(@Request() req, @Param('id') friendshipId: string) {
    return this.friendsService.acceptFriendRequest(req.user.id, friendshipId);
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Rejeter une demande d\'ami' })
  async rejectFriendRequest(@Request() req, @Param('id') friendshipId: string) {
    return this.friendsService.rejectFriendRequest(req.user.id, friendshipId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Supprimer un ami' })
  async removeFriend(@Request() req, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }
}