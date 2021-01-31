import * as fs from 'fs';
import logger from '../../logging';


const log = logger('objLoader');
const getDirectories = (source: fs.PathLike): string[] =>
fs.readdirSync(source, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

//List of all object types available on the server
export default class ObjectList {
    objects: Array<string> = [];

    

    constructor() {
        this.objects = this.getObjectList();
        log.info('Loaded ' + this.objects.length + ' objects');
    }


    getObjectList(): Array<string> {
        const objectFolder = './cache/objectData';

        if(!fs.existsSync(objectFolder)) {
            fs.mkdirSync(objectFolder);
        }
        return getDirectories(objectFolder + '/');
    }
}