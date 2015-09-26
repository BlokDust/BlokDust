import {DisplayObjectCollection} from './DisplayObjectCollection';
import {IDisplayObject} from 'IDisplayObject';

export class DisplayList {

    private _DisplayObjects: DisplayObjectCollection<IDisplayObject>;

    constructor(displayObjects?: DisplayObjectCollection<IDisplayObject>) {
        if (displayObjects){
            this._DisplayObjects = displayObjects;
        } else {
            this._DisplayObjects = new DisplayObjectCollection<IDisplayObject>();
        }
    }

    public Add(displayObject: IDisplayObject){
        this._DisplayObjects.Add(displayObject);
    }

    public IndexOf(displayObject: IDisplayObject) {
        return this._DisplayObjects.IndexOf(displayObject);
    }

    public Insert(index: number, displayObject: IDisplayObject) {
        this._DisplayObjects.Insert(index, displayObject);
    }

    public Remove(displayObject: IDisplayObject) {
        this._DisplayObjects.Remove(displayObject);
    }

    public Contains(displayObject: IDisplayObject) {
        return this._DisplayObjects.Contains(displayObject);
    }

    public Setup(){
        for (var i = 0; i < this._DisplayObjects.Count; i++){
            var displayObject: IDisplayObject = this._DisplayObjects.GetValueAt(i);
            displayObject.Setup();
        }
    }

    public Update(){
        for (var i = 0; i < this._DisplayObjects.Count; i++){
            var displayObject: IDisplayObject = this._DisplayObjects.GetValueAt(i);
            displayObject.Update();
        }
    }

    public Draw(){
        for (var i = 0; i < this._DisplayObjects.Count; i++){
            var displayObject: IDisplayObject = this._DisplayObjects.GetValueAt(i);
            displayObject.Draw();
        }
    }

    public ToFront(displayObject: IDisplayObject){
        this._DisplayObjects.ToFront(displayObject);
    }

    public ToBack(displayObject: IDisplayObject){
        this._DisplayObjects.ToBack(displayObject);
    }
}