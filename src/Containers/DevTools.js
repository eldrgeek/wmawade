import React from 'react';
import { createDevTools } from 'redux-devtools';
import LogMonitor from 'redux-devtools-log-monitor';
import DockMonitor from 'redux-devtools-dock-monitor';
import SliderMonitor from "redux-slider-monitor"

export default createDevTools(
	<DockMonitor toggleVisibilityKey='ctrl-h'
		changeMonitorKey='ctrl-m'
		changePositionKey='alt-q'
		defaultSize={0.2}>
		<LogMonitor />
		<SliderMonitor keyboardEnabled />
	</DockMonitor>
);
