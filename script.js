'use strict';

const App = (() => {

  const VERSION = '1.3.0';
  const CDN_CM  = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0';

  const KEYBOARD_SHORTCUTS = [
    ['Ctrl+N',         'New File'],
    ['Ctrl+O',         'Open File'],
    ['Ctrl+S',         'Save File'],
    ['Ctrl+Shift+S',   'Save As'],
    ['Ctrl+Z',         'Undo'],
    ['Ctrl+Y',         'Redo'],
    ['Ctrl+X',         'Cut'],
    ['Ctrl+C',         'Copy'],
    ['Ctrl+V',         'Paste'],
    ['Ctrl+A',         'Select All'],
    ['Ctrl+F',         'Find'],
    ['Ctrl+H',         'Replace'],
    ['Alt+G',          'Jump to Line'],
    ['Ctrl+Space',     'Autocomplete'],
    ['F11',            'Fullscreen'],
    ['F1',             'About'],
    ['F7',             'Export Settings'],
    ['Tab',            'Indent / Insert Tab'],
  ];

  const THEMES = [
    '3024-day','3024-night','abcdef','ambiance','base16-dark','base16-light',
    'bespin','blackboard','cobalt','colorforth','dracula','duotone-dark',
    'duotone-light','eclipse','elegant','erlang-dark','gruvbox-dark',
    'hopscotch','icecoder','isotope','lesser-dark','liquibyte','material',
    'mbo','mdn-like','midnight','monokai','neat','neo','night','panda-syntax',
    'paraiso-dark','paraiso-light','pastel-on-dark','railscasts','rubyblue',
    'seti','solarized','the-matrix','tomorrow-night-bright','tomorrow-night-eighties',
    'ttcn','twilight','vibrant-ink','xq-dark','xq-light','yeti','zenburn',
  ];

  const FONT_FACES  = ['Anonymous Pro','Courier Prime','Fira Code','Inconsolata','JetBrains Mono','Source Code Pro','Ubuntu Mono'];
  const FONT_SIZES  = ['10','11','12','13','14','15','16','18','20'];

  let editor = null;
  let clipboard = '';
  let activeEncoding = 'UTF-8';
  let activeEOL = 'lf';
  let uiTheme = 'dark';

  const state = new Map();   // persistent app config (in-memory)

  const FS = (() => {
    const DISK_SIZE = 1_000_000;
    let usedSpace = 0;
    let cwd = '~';

    // dirs[path] = [{ name, lastModified }]
    // files[path] = [{ name, content, size, type, lastModified }]
    const dirs  = { '~': [] };
    const files = { '~': [] };

    const now = () => {
      const d = new Date();
      const pad = n => String(n).padStart(2,'0');
      return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const normPath = (base, rel) => {
      if (!rel || rel === '.')  return base;
      if (rel === '~' || rel === '/')  return '~';
      if (rel === '-') return state.get('OLDPWD') || '~';

      let parts = (rel.startsWith('/') ? '~/' + rel.slice(1) : base + '/' + rel)
        .replace(/\/+/g, '/').split('/').filter(Boolean);

      const stack = [];
      for (const p of parts) {
        if (p === '..')  { if (stack.length > 1) stack.pop(); }
        else if (p !== '.') stack.push(p);
      }
      return stack.join('/') || '~';
    };

    return {
      getCwd: () => cwd,
      setCwd: (path) => { state.set('OLDPWD', cwd); cwd = path; },

      mkdir(name) {
        if (!name) return { ok: false, msg: 'mkdir: directory name required' };
        const fullPath = normPath(cwd, name);
        if (dirs[fullPath] !== undefined) return { ok: false, msg: `mkdir: '${name}': File exists` };
        const parentPath = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '~';
        if (dirs[parentPath] === undefined) return { ok: false, msg: `mkdir: cannot create directory '${name}': No such directory` };
        dirs[parentPath].push({ name: fullPath.split('/').pop(), lastModified: now() });
        dirs[parentPath].sort((a,b) => a.name.localeCompare(b.name));
        dirs[fullPath]  = [];
        files[fullPath] = [];
        return { ok: true };
      },

      cd(dir) {
        if (!dir) return { ok: false, msg: 'cd: directory required' };
        const target = normPath(cwd, dir);
        if (dirs[target] === undefined) return { ok: false, msg: `cd: '${dir}': No such file or directory` };
        state.set('OLDPWD', cwd);
        cwd = target;
        return { ok: true };
      },

      touch(name, content = '') {
        if (!name) return { ok: false, msg: 'touch: filename required' };
        const existing = files[cwd] || [];
        const modeInfo = CodeMirror.findModeByFileName(name);
        const mime = modeInfo?.mimes?.[0] || modeInfo?.mime || 'text/plain';
        const size = new Blob([content]).size;
        if (usedSpace + size > DISK_SIZE) return { ok: false, msg: 'touch: No space left on device' };
        const idx = existing.findIndex(f => f.name === name);
        if (idx >= 0) {
          usedSpace -= existing[idx].size;
          existing[idx] = { name, content, size, type: mime, lastModified: now() };
        } else {
          existing.push({ name, content, size, type: mime, lastModified: now() });
          existing.sort((a,b) => a.name.localeCompare(b.name));
        }
        if (!files[cwd]) files[cwd] = [];
        files[cwd] = existing;
        usedSpace += size;
        return { ok: true };
      },

      ls(path = null) {
        const p = path || cwd;
        return { dirs: dirs[p] || [], files: files[p] || [] };
      },

      read(name) {
        const list = files[cwd] || [];
        return list.find(f => f.name === name) || null;
      },

      treeStr(path = null, depth = 0) {
        const p = path || cwd;
        let lines = [];
        const { dirs: ds, files: fs } = this.ls(p);
        const prefix = '│  '.repeat(Math.max(0, depth - 1)) + (depth > 0 ? '├── ' : '');
        for (const d of ds) {
          lines.push(prefix + '📁 ' + d.name);
          lines = lines.concat(this.treeStr(p + '/' + d.name, depth + 1));
        }
        for (const f of fs) {
          lines.push(prefix + '📄 ' + f.name);
        }
        return lines;
      },

      getAllPaths() {
        // Returns full tree for Explorer sidebar
        const walk = (path, depth) => {
          const result = [];
          const { dirs: ds, files: fs } = this.ls(path);
          for (const d of ds) {
            const fullPath = path + '/' + d.name;
            result.push({ type: 'dir', name: d.name, path: fullPath, depth });
            result.push(...walk(fullPath, depth + 1));
          }
          for (const f of fs) {
            result.push({ type: 'file', name: f.name, path: path + '/' + f.name, depth });
          }
          return result;
        };
        return [{ type: 'dir', name: '~', path: '~', depth: 0 }, ...walk('~', 1)];
      },

      diskInfo() {
        return { total: DISK_SIZE, used: usedSpace, free: DISK_SIZE - usedSpace };
      }
    };
  })();

  const beautifyOpts = {
    js: {
      indent_size: 2,
      indent_char: ' ',
      indent_with_tabs: false,
      preserve_newlines: true,
      max_preserve_newlines: 10,
      jslint_happy: false,
      brace_style: 'collapse',
      space_in_paren: true,
      space_after_anon_function: true,
      break_chained_methods: true,
      comma_first: false,
      e4x: false,
      end_with_newline: false,
    },
    css: {
      indent_size: 2,
      indent_char: ' ',
      indent_with_tabs: false,
      selector_separator_newline: false,
      newline_between_rules: true,
      end_with_newline: false,
    },
    html: {
      indent_size: 4,
      indent_char: ' ',
      indent_with_tabs: false,
      preserve_newlines: true,
      max_preserve_newlines: 3,
      indent_inner_html: false,
      brace_style: 'collapse',
      wrap_line_length: 250,
      end_with_newline: false,
    }
  };

  const Modal = {
    alert(msg, title = 'Alert') {
      return new Promise(resolve => {
        document.getElementById('alert-title').textContent = title;
        document.getElementById('alert-body').innerHTML = msg;
        const backdrop = document.getElementById('alert-modal');
        backdrop.classList.add('visible');
        const ok = document.getElementById('alert-ok');
        const handler = () => { backdrop.classList.remove('visible'); ok.removeEventListener('click', handler); resolve(true); };
        ok.addEventListener('click', handler);
      });
    },
    confirm(msg, title = 'Confirm') {
      return new Promise(resolve => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-body').innerHTML = msg;
        const backdrop = document.getElementById('confirm-modal');
        backdrop.classList.add('visible');
        const ok     = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');
        const cleanup = (val) => {
          backdrop.classList.remove('visible');
          ok.removeEventListener('click', onOk);
          cancel.removeEventListener('click', onCancel);
          resolve(val);
        };
        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
      });
    },
    prompt(msg, title = 'Input', defaultVal = '') {
      return new Promise(resolve => {
        document.getElementById('prompt-title').textContent = title;
        document.getElementById('prompt-body').innerHTML = msg;
        const input   = document.getElementById('prompt-input');
        const backdrop= document.getElementById('prompt-modal');
        input.value = defaultVal;
        backdrop.classList.add('visible');
        setTimeout(() => input.focus(), 50);
        const ok     = document.getElementById('prompt-ok');
        const cancel = document.getElementById('prompt-cancel');
        const cleanup = (val) => {
          backdrop.classList.remove('visible');
          ok.removeEventListener('click', onOk);
          cancel.removeEventListener('click', onCancel);
          input.removeEventListener('keydown', onKey);
          resolve(val);
        };
        const onOk = () => cleanup(input.value);
        const onCancel = () => cleanup(null);
        const onKey = (e) => { if (e.key === 'Enter') onOk(); if (e.key === 'Escape') onCancel(); };
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        input.addEventListener('keydown', onKey);
      });
    }
  };

  const Toast = {
    show(title, msg, type = 'info', duration = 3000) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-msg">${msg}</div>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  };

  const Debugger = {
    log(level, container, msg) {
      const out = document.getElementById('debugger-output');
      if (!out) return;
      const entry = document.createElement('div');
      entry.className = `debug-entry ${level}`;
      entry.innerHTML = `<div class="debug-header">[${container}] ${level}</div><div class="debug-body">${
        typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg)
      }</div>`;
      out.appendChild(entry);
      out.scrollTop = out.scrollHeight;
    },
    make(container) {
      return {
        log:   (m) => Debugger.log('log',   container, m),
        info:  (m) => Debugger.log('info',  container, m),
        debug: (m) => Debugger.log('debug', container, m),
        warn:  (m) => Debugger.log('warn',  container, m),
        error: (m) => Debugger.log('error', container, m),
        table: (m) => Debugger.log('debug', container, JSON.stringify(m, null, 2)),
      };
    }
  };

  const dbg = {
    interface: Debugger.make('interface'),
    editor:    Debugger.make('editor'),
    file:      Debugger.make('file'),
    config:    Debugger.make('config'),
    fs:        Debugger.make('filesystem'),
  };

  const Loader = {
    script(src, cls) {
      return new Promise((resolve, reject) => {
        // Remove any existing scripts with the same class
        document.querySelectorAll(`.${cls}`).forEach(s => s.remove());
        const s = document.createElement('script');
        s.src = src;
        if (cls) s.className = cls;
        s.onload = () => resolve(s);
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.body.appendChild(s);
      });
    },
    stylesheet(href, cls) {
      return new Promise((resolve, reject) => {
        document.querySelectorAll(`.${cls}`).forEach(l => l.remove());
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href;
        if (cls) l.className = cls;
        l.onload = () => resolve(l);
        l.onerror = () => reject(new Error(`Failed to load: ${href}`));
        document.head.appendChild(l);
      });
    }
  };

  const EditorUtils = {
    getMode()    { const m = editor.getOption('mode'); return typeof m === 'object' ? m.name : m; },
    getMime()    { return EditorUtils.mimeForMode(EditorUtils.getMode()); },
    getValue()   { return editor.getDoc().getValue(); },
    setValue(v)  { editor.getDoc().setValue(v); editor.clearHistory(); editor.markClean(); },
    wordCount(s) {
      const m = s.match(/[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g);
      if (!m) return 0;
      return m.reduce((n, w) => n + (w.charCodeAt(0) >= 0x4e00 ? w.length : 1), 0);
    },
    mimeForMode(mode) {
      if (!mode) return 'text/plain';
      const m = mode.toLowerCase();
      for (const info of CodeMirror.modeInfo) {
        if (info.mode === m) return (info.mimes && info.mimes[0]) || info.mime || 'text/plain';
      }
      return 'text/plain';
    },
    async setTheme(theme) {
      if (theme === 'default') {
        editor.setOption('theme', 'default');
        state.set('theme', 'default');
        return;
      }
      try {
        await Loader.stylesheet(`${CDN_CM}/theme/${theme}.css`, 'cm-theme');
        editor.setOption('theme', theme);
        state.set('theme', theme);
        dbg.editor.log('Theme set to ' + theme);
      } catch (e) { dbg.editor.error('Theme load failed: ' + e.message); }
    },
    async setMode(mode, mime) {
      if (!mode) return;
      try {
        await Loader.script(`${CDN_CM}/mode/${mode}/${mode}.js`, 'cm-mode');
      } catch (_) { /* mode might already be bundled */ }
      editor.setOption('mode', mime || mode);
      state.set('mode', mode);
      state.set('mime', mime || mode);
      UI.updateStatusBar();
      dbg.editor.log(`Mode set to ${mode}`);
    },
    async setFont(font) {
      try {
        await Loader.stylesheet(`https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@400;500&display=swap`, 'cm-font');
        const cmEl = editor ? editor.getWrapperElement() : document.querySelector('.CodeMirror');
        if (cmEl) cmEl.style.fontFamily = `'${font}', monospace`;
        state.set('fontface', font);
        if (editor) editor.refresh();
      } catch (e) { dbg.interface.error('Font load failed: ' + e.message); }
    },
    setFontSize(size) {
      const cmEl = editor ? editor.getWrapperElement() : document.querySelector('.CodeMirror');
      if (cmEl) cmEl.style.fontSize = size + 'px';
      state.set('fontsize', size);
      if (editor) editor.refresh();
    },
    async formatCode() {
      const code = EditorUtils.getValue();
      const mode = EditorUtils.getMode();
      let formatted;
      try {
        switch (mode) {
          case 'javascript': formatted = js_beautify(code, beautifyOpts.js); break;
          case 'css':        formatted = css_beautify(code, beautifyOpts.css); break;
          case 'htmlmixed':
          case 'html':       formatted = html_beautify(code, beautifyOpts.html); break;
          case 'xml':        formatted = EditorUtils.formatXml(code); break;
          case 'application/json':
          case 'json':
            formatted = JSON.stringify(JSON.parse(code), null, 2); break;
          default:           formatted = code;
        }
        if (formatted && formatted !== code) {
          EditorUtils.setValue(formatted);
          Toast.show('Code Formatted', 'Your code has been beautified.', 'success');
        }
      } catch(e) {
        Toast.show('Format Error', e.message, 'error');
      }
    },
    formatXml(xml) {
      let pad = 0, formatted = '';
      xml.replace(/(>)(<)(\/*)/g,'$1\r\n$2$3').split('\r\n').forEach(node => {
        let indent = 0;
        if      (node.match(/.+<\/\w[^>]*>$/)) indent = 0;
        else if (node.match(/^<\/\w/))         { if (pad) pad--; }
        else if (node.match(/^<\w[^>]*[^\/]>.*$/)) indent = 1;
        formatted += '  '.repeat(pad) + node + '\r\n';
        pad += indent;
      });
      return formatted;
    }
  };

  const FileOps = {
    isModified() { return editor ? !editor.isClean() : false; },

    async checkDiscard() {
      if (!FileOps.isModified()) return true;
      return await Modal.confirm('This file has been modified. Discard changes?', 'Unsaved Changes');
    },

    newFile() {
      FileOps.checkDiscard().then(ok => {
        if (!ok) return;
        const doc = new CodeMirror.Doc('', 'text/plain');
        editor.swapDoc(doc);
        editor.markClean();
        UI.setFilename('untitled.txt');
        UI.updateStatusBar();
        editor.focus();
        dbg.file.info('New file created');
      });
    },

    async openFile() {
      if (!(await FileOps.checkDiscard())) return;
      try {
        const opts = FileOps._getFileTypeOpts();
        // Use FileBin handler if available, otherwise use native <input>
        if (typeof handler !== 'undefined') {
          const file = await handler.fileOpen(opts);
          const info = CodeMirror.findModeByMIME(file.type) || CodeMirror.findModeByFileName(file.name);
          file.data = await handler.fileRead(file);
          const doc = new CodeMirror.Doc(file.data, info?.mode || 'text/plain');
          editor.swapDoc(doc);
          editor.markClean();
          UI.setFilename(file.name);
          await EditorUtils.setMode(info?.mode || 'text', file.type);
        } else {
          FileOps._openViaNativeInput();
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          Toast.show('Open Error', e.message, 'error');
        }
      }
    },

    _openViaNativeInput() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'text/*,.js,.ts,.css,.html,.json,.xml,.md,.py,.rb,.php,.java,.c,.cpp,.h,.go,.rs,.swift,.kt';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const info = CodeMirror.findModeByMIME(file.type) || CodeMirror.findModeByFileName(file.name);
        const doc = new CodeMirror.Doc(text, info?.mode || 'text/plain');
        editor.swapDoc(doc);
        editor.markClean();
        UI.setFilename(file.name);
        await EditorUtils.setMode(info?.mode || 'text', file.type || 'text/plain');
      };
      input.click();
    },

    async saveFile() {
      const data = EditorUtils.getValue();
      const mime = EditorUtils.getMime();
      const name = document.getElementById('filename').textContent || 'untitled.txt';
      try {
        if (typeof handler !== 'undefined') {
          await handler.fileSave(new Blob([data], { type: mime }), { fileName: name });
        } else {
          FileOps._downloadAs(data, name, mime);
        }
        editor.markClean();
        UI.updateModifiedState();
        Toast.show('File Saved', `"${name}" saved successfully.`, 'success');
      } catch (e) {
        if (e?.name !== 'AbortError') Toast.show('Save Error', e.message, 'error');
      }
    },

    async saveAsFile() {
      const name = await Modal.prompt('Enter a filename:', 'Save As…', document.getElementById('filename').textContent);
      if (!name) return;
      UI.setFilename(name);
      await FileOps.saveFile();
    },

    downloadAs() {
      const data = EditorUtils.getValue();
      const name = document.getElementById('filename').textContent || 'untitled.txt';
      const mime = EditorUtils.getMime();
      FileOps._downloadAs(data, name, mime);
    },

    _downloadAs(data, name, mime) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: mime }));
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    _getFileTypeOpts() {
      const exts = [], mimes = [];
      CodeMirror.modeInfo.forEach(info => {
        if (info.ext) exts.push(...info.ext);
        if (info.mimes) mimes.push(...info.mimes);
        else if (info.mime) mimes.push(info.mime);
      });
      return { extensions: exts, mimeTypes: mimes };
    },

    exportSettings() {
      const data = JSON.stringify(Object.fromEntries(state), null, 2);
      FileOps._downloadAs(data, 'codeditorSettings.json', 'application/json');
    },

    async resetSettings() {
      const ok = await Modal.confirm('Reset all settings? This cannot be undone.', 'Reset Settings');
      if (!ok) return;
      state.clear();
      Toast.show('Settings Reset', 'All settings have been cleared.', 'info');
    },
  };

  const UI = {
    setFilename(name) {
      document.getElementById('filename').textContent = name;
    },

    updateModifiedState() {
      const led = document.getElementById('led');
      const mod = FileOps.isModified();
      led.classList.toggle('on', mod);
      document.getElementById('sb-changes').textContent = mod ? 'Unsaved Changes' : 'No Unsaved Changes';
    },

    updateStatusBar() {
      if (!editor) return;
      const pos   = editor.getCursor();
      const mode  = EditorUtils.getMode();
      const mime  = EditorUtils.getMime();
      document.getElementById('sb-cursor').querySelector('a').textContent = `${pos.line+1}:${pos.ch}`;
      document.getElementById('sb-lines').textContent  = `lines: ${editor.lineCount()}`;
      document.getElementById('sb-words').textContent  = `words: ${EditorUtils.wordCount(EditorUtils.getValue())}`;
      document.getElementById('sb-lang').textContent   = mode;
      document.getElementById('sb-mime').textContent   = mime;
      document.getElementById('sb-encoding').textContent = activeEncoding;
      document.getElementById('sb-eol').textContent    = activeEOL.toUpperCase();
    },

    updateRedoState() {
      const hasRedo = editor && editor.historySize().redo > 0;
      document.getElementById('tb-redo').disabled = !hasRedo;
      const redoMenu = document.getElementById('redo-menu-item');
      redoMenu.classList.toggle('disabled', !hasRedo);
    },

    renderExplorer() {
      const tree = document.getElementById('explorer-tree');
      tree.innerHTML = '';
      const paths = FS.getAllPaths();
      const currentFile = document.getElementById('filename').textContent;

      paths.forEach(item => {
        const el = document.createElement('div');
        el.className = `explorer-item ${item.type === 'dir' ? 'folder' : ''} indent-${Math.min(item.depth, 3)}`;
        if (item.type === 'file' && item.name === currentFile) el.classList.add('active');
        el.innerHTML = `<span class="icon">${item.type === 'dir' ? '▶' : '◆'}</span><span>${item.name}</span>`;
        if (item.type === 'file') {
          el.addEventListener('click', () => {
            const parts = item.path.split('/');
            const name  = parts.pop();
            const dir   = parts.join('/') || '~';
            // Save current cwd, open file
            const savedCwd = FS.getCwd();
            FS.setCwd(dir);
            const f = FS.read(name);
            if (f) {
              const info = CodeMirror.findModeByMIME(f.type) || CodeMirror.findModeByFileName(name);
              const doc = new CodeMirror.Doc(f.content, info?.mode || 'text/plain');
              editor.swapDoc(doc);
              editor.markClean();
              UI.setFilename(name);
              EditorUtils.setMode(info?.mode || 'text', f.type);
            }
            FS.setCwd(savedCwd);
            UI.renderExplorer();
          });
        }
        tree.appendChild(el);
      });
    },

    buildFormatPanel(lang, containerId, opts) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      Object.entries(opts).forEach(([key, val]) => {
        const row = document.createElement('div');
        row.className = 'format-option';
        const label = document.createElement('label');
        label.textContent = key.replace(/_/g, ' ');
        label.title = `${lang}.${key}`;
        row.appendChild(label);

        if (typeof val === 'boolean') {
          const toggle = document.createElement('div');
          toggle.className = 'toggle-switch' + (val ? ' on' : '');
          toggle.addEventListener('click', () => {
            toggle.classList.toggle('on');
            beautifyOpts[lang][key] = toggle.classList.contains('on');
          });
          row.appendChild(toggle);
        } else if (typeof val === 'number') {
          const input = document.createElement('input');
          input.type = 'number'; input.className = 'num-input';
          input.value = val; input.min = '0'; input.max = '20';
          input.addEventListener('change', () => beautifyOpts[lang][key] = parseInt(input.value) || 0);
          row.appendChild(input);
        } else {
          const input = document.createElement('input');
          input.type = 'text'; input.className = 'str-input';
          input.value = val;
          input.addEventListener('change', () => beautifyOpts[lang][key] = input.value);
          row.appendChild(input);
        }
        container.appendChild(row);
      });
    },

    buildShortcutsTable() {
      const tbody = document.getElementById('shortcuts-table');
      KEYBOARD_SHORTCUTS.forEach(([key, desc]) => {
        const row = tbody.insertRow();
        row.innerHTML = `<td style="padding:4px 8px;border-bottom:1px solid var(--border-dim);width:140px;">
          <code style="font-family:var(--font-mono);font-size:11px;color:var(--accent-red);">${key}</code>
        </td><td style="padding:4px 8px;border-bottom:1px solid var(--border-dim);color:var(--text-normal);font-size:12px;">${desc}</td>`;
      });
    },

    setMenuCheck(selector, checked) {
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.toggle('checked', checked);
    },

    applyUITheme(theme) {
      uiTheme = theme;
      document.documentElement.setAttribute('data-theme', theme === 'dark' ? '' : theme);
      state.set('uiTheme', theme);
    }
  };

  const Menus = {
    activeMenu: null,

    init() {
      // Build theme submenu
      const themesSub = document.getElementById('themes-submenu');
      themesSub.innerHTML = '';
      ['default', ...THEMES].forEach(t => {
        const a = document.createElement('div');
        a.className = 'dropdown-item';
        a.textContent = t;
        a.addEventListener('click', () => EditorUtils.setTheme(t));
        themesSub.appendChild(a);
      });

      // Build font submenu
      const fontsSub = document.getElementById('fonts-submenu');
      FONT_FACES.forEach(f => {
        const a = document.createElement('div');
        a.className = 'dropdown-item';
        a.textContent = f;
        a.addEventListener('click', () => EditorUtils.setFont(f));
        fontsSub.appendChild(a);
      });

      // Build font size submenu
      const fszSub = document.getElementById('fontsize-submenu');
      FONT_SIZES.forEach(s => {
        const a = document.createElement('div');
        a.className = 'dropdown-item';
        a.textContent = s + 'px';
        a.addEventListener('click', () => EditorUtils.setFontSize(s));
        fszSub.appendChild(a);
      });

      // Build language submenu
      const langSub = document.getElementById('languages-submenu');
      langSub.innerHTML = '';
      CodeMirror.modeInfo.forEach(info => {
        const a = document.createElement('div');
        a.className = 'dropdown-item';
        a.textContent = info.name;
        a.addEventListener('click', () => {
          EditorUtils.setMode(info.mode, info.mime || (info.mimes && info.mimes[0]));
          Menus.close();
        });
        langSub.appendChild(a);
      });

      // Attach menu item click handlers
      document.querySelectorAll('#mainmenu .menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const menuId = item.dataset.menu;
          const dropdown = item.querySelector('.dropdown-menu');
          if (!dropdown) return;
          if (dropdown.classList.contains('visible')) {
            Menus.close();
          } else {
            Menus.close();
            dropdown.classList.add('visible');
            item.classList.add('open');
            Menus.activeMenu = { item, dropdown };
          }
        });
        // Hover to switch menus when one is already open
        item.addEventListener('mouseenter', () => {
          if (Menus.activeMenu && Menus.activeMenu.item !== item) {
            Menus.close();
            const dropdown = item.querySelector('.dropdown-menu');
            if (dropdown) {
              dropdown.classList.add('visible');
              item.classList.add('open');
              Menus.activeMenu = { item, dropdown };
            }
          }
        });
      });

      // Attach action handlers to dropdown items ONLY (not toolbar buttons)
      document.querySelectorAll('.dropdown-item[data-action]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          Menus.close();
          Actions.run(el.dataset.action, el.dataset.value);
        });
      });

      // Close on outside click
      document.addEventListener('click', () => Menus.close());
    },

    close() {
      if (Menus.activeMenu) {
        Menus.activeMenu.dropdown.classList.remove('visible');
        Menus.activeMenu.item.classList.remove('open');
        Menus.activeMenu = null;
      }
    }
  };

  const Actions = {
    run(action, value) {
      switch (action) {
        /* File */
        case 'new':             FileOps.newFile(); break;
        case 'open':            FileOps.openFile(); break;
        case 'save':            FileOps.saveFile(); break;
        case 'saveAs':          FileOps.saveAsFile(); break;
        case 'download':        FileOps.downloadAs(); break;
        case 'close-file':      FileOps.newFile(); break;
        case 'encoding':
          activeEncoding = value;
          document.querySelectorAll('[data-action="encoding"]').forEach(el => el.classList.toggle('checked', el.dataset.value === value));
          UI.updateStatusBar();
          break;
        case 'eol':
          activeEOL = value;
          document.querySelectorAll('[data-action="eol"]').forEach(el => el.classList.toggle('checked', el.dataset.value === value));
          UI.updateStatusBar();
          break;

        /* Edit */
        case 'undo':       editor.undo(); editor.focus(); break;
        case 'redo':       editor.redo(); editor.focus(); break;
        case 'cut':        Actions._cut(); break;
        case 'copy':       Actions._copy(); break;
        case 'paste':      Actions._paste(); break;
        case 'clear':      if (editor.somethingSelected()) editor.replaceSelection(''); editor.focus(); break;
        case 'selectAll':  editor.execCommand('selectAll'); editor.focus(); break;
        case 'find':       editor.execCommand('find'); break;
        case 'replace':    editor.execCommand('replace'); break;
        case 'jumpToLine': editor.execCommand('jumpToLine'); break;
        case 'format':     EditorUtils.formatCode(); break;

        /* View */
        case 'fullscreen':        Actions._fullscreen(); break;
        case 'toggle-wordwrap':   Actions._toggleOpt('lineWrapping', 'view-wordwrap'); break;
        case 'toggle-activeline': Actions._toggleOpt('styleActiveLine', 'view-activeline'); break;
        case 'toggle-linenumbers':Actions._toggleOpt('lineNumbers', 'view-linenumbers'); break;
        case 'toggle-whitespace': Actions._toggleWhitespace(); break;
        case 'toggle-toolbar':    Actions._togglePanel('toolbar', 'view-toolbar', 'tb-explorer'); break;
        case 'toggle-statusbar':  Actions._togglePanel('statusbar', 'view-statusbar'); break;
        case 'toggle-explorer':   Actions._toggleExplorer(); break;
        case 'ui-theme':          UI.applyUITheme(value); break;

        /* Settings */
        case 'toggle-lint':        Actions._toggleOpt('lint', 'setting-lint'); break;
        case 'toggle-closebrackets':Actions._toggleOpt('autoCloseBrackets', 'setting-closebrackets'); break;
        case 'toggle-closetags':   Actions._toggleOpt('autoCloseTags', 'setting-closetags'); break;
        case 'toggle-tabsasspaces':Actions._toggleTabsAsSpaces(); break;
        case 'toggle-matchbrackets':Actions._toggleOpt('matchBrackets', 'setting-matchbrackets'); break;
        case 'toggle-autocomplete':
          state.set('autocomplete', !state.get('autocomplete'));
          document.getElementById('setting-autocomplete')?.classList.toggle('checked');
          break;
        case 'format-settings':    Actions._toggleFormatSidebar(); break;
        case 'export-settings':    FileOps.exportSettings(); break;
        case 'reset-settings':     FileOps.resetSettings(); break;

        /* Terminal/Debug */
        case 'toggle-terminal':    Actions._togglePanelTab('terminal'); break;
        case 'toggle-debugger':    Actions._togglePanelTab('debugger'); break;

        /* Help */
        case 'show-shortcuts':
          document.getElementById('shortcuts-modal').classList.add('visible'); break;
        case 'about':
          document.getElementById('about-modal').classList.add('visible'); break;
      }
    },

    _cut() {
      if (editor.somethingSelected()) {
        clipboard = editor.getSelection();
        try { document.execCommand('copy'); } catch(_){}
        editor.replaceSelection('');
      }
      editor.focus();
    },
    _copy() {
      if (editor.somethingSelected()) {
        clipboard = editor.getSelection();
        try { navigator.clipboard?.writeText(clipboard).catch(()=>{}); } catch(_){}
      }
      editor.focus();
    },
    _paste() {
      // Try system clipboard first, fall back to internal
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
          editor.replaceSelection(text);
          editor.focus();
        }).catch(() => {
          if (clipboard) { editor.replaceSelection(clipboard); editor.focus(); }
        });
      } else if (clipboard) {
        editor.replaceSelection(clipboard);
        editor.focus();
      }
    },
    async _fullscreen() {
      const el = document.getElementById('app');
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setTimeout(() => editor.refresh(), 200);
    },
    _toggleOpt(option, menuId) {
      const current = editor.getOption(option);
      editor.setOption(option, !current);
      if (menuId) document.getElementById(menuId)?.classList.toggle('checked', !current);
    },
    _toggleWhitespace() {
      const showing = state.get('showWhitespace');
      state.set('showWhitespace', !showing);
      document.getElementById('view-whitespace')?.classList.toggle('checked', !showing);
      // CodeMirror whitespace addon isn't loaded by default; show a note
      if (!showing) Toast.show('Show Whitespace', 'Whitespace display toggled.', 'info', 2000);
    },
    _togglePanel(id, menuId) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('hidden');
      if (menuId) document.getElementById(menuId)?.classList.toggle('checked', !el.classList.contains('hidden'));
      editor.refresh();
    },
    _toggleExplorer() {
      const sidebar = document.getElementById('explorer-sidebar');
      sidebar.classList.toggle('hidden');
      const shown = !sidebar.classList.contains('hidden');
      document.getElementById('view-explorer')?.classList.toggle('checked', shown);
      document.getElementById('tb-explorer')?.classList.toggle('active', shown);
      if (shown) UI.renderExplorer();
      editor.refresh();
    },
    _toggleFormatSidebar() {
      const sidebar = document.getElementById('format-sidebar');
      sidebar.classList.toggle('hidden');
      editor.refresh();
    },
    _toggleTabsAsSpaces() {
      const curr = editor.getOption('indentWithTabs');
      editor.setOption('indentWithTabs', !curr);
      document.getElementById('setting-tabsasspaces')?.classList.toggle('checked', !curr);
    },
    _togglePanelTab(panelName) {
      const region = document.getElementById('panel-region');
      const isVisible = region.classList.contains('visible');
      const activeTab = document.querySelector('#panel-tabs .panel-tab.active')?.dataset?.panel;

      if (!isVisible) {
        region.classList.add('visible');
        Actions._activatePanelTab(panelName);
        document.getElementById(`tb-${panelName}`)?.classList.add('active');
        if (panelName === 'terminal') {
          setTimeout(() => document.getElementById('terminal-input')?.focus(), 50);
        }
      } else if (activeTab === panelName) {
        region.classList.remove('visible');
        document.getElementById(`tb-${panelName}`)?.classList.remove('active');
        editor.focus();
      } else {
        Actions._activatePanelTab(panelName);
        if (panelName === 'terminal') {
          setTimeout(() => document.getElementById('terminal-input')?.focus(), 50);
        }
      }
      editor.refresh();
    },
    _activatePanelTab(panelName) {
      document.querySelectorAll('#panel-tabs .panel-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === panelName));
      document.querySelectorAll('.panel-content').forEach(p => p.classList.toggle('active', p.id === 'panel-' + panelName));
    },
  };

  const Terminal = {
    history: [],
    histIdx: 0,
    currentCmd: '',

    init() {
      const output  = document.getElementById('terminal-output');
      const input   = document.getElementById('terminal-input');
      const promptEl= document.getElementById('terminal-input-prompt');

      const getPrompt = () => {
        const cwd = FS.getCwd();
        const user = state.get('USER') || 'demo';
        const host = location.host || 'localhost';
        return `<span class="t-user">${user}</span><span class="t-at">@</span><span class="t-host">${host}</span>:<span class="t-path">[${cwd}]</span><span class="t-prompt"> $ </span>`;
      };

      const updatePrompt = () => {
        promptEl.innerHTML = getPrompt();
      };

      const append = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
      };

      // Display welcome message
      append(`<span class="t-success">Codeditor Console</span> v${VERSION}-beta`);
      append(`Type <span class="t-cmd">help</span> for available commands.\n`);
      updatePrompt();

      const commands = {
        help(args) {
          if (args[0]) {
            const cmd = commands._list.find(c => c.name === args[0]);
            if (cmd) { append(cmd.help || `No help for ${args[0]}`); }
            else { append(`<span class="t-error">bash: help: no help topics match '${args[0]}'</span>`); }
          } else {
            append(`<span class="t-success">Available commands:</span>`);
            commands._list.forEach(c => append(`  <span class="t-cmd">${c.name.padEnd(10)}</span><span class="t-dim">${c.desc}</span>`));
            append(`\nType <span class="t-cmd">help</span> <span class="t-param">[command]</span> for details.\n`);
          }
        },
        pwd()  { append(`<span class="t-path">${FS.getCwd()}</span>\n`); },
        cd(args) {
          const r = FS.cd(args[0] || '~');
          if (!r.ok) append(`<span class="t-error">bash: ${r.msg}</span>\n`);
          updatePrompt();
        },
        ls(args) {
          const { dirs: ds, files: fs } = FS.ls();
          if (ds.length === 0 && fs.length === 0) { append(`(empty directory)\n`); return; }
          let out = '';
          ds.forEach(d  => out += `<span class="t-dir">${d.name}/</span>  `);
          fs.forEach(f  => out += `<span class="t-file">${f.name}</span>  `);
          append(out + '\n');
        },
        tree() {
          append(`. (${FS.getCwd()})`);
          FS.treeStr().forEach(line => append(line));
          append('');
        },
        mkdir(args) {
          if (!args[0]) { append(`<span class="t-error">bash: mkdir: directory name required</span>\n`); return; }
          const r = FS.mkdir(args[0]);
          if (!r.ok) append(`<span class="t-error">bash: ${r.msg}</span>\n`);
          else { append(''); UI.renderExplorer(); }
        },
        touch(args) {
          if (!args[0]) { append(`<span class="t-error">bash: touch: filename required</span>\n`); return; }
          const content = args.slice(1).join(' ');
          const r = FS.touch(args[0], content);
          if (!r.ok) append(`<span class="t-error">bash: ${r.msg}</span>\n`);
          else { append(''); UI.renderExplorer(); }
        },
        echo(args) {
          if (!args.length) { append('\n'); return; }
          if (args[0].startsWith('$')) {
            const key = args[0].slice(1).toUpperCase();
            const val = state.get(key) || Terminal._envVars[key] || '';
            append(`${val}\n`);
          } else {
            append(args.join(' ') + '\n');
          }
        },
        set(args) {
          if (!args[0]) {
            const allEnv = { ...Terminal._envVars, ...Object.fromEntries(state) };
            Object.entries(allEnv).sort().forEach(([k,v]) => append(`${k}=${v}`));
            append('');
          } else if (args[1]) {
            Terminal._envVars[args[0].toUpperCase()] = args[1];
            state.set(args[0].toUpperCase(), args[1]);
            append(`<span class="t-info">${args[0].toUpperCase()}</span> set to <span class="t-success">${args[1]}</span>\n`);
          } else {
            append(`<span class="t-error">bash: set: Usage: set [key] [value]</span>\n`);
          }
        },
        clear() { output.innerHTML = ''; },
        dir(args) {
          const cwd = FS.getCwd();
          const { dirs: ds, files: fs } = FS.ls();
          const { total, used, free } = FS.diskInfo();
          const fmt = n => n.toLocaleString();
          append(`Directory of <span class="t-dir">${cwd}</span>`);
          if (cwd !== '~') { append('\t\t\t&lt;DIR&gt;\t.'); append('\t\t\t&lt;DIR&gt;\t..'); }
          ds.forEach(d => append(`${d.lastModified}\t&lt;DIR&gt;\t${d.name}`));
          let totalSize = 0;
          fs.forEach(f => { totalSize += f.size; append(`${f.lastModified}\t${fmt(f.size).padStart(8)}\t${f.name}`); });
          append(`\n\t${fmt(fs.length)} file(s)\t${fmt(totalSize)} bytes`);
          append(`\t${fmt(ds.length)} dir(s)\t${fmt(free)} bytes free\n`);
        },
        base64(args) {
          const flag = args[0], str = args.slice(1).join(' ');
          if (!str) { append(`<span class="t-error">bash: base64: Usage: base64 [-en|-de] [string]</span>\n`); return; }
          try {
            if (flag === '-de' || flag === 'de') {
              append(decodeURIComponent(atob(str).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2,'0')).join('')) + '\n');
            } else {
              append(btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x'+p1))) + '\n');
            }
          } catch(e) { append(`<span class="t-error">bash: base64: ${e.message}</span>\n`); }
        },
        version() { append(`<span class="t-info">Codeditor v${VERSION}</span>\n`); },
        df() {
          const { total, used, free } = FS.diskInfo();
          const pct = Math.round(used/total*100);
          append(`Filesystem\tSize\tUsed\tAvail\tUse%`);
          append(`/dev/ssd\t${(total/1024).toFixed(0)}K\t${(used/1024).toFixed(0)}K\t${(free/1024).toFixed(0)}K\t${pct}%\n`);
        },

        _list: [
          { name: 'help',    desc: 'Show help information' },
          { name: 'ls',      desc: 'List directory contents' },
          { name: 'cd',      desc: 'Change directory' },
          { name: 'pwd',     desc: 'Print working directory' },
          { name: 'mkdir',   desc: 'Create directory' },
          { name: 'touch',   desc: 'Create or update file' },
          { name: 'dir',     desc: 'List directory (Windows style)' },
          { name: 'tree',    desc: 'Display directory tree' },
          { name: 'echo',    desc: 'Print arguments' },
          { name: 'set',     desc: 'Set environment variable' },
          { name: 'clear',   desc: 'Clear terminal' },
          { name: 'base64',  desc: 'Encode/decode base64' },
          { name: 'df',      desc: 'Show disk usage' },
          { name: 'version', desc: 'Show version' },
        ]
      };

      Terminal._envVars = {
        HOME: '/home/demo',
        SHELL: '/bin/bash',
        LANG: navigator.language,
        HOSTNAME: location.host || 'localhost',
      };

      const processCommand = (line) => {
        line = line.trim();
        if (!line) { updatePrompt(); return; }

        Terminal.history.push(line);
        Terminal.histIdx = Terminal.history.length;

        // Echo the command
        append(`${getPrompt()}<span class="t-cmd">${line}</span>`);

        const parts = line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        const cmd   = parts[0];
        const args  = parts.slice(1).map(a => a.replace(/^['"]|['"]$/g,''));

        if (commands[cmd]) {
          commands[cmd](args);
        } else {
          append(`<span class="t-error">bash: ${cmd}: command not found</span>\n`);
        }
        updatePrompt();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          processCommand(input.value);
          input.value = '';
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (Terminal.histIdx > 0) input.value = Terminal.history[--Terminal.histIdx] || '';
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (Terminal.histIdx < Terminal.history.length - 1) input.value = Terminal.history[++Terminal.histIdx] || '';
          else { Terminal.histIdx = Terminal.history.length; input.value = ''; }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          // Basic tab completion
          const val = input.value;
          const matches = commands._list.filter(c => c.name.startsWith(val));
          if (matches.length === 1) input.value = matches[0].name + ' ';
          else if (matches.length > 1) append(matches.map(c => c.name).join('  '));
        }
      });

      // Focus terminal input when panel is visible
      document.getElementById('panel-close-btn')?.addEventListener('click', () => {
        document.getElementById('panel-region').classList.remove('visible');
        document.getElementById('tb-terminal').classList.remove('active');
        document.getElementById('tb-debugger').classList.remove('active');
        editor.refresh();
      });
    }
  };

  const PanelResize = {
    init() {
      const handle = document.getElementById('panel-resize');
      const panel  = document.getElementById('panel-region');
      let startY, startH;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startY = e.clientY;
        startH = panel.offsetHeight;
        handle.classList.add('dragging');

        const onMove = (e) => {
          const delta = startY - e.clientY;
          const newH  = Math.min(Math.max(startH + delta, 80), window.innerHeight * 0.6);
          panel.style.height = newH + 'px';
        };
        const onUp = () => {
          handle.classList.remove('dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          editor.refresh();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // Panel tab switching
      document.querySelectorAll('#panel-tabs .panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          Actions._activatePanelTab(tab.dataset.panel);
          if (tab.dataset.panel === 'terminal') {
            document.getElementById('terminal-input').focus();
          }
        });
      });
    }
  };

  const FormatSidebar = {
    init() {
      UI.buildFormatPanel('js',   'fmt-js',   beautifyOpts.js);
      UI.buildFormatPanel('css',  'fmt-css',  beautifyOpts.css);
      UI.buildFormatPanel('html', 'fmt-html', beautifyOpts.html);

      document.querySelectorAll('.format-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.format-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(`fmt-${tab.dataset.lang}`)?.classList.add('active');
        });
      });
    }
  };
  
  const init = () => {
    // Set up initial environment state
    state.set('USER', 'demo');

    // Initialize CodeMirror
    editor = CodeMirror.fromTextArea(document.getElementById('codeditor'), {
      lineNumbers:       true,
      lineWrapping:      false,
      mode:              { name: 'javascript', globalVars: true },
      theme:             'default',
      matchBrackets:     true,
      tabSize:           4,
      indentUnit:        4,
      indentWithTabs:    false,
      gutters:           ['CodeMirror-lint-markers'],
      lint:              true,
      styleActiveLine:   true,
      autoCloseBrackets: true,
      autoCloseTags:     false,
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Ctrl-F': (cm) => { cm.execCommand('find'); },
        'Ctrl-H': (cm) => { cm.execCommand('replace'); },
        'Ctrl-Z': (cm) => { cm.undo(); },
        'Ctrl-Y': (cm) => { cm.redo(); },
        'Ctrl-A': (cm) => { cm.execCommand('selectAll'); },
        'Ctrl-S': (_)  => { FileOps.saveFile(); },
        'Ctrl-N': (_)  => { FileOps.newFile(); },
        'Ctrl-O': (_)  => { FileOps.openFile(); },
        'Alt-G':  (cm) => { cm.execCommand('jumpToLine'); },
        'F11':    (_)  => { Actions.run('fullscreen'); },
        'F1':     (_)  => { Actions.run('about'); },
        'F7':     (_)  => { Actions.run('export-settings'); },
      },
    });

    // Resize editor to fill space
    const resizeEditor = () => {
      const wrap = document.getElementById('editor-wrap');
      if (wrap) editor.setSize(wrap.offsetWidth, wrap.offsetHeight);
    };
    window.addEventListener('resize', resizeEditor);
    setTimeout(resizeEditor, 50);

    // Editor event listeners
    editor.on('change', () => {
      UI.updateModifiedState();
      UI.updateRedoState();
    });
    editor.on('cursorActivity', () => UI.updateStatusBar());

    // Set initial status
    UI.updateStatusBar();
    UI.updateModifiedState();

    // Build sub-systems
    Menus.init();
    Terminal.init();
    PanelResize.init();
    FormatSidebar.init();
    UI.buildShortcutsTable();

    // Toolbar buttons
    document.querySelectorAll('[data-action]').forEach(el => {
      if (el.tagName === 'BUTTON') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          Actions.run(el.dataset.action, el.dataset.value);
        });
      }
    });

    // Win controls
    document.getElementById('btn-fullscreen').addEventListener('click', () => Actions.run('fullscreen'));
    document.getElementById('btn-close').addEventListener('click', async () => {
      const ok = await FileOps.checkDiscard();
      if (ok) Toast.show('Closed', 'Editor session ended.', 'info');
    });
    document.getElementById('btn-minimize').addEventListener('click', () => {
      document.getElementById('app').style.opacity = '0.3';
      document.getElementById('app').style.transform = 'scale(0.98)';
      setTimeout(() => {
        document.getElementById('app').style.opacity = '';
        document.getElementById('app').style.transform = '';
      }, 400);
    });

    // Status bar cursor click → jump to line
    document.getElementById('sb-cursor-link').addEventListener('click', () => editor.execCommand('jumpToLine'));

    // Modal close buttons
    document.getElementById('about-close').addEventListener('click', () =>
      document.getElementById('about-modal').classList.remove('visible'));
    document.getElementById('shortcuts-close').addEventListener('click', () =>
      document.getElementById('shortcuts-modal').classList.remove('visible'));
    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(b => {
      b.addEventListener('click', (e) => {
        if (e.target === b) b.classList.remove('visible');
      });
    });

    // Keyboard: F1, F7, F11, Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F1')  { e.preventDefault(); Actions.run('about'); }
      if (e.key === 'F7')  { e.preventDefault(); Actions.run('export-settings'); }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
        Menus.close();
      }
      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement;
        if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && !active.classList.contains('CodeMirror-code')) {
          Actions.run('show-shortcuts');
        }
      }
    });

    // Build filesystem
    FS.mkdir('home');
    FS.cd('home');
    FS.mkdir('demo');
    FS.cd('..');
    FS.mkdir('var');
    FS.cd('var');
    FS.mkdir('www');
    FS.cd('www');
    FS.mkdir('assets');
    FS.cd('assets');
    FS.mkdir('css');
    FS.cd('css');
    FS.touch('style.css', '/* Sample CSS */\n\nhtml {\n  box-sizing: border-box;\n}\n');
    FS.cd('..');
    FS.mkdir('js');
    FS.cd('js');
    FS.touch('script.js', "// Sample JS\nconsole.log('Hello World!');");
    FS.cd('../..');
    FS.mkdir('components');
    FS.touch('HumanObject.js', editor.getValue());
    FS.cd('../..');
    FS.cd('home');
    FS.cd('demo');

    UI.setFilename('HumanObject.js');
    editor.markClean();
    editor.focus();

    dbg.interface.info(`Codeditor v${VERSION} initialized.`);
    dbg.interface.info(`Filesystem ready. CWD: ${FS.getCwd()}`);
  };

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Warn before unload if modified
  window.addEventListener('beforeunload', (e) => {
    if (editor && !editor.isClean()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Public API (minimal)
  return { version: VERSION, editor: () => editor, fs: FS };

})();
