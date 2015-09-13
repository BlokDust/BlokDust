import Grid = require("../../Grid");
import Source = require("../Source");
import SamplerBase = require("./SamplerBase");
import MainScene = require("../../MainScene");
import SoundCloudAudio = require('../SoundCloudAudio');
import SoundCloudAudioType = require('../SoundCloudAudioType');
import SoundcloudTrack = require("../../UI/SoundcloudTrack");

import IApp = require("../../IApp");

declare var App: IApp;

class Soundcloud extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Params: SoundcloudParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    private _FirstBuffer: any;
    private _LoadFromShare: boolean = false;
    private _FallBackTrack: SoundcloudTrack;
    public LoadTimeout: any;

    Init(sketch?: any): void {
        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                reverse: false,
                startPosition: 0,
                endPosition: null,
                loop: true,
                loopStart: 0,
                loopEnd: 0,
                retrigger: false, //Don't retrigger attack if already playing
                volume: 11,
                track: '../Assets/ImpulseResponses/teufelsberg01.wav',
                trackName: 'TEUFELSBERG',
                user: 'BGXA',
            };
        } else {
            this._LoadFromShare = true;

            setTimeout(() => {
                this.FirstSetup();
            },100);
        }

        this._WaveForm = [];
        this.SearchResults = [];
        this.Searching = false;
        this._FallBackTrack = new SoundcloudTrack(this.Params.trackName,this.Params.user,this.Params.track);

        super.Init(sketch);

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
            clearTimeout(this.LoadTimeout);
            this._WaveForm = this.GetWaveformFromBuffer(e._buffer,200,5,95);
            App.AnimationsLayer.RemoveFromList(this);
            var duration = this.GetDuration(this._FirstBuffer);
            if (!this._LoadFromShare) {
                this.Params.startPosition = 0;
                this.Params.endPosition = duration;
                this.Params.loopStart = duration * 0.5;
                this.Params.loopEnd = duration;
                this.Params.reverse = false;
            }
            this._LoadFromShare = false;
            this._FallBackTrack = new SoundcloudTrack(this.Params.trackName,this.Params.user,this.Params.track);

            this.RefreshOptionsPanel();

            this.Sources.forEach((s: Tone.Simpler)=> {
                s.player.buffer = e;
                s.player.loopStart = this.Params.loopStart;
                s.player.loopEnd = this.Params.loopEnd;
            });

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
        this.ResultsPage = 1;
        this.SearchResults = [];
        if (window.SC) {
            SoundCloudAudio.Search(query, App.Config.SoundCloudMaxTrackLength, (tracks) => {
                //FIXME: we need an error parameter for this callback. If SC timesout there are no tracks returned
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
        this.Params.reverse = false;
        this._WaveForm = [];

        this.SetBuffers();

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
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"soundcloud");
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
                        "user" : this.Params.user
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
                        "min" : 0.125,
                        "max" : 8,
                        "quantised" : false,
                        "centered" : true,
                        "logarithmic": true
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
                this.Sources[0].player.playbackRate.value = value;
                break;
            case "reverse":
                value = value? true : false;

                this._FirstBuffer.reverse = value;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.buffer = this._FirstBuffer;
                });
                this.Params[param] = val;
                // Update waveform
                this._WaveForm = this.GetWaveformFromBuffer(this._FirstBuffer._buffer,200,5,95);
                this.RefreshOptionsPanel();
                break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loop = value;
                });
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

export = Soundcloud;