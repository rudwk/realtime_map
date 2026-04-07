"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LocationGateway_1;
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F0B27A', '#82E0AA', '#F1948A', '#7FB3D3', '#A9DFBF',
];
let LocationGateway = LocationGateway_1 = class LocationGateway {
    constructor() {
        this.logger = new common_1.Logger(LocationGateway_1.name);
        this.connectedUsers = new Map();
        this.userLocations = new Map();
        this.colorIndex = 0;
    }
    afterInit(server) {
        this.logger.log('🚀 WebSocket Gateway initialized');
    }
    handleConnection(client) {
        this.logger.log(`✅ Client connected: ${client.id}`);
        const currentLocations = Array.from(this.userLocations.values());
        client.emit('initial_locations', currentLocations);
        this.server.emit('user_count', this.connectedUsers.size + 1);
    }
    handleDisconnect(client) {
        this.logger.log(`❌ Client disconnected: ${client.id}`);
        const user = this.connectedUsers.get(client.id);
        if (user) {
            this.userLocations.delete(user.userId);
            this.connectedUsers.delete(client.id);
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
    handleJoin(client, data) {
        const color = USER_COLORS[this.colorIndex % USER_COLORS.length];
        this.colorIndex++;
        const user = {
            socketId: client.id,
            userId: data.userId,
            username: data.username,
            connectedAt: Date.now(),
        };
        this.connectedUsers.set(client.id, user);
        this.logger.log(`👤 User joined: ${data.username} (${data.userId})`);
        client.emit('join_success', {
            userId: data.userId,
            username: data.username,
            color,
            message: `Welcome, ${data.username}!`,
        });
        this.server.emit('user_joined', {
            userId: data.userId,
            username: data.username,
            color,
        });
        this.server.emit('user_count', this.connectedUsers.size);
        return { success: true, color };
    }
    handleLocationUpdate(client, data) {
        const connectedUser = this.connectedUsers.get(client.id);
        if (!connectedUser) {
            client.emit('error', { message: 'Please join first' });
            return;
        }
        const existingLocation = this.userLocations.get(data.userId);
        const color = existingLocation?.color || USER_COLORS[this.colorIndex % USER_COLORS.length];
        const userLocation = {
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
        this.server.emit('location_updated', userLocation);
        this.logger.log(`📍 Location update: ${userLocation.username} → [${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}]`);
        return { success: true };
    }
    handleGetAllLocations(client) {
        const locations = Array.from(this.userLocations.values());
        client.emit('all_locations', locations);
        return locations;
    }
    handleMessage(client, data) {
        const user = this.connectedUsers.get(client.id);
        if (!user)
            return;
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
};
exports.LocationGateway = LocationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_a = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _a : Object)
], LocationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", void 0)
], LocationGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('update_location'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", void 0)
], LocationGateway.prototype, "handleLocationUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_all_locations'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _d : Object]),
    __metadata("design:returntype", void 0)
], LocationGateway.prototype, "handleGetAllLocations", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _e : Object, Object]),
    __metadata("design:returntype", void 0)
], LocationGateway.prototype, "handleMessage", null);
exports.LocationGateway = LocationGateway = LocationGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        namespace: '/',
    })
], LocationGateway);
//# sourceMappingURL=location.gateway.js.map