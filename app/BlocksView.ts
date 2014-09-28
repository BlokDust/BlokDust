/// <reference path="./refs" />

import IBlock = require("./Blocks/IBlock");
import IModifiable = require("./Blocks/IModifiable");
import IModifier = require("./Blocks/IModifier");
import AddItemToObservableCollectionOperation = require("./Operations/AddItemToObservableCollectionOperation");
import OperationManager = require("./Operations/OperationManager");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import IOperation = require("./Operations/IOperation");
import IUndoableOperation = require("./Operations/IUndoableOperation");

class BlocksView extends Fayde.Drawing.SketchContext {

    public Sources: ObservableCollection<IModifiable> = new ObservableCollection<IModifiable>();
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();
    public SourceSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public ModifierSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _SelectedBlock: IBlock;
    private _Id: number = 0;
    private _Blocks: IBlock[];
    private _IsMouseDown: boolean = false;
    private _OperationManager: OperationManager;

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

        this._OperationManager = new OperationManager();

        this.Sources.CollectionChanged.Subscribe(() => {
            this._Invalidate();
        }, this);

        this.Modifiers.CollectionChanged.Subscribe(() => {
            this._Invalidate();
        }, this);
    }

    // called whenever the Sources or Modifiers collections change.
    _Invalidate(){

        // invalidate Blocks list so it gets recreated.
        this._Blocks = null;

        this._CheckProximity();
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

//        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(source, this.Sources);
//        this._OperationManager.AddOperation(op);

        this.Sources.Add(source);
    }

    CreateModifier<T extends IModifier>(m: {new(position: Point): T; }){
        var modifier: IModifier = new m(this.GetRandomPosition());
        modifier.Id = this.GetId();

        modifier.Click.Subscribe((e: IModifier) => {
            this.OnModifierSelected(e);
        }, this);

//        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(modifier, this.Sources);
//        this._OperationManager.AddOperation(op);

        this.Modifiers.Add(modifier);
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
        // if within CatchmentArea, add Modifier to Source.Modifiers.
        var modifiers = this.Modifiers.ToArray();
        var sources = this.Sources.ToArray();

        for (var i = 0; i < modifiers.length; i++) {
            var modifier:IModifier = modifiers[i];

            for (var j = 0; j < sources.length; j++) {
                var source:IModifiable = sources[j];

                // if a source is close enough to the modifier, add the modifier
                // to its internal list.
                if (source.DistanceFrom(modifier.Position) <= modifier.CatchmentArea) {
                    if (!source.Modifiers.Contains(modifier)){
                        source.AddModifier(modifier);
                    }
                } else {
                    // if the source already has the modifier on its internal list
                    // remove it as it's now too far away.
                    if (source.Modifiers.Contains(modifier)){
                        source.RemoveModifier(modifier);
                    }
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
            this._SelectedBlock = null;
            this._CheckProximity();
            return;
        }

        if (this.Modifiers.Contains(<any>this._SelectedBlock)){
            this.DeleteModifier(<IModifier>this._SelectedBlock);
            this.Modifiers.Remove(<any>this._SelectedBlock);
            this._SelectedBlock = null;
            this._CheckProximity();
            return;
        }
    }

    DeleteModifier(modifier: IModifier){
        // loop through sources.
        // for each source with this modifier, remove it.
        var sources = this.Sources.ToArray();

        for (var i = 0; i < sources.length; i++){
            var source = sources[i];

            if (source.Modifiers.Contains(modifier)){
                source.Modifiers.Remove(modifier);
            }
        }
    }

    Undo(){
        //this._OperationManager.UndoOperation();
    }
}

export = BlocksView;