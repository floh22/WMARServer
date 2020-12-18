import ReducedSession from '../containers/ReducedSession';
import ClientEvent from './ClientEvent';

export default class SessionListEvent implements ClientEvent {
    eventType = 'sessionList';
    sessionList: Array<ReducedSession>;

    constructor(sessions: Array<ReducedSession>){
        this.sessionList = sessions;
    }
}