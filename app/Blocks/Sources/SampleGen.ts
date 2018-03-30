import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {SamplerBase} from './SamplerBase';
import {WaveVoice} from '../../WaveVoice';

declare var App: IApp;

export class SampleGen extends SamplerBase {

    //private WaveForm: number[];
    private _FirstRelease: boolean = true;
    public Sources: Tone.Simpler[];
    //private PrimaryBuffer: any;
    private _LoadFromShare: boolean = false;
    private _BufferData: Float32Array;
    private _WaveVoices: WaveVoice[];
    private _SeedLoad: boolean;
    public Params: SampleGenParams;
    public Defaults: SampleGenParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.SampleGen.name;

        if (this.Params) {
            this._LoadFromShare = true;
            var me = this;
            setTimeout(function() {
                me.FirstSetup();
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
            generate: null,
            seed: {}
        };
        this.PopulateParams();

        this.WaveForm = [];
        this._WaveVoices = [];
        this._SeedLoad = true;


        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(0, -1),new Point(1, 0),new Point(1, 2),new Point(0, 2),new Point(-1, 1));
    }

    Arp(mode,notes,octave,range,length) {

        var seq = [];

        switch (mode) {
            case 1:
                for (var j=0; j<length; j++) {
                    seq.push( this.Sources[0].noteToFrequency("" + notes[0] + (octave + Math.floor(Math.random()*range))) );
                }
                return seq;
            case 2:
                for (var j=0; j<length; j++) {
                    seq.push( this.Sources[0].noteToFrequency("" + notes[Math.floor(Math.random()*notes.length)] + (octave + Math.floor(Math.random()*range))) );
                }
                return seq;
            case 3:
                var dir = 1;
                if (this.Dice(2)) {dir = -1;}
                var change = 3 + Math.round(Math.random()*5);
                var note = Math.floor(Math.random()*notes.length);
                var thisOctave = Math.floor(Math.random()*range);

                for (var j=0; j<length; j++) {
                    seq.push( this.Sources[0].noteToFrequency("" + notes[note] + (octave + thisOctave)) );

                    if (this.Dice(change)) {dir = -dir;}
                    note += dir;
                    if (note < 0) {
                        if (thisOctave > 0) {
                            note = (notes.length-1);
                            thisOctave -= 1;
                        } else {
                            note += 2;
                            dir = 1;
                        }
                    }
                    if (note > (notes.length-1)) {
                        if (thisOctave < range) {
                            note = 0;
                            thisOctave += 1;
                        } else {
                            note -= 2;
                            dir = -1;
                        }
                    }
                }

                return seq;
        }
    }


    Dice(sides) {
        return ((Math.floor(Math.random()*sides))==0);
    }



    //-------------------------------------------------------------------------------------------
    //  GENERATION
    //-------------------------------------------------------------------------------------------




    DataToBuffer() {


        // SETTINGS //
        var seconds = 2;
        var sampleRate = App.Audio.sampleRate;
        var gain = 1;

        var noise = 0;
        if (this.Dice(2)) { noise = Math.random()*0.5; }
        var waveType = Math.floor(Math.random()*3);
        var octaving = 0;
        var organise = false;
        if (this.Dice(8)) {
            if (this.Dice(3)) {
                octaving = 2;
            } else {
                octaving = 1;
            }
            if (this.Dice(3)) {
                organise = true;
            }
        }
        var following = false;
        if (this.Dice(4)) {
            following = true;
        }
        var glide = 1 + Math.round(Math.random()*20);
        var noGlide = false;
        if (this.Dice(2)) { noGlide = true; }

        // ARPEGGIO SEQUENCER //
        var notes = ['c','d','e','f','g','a','b'];
        var wonder = ['c','e','f','a'];
        var minor = ['c','d#','g','g#'];
        var jpent = ['c','c#','f','g','a#'];
        var second = ['c','f','g','g#'];
        var jazz = ['c','d','d#','g','a','a#'];
        var scales = [wonder,minor,jpent,second,jazz];
        var scale;
        var sequenceLength = Math.pow(2,1 + Math.round(Math.random()*6));
        if (sequenceLength==2) {
            if (this.Dice(2)) { sequenceLength = 4; }
        }

        var octave = 4;
        var range = 1;

        var arpMode;
        switch (Math.floor(Math.random()*10)) {
            case 0:
                arpMode = 1;
                break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
                arpMode = 2;
                break;
            case 7:
            case 8:
            case 9:
                arpMode = 3;
                break;
        }


        var octaveLower = 0;
        if (this.Dice(2)) { octaveLower = Math.ceil(Math.random()*2); }

        if (arpMode==1) {
            octave = 2 + Math.round(Math.random()*(3 - octaveLower));
            range = 2 + Math.round(Math.random()*(4 - (octave-2)));
            if (sequenceLength<8) {
                if (this.Dice(2)) { sequenceLength = 8; }
            }
            scale = notes;
        }
        if (arpMode==2) {
            octave = 1 + Math.round(Math.random()*(6 - octaveLower));
            range = 1 + Math.floor(Math.random()*(6 - (octave-1)));
            scale = notes;
            if (this.Dice(4)) { scale = scales[Math.floor(Math.random()*scales.length)]; }
        }
        if (arpMode==3) {
            octave = 1 + Math.round(Math.random()*(5 - octaveLower));
            range = 1 + Math.floor(Math.random()*(6 - (octave-1)));
            if (sequenceLength<8) {
                sequenceLength = 8;
            }
            scale = scales[Math.floor(Math.random()*scales.length)];
        }

        /*console.log("mode: "+arpMode);
        console.log("range: "+range);
        console.log("octave: "+octave);*/

        // CREATE DATA ARRAY //
        this._BufferData = new Float32Array(sampleRate*seconds);
        var data = this._BufferData;

        // SETUP VOICES //
        var voices, harmonics, lfo;
        this._WaveVoices = [];
        voices = 1 + Math.round(Math.random()*3);
        harmonics = Math.round(Math.random()*13);
        lfo = Math.round(Math.random());
        if (this.Dice(8)) {
            voices = 1 + Math.round(Math.random()*20);
            harmonics = 3 + Math.round(Math.random()*6);
            //console.log("DENSE");
        }
        if (this.Dice(8)) {
            voices = 10 + Math.round(Math.random()*10);
            harmonics = 3;
            lfo = 0;
            //console.log("DENSE2");
        }

        // VOICE LOOP //
        var totalGain = 0;
        for (var i=0; i<(voices + harmonics + lfo); i++) {
            var t,w,f,vol,d,s,sl;

            // defaults //
            vol = 0.05 + (Math.random()*30);
            f = 440;
            d = 1;
            s = [];
            sl = false;
            w = waveType;

            // type //
            if (i<voices) { // voice
                t = 0;

                // ARPEGGIATION //
                if (arpMode>0) {
                    if (i==0) {
                        s = this.Arp(arpMode,scale,octave,range,sequenceLength);
                    } else {
                        if (this.Dice(3)) {
                            s = this.Arp(arpMode,scale,octave,range,sequenceLength);
                        }
                    }
                }

                // SAW //
                if (w==1) { // half frequencies
                    f *= 0.5;
                    if (s.length>0) {
                        for (j=0; j<s.length; j++) {
                            s[j] *= 0.5;
                        }
                    }
                }

                // ORGANISE //
                if (organise && i>0) {
                    vol = this._WaveVoices[0].Volume;
                }

                // FREQUENCY DRIFT //
                if (this.Dice(3)) { d = 0.9999 + (Math.random()*0.0002); }
                if (following && i>0) {
                    d = this._WaveVoices[0].Drift;
                }

                // SLIDE //
                if (this.Dice(4) && !noGlide) { sl = true; }

            }
            else if (i>=voices && i< (voices + harmonics)) { // harmonic
                t = 1;
                // SLIDE //
                if (this.Dice(4) && !noGlide) { sl = true; }
            }
            else { // lfo
                t = 2;
                vol = 10 + (Math.random()*100);
                f = 1 + Math.round(Math.random()*15);
            }

            this._WaveVoices.push(new WaveVoice(t,w,f,vol,d,s,sl));
            totalGain += vol;
        }
        var amp  = 1 / totalGain;

        // get seed //
        if (this.Params.seed.waveVoices && this._SeedLoad && this._LoadFromShare) {

            var seed = this.Params.seed;
            sequenceLength = seed.sequenceLength;
            seconds = seed.seconds;
            gain = seed.gain;
            noise = seed.noise;
            octaving = seed.octaving;
            glide = seed.glide;
            this._WaveVoices = seed.waveVoices;
            voices = seed.voices;
            harmonics = seed.harmonics;
            amp = seed.amp;
            this._SeedLoad = false;
        }

        //set seed //
        this.Params.seed = {
            sequenceLength: sequenceLength,
            seconds: seconds,
            gain: gain,
            noise: noise,
            octaving: octaving,
            glide: glide,
            waveVoices: this._WaveVoices,
            voices: voices,
            harmonics: harmonics,
            amp: amp
        };
        //console.log(this.Params.seed);


        // GENERATE BUFFER DATA //
        var waveVoices = this._WaveVoices;
        var overflow = 800;
        var dataLength = data.length;
        for (var i=0; i<(dataLength + overflow); i++) {

            // FOR EACH VOICE //
            var totalVal = 0;
            for (var j=0; j<waveVoices.length; j++) {
                var v = waveVoices[j];

                // voice type //
                switch (v.VoiceType) {
                    case 0:
                        if (i == (Math.round(dataLength/sequenceLength) * Math.round((sequenceLength/dataLength)*i)) && i<dataLength) {
                            // if at a step point, update the sequence frequency //
                            if (v.Sequence.length==0) {

                                if (octaving==1) {
                                    v.FDest = (waveVoices[0].Frequency * (2*j));
                                }
                                else if (octaving==2) {
                                    v.FDest = (waveVoices[0].Frequency / (2*j));
                                }
                                else {
                                    v.FDest = (waveVoices[0].Frequency + (5*j));
                                }

                                if (!v.Slide) {
                                    v.Frequency = v.FDest;
                                }

                            } else {
                                v.FDest = v.Sequence[Math.floor((sequenceLength/dataLength)*i)];
                                if (!v.Slide) {
                                    v.Frequency = v.FDest;
                                }
                            }
                        }
                        if (v.Slide) {
                            v.Frequency += (((v.FDest - v.Frequency)/10000))*glide;
                        }

                        v.Frequency *= v.Drift;



                        break;

                    case 1:
                        v.FDest = (waveVoices[0].Frequency * j);

                        if (v.Slide) {
                            v.Frequency += (((v.FDest - v.Frequency)/10000))*glide;
                        } else {
                            v.Frequency = v.FDest;
                        }

                        break;
                }


                // cap freq range //
                var maxFreq = 20000;
                if (v.Frequency>maxFreq) {
                    v.Frequency = maxFreq;
                }
                if (v.Frequency<1) {
                    v.Frequency = 1;
                }



                // update total amplitude for this sample //
                totalVal += (v.Value * v.Volume);


                if (v.WaveType<2) { // TRIANGLE & SAW

                    // update voice value //
                    var step = (v.Frequency * ((amp*4)/sampleRate));
                    v.Value += (step * v.Polarity);

                    // stay within amplitude bounds //
                    if (v.Value > amp) {
                        var spill = v.Value - amp;
                        if (v.WaveType==1 && j<(voices + harmonics)) {
                            v.Value = -(amp - spill);
                        } else {
                            v.Value = amp - spill;
                            v.Polarity = - v.Polarity;
                        }

                    }
                    if (v.Value < -amp) {
                        var spill = (v.Value - (-amp));
                        v.Value = (-amp) - spill;
                        v.Polarity = - v.Polarity;
                    }

                } else { // SINE

                    var a1 = v.Frequency * i*Math.PI*2/sampleRate;
                    v.Value = Math.sin(a1) * amp;
                }
            }



            // write to 32 bit array
            var roam = (1 - (noise*0.5)) + (Math.random()*noise);
            var totalTotal = (totalVal * roam) * gain;

            if (i < (dataLength-1)) {
                data[i] = totalTotal;
            }
            // CROSSFADE //
            else {
                var ni = i - (dataLength-1);
                var gainA = 1 - ((1/overflow) * ni);
                var gainB = (1/overflow) * ni;
                data[ni] = (totalTotal*gainA) + (data[ni]*gainB);
            }
        }

        // POPULATE BUFFER //
        this.PopulateBuffer(sampleRate);
    }

    //-------------------------------------------------------------------------------------------
    //  SETUP BUFFERS
    //-------------------------------------------------------------------------------------------


    PopulateBuffer(sampleRate) {


        if (!this.PrimaryBuffer) {
            this.PrimaryBuffer = App.Audio.ctx.createBuffer(1, this._BufferData.length, sampleRate);
        }
        this.PrimaryBuffer.copyToChannel(this._BufferData,0,0);
        this.WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this.PrimaryBuffer,200,5,95);
        var duration = this.GetDuration(this.PrimaryBuffer);
        if (!this._LoadFromShare) {
            this.Params.startPosition = 0;
            this.Params.loopStart = 0;
            this.Params.loopEnd = this.Params.endPosition = duration;
            this.Params.reverse = false;
        }

        // update options panel //
        this.RefreshOptionsPanel();

        // update sources //
        this.Sources.forEach((s: Tone.Simpler)=> {
            s.player.buffer = this.PrimaryBuffer;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            //s.player.reverse = this.Params.reverse;
        });

        // Reset reverse buffer //
        if (this.ReverseBuffer) {
            this.ReverseBuffer = null;
        }

        // if loaded from save & reverse //
        if (this._LoadFromShare && this.Params.reverse) {
            this.ReverseTrack();
        }

        // IF POWERED ON LOAD - TRIGGER //
        if (this.IsPowered() && this._LoadFromShare) {
            // STOP SOUND //
            this.Sources.forEach((s: any)=> {
                s.triggerRelease();
            });
            // RETRIGGER //
            var that = this;
            setTimeout(function(){
                that.TriggerAttack();
            },1000);
        }
        this._LoadFromShare = false;
    }


    FirstSetup() {
        if (this._FirstRelease) {
            this.DataToBuffer();

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

    MouseUp() {
        this.FirstSetup();
        super.MouseUp();
    }


    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : App.L10n.Blocks.Source.Blocks.SampleGen.name,
            "parameters" : [

                {
                    "type" : "waveregion",
                    "name" : "Wave",
                    "setting" :"region",
                    "props" : {
                        "value" : 5,
                        "min" : 0,
                        "max" : this.GetDuration(this.PrimaryBuffer),
                        "quantised" : false,
                        "centered" : false,
                        "wavearray" : this.WaveForm,
                        "mode" : this.Params.loop,
                        "emptystring" : "Generating Wave"
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
                    "type" : "actionbutton",
                    "name" : "Generate",
                    "setting" :"generate",
                    "props" : {
                        "text" : "Generate Wave"
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
                /*if ((<any>Tone).isSafari) {
                    this.Sources[0].player.playbackRate = value;
                } else {
                    this.Sources[0].player.playbackRate.value = value;
                }*/
                this.Params.playbackRate = value;
                this.NoteUpdate();
                break;
            case "generate":
                this.WaveForm = [];
                this.RefreshOptionsPanel();

                // TODO - look into web workers for performance heavy executions like DataToBuffer
                var me = this;
                setTimeout(function() {
                    me.DataToBuffer();
                },16);
                break;
            case "reverse":
                value = value? true : false;
                this.Params[param] = val;
                this.ReverseTrack();
                /*value = value? true : false;

                this._BufferData = this.ReverseTheBuffer(this._BufferData);
                this.PrimaryBuffer.copyToChannel(this._BufferData,0,0);
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.buffer = this.PrimaryBuffer;
                });
                this.Params[param] = val;
                // Update waveform
                this.WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this.PrimaryBuffer,200,5,95);
                this.RefreshOptionsPanel();*/
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
                this.Params[param] = value;
                this.RefreshOptionsPanel();
                break;
            case "loopStart":
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loopStart = value;
                });
                break;
            case "loopEnd":
                this.Sources.forEach((s:Tone.Simpler)=> {
                    s.player.loopEnd = value;
                });
                break;
        }

        this.Params[param] = value;
    }



    Dispose(){
        super.Dispose();
        //TODO: Set everything to null
    }

    ReverseTheBuffer(buffer) {
        var newBuffer = new Float32Array(buffer.length);
        for (var i=0; i<buffer.length; i++) {
            newBuffer[i] = buffer[(buffer.length-1)-i];
        }
        return newBuffer;
    }
}
