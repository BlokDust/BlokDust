/// <reference path="../refs" />

import IOperation = require("./IOperation");
import IUndoableOperation = require("./IUndoableOperation");
import OperationManagerEventArgs = require("./OperationManagerEventArgs");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class OperationManager {

    private _Operations: ObservableCollection<IOperation>;
    private _Head: number = 0;

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
        } else if (this.Head != this._Operations.Count){
            // if Head isn't at end of _Operations, trim those ahead of it.
            var trimmed = this._Operations.ToArray().splice(0, this.Head);
            this._Operations.Clear();
            this._Operations.AddRange(trimmed);
        }

        this._Operations.Add(operation);

        this.Head = this._Operations.Count;

        return operation.Do().then((result) => {
            this.OperationAdded.Raise(operation, new Fayde.RoutedEventArgs());
            return result;
        });
    }

    public Undo(): Promise<any> {

        if (!this.CanUndo()) return this.RejectedPromise;

        this.Head--;

        var operation = this._Operations.GetValueAt(this.Head);

        return (<IUndoableOperation>operation).Undo().then((result) => {
            this.OperationComplete.Raise(operation, new Fayde.RoutedEventArgs());
            return result;
        });
    }

    public Redo(): Promise<any> {

        if (!this.CanRedo()) return this.RejectedPromise;

        var operation = this._Operations.GetValueAt(this.Head);

        this.Head++;

        return operation.Do().then((result) => {
            this.OperationComplete.Raise(operation, new Fayde.RoutedEventArgs());
            return result;
        });
    }

    private get RejectedPromise(): Promise<any>{
        return new Promise(function(undefined, reject) {
            reject(Error("rejected"));
        });
    }

    public CanUndo(): boolean {
        return this.Head > 0;
    }

    public CanRedo(): boolean {
        return this.Head < this._Operations.Count;
    }
}

export = OperationManager;