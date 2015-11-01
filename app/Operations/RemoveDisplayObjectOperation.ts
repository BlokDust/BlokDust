import DisplayObjectCollection = etch.drawing.DisplayObjectCollection;
import IDisplayObject = etch.drawing.IDisplayObject;
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';
import ObservableCollection = etch.collections.ObservableCollection;

export class RemoveDisplayObjectOperation implements IUndoableOperation {
    private _DisplayList: DisplayObjectCollection<IDisplayObject>;
    private _DisplayObject: IDisplayObject;
    private _Index: number;

    constructor(displayObject: IDisplayObject, displayList: DisplayObjectCollection<IDisplayObject>) {
        this._DisplayObject = displayObject;
        this._DisplayList = displayList;
    }

    Do(): Promise<DisplayObjectCollection<IDisplayObject>> {
        this._Index = this._DisplayList.IndexOf(this._DisplayObject);

        var that = this;

        return new Promise((resolve) => {
            that._DisplayList.Remove(that._DisplayObject);
            resolve(that._DisplayList);
        });
    }

    Undo(): Promise<DisplayObjectCollection<IDisplayObject>> {
        var that = this;

        return new Promise((resolve) => {
            that._DisplayList.Insert(that._Index, that._DisplayObject);

            resolve(that._DisplayList);
        });
    }

    Dispose(): void {
        this._DisplayList = null;
        this._DisplayObject = null;
    }
}