import App = require("../App");
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

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.OpenParams();
    }

    Update() {
        super.Update();
    }

    Attach(source: ISource): void {
    }

    Detach(source: ISource): void {
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

    /**
     * Validate that the block's effects still exist
     */
    public ValidateSources(){
        for (var i = 0; i < this.Sources.Count; i++){
            var src: ISource = this.Sources.GetValueAt(i);

            if (!window.App.Sources.Contains(src)){
                this.RemoveSource(src);
            }
        }
    }
}

export = Effect;