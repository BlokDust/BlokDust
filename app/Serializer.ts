import App = require("./App");
import IEffect = require("./Blocks/IEffect");
import ISource = require("./Blocks/ISource");
import IBlock = require("./Blocks/IBlock");

class Serializer {

    private static _Dictionary: any;

    public static Serialize(blocks: any[]): string{

        this._Dictionary = {};

        // add all blocks to the dictionary.
        for (var i = 0; i < blocks.length; i++){
            var b = blocks[i];

            this._Dictionary[b.Id] = false;
        }

        var json = {
            Composition: []
        };

        this._ParseBlocks(json.Composition, blocks);

        return JSON.stringify(json);
    }

    private static _ParseBlocks(list: any[], blocks: any[], parentBlock?: any): void {
        for(var i = 0; i < blocks.length; i++) {

            var b = this._ParseBlock(blocks[i], parentBlock);

            if (b) list.push(b);
        }
    }

    private static _GetBlockType(block: IBlock): string {
        return (<any>block).constructor.name;
    }

    private static _ParseBlock(block: IBlock, parentBlock?: any): any {

        var d = this._Dictionary[block.Id];

        if (d) {
            return;
        }

        this._Dictionary[block.Id] = true;

        var b: any =  {};

        b.Id = block.Id;
        b.Type = this._GetBlockType(block);
        b.Position = block.Position;
        if (block.ParamJson) b.Params = block.ParamJson;

        // if it's a source block
        if ((<ISource>block).Effects && (<ISource>block).Effects.Count){
            b.Effects = [];

            if (parentBlock){
                b.Effects.push(parentBlock.Id);
            }

            this._ParseBlocks(b.Effects, (<ISource>block).Effects.ToArray(), b);
        }

        // if it's an effect block
        if ((<IEffect>block).Sources && (<IEffect>block).Sources.Count){
            b.Sources = [];

            if (parentBlock){
                b.Sources.push(parentBlock.Id);
            }

            this._ParseBlocks(b.Sources, (<IEffect>block).Sources.ToArray(), b);
        }

        return b;
    }

    public static Deserialize(json: string): IBlock[]{
        var blocks: IBlock[] = [];



        return blocks;
    }

}

export = Serializer;