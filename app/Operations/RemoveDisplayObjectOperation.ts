import {DisplayList} from '../DisplayList';
import {IDisplayObject} from '../IDisplayObject';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';
import ObservableCollection = Fayde.Collections.ObservableCollection; //TODO: es6 modules

export class RemoveDisplayObjectOperation implements IUndoableOperation {
    private _DisplayList: DisplayList;
    private _DisplayObject: IDisplayObject;
    private _Index: number;

    constructor(displayObject: IDisplayObject, displayList: DisplayList) {
        this._DisplayObject = displayObject;
        this._DisplayList = displayList;
    }

    Do(): Promise<DisplayList> {
        this._Index = this._DisplayList.IndexOf(this._DisplayObject);

        var that = this;

        return new Promise((resolve) => {
            that._DisplayList.Remove(that._DisplayObject);
            resolve(that._DisplayList);
        });
    }

    Undo(): Promise<DisplayList> {
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