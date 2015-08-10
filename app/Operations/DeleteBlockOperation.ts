import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import ICompoundOperation = require("../Core/Operations/ICompoundOperation");
import CompoundOperation = require("../Core/Operations/CompoundOperation");
import RemoveItemFromArrayOperation = require("../Core/Operations/RemoveItemFromArrayOperation");
import RemoveDisplayObjectOperation = require("./RemoveDisplayObjectOperation");
import MoveBlockOperation = require("./MoveBlockOperation");
import IBlock = require("../Blocks/IBlock");
import IDisplayObject = require("../IDisplayObject");

class DeleteBlockOperation<IBlock> extends CompoundOperation<IBlock> implements IUndoableOperation, ICompoundOperation
{
    private _Block: IBlock;

    // todo: why is it necessary to cast block as 'any'??

    constructor(block: IBlock) {
        super();
        this._Block = block;

        (<any>this._Block).Stop();
        this.Operations.push(new MoveBlockOperation(block));
        this.Operations.push(new RemoveDisplayObjectOperation(<any>block, App.Stage.DisplayList));
        this.Operations.push(new RemoveItemFromArrayOperation(block, App.Blocks));
    }

    Do(): Promise<IBlock> {
        return super.Do();
    }

    Undo(): Promise<IBlock> {
        return super.Undo();
    }

    Dispose(): void {
        (<any>this._Block).Dispose();
        this._Block = null;
    }
}

export = DeleteBlockOperation;