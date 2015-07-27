import Grid = require("../../Grid");
import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");
import SoundCloudAudio = require('../SoundCloudAudio');
import SoundCloudAudioType = require('../SoundCloudAudioType');

class Soundcloud extends Source {

    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    public Sources : Tone.Simpler[];
    private _FirstBuffer: any;

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
                track: '',
                trackName: 'Voices',
                user: 'SparkleFinger'
            };
        }

        this._WaveForm = [];
        this.SearchResults = [];

        var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';
        this.Params.track = SoundCloudAudio.PickRandomTrack(SoundCloudAudioType.Soundcloud);
        this.Params.track = localUrl;


        /*SoundCloudAudio.Search('dream pop', (tracks) => {
            tracks.forEach((track) => {
                console.log(track);
                console.log(track.user.username, track.title, track.id, track.tag_list);
            });
        });*/

        super.Init(sketch);

        this.CreateSource();

        /*this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });
        this.Sources.forEach((s: Tone.Simpler) => {
            s.connect(this.EffectsChainInput);
        });*/

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    CreateSource(){
        this.Sources.push( new Tone.Simpler() );
        this.Sources.forEach((s: Tone.Simpler)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            s.player.retrigger = this.Params.retrigger;
            s.player.reverse = this.Params.reverse;
        });
        return super.CreateSource();
    }

    SetBuffers() {
        //TODO: We don't need to do this for every source in Sources array. Once is enough
        // Update waveform
        this._FirstBuffer = new Tone.Buffer(this.Params.track, (e) => {
            this._WaveForm = this.GetWaveformFromBuffer(e._buffer,150,2,95);
            var duration = this.GetDuration();
            this.Params.startPosition = 0;
            this.Params.endPosition = duration;
            this.Params.loopStart = duration * 0.5;
            this.Params.loopEnd = duration * 0.75;

            if ((<BlocksSketch>this.Sketch).OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
                this.UpdateOptionsForm();
                (<BlocksSketch>this.Sketch).OptionsPanel.Populate(this.OptionsForm, false);
            }

            this.Sources.forEach((s: Tone.Simpler)=> {
                s.player.buffer = e;
            });

        });
    }

    Search(query: string) {
        this.SearchResults = [];
        SoundCloudAudio.Search(query, (tracks) => {
            tracks.forEach((track) => {
                this.SearchResults.push(track);
            });
        });
    }

    LoadTrack(track) {
        this.Params.track = SoundCloudAudio.LoadTrack(track);
        this.Params.trackName = track.title;
        this.Params.user = track.user.username;
        this._WaveForm = [];
        this.SetBuffers();

        if (App.BlocksSketch.OptionsPanel.Scale==1 && (<BlocksSketch>this.Sketch).OptionsPanel.SelectedBlock==this) {
            this.UpdateOptionsForm();
            App.BlocksSketch.OptionsPanel.Populate(this.OptionsForm, false);
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
        if (this._FirstRelease) {
            this.Search(App.BlocksSketch.SoundcloudPanel.RandomSearch());
            this.SetBuffers();

            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
                e = this.Sources[i].envelope;
            });

            this.Sources.forEach((s: Tone.Simpler) => {
                s.connect(this.EffectsChainInput);
            });

            this._FirstRelease = false;
        }

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
                this._WaveForm = this.GetWaveformFromBuffer(this._FirstBuffer._buffer,150,2,95);
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