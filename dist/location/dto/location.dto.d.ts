export interface LocationUpdateDto {
    userId: string;
    username: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: number;
}
export interface UserLocation {
    userId: string;
    username: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp: number;
    socketId: string;
    color: string;
}
export interface ConnectedUser {
    socketId: string;
    userId: string;
    username: string;
    connectedAt: number;
}
