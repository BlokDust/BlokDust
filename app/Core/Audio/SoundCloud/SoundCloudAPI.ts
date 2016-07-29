import {IApp} from '../../../IApp';
import {SoundCloudAPIResponse} from './SoundCloudAPIResponse';
import {SoundCloudAudioType} from './SoundCloudAudioType';

declare var App: IApp;
declare var SC: any;

export class SoundCloudAPI {

    static _QueryReturns: number;
    static QueryTotal: number;
    static QueryList: any[];

    static Initialize() {
        if (typeof(SC) !== "undefined") {
            SC.initialize({
                client_id: App.Config.SoundCloudClientId
            });
        }
        this.QueryTotal = 5;
    }


    //-------------------------------------------------------------------------------------------
    //  LOADING TRACKS
    //-------------------------------------------------------------------------------------------


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

        //TODO: loading track's in safari throw errors
        console.log(''+ trackUrl +'/stream?client_id='+ App.Config.SoundCloudClientId)
        return ''+ trackUrl +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }


    //-------------------------------------------------------------------------------------------
    //  SINGLE SEARCH
    //-------------------------------------------------------------------------------------------

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
                        this.SearchError(err);
                        failedResponse(err);
                    }
                }
            }, (error:SoundCloudAPIResponse.Error) => {
                this.SearchError(error);
                failedResponse(error);
            });
        } else {
            // No window.SC
            App.Message(App.L10n.Errors.SoundCloud.Uninitialized);
            console.error(App.L10n.Errors.SoundCloud.Uninitialized);
        }
    }




    //-------------------------------------------------------------------------------------------
    //  MULTI SEARCH
    //-------------------------------------------------------------------------------------------


    // PERFORMS MULTIPLE QUERIES AND COMBINES RESULTS //
    static MultiSearch(query: string, seconds: number, block: any) {
        if (window.SC) {
            this._QueryReturns = 0;
            this.QueryList = [];

            // SEARCH 1 //
            this.OptionSearch(query, seconds, {license:"cc-by"},(tracks) => {
                this.MultiCallback(block, tracks,"cc-by");
            }, (error: SoundCloudAPIResponse.Error) => {
                this.MultiCallback(block, [],"error");
            });

            // SEARCH 2 //
            /*this.OptionSearch(query, seconds, {license:"cc-by-nc-nd"},(tracks) => {
                this.MultiCallback(block, tracks,"cc-by-nc-nd");
            }, (error: SoundCloudAPIResponse.Error) => {
                this.MultiCallback(block, [],"error");
            });*/

            // SEARCH 3 //
            this.OptionSearch(query, seconds, {license:"cc-by-nc-sa"},(tracks) => {
                this.MultiCallback(block, tracks,"cc-by-nc-sa");
            }, (error: SoundCloudAPIResponse.Error) => {
                this.MultiCallback(block, [],"error");
            });

            // SEARCH 4 //
            this.OptionSearch(query, seconds, {license:"to_use_commercially"},(tracks) => {
                this.MultiCallback(block, tracks,"to_use_commercially");
            }, (error: SoundCloudAPIResponse.Error) => {
                this.MultiCallback(block, [],"error");
            });

            // SEARCH 5 //
            this.OptionSearch(query, seconds, {license:"to_share"},(tracks) => {
                this.MultiCallback(block, tracks,"to_share");
            }, (error: SoundCloudAPIResponse.Error) => {
                this.MultiCallback(block, [],"error");
            });

            // SEARCH 6 //
            this.OptionSearch(query, seconds, {tag:"blokdust"},(tracks) => {
                this.MultiCallback(block, tracks,"blokdust");
            }, (error: SoundCloudAPIResponse.Error) => {
                this.MultiCallback(block, [],"error");
            });

        } else {
            // No window.SC
            App.Message(App.L10n.Errors.SoundCloud.Uninitialized);
            console.error(App.L10n.Errors.SoundCloud.Uninitialized);
        }
    }


    // A SEARCH QUERY WITH SUBMITTABLE LICENSE OR TAG //
    static OptionSearch(query: string, seconds: number, options: any, successResponse: (tracks) => any, failedResponse: (error: SoundCloudAPIResponse.Error) => any) {

        // ASSEMBLE THE QUERY //
        options = options || {};
        var searchOptions = {};
        if (options.license) {
            searchOptions = { q: query, license: options.license, duration: {to: seconds * 1000}, limit: 200 };
        }
        else if (options.tag) {
            searchOptions = { q: query, tags: options.tag, duration: {to: seconds * 1000}, limit: 200 };
        }
        else {
            searchOptions = { q: query, duration: {to: seconds * 1000}, limit: 200 };
        }

        // DO THE QUERY //
        SC.get('/tracks', searchOptions).then((tracks:SoundCloudAPIResponse.Success[]) => {
            if (tracks) {
                var trackList = [];
                tracks.forEach((track) => {
                    if (track.streamable && track.sharing === "public") {
                        trackList.push(track);
                    }
                });
                successResponse(trackList);
            }
        }, (error:SoundCloudAPIResponse.Error) => {
            this.SearchError(error);
            failedResponse(error);
        });
    }


    // GETS CALLED AFTER EACH QUERY AND ADDS TOGETHER RESULTS //
    static MultiCallback(block,results,string) {
        //console.log(""+string+": "+results.length);
        var i;
        var maxResults = 200;

        // IF WE HAVE RESULTS //
        if (results.length) {
            var count = 0;

            // IF FIRST RESULTS JUST ADD THEM ALL //
            if (this.QueryList.length===0) {

                for (i=0; i<results.length; i++) {
                    this.QueryList.push(results[i]);
                }

            }
            // ELSE CHECK FOR DUPLICATES //
            else {
                for (i=0; i<results.length; i++) {
                    if (!this.Exists(this.QueryList,results[i].id) ) {
                        // IF IT DOESN'T EXIST, PUSH IT //
                        if (this.QueryList.length<maxResults) {
                            this.QueryList.push(results[i]);
                        }
                    }
                }
            }
        }

        this._QueryReturns += 1;
        if (this._QueryReturns===this.QueryTotal) {
            // ALL QUERIES ARE IN - CONTINUE //
            block.SetSearchResults(this.QueryList);
        }
    }


    // CHECK IF THIS IS A DUPLICATE TRACK //
    static Exists(list,id) {
        var len = list.length;
        for (var h=0; h<len; h++) {
            if (id===list[h].id) {
                return true;
            }
        }
        return false;
    }


    //-------------------------------------------------------------------------------------------
    //  ERRORS
    //-------------------------------------------------------------------------------------------


    static SearchError(error) {
        switch (error.status) {
            case 429:
                //Too many requests
                App.Message(App.L10n.Errors.SoundCloud.TooManyRequests);
                break;
            case 452:
                //results filtered out
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
        console.error(error); //NOTE: More info on SoundCloud errors: https://developers.soundcloud.com/docs/api/guide#errors
    }



    //-------------------------------------------------------------------------------------------
    //  AUTH CONNECTION
    //-------------------------------------------------------------------------------------------


    static Connect() {
        // initiate auth popup
        SC.connect().then(() => {
            return SC.get('/me');
        }).then((me: SoundCloudAPIResponse.SoundCloudUser) => {
            alert('Hello, ' + me.username);
        }, (error: SoundCloudAPIResponse.Error) => {
            App.Message(`SoundCloud couldn't connect: ${error.message}`);
            console.log(error.message, error.status);
        });
    }

    static Upload(blob: Blob, title: string) {
        // When you have recorded a song with the SDK or any Web Audio application,
        // you can upload it if it's in a format that is accepted
        SC.upload({
            file: blob,
            title: title,
            tag_list: 'blokdust',
            license: 'cc-by-nc',
            sharing: 'public',
            progress: (e: ProgressEvent) => {
                const percentCompleted = (e.loaded / e.total) * 100;
                console.log(`${percentCompleted}% completed`);
            }
        }).then((track: SoundCloudAPIResponse.Success) => {
            alert('Upload is done! Check your sound at ' + track.permalink_url);
        }, (error:SoundCloudAPIResponse.Error) => {
            console.error(error);
        });
    }

}