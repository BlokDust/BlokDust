import {Granular} from '../Sources/Granular';
import {IApp} from '../../IApp';
import {ISource} from '../ISource';
import {Microphone} from '../Sources/Microphone';
import {Power} from '../Power/Power';
import {PowerEffect} from '../Power/PowerEffect';
import {VoiceCreator as Voice} from './VoiceObject';

declare var App: IApp;


export class Interaction extends PowerEffect {

    CreateVoices(source: ISource){
        // Don't create if it's a Power or a Microphone
        if ((source instanceof Power) || (source instanceof Microphone) || (source instanceof Granular)) return;

        // Work out how many voices we actually need (we may already have some)
        let diff: number = App.Config.PolyphonicVoices - source.Sources.length;

        // If we haven't got enough sources, create however many we need.
        if (diff > 0){

            // Loop through and create the voices
            for (let i = 1; i <= App.Config.PolyphonicVoices; i++) {

                // Create a source
                let s: Tone.Source = source.CreateSource();

                let e: Tone.AmplitudeEnvelope;

                // Create an envelope and save it to `var e`
                e = source.CreateEnvelope();

                if (e) {
                    // Connect the source to the Envelope and start
                    s.connect(e);
                    s.start();

                    // Connect Envelope to the Effects Chain
                    e.connect(source.AudioInput);
                } else {
                    // No CreateEnvelope()
                    // Check if it's a Sampler Source (they have their own envelopes built in)
                    if (source.Sources[0] instanceof Tone.Simpler) {
                        e = source.Sources[i].envelope;
                        s.connect(source.AudioInput)
                    }
                }

                // Add the source and envelope to our FreeVoices list
                source.FreeVoices.push( new Voice(i) );
            }
        }
    }
}