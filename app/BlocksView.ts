/// <reference path="./refs" />

import IBlock = require("./Blocks/IBlock");
import Input = require("./Blocks/Input");
import Modifier = require("./Blocks/Modifier");
import Output = require("./Blocks/Output");
import Power = require("./Blocks/Power");

class BlocksView extends Fayde.Drawing.SketchContext {

    private _Blocks: Array<IBlock> = [];
    public BlockSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _SelectedBlock: IBlock;
    private Id: number = 0;

    constructor() {
        super();
    }

    Setup(){
        super.Setup();
    }

    CreateBlock<T extends IBlock>(c: {new(id: number, position: Point): T; }){
        var block = new c(this.GetId(), this.GetRandomPosition());
        block.Click.Subscribe((b: IBlock) => {
            this.OnBlockSelected(b);
        }, this);
        this._Blocks.push(block);
    }

    GetId(): number {
        return this.Id++;
    }

    GetRandomPosition(): Point{
        return new Point(Math.randomBetween(this.Width), Math.randomBetween(this.Height));
    }

    Draw(){
        super.Draw();

        // clear
        this.Ctx.fillStyle = "#d7d7d7";
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        // draw blocks
        for (var i = 0; i < this._Blocks.length; i++) {
            var block = this._Blocks[i];
            block.Draw(this.Ctx);
        }
    }

    MouseDown(point: Point){
        for (var i = 0; i < this._Blocks.length; i++){
            var block = this._Blocks[i];
            if (block.HitTest(point)) break;
        }
    }

    MouseUp(point: Point){
        if (this._SelectedBlock){
            this._SelectedBlock.MouseUp();
        }
    }

    MouseMove(point: Point){
        if (this._SelectedBlock){
            this._SelectedBlock.MouseMove(point);
        }
    }

    OnBlockSelected(block: IBlock){
        this._SelectedBlock = block;
        this.BlockSelected.Raise(block, new Fayde.RoutedEventArgs());
    }
}

export = BlocksView;