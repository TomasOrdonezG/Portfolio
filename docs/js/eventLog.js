import { analytics } from "./firebase.js";
import { logEvent } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

const FILE_EXECUTED_EVENT_NAME = "file_exec";
const FILE_FOCUSED_EVENT_NAME = "file_focus";
const FILE_LOADED_EVENT_NAME = "file_loaded";

class EventLog {
    static fileExecuted(filename) {
        logEvent(analytics, FILE_EXECUTED_EVENT_NAME, { filename: filename });
    }

    static fileFocused(filename) {
        logEvent(analytics, FILE_FOCUSED_EVENT_NAME, { filename: filename });
    }

    static fileLoaded(filename) {
        logEvent(analytics, FILE_LOADED_EVENT_NAME, { filename: filename });
    }
}

export default EventLog;
