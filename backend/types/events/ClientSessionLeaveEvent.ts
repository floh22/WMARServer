import ClientEvent from './ClientEvent';

export default class ClientSessionLeave implements ClientEvent {
    eventType = 'clientSessionLeave';
    userId: number;

    constructor (userId: number) {
        this.userId = userId;
    }
}