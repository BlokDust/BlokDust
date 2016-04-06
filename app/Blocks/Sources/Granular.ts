import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../MainScene';
import {Particle} from '../../Particle';
import Point = etch.primitives.Point;
import {SoundCloudAudioType} from '../../Core/Audio/SoundCloud/SoundCloudAudioType';
import {SoundCloudAPI} from '../../Core/Audio/SoundCloud/SoundCloudAPI';
import {SoundCloudTrack} from '../../Core/Audio/SoundCloud/SoundcloudTrack';
import {SoundCloudAPIResponse} from '../../Core/Audio/SoundCloud/SoundCloudAPIResponse';
import {Source} from '../Source';
import {GranularVoice} from './GranularComponents/GranularVoice';
import {Grain} from './GranularComponents/Grain';

declare var App: IApp;

export class Granular extends Source {

    public Sources: Tone.Signal[];
    public Grains: Tone.Player[] = [];
    private _Envelopes: Tone.AmplitudeEnvelope[] = [];
    public Timeout;
    public EndTimeout;
    private _FirstRelease: boolean = true;
    private _CurrentGrain: number = 0;
    private _IsLoaded: boolean;
    public GrainsAmount: number = 16;
    private _NoteOn: boolean = false;
    private _WaveForm: number[];
    private _FirstBuffer: any;
    private _LoadFromShare: boolean = false;
    private _FallBackTrack: SoundCloudTrack;
    public LoadTimeout: any;
    private _tempPlaybackRate: number;
    public ReleaseTimeout;

    public Params: GranularParams;
    public Defaults: GranularParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Granular.name;

        if (this.Params) {
            this._LoadFromShare = true;
            setTimeout(() => {
                this.FirstSetup();
            },100);
        }

        this.Defaults = {
            playbackRate: 1,
            density: 10,
            region: 0,
            spread: 1.5,
            grainlength: 0.25,
            track: SoundCloudAPI.PickRandomTrack(SoundCloudAudioType.Granular),
            trackName: 'TEUFELSBERG',
            user: 'BGXA',
            permalink: ''
        };
        this.PopulateParams();

        this._tempPlaybackRate = this.Params.playbackRate;
        this._WaveForm = [];
        this.SearchResults = [];
        this.Searching = false;
        this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);

        super.Init(drawTo);

        //this.Params.track = SoundCloudAudio.PickRandomTrack(SoundCloudAudioType.Granular);

        this.CreateSource();
        this.CreateEnvelope();
        this.CreateGrains();

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));
    }

    Reset(){
        this.Grains.length = 0;
        this._Envelopes.length = 0;
    }

    Search(query: string) {
        this.Searching = true;
        App.MainScene.OptionsPanel.Animating = true; //TODO: make searching an event
        this.ResultsPage = 1;
        this.SearchResults = [];
        SoundCloudAPI.MultiSearch(query, App.Config.GranularMaxTrackLength, this);
        /*SoundCloudAPI.Search(query, App.Config.GranularMaxTrackLength, (track: SoundCloudAPIResponse.Success ) => {
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

    LoadTrack(track,fullUrl?:boolean) { // TODO: make this a generic function with a function argument (to pass SetupGrains or SetupBuffers etc)
        fullUrl = fullUrl || false;
        if (fullUrl) {
            this.Params.track = track.URI;
        } else {
            this.Params.track = SoundCloudAPI.LoadTrack(track);
            this.Params.permalink = track.Permalink;
        }
        this.Params.trackName = track.TitleShort;
        this.Params.user = track.UserShort;
        this._WaveForm = [];
        this.SetupGrains();

        this.RefreshOptionsPanel("animate");
    }

    TrackFallBack() {
        //TODO what if it's the first track failing? fallback matches current
        this.LoadTrack(this._FallBackTrack,true);
        App.Message("Load Failed: This Track Is Unavailable. Reloading last track.");
    }

    CreateGrains() {
        if (!this.Grains[0]) {
            for (var i=0; i<this.GrainsAmount; i++) {

                // CREATE PLAYER //
                this.Grains[i] = new Tone.Player();

                // CREATE ENVELOPE //
                this._Envelopes[i] = new Tone.AmplitudeEnvelope(
                    this.Params.grainlength/2,  // Attack
                    0.01,                       // Decay
                    0.9,                        // Sustain
                    this.Params.grainlength/2   // Release
                );

                // CONNECT //
                this.Grains[i].connect(this._Envelopes[i]);
                this._Envelopes[i].connect(this.Sources[0]);
                if ((<any>Tone).isSafari){
                    (<any>this.Grains[i]).playbackRate = this.Params.playbackRate;
                } else {
                    this.Grains[i].playbackRate.value = this.Params.playbackRate;
                }
            }
            //this.Sources[0].connect(this.AudioInput);

            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
                e.connect(this.AudioInput);
            });

            this.Sources.forEach((s: Tone.Signal, i: number)=> {
                s.connect(this.Envelopes[i]);
            });
        }
    }

    SetupGrains() {
        // RESET //
        this._IsLoaded = false;
        var duration = this.GetDuration();


        // LOAD FIRST BUFFER //
        App.AnimationsLayer.AddToList(this); // load animations
        if (this._FirstBuffer) { // cancel previous loads
            this._FirstBuffer.dispose();
        }
        this._FirstBuffer = new Tone.Player(this.Params.track, (e) => {
            clearTimeout(this.LoadTimeout);
            this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(e.buffer._buffer,200,2,80);
            App.AnimationsLayer.RemoveFromList(this);
            this._IsLoaded = true;


            // COPY BUFFER TO GRAINS //
            for (var i=0; i<this.GrainsAmount; i++) {
                this.Grains[i].buffer = e.buffer;
            }

            var duration = this.GetDuration();
            if (!this._LoadFromShare) {
                this.Params.region = duration / 2;
            }
            this._LoadFromShare = false;
            this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);

            // UPDATE OPTIONS FORM //
            this.RefreshOptionsPanel();

            // start if powered //
            this.GrainLoop();
        });

        var me = this;
        clearTimeout(this.LoadTimeout);
        this.LoadTimeout = setTimeout( function() {
            me.TrackFallBack();
        },(App.Config.SoundCloudLoadTimeout*1000));

        //TODO - onerror doesn't seem to work
        this._FirstBuffer.onerror = function() {
            console.log("error");
            me.TrackFallBack();
        };

    }

    FirstSetup() {
        if (this._FirstRelease) {

            this.Sources.forEach((s: Tone.Signal, i: number) => {
                s.connect(this.Envelopes[i]);
            });

            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
                e.connect(this.AudioInput);
            });

            this.Search(App.MainScene.SoundcloudPanel.RandomSearch(this));
            this.SetupGrains();

            this._FirstRelease = false;
        }
    }

    GetDuration(): number {
        if (this._FirstBuffer){
            return this._FirstBuffer.buffer.duration;
        } else {
            return 0;
        }
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    CreateSource(){
        this.Sources.push( new Tone.Signal() );
        // return it
        //TODO these extra sources need setting up somehow
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

            /*this._Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
                e.triggerAttack();
            });*/

            clearTimeout(this.EndTimeout);
            if (!this._NoteOn) {

                this._NoteOn = true;
                this.GrainLoop();
            }
        }
    }

    TriggerRelease() {
        super.TriggerRelease();

        /*this._Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.triggerRelease();
        });*/

        //clearTimeout(this.EndTimeout);
        var that = this;
        this.EndTimeout = setTimeout(() => {
            that._NoteOn = false;
        }, <number>this.Envelopes[0].release*1000);
    }

    TriggerAttackRelease(index: number|string = 0, duration: Tone.Time = App.Config.PulseLength){

        if (this._IsLoaded) {

            clearTimeout(this.EndTimeout);
            if (!this._NoteOn) {

                this._NoteOn = true;
                this.GrainLoop();
            }
        }

        this.ReleaseTimeout = setTimeout(() => {
            this.EndTimeout = setTimeout(() => {
                this._NoteOn = false;
            }, <number>this._Envelopes[0].release*1000);
        }, duration);

    }


    MouseUp() {
        this.FirstSetup();

        super.MouseUp();
    }

    GrainLoop() {

        // CYCLES THROUGH GRAINS AND PLAYS THEM //
        if (this._Envelopes[this._CurrentGrain] && (this.IsPowered() || this._NoteOn)) {

           var location = this.LocationRange(
               this.Params.region - (this.Params.spread * 0.5) + (Math.random() * this.Params.spread)
           );

            // MAKE SURE THESE ARE IN SYNC //
            this._Envelopes[this._CurrentGrain].triggerAttackRelease(this.Params.grainlength/2,"+0.01");
            this.Grains[this._CurrentGrain].stop();
            this.Grains[this._CurrentGrain].playbackRate.value = this._tempPlaybackRate;
            this.Grains[this._CurrentGrain].start("+0.01", location, (this.Params.grainlength*this._tempPlaybackRate)*1.9);
            clearTimeout(this.Timeout);
            this.Timeout = setTimeout(() => {
                this.GrainLoop();
            }, Math.round(((this.Params.grainlength*2) / this.Params.density)*1500));

            this._CurrentGrain += 1;
            if (this._CurrentGrain >= this.Params.density) {
                this._CurrentGrain = 0;
            }
        }
    }


    // CAP POSITIONS OF GRAINS TO STAY WITHIN TRACK LENGTH //
    LocationRange(location: number) {
        var locationCap = this.Grains[0].duration - this.Params.grainlength;
        if (location < 0) {
            location = 0;
        } else if (location > locationCap) {
            location = locationCap;
        }
        return location;
    }

    SetPitch(pitch: number, sourceId?: number, rampTime?: Tone.Time) {
        pitch = pitch / App.Config.BaseNote;
        for (var i=0; i<this.GrainsAmount; i++) {
            if ((<any>Tone).isSafari) {
                (<any>this.Grains[i]).playbackRate = pitch;
            } else {
                this.Grains[i].playbackRate.value = pitch;
            }
        }
        this._tempPlaybackRate = pitch;
        console.log(this._tempPlaybackRate);
        console.log(this.Params.playbackRate);
    }

    /**
     * Reset granular pitches back to their original Params setting
     */
    ResetPitch() {
        if (App.Config.ResetPitchesOnInteractionDisconnect) {
            this._tempPlaybackRate = this.Params.playbackRate;
            for (var i=0; i<this.GrainsAmount; i++) {
                if ((<any>Tone).isSafari) {
                    (<any>this.Grains[i]).playbackRate = this.Params.playbackRate;
                } else {
                    this.Grains[i].playbackRate.value = this.Params.playbackRate;
                }
            }
        }
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        switch (param){
            case "density": this.Params.density = value;
                break;
            case "grainlength":
                this.Params.grainlength = value;
                for (var i=0; i< this.GrainsAmount; i++) {
                    this._Envelopes[i].attack = value/2;
                    this._Envelopes[i].release = value/2;
                }

                break;
            case "spread": this.Params.spread = value;
                break;
            case "region": this.Params.region = value;
                break;
        }
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
                        "value" : this.Params.region,
                        "min" : 0,
                        "max" : this.GetDuration(),
                        "quantised" : false,
                        "centered" : false,
                        "wavearray" : this._WaveForm,
                        "spread" : this.Params.spread
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

    Dispose(){
        super.Dispose();
        clearTimeout(this.Timeout);
        this._NoteOn = false;

        this.Grains.forEach((g: Tone.Player)=> {
            g.dispose();
        });

        this._Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.dispose();
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.dispose();
        });

        this.Sources.forEach((s: Tone.Signal)=> {
            s.dispose();
        });

        this.Grains.length = 0;
        this._Envelopes.length = 0;
    }
}
