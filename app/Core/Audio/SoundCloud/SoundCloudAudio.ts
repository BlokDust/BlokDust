import {IApp} from '../../../IApp';
import {SoundCloudAPIResponse} from './SoundCloudAPIResponse';
import {SoundCloudAudioType} from './SoundCloudAudioType';

declare var App: IApp;

export class SoundCloudAudio {

    public SC: any;


    //TODO: This constructor isn't being used
    constructor(){
        SC.initialize({
            client_id: App.Config.SoundCloudClientId
        }).then((result: SoundCloudAPIResponse.Success[]) => {
            // SoundCloud initialized
            console.log(`SoundCloud intialized successfully`, result)
        }, (error: SoundCloudAPIResponse.Error) => {
            // Error
            App.Message(`SoundCloud couldn't initialize: ${error.message}`);
            console.log(error.message, error.status);
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
     *
     * @param query String to search for
     * @param callback This passes as its only parameter an array of track objects
     *
     * */

    /**
     * Search the Soundcloud API for any tracks containing a string.
     * @param query - String to search for
     * @param seconds - Song duration limit
     * @param successResponse - Successful response callback
     * @param failedResponse - Unsuccessful response callback
     */
    static Search(query: string, seconds: number, successResponse: (track: SoundCloudAPIResponse.Success) => any, failedResponse: (error: SoundCloudAPIResponse.Error) => any){
        if (window.SC) {
            SC.get('/tracks', {
                q: query,
                duration: {
                    to: seconds * 1000
                },
                limit: 200,
                offset: 0
            }).then((tracks:SoundCloudAPIResponse.Success[]) => {
                // Successful search
                if (tracks) {
                    let tracksRemainAfterElimination: boolean = false;
                    tracks.forEach((track) => {
                        // Check track is streamable and public
                        if (track.streamable && track.sharing === "public" && (
                                // Check track is not set to all rights reserved or has a blokdust tag
                            track.license.indexOf('all-rights-reserved') === -1 ||
                            track.tag_list.toLowerCase().indexOf('blokdust') !== -1)
                        ) {
                            tracksRemainAfterElimination = true;
                            successResponse(track);
                        }
                    });
                    // Tracks were found but failed the filtering process
                    if (!tracksRemainAfterElimination) {
                        const err = {
                            "status": 452, // Blokdust specific code for unqualified tracks (ie. no blokdust tag OR cc license)
                            "message": App.L10n.Errors.SoundCloud.FailedTrackFiltering
                        };
                        console.error(err);
                        failedResponse(err);
                    }
                }
            }, (error:SoundCloudAPIResponse.Error) => {
                switch (error.status) {
                    case 429:
                        //Too many requests
                        App.Message(App.L10n.Errors.SoundCloud.TooManyRequests);
                        break;
                    case 500:
                        //Internal Server Error
                        App.Message(App.L10n.Errors.SoundCloud.InternalServerError);
                        break;
                    case 503:
                        // Service Unavailable
                        App.Message(App.L10n.Errors.SoundCloud.ServiceUnavailable);
                        break;
                    default:
                        if (error.message) {
                            App.Message(`SoundCloud error: ${error.message}`);
                        } else {
                            App.Message(`SoundCloud error, check console`);
                        }
                }
                console.error(error);
                failedResponse(error);
                //NOTE: More info on SoundCloud errors: https://developers.soundcloud.com/docs/api/guide#errors
            });
        } else {
            // No window.SC
            App.Message(App.L10n.Errors.SoundCloud.Uninitialized);
            console.error(App.L10n.Errors.SoundCloud.Uninitialized);
        }
    }
}