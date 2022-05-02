module Utils {

    export class Storage {
        private static _memoryStorage:any = {};

        public static clear(storageType:StorageType = StorageType.memory):void {
            switch (storageType.value) {
                case StorageType.memory.value:
                    this._memoryStorage = {};
                    break;
                case StorageType.session.value:
                    sessionStorage.clear();
                    break;
                case StorageType.local.value:
                    localStorage.clear();
                    break;
            }
        }

        public static clearExpired(storageType:StorageType = StorageType.memory):void {
            var items = this.getItems(storageType);

            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                if (this._isExpired(item)) {
                    this.remove(item.key);
                }
            }
        }

        public static get(key:string, storageType:StorageType = StorageType.memory):StorageItem {

            var data:string;

            switch (storageType.value) {
                case StorageType.memory.value:
                    data = this._memoryStorage[key];
                    break;
                case StorageType.session.value:
                    data = sessionStorage.getItem(key);
                    break;
                case StorageType.local.value:
                    data = localStorage.getItem(key);
                    break;
            }

            if (!data) return null;

            var item:StorageItem = JSON.parse(data);

            if (this._isExpired(item)) return null;

            // useful reference
            item.key = key;

            return item;
        }

        private static _isExpired(item:StorageItem):boolean {
            if (new Date().getTime() < item.expiresAt) {
                return false;
            }

            return true;
        }

        public static getItems(storageType:StorageType = StorageType.memory):StorageItem[] {

            var items:StorageItem[] = [];

            switch (storageType.value) {
                case StorageType.memory.value:
                    var keys = Object.keys(this._memoryStorage);

                    for (var i = 0; i < keys.length; i++) {
                        var item:StorageItem = this.get(keys[i], StorageType.memory);

                        if (item) {
                            items.push(item);
                        }
                    }

                    break;
                case StorageType.session.value:
                    for (var i = 0; i < sessionStorage.length; i++) {
                        var key = sessionStorage.key(i);

                        var item:StorageItem = this.get(key, StorageType.session);

                        if (item) {
                            items.push(item);
                        }
                    }
                    break;
                case StorageType.local.value:
                    for (var i = 0; i < localStorage.length; i++) {
                        var key = localStorage.key(i);

                        var item:StorageItem = this.get(key, StorageType.local);

                        if (item) {
                            items.push(item);
                        }
                    }
                    break;
            }

            return items;
        }

        public static remove(key:string, storageType:StorageType = StorageType.memory) {

            switch (storageType.value) {
                case StorageType.memory.value:
                    delete this._memoryStorage[key];
                    break;
                case StorageType.session.value:
                    sessionStorage.removeItem(key);
                    break;
                case StorageType.local.value:
                    localStorage.removeItem(key);
                    break;
            }
        }

        public static set(key:string, value:any, expirationSecs:number, storageType:StorageType = StorageType.memory):StorageItem {
            var expirationMS = expirationSecs * 1000;

            var record = new StorageItem();
            record.value = value;
            record.expiresAt = new Date().getTime() + expirationMS;

            switch (storageType.value) {
                case StorageType.memory.value:
                    this._memoryStorage[key] = JSON.stringify(record);
                    break;
                case StorageType.session.value:
                    sessionStorage.setItem(key, JSON.stringify(record));
                    break;
                case StorageType.local.value:
                    localStorage.setItem(key, JSON.stringify(record));
                    break;
            }

            return record;
        }
    }
}