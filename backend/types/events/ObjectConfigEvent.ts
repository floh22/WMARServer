import ObjectConfig from '../containers/ObjectConfig';
import ClientEvent from './ClientEvent';

export default class ObjectConfigChangeEvent implements ClientEvent {
    eventType = 'objectConfig';
    config: ObjectConfig;

    constructor(config: ObjectConfig) {
        this.config = config;
    }
}