import IDisplayObject = etch.drawing.IDisplayObject;
import {CompoundOperation} from '../Core/Operations/CompoundOperation';
import {IApp} from '../IApp';
import {ICompoundOperation} from '../Core/Operations/ICompoundOperation';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';
import {MoveBlockOperation} from './MoveBlockOperation';
import {RemoveDisplayObjectOperation} from './RemoveDisplayObjectOperation';
import {RemoveItemFromArrayOperation} from '../Core/Operations/RemoveItemFromArrayOperation';

declare var App: IApp;

export class DeleteBlockOperation<IBlock> extends CompoundOperation<IBlock> implements IUndoableOperation, ICompoundOperation {

    private _Block: IBlock;

    constructor(block: IBlock) {
        super();
        this._Block = block;


        this.Operations.push(new MoveBlockOperation(block));
        this.Operations.push(new RemoveDisplayObjectOperation(<any>block, App.MainScene.BlocksContainer.displayList));
        this.Operations.push(new RemoveItemFromArrayOperation(<any>block, App.Blocks));
        (<any>this._Block).Stop(); // TODO: await Remove ItemFromArrayOperation to finish first?
        //console.log(App.Blocks);
        //setTimeout(function() {console.log(App.Blocks)}, 1000);
    }

    Do(): Promise<void> {
        return super.Do();
    }

    Undo(): Promise<void> {
        return super.Undo();
    }

    Dispose(): void {
        (<any>this._Block).Dispose();
        this._Block = null;
    }
}