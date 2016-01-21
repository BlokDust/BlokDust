export declare module SoundCloudAPIResponse {

    export interface Success {
        duration: number;
        errors: any;
        license: string;
        me: SoundCloudUser;
        sharing: string;
        streamable: boolean;
        tag_list: string;
        title: string;
        uri: string;
        user: SoundCloudUser;
        permalink_url: string;
    }
    interface Error {
        message: string;
        status: number;
    }

    interface SoundCloudUser {
        id: number;
        uri: string;
        username: string;
    }
}
