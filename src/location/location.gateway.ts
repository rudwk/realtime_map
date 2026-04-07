import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { LocationUpdateDto, UserLocation, ConnectedUser } from './dto/location.dto';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F0B27A', '#82E0AA', '#F1948A', '#7FB3D3', '#A9DFBF',
];

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
export class LocationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LocationGateway.name);

  // Store all connected users and their locations
  private connectedUsers = new Map<string, ConnectedUser>();
  private userLocations = new Map<string, UserLocation>();
  private colorIndex = 0;

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected: ${client.id}`);

    // Send current users list to newly connected client
    const currentLocations = Array.from(this.userLocations.values());
    client.emit('initial_locations', currentLocations);

    // Notify the new client of connected user count
    this.server.emit('user_count', this.connectedUsers.size + 1);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);

    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.userLocations.delete(user.userId);
      this.connectedUsers.delete(client.id);

      // Notify all clients that this user left
      this.server.emit('user_left', {
        userId: user.userId,
        username: user.username,
        socketId: client.id,
      });

      this.logger.log(`👤 User ${user.username} removed from map`);
    }

    this.server.emit('user_count', this.connectedUsers.size);
    this.server.emit('all_locations', Array.from(this.userLocations.values()));
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; username: string },
  ) {
    const color = USER_COLORS[this.colorIndex % USER_COLORS.length];
    this.colorIndex++;

    const user: ConnectedUser = {
      socketId: client.id,
      userId: data.userId,
      username: data.username,
      connectedAt: Date.now(),
    };

    this.connectedUsers.set(client.id, user);

    this.logger.log(`👤 User joined: ${data.username} (${data.userId})`);

    // Confirm join to the client
    client.emit('join_success', {
      userId: data.userId,
      username: data.username,
      color,
      message: `Welcome, ${data.username}!`,
    });

    // Notify all other clients
    this.server.emit('user_joined', {
      userId: data.userId,
      username: data.username,
      color,
    });

    this.server.emit('user_count', this.connectedUsers.size);

    return { success: true, color };
  }

  @SubscribeMessage('update_location')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdateDto,
  ) {
    const connectedUser = this.connectedUsers.get(client.id);
    if (!connectedUser) {
      client.emit('error', { message: 'Please join first' });
      return;
    }

    // Get or create user location entry
    const existingLocation = this.userLocations.get(data.userId);
    const color = existingLocation?.color || USER_COLORS[this.colorIndex % USER_COLORS.length];

    const userLocation: UserLocation = {
      userId: data.userId,
      username: data.username || connectedUser.username,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
      timestamp: data.timestamp || Date.now(),
      socketId: client.id,
      color,
    };

    this.userLocations.set(data.userId, userLocation);

    // Broadcast updated location to ALL clients
    this.server.emit('location_updated', userLocation);

    this.logger.log(
      `📍 Location update: ${userLocation.username} → [${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}]`,
    );

    return { success: true };
  }

  @SubscribeMessage('get_all_locations')
  handleGetAllLocations(@ConnectedSocket() client: Socket) {
    const locations = Array.from(this.userLocations.values());
    client.emit('all_locations', locations);
    return locations;
  }

  @SubscribeMessage('send_message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    const userLocation = this.userLocations.get(user.userId);

    this.server.emit('new_message', {
      userId: user.userId,
      username: user.username,
      message: data.message,
      timestamp: Date.now(),
      location: userLocation
        ? { lat: userLocation.latitude, lng: userLocation.longitude }
        : null,
      color: userLocation?.color || '#ffffff',
    });

    this.logger.log(`💬 Message from ${user.username}: ${data.message}`);
  }
}