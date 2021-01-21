import ClientEvent from './ClientEvent';

export default class UpdateUserInfoEvent implements ClientEvent {
    eventType = 'updateUserInfo';
    userId: number;
    userName: string;

    constructor(userId: number, name: string) {
        this.userId = userId;
        this.userName = name;
    }
}