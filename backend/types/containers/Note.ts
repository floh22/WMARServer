import ObjectPosition from './ObjectPosition';

export default class Note {
    id: number;
    pos: ObjectPosition;
    type: string;
    content: string;

    constructor(id: number, pos: ObjectPosition, type: string, content: string) {
        this.id = id;
        this.pos = pos;
        this.type = type;
        this.content = content;
    }
}