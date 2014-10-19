/// <reference path="./refs" />

import App = require("./App");
import IBlock = require("./Blocks/IBlock");
import IModifiable = require("./Blocks/IModifiable");
import IModifier = require("./Blocks/IModifier");
import AddItemToObservableCollectionOperation = require("./Core/Operations/AddItemToObservableCollectionOperation");
import RemoveItemFromObservableCollectionOperation = require("./Core/Operations/RemoveItemFromObservableCollectionOperation");
import ChangePropertyOperation = require("./Core/Operations/ChangePropertyOperation");
import IOperation = require("./Core/Operations/IOperation");
import IUndoableOperation = require("./Core/Operations/IUndoableOperation");
import Commands = require("./Commands");
import CommandHandlerFactory = require("./Core/Resources/CommandHandlerFactory");
import CreateModifierCommandHandler = require("./CommandHandlers/CreateModifierCommandHandler");
import CreateModifiableCommandHandler = require("./CommandHandlers/CreateModifiableCommandHandler");
import ICommandHandler = require("./Core/Commands/ICommandHandler");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class BlocksView extends Fayde.Drawing.SketchContext {

    private _SelectedBlock: IBlock;
    private _Id: number = 0;
    private _IsMouseDown: boolean = false;
    private _IsTouchDown: boolean = false;
    private _Divisor: number = 75;
    public ModifiableSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public ModifierSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public Blocks: IBlock[];
    public DrawOrder: number[] = [];

    get SelectedBlock(): IBlock {
        return this._SelectedBlock;
    }

    set SelectedBlock(block: IBlock) {
        // if setting the selected block to null (or falsey)
        // if there's already a selected block, set its
        // IsSelected to false.
        if (!block && this._SelectedBlock){
            this._SelectedBlock.IsSelected = false;
            this._SelectedBlock = null;
        } else {
            if (this._SelectedBlock){
                this._SelectedBlock.IsSelected = false;
            }
            block.IsSelected = true;
            this._SelectedBlock = block;
        }
    }



    constructor() {
        super();

        App.Init();

        App.ResourceManager.AddResource(new CommandHandlerFactory(Commands.CREATE_MODIFIER, CreateModifierCommandHandler.prototype));
        App.ResourceManager.AddResource(new CommandHandlerFactory(Commands.CREATE_MODIFIABLE, CreateModifiableCommandHandler.prototype));

        App.OperationManager.OperationAdded.Subscribe((operation: IOperation) => {
            this._Invalidate();
        }, this);

        App.OperationManager.OperationComplete.Subscribe((operation: IOperation) => {
            this._Invalidate();
        }, this);

        this._Invalidate();

        // console is picking this function up, just not here
        //loadPalette("img/palette.gif",function() {alert("palette load happened")});
    }

    private _Invalidate(){

        this.Blocks = [].concat(App.Modifiables.ToArray(), App.Modifiers.ToArray());

        this._ValidateBlocks();

        this._CheckProximity();
    }

    _ValidateBlocks() {
        // for each Modifiable, pass it the new list of Modifiers.
        // if the Modifiable contains a Modifier that no longer
        // exists, remove it.
        for (var i = 0; i < App.Modifiables.Count; i++){
            var modifiable: IModifiable = App.Modifiables.GetValueAt(i);

            modifiable.ValidateModifiers(App.Modifiers);
        }
    }

    CreateModifiable<T extends IModifiable>(m: {new(ctx: CanvasRenderingContext2D, position: Point): T; }){

        var modifiable: IModifiable = new m(this.Ctx, this._GetRandomPosition());
        modifiable.Id = this._GetId();

        modifiable.IndexZ = modifiable.Id;
        this.DrawOrder.push(modifiable.IndexZ);

        modifiable.Click.Subscribe((e: IModifiable) => {
            this.OnModifiableSelected(e);
        }, this);

        App.CommandManager.ExecuteCommand(Commands.CREATE_MODIFIABLE, modifiable);
    }

    CreateModifier<T extends IModifier>(m: {new(ctx: CanvasRenderingContext2D, position: Point): T; }){

        var modifier: IModifier = new m(this.Ctx, this._GetRandomPosition());
        modifier.Id = this._GetId();

        modifier.IndexZ = modifier.Id;
        this.DrawOrder.push(modifier.IndexZ);

        modifier.Click.Subscribe((e: IModifier) => {
            this.OnModifierSelected(e);
        }, this);

        App.CommandManager.ExecuteCommand(Commands.CREATE_MODIFIER, modifier);
    }

    private _GetId(): number {
        return this._Id++;
    }

    private _GetRandomPosition(): Point{
        return new Point(Math.random(), Math.random());
    }

    Setup(){
        super.Setup();

        // set up the grid
        this.Ctx.divisor = this._Divisor;

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
        this.Ctx.fillStyle = "#2c243e";
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        // draw blocks
        /*
       for (var i = 0; i < this.Blocks.length; i++) {
            var block = this.Blocks[i];
            block.Draw(this.Ctx);
        }
         */
        for (var i = 0; i < this.Blocks.length; i++) {
            var block = this.Blocks[this.DrawOrder[i]];
            block.Draw(this.Ctx);
        }
    }

    private _CheckProximity(){
        // loop through all Modifiable blocks checking proximity to Modifier blocks.
        // if within CatchmentArea, add Modifier to Modifiable.Modifiers.

        for (var j = 0; j < App.Modifiables.Count; j++) {
            var modifiable:IModifiable = App.Modifiables.GetValueAt(j);

            for (var i = 0; i < App.Modifiers.Count; i++) {
                var modifier:IModifier = App.Modifiers.GetValueAt(i);

                // if a modifiable is close enough to the modifier, add the modifier
                // to its internal list.
                var catchmentArea = this.Ctx.canvas.width * modifier.CatchmentArea;
                var distanceFromModifier = modifiable.DistanceFrom(modifier.AbsPosition);

                if (distanceFromModifier <= catchmentArea) {
                    if (!modifiable.Modifiers.Contains(modifier)){
                        modifiable.AddModifier(modifier);
                    }
                } else {
                    // if the modifiable already has the modifier on its internal list
                    // remove it as it's now too far away.
                    if (modifiable.Modifiers.Contains(modifier)){
                        modifiable.RemoveModifier(modifier);
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

                block.MouseDown();
                this.SelectedBlock = block;
            }
        }
        // Bring Selected Block To the Front
        this.ShuffleZ(this.SelectedBlock,false);
    }

    ShuffleZ(block,deleteBlock) {
        var pre = this.DrawOrder.slice(0,(block.IndexZ));
        var post = this.DrawOrder.slice((block.IndexZ+1));
        var joined = pre.concat(post);
        if (deleteBlock!==true) {
            joined.push(this.DrawOrder[block.IndexZ]);
        }
        this.DrawOrder = joined;
        var j;
        for (j=0;j<this.DrawOrder.length;j++) this.Blocks[this.DrawOrder[j]].IndexZ = j;
    }




    MouseUp(e: Fayde.Input.MouseEventArgs){
        this._IsMouseDown = false;

        var point = (<any>e).args.Source.MousePosition;

        if (this.SelectedBlock){

            if (this.SelectedBlock.HitTest(point)){
                (<any>e).args.Handled = true;
                this.SelectedBlock.MouseUp();

                // if the block has moved, create an undoable operation.
                if (!this.SelectedBlock.Position.Equals(this.SelectedBlock.LastPosition)){
                    var op:IUndoableOperation = new ChangePropertyOperation<IBlock>(this.SelectedBlock, "Position", this.SelectedBlock.LastPosition.Clone(), this.SelectedBlock.Position.Clone());
                    App.OperationManager.Do(op);
                }
            }
        }
    }

    MouseMove(e: Fayde.Input.MouseEventArgs){
        var point = (<any>e).args.Source.MousePosition;

        if (this.SelectedBlock){
            this.SelectedBlock.MouseMove(this._NormalisePoint(point));
            this._CheckProximity();
        }
    }

    OnModifiableSelected(modifiable: IModifiable){
        this.ModifiableSelected.Raise(modifiable, new Fayde.RoutedEventArgs());
    }

    OnModifierSelected(modifier: IModifier){
        this.ModifierSelected.Raise(modifier, new Fayde.RoutedEventArgs());
    }

    DeleteSelectedBlock(){

        if (App.Modifiables.Contains(<any>this.SelectedBlock)){

            var op:IUndoableOperation = new RemoveItemFromObservableCollectionOperation(<any>this.SelectedBlock, App.Modifiables);

            App.OperationManager.Do(op).then((list) => {
                this.SelectedBlock = null;
            });
        }

        if (App.Modifiers.Contains(<any>this.SelectedBlock)){
            var op:IUndoableOperation = new RemoveItemFromObservableCollectionOperation(<any>this.SelectedBlock, App.Modifiers);

            App.OperationManager.Do(op).then((list) => {
                this.SelectedBlock = null;
            });
        }
    }

    Undo(){
        App.OperationManager.Undo();
    }

    Redo(){
        App.OperationManager.Redo();
    }
}

export = BlocksView;