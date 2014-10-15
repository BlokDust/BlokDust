/// <reference path="../../refs" />

import IOperation = require("./IOperation");
import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class OperationManager {

    private _DebugEnabled: boolean = true;
    private _Operations: ObservableCollection<IOperation> = new ObservableCollection<IOperation>();
    private _Head: number = -1;
    private _CurrentOperation: Promise<any>;
    private _MaxOperations: number = 100;

    OperationAdded: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    OperationBegin: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    OperationComplete: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    static CANNOT_UNDO: string = "Cannot undo";
    static CANNOT_REDO: string = "Cannot redo";
    static OPERATION_IN_PROGRESS: string = "Operation in progress";

    set Head(value: number){
        this._Head = value;
    }

    get Head(): number {
        return this._Head;
    }

    constructor() {

    }

    public Do(operation:IOperation): Promise<any> {

        if (this._CurrentOperation) return this._Reject(OperationManager.OPERATION_IN_PROGRESS);

        // if about to exceed max number of operations, start trimming from start of array.
        if (this._Operations.Count == this._MaxOperations){
            var trimmed = this._Operations.ToArray().splice(1, this._Operations.Count - 1);
            this._Operations.Clear();
            this._Operations.AddRange(trimmed);
            this.Head--;
        }

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

        return this._CurrentOperation = operation.Do().then((result) => {
            that._CurrentOperation = null;
            that.Head = this._Operations.Count - 1;
            that.OperationAdded.Raise(operation, new Fayde.RoutedEventArgs());

            that._Debug();

            return result;
        });
    }

    public Undo(): Promise<any> {

        if (!this.CanUndo()) return this._Reject(OperationManager.CANNOT_UNDO);
        if (this._CurrentOperation) return this._Reject(OperationManager.OPERATION_IN_PROGRESS);

        var operation = this._Operations.GetValueAt(this.Head);

        var that = this;

        return this._CurrentOperation = (<IUndoableOperation>operation).Undo().then((result) => {
            that._CurrentOperation = null;
            that.Head--;
            that.OperationComplete.Raise(operation, new Fayde.RoutedEventArgs());

            that._Debug();

            return result;
        });
    }

    public Redo(): Promise<any> {

        if (!this.CanRedo()) return this._Reject(OperationManager.CANNOT_REDO);
        if (this._CurrentOperation) return this._Reject(OperationManager.OPERATION_IN_PROGRESS);

        var operation = this._Operations.GetValueAt(this.Head + 1);

        var that = this;

        return this._CurrentOperation = operation.Do().then((result) => {
            that._CurrentOperation = null;
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

        if (!this._DebugEnabled) return;

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

    private _Reject(errorMessage: string): Promise<any>{
        return new Promise<any>(function(undefined, reject) {
            reject(Error(errorMessage));
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