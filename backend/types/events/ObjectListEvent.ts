import ObjectList from '../containers/ObjectList';
import ClientEvent from './ClientEvent';

export default class ObjectListEvent implements ClientEvent {
    eventType = 'objectList';
    objects: Array<string> = [];

    constructor(objectList: ObjectList) {
        this.objects = objectList.objects;
    }
}