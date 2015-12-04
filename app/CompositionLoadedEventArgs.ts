import {SaveFile} from "./SaveFile";

export class CompositionLoadedEventArgs implements nullstone.IEventArgs {

    public SaveFile: SaveFile;

    constructor (saveFile: SaveFile) {
        Object.defineProperty(this, 'SaveFile', { value: saveFile, writable: false });
    }
}