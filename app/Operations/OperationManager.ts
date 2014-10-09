/// <reference path="../refs" />

import IOperation = require("./IOperation");
import IUndoableOperation = require("./IUndoableOperation");
import OperationManagerEventArgs = require("./OperationManagerEventArgs");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class OperationManager {

    private _DebugEnabled: boolean = true;
    private _Operations: ObservableCollection<IOperation>;
    private _Head: number = -1;

    OperationAdded: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    OperationBegin: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    OperationComplete: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    set Head(value: number){
        this._Head = value;
    }

    get Head(): number {
        return this._Head;
    }

    constructor() {
        this._Operations = new ObservableCollection<IOperation>();

//        this._Operations.CollectionChanged.Subscribe(() => {
//
//        }, this);
    }

    public Do(operation:IOperation): Promise<any> {

        // if a non-undoable operation is added, warn the user
        // and clear _Operations.
        if (!(<IUndoableOperation>operation).Undo){
            console.warn("this operation is not undoable");
            this._Operations.Clear();
        } else if (this.Head != this._Operations.Count - 1){
            // if Head isn't at end of _Operations, trim those ahead of it.
            var trimmed = this._Operations.ToArray().splice(0, this.Head + 1);
            this._Operations.Clear();
            this._Operations.AddRange(trimmed);
        }

        this._Operations.Add(operation);

        var that = this;

        return operation.Do().then((result) => {
            that.Head = this._Operations.Count - 1;
            that.OperationAdded.Raise(operation, new Fayde.RoutedEventArgs());

            that._Debug();

            return result;
        });
    }

    public Undo(): Promise<any> {

        if (!this.CanUndo()) return this.RejectedPromise;

        var operation = this._Operations.GetValueAt(this.Head);

        var that = this;

        return (<IUndoableOperation>operation).Undo().then((result) => {
            that.Head--;
            that.OperationComplete.Raise(operation, new Fayde.RoutedEventArgs());

            that._Debug();

            return result;
        });
    }

    public Redo(): Promise<any> {

        if (!this.CanRedo()) return this.RejectedPromise;

        var operation = this._Operations.GetValueAt(this.Head + 1);

        var that = this;

        return operation.Do().then((result) => {
            that.Head++;
            that.OperationComplete.Raise(operation, new Fayde.RoutedEventArgs());

            that._Debug();

            return result;
        });
    }

    private _Debug() {

        // draw the operations to the console.
        // ###[]######
        // # = operation
        // [] = head

        var str:string = "";

        for (var i = 0; i < this._Operations.Count; i++) {
            if (this.Head == i){
                str += "[]";
            } else {
                str += "#"
            }
        }

        console.log(str);
    }

    private get RejectedPromise(): Promise<any>{
        return new Promise(function(undefined, reject) {
            reject(Error("rejected"));
        });
    }

    public CanUndo(): boolean {
        return this.Head > -1;
    }

    public CanRedo(): boolean {
        return this.Head < this._Operations.Count - 1;
    }
}

export = OperationManager;