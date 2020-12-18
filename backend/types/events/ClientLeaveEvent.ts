import ClientEvent from './ClientEvent';

export default class ClientLeaveEvent implements ClientEvent {
    eventType = 'clientLeave';
    userId: number;

    constructor(userId: number) {
        this.userId = userId;
    }
}