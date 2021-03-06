import { eventNames } from 'process';
import ObjectPosition from '../containers/ObjectPosition';
import ObjectRotation from '../containers/ObjectRotation';
import ActiveUser from '../lcu/ActiveUser';
import ClientEvent from './ClientEvent';

export default class ClientPositionEvent implements ClientEvent {
    eventType = 'clientPosition'
    fullClients: Array<ActiveUser>;
    userId = -1;
    updatedPosition: ObjectPosition;
    updatedRotation: ObjectRotation;

    constructor(clients: Array<ActiveUser>) {
        this.fullClients = clients;
        this.updatedPosition = new ObjectPosition(0,0,0);
        this.updatedRotation = new ObjectRotation(0,0,0,0);
    }

    //For each client with an updated Transform add all needed information to a list of updated clients
    //All updated transforms for this tick are therefor sent in a single packet reducing overhead
    toJson(): string {
        const clients: Array<{activeId: number; position: ObjectPosition; rotation: ObjectRotation }> = []
        this.fullClients.forEach((c) => {
            clients.push({ activeId: c.activeId, position: c.position, rotation: c.rotation });
        })
        return JSON.stringify({ eventType: this.eventType, clients: clients });
    }
}