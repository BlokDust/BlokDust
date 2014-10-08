/// <reference path="../refs" />

import IOperation = require("./IOperation");
import IUndoableOperation = require("./IUndoableOperation");
import OperationManagerEventArgs = require("./OperationManagerEventArgs");
import ObservableCollection = Fayde.Collections.ObservableCollection;

// todo: use promises for all operations, so there's no difference between sync and async
// operations return a 'thenable' promise.
// manager maintains a stack of promises moving a 'head' index back and forth.
// when the head isn't at the end of the stack and an operation is added to the stack
// this invalidates future operations, so remove them.

class OperationManager {

    private _Operations: ObservableCollection<IOperation>;
    private _Head: number = 0;

//    private _CurrentOperation:IOperation;
//
//    OperationAdded = new MulticastEvent<OperationManagerEventArgs>();
//    OperationBegin = new MulticastEvent<OperationManagerEventArgs>();
//    OperationComplete = new MulticastEvent<OperationManagerEventArgs>();
//    AllOperationsComplete = new MulticastEvent<OperationManagerEventArgs>();


//    get CurrentOperation():IOperation {
//        return this._CurrentOperation;
//    }
//
//    get CurrentOperationIndex(): number {
//        return this._Operations.IndexOf(this.CurrentOperation);
//    }

    set Head(value: number){
        this._Head = value;
        console.log("Head at: " + this._Head);
    }

    get Head(): number {
        return this._Head;
    }

    constructor() {
        this._Operations = new ObservableCollection<IOperation>();

        this._Operations.CollectionChanged.Subscribe(() => {
            console.log("operations length: " + this._Operations.Count);
        }, this);
    }

    public Do(operation:IOperation): Promise<any> {

        // if a non-undoable operation is added, warn the user
        // and clear _Operations.
        if (!(<IUndoableOperation>operation).Undo){
            console.warn("this operation is not undoable");
            this._Operations.Clear();
        } else if (this.Head != this._Operations.Count){
            // if Head isn't at end of _Operations, trim those ahead of it.
            var trimmed = this._Operations.ToArray().splice(0, this.Head);
            this._Operations.Clear();
            this._Operations.AddRange(trimmed);
        }

        this._Operations.Add(operation);

        this.Head = this._Operations.Count;

        return operation.Do();
    }

    public Undo(): Promise<any> {

        if (!this._CanUndo()) return this.RejectedPromise;

        this.Head--;

        var operation = this._Operations.GetValueAt(this.Head);

        return (<IUndoableOperation>operation).Undo();
    }

    public Redo(): Promise<any> {

        if (!this._CanRedo()) return this.RejectedPromise;

        var operation = this._Operations.GetValueAt(this.Head);

        this.Head++;

        return operation.Do();
    }

    private get RejectedPromise(): Promise<any>{
        return new Promise(function(undefined, reject) {
            reject(Error("rejected"));
        });
    }

    private _CanUndo(): boolean {
        return this.Head > 0;
    }

    private _CanRedo(): boolean {
        return this.Head < this._Operations.Count;
    }
}

export = OperationManager;