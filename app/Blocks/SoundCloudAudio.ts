import SoundCloudAudioType = require('./SoundCloudAudioType');

class SoundCloudAudio {

    public SC: any;

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

    /**
     * Search the Soundcloud API for any tracks containing a string.
     * @param query String to search for
     * @param callback This passes as its only parameter an array of track objects
     *
     * //TODO: take into account blokdust tags and creative commons.
     *  How to query either creative commons OR tags. It doesn't see to be possible.
     *  Perhaps multiple we need to make multiple API requests. Alternatively we could do this all on server side.
     */
    static Search(query: string, callback: (tracks: any[]) => any){
        SC.get('/tracks', {
            //tags: 'blokdust',
            //license: 'cc-by',
            q: query,
        }, callback);
    }
}

export = SoundCloudAudio;

//https://api.soundcloud.com/tracks/43883752/stream?client_id=7258ff07f16ddd167b55b8f9b9a3ed33