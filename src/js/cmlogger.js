import { render } from 'react-dom'
let debounce = require("debounce")
let SourceMap = require("source-map")
let lastMapping = []

export default class CMLogger {
    //class CMLogger {
    constructor(cm, map) {
        console.log("NEW LOGGER")
        this.cm = cm
        this.logLines = []
        this.smcs = []
        this.addSourceMap(map, 0)
        this.clearLogs()
        this.cm.Logger = this;
        this.log = this.log.bind(this)
        this.displayError = this.displayError.bind(this)
        this.showData = debounce(this.showData.bind(this), 100)
        this.mapping = lastMapping
    }
    setMapping(mapping) {
        this.mapping = mapping
        lastMapping = mapping
    }
    addBGClass(line, className) {
        this.cm.addLineClass(line - 1, "background", className)
    }
    removeBGClass(line, className) {
        this.cm.removeLineClass(line - 1, "background", className)
    }
    removeBGClassAll(className) {
        this.cm.eachLine(handle => {
            let line = this.cm.getLineNumber(handle)
            this.removeBGClass(line, className);
        })
    }
    removeNode(node) {
        if (node && node.parentElement)
            node.parentElement.removeChild(node)
        else
            console.log("missing parent", node)
    }
    clearByClass(className) {
        let logs = document.getElementsByClassName(className);
        let n = logs.length
        for (let i = 0; i < n; i++) {
            let node = logs[i]
            this.removeNode(node)
        }
    }
    clearLogs() {
        this.clearByClass("logdata")
        this.clearByClass("errormessage");
    }
    logErrorAtLine(line, text) {
        return this.logAtLine(line, text, "errormessage")
    }
    logMessageAtLine(line, text) {
        return this.logAtLine(line, text, "logdata")
    }
    logAtLine(line, text, className) {
        let ch = this.cm.getLine(line).length
        return this.logAtPos({ line, ch }, text, className)
    }
    logAtPos(pos, text, className) {
        let node = document.createElement("span")
        node.innerHTML = text
        node.className = className;
        this.cm.addWidget(pos, node)
        return node
    }
    renderAtPos(pos, elements, className) {
        let node = document.createElement("div")
        render(elements, node)
        node = node.children[0]
        node.className = node.className + " " + className;
        this.cm.addWidget(pos, node)
    }
    showData() {
        let values = this.logLines;
        let n = values.length;
        for (let i = 0; i < n; i++) {
            let value = values[i]
            if (value) {
                //console.log(value, i)
                this.logMessageAtLine(i, value);
            }
        }
    }
    logDataAt(line, value) {
        return this.logMessageAtLine(line, value);
    }

    addSourceMap(map, offset) {

        this.smcs.push({
            map: (new SourceMap.SourceMapConsumer(map)),
            offset: offset
        }
        )
    }
    getPosition(spec) {
        let n = this.smcs.length - 1;
        for (let i = n; i > -1; i--) {
            let pos = this.smcs[i].map.originalPositionFor(spec)
            pos.line += this.smcs[i].offset
            //console.log(pos);
            if (pos.source) return pos;
        }
    }

    parseStackFrame(frame) {
        let matcher = frame.match(/at\s+(\S*).*:(\d+):(\d+)\)$/)
        if (matcher) {
            //console.log(matcher)
            // let name = matcher[1]
            let line = +matcher[2]
            let column = +matcher[3]
            //console.log(name,line,column);
            return this.getPosition({ line, column })
        }
    }
    log(output, depth = 1) {
        // console.log(this.mapping)
        let line = this.getCallerLine(depth);
        //console.log(line, output)
        let logLine = line - 2
        if (typeof output === "function") {
            output = "function"
        }
        this.logDataAt(logLine, output)
        //console.log(this.mapping)
        let altLine = this.mapping[logLine];
        if (altLine) {
            this.logDataAt(altLine, output)
        }
    }

    getCallerLine(n) {
        let stackFrames = new Error().stack.split("\n")
        return this.parseStackFrame(stackFrames[2 + n]).line
    }
    displayError(e) {
        console.log("ERROR",e)
        let stackFrames = e.stack.split("\n")
        let line = this.parseStackFrame(stackFrames[1]).line
        let message = stackFrames[0]
        let logLine = line - 2
        this.logErrorAtLine(logLine, message)
        let altLine = this.mapping[logLine];
        if (altLine) {
            this.logErrorAtLine(altLine, message)
        }
    }
}

// if (false) {
//     console.clear()
//     debounce = exported.debounce
//     let Logger = new CMLogger(this.cm, exported.output.map);
//     let log = this.cm.Logger.log
//     log("This is it a teest")
//     try {
//         throw new Error("WOW");
//     } catch (e) {
//         Logger.displayError(e);
//     }
// }