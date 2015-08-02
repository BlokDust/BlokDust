import Grid = require("../../Grid");
import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");
import SoundCloudAudio = require('../SoundCloudAudio');
import SoundCloudAudioType = require('../SoundCloudAudioType');
import SoundcloudTrack = require("../../UI/SoundcloudTrack");

class Soundcloud extends Source {

    public Sources : Tone.Simpler[];
    public Params: SoundcloudParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    private _FirstBuffer: any;
    private _LoadFromShare: boolean = false;
    private _FallBackTrack: SoundcloudTrack;
    public LoadTimeout: any;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
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
            var me = this;
            setTimeout(function() {
                me.FirstSetup();
            },100);
        }

        this._WaveForm = [];
        this.SearchResults = [];
        this.Searching = false;
        this._FallBackTrack = new SoundcloudTrack(this.Params.trackName,this.Params.user,this.Params.track);

        //var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';
        //this.Params.track = SoundCloudAudio.PickRandomTrack(SoundCloudAudioType.Soundcloud);
        //this.Params.track = localUrl;

        super.Init(sketch);
        this.CreateSource();

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    CreateSource(){
        this.Sources.push( new Tone.Simpler() );
        this.Sources.forEach((s: Tone.Simpler, i: number)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            s.player.retrigger = this.Params.retrigger;
            s.player.reverse = this.Params.reverse;

            if (i > 0){
                s.player.buffer = this.Sources[0].player.buffer;
            }
        });
        return super.CreateSource();
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
            var duration = this.GetDuration();
            if (!this._LoadFromShare) {
                this.Params.startPosition = 0;
                this.Params.endPosition = duration;
                this.Params.loopStart = duration * 0.5;
                this.Params.loopEnd = duration;
            }
            this._LoadFromShare = false;
            this._FallBackTrack = new SoundcloudTrack(this.Params.trackName,this.Params.user,this.Params.track);

            if ((<BlocksSketch>this.Sketch).OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
                this.UpdateOptionsForm();
                (<BlocksSketch>this.Sketch).OptionsPanel.Populate(this.OptionsForm, false);
            }

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

    DataToBuffer() {

        var seconds = 2;
        var sampleRate = this.Sources[0].context.sampleRate;

        var gain = 1;

        var voices = 1 + Math.round(Math.random()*3);
        var harmonics = Math.round(Math.random()*13);
        var lfo = 1;
        var lfoFreq = 1 + Math.round(Math.random()*15);

        console.log(voices);
        console.log(harmonics);

        var freq = [];
        var currentVal = [];
        var polarity = [];
        var vGain = [];
        var drift = [];
        var type = [];


        var frequencies = [440,880,1320,1760,2200,2640,3080,3520,3960,220];
        var pool = ['a2','a3','a4','b3','b4','c3','c4','c5','d3','d4','e3','e4','f3','f4','g3','g4'];
        var sequence = [];
        var sequenceLength = Math.pow(2,1 + Math.round(Math.random()*6));
        for (var i=0; i<sequenceLength; i++) {
            sequence.push(this.Sources[0].noteToFrequency(pool[Math.floor(Math.random()*pool.length)]));
        }

        var data = new Float32Array(sampleRate*seconds);
        var noise = Math.random()*0.5;
        var saw = Math.round(Math.random());
        console.log(saw);

        var totalGain = 0;
        for (var i=0; i<(voices + harmonics + lfo); i++) {
            if (i<voices) {
                type[i] = 0;
            }
            else if (i>=voices && i< (voices + harmonics)) {
                type[i] = 1;
            }
            else {
                type[i] = 2;
            }

            freq[i] = frequencies[i];
            currentVal[i] = 0;
            polarity[i] = 1;
            drift[i] = 1;
            var dice = Math.floor(Math.random()*3);
            if (dice==0) {
                drift[i] = 0.9999 + (Math.random()*0.0002);
            }

            vGain[i] = 0.05 + (Math.random()*30);

            if (i >= (voices + harmonics)) {
                vGain[i] = 10 + (Math.random()*100);

            }

            totalGain += vGain[i];
        }
        var amp  = 1 / totalGain;



        // GENERATE BUFFER DATA //
        for (var i=0; i<data.length; i++) {


            var totalVal = 0;
            for (var j=0; j<(voices + harmonics + lfo); j++) {

                if (type[j]==0) { // voices
                    if (i == (Math.round(data.length/sequence.length) * Math.round((sequence.length/data.length)*i)) ) {
                        console.log(i);
                        freq[j] = sequence[Math.floor((sequence.length/data.length)*i)] + (5*j);
                    }
                    //freq[j] = sequence[Math.floor((sequence.length/data.length)*i)] + (5*j);
                    freq[j] *= drift[j];
                }
                else if (type[j]==1) { // harmonics
                    freq[j] = freq[0] * j;
                }
                 else if (type[j]==2) { // lfo
                    freq[j] = lfoFreq;
                }

                if (freq[j]>20000) {
                    freq[j] = 20000;
                }
                if (freq[j]<1) {
                    freq[j] = 1;
                }

                totalVal += (currentVal[j] * vGain[j]);


                var step = freq[j] * ((amp*4)/sampleRate);
                currentVal[j] += (step * polarity[j]);

                // stay within bounds //
                if (currentVal[j] > amp) {
                    var spill = currentVal[j] - amp;
                    if (saw==1 && j<(voices + harmonics)) {
                        currentVal[j] = -(amp - spill);
                    } else {
                        currentVal[j] = amp - spill;
                        polarity[j] = - polarity[j];
                    }

                }
                if (currentVal[j] < -amp) {
                    var spill = (currentVal[j] - (-amp));
                    currentVal[j] = (-amp) - spill;
                    polarity[j] = - polarity[j];
                }
            }
            // write to 32 bit array
            var roam = (1 - (noise*0.5)) + (Math.random()*noise);
            data[i] = (totalVal * roam) * gain;
        }

        // cancel any ongoing buffer loads //
        if (this._FirstBuffer) {
            this._FirstBuffer.dispose();
        }

        // fill buffer with data and get the waveform //
        this._FirstBuffer = this.Sources[0].context.createBuffer(1, data.length, sampleRate);
        this._FirstBuffer.copyToChannel(data,0,0);
        this._WaveForm = this.GetWaveformFromBuffer(this._FirstBuffer,200,5,95);
        var duration = this.GetDuration();
        this.Params.loopEnd = duration;

        // update options panel //
        if ((<BlocksSketch>this.Sketch).OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
            this.UpdateOptionsForm();
            (<BlocksSketch>this.Sketch).OptionsPanel.Populate(this.OptionsForm, false);
        }

        // update sources //
        this.Sources.forEach((s: Tone.Simpler)=> {
            s.player.buffer = this._FirstBuffer;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
        });

    }

    Search(query: string) {
        this.Searching = true;
        this.ResultsPage = 1;
        this.SearchResults = [];
        if (window.SC) {
            SoundCloudAudio.Search(query, 510, (tracks) => {
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

        if (App.BlocksSketch.OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
            this.UpdateOptionsForm();
            App.BlocksSketch.OptionsPanel.Populate(this.OptionsForm, false);
        }
    }

    TrackFallBack() {
        //TODO what if it's the first track failing? fallback matches current
        this.LoadTrack(this._FallBackTrack,true);
        App.Message("Load Failed: This Track Is Unavailable. Reloading last track.");
    }

    FirstSetup() {
        if (this._FirstRelease) {
            this.Search(App.BlocksSketch.SoundcloudPanel.RandomSearch(this));
            this.SetBuffers();
            //this.DataToBuffer();

            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
                e = this.Sources[i].envelope;
            });

            this.Sources.forEach((s: Tone.Simpler) => {
                s.connect(this.EffectsChainInput);
            });

            this._FirstRelease = false;
        }
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"soundcloud");
    }



    GetDuration() {
        if (this._FirstBuffer){
            return this._FirstBuffer.duration;
        } else {
            return 0;
        }
    }

    /**
     * Trigger a Simpler's attack
     * If no index is set trigger the first in the array
     * @param {number | string} index
     * Index is the position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be triggered
     */
    TriggerAttack(index: number|string = 0) {
        if (index === 'all'){
            // Trigger all the envelopes
            this.Sources.forEach((s: any)=> {
                s.triggerAttack('+0', this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
            });
        } else {
            // Trigger the specific one
            this.Sources[index].triggerAttack('+0', this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
        }
    }

    /**
     * Trigger a Simpler's release
     * If no index is set release the first in the array
     * @param index number|string position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be released
     */
    TriggerRelease(index: number|string = 0) {
        // Only if it's not powered
        if (!this.IsPowered()) {
            if (index === 'all'){
                // Trigger all the envelopes
                this.Sources.forEach((s: any)=> {
                    s.triggerRelease();
                });
            } else {
                // Trigger the specific one
                this.Sources[index].triggerRelease();
            }
        }
    }

    MouseUp() {
        this.FirstSetup();

        super.MouseUp();
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
                        "max" : this.GetDuration(),
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
                            "lit" : true
                        },
                        {
                            "name": "Looping",
                            "setting": "loop",
                            "value": this.Params.loop,
                            "lit" : true
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
                this.Sources[0].player.playbackRate = value;
                break;
            case "reverse":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.reverse = value;
                });
                this.Params[param] = val;
                // Update waveform
                this._WaveForm = this.GetWaveformFromBuffer(this._FirstBuffer._buffer,200,5,95);
                if ((<BlocksSketch>this.Sketch).OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
                    this.UpdateOptionsForm();
                    (<BlocksSketch>this.Sketch).OptionsPanel.Populate(this.OptionsForm, false);
                }
                break;
            case "loop":
                value = value? true : false;
                this.Sources[0].player.loop = value;
                // update display of loop sliders
                if ((<BlocksSketch>this.Sketch).OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
                    this.Params[param] = value;
                    this.UpdateOptionsForm();
                    (<BlocksSketch>this.Sketch).OptionsPanel.Populate(this.OptionsForm, false);
                }
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

        this.Sources.forEach((s: Tone.Simpler) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: Tone.Envelope) => {
            e.dispose();
        });
    }
}

export = Soundcloud;