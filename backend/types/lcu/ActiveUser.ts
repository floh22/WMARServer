import CustomSocket from '../../websocket/CustomSocket';
import ObjectPosition from '../containers/ObjectPosition';
import ObjectRotation from '../containers/ObjectRotation';

//Each client in a session is represented as an ActiveUser
export default class ActiveUser {
    activeId: number;
    socket: CustomSocket;
    position: ObjectPosition;
    rotation: ObjectRotation
    positionChanged: boolean;

    constructor(userId: number, socket: CustomSocket, pos: ObjectPosition, rot: ObjectRotation) {
        this.activeId = userId;
        this.socket = socket;
        this.position = pos;
        this.rotation = rot;
        this.positionChanged = false;
    }

    //Custom serialization to remove socket from serialized data since that information never has to be sent to clients
    toJson(): any {
        return { activeId: this.activeId, position: this.position, rotation: this.rotation, userName: this.socket.userName || 'defaultUser' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static toActiveUser(partialUser: any, socket: CustomSocket): ActiveUser {
        return new ActiveUser(partialUser.userId, socket, partialUser.position, partialUser.rotation);
    }
}