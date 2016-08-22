import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {IApp} from '../../../IApp';
import {PostEffect} from '../PostEffect';
import {SoundCloudAPI} from  '../../../Core/Audio/SoundCloud/SoundCloudAPI';
import {SoundCloudTrack} from '../../../Core/Audio/SoundCloud/SoundcloudTrack';

declare var App: IApp;

export class Convolver extends PostEffect {

    public Defaults: ConvolutionParams;
    public Effect: Tone.Convolver;
    public LoadTimeout: any;
    public Params: ConvolutionParams;
    public ResultsPage: number;
    public SearchResults: SoundCloudTrack[];
    public Searching: boolean;
    public SearchString: string;
    private _FirstBuffer: any;
    private _FirstRelease: boolean = true;
    private _FallBackTrack: SoundCloudTrack;
    private _WaveForm: number[];

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Convolution.name;

        if (this.Params) { // TODO - must be better way, refresh function?
            var me = this;
            setTimeout(function() {
                me.FirstSetup();
            },100);
        }

        this.Defaults = {
            mix: 0.5,
            track: 'https://files.blokdust.io/impulse-responses/teufelsberg01.wav',
            trackName: 'TEUFELSBERG',
            user: 'Balance Mastering',
            permalink: ''
        };
        this.PopulateParams();


        this._WaveForm = [];
        this.SearchResults = [];
        this.Searching = false;
        this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);

        this.Effect = new Tone.Convolver();
        this.Effect.wet.value = this.Params.mix;

        super.Init(drawTo);

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

            this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);
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
            me.TrackFallBack();
        };

    }

    Search(query: string) {
        this.Searching = true;
        App.MainScene.OptionsPanel.Animating = true; //TODO: make searching an event
        this.ResultsPage = 1;
        this.SearchResults = [];
        SoundCloudAPI.MultiSearch(query, App.Config.ConvolverMaxTrackLength, this);
        /*SoundCloudAPI.Search(query, App.Config.ConvolverMaxTrackLength, (track: SoundCloudAPIResponse.Success ) => {
            this.SearchResults.push(new SoundCloudTrack(track.title, track.user.username, track.uri, track.permalink_url));
            this.Searching = false;
            App.MainScene.OptionsPanel.Animating = false;
        }, (error: SoundCloudAPIResponse.Error) => {
            this.Searching = false;
            App.MainScene.OptionsPanel.Animating = false;
            if (error.status === 452) {
                // Tracks were found but they don't have a blokdust tag or aren't creative commons
            }
        });*/
    }

    SetSearchResults(results) {
        super.SetSearchResults(results);
        this.Searching = false;
        App.MainScene.OptionsPanel.Animating = false;
        var len = results.length;
        for (var i=0; i<len; i++) {
            var track = results[i];
            this.SearchResults.push(new SoundCloudTrack(track.title, track.user.username, track.uri, track.permalink_url));
        }
    }

    LoadTrack(track,fullUrl?:boolean) {
        fullUrl = fullUrl || false;
        if (fullUrl) {
            this.Params.track = track.URI;
        } else {
            this.Params.track = SoundCloudAPI.LoadTrack(track);
        }
        this.Params.permalink = track.Permalink;
        this.Params.trackName = track.TitleShort;
        this.Params.user = track.UserShort;
        this._WaveForm = [];

        this.SetBuffer();

        this.RefreshOptionsPanel("animate");
    }

    TrackFallBack() {
        // IF CURRENT FAILING TRACK MATCHES FALLBACK, SET FALLBACK TO DEFAULT (to end perpetual load loops) //
        if (this.Params.track === this._FallBackTrack.URI) {
            this._FallBackTrack = new SoundCloudTrack(this.Defaults.trackName,this.Defaults.user,this.Defaults.track,this.Defaults.permalink);
        }
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
        this.DrawSprite(this.BlockName);
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
            "name" : App.L10n.Blocks.Effect.Blocks.Convolution.name,
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
                        "user" : this.Params.user,
                        "permalink" : this.Params.permalink
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

}
