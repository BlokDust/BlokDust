// The release version (CHG-0005 task 12): the root package.json's, the one the plugins are built with too.
import pkg from '../../package.json';

export const VERSION: string = pkg.version;
