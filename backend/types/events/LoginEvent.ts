import ClientEvent from './ClientEvent';

export default class LoginEvent implements ClientEvent {
    eventType = 'login';
    userId: number;
    userName: string

    constructor(userId: number, userName: string) {
        this.userId = userId;
        this.userName = userName;
    }
}