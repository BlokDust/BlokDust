import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {IApp} from '../../IApp';
import {MainScene} from '../../MainScene';
import {SamplerBase} from './SamplerBase';
import {SoundCloudAPIResponse} from '../../Core/Audio/SoundCloud/SoundCloudAPIResponse';
import {SoundCloudAudioType} from '../../Core/Audio/SoundCloud/SoundCloudAudioType';
import {SoundCloudAPI} from '../../Core/Audio/SoundCloud/SoundCloudAPI';
import {SoundCloudTrack} from '../../Core/Audio/SoundCloud/SoundcloudTrack';
import {Source} from '../Source';

declare var App: IApp;

export class Soundcloud extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Params: SoundcloudParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    private _FirstBuffer: any;
    private _LoadFromShare: boolean = false;
    private _FallBackTrack: SoundCloudTrack;
    public LoadTimeout: any;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Soundcloud.name;

        if (this.Params) {
            this._LoadFromShare = true;

            setTimeout(() => {
                this.FirstSetup();
            },100);
        }

        this.Defaults = {
            playbackRate: 0,
            reverse: false,
            startPosition: 0,
            endPosition: null,
            loop: true,
            loopStart: 0,
            loopEnd: 0,
            volume: 11,
            track: 'https://files.blokdust.io/impulse-responses/teufelsberg01.wav',
            trackName: 'TEUFELSBERG',
            user: 'Balance Mastering'
        };
        this.PopulateParams();

        this._WaveForm = [];
        this.SearchResults = [];
        this.Searching = false;
        this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    SetBuffers() {

        // STOP SOUND //
        this.Sources.forEach((s: any)=> {
            s.triggerRelease();
        });

        // LOAD FIRST BUFFER //
        App.AnimationsLayer.AddToList(this); // load animations
        if (this._FirstBuffer) { // cancel previous loads
            this._FirstBuffer.dispose();
        }
        this._FirstBuffer = new Tone.Buffer(this.Params.track, (e) => {
            e.reverse = this.Params.reverse;
            clearTimeout(this.LoadTimeout);

            App.AnimationsLayer.RemoveFromList(this);
            var duration = this.GetDuration(this._FirstBuffer);
            if (!this._LoadFromShare) {
                console.log('not load from share');
                this.Params.startPosition = 0;
                this.Params.endPosition = duration;
                this.Params.loopStart = duration * 0.5;
                this.Params.loopEnd = duration;
            }

            this._LoadFromShare = false;
            this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);

            this.Sources.forEach((s: Tone.Simpler)=> {
                s.player.buffer = e;
                s.player.loopStart = this.Params.loopStart;
                s.player.loopEnd = this.Params.loopEnd;
            });
            console.log(this._FirstBuffer.reverse)
            console.log(this.Sources[0].player.reverse)

            this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(e._buffer,200,5,95);
            this.RefreshOptionsPanel();

            // IF PLAYING, RE-TRIGGER //
            if (this.IsPowered()) {
                this.TriggerAttack();
            }
        });

        clearTimeout(this.LoadTimeout);
        this.LoadTimeout = setTimeout( () => {
            this.TrackFallBack();
        },(App.Config.SoundCloudLoadTimeout*1000));

        //TODO - onerror doesn't seem to work
        this._FirstBuffer.onerror = () => {
            console.log("error");
            this.TrackFallBack();
        };

    }

    Search(query: string) {
        this.Searching = true;
        App.MainScene.OptionsPanel.Animating = true; //TODO: make searching an event
        this.ResultsPage = 1;
        this.SearchResults = [];
        SoundCloudAPI.MultiSearch(query, App.Config.SoundCloudMaxTrackLength, this);
        /*SoundCloudAPI.Search(query, App.Config.SoundCloudMaxTrackLength, (track: SoundCloudAPIResponse.Success ) => {
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

    LoadTrack(track, fullUrl?:boolean) {
        super.LoadTrack(track,fullUrl);
        fullUrl = fullUrl || false;
        if (fullUrl) {
            this.Params.track = track.URI;
        } else {
            this.Params.track = SoundCloudAPI.LoadTrack(track);
            this.Params.permalink = track.Permalink;
        }
        this.Params.trackName = track.TitleShort;
        this.Params.user = track.UserShort;
        this.Params.reverse = false;
        this._WaveForm = [];

        this.SetBuffers();

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
            this.SetBuffers();
            //this.DataToBuffer();

            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
                e = this.Sources[i].envelope;
            });

            this.Sources.forEach((s: Tone.Simpler) => {
                s.connect(this.AudioInput);
            });

            this._FirstRelease = false;
        }
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Soundcloud",
            "parameters" : [

                {
                    "type" : "waveregion",
                    "name" : "Region",
                    "setting" :"region",
                    "props" : {
                        "value" : 5,
                        "min" : 0,
                        "max" : this.GetDuration(this._FirstBuffer),
                        "quantised" : false,
                        "centered" : false,
                        "wavearray" : this._WaveForm,
                        "mode" : this.Params.loop
                    },"nodes": [
                    {
                        "setting": "startPosition",
                        "value": this.Params.startPosition
                    },

                    {
                        "setting": "endPosition",
                        "value": this.Params.endPosition
                    },

                    {
                        "setting": "loopStart",
                        "value": this.Params.loopStart
                    },

                    {
                        "setting": "loopEnd",
                        "value": this.Params.loopEnd
                    }
                ]
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
                    "type" : "switches",
                    "name" : "Loop",
                    "setting" :"loop",
                    "switches": [
                        {
                            "name": "Reverse",
                            "setting": "reverse",
                            "value": this.Params.reverse,
                            "lit" : true,
                            "mode": "offOn"
                        },
                        {
                            "name": "Looping",
                            "setting": "loop",
                            "value": this.Params.loop,
                            "lit" : true,
                            "mode": "offOn"
                        }
                    ]
                },
                {
                    "type" : "slider",
                    "name" : "playback",
                    "setting" :"playbackRate",
                    "props" : {
                        "value" : this.Params.playbackRate,
                        "min" : -App.Config.PlaybackRange,
                        "max" : App.Config.PlaybackRange,
                        "quantised" : false,
                        "centered" : true
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: any) {
        super.SetParam(param,value);
        var val = value;

        switch(param) {
            case "playbackRate":

                /*if ((<any>Tone).isSafari){
                    this.Sources[0].player.playbackRate = value;
                } else {
                    this.Sources[0].player.playbackRate.value = value;
                }*/
                this.Params.playbackRate = value;
                this.NoteUpdate();

                break;
            case "reverse":
                console.log('setting reverse ', value)
                value = value? true : false;

                this._FirstBuffer.reverse = value;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.buffer = this._FirstBuffer;
                });
                this.Params[param] = val;
                // Update waveform
                this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this._FirstBuffer._buffer,200,5,95);
                this.RefreshOptionsPanel();
                break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loop = value;
                });
                if (value === true && this.IsPowered()) {
                    this.Sources.forEach((s: Tone.Simpler) => {
                        s.player.stop();
                        s.player.start(s.player.startPosition);
                    });
                }
                // update display of loop sliders
                this.Params[param] = val;
                this.RefreshOptionsPanel();
                break;
            case "loopStart":
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loopStart = value;
                });
                break;
            case "loopEnd":
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loopEnd = value;
                });
                break;
        }

        this.Params[param] = value;
    }

    Dispose(){
        super.Dispose();
    }
}
