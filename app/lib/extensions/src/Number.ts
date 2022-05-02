if (!Number.prototype.isInteger){
    Number.prototype.isInteger = function(){ return this % 1 === 0; };
}