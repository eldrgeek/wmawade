let endPattern = /\/\/end[:]?/
export default class Changer {
    constructor(cm) {
        this.cm = cm
    }
    syncChanges() {
        let changeLoc = this.findChange()
        if (!this.isInChange()) {
            this.scanBody(changeLoc.end)
            let changeText = this.makeChangeText();
            this.replaceChange(changeLoc, changeText)
            this.scanChange()
        } else {
            this.scanChange()
            this.scanBody(this.changeLoc.end)
            this.replaceCorresponding()
        }
        this.setMappings()
    }
    findChange() {
        let getLine = (i) => this.cm.getLine(i)
        let n = this.cm.lineCount()

        for (let i = 0; i < n; i++) {
            if (getLine(i).match(/^\s*\/\*\s*changes\s*/)) {
                let start = i;
                for (i++; i < n; i++) {
                    if (getLine(i).match(/^\s*endchanges\s*\*\//)) {
                        return this.changeLoc = { start, end: i }
                    }
                }
            }
        }
        this.cm.replaceRange("/* changes\n\nendchanges */\n", { line: 2, ch: 0 })
        return this.findChange()
    }
    isChangeVisible() {
        if (!this.changeLoc) return false;
        let viewPort = this.cm.getViewport()
        let changeLoc = this.changeLoc
        let viewFrom = viewPort.from
        let viewTo = viewPort.to
        let changeFrom = changeLoc.start
        let changeTo = changeLoc.end
        let inView = (line) => line > viewFrom && line < viewTo
        let inChange = (line) => line > changeFrom && line < changeTo
        //console.log(viewFrom, viewTo, changeFrom, changeTo)
        return inView(changeFrom) || inView(changeTo) || inChange(viewFrom) || inChange(viewTo)
    }
    isInChange() {
        if (!this.changeLoc) return false
        let line = this.cm.getCursor().line
        return line > this.changeLoc.start && line < this.changeLoc.end

    }

    makeChangeText() {
        let body = ["/* changes"]
        let getLine = (i) => this.cm.getLine(i)
        for (let key in this.bodyMap) {
            let mapping = this.bodyMap[key]
            //let indent = this.lineIndent(getLine(mapping.start))
            body.push(new Array(mapping.indent).join(" ") + getLine(mapping.keyLoc))
            for (let i = mapping.start; i <= mapping.end; i++) {
                body.push(getLine(i))
            }
        }
        body.push("//end\nendchanges */")
        return body.join("\n")
    }
    replaceChange(changeLoc, newBody) {
        let start = { line: changeLoc.start, ch: 0 }
        let end = { line: changeLoc.end, ch: null }
        let oldBody = this.cm.getRange(start, end)
        if (oldBody !== newBody)
            this.cm.replaceRange(newBody, start, end)
    }
    //
    inMap(map) {

        let line = this.cm.getCursor()
        for (let key in map) {
            let value = map[key]
            if (line >= value.start && line <= value.end) {
                return { line, key, value }
            }
        }
    }
    fixChangeMap() {
        for (let key in this.changeMap) {
            let entry = this.changeMap[key]
            for (let i = entry.end; i > entry.start; i--) {
                let line = this.cm.getLine(i)
                if (!line.trim) continue
                if (line.match(/\s*}/)) {
                    entry.end = i - 1;
                    entry.start = entry.start + 1
                }
            }
        }
    }

    scanChange() {
        this.changeMap = {}
        let n = this.changeLoc.end
        let i = this.changeLoc.start
        for (; i < n; i++) {
            let startLine = this.cm.getLine(i)
            let startIndent = this.lineIndent(startLine)
            if (this.locationComment(startLine)) {
                let start = i
                for (i++; i <= n; i++) {
                    let line = this.cm.getLine(i)
                    let thisIndent = this.lineIndent(line)
                    //console.log(line)
                    if (this.locationComment(line) ||
                        line.match(endPattern)
                        ||
                        (thisIndent === startIndent && line.trim() === "}")
                        ||
                        thisIndent < startIndent) {
                        this.makeChangeEntry(this.changeMap,
                            startLine.trim(), start, start + 1, i - 1)
                        i--
                        break
                    }
                }
            }
        }

    }

    scanBody(i = this.changeLoc.end, n = this.cm.lineCount()) {
        this.bodyMap = {}

        for (; i < n; i++) {
            let startLine = this.cm.getLine(i)
            if (this.locationComment(startLine)) {
                let start = i
                let startIndent = this.lineIndent(startLine)
                i++
                for (; i < n; i++) {
                    let line = this.cm.getLine(i)
                    let thisIndent = this.lineIndent(line)
                    if (startIndent > 0 && !line.trim()) continue
                    if (this.locationComment(line) ||
                        line.match(endPattern)
                        ||
                        (startIndent === 0 && !line.trim()) ||
                        thisIndent < startIndent ||
                        (thisIndent === startIndent && line.trim().match(/^}/))) {
                        let end = i - 1;
                        if ((thisIndent === startIndent && line.trim().match(/^}/))) end++
                        while (!this.cm.getLine(end).trim()) end--
                        this.makeChangeEntry(this.bodyMap,
                            startLine.trim(), start, start + 1, end)

                        i--
                        break
                    }
                }
            }
        }
    }
    // scanMethods(i = this.changeLoc.end, n = this.cm.lineCount()) {
    //     let methodBody = []
    //     let methodName
    //     let patchName
    //     for (; i < n; i++) {
    //         let matcher;
    //         if (matcher = this.cm.getLine(i).match(/class\s*(\S*)/)) {
    //             methodName = matcher[1]
    //             patchName = `${methodName}_patch`
    //             methodBody.push(`${patchName}{\n`)
    //             break
    //         }
    //     }
    //     for (; i < n; i++) {
    //         let startLine = this.cm.getLine(i)
    //         if (this.methodComment(startLine)) {
    //             let startIndent = this.lineIndent(startLine)
    //             for (i++; i < n; i++) {
    //                 let line = this.cm.getLine(i)
    //                 methodBody.push(line)
    //                 let thisIndent = this.lineIndent(line)
    //                 if (thisIndent === startIndent && line.trim().match(/^}/)) {
    //                     break
    //                 } else {

    //                 }
    //             }
    //         }
    //     }
    //     methodBody.push("}")
    //     methodBody.push(`for(key in ${patchName} ${className}[key] = ${patchName}[key].bind(${className})`)
    //     return methodBody.join("\n")
    // }


    makeChangeEntry(map, key, keyLoc, start, end) {
        //log(typeof map)
        if (!key) return;
        map[key] = { keyLoc, start: keyLoc + 1, end }
    }
    lineIndent(line) {
        let matcher = line.match(/^(\s*)\S/)
        if (!matcher) return 0
        return matcher[1].length
    }

    changeStart(line) {
        return line.match(/^let\s*change\s*=/)
    }
    changeEnd(line) {
        return line.match(/^}/)
    }
    locationComment(line) {
        let matcher = line.match(/^\s*\/\/(.*):\s*$/)
        if (matcher) return matcher[1]
        return null
    }

    setMappings() {
        let changeMap = this.changeMap
        let bodyMap = this.bodyMap
        let mappings = []
        for (let key in changeMap) {
            let change = changeMap[key]
            let body = bodyMap[key]
            //console.log(key, change)
            let i, j
            for (i = change.start, j = body.start; i <= change.end; i++ , j++) {
                mappings[i] = j;
                mappings[j] = i;
            }
        }
        //console.log(this.cm.Logger, mappings)
        if (this.cm.Logger) this.cm.Logger.setMapping(mappings)
    }
    replaceCorresponding() {
        for (let key in this.changeMap) {
            let change = this.changeMap[key]
            let body = this.bodyMap[key]
            // let n = change.end - change.start + 1
            let newStuff = this.cm.getRange({ line: change.start, ch: 0 },
                { line: change.end, ch: null });
            let oldStuff = this.cm.getRange({ line: body.start, ch: 0 },
                { line: body.end, ch: null })
            if (oldStuff !== newStuff) {
                this.cm.replaceRange(newStuff, { line: body.start, ch: 0 },
                    { line: body.end, ch: null })
            }
        }
    }
    // scanMethods(text) {
    //     let methodComment = (line) => {
    //         let matcher = line.match(/^\s*\/\/(.*):\s*$/)
    //         if (matcher) return matcher[1]
    //         return null
    //     }
    //     let methodBody = []
    //     let className
    //     let patchName
    //     let aLines = text.split("\n")
    //     let n = aLines.length
    //     let i = 0
    //     for (; i < n; i++) {
    //         let matcher;
    //         if (matcher = aLines[i].match(/class\s*(\S*)/)) {
    //             className = matcher[1]
    //             patchName = `${className}_patch`
    //             methodBody.push(`let ${patchName} = {\n`)
    //             break
    //         }
    //     }
    //     for (; i < n; i++) {
    //         let startLine = aLines[i]
    //         if (methodComment(startLine)) {
    //             let startIndent = this.lineIndent(startLine)
    //             for (i++; i < n; i++) {
    //                 let line = aLines[i]
    //                 methodBody.push(line)
    //                 let thisIndent = this.lineIndent(line)
    //                 if (thisIndent === startIndent && line.trim().match(/^}/)) {
    //                     break
    //                 } else {

    //                 }
    //             }
    //             methodBody.push(",")
    //         }
    //     }
    //     methodBody.push("}")
    //     methodBody.push(`for(let key in ${patchName}) this.${className.toLowerCase()}[key] = ${patchName}[key].bind(this.${className.toLowerCase()})`)
    //     return methodBody.join("\n")
    // }

}
/*
Example:
let log = this.cm.Logger.log


//this change:
let a = 100
a = a + 100
a += 200

//another changer:
let c = 1000
c += 200
c += 200
c += 200
log("e")



let more = "changes"
more += 100
c += 200
c += 200
c += 200

*/
/*


let changer_patch = {

  method(){
    let a = 1
  }
,
  method2 (){
     let b = 2
  }
,
}
for(let key in changer_patch) this.changer[key] = changer_patch[key].bind(this.changer)

*/