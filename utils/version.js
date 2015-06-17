module.exports = function (grunt) {
    grunt.registerMultiTask('version', 'Configures version.', function () {
        if (this.target === 'bump') {
            bump(this.data, arguments);
        } else if (this.target === 'apply') {
            apply(this.data, arguments);
        }
    });

    function bump(data, args) {
        try {
            var pkg = grunt.file.readJSON('./package.json');
            var bower = grunt.file.readJSON('./bower.json');

            var vers = new Version(pkg.version);
            grunt.log.writeln('Current version: ' + vers);
            var part = args[0] || data.part;
            vers.bump(part);
            grunt.log.writeln('Updated version: ' + vers);

            grunt.version = bower.version = pkg.version = vers.toString();
            grunt.file.write('./package.json', JSON.stringify(pkg, undefined, 2));
            grunt.file.write('./bower.json', JSON.stringify(bower, undefined, 2));
        } catch (err) {
            grunt.fail.fatal('Error bumping version:' + err);
        }

    }

    function apply(data, args) {
        var pkg = grunt.file.readJSON('./package.json');
        var template = grunt.file.read(data.src);
        var output = template.replace('%VERSION%', pkg.version);
        grunt.file.write(data.dest, output);
    }
};

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