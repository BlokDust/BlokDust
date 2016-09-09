/// <reference path="./lib/exjs/dist/ex.d.ts"/>
import Canvas = etch.drawing.Canvas;
import DisplayObject = etch.drawing.DisplayObject;
import DisplayObjectCollection = etch.drawing.DisplayObjectCollection;
import IDisplayObject = etch.drawing.IDisplayObject;
import Point = minerva.Point;
import {AddressBarManager} from './Core/Visual/AddressBarManager';
import {AnimationsLayer} from './UI/AnimationsLayer';
import {Audio} from './Core/Audio/Audio';
import {BlockSprites} from './Blocks/BlockSprites';
import {ColorManager} from './Core/Visual/ColorManager';
import {CommandHandlerFactory} from './Core/Resources/CommandHandlerFactory';
import {CommandManager} from './Core/Commands/CommandManager';
import {CommandsInputManager} from './Core/Inputs/CommandsInputManager';
import {Commands} from './Commands';
import {CompositionLoadedEventArgs} from './CompositionLoadedEventArgs';
import {CreateBlockCommandHandler} from './CommandHandlers/CreateBlockCommandHandler';
import {DeleteBlockCommandHandler} from './CommandHandlers/DeleteBlockCommandHandler';
import {Effect} from './Blocks/Effect';
import {FocusManagerEventArgs} from './Core/Inputs/FocusManagerEventArgs';
import {FocusManager} from './Core/Inputs/FocusManager';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {IConfig} from './IConfig';
import {IEffect} from './Blocks/IEffect';
import {IL10n} from './IL10n';
import {IPowerEffect} from './Blocks/Power/IPowerEffect';
import {IPowerSource} from './Blocks/Power/IPowerSource';
import {ISource} from './Blocks/ISource';
import {LoadCommandHandler} from './CommandHandlers/LoadCommandHandler';
import {MainScene} from './MainScene';
import {Metrics} from './Metrics';
import {MoveBlockCommandHandler} from './CommandHandlers/MoveBlockCommandHandler';
import {OperationManager} from './Core/Operations/OperationManager';
import {Particle} from './Particle';
import {PianoKeyboardManager} from './Core/Inputs/PianoKeyboardManager';
import {PointerInputManager} from './Core/Inputs/PointerInputManager';
import {PooledFactoryResource} from './Core/Resources/PooledFactoryResource';
import {PowerEffect} from './Blocks/Power/PowerEffect';
import {PowerSource} from './Blocks/Power/PowerSource';
import {RedoCommandHandler} from './CommandHandlers/RedoCommandHandler';
import {ResourceManager} from './Core/Resources/ResourceManager';
import {SaveAsCommandHandler} from './CommandHandlers/SaveAsCommandHandler';
import {SaveCommandHandler} from './CommandHandlers/SaveCommandHandler';
import {SaveFile} from './SaveFile';
import {Serializer} from './Serializer';
import {SoundCloudAPI} from './Core/Audio/SoundCloud/SoundCloudAPI';
import {Source} from './Blocks/Source';
import {Stage} from './Stage';
import {ThemeChangeEventArgs} from './Core/Visual/ThemeChangeEventArgs';
import {ThemeManager} from './Core/Visual/ThemeManager';
import {TypingManager} from './Core/Inputs/TypingManager';
import {UndoCommandHandler} from './CommandHandlers/UndoCommandHandler';
import {BlockCreator} from './BlockCreator';
import {CommandCategories} from './CommandCategories';
import {Errors} from './Errors';
import {GAVariables} from './GAVariables';
import {CompositionLoadFailedEventArgs} from "./CompositionLoadFailedEventArgs";
//import {DragFileInputManager} from './Core/Inputs/DragFileInputManager';

export default class App implements IApp{

    CompositionLoaded = new nullstone.Event<CompositionLoadedEventArgs>();
    CompositionLoadFailed = new nullstone.Event<CompositionLoadFailedEventArgs>();
    private _FontsLoaded: number;
    private _SaveFile: SaveFile;
    private _SessionId: string;
    public AddressBarManager: AddressBarManager;
    public Audio: Audio = new Audio();
    public Blocks: IBlock[] = [];
    public BlockCreator: BlockCreator;
    public BlockSprites: BlockSprites;
    public Canvas: Canvas;
    public ColorManager: ColorManager;
    public CommandManager: CommandManager;
    public CommandsInputManager: CommandsInputManager;
    public CompositionId: string;
    public CompositionName: string;
    public Config: IConfig;
    //public DragFileInputManager: DragFileInputManager;
    public DragOffset: Point = new Point(0, 0);
    public FocusManager: FocusManager;
    public GridSize: number;
    public Height: number;
    public IsLoadingComposition: boolean = false;
    public L10n: IL10n;
    public Metrics: Metrics;
    public OperationManager: OperationManager;
    public Palette: string[] = [];
    public Particles: Particle[] = [];
    public ParticlesPool: PooledFactoryResource<Particle>;
    public PianoKeyboardManager: PianoKeyboardManager;
    public PointerInputManager: PointerInputManager;
    public ResourceManager: ResourceManager;
    public ScaledDragOffset: Point;
    public ScaledGridSize: number;
    public ScaledUnit: number;
    public Stage: Stage;
    public SubCanvas: HTMLCanvasElement[];
    public ThemeManager: ThemeManager;
    public TypingManager: TypingManager;
    public Unit: number;
    public Width: number;
    public ZoomLevel: number;

    get AnimationsLayer(): AnimationsLayer{
        return this.MainScene.AnimationsLayer;
    }

    get MainScene(): MainScene {
        return this.Stage.MainScene; //TODO: trying to reference Stage from one of it's children at init comes back undefined, which is impossible (eg in the init of CreateNew)
    }

    get Sources(): ISource[] {
        return <ISource[]>this.Blocks.en().where(b => b instanceof Source).toArray();
    }

    get Effects(): IEffect[] {
        return <IEffect[]>this.Blocks.en().where(b => b instanceof Effect).toArray();
    }

    get PowerEffects(): IPowerEffect[] {
        return <IPowerEffect[]>this.Blocks.en().where(b => b instanceof PowerEffect).toArray();
    }

    get PowerSources(): IPowerSource[] {
        return <IPowerSource[]>this.Blocks.en().where(b => b instanceof PowerSource).toArray();
    }

    public GetBlockId(): number {
        // loop through blocks to get max id
        var max = 0;

        for (var i = 0; i < this.Blocks.length; i++){
            var b = this.Blocks[i];
            if (b.Id > max){
                max = b.Id;
            }
        }

        return max + 1;
    }

    get SessionId(): string {
        if (this._SessionId) return this._SessionId;
        var storageItem: Utils.StorageItem = Utils.Storage.get(this.CompositionId, Utils.StorageType.local);
        if (storageItem) return storageItem.value;
    }

    set SessionId(value: string) {
        this._SessionId = value;
        Utils.Storage.set(this.CompositionId, this._SessionId, this.Config.StorageTime, Utils.StorageType.local);
    }

    get ThemeNo(): number {
        var storageItem: Utils.StorageItem = Utils.Storage.get("ColorTheme", Utils.StorageType.local);
        if (storageItem) return storageItem.value;
    }

    set ThemeNo(value: number) {
        Utils.Storage.set("ColorTheme", value, this.Config.StorageTime, Utils.StorageType.local);
    }

    get SkipTutorial(): boolean {
        var storageItem: Utils.StorageItem = Utils.Storage.get("SkipTutorial", Utils.StorageType.local);
        if (storageItem) return storageItem.value;
    }

    set SkipTutorial(value: boolean) {
        Utils.Storage.set("SkipTutorial", value, this.Config.StorageTime, Utils.StorageType.local);
    }

    constructor(config: string, l10n: string) {
        this.Config = <IConfig>JSON.parse(config);
        this.L10n = <IL10n>JSON.parse(l10n);
    }

    public setup(){

        this.Canvas = new Canvas();
        this.Canvas.HTMLElement.id = 'mainCanvas';
        document.body.classList.add('app-active');

        this.BlockCreator = new BlockCreator();

        // METRICS //
        this.Metrics = new Metrics();

        this.BlockSprites = new BlockSprites();

        this.SubCanvas = [];
        this.CreateSubCanvas(0); // optionsPanel

        window.onresize = () => {
            this.resize();
        };

        // INITIALISE AUDIO //
        this.Audio.Init();

        // LOAD FONTS AND SETUP CALLBACK //
        this._FontsLoaded = 0;

        WebFont.load({
            custom: { families: ['Merriweather Sans:i3','Dosis:n2,n4']},
            fontactive: (font, fvd) => { this.FontsLoaded(font, fvd) },
            timeout: 3000 // 3 seconds
        });

        setTimeout(() => {
            this.FontsNotLoaded();
        }, 3020);

        // CREATE MANAGERS //
        this.OperationManager = new OperationManager();
        this.OperationManager.MaxOperations = this.Config.MaxOperations;
        this.ResourceManager = new ResourceManager();
        this.CommandManager = new CommandManager(this.ResourceManager);
        this.TypingManager = new TypingManager();
        //this.DragFileInputManager = new DragFileInputManager();
        this.PianoKeyboardManager = new PianoKeyboardManager();
        this.CommandsInputManager = new CommandsInputManager(this.CommandManager);
        this.PointerInputManager = new PointerInputManager();
        this.ColorManager = new ColorManager();
        this.ThemeManager = new ThemeManager();
        this.FocusManager = new FocusManager();
        this.AddressBarManager = new AddressBarManager();

        this.FocusManager.FocusChanged.on((s: any, e: FocusManagerEventArgs) => {
            if (!e.HasFocus){
                this.TypingManager.ClearKeysDown();
                this.PianoKeyboardManager.ClearKeysDown();
                this.CommandsInputManager.ClearKeysDown();

                //this.Sources.forEach((s: ISource) => {
                    //s.TriggerRelease('all');
                //})
            }
        }, this);

        // REGISTER COMMAND HANDLERS //
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.CREATE_BLOCK, CreateBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.DELETE_BLOCK, DeleteBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.MOVE_BLOCK, MoveBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.SAVE, SaveCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.SAVE_AS, SaveAsCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.LOAD, LoadCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.UNDO, UndoCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.REDO, RedoCommandHandler.prototype));

        // POOLED OBJECTS //
        this.ParticlesPool = new PooledFactoryResource<Particle>(10, 100, Particle.prototype);

        // INITIALISE SOUNDCLOUD //
        var tempClientIDs = ['7258ff07f16ddd167b55b8f9b9a3ed33', '33ebf0c1ffa4e462157606a432bd7b5f', 'ce852127c5413fe70816d488694d7921'];
        //buffer to deal with initial traffic, will revert to true id after //
        var tempClientIDs2 = ['3291559d547bd9c545cbf393f522ea68', '3833cf666207c249e9767699a4d22a79', 'cb6c82fd11c903be63bdc4df4c5c7e09', '6c5bafb2050dc09d8f5d738030aa9fed'];
        this.Config.SoundCloudClientId = tempClientIDs2[Math.floor(Math.random()*tempClientIDs2.length)];
        SoundCloudAPI.Initialize();

        // INITIALISE THEME //
        this.ThemeManager.ThemeChanged.on((s: any, e: ThemeChangeEventArgs) => {
            this.TrackVariable(GAVariables.THEME.toString(), e.Index.toString());
            this.TrackEvent(CommandCategories.SETTINGS.toString(), Commands.CHANGE_THEME.toString(), ''+this.ThemeManager.Themes[e.Index].Name);

            // if first load
            var firstLoad: boolean = this.Palette.length === 0;

            this.Palette = e.Palette;

            if (firstLoad) {
                this.LoadReady();
            }
        }, this);
        var themeNo = this.ThemeNo;
        if (!this.ThemeNo) {
            themeNo = 0;
        }

        this.ThemeManager.LoadTheme(themeNo, true);

    }

    // FONT LOAD CALLBACK //
    FontsLoaded(font, fvd) {
        this._FontsLoaded += 1;
        // All fonts are present - load scene
        if (this._FontsLoaded === 3) {
            this.LoadReady();
        }
    }

    // FONT FAILURE TIMEOUT //
    FontsNotLoaded() {
        if (this._FontsLoaded !== 3) {
            console.log("FONTS ARE MISSING");
            // proceed anyway for now
            this._FontsLoaded = 3;
            this.LoadReady();
        }
    }

    // PROCEED WHEN ALL SOCKETS LOADED //
    LoadReady(): void {
        if (this._FontsLoaded === 3 && this.ThemeManager.Loaded) {
            this.LoadComposition();
        }
    }

    // IF LOADING A SHARE URL, GET THE DATA //
    LoadComposition() {
        var that = this;

        this.CompositionId = Utils.Urls.getQuerystringParameter('c');
        this.CompositionName = Utils.Urls.getQuerystringParameter('t');

        if(this.CompositionId) {
            this.IsLoadingComposition = true;

            this.CommandManager.ExecuteCommand(Commands.LOAD, this.CompositionId).then((data) => {
                that.CompositionLoadComplete(data);
            }).catch((error: string) => {
                that.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Errors.LOAD_FAILED.toString(), that.CompositionId);
                that.CompositionId = null;
                this.IsLoadingComposition = false;
                this.CompositionLoadFailed.raise(this, new CompositionLoadFailedEventArgs(that.CompositionId));
            });
        }

        this.CreateStage();
    }

    // CREATE Stage & BEGIN DRAWING/ANIMATING //
    CreateStage() {
        this.Stage = new Stage();
        this.Stage.init(this.Canvas);
        this.Stage.ticked.on((s: any, time: number) => {
            window.TWEEN.update(time);
        }, this);

        this.resize();
    }

    CompositionLoadComplete(data) {
        console.log(`Loaded "${this.CompositionName}"`);

        // get deserialized blocks tree, then "flatten" so that all blocks are in an array
        this.Deserialize(data);

        // allow loaded blocks to be alt-duplicable from start
        for (var i = 0; i < this.Blocks.length; i++) {
            this.Blocks[i].Duplicable = true;
        }

        this.ThemeManager.LoadTheme(this._SaveFile.ColorThemeNo, false, true);
        this.ZoomLevel = this._SaveFile.ZoomLevel;

        // bring down volume and validate blocks //
        this.Audio.Master.volume.value = -100;

        // Connect the effects chain
        this.Audio.ConnectionManager.update();

        this.IsLoadingComposition = false;
        if (!this.SkipTutorial) {
            this.MainScene.CreateNew.ShowMessage();
        }

        this.CompositionLoaded.raise(this, new CompositionLoadedEventArgs(this._SaveFile));
    }

    Serialize(): string {
        return Serializer.Serialize();
    }

    Deserialize(json: string): any {
        this._SaveFile = Serializer.Deserialize(json);
        this.Blocks = this._SaveFile.Composition.en().traverseUnique(block => (<IBlock>block).Connections).toArray();
        this.Blocks.sort((a: IBlock, b: IBlock) => {
            return a.zIndex - b.zIndex;
        });
    }

    Message(message?: string, options?: any) {
        if (this.MainScene) {
            this.MainScene.MessagePanel.show();
            this.MainScene.MessagePanel.NewMessage(message, options);
        }
    }

    CreateSubCanvas(i) {
        this.SubCanvas[i] = document.createElement("canvas");
        document.body.appendChild(this.SubCanvas[i]);
    }

    TrackEvent(category: string, action: string, label?: string): void{
        window.trackEvent(category, action, label);
    }

    TrackVariable(name: string, value: string): void{
        window.trackVariable(name, value);
    }

    IsLocalhost(): boolean {
        return document.location.href.indexOf('localhost') != -1;
    }

    resize(): void {
        this.Metrics.Compute();
        this.Stage.resize();
    }

    // SHORTHAND COLOR SET //
    FillColor(ctx,col) { this.ColorManager.FillColor(ctx,col); }
    FillRGBA(ctx,r,g,b,a) { this.ColorManager.FillRGBA(ctx,r,g,b,a); }
    StrokeColor(ctx,col) { this.ColorManager.StrokeColor(ctx,col); }
    StrokeRGBA(ctx,r,g,b,a) { this.ColorManager.StrokeRGBA(ctx,r,g,b,a); }
}