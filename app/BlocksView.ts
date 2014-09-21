/// <reference path="./refs" />

import SketchContext = require("./SketchContext");
import Block = require("./Block");

class BlocksView extends SketchContext {

    private _Blocks: Array<Block> = [];
    public BlockSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    constructor() {
        super();
    }

    Setup(){
        super.Setup();

        // create blocks
        for (var i = 0; i < 20; i++) {
            var block = new Block(i, Math.randomBetween(this.Width), Math.randomBetween(this.Height));

            block.Click.Subscribe((block: Block) => {
                this.OnBlockSelected(block);
            }, this);

            this._Blocks[i] = block;
        }
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
        this._Blocks.forEach((block: Block) => {
            block.MouseDown(point);
        });
    }

    MouseUp(point: Point){
        this._Blocks.forEach((block: Block) => {
            block.MouseUp(point);
        });
    }

    OnBlockSelected(block: Block){
        this.BlockSelected.Raise(block, new Fayde.RoutedEventArgs());
    }
}

export = BlocksView;