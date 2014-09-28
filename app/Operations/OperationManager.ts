
import IOperation = require("./IOperation");
import IUndoableOperation = require("./IUndoableOperation");
import IAsynchronousOperation = require("./IAsynchronousOperation");
import OperationManagerEventArgs = require("./OperationManagerEventArgs");

enum CommandTypes{
    GOTO_NEXT = 0,
    GOTO_PREV = 1,
    ADD_OPERATION = 4
}

class OperationManager {

    private _Operations: Array<IOperation>;

    private _OperationExecuting:Boolean = false;
    private _CurrentOperation:IOperation;
//    _OperationTimeTable:Dictionary;

    OperationAdded = new MulticastEvent<OperationManagerEventArgs>();
    OperationComplete = new MulticastEvent<OperationManagerEventArgs>();
    Change = new MulticastEvent<OperationManagerEventArgs>();
    AllOperationsComplete = new MulticastEvent<OperationManagerEventArgs>();
    OperationBegin = new MulticastEvent<OperationManagerEventArgs>();

    private _Commands:Array<Command>;

    get NumOperations():number {
        return this._Operations.length;
    }

    get CurrentOperation():IOperation {
        return this._CurrentOperation;
    }

    get CurrentOperationIndex(): number {
        return this._Operations.indexOf(this.CurrentOperation);
    }

    constructor() {
        this._Operations = [];
        this._Commands = [];
//        this._OperationTimeTable = new Dictionary(true);
    }

    AddOperation(operation:IOperation, autoExecute:boolean = true):void {
        this._AddCommand(new Command(CommandTypes.ADD_OPERATION, operation));
        if (autoExecute){
            this._AddCommand(new Command(CommandTypes.GOTO_NEXT));
        }
        this._CheckCommands();
    }

    private _CheckCommands():void {
        if (this._OperationExecuting) return;
        if (this._Commands.length == 0) return;

        var command:Command = this._Commands.shift();
        var currentIndex:number = this.CurrentOperationIndex;

        switch(command.Type){
            case CommandTypes.GOTO_NEXT :
                if (currentIndex + 1 < this._Operations.length) {
                    this._CurrentOperation = this._Operations[currentIndex + 1];
                    this._ExecuteOperation(this.CurrentOperation);
                }
                break;
            case CommandTypes.GOTO_PREV :
                if (this.CurrentOperation) {
                    this.UndoOperation(<IUndoableOperation>this.CurrentOperation);
                }
                break;
            case CommandTypes.ADD_OPERATION :
                // Destroy all operations in the future as they are now invalidated
                var i:number = currentIndex + 1;
                while (i < this._Operations.length) {
                    // todo: does this need to be a loop?
                    this._Operations.splice(i, 1);
                }

                this._Operations.push(command.Operation);

                this.OperationAdded.Raise(this, new OperationManagerEventArgs(command.Operation));
                this.Change.Raise(this, new OperationManagerEventArgs());
                break;
        }

        this._CheckCommands();
    }

    private _OnOperationComplete(operation:IOperation, undo:Boolean = false):void {
        this._OperationExecuting = false;

        //var currentTime:number = Date.now();
        //var startTime:number = this._OperationTimeTable[operation];
        //var elapsedTime:number = currentTime - startTime;
        //delete this._OperationTimeTable[operation];

        this.OperationComplete.Raise(this, new OperationManagerEventArgs(operation));

        // if not an undoable operation
        if (!(<IUndoableOperation>operation).Undo) {
            while (this._Operations.indexOf(operation) != -1) {
                this._Operations.splice(0, 1);
            }
        }

        if (undo) {
            var index:number = this.CurrentOperationIndex;
            if (index == 0) {
                this._CurrentOperation = null;
            } else {
                this._CurrentOperation = this._Operations[index - 1];
            }
        }

        this.Change.Raise(this, new OperationManagerEventArgs());

        if (this._Commands.length == 0) {
            this.AllOperationsComplete.Raise(this, new OperationManagerEventArgs());
        }

        this._CheckCommands();
    }

    private _AddCommand(command:Command):void {
        this._Commands.push(command);
    }

    private _ExecuteOperation(operation:IOperation):void {
        //this._OperationTimeTable[operation] = Date.now();

//        if ( operation is IAsynchronousOperation )
//        {
//            var asynchronousOperation:IAsynchronousOperation = IAsynchronousOperation( operation );
//            asynchronousOperation.addEventListener( Event.COMPLETE, operationCompleteHandler );
//            asynchronousOperation.addEventListener( ErrorEvent.ERROR, operationErrorHandler, false, 10 );
//            asynchronousOperation.addEventListener( OperationProgressEvent.PROGRESS, operationProgressHandler );
//            this._OperationExecuting = true;
//            dispatchEvent( new OperationManagerEvent( OperationManagerEvent.OPERATION_BEGIN, operation ) );
//            //trace("OperationManager. Executing Operation : " + operation.label);
//            operation.execute();
//            return;
//        }
//        else
//        {
        this.OperationBegin.Raise(this, new OperationManagerEventArgs(operation));
        this._OperationExecuting = true;
        //trace("OperationManager. Executing Operation : " + operation.label);
        operation.Execute();
        this._OperationExecuting = false;
        this._OnOperationComplete(operation);
//        }
    }

    UndoOperation(operation:IUndoableOperation):void {
        //this._OperationTimeTable[operation] = Date.now();

//        if ( operation is IAsynchronousOperation )
//        {
//            var asynchronousOperation:IAsynchronousOperation = IAsynchronousOperation( operation );
//            asynchronousOperation.addEventListener( Event.COMPLETE, operationUndoCompleteHandler );
//            asynchronousOperation.addEventListener( ErrorEvent.ERROR, operationErrorHandler, false, 10 );
//            asynchronousOperation.addEventListener( OperationProgressEvent.PROGRESS, operationProgressHandler );
//            this._OperationExecuting = true;
//            dispatchEvent( new OperationManagerEvent( OperationManagerEvent.OPERATION_BEGIN, operation ) );
//            //trace("OperationManager. Undoing Operation : " + operation.label);
//            operation.undo();
//            return;
//        }
//        else
//        {
        //trace("OperationManager. Undoing Operation : " + operation.label);
        operation.Undo();
        this.OperationComplete.Raise(this, new OperationManagerEventArgs(operation));
        this._OnOperationComplete(operation, true);
//        }
    }

//    OperationUndoCompleteHandler(event:Event):void {
//        var operation:IAsynchronousOperation = IAsynchronousOperation(event.target);
//        operation.removeEventListener( Event.COMPLETE, operationUndoCompleteHandler );
//        operation.removeEventListener( ErrorEvent.ERROR, operationErrorHandler );
//        operation.removeEventListener( OperationProgressEvent.PROGRESS, operationProgressHandler );
//        this._OperationExecuting = false;
//        this.OperationComplete(operation, true );
//    }
//
//    OperationCompleteHandler(event:Event):void {
//        var operation:IAsynchronousOperation = IAsynchronousOperation(event.target);
//        operation.removeEventListener( Event.COMPLETE, operationUndoCompleteHandler );
//        operation.removeEventListener( ErrorEvent.ERROR, operationErrorHandler );
//        operation.removeEventListener( OperationProgressEvent.PROGRESS, operationProgressHandler );
//        this._OperationExecuting = false;
//        this.OperationComplete(operation);
//    }
//
//    OperationErrorHandler( event:ErrorEvent ):void {
//        event.stopImmediatePropagation();
//
//        var operation:IAsynchronousOperation = IAsynchronousOperation(event.target);
//        operation.removeEventListener( Event.COMPLETE, operationUndoCompleteHandler );
//        operation.removeEventListener( ErrorEvent.ERROR, operationErrorHandler );
//        operation.removeEventListener( OperationProgressEvent.PROGRESS, operationProgressHandler );
//        this._OperationExecuting = false;
//        this.OperationComplete(operation);
//
//        operation.dispatchEvent(event);
//    }

//    OperationProgressHandler(event:OperationProgressEvent):void {
//        //dispatchEvent( new OperationManagerEvent( OperationManagerEvent.OPERATION_PROGRESS, IOperation( event.target ), event.progress ) );
//
//        this.OperationProgress.Raise(this, new OperationManagerEventArgs(command.Operation));
//    }

    private _GotoOperation(index:number):void {
        if (this._CurrentOperation == null) return;

        var indexOffset:number = index - this.CurrentOperationIndex;

        for (var command in this._Commands) {
            if (command.Type == CommandTypes.GOTO_NEXT) {
                indexOffset--;
            } else if (command.Type == CommandTypes.GOTO_PREV) {
                indexOffset++;
            }
        }

        if (indexOffset == 0) return;

        if (indexOffset < 0) {
            while (indexOffset < 0) {
                this._AddCommand(new Command(CommandTypes.GOTO_PREV));
                indexOffset++;
            }
        } else {
            while (indexOffset > 0) {
                this._AddCommand(new Command(CommandTypes.GOTO_NEXT));
                indexOffset--;
            }
        }

        this._CheckCommands();
    }

    private _GotoNextOperation():void {
        this._AddCommand(new Command(CommandTypes.GOTO_NEXT));
        this._CheckCommands();
    }

    private _GotoPreviousOperation():void {
        this._AddCommand(new Command(CommandTypes.GOTO_PREV));
        this._CheckCommands();
    }

    private _IsUndoAvailable():Boolean {
        return this._Operations.indexOf(this._CurrentOperation) > -1;
    }

    private _IsRedoAvailable():Boolean {
        return this._Operations.indexOf(this._CurrentOperation) < this._Operations.length-1;
    }

    private _GetOperations():Array<IOperation> {
        return this._Operations.slice();
    }
}

class Command{

    public Type: CommandTypes;
    public Operation: IOperation;

    constructor(type: CommandTypes, operation?: IOperation){
        this.Type = type;
        if (operation) this.Operation = operation;
    }
}

export = OperationManager;