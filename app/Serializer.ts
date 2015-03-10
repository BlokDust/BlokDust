import IEffect = require("./Blocks/IEffect");
import ISource = require("./Blocks/ISource");
import IBlock = require("./Blocks/IBlock");
import Grid = require("./Grid");
import ToneSource = require("./Blocks/Sources/ToneSource");
import BitCrusher = require("./Blocks/Effects/BitCrusher");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Serializer {

    // todo: is there a way to make these block types available without needing to instantiate them?
    private static ToneSource: ToneSource = new ToneSource();
    private static BitCrusher: BitCrusher = new BitCrusher();

    private static _SerializationDictionary: any;
    private static _DeserializationDictionary: any;

    public static Serialize(blocks: any[]): string{

        this._SerializationDictionary = {};

        // add all blocks to the dictionary.
        for (var i = 0; i < blocks.length; i++){
            var b = blocks[i];

            this._SerializationDictionary[b.Id] = false;
        }

        var json = {
            Composition: []
        };

        this._SerializeBlocks(json.Composition, blocks);

        return JSON.stringify(json);
    }

    private static _SerializeBlocks(list: any[], blocks: any[], parentBlock?: any): void {
        for(var i = 0; i < blocks.length; i++) {

            var b = this._SerializeBlock(blocks[i], parentBlock);

            if (b) list.push(b);
        }
    }

    private static _GetBlockType(block: IBlock): string {
        return (<any>block).constructor.name;
    }

    private static _SerializeBlock(block: IBlock, parentBlock?: any): any {

        var d = this._SerializationDictionary[block.Id];

        if (d) {
            return;
        }

        this._SerializationDictionary[block.Id] = true;

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

            this._SerializeBlocks(b.Effects, (<ISource>block).Effects.ToArray(), b);
        }

        // if it's an effect block
        if ((<IEffect>block).Sources && (<IEffect>block).Sources.Count){
            b.Sources = [];

            if (parentBlock){
                b.Sources.push(parentBlock.Id);
            }

            this._SerializeBlocks(b.Sources, (<IEffect>block).Sources.ToArray(), b);
        }

        return b;
    }

    public static Deserialize(json: string): IBlock[]{

        this._DeserializationDictionary = {};

        var parsed: any = JSON.parse(json);

        var blocks = this._DeserializeBlocks(parsed.Composition);

        return blocks;
    }

    private static _DeserializeBlocks(blocks: any[]): IBlock[] {

        var deserializedBlocks: IBlock[] = [];

        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];

            var block = this._DeserializeBlock(b);

            deserializedBlocks.push(block);
        }

        return deserializedBlocks;
    }

    private static _DeserializeBlock(b: any): IBlock {

        var block: IBlock;

        // if it's an id and has already been deserialized, return it.
        if (!(b.Id != null && b.Id.isInt()) && Serializer._DeserializationDictionary[b]){
            block = Serializer._DeserializationDictionary[b];
        } else {
            block = eval("new " + b.Type + "()");

            block.Id = b.Id;
            block.Position = new Point(b.Position.x, b.Position.y);
            block.LastPosition = new Point(b.Position.x, b.Position.y);
            block.ParamJson = b.Params;
            block.Init(App.BlocksSketch);

            Serializer._DeserializationDictionary[b.Id] = block;
        }

        // todo: use reflection
        // if it's a source block
        if((<ISource>b).Effects){
            var effects = <IEffect[]>Serializer._DeserializeBlocks(b.Effects);
            (<ISource>block).Effects.AddRange(effects);
        }

        // if it's an effect b
        if((<IEffect>b).Sources){
            var sources = <ISource[]>Serializer._DeserializeBlocks(b.Sources);
            (<IEffect>block).Sources.AddRange(sources);
        }

        console.log(block);

        return block;
    }
}

export = Serializer;