export default class CustomSocket extends WebSocket {
    //Extend Sockets with extra info that identifies a user at runtime
    //Consider changing structure to move this to ActiveUser... even if it is a pain
    isAlive = true;
    userName?: string;
    userId?: number;
    ip?: string;
    inSession = false;
}