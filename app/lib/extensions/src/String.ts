String.prototype.b64_to_utf8 = function(): string {
    return decodeURIComponent(escape(window.atob(this)));
};

String.prototype.contains = function(str): boolean {
    return this.indexOf(str) !== -1;
};

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (str):boolean {
        return this.indexOf(str, this.length - str.length) !== -1;
    };
}

String.format = function(): string {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i + 1]);
    }

    return s;
};

String.prototype.hashCode = function(): string {
    var hash = 0, i, chr, len;
    if (this.length === 0) return hash.toString();
    for (i = 0, len = this.length; i < len; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
};

String.prototype.isAlphanumeric = function(): boolean {
    return /^[a-zA-Z0-9]*$/.test(this);
};

String.prototype.ltrim = function(): string {
    return this.replace(/^\s+/, '');
};

String.prototype.rtrim = function(): string {
    return this.replace(/\s+$/, '');
};

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (str):boolean {
        return this.indexOf(str) == 0;
    };
}

String.prototype.toCssClass = function(): string {
    return this.replace(/[^a-z0-9]/g, function(s) {
        var c = s.charCodeAt(0);
        if (c == 32) return '-';
        if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
        return '__' + ('000' + c.toString(16)).slice(-4);
    });
};

String.prototype.toFileName = function(): string {
    return this.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

if (!String.prototype.trim) {
    String.prototype.trim = function ():string {
        return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
}

String.prototype.utf8_to_b64 = function(): string {
    return window.btoa(unescape(encodeURIComponent(this)));
};