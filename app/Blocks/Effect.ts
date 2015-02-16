import IBlock = require("./IBlock");
import Block = require("./Block");
import IEffect = require("./IEffect");
import ISource = require("./ISource");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Effect extends Block implements IEffect {

    public CatchmentArea: number = 6; // grid units
    public Effect; // ANY TYPE OF TONE POST EFFECT

    Source: ISource;
    public Sources: ObservableCollection<ISource> = new ObservableCollection<ISource>();
    public OldSources: ObservableCollection<ISource>;

    //Params: ToneSettings;

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.Sources.CollectionChanged.on(() => {
            this._OnSourcesChanged();
        }, this);

        this.OpenParams();
    }

    Update() {
        super.Update();
    }

    Attach(source: ISource): void {
        this.Source = source;
    }

    Detach(source: ISource): void {
        this.Source = source;
    }

    /**
     * Add source to this Effect's list of sources
     * @param source
     * @constructor
     */
    AddSource(source: ISource) {
        this.Sources.Add(source);
    }

    /**
     * Remove source from this Effect's list of sources
     * @param source
     * @constructor
     */
    RemoveSource(source: ISource) {
        this.Sources.Remove(source);
    }

    private _OnSourcesChanged() {

        // Detach effects in old collection.
        //if (this.OldSources && this.OldSources.Count){
        //    var oldEffects: IEffect[] = this.OldSources.ToArray();
        //
        //    for (var k = 0; k < oldEffects.length; k++) {
        //        this._DetachEffect(oldEffects[k]);
        //    }
        //}

        // List of connected effect blocks
        var sources: ISource[] = this.Sources.ToArray();


        // For each connected effect
        //for (var i = 0; i < effects.length; i++) {
        //
        //    // Run Attach method for all effect blocks that need it
        //    this._AttachEffect(effects[i]);
        //
        //    // If this is a post effect add to postEffect list
        //    if (effects[i].Effect) {
        //        postEffects.push(effects[i]);
        //    }
        //}

        // Reorder the post effects chain
        //this.UpdateEffectsChain(postEffects);

        // Update list of Old Effects
        this.OldSources = new ObservableCollection<ISource>();
        this.OldSources.AddRange(this.Sources.ToArray());
    }
}

export = Effect;