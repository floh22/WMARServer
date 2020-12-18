import ClientEvent from './ClientEvent';

export default class NewNoteEvent implements ClientEvent {
    eventType = 'newNote';
    id: number;
    text: string;

    constructor(id: number, text: string) {
        this.id = id;
        this.text = text;
    }
}