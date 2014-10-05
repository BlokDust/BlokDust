
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

    private _CurrentOperation:IOperation;

    OperationAdded = new MulticastEvent<OperationManagerEventArgs>();
    OperationBegin = new MulticastEvent<OperationManagerEventArgs>();
    OperationComplete = new MulticastEvent<OperationManagerEventArgs>();
//    AllOperationsComplete = new MulticastEvent<OperationManagerEventArgs>();


    get CurrentOperation():IOperation {
        return this._CurrentOperation;
    }

    get CurrentOperationIndex(): number {
        return this._Operations.IndexOf(this.CurrentOperation);
    }

    constructor() {
        this._Operations = new ObservableCollection<IOperation>();
    }

    public AddOperation(operation:IOperation, autoExecute:boolean = true):void {
        this._Operations.Add(operation);

        if (autoExecute) {
            this._DoOperation(operation);
        }
    }

    private _DoOperation(operation:IOperation):void {

        this.OperationBegin.Raise(this, new OperationManagerEventArgs(operation));

//        operation.Do().Then(() => {
//            this.OperationComplete.Raise(this, new OperationEventArgs((operation)));
//        });
    }

    private _UndoOperation(operation:IUndoableOperation):void {
//        operation.Undo().Then(() => {
//            this.OperationComplete.Raise(this, new OperationManagerEventArgs(operation));
//        });
    }

//    private _IsUndoAvailable():Boolean {
//        return this.CurrentOperationIndex > -1;
//    }
//
//    private _IsRedoAvailable():Boolean {
//        return this.CurrentOperationIndex < this._Operations.Count - 1;
//    }
}

export = OperationManager;