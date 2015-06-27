import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");
import Grid = require("../../Grid");
import Particle = require("../../Particle");
import SoundCloudAudio = require('../SoundCloudAudio');

class Granular extends Source {

    public Sources: Tone.Signal[];
    public Grains: Tone.Player[] = [];
    private _Envelopes: Tone.AmplitudeEnvelope[] = [];
    public Timeout;
    public EndTimeout;
    private _CurrentGrain: number = 0;
    private _IsLoaded: boolean;
    public GrainsAmount: number = 16;
    private _NoteOn: boolean = false;
    public PlaybackRate: number = 1;
    public SC: SoundCloudAudio;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                rate: 0.3,
                density: 10,
                smoothness: 0.06,
                region: 0,
                spread: 1.5,
                grainlength: 0.06,
                track: '',
                user: ''
            };
        }
        super.Init(sketch);

        this.SC = new SoundCloudAudio(this);
        this.Params.track = this.SC.TrackURL;

        //TODO: NOT SURE SHOULD WE BE DOING THIS HERE ??
        this.Params.rate = this.Params.grainlength*2;
        this.Params.smoothness = this.Params.grainlength*0.49;
        //----------

        this.CreateSource();
        this.CreateEnvelope();

        this.Sources.forEach((s: Tone.Signal, i: number) => {
            s.connect(this.Envelopes[i]);
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.connect(this.EffectsChainInput);
        });

        this.SetupGrains();

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));
    }

    Reset(){
        this.Grains.length = 0;
        this._Envelopes.length = 0;
    }



    // LOAD THE AUDIO & CONNECT UP//
    SetupGrains() {
        this._IsLoaded = false;

        //this.Reset();


        // LOAD AUDIO//
        // INITIALISE PLAYERS & ENVELOPES //
        // TODO either envelopes need to become signal envelopes, or we introduce a sampler.
        // Either one master sampler if it can have multiple samples, or a sampler per grain.

        // Loop through GrainsAmount
        for (var i=0; i<this.GrainsAmount; i++) {

            if (i==0) { // first buffer callback
                this.Grains[i] = new Tone.Player(this.SC.TrackURL, (e) => {
                    this._IsLoaded = true;
                    this.Params.region = this.GetDuration()*0.5;
                });

            } else {  // remaining buffers
                this.Grains[i] = new Tone.Player(this.SC.TrackURL);
            }

            this._Envelopes[i] = new Tone.AmplitudeEnvelope(this.Params.smoothness,0.01,0.9,this.Params.smoothness);

            // CONNECT //
            this.Grains[i].connect(this._Envelopes[i]);
            this._Envelopes[i].connect(this.Sources[0]);
            this.Sources[0].connect(this.EffectsChainInput);
            this.Grains[i].playbackRate = this.PlaybackRate;
        }

    }



    GetDuration() {
        if (this.Grains.length){
            return this.Grains[0].duration;
        }
        return 0;
    }

    Update() {
        super.Update();

    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"granular");
    }

    MouseDown() {
        super.MouseDown();
        this.TriggerAttack();

    }

    MouseUp() {
        super.MouseUp();
        this.TriggerRelease();
    }

    CreateSource(){
        this.Sources.push( new Tone.Signal() );
        // return it
        return super.CreateSource();
    }

    CreateEnvelope(){
        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ) );
        return super.CreateEnvelope();
    }

    TriggerAttack() {
        super.TriggerAttack();

        if (this._IsLoaded) {
            this.Envelopes.forEach((e: any)=> {
                e.triggerAttack();
            });

            clearTimeout(this.EndTimeout);
            if (!this._NoteOn) {

                this._NoteOn = true;
                this.GrainLoop();
            }
        }

    }

    TriggerRelease() {
        super.TriggerRelease();

        this.Envelopes.forEach((e: any)=> {
            e.triggerRelease();
        });

        var gran = this;
        //clearTimeout(this.EndTimeout);
        this.EndTimeout = setTimeout(function() {
            gran._NoteOn = false;
            console.log("END");
        },<any>this.Envelopes[0].release*1000);
    }

    TriggerAttackRelease(){

    }

    GrainLoop() {

        // CYCLES THROUGH GRAINS AND PLAYS THEM //
        // todo: clicking issue to be addressed (noticeable when connected to filter/gain blocks)
        if (this._NoteOn) {
            if (this._Envelopes[this._CurrentGrain]) {
                var gran = this;
                var delay = (this.Params.rate / this.Params.density);
                var location = this.Params.region - (this.Params.spread * 0.5) + (Math.random() * this.Params.spread);
                location = this.LocationRange(location);

                // MAKE SURE THESE ARE IN SYNC //
                this._Envelopes[this._CurrentGrain].triggerAttackRelease(this.Params.smoothness,"+0");
                this.Grains[this._CurrentGrain].stop();
                this.Grains[this._CurrentGrain].playbackRate = this.PlaybackRate;
                this.Grains[this._CurrentGrain].start();
                //this.Grains[this._CurrentGrain].start("+0", location, (this.GrainSettings.grainlength*this.PlaybackRate)*1.9);

                clearTimeout(this.Timeout);
                this.Timeout = setTimeout(function() {
                    gran.GrainLoop();
                },Math.round(delay*1500));

                //console.log("" + this._CurrentGrain + " | " + playRate);

                this._CurrentGrain += 1;
                if (this._CurrentGrain >= this.Params.density) {
                    this._CurrentGrain = 0;
                }
            }
        }
    }

    // CAP POSITIONS OF GRAINS TO STAY WITHIN TRACK LENGTH //
    LocationRange(location) {
        if (location<0) {
            location = 0;
        }
        if (location>(this.Grains[0].duration - this.Params.grainlength)) {
            location = (this.Grains[0].duration - this.Params.grainlength);
        }
        return location;
    }

    SetPitch(pitch: number, sourceId?: number, rampTime?: Tone.Time) {
        super.SetPitch(pitch, sourceId, rampTime);
        for (var i=0; i<this.GrainsAmount; i++) {
            pitch /= App.BASE_NOTE;
            this.PlaybackRate = pitch;
        }
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        switch (param){
            case "density": this.Params.density = value;
                break;
            case "grainlength":
                this.Params.grainlength = value;
                this.Params.rate = this.Params.grainlength*2;
                this.Params.smoothness = this.Params.grainlength*0.5;
                for (var i=0; i< this.GrainsAmount; i++) {
                    this._Envelopes[i].attack = this.Params.smoothness;
                    this._Envelopes[i].release = this.Params.smoothness;
                }

                break;
            case "spread": this.Params.spread = value;
                break;
            case "region": this.Params.region = value;
                break;
        }
    }



    Dispose(){
        super.Dispose();
        clearTimeout(this.Timeout);
        this._NoteOn = false;
        for (var i=0; i<this.GrainsAmount; i++) {
            this.Grains[i].stop();
            this.Grains[i].dispose();
            this._Envelopes[i].dispose();
        }

        this.Grains.length = 0;
        this._Envelopes.length = 0;

        this.Envelopes.forEach((e: any)=> {
            e.dispose();
        });

        this.Sources.forEach((s: any)=> {
            s.dispose();
        });
    }



    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Granular",
            "parameters" : [

                {
                    "type" : "waveslider",
                    "name" : "Location",
                    "setting" :"region",
                    "props" : {
                        "value" : this.GetParam("region"),
                        "min" : 0,
                        "max" : this.GetDuration(),
                        "quantised" : false,
                        "centered" : false,
                        "spread" : this.Params.spread
                    }
                },
                {
                    "type" : "sample",
                    "name" : "Sample",
                    "setting" :"sample",
                    "props" : {
                        "track" : this.Params.track,
                        "user" : this.Params.user
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Spread",
                    "setting" :"spread",
                    "props" : {
                        "value" : this.Params.spread,
                        "min" : 0,
                        "max" : 4,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Grain Size",
                    "setting" :"grainlength",
                    "props" : {
                        "value" : this.Params.grainlength,
                        "min" : 0.03,
                        "max" : 0.5,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Density",
                    "setting" :"density",
                    "props" : {
                        "value" : this.Params.density,
                        "min" : 2,
                        "max" : this.GrainsAmount,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

}

export = Granular;