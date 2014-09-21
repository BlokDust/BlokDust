/// <reference path="./refs" />

import Block = require("./Block");

class BlocksView extends Fayde.Drawing.SketchContext {

    private _Blocks: Array<Block> = [];
    public BlockSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _SelectedBlock: Block;

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

    OnBlockSelected(block: Block){
        this._SelectedBlock = block;
        this.BlockSelected.Raise(block, new Fayde.RoutedEventArgs());
    }
}

export = BlocksView;