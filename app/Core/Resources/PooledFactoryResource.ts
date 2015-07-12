///<amd-dependency path="fayde.transformer"/>.
import IPooledFactoryResource = require("./IPooledFactoryResource");
import IPooledObject = require("./IPooledObject");
import Queue = Utils.Collections.Queue;

class PooledFactoryResource<T extends IPooledObject> implements IPooledFactoryResource<T> {

    private _Type: T;
    private _PropertyDescriptor: PropertyDescriptorMap;
    private _MinimumPoolSize: number;
    private _MaximumPoolSize: number;
    private _PooledObjects: Queue<T>;

    get ObjectsInPoolCount() : number {
        return this._PooledObjects.size();
    }

    get MinimumPoolSize(): number {
        return this._MinimumPoolSize;
    }

    set MinimumPoolSize(value: number) {
        // Validating pool limits, exception is thrown if invalid
        this._ValidatePoolLimits(value, this.MaximumPoolSize);

        this._MinimumPoolSize = value;

        this._AdjustPoolSizeToBounds();
    }

    get MaximumPoolSize(): number {
        return this._MaximumPoolSize;
    }

    set MaximumPoolSize(value: number) {
        // Validating pool limits, exception is thrown if invalid
        this._ValidatePoolLimits(this.MinimumPoolSize, value);

        this._MaximumPoolSize = value;

        this._AdjustPoolSizeToBounds();
    }

    constructor(minimumPoolSize: number, maximumPoolSize: number, type: T, propertyDescriptor?: PropertyDescriptorMap) {
        // Validating pool limits, exception is thrown if invalid
        this._ValidatePoolLimits(minimumPoolSize, maximumPoolSize);

        this._PooledObjects = new Queue<T>();

        // Assigning properties
        this._Type = type;
        this._PropertyDescriptor = propertyDescriptor;
        this.MinimumPoolSize = minimumPoolSize;
        this.MaximumPoolSize = maximumPoolSize;

        // Initializing the internal pool data structure
        this._PooledObjects = new Queue<T>();

        // Setting the action for returning to the pool to be integrated in the pooled objects
        //ReturnToPoolAction = ReturnObjectToPool;

        // Initilizing objects in pool
        this._AdjustPoolSizeToBounds();
    }

    private _ValidatePoolLimits(minimumPoolSize: number, maximumPoolSize: number) {
        if (minimumPoolSize < 0) {
            throw new ArgumentException("Minimum pool size must be greater or equals to zero.");
        }

        if (maximumPoolSize < 1) {
            throw new ArgumentException("Maximum pool size must be greater than zero.");
        }

        if (minimumPoolSize > maximumPoolSize) {
            throw new ArgumentException("Maximum pool size must be greater than the maximum pool size.");
        }
    }

    private _AdjustPoolSizeToBounds(): void {
        // If there is an Adjusting operation in progress, skip and return.
        //if (Interlocked.CompareExchange(ref AdjustPoolSizeIsInProgressCASFlag, 1, 0) == 0)
        //{

            // If we reached this point, we've set the AdjustPoolSizeIsInProgressCASFlag to 1 (true) - using the above CAS function
            // We can now safely adjust the pool size without interferences

            // Adjusting...
            while (this.ObjectsInPoolCount < this._MinimumPoolSize)
            {
                this._PooledObjects.enqueue(this._CreatePooledObject());
            }

            while (this.ObjectsInPoolCount > this._MaximumPoolSize)
            {
                this._PooledObjects.dequeue();
                //var dequeuedObjectToDestroy: T;
                //if (this._PooledObjects.TryDequeue(out dequeuedObjectToDestroy))
                //{
                //    // Diagnostics update
                //    Diagnostics.IncrementPoolOverflowCount();
                //
                //    DestroyPooledObject(dequeuedObjectToDestroy);
                //}
            }

            // Finished adjusting, allowing additional callers to enter when needed
            //AdjustPoolSizeIsInProgressCASFlag = 0;
        //}
    }

    private _CreatePooledObject(): T  {
        var obj = Object.create(this._Type, this._PropertyDescriptor);

        obj.ReturnToPool = () => {
            this._ReturnObjectToPool(obj);
        }

        return obj;
    }

    public GetObject(): T {
        // make sure there's at least one object available.
        if (!this.ObjectsInPoolCount) this._AdjustPoolSizeToBounds();
        //console.log("get object");
        return this._PooledObjects.dequeue();
    }

    private _ReturnObjectToPool(objectToReturnToPool: T)
    {
        // Diagnostics update
        //if (reRegisterForFinalization) Diagnostics.IncrementObjectRessurectionCount();

        //console.log("return object");

        // Checking that the pool is not full
        if (this.ObjectsInPoolCount < this.MaximumPoolSize) {
            // Reset the object state (if implemented) before returning it to the pool. If reseting the object fails, destroy the object
            if (!objectToReturnToPool.Reset()) {
                // Diagnostics update
                //Diagnostics.IncrementResetStateFailedCount();

                this._DestroyPooledObject(objectToReturnToPool);
                return;
            }

            // Diagnostics update
            //Diagnostics.IncrementReturnedToPoolCount();

            // Adding the object back to the pool
            this._PooledObjects.enqueue(objectToReturnToPool);
        } else {
            // Diagnostics update
            //Diagnostics.IncrementPoolOverflowCount();

            //The Pool's upper limit has exceeded, there is no need to add this object back into the pool and we can destroy it.
            this._DestroyPooledObject(objectToReturnToPool);
        }
    }

    private _DestroyPooledObject(objectToDestroy: T)
    {
        // Making sure that the object is only disposed once (in case of application shutting down and we don't control the order of the finalization)
        if (!objectToDestroy.Disposed) {
            // Deterministically release object resources, never mind the result, we are destroying the object
            objectToDestroy.Dispose();

            // Diagnostics update
            //Diagnostics.IncrementObjectsDestroyedCount();
        }

        // The object is being destroyed, resources have been already released deterministically, so we don't need the finalizer to fire
        //GC.SuppressFinalize(objectToDestroy);
    }
}

export = PooledFactoryResource;