import ObjectConfig from '../containers/ObjectConfig';
import ClientEvent from './ClientEvent';

export default class JoinSessionEvent implements ClientEvent {
    eventType = 'joinSession';
    id: number;
    sessionName: string;
    host: string;
    objectConfig: ObjectConfig;

    constructor(id: number, name: string, host: string, centralObject: ObjectConfig) {
        this.id = id;
        this.objectConfig = centralObject;
        this.sessionName = name;
        this.host = host;
    }
}