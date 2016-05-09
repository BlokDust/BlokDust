///<amd-dependency path="etch"/>.
import {IOperation} from './IOperation';
import {IUndoableOperation} from './IUndoableOperation';
import Exception = etch.exceptions.Exception;
import ObservableCollection = etch.collections.ObservableCollection;
import RoutedEvent = etch.events.RoutedEvent;
import RoutedEventArgs = etch.events.RoutedEventArgs;

export class OperationManager {

    private _DebugEnabled: boolean = true;
    private _Operations: ObservableCollection<IOperation> = new ObservableCollection<IOperation>();
    private _Head: number = -1;
    private _CurrentOperation: Promise<any>;
    public _MaxOperations: number = 100;

    OperationBegin: RoutedEvent<RoutedEventArgs> = new RoutedEvent<RoutedEventArgs>();
    OperationComplete: RoutedEvent<RoutedEventArgs> = new RoutedEvent<RoutedEventArgs>();

    static CANNOT_UNDO: string = "Cannot undo";
    static CANNOT_REDO: string = "Cannot redo";
    static OPERATION_IN_PROGRESS: string = "Operation in progress";

    set Head(value: number){
        this._Head = value;
    }

    get Head(): number {
        return this._Head;
    }

    set MaxOperations(value: number){
        if (value > 0 && value < Number.MAX_VALUE){
            this._MaxOperations = value;
        } else {
            throw new Exception("Invalid range");
        }
    }

    get MaxOperations(): number {
        return this._MaxOperations;
    }

    constructor() {

    }

    public Do(operation: IOperation): Promise<any> {

        if (this._CurrentOperation) return Promise.reject(Error(OperationManager.OPERATION_IN_PROGRESS));

        // if about to exceed max number of operations, start trimming from start of array.
        if (this._Operations.Count === this.MaxOperations){
            var firstOp = this._Operations.GetValueAt(0);
            firstOp.Dispose();
            var trimmed = this._Operations.ToArray().splice(1, this._Operations.Count - 1);
            this._Operations.Clear();
            this._Operations.AddRange(trimmed);
            this.Head--;
        }

        // if a non-undoable operation is added, warn the user
        // and clear _Operations.
        if (!(<IUndoableOperation>operation).Undo){
            //console.warn("this operation is not undoable");
            this._Operations.Clear();
        } else if (this.Head != this._Operations.Count - 1){
            // if Head isn't at end of _Operations, trim those ahead of it.
            var trimmed = this._Operations.ToArray().splice(0, this.Head + 1);
            this._Operations.Clear();
            this._Operations.AddRange(trimmed);
        }

        this._Operations.Add(operation);

        this.OperationBegin.raise(operation, new RoutedEventArgs());

        var that = this;

        return this._CurrentOperation = operation.Do().then((result) => {
            that._CurrentOperation = null;
            that.Head = this._Operations.Count - 1;
            that.OperationComplete.raise(operation, new RoutedEventArgs());

            that._Debug();

            return result;
        }).catch((error: string) => {
            // if the operation failed, allow subsequent operations.
            that._CurrentOperation = null;
        });
    }

    public Undo(): Promise<any> {

        if (!this.CanUndo()) return Promise.reject(Error(OperationManager.CANNOT_UNDO));
        if (this._CurrentOperation) return Promise.reject(Error(OperationManager.OPERATION_IN_PROGRESS));

        var operation = this._Operations.GetValueAt(this.Head);

        this.OperationBegin.raise(operation, new RoutedEventArgs());

        var that = this;

        return this._CurrentOperation = (<IUndoableOperation>operation).Undo().then((result) => {
            that._CurrentOperation = null;
            that.Head--;
            that.OperationComplete.raise(operation, new RoutedEventArgs());

            that._Debug();

            return result;
        }).catch((error: string) => {
            // if the operation failed, allow subsequent operations.
            that._CurrentOperation = null;
        });
    }

    public Redo(): Promise<any> {

        if (!this.CanRedo()) return Promise.reject(Error(OperationManager.CANNOT_REDO));
        if (this._CurrentOperation) return Promise.reject(Error(OperationManager.OPERATION_IN_PROGRESS));

        var operation = this._Operations.GetValueAt(this.Head + 1);

        var that = this;

        return this._CurrentOperation = operation.Do().then((result) => {
            that._CurrentOperation = null;
            that.Head++;
            that.OperationComplete.raise(operation, new RoutedEventArgs());

            that._Debug();

            return result;
        }).catch((error: string) => {
            // if the operation failed, allow subsequent operations.
            that._CurrentOperation = null;
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
            if (this.Head === i){
                str += "[]";
            } else {
                str += "#";
            }
        }

        //console.log(str);
    }

    public CanUndo(): boolean {
        return this.Head > 0;
    }

    public CanRedo(): boolean {
        return this.Head < this._Operations.Count - 1;
    }
}