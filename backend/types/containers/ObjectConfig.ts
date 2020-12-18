import Rotation from './ObjectRotation';
import Scale from './Scale';

export default class ObjectConfig {
    objectType: string;
    scale: Scale;
    rotation: Rotation;

    constructor(objectType: string, scale?: Scale, rotation?: Rotation) {
        this.objectType = objectType;
        if(scale === undefined) {
            scale = { x: 0, y: 0, z: 0 };
        }
        this.scale = scale;
        if(rotation === undefined) {
            rotation = { w: 0, x: 0, y: 0, z: 0 };
        }
        this.rotation = rotation;
    }
}