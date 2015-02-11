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
    public MaxDensity: number;


    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Granular;
        super(grid, position);

        this._IsLoaded = false;

        var tracks = ["183588346","48387282","127905486","50894420","12216090"];

        this.Filename = tracks[4];

        this.GrainSettings = {
            "rate": 0.3,
            "density": 9,
            "smoothness": 0.06,
            "region": 4,
            "spread": 1,
            "grainlength": 0.05

        };

        this.GrainSettings.rate = this.GrainSettings.grainlength*2;
        this.GrainSettings.smoothness = this.GrainSettings.grainlength*0.49;



        // INIT //
        this.MaxDensity = 16;
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
        for (var i=0; i<this.MaxDensity; i++) {
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

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Granular",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Density",
                    "setting" :"density",
                    "props" : {
                        "value" : this.GetValue("density"),
                        "min" : 2,
                        "max" : this.MaxDensity,
                        "quantised" : true,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Duration",
                    "setting" :"grainlength",
                    "props" : {
                        "value" : this.GetValue("grainlength"),
                        "min" : 0.03,
                        "max" : 0.5,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Spread",
                    "setting" :"spread",
                    "props" : {
                        "value" : this.GetValue("spread"),
                        "min" : 0,
                        "max" : 2,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Region",
                    "setting" :"region",
                    "props" : {
                        "value" : this.GetValue("region"),
                        "min" : this.GetValue("regionmin"),
                        "max" : this.GetValue("regionmax"),
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
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
        //this.GrainSettings.region = (this.GrainSettings.spread*1.5) + (Math.random()*(this._Grains[0].duration - (this.GrainSettings.spread*3)));

        if (this._IsLoaded) {
            this._CurrentGrain = 0;
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

    GetValue(param: string) {

        if (this.GrainSettings) {

            var val;
            switch (param){


                case "density": val = this.GrainSettings.density;
                    break;
                case "grainlength": val = this.GrainSettings.grainlength;
                    break;
                case "spread": val = this.GrainSettings.spread;
                    break;
                case "region": val = this.GrainSettings.region;
                    break;
                case "regionmin": val = (this.GrainSettings.spread*1.5);
                    break;
                case "regionmax": val = (this._Grains[0].duration - (this.GrainSettings.spread*3));
                    break;
            }
            console.log(val);
            return val;

        }

    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        switch (param){

            case "density": this.GrainSettings.density = value;
                break;
            case "grainlength":
                this.GrainSettings.grainlength = value;
                this.GrainSettings.rate = this.GrainSettings.grainlength*2;
                this.GrainSettings.smoothness = this.GrainSettings.grainlength*0.49;
                for (var i=0; i< this.MaxDensity; i++) {
                    console.log(this._Envelopes[i]);
                    this._Envelopes[i].setAttack(this.GrainSettings.smoothness);
                    this._Envelopes[i].setRelease(this.GrainSettings.smoothness);
                }

                break;
            case "spread": this.GrainSettings.spread = value;
                break;
            case "region": this.GrainSettings.region = value;
                break;
        }


        console.log(jsonVariable);
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