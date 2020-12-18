import ClientEvent from './ClientEvent';

export default class DeleteNoteEvent implements ClientEvent {
    eventType = 'deleteNote';
    id: number;

    constructor(id: number) {
        this.id = id;
    }
}