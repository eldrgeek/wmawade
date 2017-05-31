//import SocketStatus from "./socketStatus";
import throttle from 'lodash/throttle';
import { render } from 'react-dom'
import glamorous from "glamorous"
import CMLogger from '../js/cmlogger'
import Changer from "../js/changer"
import FAButton from "./FAButton"
import { connect } from "react-redux";
const React = require('react'); //feature: react
const CodeMirror = require('react-codemirror');
const Babel = require("babel-standalone")
const BaseCodeMirror = require('codemirror/lib/codemirror')
require('codemirror/addon/dialog/dialog')
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/search/search')
let SourceMap = require("source-map")
require('codemirror/keymap/sublime')

var Slider = require('nw-react-slider')
require('codemirror/addon/scroll/annotatescrollbar');
require('codemirror/addon/search/matchesonscrollbar');
require('codemirror/addon/search/matchesonscrollbar.css');
require('nw-react-slider/dist/nw-react-slider.css')
//require('mdi/css/materialdesignicons.css')
require("font-awesome-webpack")
require('codemirror/lib/codemirror.css');
require('codemirror/addon/mode/simple');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/mode/multiplex');
require("codemirror/addon/dialog/dialog.css");
require('codemirror/addon/search/jump-to-line')
require('codemirror/addon/search/match-highlighter')
require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/foldgutter.css')
require('codemirror/addon/fold/indent-fold')
require('codemirror/addon/hint/show-hint')
require('codemirror/addon/hint/javascript-hint')
require('codemirror/addon/hint/anyword-hint')
require('../css/wmawade.css')
BaseCodeMirror.defineMode("changemode", function (config) {
    return BaseCodeMirror.multiplexingMode(
        BaseCodeMirror.getMode(config, "text/javascript"),
        {
            open: "/* changes", close: "endchanges */",
            mode: BaseCodeMirror.getMode(config, "text/javascript"),
            delimStyle: "comment"
        })
})
const debounce = require("debounce")

window.onbeforeunload = function () {
    return "Are you sure you want to navigate away?";
}
const MaterialButton = (props) => {
    return <i className="material-icons">{props.text}</i>
}

class CodeSlider extends React.Component {
    constructor(props) {
        super(props);
        this.sliderProps = {
            value: 5,
            min: 0, max: 20,
        }
    }
    sliderUpdate(value) {
        console.log(value)
    }
    sliderChange(value) {
        this.sliderProps.value = value
        //this.sliderUpdate(value)
        if (this.props.parentComponent.sliderWasChanged) {
            this.props.parentComponent.sliderWasChanged(value)
        }
        // if(this.props.sliderWasChanged)
        //     this.props.sliderWasChanged(value)
        this.forceUpdate()
        // this.sliderProps.value = value
    }
    setSliderProps(props) {
        this.sliderProps = props
    }
    getSliderProps(props) {
        return this.sliderProps
    }
    render() {
        return (<Slider
            value={this.sliderProps.value}
            min={this.sliderProps.min}
            max={this.sliderProps.max}
            ticks
            markerLabel={this.sliderProps.markerLabel}
            onChange={this.sliderChange.bind(this)}
        />)
    }

}
class CodeEditor extends React.Component {
    //F: initialize
    constructor(props) {
        super(props);
        this.state = { code: "//Test" }
        this.callbacks = []
        this.sliderProps = { value: 5, min: 0, max: 10, markers: [{ value: 3, label: 'Three' }, { value: 8, label: 'Eight' }] }
    }
    addCB(event, cb) {
        let boundCB = cb.bind(this)
        this.cm.on(event, boundCB)
        this.callbacks.push({ event, boundCB });
    }
    onChange(cm) {
        this.modChange(cm)
    }
    // debouncedCompile = debounce((cm) =>
    //     this.compileCode(cm), 100);
    // modChange = debounce((cm) => {
    //     this.cm.Logger.clearLogs()
    //     this.debouncedCompile(cm)
    //     //setTimeout( this.clearError.bind(this), 2000)
    // }, 50, false)

    showError(e) {
        let eLine = e.stack.split("\n")[0];
        console.log(eLine);
        let matcher = eLine.match(/^(.*):\s(.*):(.*)\((\d+):(\d+)/)
        if (matcher) {
            let message = matcher[1] + " " + matcher[3]
            let line = +matcher[4]
            line = line - 1
            let ch = +matcher[5]
            message = "<pre>" + Array(ch).join(" ") + "^ </pre>" + message
            this.cm.Logger.logAtPos({ line, ch: 0 }, message, "errormessage")
        } else {
            this.cm.Logger.logAtPos(this.cm.getCursor(), eLine, "errormessage")
        }
    }
    cursorActivity(cm) {
        this.actuallyMoved(cm)
    }
    actuallyMoved(cm) {
        //console.log("actually moved")
    }


    saveCode(cm) {
        console.log("this")
        try {
            this.changer = new Changer(cm)
            this.debouncedCompile = debounce((cm) =>
                this.compileCode(cm), 800);
            this.modChange = debounce((cm) => {
                this.cm.Logger.clearLogs()
                this.changer.syncChanges(cm)
                this.debouncedCompile(cm)
                //setTimeout( this.clearError.bind(this), 2000)
            }, 300, false)

            this.compileCode(cm)
        } catch (e) {
            console.log(e)
        }
    }

    compileCode(cm) {
        let source = this.cm.getValue();
        let aLines = source.split("\n")
        let n = aLines.length
        let sTop = ""
        let sBottom = ""
        // eslint-disable-next-line
        let i;
        let aSplit = (i, n) => {
            let aGroup = []
            for (; i < n; i++) {
                let line = aLines[i]
                if (line.match(/\/\/\s*SPLIT/)) {
                    break
                }
                aGroup[i] = line
            }
            return [i, aGroup.join("\n")]
        }
        [i, sTop] = aSplit(0, n)
        // let offset = i + 1
        
        this.compileAndRun(sTop, 0, true)
        this.compileAndRun(sBottom, 0, false)
    }
    compileAndRun(source, offset, initial) {
        source = "(exported) => {\n" + source + "}"
        try {
            // let func = "(param)=> {" + source + "}"
            
            //console.clear()
            let output = Babel.transform(source,
                {
                    // plugins: ['lolizer'], 
                    presets: [["es2015", { modules: false }],
                        "react"],
                    sourceMap: "both",
                    filename: "client"
                },
            )
            try {
                // eslint-disable-next-line
                let code = eval(output.code).bind(this);
                let Logger
                if (initial) {
                    Logger = new CMLogger(this.cm, output.map);
                }
                else {
                    Logger = this.cm.Logger
                    this.cm.Logger.addSourceMap(output.map, offset)
                }
                let exported = {
                    source, output,
                    SourceMap, GDTEditor: this.props.gdtEditor, CodeEditor,
                    throttle, debounce, Logger, Changer, render, glamorous
                }


                code(exported);
            } catch (e) {
                this.showRuntimeError(e);
                console.log(e)
            }

        } catch (e) {
            this.showError(e)
            console.log(e)
        }
    }
    showRuntimeError(e) {
        this.cm.Logger.displayError(e)
    }
    gutterClick(cm, line, gutter, event) {
        this.gutterClick1(cm, line, gutter, event)
    }
    testReducer(cm) {
        console.log("trying to test")
        try {
            if (this.count === undefined ) this.count = 0
            this.count++
            this.props.dispatchTest({ type: "test", data: this.count })
        } catch (e) {
            console.log(e)
        }

    }
    initialize(cm) {
        if (!this.lastLine) this.lastLine = 0;
        if (!cm) return;
        this.cm = cm.getCodeMirror();
        // this.cm.setOption("fold", this.cm.constructor.fold.indent)
        if (module.hot) {
            // module.hot.addDisposeHandler(this.disposeHandler.bind(this))
        }	// if(moduleInitialized) return;

        for (let entry of this.callbacks) {
            this.cm.off(entry.event, entry.boundCB)
        }
        this.callbacks = []
        this.addCB("cursorActivity", debounce(this.cursorActivity, 50, true))
        this.cm.removeKeyMap("GTD");
        this.addCB("gutterClick", this.gutterClick)
        this.saveCode(this.cm)
        this.cm.addKeyMap({
            name: "GTD",
            "Ctrl-F": "findPersistent",
            "Ctrl-K": this.testReducer.bind(this),
            "Ctrl-S": this.saveCode.bind(this)
        })
    }

    codeSliderRef(ref) {
        this.codeSlider = ref
    }
    sliderWasChanged(val) {
        console.log("SLIDER CHANGED TO ", val)
    }

    render() {
        var options = {
            lineNumbers: true,
            mode: "changemode",
            keyMap: "sublime",
            extraKeys: {
                "Ctrl-Q": function (cm) {
                    cm.foldCode(cm.getCursor());
                },
                "Ctrl-Space": "autocomplete",
                'Tab': 'insertSoftTab'
            },
            foldGutter: { rangeFinder: BaseCodeMirror.fold.indent },
            gutters: ["CodeMirror-linenumbers",
                "CodeMirror-foldgutter",
                "arrow-gutter",
                "breakpoint-gutter"]
        };
        return (<div className="codeEditor">
            <MaterialButton text="face" />
            <MaterialButton text="pause" />
            <FAButton type="fa-twitter" />
            <FAButton contents="fa-twitter" />
            <div>{this.props.commandState}</div>

            <CodeSlider
                sliderWasChanged={this.sliderWasChanged}
                parentComponent={this}
                ref={(entry) => { this.codeSliderRef(entry) }} />
            <CodeMirror
                ref={(entry) => { this.initialize(entry) }}
                onChange={this.onChange.bind(this)}
                options={options} />
            )
            </div>)

    }
    componentWillReceiveProps(nextProps) {
        console.log("Motively", nextProps, this.props)
    }
}

const mapStateToProps = (state, ownProps) => {
    console.log("Mappers")
	return {commandState: state.commandState }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        dispatchTest: (action) => {
            dispatch(action)
        }
    }
}

//export default CodeEditor;
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CodeEditor);