import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationUpdateDto, UserLocation } from './dto/location.dto';
export declare class LocationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private connectedUsers;
    private userLocations;
    private colorIndex;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoin(client: Socket, data: {
        userId: string;
        username: string;
    }): {
        success: boolean;
        color: string;
    };
    handleLocationUpdate(client: Socket, data: LocationUpdateDto): {
        success: boolean;
    };
    handleGetAllLocations(client: Socket): UserLocation[];
    handleMessage(client: Socket, data: {
        message: string;
    }): void;
}
