import ClientEvent from './ClientEvent';

export default class EditNoteEvent implements ClientEvent {
    eventType = 'editNote';
    id: number;
    text: string;

    constructor(id: number, text: string) {
        this.id = id;
        this.text = text;
    }
}