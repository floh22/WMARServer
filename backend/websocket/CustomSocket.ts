export default class CustomSocket extends WebSocket {
    isAlive = true;
    userName?: string;
    userId?: number;
}