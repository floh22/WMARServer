import ClientEvent from './ClientEvent';

export default class DeleteNoteEvent implements ClientEvent {
    eventType = 'deleteNote';
    id: number;
    userId: number;

    constructor(id: number, userId: number) {
        this.id = id;
        this.userId = userId;
    }
}