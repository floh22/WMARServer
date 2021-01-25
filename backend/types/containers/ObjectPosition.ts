export default class ObjectPosition {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    getString(): string {
        return 'x: ' + this.x + ' y: ' + this.y + ' z: ' + this.z;
    }
}