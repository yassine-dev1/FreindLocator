// src/modules/location/location.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LocationSharingMode } from './location.entity';

@ApiTags('Location')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ summary: 'Mettre à jour ma position' })
  async updateLocation(
    @Request() req,
    @Body() updateLocationDto: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    },
  ) {
    return this.locationService.updateLocation(
      req.user.id,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
      updateLocationDto.accuracy,
      updateLocationDto.speed,
      updateLocationDto.heading,
    );
  }

  @Get('friends')
  @ApiOperation({ summary: 'Récupérer les positions des amis' })
  async getFriendsLocations(@Request() req) {
    const locations = await this.locationService.getFriendsLocations(req.user.id);
    
    return {
      message: 'Positions des amis récupérées avec succès',
      data: locations,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Récupérer la position d\'un utilisateur' })
  async getUserLocation(@Request() req, @Param('userId') targetId: string) {
    const location = await this.locationService.getLastLocation(req.user.id, targetId);
    
    if (!location) {
      return {
        message: 'Aucune position disponible pour cet utilisateur',
        data: null,
      };
    }
    
    return {
      message: 'Position récupérée avec succès',
      data: location,
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Modifier les paramètres de partage' })
  async updateSharingSettings(
    @Request() req,
    @Body() settings: {
      isSharing: boolean;
      sharingMode?: LocationSharingMode;
      selectedFriends?: string[];
      shareUntil?: Date;
    },
  ) {
    return this.locationService.updateSharingSettings(
      req.user.id,
      settings.isSharing,
      settings.sharingMode,
      settings.selectedFriends,
      settings.shareUntil,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Récupérer mon historique de positions' })
  async getLocationHistory(@Request() req, @Query('hours') hours?: number) {
    return this.locationService.getLocationHistory(req.user.id, hours);
  }
}