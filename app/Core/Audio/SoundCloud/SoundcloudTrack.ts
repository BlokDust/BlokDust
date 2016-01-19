export class SoundCloudTrack {

    public Title: string;
    public TitleShort: string;
    public User: string;
    public UserShort: string;
    public URI: string;
    public Permalink: string;
    private _Long: number = 65;
    private _Short: number = 30;

    constructor(title, user, uri, permalink) {

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
        this.Title = this.Title.toUpperCase();
        this.TitleShort = this.TitleShort.toUpperCase();

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
        this.User = this.Capitalise(this.User);
        this.UserShort = this.Capitalise(this.UserShort);

        // URI //
        this.URI = uri;
        this.Permalink = permalink;

    }

    Capitalise(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

}