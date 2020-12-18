import ObjectPosition from './ObjectPosition';

export default class Note {
    id: number;
    pos: ObjectPosition;
    text: string;

    constructor({ id, pos, text }: never) {
        this.id = id;
        this.pos = pos;
        this.text = text;
    }
}