/// <reference path="conversion" />

module nullstone {
    export enum UriKind {
        RelativeOrAbsolute = 0,
        Absolute = 1,
        Relative = 2
    }
    export class Uri {
        private $$originalString: string;
        private $$kind: UriKind;

        constructor (uri: Uri);
        constructor (uri: string, kind?: UriKind);
        constructor (baseUri: Uri, relativeUri: string);
        constructor (baseUri: Uri, relativeUri: Uri);
        constructor (uri: string|Uri, kindOrRel?: UriKind|Uri|string) {
            if (typeof uri === "string") {
                this.$$originalString = uri;
                this.$$kind = (<UriKind>kindOrRel) || UriKind.RelativeOrAbsolute;
            } else if (uri instanceof Uri) {
                if (typeof kindOrRel === "string") {
                    if (uri.kind === UriKind.Relative)
                        throw new Error("Base Uri cannot be relative when creating new relative Uri.");
                    this.$$originalString = createRelative(uri, kindOrRel);
                    this.$$kind = UriKind.RelativeOrAbsolute;
                } else if (kindOrRel instanceof Uri) {
                    if (uri.kind === UriKind.Relative)
                        throw new Error("Base Uri cannot be relative when creating new relative Uri.");
                    this.$$originalString = createRelative(uri, kindOrRel.originalString);
                    this.$$kind = UriKind.RelativeOrAbsolute;
                } else {
                    this.$$originalString = (<Uri>uri).$$originalString;
                    this.$$kind = (<Uri>uri).$$kind;
                }
            }
        }

        get kind (): UriKind {
            return this.$$kind;
        }

        get authority (): string {
            var s = this.$$originalString;
            var ind = Math.max(3, s.indexOf("://") + 3);
            var end = s.indexOf("/", ind);
            s = (end < 0) ? s.substr(ind) : s.substr(ind, end - ind);
            var rind = s.indexOf("$");
            var find = s.indexOf("#");
            var qind = s.indexOf("?");
            var trimind = Math.min(
                rind > -1 ? rind : Number.POSITIVE_INFINITY,
                find > -1 ? find : Number.POSITIVE_INFINITY,
                qind > -1 ? qind : Number.POSITIVE_INFINITY);
            if (isFinite(trimind))
                s = s.substr(0, trimind);
            return s;
        }

        get host (): string {
            var all = this.authority;
            var pindex = all.indexOf(":");
            return pindex > 0 ? all.substr(0, pindex) : all;
        }

        get port (): number {
            var all = this.authority;
            var pindex = all.indexOf(":");
            var port = pindex > 0 && pindex < all.length ? all.substr(pindex + 1) : "";
            if (!port)
                return getDefaultPort(this.scheme);
            return parseInt(port) || 0;
        }

        get absolutePath (): string {
            var s = this.$$originalString;
            var fstart = s.indexOf("#");
            if (fstart > -1)
                s = s.substr(0, fstart);
            var rstart = s.indexOf("$");
            if (rstart > -1)
                s = s.substr(0, rstart);
            var ind = Math.max(3, s.indexOf("://") + 3);
            var start = s.indexOf("/", ind);
            if (start < 0 || start < ind)
                return "/";
            var qstart = s.indexOf("?", start);
            if (qstart < 0 || qstart < start)
                return s.substr(start);
            return s.substr(start, qstart - start);
        }

        get scheme (): string {
            var s = this.$$originalString;
            var ind = s.indexOf("://");
            if (ind < 0)
                return null;
            return s.substr(0, ind);
        }

        get fragment (): string {
            var s = this.$$originalString;
            var rind = s.indexOf("$");
            var ind = s.indexOf("#");
            if (rind > -1 && rind < ind)
                s = s.substr(0, rind);
            if (ind < 0)
                return "";
            return s.substr(ind);
        }

        get resource (): string {
            var s = this.$$originalString;
            var ind = s.indexOf("$");
            if (ind < 0)
                return "";
            var find = s.indexOf("#");
            if (find > -1 && ind > find)
                return "";
            var qind = s.indexOf("?");
            if (qind > -1 && ind > qind)
                return "";
            return s.substr(ind);
        }

        get originalString (): string {
            return this.$$originalString.toString();
        }

        get isAbsoluteUri (): boolean {
            return !!this.scheme && !!this.host
        }

        toString (): string {
            return this.$$originalString.toString();
        }

        equals (other: Uri): boolean {
            return this.$$originalString === other.$$originalString;
        }

        static isNullOrEmpty (uri: Uri): boolean {
            if (uri == null)
                return true;
            return !uri.$$originalString;
        }
    }
    registerTypeConverter(Uri, (val: any): any => {
        if (val == null)
            val = "";
        return new Uri(val.toString());
    });

    function createRelative (baseUri: Uri, relative: Uri|string): string {
        var rel: string = "";
        if (typeof relative === "string") {
            rel = relative;
        } else if (relative instanceof Uri) {
            rel = relative.originalString;
        }

        var base = baseUri.scheme + "://" + baseUri.host;
        if (rel[0] === "/") {
            rel = rel.substr(1);
            base += "/";
        } else {
            base += baseUri.absolutePath;
        }
        if (base[base.length - 1] !== "/")
            base = base.substr(0, base.lastIndexOf("/") + 1);

        return base + rel;
    }

    function getDefaultPort (scheme: string): number {
        switch (scheme) {
            case "http":
                return 80;
            case "https":
                return 443;
            default:
                return 0;
        }
    }
}