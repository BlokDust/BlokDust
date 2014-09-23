/// <reference path="./refs" />

import IBlock = require("./Blocks/IBlock");
import IModifiable = require("./Blocks/IModifiable");
import Input = require("./Blocks/Input");
import IModifier = require("./Blocks/IModifier");
import Output = require("./Blocks/Output");
import Power = require("./Blocks/Power");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class BlocksView extends Fayde.Drawing.SketchContext {

    public Sources: ObservableCollection<IModifiable> = new ObservableCollection<IModifiable>();
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();
    public SourceSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public ModifierSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _SelectedBlock: IBlock;
    private _Id: number = 0;
    private _Blocks: IBlock[];
    private _IsMouseDown: boolean = false;

    get SelectedBlock(): IBlock {
        return this._SelectedBlock;
    }

    set SelectedBlock(block: IBlock) {
        if (this.SelectedBlock != null){
            this.SelectedBlock.IsSelected = false;
        }

        block.IsSelected = true;
        this._SelectedBlock = block;
    }

    get Blocks(): IBlock[]{
        if (!this._Blocks){
            this._Blocks = [].concat(this.Sources.ToArray(), this.Modifiers.ToArray());
        }

        return this._Blocks;
    }

    constructor() {
        super();

        // invalidate Blocks list so it gets recreated.
        this.Sources.CollectionChanged.Subscribe(() => {
            this._Blocks = null;
        }, this);

        this.Modifiers.CollectionChanged.Subscribe(() => {
            this._Blocks = null;
        }, this);
    }

    Setup(){
        super.Setup();
    }

    CreateSource<T extends IModifiable>(m: {new(position: Point): T; }){
        var source: IModifiable = new m(this.GetRandomPosition());
        source.Id = this.GetId();

        source.Click.Subscribe((e: IModifiable) => {
            this.OnSourceSelected(e);
        }, this);

        this.Sources.Add(source);

        this._CheckProximity();
    }

    CreateModifier<T extends IModifier>(m: {new(position: Point): T; }){
        var modifier: IModifier = new m(this.GetRandomPosition());
        modifier.Id = this.GetId();

        modifier.Click.Subscribe((e: IModifier) => {
            this.OnModifierSelected(e);
        }, this);

        this.Modifiers.Add(modifier);

        this._CheckProximity();
    }

    GetId(): number {
        return this._Id++;
    }

    GetRandomPosition(): Point{
        return new Point(Math.randomBetween(this.Width), Math.randomBetween(this.Height));
    }

    Update() {
        super.Update();

        // update blocks
        for (var i = 0; i < this.Blocks.length; i++) {
            var block = this.Blocks[i];
            block.Update();
        }
    }

    Draw(){
        super.Draw();

        // clear
        this.Ctx.fillStyle = "#d7d7d7";
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        // draw blocks
        for (var i = 0; i < this.Blocks.length; i++) {
            var block = this.Blocks[i];
            block.Draw(this.Ctx);
        }
    }

    _CheckProximity(){
        // loop through all Modifier blocks checking proximity to Source blocks.
        // if within CatchmentArea, add to Targets.
        var modifiers = this.Modifiers.ToArray();
        var sources = this.Sources.ToArray();

        for (var i = 0; i < modifiers.length; i++) {
            var modifier:IModifier = modifiers[i];

            // clear targets
            modifier.Targets = new ObservableCollection<IModifiable>();

            for (var j = 0; j < sources.length; j++) {
                var source:IModifiable = sources[j];
                if (source.DistanceFrom(modifier.Position) <= modifier.CatchmentArea) {
                    modifier.Targets.Add(source);
                }
            }
        }
    }

    MouseDown(point: Point){
        this._IsMouseDown = true;

        for (var i = 0; i < this.Blocks.length; i++){
            var block = this.Blocks[i];
            if (block.HitTest(point)) break;
        }
    }

    MouseUp(point: Point){
        this._IsMouseDown = false;

        if (this._SelectedBlock){
            this._SelectedBlock.MouseUp();
        }

        this._CheckProximity();
    }

    MouseMove(point: Point){
        if (this._SelectedBlock){
            this._SelectedBlock.MouseMove(point);
        }

        if (!this._IsMouseDown) return;

        this._CheckProximity();
    }

    OnSourceSelected(source: IModifiable){
        this.SelectedBlock = source;
        this.SourceSelected.Raise(source, new Fayde.RoutedEventArgs());
    }

    OnModifierSelected(modifier: IModifier){
        this.SelectedBlock = modifier;
        this.ModifierSelected.Raise(modifier, new Fayde.RoutedEventArgs());
    }

    DeleteSelectedBlock(){
        if (this.Sources.Contains(<any>this._SelectedBlock)){
            this.Sources.Remove(<any>this._SelectedBlock);
            this._CheckProximity();
        }

        if (this.Modifiers.Contains(<any>this._SelectedBlock)){
            this.Modifiers.Remove(<any>this._SelectedBlock);
            this._CheckProximity();
        }
    }
}

export = BlocksView;