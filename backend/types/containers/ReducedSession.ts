import { Session } from '../lcu/Session';

export default class ReducedSession {
    users: Array<string> = [];
    sessionId: number;
    centralObject: string;
    sessionName: string;
    host: string;

    constructor(session: Session) {
        session.currentUsers.forEach((activeUser) => {
            this.users.push(activeUser.socket.userName || 'defaultUser');
        });
        this.sessionId = session.SessionID;
        this.centralObject = session.state.data.objectConfig.objectType;
        this.host = session.state.data.host;
        this.sessionName = session.state.data.sessionName;
    }
}