import {Grid} from '../../../Grid';
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import {SoundCloudAudio} from  '../../../Core/Audio/SoundCloudAudio';
import {SoundCloudAudioType} from '../../../Core/Audio/SoundCloudAudioType';
import {SoundcloudTrack} from '../../../UI/SoundcloudTrack';

export class Convolver extends PostEffect {

    public Defaults: ConvolutionParams;
    public Effect: Tone.Convolver;
    public LoadTimeout: any;
    public Params: ConvolutionParams;
    public ResultsPage: number;
    public SearchResults: SoundcloudTrack[];
    public Searching: boolean;
    public SearchString: string;
    private _FirstBuffer: any;
    private _FirstRelease: boolean = true;
    private _FallBackTrack: SoundcloudTrack;
    private _WaveForm: number[];

    Init(sketch?: any): void {

        if (this.Params) { // TODO - must be better way, refresh function?
            var me = this;
            setTimeout(function() {
                me.FirstSetup();
            },100);
        }

        this.Defaults = {
            mix: 1,
            track: '../Assets/ImpulseResponses/teufelsberg01.wav',
            trackName: 'TEUFELSBERG',
            user: 'BGXA'
        };
        this.PopulateParams();


        this._WaveForm = [];
        this.SearchResults = [];
        this.Searching = false;
        this._FallBackTrack = new SoundcloudTrack(this.Params.trackName,this.Params.user,this.Params.track);

        this.Effect = new Tone.Convolver();
        this.Effect.wet.value = this.Params.mix;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
    }

    SetBuffer() {
        // LOAD FIRST BUFFER //
        App.AnimationsLayer.AddToList(this); // load animations
        if (this._FirstBuffer) { // cancel previous loads
            this._FirstBuffer.dispose();
        }
        this._FirstBuffer = new Tone.Buffer(this.Params.track, (e) => {
            clearTimeout(this.LoadTimeout);
            this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(e._buffer,200,5,95);
            App.AnimationsLayer.RemoveFromList(this);
            //var duration = this.GetDuration();

            this._FallBackTrack = new SoundcloudTrack(this.Params.trackName,this.Params.user,this.Params.track);
            this.RefreshOptionsPanel();

            this.Effect.buffer = e;

        });
        var me = this;
        clearTimeout(this.LoadTimeout);
        this.LoadTimeout = setTimeout( function() {
            me.TrackFallBack();
        },(App.Config.SoundCloudLoadTimeout *1000));

        //TODO - onerror doesn't seem to work
        this._FirstBuffer.onerror = function() {
            console.log("error");
            me.TrackFallBack();
        };

    }

    Search(query: string) {
        this.Searching = true;
        this.ResultsPage = 1;
        this.SearchResults = [];
        if (window.SC) {
            SoundCloudAudio.Search(query, App.Config.ConvolverMaxTrackLength, (tracks) => {
                tracks.forEach((track) => {
                    this.SearchResults.push(new SoundcloudTrack(track.title,track.user.username,track.uri));
                });
                this.Searching = false;
            });
        }
    }

    LoadTrack(track,fullUrl?:boolean) {
        fullUrl = fullUrl || false;
        if (fullUrl) {
            this.Params.track = track.URI;
        } else {
            this.Params.track = SoundCloudAudio.LoadTrack(track);
        }
        this.Params.trackName = track.TitleShort;
        this.Params.user = track.UserShort;
        this._WaveForm = [];

        this.SetBuffer();

        this.RefreshOptionsPanel();
    }

    TrackFallBack() {
        //TODO what if it's the first track failing? fallback matches current
        this.LoadTrack(this._FallBackTrack,true);
        App.Message("Load Failed: This Track Is Unavailable. Reloading last track.");
    }

    FirstSetup() {
        if (this._FirstRelease) {
            this.Search(App.MainScene.SoundcloudPanel.RandomSearch(this));
            this.SetBuffer();
            this._FirstRelease = false;
        }
    }

    GetDuration() {
        if (this._FirstBuffer){
            return this._FirstBuffer.duration;
        } else {
            return 0;
        }
    }


    Draw() {
        super.Draw();

        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"convolution");
    }

    MouseUp() {
        this.FirstSetup();

        super.MouseUp();
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="mix") {
            this.Effect.wet.value = val;
        }

        this.Params[param] = val;
    }



    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Convolver",
            "parameters" : [

                {
                    "type" : "waveimage",
                    "name" : "Wave",
                    "setting" :"region",
                    "props" : {
                        "wavearray" : this._WaveForm
                    }
                },
                {
                    "type" : "sample",
                    "name" : "Sample",
                    "setting" :"sample",
                    "props" : {
                        "track" : this.Params.trackName,
                        "user" : this.Params.user
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"mix",
                    "props" : {
                        "value" : this.Params.mix,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }

    //TODO - make function of Block.ts
    //GetWaveformFromBuffer(buffer,points,stepsPerPoint,normal) {
    //
    //    console.log(buffer);
    //    console.log(`minutes: ${buffer.duration/60}`);
    //
    //    // defaults //
    //    stepsPerPoint = 10; // checks per division
    //    var leftOnly = false; // don't perform channel merge
    //
    //
    //    var newWaveform = [];
    //    var peak = 0.0;
    //
    //    // MERGE LEFT & RIGHT CHANNELS //
    //    var left = buffer.getChannelData(0);
    //    if (buffer.numberOfChannels>1 && !leftOnly) {
    //        var right = buffer.getChannelData(1);
    //    }
    //
    //    var slice = Math.ceil( left.length / points );
    //    var step = Math.ceil( slice / stepsPerPoint );
    //
    //    // FOR EACH DETAIL POINT //
    //    for(var i=0; i<points; i++) {
    //
    //        // AVERAGE PEAK BETWEEN POINTS //
    //        var max1 = 0.0;
    //        var max2 = 0.0;
    //        for (var j = 0; j < slice; j += step) {
    //            var datum = left[(i * slice) + j];
    //            if (datum < 0) { datum = -datum;}
    //            if (datum > max1) {max1 = datum;}
    //            if (right) {
    //                var datum2 = right[(i * slice) + j];
    //                if (datum2 < 0) { datum2 = -datum2;}
    //                if (datum2 > max2) {max2 = datum2;}
    //                if (max2 > max1) {max1 = max2;}
    //            }
    //
    //        }
    //        if (max1 > peak) {peak = max1;} // set overall peak used for normalising
    //        newWaveform.push(max1);
    //    }
    //
    //    // SOFT NORMALISE //
    //    var percent = normal/100; // normalisation strength
    //    var mult = (((1/peak) - 1)*percent) + 1;
    //    for (var i=0; i<newWaveform.length; i++) {
    //        newWaveform[i] = newWaveform[i] * mult;
    //    }
    //
    //    return newWaveform;
    //}
}