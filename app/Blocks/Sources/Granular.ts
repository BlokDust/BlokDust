/**
 * Created by luketwyman on 10/02/2015.
 */

import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Source = require("./Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
import Particle = require("../../Particle");

class Granular extends Source {

    private _Grains: Tone.Player[];
    private _Envelopes: Tone.Envelope[];
    private _Timeout;
    private _CurrentGrain: number;
    private _IsLoaded: boolean;
    public Filename: string;
    public GrainSettings;


    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Granular;
        super(grid, position);

        this._IsLoaded = false;

        var tracks = ["183588346","48387282","127905486","50894420","12216090"];

        this.Filename = tracks[4];

        this.GrainSettings = {
            "rate": 0.3,
            "density": 50,
            "smoothness": 0.05,
            "region": 4,
            "spread": 1.5,
            "grainlength": 0.15

        };

        // INIT //
        this._Grains = [];
        this._Envelopes = [];
        this._CurrentGrain = 0;
        this.SetTrack();


        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));
    }


    // LOAD THE AUDIO & CONNECT UP//
    SetTrack() {
        this._IsLoaded = false;
        var scId = "?client_id=7258ff07f16ddd167b55b8f9b9a3ed33";
        var audioUrl = "https://api.soundcloud.com/tracks/" + this.Filename + "/stream" + scId;

        // RESET //
        this._Grains.length = 0;
        this._Envelopes.length = 0;
        var gran = this;

        // LOAD AUDIO//
        for (var i=0; i<this.GrainSettings.density; i++) {
            if (i==0) { // first buffer callback
                this._Grains[i] = new Tone.Player(audioUrl, function (sc) {
                    console.log(sc);
                    gran._IsLoaded = true;
                });
            } else {
                this._Grains[i] = new Tone.Player(audioUrl);
            }
            this._Envelopes[i] = new Tone.Envelope(this.GrainSettings.smoothness,0,1,this.GrainSettings.smoothness);

            // CONNECT //
            this._Envelopes[i].connect(this._Grains[i].output.gain);
            this._Grains[i].connect(this.Source);

        }

    }

    Update() {
        super.Update();

    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"granular");
    }

    MouseDown() {
        super.MouseDown();
        this.GrainSettings.region = (this.GrainSettings.spread*1.5) + (Math.random()*(this._Grains[0].duration - (this.GrainSettings.spread*3)));

        if (this._IsLoaded) {
            this.GrainLoop();
        }
    }

    MouseUp() {
        super.MouseUp();
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);

        particle.Dispose();
    }

    GrainLoop() {

        // CYCLES THROUGH GRAINS AND PLAYS THEM //
        if (this.IsPressed) {
            var gran = this;
            var delay = (this.GrainSettings.rate / this.GrainSettings.density);
            var location = this.GrainSettings.region - (this.GrainSettings.spread * 0.5) + (Math.random() * this.GrainSettings.spread);
            this._Envelopes[this._CurrentGrain].triggerAttackRelease(this.GrainSettings.grainlength - this.GrainSettings.smoothness,"+0.003");
            this._Grains[this._CurrentGrain].start(0, location, this.GrainSettings.grainlength*1.5);
            this._Timeout = setTimeout(function() {
                gran.GrainLoop();
            },delay*1000);

            this._CurrentGrain += 1;
            if (this._CurrentGrain == this.GrainSettings.density) {
                this._CurrentGrain = 0;
            }
        }
    }



    Delete(){
        super.Delete();
        for (var i=0; i<this.GrainSettings.density; i++) {
            this._Grains[i].stop();
            this._Grains[i].dispose();
            this._Envelopes[i].dispose();
        }
        clearTimeout(this._Timeout);
        this._Grains.length = 0;
        this._Envelopes.length = 0;
    }

}

export = Granular;