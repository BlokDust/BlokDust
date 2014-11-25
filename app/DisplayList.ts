// todo: this maintains a DisplayObjectCollection
// has a Render method, which loops through each item in the DisplayObjectCollection calling their PreRender, then Render (Render skips out if there's a DisplayObject.PreRenderImage)

import DisplayObjectCollection = require("./DisplayObjectCollection");
import IDisplayObject = require("IDisplayObject");

class DisplayList {

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

    public Remove(displayObject: IDisplayObject){
        this._DisplayObjects.Remove(displayObject);
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

export = DisplayList;