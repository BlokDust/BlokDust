import {SoundCloudAudioType} from './SoundCloudAudioType';

export class SoundCloudAudio {

    public SC: any; //TODO - we're defining this in 3 different places and it's not working properly, unable to check if undefined

    constructor(){
        SC.initialize({
            client_id: App.Config.SoundCloudClientId
        });
    }


    static PickRandomTrack(t:SoundCloudAudioType) {

        switch (t) {
            case SoundCloudAudioType.Soundcloud:
                var defaults = App.Config.SoundCloudDefaultTracks;
                break;
            case SoundCloudAudioType.Granular:
                var defaults = App.Config.GranularDefaultTracks;
                break;
            case SoundCloudAudioType.Convolution:
                var defaults = App.Config.ConvolverDefaultTracks;
                break;
            default:
                var defaults = App.Config.SoundCloudDefaultTracks;
        }

        var track = defaults[Math.floor((Math.random() * defaults.length))];

        return 'https://api.soundcloud.com/tracks/'+ track +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }

    static PickTrack(t:SoundCloudAudioType,n:number) {

        switch (t) {
            case SoundCloudAudioType.Soundcloud:
                var defaults = App.Config.SoundCloudDefaultTracks;
                break;
            case SoundCloudAudioType.Granular:
                var defaults = App.Config.GranularDefaultTracks;
                break;
            case SoundCloudAudioType.Convolution:
                var defaults = App.Config.ConvolverDefaultTracks;
                break;
            default:
                var defaults = App.Config.SoundCloudDefaultTracks;
        }

        var track = defaults[n];

        return 'https://api.soundcloud.com/tracks/'+ track +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }

    static LoadTrack(track: any) {
        // ERROR CHECK //
        /*SC.get('/tracks/'+track.id, function(track, error) {
            if (error) { App.Message("Something went wrong, try another track.") }
        });
        */
        var trackUrl = track.URI;
        return ''+ trackUrl +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }

    /**
     * Search the Soundcloud API for any tracks containing a string.
     * @param query String to search for
     * @param callback This passes as its only parameter an array of track objects
     *
     * //TODO: take into account blokdust tags and creative commons.
     *  How to query either creative commons OR tags. It doesn't see to be possible.
     *  Perhaps multiple we need to make multiple API requests. Alternatively we could do this all on server side.
     */
    static Search(query: string, seconds: number, callback: (tracks: any[]) => any){
        SC.get('/tracks', {
            //tags: 'blokdust',
            //license: 'cc-by',
            q: query,
            duration: {
                //to: 510000 // 8.5 mins
                //to: 20000 // 20 seconds
                to: seconds*1000 // 20 seconds
            },
            sharing: "public",
            streamable: true,
            downloadable: true,
            filter: "public",
            limit: 200
        }, callback);
    }
}

//https://api.soundcloud.com/tracks/43883752/stream?client_id=7258ff07f16ddd167b55b8f9b9a3ed33