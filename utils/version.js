module.exports = Version;

function Version() {
    if (arguments.length === 1) {
        var parts = parse(arguments[0]);
        this.major = parts[0];
        this.minor = parts[1];
        this.build = parts[2];
    } else if (arguments.length === 3) {
        this.major = Number(arguments[0]);
        this.minor = Number(arguments[1]);
        this.build = Number(arguments[2]);
    }
}

Version.prototype.bump = function (type) {
    switch (type) {
        case 'major':
            this.major++;
            this.minor = 0;
            this.build = 0;
            break;
        case 'minor':
            this.minor++;
            this.build = 0;
            break;
        default:
        case 'build':
            this.build++;
            break;
    }
};

Version.prototype.toString = function () {
    return this.major + '.' + this.minor + '.' + this.build;
};

function parse(str) {
    var tokens = str.split('.');
    if (tokens.length !== 3)
        throw 'Invalid version format.';
    var major = parseInt(tokens[0]);
    if (isNaN(major))
        throw 'Invalid major version.';
    var minor = parseInt(tokens[1]);
    if (isNaN(minor))
        throw 'Invalid minor version.';
    var build = parseInt(tokens[2]);
    if (isNaN(build))
        throw 'Invalid build version.';
    return [major, minor, build];
}