import ClientEvent from './ClientEvent';

export default class DeleteSessionEvent implements ClientEvent {
    eventType = 'deleteSession';
    sessionId: number;

    constructor(id: number) {
        this.sessionId = id;
    }
}