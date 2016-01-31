import {Effect} from './Blocks/Effect';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {IEffect} from './Blocks/IEffect';
import {ISource} from './Blocks/ISource';
import ObservableCollection = etch.collections.ObservableCollection;
import Point = etch.primitives.Point;
import {SaveFile} from './SaveFile';
import {Source} from './Blocks/Source';
import {Version as Version} from './_Version';

declare var App: IApp;

export class Serializer {

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

        var json: SaveFile = <SaveFile>{
            ColorThemeNo: App.ThemeManager.CurrentThemeNo,
            Composition: [],
            DragOffset: App.DragOffset,
            Parent: (App.CompositionId) ? App.CompositionId : "",
            Version: Version,
            ZoomLevel: App.ZoomLevel
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
        b.ZIndex = block.ZIndex;
        if (block.Params) b.Params = block.Params;

        // if it's a source block
        if (block instanceof Source && (<ISource>block).Connections.Count){
        //if ((<ISource>block).Effects && (<ISource>block).Effects.Count){
            b.Effects = [];

            if (parentBlock){
                b.Effects.push(parentBlock.Id);
            }

            this._SerializeBlocks(b.Effects, (<ISource>block).Connections.ToArray(), b);
        }

        // if it's an effect block
        if (block instanceof Effect && (<IEffect>block).Connections.Count){
            b.Sources = [];

            if (parentBlock){
                b.Sources.push(parentBlock.Id);
            }

            this._SerializeBlocks(b.Sources, (<IEffect>block).Connections.ToArray(), b);
        }

        return b;
    }

    public static Deserialize(json: string): SaveFile{

        this._DeserializationDictionary = {};

        var parsed: any = JSON.parse(json);

        var saveFile = new SaveFile();
        saveFile.ZoomLevel = parsed.ZoomLevel;
        if (parsed.DragOffset) {
            saveFile.DragOffset = new Point(parsed.DragOffset.x, parsed.DragOffset.y);
        } else {
            saveFile.DragOffset = new Point(0, 0);
            saveFile.ZoomLevel = 1;
        }

        saveFile.Composition = this._DeserializeBlocks(parsed.Composition);
        saveFile.ColorThemeNo = parsed.ColorThemeNo;

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
            block.ZIndex = b.ZIndex;

            Serializer._DeserializationDictionary[b.Id] = block;
        }

        // if it's a source block
        if((<any>b).Effects){
            var effects = <IEffect[]>Serializer._DeserializeBlocks(b.Effects);
            (<ISource>block).Connections.AddRange(effects);
        }

        // if it's an effect block
        if((<any>b).Sources){
            var sources = <ISource[]>Serializer._DeserializeBlocks(b.Sources);
            (<IEffect>block).Connections.AddRange(sources);
        }

        return block;
    }

    private static _GetBlockDeserializationType(b: any): IBlock {
        return App.BlockCreator.GetBlock(b.Type);
    }
}
