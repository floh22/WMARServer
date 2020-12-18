import ObjectConfig from '../containers/ObjectConfig';
import ClientEvent from './ClientEvent';

export default class NewSessionEvent implements ClientEvent {
    eventType = 'newSession';
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