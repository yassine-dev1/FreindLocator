// src/common/guards/ws-jwt.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      
      if (!token) {
        throw new WsException('Missing authentication token');
      }

      const cleanToken = token.replace('Bearer ', '');
      const secret = this.configService.get('JWT_SECRET');
      const decoded = this.jwtService.verify(cleanToken, { secret });
      
      client.user = decoded;
      return true;
    } catch (error) {
      throw new WsException('Invalid authentication token');
    }
  }
}