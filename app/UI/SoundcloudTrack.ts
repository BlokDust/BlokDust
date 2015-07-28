/**
 * Created by luketwyman on 28/07/2015.
 */

class SoundcloudTrack {

    public Title: string;
    public TitleShort: string;
    public User: string;
    public UserShort: string;
    public URI: string;
    private _Long: number = 65;
    private _Short: number = 30;

    constructor(title,user,uri) {

        // TODO - second pass of shortening, using measureText to account for esp wide characters (Chinese for example)

        // TITLE //
        if (title.length>this._Long) {
            this.Title = title.substring(0,this._Long) + "...";
        } else {
            this.Title = title;
        }
        if (title.length>this._Short) {
            this.TitleShort = title.substring(0,this._Short) + "...";
        } else {
            this.TitleShort = title;
        }

        // USER //
        if (user.length>this._Long) {
            this.User = user.substring(0,this._Long) + "...";
        } else {
            this.User = user;
        }
        if (user.length>this._Short) {
            this.UserShort = user.substring(0,this._Short) + "...";
        } else {
            this.UserShort = user;
        }

        // URI //
        this.URI = uri;

    }

}

export = SoundcloudTrack;