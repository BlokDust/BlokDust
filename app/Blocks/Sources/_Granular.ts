import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");
import Grid = require("../../Grid");
import Particle = require("../../Particle");

class Granular extends Source {

    public Grains: Tone.Player[];
    private _Envelopes: Tone.Envelope[];
    public Timeout;
    public EndTimeout;
    private _CurrentGrain: number;
    private _IsLoaded: boolean;
    public Filename: string;
    public GrainSettings;
    public MaxDensity: number;
    private _NoteOn: boolean;
    public PlaybackRate: number;
    public WaveUrl: string;
    public Waveform: number[];


    Init(sketch?: Fayde.Drawing.SketchContext): void {

        super.Init(sketch);

        this.CreateSource();

        this._IsLoaded = false;

        var tracks = ["183588346","48387282","127905486","50894420","12216090","76097469","130501492"];

        this.Filename = tracks[1];
        this.WaveUrl = "http://w1.sndcdn.com/fxguEjG4ax6B_m.png";
        this.WaveUrl = "../Assets/Waveforms/02.png";
        this.Waveform = [];

        this.GrainSettings = {
            "rate": 0.3,
            "density": 10,
            "smoothness": 0.06,
            "region": 0,
            "spread": 1.5,
            "grainlength": 0.06

        };
        this.GrainSettings.rate = this.GrainSettings.grainlength*2;
        this.GrainSettings.smoothness = this.GrainSettings.grainlength*0.49;

        // INIT //
        this.MaxDensity = 16;
        this.Grains = [];
        this._Envelopes = [];
        this._CurrentGrain = 0;
        this._NoteOn = false;
        this.PlaybackRate = 1;
        this.SetTrack();


        this.CreateEnvelope();

        this.Envelopes.forEach((e: any, i: number)=> {
            e.connect(this.Sources[i].output.gain);
        });

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));
    }

    // LOAD THE AUDIO & CONNECT UP//
    SetTrack() {
        this._IsLoaded = false;
        var id = "7258ff07f16ddd167b55b8f9b9a3ed33";
        var gran = this;

        // GET WAVEFORM DATA //
        SC.get('/tracks/'+this.Filename, {}, function(track) {
            console.log(track);
            gran.WaveUrl = track.waveform_url;
            $.getJSON("http://blokdust.azurewebsites.net/api/Wave64/", {url: gran.WaveUrl}, function(data) {
                var waveform;
                waveform = new Image();
                waveform.src = data.data;
                waveform.onload = function() {
                    //return waveform;
                    gran.LoadWaveform(waveform);
                };
            });
        });

        var audioUrl = "https://api.soundcloud.com/tracks/" + this.Filename + "/stream" + "?client_id=" + id;

        // RESET //
        this.Grains.length = 0;
        this._Envelopes.length = 0;


        // LOAD AUDIO//
        // INITIALISE PLAYERS & ENVELOPES //
        // TODO either envelopes need to become signal envelopes, or we introduce a sampler.
        // Either one master sampler if it can have multiple samples, or a sampler per grain.
        for (var i=0; i<this.MaxDensity; i++) {
            if (i==0) { // first buffer callback
                this.Grains[i] = new Tone.Player(audioUrl, function (sc) {
                    console.log(sc);
                    gran._IsLoaded = true;
                    gran.GrainSettings.region = gran.GetDuration()*0.5;
                });
            } else {  // remaining buffers
                this.Grains[i] = new Tone.Player(audioUrl);
            }
            this._Envelopes[i] = new Tone.Envelope(this.GrainSettings.smoothness,0.01,0.9,this.GrainSettings.smoothness);

            // CONNECT //
            this._Envelopes[i].connect(this.Grains[i].output.gain);
            this.Grains[i].connect(this.Sources[0]);
            this.Sources[0].connect(this.EffectsChainInput);
            this.Grains[i].playbackRate = this.PlaybackRate;
        }

    }

    LoadWaveform(img) {
        var loader = new PxLoader(); //// Use PX Loader to handle image load
        //var img = loader.addImage(this.WaveUrl);
        var ctx = this.Sketch.Ctx;
        var gran = this;
        var waveform = [];

        //loader.addCompletionListener(() => { //// callback that will be run once image is ready

            // metrics //
            var imglength = img.width; //// get number of colours
            var perc = this.Sketch.Size.width/imglength;
            var length = this.Sketch.Size.width;
            var height = Math.round(img.height*perc); //// get number of colours

            // place image //
            ctx.fillStyle = "#000";// black
            ctx.fillRect(0,0,length,height/2);
            ctx.drawImage(img, 0, -(height/2), length, height); //// temporarily place image half visible

            // get data //
            var imgdata = ctx.getImageData(0, 0, length, Math.floor(height/2)); //// get half the image data
            var pal = imgdata.data; // data for lower half
            //console.log(pal);

            var bits = 4;
            var sample = 6;

            var cols = Math.floor(length/sample);
            var rows = Math.floor(height/(sample));

            for (var i = 0; i < cols; i ++) {
                waveform[i] = 0;
                for (var j=0; j<rows; j++) {
                    var dataPoint = ((i*sample)*bits) + (((j*(sample*0.5))*length)*bits);
                    if (pal[dataPoint]!==0) { // if not black (wave color)
                        break;
                    }
                    waveform[i] = (1/rows)*j;
                }
            }

            gran.Waveform = waveform;
            console.log(gran.Waveform.length);
        //});

        //loader.start(); //// begin downloading image
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
                        "wavearray" : this.Waveform,
                        "spread" : this.GetParam("spread")
                    }
                },
                {
                    "type" : "sample",
                    "name" : "Sample",
                    "setting" :"sample",
                    "props" : {
                        "track" : this.GetParam("track"),
                        "user" : this.GetParam("user")
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Spread",
                    "setting" :"spread",
                    "props" : {
                        "value" : this.GetParam("spread"),
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
                        "value" : this.GetParam("grainlength"),
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
                        "value" : this.GetParam("density"),
                        "min" : 2,
                        "max" : this.MaxDensity,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    GetDuration() {
        if (this.Grains){
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
        this.Envelopes.push( new Tone.Envelope(
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
                var delay = (this.GrainSettings.rate / this.GrainSettings.density);
                var location = this.GrainSettings.region - (this.GrainSettings.spread * 0.5) + (Math.random() * this.GrainSettings.spread);
                location = this.LocationRange(location);

                // MAKE SURE THESE ARE IN SYNC //
                this._Envelopes[this._CurrentGrain].triggerAttackRelease(this.GrainSettings.smoothness,"+0");
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
                if (this._CurrentGrain >= this.GrainSettings.density) {
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
        if (location>(this.Grains[0].duration - this.GrainSettings.grainlength)) {
            location = (this.Grains[0].duration - this.GrainSettings.grainlength);
        }
        return location;
    }

    SetPitch(pitch: number, sourceId?: number, rampTime?: Tone.Time) {
        super.SetPitch(pitch, sourceId, rampTime);
        for (var i=0; i<this.MaxDensity; i++) {
            pitch /= App.BASE_NOTE;
            this.PlaybackRate = pitch;
        }
    }


    GetParam(param: string) {

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
                case "regionmax": val = this.Grains[0].duration;
                    break;
                case "track": val = "piano";
                    break;
                case "user": val = "kingstone";
                    break;
            }
            return val;
        }

    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        switch (param){
            case "density": this.GrainSettings.density = value;
                break;
            case "grainlength":
                this.GrainSettings.grainlength = value;
                this.GrainSettings.rate = this.GrainSettings.grainlength*2;
                this.GrainSettings.smoothness = this.GrainSettings.grainlength*0.5;
                for (var i=0; i< this.MaxDensity; i++) {
                    this._Envelopes[i].attack = this.GrainSettings.smoothness;
                    this._Envelopes[i].release = this.GrainSettings.smoothness;
                }

                break;
            case "spread": this.GrainSettings.spread = value;
                break;
            case "region": this.GrainSettings.region = value;
                break;
        }
    }



    Dispose(){
        super.Dispose();
        clearTimeout(this.Timeout);
        this._NoteOn = false;
        for (var i=0; i<this.MaxDensity; i++) {
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

}

export = Granular;