export default class CustomSocket extends WebSocket {
    isAlive = true;
    userName?: string;
    userId?: number;
    ip?: string;
    inSession = false;
}