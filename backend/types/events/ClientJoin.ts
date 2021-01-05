import ActiveUser from '../lcu/ActiveUser';
import ClientEvent from './ClientEvent';

export default class ClientJoin implements ClientEvent {
    eventType = 'clientJoin';
    user: ActiveUser;

    constructor (activeUser: ActiveUser) {
        this.user = activeUser;
    }

    toJson(): any {
        return { eventType: this.eventType, user: this.user.toJson() };
    }
}