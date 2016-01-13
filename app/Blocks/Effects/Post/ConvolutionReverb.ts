import {IApp} from '../../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import {SoundCloudAudioType} from '../../../Core/Audio/SoundCloudAudioType';
import {SoundCloudAudio} from  '../../../Core/Audio/SoundCloudAudio';
import {SoundcloudTrack} from '../../../UI/SoundcloudTrack';
import Point = etch.primitives.Point;

declare var App: IApp;

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

    Init(drawTo: IDisplayContext): void {

        this.BlockName = "Convolver";

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
        App.MainScene.OptionsPanel.Animating = true;
        this.ResultsPage = 1;
        this.SearchResults = [];
        if (window.SC) {
            SoundCloudAudio.Search(query, App.Config.ConvolverMaxTrackLength, (tracks) => {
                tracks.forEach((track) => {
                    this.SearchResults.push(new SoundcloudTrack(track.title,track.user.username,track.uri));
                });
                this.Searching = false;
                App.MainScene.OptionsPanel.Animating = false;
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

        this.RefreshOptionsPanel("animate");
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
        this.DrawSprite("convolution");
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

}
