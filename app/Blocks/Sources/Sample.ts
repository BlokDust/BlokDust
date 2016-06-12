import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {IApp} from '../../IApp';
import {SamplerBase} from './SamplerBase';
import {SoundCloudAPI} from '../../Core/Audio/SoundCloud/SoundCloudAPI';
import {SoundCloudTrack} from '../../Core/Audio/SoundCloud/SoundcloudTrack';

declare var App: IApp;

export class Sample extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Params: SoundcloudParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    //private PrimaryBuffer: any;
    //private ReverseBuffer: any;
    private _LoadFromShare: boolean = false;
    private _FallBackTrack: SoundCloudTrack;
    public LoadTimeout: any;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Sample.name;

        if (this.Params) {
            this._LoadFromShare = true;

            setTimeout(() => {
                this.FirstSetup();
            },100);
        }

        this.Defaults = {
            playbackRate: 0,
            detune: 0,
            reverse: false,
            startPosition: 0,
            endPosition: null,
            loop: true,
            loopStart: 0,
            loopEnd: 0,
            volume: 11,
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

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------


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


    //-------------------------------------------------------------------------------------------
    //  SOUNDCLOUD SEARCH
    //-------------------------------------------------------------------------------------------


    Search(query: string) {
        this.Searching = true;
        App.MainScene.OptionsPanel.Animating = true;
        this.ResultsPage = 1;
        this.SearchResults = [];
        SoundCloudAPI.MultiSearch(query, App.Config.SoundCloudMaxTrackLength, this);
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

    //-------------------------------------------------------------------------------------------
    //  TRACK LOADING
    //-------------------------------------------------------------------------------------------

    // LOAD TRACK //
    LoadTrack(track, fullUrl?:boolean) {
        super.LoadTrack(track,fullUrl);
        fullUrl = fullUrl || false;

        // select load url, from SC or "picker" function //
        if (fullUrl) {
            this.Params.track = track.URI;
        } else {
            this.Params.track = SoundCloudAPI.LoadTrack(track);
        }

        // update rest of the params //
        this.Params.permalink = track.Permalink;
        this.Params.trackName = track.TitleShort;
        this.Params.user = track.UserShort;
        this.Params.reverse = false;
        this._WaveForm = [];

        // decode track & load up the buffers //
        this.SetBuffers();

        // Update visuals //
        this.RefreshOptionsPanel("animate");
    }

    // LOAD FAILED, FALL BACK TO LAST //
    TrackFallBack() {
        this._LoadFromShare = false;
        // If fallback is failing, reset fallback to the defaults (to end perpetual load loops) //
        if (this.Params.track === this._FallBackTrack.URI) {
            this._FallBackTrack = new SoundCloudTrack(this.Defaults.trackName,this.Defaults.user,this.Defaults.track,this.Defaults.permalink);
        }
        this.LoadTrack(this._FallBackTrack,true);
        App.Message("Load Failed: This Track Is Unavailable. Reloading last track.");
    }


    //-------------------------------------------------------------------------------------------
    //  BUFFERS
    //-------------------------------------------------------------------------------------------

    // DECODE LOADED TRACK & SET BUFFERS //
    SetBuffers() {

        // Stop sound //
        this.Sources.forEach((s: any)=> {
            s.triggerRelease();
        });

        // Set load Visual //
        App.AnimationsLayer.AddToList(this);

        // Load primary buffer //
        if (this.PrimaryBuffer) {
            this.PrimaryBuffer.dispose();
        }
        this.PrimaryBuffer = new Tone.Buffer(this.Params.track, (e) => {

            // We haven't timed out //
            clearTimeout(this.LoadTimeout);

            // Reset locators //
            var duration = this.GetDuration(this.PrimaryBuffer);
            if (!this._LoadFromShare) {
                console.log('not load from share');
                this.Params.startPosition = 0;
                this.Params.endPosition = duration;
                this.Params.loopStart = duration * 0.5;
                this.Params.loopEnd = duration;
            }

            // Set this as a fallback if future loads fail //
            this._FallBackTrack = new SoundCloudTrack(this.Params.trackName,this.Params.user,this.Params.track,this.Params.permalink);

            // Set the source buffers //
            this.Sources.forEach((s: Tone.Simpler)=> {
                s.player.buffer = e;
                s.player.loopStart = this.Params.loopStart;
                s.player.loopEnd = this.Params.loopEnd;
            });

            // Reset reverse buffer //
            if (this.ReverseBuffer) {
                this.ReverseBuffer = null;
            }

            // if loaded from save & reverse //
            if (this._LoadFromShare && this.Params.reverse) {
                this.ReverseTrack();
            }
            this._LoadFromShare = false;

            // Update visuals //
            App.AnimationsLayer.RemoveFromList(this);
            this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(e._buffer,200,5,95);
            this.RefreshOptionsPanel();

            // If playing, retrigger //
            /*if (this.IsPowered()) {
                this.TriggerAttack();
            }*/
            this.RetriggerActiveVoices();
        });

        // Start / reset loading timeout //
        clearTimeout(this.LoadTimeout);
        this.LoadTimeout = setTimeout( () => {
            this.TrackFallBack();
        },(App.Config.SoundCloudLoadTimeout*1000));


        //TODO - onerror doesn't seem to work
        this.PrimaryBuffer.onerror = () => {
            console.log("error");
            this.TrackFallBack();
        };
    }

    //-------------------------------------------------------------------------------------------
    //  TRACK REVERSING
    //-------------------------------------------------------------------------------------------

    // REVERSE THE TRACK //
    ReverseTrack() {

        // Set visuals //
        this._WaveForm = [];
        this.RefreshOptionsPanel("animate");
        App.AnimationsLayer.AddToList(this); // load animations


        // If we already have a reversed track //
        if (this.ReverseBuffer) {
            this.SwitchBuffer();
            return;
        }

        // Else generate it via the worker //
        setTimeout(() => {
            App.Audio.ReverseBuffer(this.Id,this.PrimaryBuffer._buffer);
        },20);
    }


    // SWITCH BETWEEN PRIMARY BUFFER AND REVERSE BUFFER //
    SwitchBuffer() {

        // Get target buffer //
        var sourceBuffer;
        if (this.Params.reverse) {
            sourceBuffer = this.ReverseBuffer.buffer;
        } else {
            sourceBuffer = this.PrimaryBuffer._buffer;
        }

        // Set the buffer //
        this.Sources.forEach((s:Tone.Simpler)=> {
            s.player.buffer = sourceBuffer;
        });

        // Retrigger any active voices //
        this.RetriggerActiveVoices();

        // Update visuals //
        App.AnimationsLayer.RemoveFromList(this);
        this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(sourceBuffer, 200, 5, 95);
        this.RefreshOptionsPanel();
    }


    // RETURN FROM WORKER, STORE & SET REVERSE BUFFER //
    SetReversedBuffer(buffer: any) {

        // Store data as ReverseBuffer //
        this.ReverseBuffer = App.Audio.ctx.createBufferSource();
        this.ReverseBuffer.buffer = App.Audio.ctx.createBuffer(buffer.length, buffer[0].length, 44100);
        for (var i=0; i< buffer.length; i++) {
            this.ReverseBuffer.buffer.copyToChannel (buffer[i],i,0);
        }

        // Set source buffers //
        this.Sources.forEach((s:Tone.Simpler)=> {
            s.player.buffer = this.ReverseBuffer.buffer;
        });

        // Retrigger any active voices //
        this.RetriggerActiveVoices();

        // Update visuals //
        App.AnimationsLayer.RemoveFromList(this);
        this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this.ReverseBuffer.buffer, 200, 5, 95);
        this.RefreshOptionsPanel();
    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------



    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }


    //-------------------------------------------------------------------------------------------
    //  OPTIONS
    //-------------------------------------------------------------------------------------------


    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : App.L10n.Blocks.Source.Blocks.Sample.name,
            "parameters" : [

                {
                    "type" : "waveregion",
                    "name" : "Region",
                    "setting" :"region",
                    "props" : {
                        "value" : 5,
                        "min" : 0,
                        "max" : this.GetDuration(this.PrimaryBuffer),
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
                this.Params.playbackRate = value;
                this.NoteUpdate();
                break;

            case "reverse":
                console.log('setting reverse ', value);
                value = value? true : false;
                this.Params[param] = val;
                this.ReverseTrack();
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

    //-------------------------------------------------------------------------------------------
    //  DISPOSE
    //-------------------------------------------------------------------------------------------


    Dispose(){
        super.Dispose();
    }
}
