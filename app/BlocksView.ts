/// <reference path="./refs" />

import IBlock = require("./Blocks/IBlock");
import IModifiable = require("./Blocks/IModifiable");
import IModifier = require("./Blocks/IModifier");
import AddItemToObservableCollectionOperation = require("./Operations/AddItemToObservableCollectionOperation");
import RemoveItemFromObservableCollectionOperation = require("./Operations/RemoveItemFromObservableCollectionOperation");
import MovePointOperation = require("./Operations/MovePointOperation");
import OperationManager = require("./Operations/OperationManager");
import IOperation = require("./Operations/IOperation");
import IUndoableOperation = require("./Operations/IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class BlocksView extends Fayde.Drawing.SketchContext {

    public Modifiables: ObservableCollection<IModifiable> = new ObservableCollection<IModifiable>();
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();
    public SourceSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public ModifierSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _SelectedBlock: IBlock;
    private _Id: number = 0;
    Blocks: IBlock[];
    private _IsMouseDown: boolean = false;
    private _IsTouchDown: boolean = false;
    private _OperationManager: OperationManager;

    get SelectedBlock(): IBlock {
        return this._SelectedBlock;
    }

    set SelectedBlock(block: IBlock) {
        this._SelectedBlock = block;
    }

    constructor() {
        super();

        this._OperationManager = new OperationManager();

        this._OperationManager.OperationAdded.Subscribe((operation: IOperation) => {
            this._Invalidate();
        }, this);

        // todo: investigate whether invalidate definitely necessary
        this._OperationManager.OperationComplete.Subscribe((operation: IOperation) => {
            this._Invalidate();
        }, this);

        this.Modifiables.CollectionChanged.Subscribe(() => {
            this._Invalidate();
        }, this);

        this.Modifiers.CollectionChanged.Subscribe(() => {
            this._Invalidate();
        }, this);

        this._Invalidate();
    }

    // called whenever the Sources or Modifiers collections change.
    private _Invalidate(){

        this.Blocks = [].concat(this.Modifiables.ToArray(), this.Modifiers.ToArray());

        this._ValidateBlocks();

        this._CheckProximity();
    }

    _ValidateBlocks() {
        // for each Modifiable, pass it the new list of Modifiers.
        // if the Modifiable contains a Modifier that no longer
        // exists, remove it.
        for (var i = 0; i < this.Modifiables.Count; i++){
            var modifiable: IModifiable = this.Modifiables.GetValueAt(i);

            modifiable.ValidateModifiers(this.Modifiers);
        }
    }

    CreateModifiable<T extends IModifiable>(m: {new(ctx: CanvasRenderingContext2D, position: Point): T; }){
        var modifiable: IModifiable = new m(this.Ctx, this._GetRandomPosition());
        modifiable.Id = this._GetId();

        modifiable.Click.Subscribe((e: IModifiable) => {
            this.OnSourceSelected(e);
        }, this);

        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(modifiable, this.Modifiables);

        this._OperationManager.Do(op).then((list) => {
            console.log(list);
        });
    }

    CreateModifier<T extends IModifier>(m: {new(ctx: CanvasRenderingContext2D, position: Point): T; }){
        var modifier: IModifier = new m(this.Ctx, this._GetRandomPosition());
        modifier.Id = this._GetId();

        modifier.Click.Subscribe((e: IModifier) => {
            this.OnModifierSelected(e);
        }, this);

        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(modifier, this.Modifiers);

        this._OperationManager.Do(op).then((list) => {
//            console.log(list);
        });
    }

    private _GetId(): number {
        return this._Id++;
    }

    private _GetRandomPosition(): Point{
        return new Point(Math.random(), Math.random());
    }

    Setup(){
        super.Setup();
    }

    Update() {
        super.Update();

        // update blocks
        for (var i = 0; i < this.Blocks.length; i++) {
            var block = this.Blocks[i];
            block.Update(this.Ctx);
        }
    }

    Draw(){
        super.Draw();

        // clear
        //this.Ctx.fillStyle = "#d7d7d7";
        //this.Ctx.fillRect(0, 0, this.Width, this.Height);

        // draw blocks
        for (var i = 0; i < this.Blocks.length; i++) {
            var block = this.Blocks[i];
            block.Draw(this.Ctx);
        }
    }

    private _CheckProximity(){
        // loop through all Modifiable blocks checking proximity to Modifier blocks.
        // if within CatchmentArea, add Modifier to Modifiable.Modifiers.
        var modifiables = this.Modifiables.ToArray();
        var modifiers = this.Modifiers.ToArray();

        for (var j = 0; j < modifiables.length; j++) {
            var source:IModifiable = modifiables[j];

            for (var i = 0; i < modifiers.length; i++) {
                var modifier:IModifier = modifiers[i];

                // if a source is close enough to the modifier, add the modifier
                // to its internal list.
                var catchmentArea = this.Ctx.canvas.width * modifier.CatchmentArea;
                var distanceFromModifier = source.DistanceFrom(modifier.AbsPosition);

                if (distanceFromModifier <= catchmentArea) {
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

    private _NormalisePoint(point: Point): Point {
        return new Point(Math.normalise(point.X, 0, this.Ctx.canvas.width), Math.normalise(point.Y, 0, this.Ctx.canvas.height));
    }

    MouseDown(e: Fayde.Input.MouseEventArgs){
        this._IsMouseDown = true;
        this._CheckCollision(e);
    }

    TouchDown(e: Fayde.Input.TouchEventArgs){
        this._IsTouchDown = true;
        this._CheckCollision(e);
    }

    private _CheckCollision(e) {
        var point = (<any>e).args.Source.MousePosition;
        //TODO: Doesn't detect touch. Will there be a (<any>e).args.Source.TouchPosition?
        for (var i = 0; i < this.Blocks.length; i++){
            var block = this.Blocks[i];
            if (block.HitTest(point)){
                (<any>e).args.Handled = true;
            }
        }
    }

    MouseUp(point: Point){
        this._IsMouseDown = false;

        if (this._SelectedBlock){
            this._SelectedBlock.MouseUp();

            var op:IUndoableOperation = new MovePointOperation(this._SelectedBlock.Position, this._SelectedBlock.LastPosition, this._SelectedBlock.Position);

            this._OperationManager.Do(op).then((point) => {
            });
        }

        this._CheckProximity();
    }

    MouseMove(point: Point){
        if (this._SelectedBlock){
            this._SelectedBlock.MouseMove(this._NormalisePoint(point));
            this._CheckProximity();
        }
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
        if (this.Modifiables.Contains(<any>this._SelectedBlock)){

            var op:IUndoableOperation = new RemoveItemFromObservableCollectionOperation(<any>this._SelectedBlock, this.Modifiables);

            this._OperationManager.Do(op).then((list) => {
                this._SelectedBlock = null;
            });
        }

        if (this.Modifiers.Contains(<any>this._SelectedBlock)){
            var op:IUndoableOperation = new RemoveItemFromObservableCollectionOperation(<any>this._SelectedBlock, this.Modifiers);

            this._OperationManager.Do(op).then((list) => {
                this._SelectedBlock = null;
            });
        }
    }

    Undo(){
        this._OperationManager.Undo().then(() => {

        });
    }

    Redo(){
        this._OperationManager.Redo().then(() => {

        });
    }
}

export = BlocksView;