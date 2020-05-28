class IntentContainer {
    constructor(cacheDir){
        this.cacheDir = cacheDir;
        this.hasTrained = false;
    }

    addIntent(name, lines){

    }

    calcIntent(query){
        return Math.random().toFixed(6);
    }

    train(){
        hasTrained = true;
    }
}

module.exports = { IntentContainer };