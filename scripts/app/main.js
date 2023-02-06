define(["jquery"], function($) {
    $(function() {
        $('body').alpha().beta();
    });
});

requirejs(["codemirror/lib/codemirror", "codemirror/addon/comment/continuecomment"],
function(CodeMirror) {
});

let bootScripts = [
    'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js',
    'https://code.jquery.com/jquery-3.3.1.min.js',
    'https://cdn.jsdelivr.net/npm/fomantic-ui@2.8.7/dist/semantic.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/codemirror.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/mode/javascript/javascript.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/mode/meta.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/addon/search/searchcursor.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/addon/display/panel.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.13.13/beautify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.13.13/beautify-css.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.13.13/beautify-html.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/addon/lint/lint.js',
    'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0/addon/lint/javascript-lint.js',
    'https://cdn.jsdelivr.net/gh/jshint/jshint@master/dist/jshint.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/ModalDialog.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/StorageBin.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/CodeMirror/addon/dialog/advanced-dialog.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/CodeMirror/addon/search/revised-search.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/CodeMirror/addon/search/revised-jump-to-line.js',
    'https://cdn.jsdelivr.net/gh/premasagar/tim@master/tim.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/FileBin.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/fomantic-ui/components/spinner.js',
    'https://cdn.jsdelivr.net/gh/daemondevin/cdn/BugBin.js'
]

new Boot(
    bootScripts, {
        loaded: function(obj, current, maximum) {
            document.getElementById("Progress").innerText = current + " of " + maximum + " downloaded...";
        }
    }
);

