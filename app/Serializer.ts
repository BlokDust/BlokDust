import IEffect = require("./Blocks/IEffect");
import ISource = require("./Blocks/ISource");
import IBlock = require("./Blocks/IBlock");
import Grid = require("./Grid");
import ToneSource = require("./Blocks/Sources/ToneSource");
import BitCrusher = require("./Blocks/Effects/Post/BitCrusher");
import BlockCreator = require("./BlockCreator");
import SaveFile = require("./SaveFile");
import Version = require("./_Version");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Serializer {

    private static _Debug = false;
    private static _SerializationDictionary: any;
    private static _DeserializationDictionary: any;

    public static Serialize(): string{

        if (this._Debug) console.log("START SERIALIZATION");

        var blocks = App.Blocks;

        if (this._Debug) {
            console.log("BLOCKS", blocks);
        }

        this._SerializationDictionary = {};

        // add all block ids to the dictionary.
        for (var i = 0; i < blocks.length; i++){
            var b = blocks[i];

            this._SerializationDictionary[b.Id] = false;
        }

        if (this._Debug) {
            console.log("DICTIONARY", this._SerializationDictionary);
        }

        var json = {
            ZoomLevel: App.ZoomLevel,
            DragOffset: App.DragOffset,
            Composition: [],
            Version: Version.Version
        };

        this._SerializeBlocks(json.Composition, blocks);

        var result = JSON.stringify(json);

        if (this._Debug) {
            console.log("END SERIALIZATION", result);
        }

        return result;
    }

    private static _SerializeBlocks(list: any[], blocks: any[], parentBlock?: any): void {
        for(var i = 0; i < blocks.length; i++) {

            var b = this._SerializeBlock(blocks[i], parentBlock);

            if (b) list.push(b);

            if (this._Debug) {
                console.log("DICTIONARY", this._SerializationDictionary);
                console.log("SERIALIZED LIST", list);
            }
        }
    }

    private static _GetBlockSerializationType(block: IBlock): string {
        return (<any>block).constructor.name;
    }

    private static _SerializeBlock(block: IBlock, parentBlock?: any): any {

        if (this._Debug) {
            console.log("SERIALIZING", block);
        }

        var d = this._SerializationDictionary[block.Id];

        if (d) {
            if (this._Debug) {
                console.log("ALREADY SERIALIZED");
            }
            return;
        }

        this._SerializationDictionary[block.Id] = true;

        var b: any = {};

        b.Id = block.Id;
        b.Type = this._GetBlockSerializationType(block);
        b.Position = block.Position;
        if (block.Params) b.Params = block.Params;

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

    public static Deserialize(json: string): SaveFile{

        this._DeserializationDictionary = {};

        var parsed: any = JSON.parse(json);

        var saveFile = new SaveFile();
        saveFile.ZoomLevel = parsed.ZoomLevel;
        saveFile.DragOffset = new Point(parsed.DragOffset.x, parsed.DragOffset.y);
        saveFile.Composition = this._DeserializeBlocks(parsed.Composition);

        return saveFile;
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
        if (!(b.Id != null && b.Id.isInteger()) && Serializer._DeserializationDictionary[b]){
            block = Serializer._DeserializationDictionary[b];
        } else {
            block = this._GetBlockDeserializationType(b);

            block.Id = b.Id;
            block.Position = new Point(b.Position.x, b.Position.y);
            block.LastPosition = new Point(b.Position.x, b.Position.y);
            block.Params = b.Params;
            block.Type = this._GetBlockDeserializationType(b);

            Serializer._DeserializationDictionary[b.Id] = block;
        }

        // if it's a source block
        if((<ISource>b).Effects){
            var effects = <IEffect[]>Serializer._DeserializeBlocks(b.Effects);
            (<ISource>block).Effects.AddRange(effects);
        }

        // if it's an effect block
        if((<IEffect>b).Sources){
            var sources = <ISource[]>Serializer._DeserializeBlocks(b.Sources);
            (<IEffect>block).Sources.AddRange(sources);
        }

        return block;
    }

    private static _GetBlockDeserializationType(b: any): IBlock {
        return BlockCreator.GetBlock(b.Type);
    }
}

export = Serializer;