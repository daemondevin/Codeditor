/* jshint esversion: 11, laxcomma: true, -W093, -W054, -W030, -W014, -W061 */
var codeditor = {
    version: "1.2.0.1",
    debug: true,
    alert: modal.alert,
    prompt: modal.prompt,
    confirm: modal.confirm,
    editor: null,
    debugger: {
        interface: console.container("interface"),
        user: console.container("user"),
        filesystem: console.container("filesystem"),
        console: console.container("console"),
        file: console.container("file"),
        config: console.container("config"),
        functions: console.container("functions"),
        editor: console.container("editor"),
        document: console.container("document"),
    },
    config: {
        object: {
            codemirror: {
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.60.0",
            },
            beautify: {
                options: {
                    js: {
                        eol: "\\n",
                        e4x: false,
                        indent_size: 2,
                        indent_level: 0,
                        indent_char: " ",
                        eval_code: false,
                        comma_first: true,
                        editorconfig: false,
                        jslint_happy: false,
                        wrap_line_length: 0,
                        templating: ["auto"],
                        space_in_paren: true,
                        brace_style: "collapse",
                        end_with_newline: false,
                        indent_with_tabs: false,
                        unescape_strings: false,
                        preserve_newlines: true,
                        indent_empty_lines: false,
                        max_preserve_newlines: 10,
                        space_in_empty_paren: false,
                        break_chained_methods: true,
                        keep_array_indentation: false,
                        space_before_conditional: true,
                        unindent_chained_methods: false,
                        space_after_anon_function: true,
                        space_after_named_function: false,
                        operator_position: "before-newline",
                    },
                    css: {
                        indent_size: 2,
                        indent_char: " ",
                        indent_with_tabs: false,
                        eol: "\\n",
                        end_with_newline: false,
                        brace_style: "collapse",
                        selector_separator_newline: false,
                        newline_between_rules: true,
                        indent_empty_lines: false,
                    },
                    html: {
                        indent_size: 4,
                        indent_char: " ",
                        indent_with_tabs: false,
                        eol: "\\n",
                        end_with_newline: false,
                        preserve_newlines: true,
                        max_preserve_newlines: 3,
                        indent_inner_html: false,
                        brace_style: "collapse",
                        indent_scripts: "normal",
                        wrap_line_length: 250,
                        wrap_attributes: "auto",
                        wrap_attributes_indent_size: 4,
                        inline: "pre",
                        unformatted: "pre",
                        content_unformatted: "pre",
                        extra_liners: ["head", "body", "/html"],
                        editorconfig: false,
                        unformatted_content_delimiter: "",
                        indent_empty_lines: false,
                        templating: ["auto"],
                    },
                },
            },
        },
        has: function (id) {
            if (prefs.contains(id)) {
                codeditor.debugger.config.debug(
                    "The key " + id + " is in localStorage"
                );
            } else {
                codeditor.debugger.config.warn(
                    "The key " + id + " is not in localStorage"
                );
            }
            return prefs.contains(id);
        },
        read: function (id) {
            return codeditor.config.object[id];
        },
        empty: function (obj) {
            let keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                delete obj[keys[i]];
            }
        },
        reset: function () {
            prefs.empty();
            codeditor.config.empty(codeditor.config.object);
        },
        write: function (id, data) {
            let tmp = {};
            tmp[id] = data;
            codeditor.config.object[id] = data;
            prefs.set(tmp);
        },
        save: function () {
            prefs.set(codeditor.config.object);
        },
    },
    user: {
        settings: prefs,
        name: null,
        oldPath: null,
        online: null,
    },
    filesystem: {
        //instance: new FileSystemBin(),
        ssd: {
            size: 1000000,
            folders: {
                "~": [],
            },
            files: {
                "~": [],
            },
        },
        tree: null,
        cwd: null,
        initialize: function () {
            codeditor.filesystem.mkdir("bin");
            //codeditor.filesystem.cd("bin");
            //codeditor.filesystem.cd("..");
            codeditor.filesystem.mkdir("home");
            codeditor.filesystem.cd("home");
            codeditor.filesystem.mkdir(codeditor.console.fn.get.user());
            codeditor.filesystem.cd("..");
            codeditor.filesystem.mkdir("var");
            codeditor.filesystem.cd("var");
            codeditor.filesystem.mkdir("www");
            codeditor.filesystem.cd("www");
            codeditor.filesystem.mkdir("html");
            codeditor.filesystem.cd("html");
            codeditor.filesystem.mkdir("assets");
            codeditor.filesystem.cd("assets");
            codeditor.filesystem.mkdir("css");
            codeditor.filesystem.cd("css");
            codeditor.filesystem.touch("style.css", "/* Sample CSS file */\n\nhtml {\n\t\n}");
            codeditor.filesystem.cd("..");
            codeditor.filesystem.mkdir("js");
            codeditor.filesystem.cd("js");
            codeditor.filesystem.touch("script.js", "// Sample JS file\n\nalert('Hello World!');");
            codeditor.filesystem.cd("../..");
            codeditor.filesystem.mkdir("components");
            codeditor.filesystem.touch("HumanObject.js", codeditor.editor.getValue());
            codeditor.filesystem.cd("../../..");
            codeditor.filesystem.cd("home");
            codeditor.filesystem.cd(codeditor.console.fn.get.user());

            let date = new Date().toString(),
                lastLogin;
            date = date.substring(0, date.indexOf("GMT") - 1);
            if (codeditor.user.settings.contains("username")) {
                lastLogin = codeditor.user.settings.contains("lastLogin")
                    ? codeditor.user.settings.get("lastLogin")
                    : codeditor.user.settings.set("lastLogin", date) + date;
            } else {
                lastLogin = date;
            }

            codeditor.interface.terminal.append('Welcome to <span class="success">Codeditor\'s Command Shell</span>.' + eol);
            codeditor.interface.terminal.append('A good place to start would be to type <span class="cmd">help</span>.' + eol2);
            codeditor.interface.terminal.append('<span class="info">Last login:</span> ' + lastLogin + eol2);
            //codeditor.user.settings.set('fileTree', codeditor.filesystem.instance.toJSON());
            codeditor.user.settings.set("firstRun", false);
            displayPrompt();
        },
        get: {
            homeDir: function () {
                return codeditor.user.settings.contains("username")
                    ? "home/" + codeditor.user.settings.get("username")
                    : "home/demo";
            },
            cwd: function () {
                return codeditor.filesystem.cwd;
            },
        },
        set: {
            cwd: function (dir) {
                if (dir === "..") {
                    return (codeditor.filesystem.cwd = codeditor.filesystem.cwd
                        .split("/")
                        .slice(0, -1)
                        .join("/"));
                } else if (
                    codeditor.filesystem.ssd.folders[codeditor.filesystem.cwd + "/" + dir] === undefined) {
                    codeditor.debugger.filesystem.error("The specified folder cannot be located!");
                    return codeditor.interface.terminal.append("bash: cd: The folder " + dir + " cannot be located!\n\n");
                }
                return (codeditor.filesystem.cwd = codeditor.filesystem.cwd + "/" + dir);
            },
        },
        check: {
            // function to create new directory 
            dir: function(name) {
                // get current working directory
                let cwd = codeditor.filesystem.get.cwd();
                // check if a name has been specified
                if (name.length === 0) {
                    // append error message to terminal
                    codeditor.interface.terminal.append("bash: Directory name not specified!\n\n");
                    return false;
                }
                // check if name contains special characters (regex)
                if (name.match(/[/:?*<>|§]/g)) {
                    // append error message to terminal
                    codeditor.interface.terminal.append("bash: Special characters are not allowed!\n\n");
                    return false;
                }
                // check if directory already exists in working directory
                if (codeditor.filesystem.ssd.folders[cwd + "/" + name] !== undefined) {
                    // append error message to terminal
                    codeditor.interface.terminal.append('bash: The folder <span class="error">' + name + '</span> already exists at this location!\n\n');
                    return false;
                }
                // return true if no errors
                return true;
            },
            file: function (name) {
              // Get the current working directory in the filesystem
              let cwd = codeditor.filesystem.get.cwd();
              // Check if a file name has been specified
              if (name.length === 0) {
                // If file name not specified, show an error in terminal
                codeditor.interface.terminal.append("bash: File name not specified!\n\n");
                // Return false to indicate invalid input
                return false;
              }
              // Loop through files in the current working directory
              for (const file in codeditor.filesystem.ssd.files[cwd]) {
                // Check if a file with the same name exists
                if (Object.values(codeditor.filesystem.ssd.files[cwd][file].indexOf(name)) !== -1) {
                  // If a file with the same name exists, show an error message in the terminal
                  codeditor.interface.terminal.append('bash: The file <span class="error">' + name + '</span> already exists at this location!\n\n');
                  // Return false to indicate invalid input
                  return false;
                }
              }
              // Return true if no conflicting files were found
              return true;
            },
        },
        // This function creates a file in a virtual file system.
        touch: async function () {
            // Initialize an object to store file information.
            const file = {};
            // Get the current working directory and set an empty message.
            let cwd = codeditor.filesystem.get.cwd(), msg = ``;
            // Store the first argument as the file name.
            file.name = arguments[0];
            // Store the current date as the last modified date.
            file.lastModified = codeditor.fn.get.date();
            // Store the second argument as the file type or find the type based on the file name.
            file.type =
                arguments[1] !== "" || arguments[1] !== undefined
                    ? arguments[1]
                    : codeditor.fn.find.modeByFilename(file.name).mimes !== undefined
                    ? codeditor.fn.find.modeByFilename(file.name).mimes[0]
                    : codeditor.fn.find.modeByFilename(file.name).mime;
            // Store all arguments after the second argument as the file content.
            let content = Array.prototype.slice.call(arguments, 2);
            file.content = content.join(" ");
            // If there are files in the current working directory, check if the file already exists.
            if (codeditor.filesystem.ssd.files[cwd].length !== 0) {
                for (const buffer in codeditor.filesystem.ssd.files[cwd]) {
                    if (codeditor.filesystem.ssd.files[cwd][buffer].name === file.name) {
                        // If the file already exists, return an error message.
                        msg += `bash: touch: The file <span class="error">`
                        msg += `${file.name}</span> already exists at this location!\n\n`;
                        codeditor.interface.terminal.append(msg);
                        return;
                    }
                }
            } else {
                // If there are no files in the current working directory, add the new file.
                if (file.content !== 0) {
                    // If there is content, calculate the size of the file and add it to the file system.
                    file.size = new Blob([file.content]).size;
                    codeditor.filesystem.ssd.files[cwd].push(file);
                    codeditor.filesystem.ssd.size -= file.size;
                    // Sort the files by name in ascending order.
                    codeditor.filesystem.ssd.files[cwd].sort(function (b, c) {
                        return b.name.toUpperCase() > c.name.toUpperCase() ? 1 : -1;
                    });
                } else {
                    // If there is no content, set the size of the file to be the size of the Blob created from its content
                    file.size = new Blob([file.content]).size;
                    // Add the file to the list of files stored in the current working directory (cwd) of the code editor's file system
                    codeditor.filesystem.ssd.files[cwd].push(file);
                    // Sort the files by name in ascending order.
                    codeditor.filesystem.ssd.files[cwd].sort(function (b, c) {
                        return b.name.toUpperCase() > c.name.toUpperCase() ? 1 : -1;
                    });
                }
            }
        },
        cd: function (dir) {
            // Get the current working directory
            let cwd = codeditor.filesystem.get.cwd();
            // Set the previous working directory 
            const oldpwd = (codeditor.console.env.OLDPWD = cwd);
            // Check if cwd is root 
            if (dir.length === 0 || dir === "." || (dir === ".." && cwd === "~")) {
                return;
            }
            if (dir === "~") {
                codeditor.filesystem.cwd = "~/home/" + codeditor.console.fn.get.user();
                return codeditor.filesystem.get.cwd();
            }
            if (dir === "/") {
                codeditor.filesystem.cwd = "~";
                return codeditor.filesystem.get.cwd();
            }
            if (dir === "-") {
                codeditor.filesystem.cwd = "~" + oldpwd;
                return codeditor.filesystem.get.cwd();
            }
            if (dir.indexOf("/") !== -1) {
                let parts = dir.split("/");
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i] === "..") {
                        codeditor.filesystem.cwd = codeditor.filesystem.cwd
                            .split("/")
                            .slice(0, -1)
                            .join("/");
                    } else if (
                        codeditor.filesystem.ssd.folders[cwd + "/" + parts.join("/")] === undefined
                    ) {
                        codeditor.debugger.filesystem.error("bash: cd: The destination directory doesn't exist!");
                    } else {
                        codeditor.filesystem.cwd = cwd + "/" + parts.join("/");
                        return codeditor.filesystem.get.cwd();
                    }
                }
            } else if (dir === "..") {
                codeditor.filesystem.cwd = codeditor.filesystem.cwd
                    .split("/")
                    .slice(0, -1)
                    .join("/");
            } else {
                return (codeditor.filesystem.cwd = cwd + "/" + dir);
            }
        },
        mkdir: async function (name) {
            let cwd = codeditor.filesystem.get.cwd(),
                i,
                parts;
            folder = {};
            if (name.indexOf("/") !== -1) {
                parts = name.split("/");
                for (i = 0; i < parts.length; i++) {
                    if (
                        codeditor.filesystem.ssd.folders[
                            cwd + "/" + parts[i]
                        ] !== undefined
                    ) {
                        codeditor.interface.terminal.append(
                            "bash: mkdir: The directory " +
                                parts[i] +
                                " already exists at this location!\n\n"
                        );
                        return;
                    } else {
                        folder.name = part[i];
                        folder.lastModified = codeditor.fn.get.date();
                        codeditor.filesystem.ssd.folders[cwd].push(folder);
                        codeditor.filesystem.ssd.folders[cwd].sort(function (
                            b,
                            c
                        ) {
                            return b.name.toUpperCase() > c.name.toUpperCase()
                                ? 1
                                : -1;
                        });
                        codeditor.filesystem.ssd.folders[cwd + "/" + parts[i]] =
                            [];
                        codeditor.filesystem.ssd.files[cwd + "/" + parts[i]] =
                            [];
                    }
                }
            } else if (
                codeditor.filesystem.ssd.folders[cwd + "/" + name] !== undefined
            ) {
                codeditor.interface.terminal.append(
                    "bash: mkdir: The directory " +
                        name +
                        " already exists at this location!\n\n"
                );
                return;
            } else {
                folder.name = name;
                folder.lastModified = codeditor.fn.get.date();
                codeditor.filesystem.ssd.folders[cwd].push(folder);
                codeditor.filesystem.ssd.folders[cwd].sort(function (b, c) {
                    return b.name.toUpperCase() > c.name.toUpperCase() ? 1 : -1;
                });
                codeditor.filesystem.ssd.folders[cwd + "/" + name] = [];
                codeditor.filesystem.ssd.files[cwd + "/" + name] = [];
            }
        },
    },
    console: {
        env: {},
        fn: {
            get: {
                user: function () {
                    return codeditor.user.name === null
                        ? "demo"
                        : codeditor.user.name;
                },
            },
            set: {
                user: function (name) {
                    codeditor.user.name = name;
                    codeditor.user.settings.set("username", name);
                },
                spaces: function (v, l, i) {
                    return new Array(v - l).join(" ") + i;
                },
            },
            padLeft: function (num, len) {
                return num.toString().padStart(len, " ");
            },
            numberFormat: function (v, d) {
                return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, d);
            },
        },
        commands: [
            {
                name: "cd",
                func: cd,
                help: emsp2 + 'cd:\tcd [<span class="parameter">dir</span>]&NewLine;\tChange the working directory.\n\n\tChange the current working directory to <span class="parameter">dir</span>.  The default <span class="parameter">dir</span> is the value of\n\tthe <span class="info">$HOME</span> environment variable.\n\n',
            },
            {
                name: "pwd",
                func: pwd,
                help: emsp2 + "pwd:\tpwd&NewLine;\tPrint the working directory.\n\n\tPrints the current working directory.\n\n",
            },
            {
                name: "ls",
                func: ls,
                help: '&emsp;&emsp;ls:\tls [<span class="parameter">options</span>]&NewLine;\tList directory contents.\n\n\tList all files and folders in the current working directory.\n\tWith no options, <span class="cmd">ls</span> lists the files contained in the current\n\tdirectory, sorting them seperatly alphabetically.\n\n\tOptions:\n\t&emsp;-f\tlist only files\n\t&emsp;-d\tlist only directories\n\n',
            },
            {
                name: "tree",
                func: tree,
                help: '&emsp;&emsp;tree:\ttree [path] [<span class="parameter">options</span>]&NewLine;\tGraphically displays a directory structure.\n\n\tWhen you use the <span class="cmd">tree</span> command each directory name is displayed along\n\twith the names of any subdirectories within it. The structure displayed\n\tby <span class="cmd">tree</span> depends upon which parameters you specify.\n\t\n\tIf you don\'t specify a path, <span class="cmd">tree</span> displays the tree structure of the\n\tcurrent working directory.\n\n\tOptions:\n\t&emsp;-f\tDisplay the names of the files in each folder.\n\n',
            },
            {
                name: "set",
                func: set,
                help: emsp2 + 'set:\tset [<span class="parameter">key</span>] [value]&NewLine;\tSet or unset values of shell options.\n\n\tSets or unsets the shell variables by specifying <span class="parameter">key</span> <span class="info">value</span> pairs.\n\tIf <span class="parameter">key</span> is not specified then defaults to displaying the names and\n\tvalues of shell variables.\n\n',
            },
            {
                name: "dir",
                func: dir,
                help: emsp2 + 'dir:\tdir [<span class="parameter">dir</span>]&NewLine;\tDisplays a list of files and subdirectories in a directory.\n\n\tShows the contents of <span class="parameter">dir</span> with file size and last modified attributes.\n\tIf <span class="parameter">dir</span> is not specified then defaults to the current working directory.\n\n',
            },
            {
                name: "base64",
                func: base64,
                help: 'base64:\tbase64 [<span class="parameter">options</span>] [string]&NewLine;\tEncode/decode using the Base64 algorithum.\n\n\tEncode or decode a string using the algoithum as described for\n\tthe Base64 alphabet specified in <a href="https://datatracker.ietf.org/doc/html/rfc4648" target="_blank">RFC 4648, section 4</a>. If no option\n\tis specified then <span class="cmd">base64</span> will default to encoding.\n\n\tOptions:\n\t&emsp;-en\tencode the input string\n\t&emsp;-de\tdecode the input string\n\n',
            },
            {
                name: "mkdir",
                func: mkdir,
                help: 'mkdir:\tmkdir [<span class="parameter">dir</span>]&NewLine;\tCreate a directory.\n\n\tCreates a folder in the current working directory with the\n\tname specified by the parameter <span class="parameter">dir</span>.\n\n',
            },
            {
                name: "cat",
                func: cat,
                help: 'cat:\tcat [<span class="parameter">options</span>] [<span class="parameter">file</span>]&NewLine;\tConcatenate <span class="parameter">file(s)</span>, or standard input, to standard output.\n\n\tCreates an empty file in the current working directory with the\n\tname specified by <span class="parameter">file</span>. If <span class="parameter">content</span> is supplied, then creates a\n\tfile with <span class="parameter">content</span> as its content.\n\n\tOptions:\n\t&emsp;-f\tDisplay the names of the files in each folder.\n\n',
            },
            {
                name: "touch",
                func: touch,
                help: 'touch:\ttouch [<span class="parameter">file</span>] [<span class="parameter">content</span>]&NewLine;\tCreate a file.\n\n\tCreates an empty file in the current working directory with the\n\tname specified by <span class="parameter">file</span>. If <span class="parameter">content</span> is supplied, then creates a\n\tfile with <span class="parameter">content</span> as its content.\n\n',
            },
            {
                name: "clear",
                func: clear,
                help: 'clear:\tclear [<span class="parameter">options</span>]&NewLine;\tClear the terminal.\n\n\tClears the current terminal window. If <span class="parameter">-h</span> is specified\n\tthen also clears the command history.\n\n\tOptions:\n\t&emsp;-h\tclear command history\n\n',
            },
            {
                name: "help",
                func: help,
                help: 'help:\thelp [<span class="cmd">command</span>]&NewLine;\tDisplay a commands help information.\n\n\tShows the help information of the supplied <span class="cmd">command</span>. If no\n\t<span class="cmd">command</span> is specified then shows the help message.\n\n',
            },
            {
                name: "fortune",
                func: fortune,
                help: "fortune:\tfortune&NewLine;\t\tEat a fortune cookie.\n\n\t\tDisplay a random quote or fortune.\n\n",
            },
            {
                name: "echo",
                func: echo,
                help: 'echo:\techo&NewLine;\tWrite arguments to the standard output.\n\n\tDisplay the <span class="parameter">ARGs</span>, separated by a single space character and\n\tfollowed by a newline, on the standard output.\n\n',
            },
        ],
        cmd: {
            cat: function (params) {
                params = Array.prototype.slice.call(arguments);
                if (params[0].match("^(>|>>)$") && params.length < 3) {
                    params[0] = params[0] === ">>" ? "" : params[0];
                    execute.call(this, params);
                    params[0] = ">";
                    execute.call(this, params);
                } else {
                    if (!params[0].match("^(>|>>)$")) {
                        params.unshift("");
                    }
                    execute.call(this, params);
                }

                function execute(params) {
                    let output = cat.apply(this, params);
                    if (output !== undefined) {
                        output = output.split(/\r?\n/g);
                        for (let i = 0; i < output.length; i++) {
                            codeditor.interface.terminal.append(output[i]);
                        }
                    }
                }
            },
            touch: function (file) {
                file = file || {};
                let cwd = codeditor.filesystem.get.cwd();
                if (codeditor.filesystem.ssd.files[cwd].length !== 0) {
                    //for (i = 0; i < codeditor.filesystem.ssd.files[cwd].length; i++) {
                    for (const f in codeditor.filesystem.ssd.files[cwd]) {
                        //f = codeditor.filesystem.ssd.files[cwd][i];
                        if (codeditor.filesystem.ssd.files[cwd][f].name === file.name) {
                            codeditor.interface.terminal.append(`bash: touch: The file <span class="error">${file.name}</span> already exists at this location!\n\n`);
                            return;
                        }
                    }
                } else {
                    if (file.content !== 0 || file.content !== "") {
                        file.size = codeditor.file.size(file.content);
                        codeditor.filesystem.ssd.files[cwd].push([file]);
                        codeditor.filesystem.ssd.size -= file.size;
                        codeditor.filesystem.ssd.files[cwd].sort(function (b, c) {
                            return b.name.toUpperCase() > c.name.toUpperCase() ? 1 : -1;
                        });
                    } else {
                        codeditor.filesystem.ssd.files[cwd].push([file]);
                        codeditor.filesystem.ssd.files[cwd].sort(function (b, c) {
                            return b.name.toUpperCase() > c.name.toUpperCase() ? 1 : -1;
                        });
                    }
                }
            },
            cd: function (dir) {
                let cwd = codeditor.filesystem.get.cwd();
                if (dir.length === 0 || dir === "." || (dir === ".." && cwd === "~")) {
                    return;
                }
                if (dir === "-") {
                    if (!codeditor.console.env.OLDPWD) {
                        codeditor.interface.terminal.append("bash: cd: unable to find the previous directory\n");
                        return;
                    } else {
                        dir = codeditor.console.env.OLDPWD;
                    }
                }
                codeditor.user.oldPath = cwd;
                if (dir === "~") {
                    codeditor.filesystem.cwd = "~/home/" + codeditor.console.fn.get.user();
                    return;
                }
                if (dir === "/") {
                    codeditor.filesystem.cwd = "~";
                    return;
                }
                if (dir.indexOf("/") !== -1) {
                    let parts = dir.split("/");
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i] === "..") {
                            codeditor.filesystem.cwd = cwd.split("/").slice(0, -1).join("/");
                            return;
                        } else if (codeditor.filesystem.ssd.folders[cwd + "/" + parts.join("/")] === undefined) {
                            codeditor.interface.terminal.append("bash: cd: The destination directory doesn't exist!");
                            return;
                        } else {
                            codeditor.filesystem.cwd = cwd + "/" + parts.join("/");
                            return;
                        }
                    }
                } else if (dir === "..") {
                    codeditor.filesystem.cwd = cwd.split("/").slice(0, -1).join("/");
                    return;
                } else {
                    codeditor.filesystem.cwd = cwd + "/" + dir;
                    return;
                }
            },
            mkdir: function (name) {
                let cwd = codeditor.filesystem.get.cwd(),
                    i, parts;
                folder = {};
                if (name.indexOf("/") !== -1) {
                    parts = name.split("/");
                    for (i = 0; i < parts.length; i++) {
                        if (codeditor.filesystem.ssd.folders[cwd + "/" + parts[i]] !== undefined) {
                            codeditor.interface.terminal.append('bash: mkdir: The directory <span class="error">' + parts[i] + '</span> already exists at this location!\n\n');
                            return;
                        } else {
                            folder.name = part[i];
                            folder.lastModified = codeditor.fn.get.date();
                            codeditor.filesystem.ssd.folders[cwd].push(folder);
                            codeditor.filesystem.ssd.folders[cwd].sort(function (b, c) {
                                return b.name.toUpperCase() > c.name.toUpperCase() ? 1 : -1;
                            });
                            codeditor.filesystem.ssd.folders[cwd + "/" + parts[i]] = [];
                            codeditor.filesystem.ssd.files[cwd + "/" + parts[i]] = [];
                        }
                    }
                } else if (codeditor.filesystem.ssd.folders[cwd + "/" + name] !== undefined) {
                    codeditor.interface.terminal.append('bash: mkdir: The directory <span class="error">' + name + '</span> already exists at this location!\n\n');
                    return;
                } else {
                    folder.name = name;
                    folder.lastModified = codeditor.fn.get.date();
                    codeditor.filesystem.ssd.folders[cwd].push(folder);
                    codeditor.filesystem.ssd.folders[cwd].sort(function (b, c) {
                        return b.name.toUpperCase() > c.name.toUpperCase()
                            ? 1
                            : -1;
                    });
                    codeditor.filesystem.ssd.folders[cwd + "/" + name] = [];
                    codeditor.filesystem.ssd.files[cwd + "/" + name] = [];
                }
            },
            dir: function (location) {
                let file,
                    folder,
                    child,
                    i,
                    dID,
                    fID,
                    path,
                    d = 0,
                    f = 0,
                    s = 0,
                    b = 0,
                    t = codeditor.filesystem.ssd.size,
                    cwd = codeditor.filesystem.get.cwd();
                codeditor.filesystem.cwd = location;
                codeditor.interface.terminal.append(
                    `Directory of <span class="dir">${cwd}</span>\n\n`
                );
                for (file in codeditor.filesystem.ssd.files[cwd]) {
                    if (
                        codeditor.console.fn.numberFormat(
                            codeditor.filesystem.ssd.files[cwd][file].size
                        ).length > b
                    ) {
                        b = codeditor.console.fn.numberFormat(
                            codeditor.filesystem.ssd.files[cwd][file].size
                        ).length;
                    }
                    f++;
                }
                if (cwd !== "~") {
                    codeditor.interface.terminal.append(
                        "\t\t\t&lt;DIR&gt;\t.\n"
                    );
                    codeditor.interface.terminal.append(
                        "\t\t\t&lt;DIR&gt;\t..\n"
                    );
                    d = 2;
                }
                for (dID in codeditor.filesystem.ssd.folders[cwd]) {
                    dID = codeditor.filesystem.ssd.folders[cwd][dID];
                    codeditor.interface.terminal.append(
                        dID[0].padEnd(10, " ") +
                            "\t&lt;DIR&gt;\t\t" +
                            dID[1] +
                            "\n"
                    );
                    d++;
                }
                for (fID in codeditor.filesystem.ssd.files[cwd]) {
                    fID = codeditor.filesystem.ssd.files[cwd][fID];
                    codeditor.interface.terminal.append(
                        fID.lastModified +
                            "\t\t" +
                            codeditor.console.fn.numberFormat(fID.size, " ") +
                            "\t" +
                            fID.name +
                            "\n"
                    );
                    s += fID.size;
                }
                d = codeditor.console.fn.numberFormat(d, " ");
                f = codeditor.console.fn.numberFormat(f, " ");
                s = codeditor.console.fn.numberFormat(s, " ");
                t = codeditor.console.fn.numberFormat(t, " ");
                if (s.length >= t.length) {
                    t = new Array(s.length - f.length + 1).join(" ") + t;
                } else {
                    s = new Array(t.length - s.length + 1).join(" ") + s;
                }
                if (f.length >= d.length) {
                    d = new Array(f.length - d.length + 1).join(" ") + d;
                } else {
                    f = new Array(d.length - f.length + 1).join(" ") + f;
                }
                let fC = f + " file(s)\t",
                    dC = d + " dir(s)\t";
                let sB = s + " bytes\n",
                    tB = t + " bytes free\n";
                codeditor.interface.terminal.append(
                    "\t" + fC + codeditor.console.fn.padLeft(sB, 8)
                );
                codeditor.interface.terminal.append(
                    "\t" + dC + codeditor.console.fn.padLeft(tB, 6) + "\n"
                );
            },
            set: function (key, value) {
                if (key == undefined) {
                    Object.keys(codeditor.console.env)
                        .sort()
                        .forEach(function (name, i) {
                            codeditor.interface.terminal.append(
                                name + "=" + codeditor.console.env[name] + "\n"
                            );
                        });
                    codeditor.interface.terminal.append("\n");
                } else {
                    if (value == undefined) {
                        return codeditor.interface.terminal.append(
                            "bash: set: Usage: set [key] [value]" + eol2
                        );
                    }
                    if (key.toLowerCase() === "user") {
                        key = key.toUpperCase();
                        codeditor.console.env[key] = value;
                        return codeditor.console.fn.set.user(value);
                    } else {
                        key = key.toUpperCase();
                        codeditor.console.env[key] = value;
                    }
                    codeditor.interface.terminal.append(
                        '<span class="info">' +
                            key +
                            '</span> has been set to <span class="success">' +
                            value +
                            "</span>" +
                            eol
                    );
                }
            },
        },
    },
    file: {
        handler: handler,
        name: null,
        type: null,
        ext: null,
        new: null,
        open: async function (file) {
            if (await codeditor.file.discard()) {
                codeditor.editor.execCommand("save");
            }
            try {
                file =
                    typeof file === "object"
                        ? file
                        : codeditor.filesystem.resolve_path(file);
                codeditor.filesystem.instance.currentDirectory = file;
                codeditor.fn.set.filename(file.key);
                file.ext = codeditor.fn.get.fileExtension(file.key);
                file.mode = codeditor.fn.find.modeByExtension(file.ext);
                file.mime = codeditor.fn.find.mimeByMode(file.mode);
                //codeditor.fn.set.docContent(codeditor.editor, file.contents);
                let doc = new CodeMirror.Doc(file.content, file.mode);
                codeditor.editor.swapDoc(doc);
                codeditor.interface.lang.text(file.mode);
                await codeditor.fn.set.mode(file.mode, file.mime);
                codeditor.interface.mime.text(file.mime);
                codeditor.interface.filename.text(file.key);
                codeditor.editor.focus();
            } catch (e) {
                const msg = `An error occurred reading ${file.key}`;
                codeditor.debugger.file.error(msg + e.name + e.message);
                await codeditor.alert(
                    msg + "<br /><br />Error Thrown: <br />" + e.message,
                    "ATTN: " + e.name
                );
            }
        },
        save: null,
        size: function (blob) {
            return new Blob([blob]).size;
        },
        modified: function () {
            return !codeditor.editor.isClean();
        },
        discard: async function () {
            if (await codeditor.file.modified()) {
                codeditor.debugger.file.info(
                    "Current file has been modified. Asking to save document."
                );
                return await codeditor.confirm(
                    "This file has been modified. Would you like to save your changes?",
                    "Save Changes?"
                );
            }
            return false;
        },
        /* "save": async function() {
            codeditor.debugger.filesystem.info("Save file function initiated.");
            if (codeditor.filesystem.type === "native") {
                codeditor.fn.debug("log", "Saving file to local filesystem.");
                let type = codeditor.file.type;
                const data = codeditor.fn.get.docContent(codeditor.editor);
                const opts = codeditor.fn.get.filetypes();
                codeditor.file.handler.fileSave((new Blob([data],{
                    fileName: codeditor.file.name,
                    extensions: [codeditor.file.ext],
                })), opts);
            } else if (codeditor.filesystem.type === "localstorage") {
                codeditor.debugger.filesystem.log("Saving file to localstorage.");
                if (codeditor.filesystem.check.file(codeditor.file.name)) {
                    codeditor.filesystem.touch(codeditor.file.name, codeditor.fn.get.docContent(codeditor.editor));
                } else {
                    let result = await codeditor.confirm('A file with the name ' + codeditor.file.name + ' already exists at this location.\n\nWould you like to overwrite the existing file?', 'Overwrite Existing File?');
                }
                
                //codeditor.config.write(codeditor.interface.filename.text(), codeditor.fn.get.docContent(editor));
            } else {
                await codeditor.alert("Invalid filesystem specified!", "No Filesystem");
            }
        },*/
    },
    fn: {
        deferred: function () {
            let d = {};
            let promise = new Promise(function (resolve, reject) {
                d.resolve = resolve;
                d.reject = reject;
            });
            d.promise = promise;
            return Object.assign(d, promise);
        },
        debug: function (m, c) {
            if (codeditor.verbosity === 5) {
                console[m](c);
            } else if (codeditor.verbosity === 4) {
                switch (m) {
                    case "debug":
                        break;
                    default:
                        console[m](c);
                }
            } else if (codeditor.verbosity === 3) {
                switch (m) {
                    case "debug":
                    case "info":
                        break;
                    default:
                        console[m](c);
                }
            } else if (codeditor.verbosity === 2) {
                switch (m) {
                    case "debug":
                    case "info":
                    case "log":
                        break;
                    default:
                        console[m](c);
                }
            } else if (codeditor.verbosity === 1) {
                switch (m) {
                    case "debug":
                    case "info":
                    case "log":
                    case "warn":
                        break;
                    default:
                        console[m](c);
                }
            }
        },
        init: {
            statusbar: function () {
                let status = [
                    "lines",
                    "words",
                    "cursor",
                    "mode",
                    "mime",
                    "changes",
                ];
                const container = document.createElement("statusbar");
                container.className = "statusbar";
                container.id = "statusbar";
                const bar = document.createElement("div");
                bar.className =
                    "ui inverted mini very relaxed horizontal divided list";
                let pos,
                    mode,
                    mime,
                    cm = codeditor.editor;
                status.forEach((name) => {
                    let el = document.createElement("div");
                    el.className = name + " item";
                    if (name === "words") {
                        el.innerHTML = "words: 0";
                        cm.on("update", function () {
                            el.innerHTML =
                                "words: " +
                                codeditor.fn.text.wordCount(
                                    codeditor.fn.get.docContent(cm)
                                );
                        });
                    } else if (name === "lines") {
                        el.innerHTML = "lines: 0";
                        cm.on("update", function () {
                            el.innerHTML =
                                "lines: " + codeditor.fn.get.lineCount(cm);
                        });
                    } else if (name === "cursor") {
                        el.id = "cursor";
                        el.innerHTML = `<a onclick="codeditor.editor.execCommand('jumpToLine');">1:0</a>`;
                        cm.on("cursorActivity", function () {
                            pos = cm.getCursor();
                            el.innerHTML =
                                `<a onclick="codeditor.editor.execCommand('jumpToLine');">` +
                                (pos.line + 1) +
                                `:` +
                                pos.ch +
                                `</a>`;
                        });
                    } else if (name === "mode") {
                        el.id = "lang";
                        if (typeof cm.getOption("mode") == "object") {
                            mode = cm.getOption("mode").name;
                        } else {
                            mode = cm.getOption("mode");
                        }
                        el.innerHTML = mode;
                        cm.on("optionChange", () => {
                            if (!codeditor.config.has("mode")) {
                                codeditor.config.write("mode", mode);
                            }
                            el.innerHTML = mode;
                        });
                    } else if (name === "mime") {
                        el.id = "mime";
                        if (typeof cm.getOption("mode") == "object") {
                            mode = cm.getOption("mode").name;
                        } else {
                            mode = cm.getOption("mode");
                        }
                        el.innerHTML = codeditor.fn.find.mimeByMode(mode);
                        cm.on("optionChange", () => {
                            if (!codeditor.config.has("mime")) {
                                codeditor.config.write(
                                    "mime",
                                    codeditor.fn.find.mimeByMode(mode)
                                );
                            }
                            el.innerHTML = codeditor.fn.find.mimeByMode(mode);
                        });
                    } else if (name === "changes") {
                        el.innerHTML = "No Unsaved Changes";
                        cm.on("change", () => {
                            if (codeditor.file.modified()) {
                                el.innerHTML = "Unsaved Changes";
                            } else {
                                el.innerHTML = "No Unsaved Changes";
                            }
                        });
                    }
                    bar.appendChild(el);
                });
                container.appendChild(bar);
                cm.addPanel(container, {
                    position: "bottom",
                    stable: true,
                });
                return bar;
            },
        },
        handle: {
            tabKey: function (cm) {
                // Tab key handling is done as follows:
                // 1. If the selection is before any text and the indentation is to the left of
                //    the proper indentation then indent it to the proper place. Otherwise,
                //    add another tab. In either case, move the insertion point to the
                //    beginning of the text.
                // 2. If the selection is multi-line, indent all the lines.
                // 3. If the selection is after the first non-space character, and is an
                //    insertion point, insert a tab character or the appropriate number
                //    of spaces to pad to the nearest tab boundary.
                let from = cm.getCursor(true),
                    to = cm.getCursor(false),
                    line = cm.getLine(from.line),
                    indentAuto = false,
                    insertTab = false;
                if (from.line === to.line) {
                    if (line.search(/\S/) > to.ch || to.ch === 0) {
                        indentAuto = true;
                    }
                }
                if (indentAuto) {
                    const currentLength = line.length;
                    CodeMirror.commands.indentAuto(cm);
                    // If the amount of whitespace didn't change, insert another tab
                    if (cm.getLine(from.line).length === currentLength) {
                        insertTab = true;
                        to.ch = 0;
                    }
                } else if (cm.somethingSelected() && from.line !== to.line) {
                    CodeMirror.commands.indentMore(cm);
                } else {
                    insertTab = true;
                }
                if (insertTab) {
                    if (cm.getOption("indentWithTabs")) {
                        CodeMirror.commands.insertTab(cm);
                    } else {
                        var i,
                            ins = "",
                            numSpaces = cm.getOption("indentUnit");
                        numSpaces -= from.ch % numSpaces;
                        for (i = 0; i < numSpaces; i++) {
                            ins += " ";
                        }
                        cm.replaceSelection(ins, "end");
                    }
                }
            },
            /**
             * @private
             * Handle left arrow, right arrow, backspace and delete keys when soft tabs are used.
             * @param {!CodeMirror} cm CodeMirror instance
             * @param {number} direction Direction of movement: 1 for forward, -1 for backward
             * @param {function} functionName name of the CodeMirror function to call
             * @return {boolean} true if key was handled
             */
            softTabNavigation: function (cm, direction, functionName) {
                let handled = false;
                if (!cm.getOption("indentWithTabs")) {
                    let indentUnit = cm.getOption("indentUnit"),
                        cursor = cm.getCursor(),
                        jump = cursor.ch % indentUnit,
                        line = cm.getLine(cursor.line);
                    if (direction === 1) {
                        jump = indentUnit - jump;

                        if (cursor.ch + jump > line.length) {
                            // Jump would go beyond current line
                            return false;
                        }

                        if (line.substr(cursor.ch, jump).search(/\S/) === -1) {
                            cm[functionName](jump, "char");
                            handled = true;
                        }
                    } else {
                        // Quick exit if we are at the beginning of the line
                        if (cursor.ch === 0) {
                            return false;
                        }
                        // If we are on the tab boundary, jump by the full amount,
                        // but not beyond the start of the line.
                        if (jump === 0) {
                            jump = indentUnit;
                        }
                        // Search backwards to the first non-space character
                        const offset = line
                            .substr(cursor.ch - jump, jump)
                            .search(/\s*$/g);

                        if (offset !== -1) {
                            // Adjust to jump to first non-space character
                            jump -= offset;
                        }
                        if (jump > 0) {
                            cm[functionName](-jump, "char");
                            handled = true;
                        }
                    }
                }
                return handled;
            },
            keyEvents: function (jqEvent, editor, event) {
                codeditor.fn.check.electricChars(jqEvent, editor, event);
            },
        },
        check: {
            /**
             * Helper functions to check options.
             * @param {number} options BOUNDARY_CHECK_NORMAL or BOUNDARY_IGNORE_TOP
             */
            topBoundary: function (options) {
                return options !== BOUNDARY_IGNORE_TOP;
            },
            bottomBoundary: function (options) {
                return true;
            },
            /**
             * Checks if the user just typed a closing brace/bracket/paren, and considers automatically
             * back-indenting it if so.
             */
            electricChars: function (jqEvent, editor, event) {
                var cm = editor;
                if (event.type === "keypress") {
                    var keyStr = String.fromCharCode(
                        event.which || event.keyCode
                    );
                    if (/[\]\{\}\)]/.test(keyStr)) {
                        // If all text before the cursor is whitespace, auto-indent it
                        var cursor = cm.getCursor();
                        var lineStr = cm.getLine(cursor.line);
                        var nonWS = lineStr.search(/\S/);

                        if (nonWS === -1 || nonWS >= cursor.ch) {
                            // Need to do the auto-indent on a timeout to ensure
                            // the keypress is handled before auto-indenting.
                            // This is the same timeout value used by the
                            // electricChars feature in CodeMirror.
                            window.setTimeout(function () {
                                cm.indentLine(cursor.line);
                            }, 75);
                        }
                    }
                }
            },
        },
        add: {
            script: function (src, classList) {
                let d = codeditor.fn.deferred();
                const ref = window.document.getElementsByTagName("script")[0];
                const script = window.document.createElement("script");
                script.src = src;
                script.classList = classList.toString();
                script.async = true;
                ref.parentNode.insertBefore(script, ref);
                script.onload = function () {
                    d.resolve();
                };
                return d.promise;
            },
            css: function () {},
            stylesheet: function (url, classList, id = "") {
                let d = codeditor.fn.deferred();
                const style = window.document.createElement("link");
                style.setAttribute("href", url);
                style.setAttribute("rel", "stylesheet");
                style.setAttribute("type", "text/css");
                style.classList = classList.toString();
                if (id) {
                    style.setAttribute("id", id);
                }
                document.head.appendChild(style);
                style.onload = function () {
                    d.resolve();
                };
                return d.promise;
            },
        },
        get: {
            date: function () {
                const d = new Date();
                let s = ("0" + d.getDate()).slice(-2) + ".";
                s += ("0" + (d.getMonth() + 1)).slice(-2) + ".";
                s += d.getFullYear() + "  ";
                s += ("0" + d.getHours()).slice(-2) + ":";
                return s + ("0" + d.getMinutes()).slice(-2);
            },
            fileExtension: function (filename) {
                const type = filename.match(/\.(\w+)$/);
                return type ? type[1] : "";
            },
            wrapperElement: function (el) {
                return el.display.wrapper;
            },
            docContent: function (cm) {
                return cm.getDoc().getValue();
            },
            lineCount: function (cm) {
                return cm.lineCount();
            },
            wordCount: function (data) {
                let pattern =
                    /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
                let m = data.match(pattern);
                let count = 0;
                if (m === null) return count;
                for (let i = 0; i < m.length; i++) {
                    if (m[i].charCodeAt(0) >= 0x4e00) {
                        count += m[i].length;
                    } else {
                        count += 1;
                    }
                }
                return count;
            },
            filetypes: function () {
                let info = {},
                    opts = {
                        extensions: [],
                        mimeTypes: [],
                        description: [],
                    };
                for (let i = 0; i < CodeMirror.modeInfo.length; i++) {
                    info = CodeMirror.modeInfo[i];
                    if (info.ext) {
                        for (let k = 0; k < info.ext.length; k++) {
                            opts.extensions.push(info.ext[k]);
                        }
                    }
                    if (info.mimes) {
                        for (let j = 0; j < info.mimes.length; j++) {
                            opts.mimeTypes.push(info.mimes[j]);
                        }
                    } else {
                        opts.mimeTypes.push(info.mime);
                    }
                    if (info.name) {
                        opts.description.push(info.name + " file");
                    }
                }
                opts.extentions.push(".nsi");
                opts.extentions.push(".nsh");
                codeditor.debugger.file.debug("Allowed filetypes:");
                codeditor.debugger.file.table(opts);
                return opts;
            },
        },
        set: {
            docContent: function (cm, val) {
                cm.getDoc().setValue(val);
                cm.clearHistory();
                cm.markClean();
            },
            filetype: function (type) {
                for (let i = 0; i < CodeMirror.modeInfo.length; i++) {
                    let info = CodeMirror.modeInfo[i];
                    if (info.mime === type) {
                        codeditor.interface.lang.text(info.name);
                    }
                }
                codeditor.interface.mime.text(type);
            },
            filename: function (name) {
                codeditor.file.name = name;
                codeditor.interface.filename.text(name);
            },
            mode: async function (mode, mime) {
                let $modeScripts, $modeScript, modeUrl;
                $modeScripts = $(".mode");
                for ($modeScript of $modeScripts) {
                    $modeScript.remove();
                }
                modeUrl =
                    codeditor.config.object.codemirror.cdn +
                    `/mode/${mode}/${mode}.js`;
                codeditor.debugger.interface.debug(
                    "Adding new mode files for " + mode
                );
                await codeditor.fn.add.script(modeUrl, "mode");
                codeditor.config.write("mode", mode);
                codeditor.debugger.interface.log("Setting new mode to " + mode);
                codeditor.editor.setOption("mode", mode);
                codeditor.fn.set.filetype(mime);
            },
            option: function (setting) {
                let $this = $("#" + setting);
                let $item = $this.html();
                let data = $this.data();
                let conf = $this.attr("id");
                let name = $this.children("span").text;
                if (data === true) {
                    $this.data(setting, false);
                    $this.html(`<span class="text"> ${data}</span>`);
                    codeditor.editor.setOption(setting, false);
                    codeditor.debugger.editor.log(
                        name + " is now set to false"
                    );
                } else {
                    $this.data(setting, true);
                    $this.html(
                        `<i class="check icon"></i><span class="text"> ${data}</span>`
                    );
                    codeditor.editor.setOption(setting, true);
                    codeditor.debugger.editor.log(name + " is now set to true");
                }
            },
            addon: async function (addon, type, setting) {
                let addonName, addonUrl, dataValue, innerHTML;
                if (!codeditor.config.read(addon)) {
                    addonUrl =
                        codeditor.config.object.codemirror.cdn +
                        `/addon/${type}/${addon}.js`;
                    await codeditor.fn.add.script(addonUrl, type + "-" + addon);
                    dataValue = $("." + addon).data(addon);
                    if (typeof dataValue == "boolean") {
                        if (dataValue === true) {
                            $("." + addon).data(addon, false);
                            codeditor.config.write(addon, false);
                            codeditor.editor.setOption(setting, false);
                            codeditor.debugger.editor.log(
                                setting + " is now set to false"
                            );
                        } else {
                            $("." + addon).data(addon, true);
                            codeditor.config.write(addon, true);
                            codeditor.editor.setOption(setting, true);
                            codeditor.debugger.editor.log(
                                setting + " is now set to true"
                            );
                        }
                    } else {
                        codeditor.config.write(addon, dataValue);
                        codeditor.editor.setOption(setting, dataValue);
                    }
                }
            },
            theme: async function (theme) {
                let themeStyles, themeStyle, themeUrl;
                themeStyles = $(".themes");
                for (themeStyle of themeStyles) {
                    themeStyle.remove();
                }
                if (theme !== codeditor.config.read("theme")) {
                    themeUrl =
                        codeditor.config.object.codemirror.cdn +
                        `/theme/${theme}.css`;
                    await codeditor.fn.add.stylesheet(themeUrl, "themes");
                    codeditor.editor.setOption("theme", theme);
                    codeditor.config.write("theme", theme);
                    codeditor.debugger.editor.log(
                        "CodeMirror's theme has been set to " + theme
                    );
                }
            },
            font: async function (font) {
                let $fontFaces, $fontFace, fontLink, fontUrl;
                $fontFaces = $(".font");
                for ($fontFace of $fontFaces) {
                    $fontFace.remove();
                }
                if (font !== codeditor.config.read("fontface")) {
                    fontLink = font.replace(/ /g, "+");
                    fontUrl = `https://fonts.googleapis.com/css2?family=${fontLink}&display=swap`;
                    await codeditor.fn.add.stylesheet(fontUrl, "font");
                    $(".CodeMirror").css("fontFamily", font);
                    codeditor.config.write("fontface", font);
                    codeditor.debugger.interface.log(
                        "Codeditor's fontface has been set to " + font
                    );
                }
            },
            fontsize: function (fontsize) {
                document.querySelector(".CodeMirror-sizer").style.fontSize =
                    fontsize + "px";
                if (fontsize !== codeditor.config.read("fontsize")) {
                    codeditor.config.write("fontsize", fontsize);
                    codeditor.debugger.interface.log(
                        "Codeditor's fontsize has been set to " +
                            fontsize +
                            "px"
                    );
                }
            },
        },
        find: {
            modeByMIME: function (mime) {
                return CodeMirror.findModeByMIME(mime);
            },
            modeByExtension: function (ext) {
                return CodeMirror.findModeByExtension(ext);
            },
            modeByFilename: function (filename) {
                return CodeMirror.findModeByFileName(filename);
            },
            modeByName: function (name) {
                return CodeMirror.findModeByName(name);
            },
            mimeByMode: function (mode) {
                mode = mode.toLowerCase();
                for (let i = 0; i < CodeMirror.modeInfo.length; i++) {
                    let info = CodeMirror.modeInfo[i];
                    if (info.mode === mode) {
                        if (info.mimes) return info.mimes[0];
                        else return info.mime;
                    }
                }
            },
            extByMode: function (mode) {
                mode = mode.toLowerCase();
                for (let i = 0; i < CodeMirror.modeInfo.length; i++) {
                    let info = CodeMirror.modeInfo[i];
                    if (info.mode === mode) {
                        return info.ext[0];
                    }
                }
            },
        },
        fullscreen: async function (id) {
            const container = document.getElementById(id);
            if (!document.fullscreenElement) {
                if (!codeditor.config.read("fullscreen.clientInformed")) {
                    let result = await codeditor.alert(
                        "Be sure to press <em>Esc</em> to exit fullscreen mode.",
                        "Attention!"
                    );
                    if (result === true) {
                        codeditor.config.write(
                            "fullscreen.clientInformed",
                            "true"
                        );
                    }
                }
                await container?.requestFullscreen();
                codeditor.config.write(
                    "fullscreen",
                    !codeditor.config.read("fullscreen")
                );
            } else {
                await document.exitFullscreen();
            }
            codeditor.editor.refresh();
        },
        reset: async function () {
            let result = await codeditor.confirm(
                "Are you sure you want to reset Codeditor? <br /><br /> This will erase all your saved data and cannot be undone.",
                "Reset Codeditor?"
            );
            if (result === true) {
                codeditor.config.reset();
                setTimeout(function () {
                    $("body").toast({
                        title: "Finished",
                        message: "Codeditor has been successfully reset!",
                        class: "success",
                        transition: {
                            showMethod: "zoom",
                            showDuration: 1000,
                            hideMethod: "fade",
                            hideDuration: 1000,
                        },
                        className: {
                            toast: "ui inverted message",
                        },
                    });
                }, 500);
            } else if (result === false) {
                setTimeout(function () {
                    $("body").toast({
                        title: "Reset Canceled!",
                        message: "Codeditor was not reset!",
                        class: "info",
                        transition: {
                            showMethod: "zoom",
                            showDuration: 1000,
                            hideMethod: "fade",
                            hideDuration: 1000,
                        },
                        className: {
                            toast: "ui inverted message",
                        },
                    });
                }, 500);
            }
        },
        beautify: {
            HTML: async function (html) {
                return await html_beautify(
                    html,
                    codeditor.config.object.beautify.options.html
                );
            },
            CSS: async function (css) {
                return await css_beautify(
                    css,
                    codeditor.config.object.fn.beautify.options.css
                );
            },
            JS: async function (js) {
                return await js_beautify(
                    js,
                    codeditor.config.object.beautify.options.js
                );
            },
            JSON: function (json) {
                if (typeof json === "string") {
                    return JSON.stringify(JSON.parse(json), null, 2);
                }
                if (typeof json === "object") {
                    return JSON.stringify(json, null, 2);
                }
                return null;
            },
            XML: function (xml) {
                // Modified From: https://gist.github.com/kurtsson/3f1c8efc0ccd549c9e31
                let formatted = "";
                const reg = /(>)(<)(\/*)/g;
                xml = xml.toString().replace(reg, "$1\r\n$2$3");
                let pad = 0;
                const nodes = xml.split("\r\n");
                for (const n in nodes) {
                    const node = nodes[n];
                    let indent = 0;
                    if (node.match(/.+<\/\w[^>]*>$/)) {
                        indent = 0;
                    } else if (node.match(/^<\/\w/)) {
                        if (pad !== 0) {
                            pad -= 1;
                        }
                    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                        indent = 1;
                    } else {
                        indent = 0;
                    }
                    let padding = "";
                    for (let i = 0; i < pad; i++) {
                        padding += "  ";
                    }
                    formatted += padding + node + "\r\n";
                    pad += indent;
                }
                return formatted
                    .replace(/&/g, "&")
                    .replace(/</g, "<")
                    .replace(/>/g, ">")
                    .replace(/ /g, " ");
            },
        },
        text: {
            compare: {
                process: function (str1, str2) {
                    const str1Split = str1.split(" "),
                        str2Split = str2.split(" ");

                    let newWords = [],
                        newWordsContainer = [],
                        delWords = [],
                        delWordsContainer = [],
                        shiftedWords = [],
                        shiftedWordsContainer = [];

                    for (let i = 0; i < str2Split.length; i++) {
                        let curWord = str2Split[i];
                        let found = false;
                        for (let j = 0; j < str1Split.length; j++) {
                            if (curWord == str1Split[j]) {
                                found = true;
                                break;
                            }
                        }
                        if (found === false) newWords.push(curWord);
                    }

                    for (let i = 0; i < str1Split.length; i++) {
                        let curWord = str1Split[i];
                        let found = false;
                        for (let j = 0; j < str2Split.length; j++) {
                            if (curWord == str2Split[j]) {
                                found = true;
                                break;
                            }
                        }
                        if (found == false) delWords.push(curWord);
                    }

                    for (let i = 0; i < str1Split.length; i++) {
                        let curWord = str1Split[i];
                        for (let j = 0; j < str2Split.length; j++) {
                            if (curWord == str2Split[j]) {
                                if (i != j) {
                                    shiftedWords.push(curWord);
                                    shiftedWordsContainer.push(j);
                                }
                                break;
                            }
                        }
                    }

                    for (let i = 0; i < newWords.length; i++) {
                        for (let j = 0; j < str2Split.length; j++) {
                            if (newWords[i] == str2Split[j]) {
                                newWordsContainer.push(j);
                                break;
                            }
                        }
                    }

                    for (let i = 0; i < delWords.length; i++) {
                        for (let j = 0; j < str1Split.length; j++) {
                            if (delWords[i] == str1Split[j]) {
                                delWordsContainer.push(j);
                                break;
                            }
                        }
                    }

                    let differance = {};
                    differance.newWords = newWords;
                    differance.delWords = delWords;
                    differance.shiftedWords = shiftedWords;
                    differance.shiftedWordsCatalogs = shiftedWordsContainer;
                    differance.newWordsCatalogs = newWordsContainer;
                    differance.delWordsCatalogs = delWordsContainer;
                    return differance;
                },
                construct: function (str1, str2) {
                    const differance = codeditor.fn.text.compare.process(
                        input1,
                        input2
                    );

                    let input2Split = input2.split(" "),
                        outputHTML = "";
                    words = [];

                    for (let i = 0; i < input2Split.length; i++) {
                        let word = {};
                        word.value = "";
                        word.html = "";
                        word.newWord = false;
                        word.delWord = false;
                        word.shifted = false;

                        let curWord = input2Split[i];
                        word.value = curWord;
                        if (differance.newWords.includes(curWord)) {
                            word.html = `<span class="new"><ins>${curWord}</ins></span>`;
                            word.newWord = true;
                        } else if (differance.shiftedWords.includes(curWord)) {
                            word.html = `<span class="shifted">${curWord}</span>`;
                            word.shifted = true;
                        } else {
                            word.html = `${curWord}`;
                        }
                        words.push(word);
                    }

                    for (
                        let i = 0;
                        i < differance.delWordsCatalogs.length;
                        i++
                    ) {
                        let word = {};
                        word.value = differance.delWords[i];
                        word.html = `<span class="del"><del>${differance.delWords[i]}</del></span>`;
                        word.delWord = true;
                        words.splice(differance.delWordsCatalogs[i], 0, word);
                    }

                    words.map((item) => {
                        outputHTML += item.html + " ";
                    });
                    outputElement.innerHTML =
                        `LEGEND: Normal | <span class="new"><ins>New</ins></span> | <span class="shifted">Shifted</span> | <span class="del"><del>Deleted</del></span>\n\n` +
                        outputHTML;

                    $(".ui.textdiff.modal")
                        .modal({
                            blurring: false,
                            closable: true,
                            transition: "vertical flip",
                        })
                        .modal("show");
                },
            },
            copy: function (cm, cut = false) {
                if (cm.doc.somethingSelected()) {
                    let selection = cm.doc.getSelection();
                    codeditor.config.write("copied", selection);
                    if (cut) {
                        cm.doc.replaceSelection("");
                    }
                    let cursor = cm.getCursor();
                    cm.focus();
                    setTimeout(() => {
                        cursor.ch += selection.length;
                        cm.setCursor(cursor);
                    }, 0);
                }
            },
            insert: function (data, cm) {
                const doc = cm.getDoc();
                const cursor = doc.getCursor();
                let line = doc.getLine(cursor.line);
                let pos = {
                    line: cursor.line,
                };
                if (line.length === 0) {
                    doc.replaceRange(data, pos);
                } else {
                    doc.replaceRange("\n" + data, pos);
                }
            },
            paste: function (input, cm) {
                let selection = cm.getSelection();
                if (selection.length > 0) {
                    cm.replaceSelection(input);
                } else {
                    const doc = cm.getDoc();
                    const cursor = cm.getCursor();
                    let pos = {
                        line: cursor.line,
                        ch: cursor.ch,
                    };
                    doc.replaceRange(input, pos);
                    cm.focus();
                    setTimeout(() => {
                        cursor.ch += input.length;
                        cm.setCursor(cursor);
                    }, 0);
                }
            },
            clear: function (cm) {
                if (cm.doc.somethingSelected()) {
                    let selection = cm.doc.getSelection();
                    cm.doc.replaceSelection("");
                    let cursor = cm.getCursor();
                    cm.focus();
                    setTimeout(() => {
                        cm.setCursor(cursor);
                    }, 0);
                }
            },
            wordCount: (data) => {
                let pattern =
                    /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
                let m = data.match(pattern);
                let count = 0;
                if (m === null) return count;
                for (let i = 0; i < m.length; i++) {
                    if (m[i].charCodeAt(0) >= 0x4e00) {
                        count += m[i].length;
                    } else {
                        count += 1;
                    }
                }
                return count;
            },
            format: async (cm) => {
                let mode, code, formatted;
                if (typeof cm.getOption("mode") == "object") {
                    mode = cm.getOption("mode").name;
                } else {
                    mode = cm.getOption("mode");
                }
                code = codeditor.fn.get.docContent();
                switch (mode) {
                    case "htmlmixed":
                    case "html":
                        formatted = await codeditor.fn.beautify.HTML(code);
                        break;
                    case "xml":
                        formatted = codeditor.fn.beautify.XML(code);
                        break;
                    case "json":
                        formatted = codeditor.fn.beautify.JSON(code);
                        break;
                    case "javascript":
                        formatted = await codeditor.fn.beautify.JS(code);
                        break;
                    case "css":
                        formatted = await codeditor.fn.beautify.CSS(code);
                        break;
                    default:
                }
                codeditor.fn.set.docContent(cm, formatted);
                cm.setCursor(cm.getDoc().lineCount(), 0);
            },
        },
    },
};

codeditor.console.env = {
    HOME: "/home/" + codeditor.console.fn.get.user(),
    PWD: codeditor.filesystem.cwd,
    OLDPWD: null,
    USER: codeditor.user.name === null ? "demo" : codeditor.user.name,
    HOSTNAME: location.protocol === "filesystem:" ? "localhost" : location.host,
    LANG: navigator.language,
    SHELL: "/bin/bash",
};

codeditor.interface = {
    lang: $("#lang"),
    mode: $("#mode"),
    mime: $("#mime"),
    code: $("#codeditor")[0],
    cursor: $("#cursor"),
    codemirror: $(".CodeMirror"),
    filename: $("#filename"),
    terminal: $("#console .terminal"),
    console: $("#debug .debugger"),
    shortcut: $(".Codeditor-shortcut"),
    menu: {
        all: $("#file, #edit, #view, #settings, #help"),
        file: $("#file"),
        edit: $("#edit"),
        view: $("#view"),
        settings: $("#settings"),
        help: $("help"),
    },
    toolbar: $("#toolbar"),
    statusbar: $("#statusbar"),
};

codeditor.debugger.interface.info("Browser Code Editor v." + codeditor.version);

function getCodeMirrorExts() {
    let codeExts = [];
    for (let i = 0, info; i < CodeMirror.modeInfo.length; i++) {
        info = CodeMirror.modeInfo[i];
        if (info.ext) {
            codeExts = codeExts.concat(info.ext);
        }
    }
    return codeExts;
}

codeditor.file.new = async function () {
    codeditor.debugger.file.log("New file requested.");
    let result = await codeditor.file.discard();
    if (result) {
        await codeditor.editor.execCommand("save");
    }
    let doc = new CodeMirror.Doc("");
    codeditor.editor.swapDoc(doc);
    codeditor.fn.set.filename("untitled.txt");
    codeditor.fn.set.filetype("text/plain");
    codeditor.fn.set.mode("text", "text/plain");
    codeditor.editor.focus();
    setTimeout(() => {
        codeditor.editor.setCursor({
            line: 0,
            ch: 0,
        });
    }, 0);
    let cursor = $("<a />")
        .attr("onclick", `codeditor.editor.execCommand('jumpToLine');`)
        .text("1:0");
    codeditor.interface.cursor.html(cursor);
};

codeditor.file.save = async function () {
    codeditor.debugger.file.info("Save file function initiated.");
    if (codeditor.filesystem.type === "native") {
        let opts = {};
        codeditor.debugger.file.debug("Allowed filetypes:");
        codeditor.debugger.file.debug(JSON.stringify(opts));
        codeditor.debugger.file.log("Saving file...");
        opts.fileName = codeditor.file.name;
        let type = codeditor.file.type;
        const data = codeditor.fn.get.docContent(codeditor.editor);
        codeditor.file.handler.fileSave(
            new Blob([data], {
                type: type,
            }),
            opts
        );
    } else if (codeditor.filesystem.type === "localstorage") {
        let f = null;
        for (let i in codeditor.filesystem.ssd.files[
            codeditor.filesystem.cwd
        ]) {
            if (
                codeditor.filesystem.ssd.files[codeditor.filesystem.cwd][
                    i
                ][1] === a
            ) {
                f = codeditor.filesystem.ssd.files[codeditor.filesystem.cwd][i];
                break;
            }
        }
        codeditor.debugger.filesystem.info("Saving file...");
        const data = codeditor.fn.get.docContent(editor);
        let size = new Blob([data]).size;
        for (var i in codeditor.filesystem.ssd.files[
            codeditor.filesystem.cwd
        ]) {
            if (
                codeditor.filesystem.ssd.files[codeditor.filesystem.cwd][
                    i
                ][1] === f[1]
            ) {
                if (codeditor.filesystem.ssd.size + f[2] < size) {
                    return await codeditor.alert(
                        "There is not enough disk space to save the document!",
                        "Not Enough Disk Space"
                    );
                }
                codeditor.filesystem.ssd.size += f[2];
                codeditor.filesystem.ssd.files[codeditor.filesystem.cwd][i][0] =
                    codeditor.fn.get.date();
                codeditor.filesystem.ssd.files[codeditor.filesystem.cwd][i][2] =
                    size;
                codeditor.filesystem.ssd.files[codeditor.filesystem.cwd][i][3] =
                    codeditor.editor.getValue();
                codeditor.filesystem.ssd.size -= size;
                setTimeout(function () {
                    $("body").toast({
                        title: "Success!",
                        message: "The document was saved successfully!",
                        class: "success",
                        transition: {
                            showMethod: "zoom",
                            showDuration: 1000,
                            hideMethod: "fade",
                            hideDuration: 1000,
                        },
                        className: {
                            toast: "ui inverted message",
                        },
                    });
                }, 500);
                return;
            }
        }
        setTimeout(function () {
            $("body").toast({
                title: "Error!",
                message: "Failed to save the document!",
                class: "error",
                transition: {
                    showMethod: "zoom",
                    showDuration: 1000,
                    hideMethod: "fade",
                    hideDuration: 1000,
                },
                className: {
                    toast: "ui inverted message",
                },
            });
        }, 500);
    } else {
        await codeditor.alert("Invalid filesystem specified!", "No Filesystem");
    }
};

$("[data-file]").on("click", async function () {
    const name = this.getAttribute("data-file"),
        obj = prefs.get(name),
        mode = codeditor.fn.find.modeByFilename(name),
        type = codeditor.fn.find.mimeByMode(mode),
        data = codeditor.config.read(name),
        size = new Blob([data]).size;
    let file = {
        type: type,
        mode: mode,
        name: name,
        size: size,
        data: data,
    };
    if (codeditor.filesystem.type === "localstorage") {
        await codeditor.file.open(file);
    }
});

CodeMirror.commands.open = async function () {
    await codeditor.file.open();
};

CodeMirror.commands.save = async function () {
    await codeditor.file.save();
};

const code = $("#codeditor")[0],
    mainmenu = $("#file, #edit, #view, #settings, #help"),
    toolbar = $("#toolbar"),
    statusbar = $("#statusbar");

codeditor.editor = CodeMirror.fromTextArea(codeditor.interface.code, {
    lineNumbers: true,
    lineWrapping: false,
    mode: {
        name: "javascript",
        globalVars: true,
    },
    theme: "default",
    matchBrackets: true,
    tabSize: 4,
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    styleActiveLine: true,
    allowDropFileTypes: ["text/plain"],
    autoCloseBrackets: true,
    extraKeys: {
        "Ctrl-Space": "autocomplete",
        "Alt-F": "findPersistent",
    },
    search: {
        bottom: false,
    },
});

codeditor.editor.doc.on("change", (cm) => {
    let redoHistory = $("#redo, .redo.item");
    if (cm.historySize().redo >= 1) {
        if (redoHistory.hasClass("disabled")) {
            redoHistory.removeClass("disabled");
        }
    } else if (cm.historySize().redo <= 0) {
        if (!redoHistory.hasClass("disabled")) {
            redoHistory.addClass("disabled");
        }
    }
});

codeditor.editor.on("refresh", (cm) => {
    const boundHeight = document.body.getBoundingClientRect().height,
        boundTop = cm.getWrapperElement().getBoundingClientRect().top;
    cm.getWrapperElement().style.height = boundHeight - boundTop - 26 + "px";
});

const fontfaces = [
    "Anonymous Pro",
    "Courier Prime",
    "Fira Code",
    "Inconsolata",
    "Source Code Pro",
    "Ubuntu Mono",
];

const fontsizes = ["8", "9", "10", "11", "12", "14"];

const themes = [
    "3024-Day",
    "3024-Night",
    "ABCDEF",
    "Ambiance-Mobile",
    "Ambiance",
    "Base16-Dark",
    "Base16-Light",
    "Bespin",
    "Blackboard",
    "Cobalt",
    "Colorforth",
    "Dracula",
    "Duotone-Dark",
    "Duotone-Light",
    "Eclipse",
    "Elegant",
    "Erlang-Dark",
    "Gruvbox-Dark",
    "Hopscotch",
    "ICEcoder",
    "Isotope",
    "Lesser-Dark",
    "Liquibyte",
    "Material",
    "Mbo",
    "MDN-Like",
    "Midnight",
    "Monokai",
    "Neat",
    "Neo",
    "Night",
    "Panda-Syntax",
    "Paraiso-Dark",
    "Paraiso-Light",
    "Pastel-on-Dark",
    "Railscasts",
    "Rubyblue",
    "Seti",
    "Solarized",
    "The-Matrix",
    "Tomorrow-Night-Bright",
    "Tomorrow-Night-Eighties",
    "TTCN",
    "Twilight",
    "Vibrant-Ink",
    "XQ-Dark",
    "XQ-Light",
    "Yeti",
    "Zenburn",
];

$("#reset").on("click", () => {
    codeditor.fn.reset();
});
$("#open").on("click", () => {
    //openDocument();
    //codeditor.file.open();
    codeditor.editor.execCommand("open");
});
$("#save").on("click", () => {
    //saveDocument();
    //codeditor.file.save();
    codeditor.editor.execCommand("save");
});
$("#new").on("click", () => {
    //newDocument();
    //codeditor.file.new();
    codeditor.editor.execCommand("new");
});

$(document).on("DOMContentLoaded", () => {
    const $ = jQuery;
    const commands = {
        new: (cm) => {
            //$("#new").click();
            cm.execCommand("new");
            cm.refresh();
        },
        open: (cm) => {
            //$("#open").click();
            cm.execCommand("open");
            cm.refresh();
        },
        save: (cm) => {
            //$("#save").click();
            cm.execCommand("save");
        },
        fullscreen: async (cm) => {
            await fullscreen("Codeditor-Container");
            cm.refresh();
            cm.focus();
        },
        minimize: (cm) => {
            codeditor.interface.window.removeClass("window--maximized");
            codeditor.interface.window.toggleClass("window--minimized");
            cm.refresh();
            cm.focus();
        },
        maximize: (cm) => {
            codeditor.interface.window.removeClass("window--minimized");
            codeditor.interface.window.toggleClass("window--maximized");
            cm.refresh();
            cm.focus();
        },
        close: async (cm) => {
            let result = await codeditor.file.discard();
            if (result) {
                await cm.execCommand("save");
            }
            codeditor.interface.window.addClass("window--destroyed");
            codeditor.interface.window.removeClass(
                "window--maximized window--minimized"
            );
            codeditor.interface.shortcut.removeClass("hidden");
            codeditor.fn.restart();
        },
        find: (cm) => {
            cm.execCommand("find");
            cm.refresh();
        },
        replace: (cm) => {
            cm.execCommand("replace");
            cm.refresh();
        },
        undo: (cm) => {
            cm.undo();
            cm.refresh();
        },
        redo: (cm) => {
            cm.redo();
            cm.refresh();
        },
        cut: (cm) => {
            codeditor.fn.text.copy(cm, true);
            cm.refresh();
        },
        copy: (cm) => {
            codeditor.fn.text.copy(cm);
            cm.refresh();
        },
        paste: (cm) => {
            codeditor.fn.text.paste(codeditor.config.read("copied"), cm);
            cm.refresh();
        },
        clear: function (cm) {
            codeditor.fn.text.clear(cm);
            cm.refresh();
        },
        selectAll: (cm) => {
            cm.execCommand("selectAll");
        },
        format: async (cm) => {
            await codeditor.fn.text.format(cm);
            cm.refresh();
        },
        files: () => {},
        console: () => {},
        debug: () => {},
        formatSettings: () => {},
    };
    //
    let action = new Function(
        "command",
        "cm",
        "commands",
        "commands[command](cm);"
    );
    // jshint ignore:line
    codeditor.editor.refresh();
    let btns = $("[data-command]");
    $.each(btns, function (index, btn) {
        btn.onclick = function () {
            action(
                this.getAttribute("data-command"),
                codeditor.editor,
                commands
            );
        };
    });

    codeditor.interface.shortcut.on("click", () => {
        codeditor.window.removeClass("window--destroyed");
        codeditor.shortcut.addClass("hidden");
        codeditor.editor.focus();
    });

    $.each(fontfaces, function (index, fontface) {
        $("<a />")
            .addClass("item")
            .attr("onclick", `codeditor.fn.set.font('${fontface}')`)
            .text(fontface)
            .appendTo("#fonts");
    });

    $.each(fontsizes, function (index, fontsize) {
        $("<a />")
            .addClass("item")
            .attr("onclick", `codeditor.fn.set.fontsize('${fontsize}')`)
            .text(fontsize)
            .appendTo("#fontsizes");
    });

    $.each(themes, function (index, theme) {
        $("<a />")
            .addClass("item")
            .attr("onclick", `codeditor.fn.set.theme('${theme.toLowerCase()}')`)
            .text(theme)
            .appendTo("#themes");
    });

    $.each(CodeMirror.modeInfo, function (index, info) {
        $("<a />")
            .addClass("language-mode item")
            .attr("data-mode", info.mode)
            .attr("data-mime", info.mime)
            .text(info.name)
            .appendTo("#languages");
    });

    codeditor.fn.init.statusbar();
    const templates = document.getElementsByTagName("template");
    for (let template of templates) {
        let html = template.innerHTML,
            type = template.getAttribute("type"),
            name = template.getAttribute("id"),
            mode = codeditor.fn.find.modeByFilename(name),
            size = new Blob([html]).size,
            temp = {},
            tmp = {
                name: name,
                type: type,
                mode: mode,
                size: size,
                code: html,
            };
        temp[name] = tmp;

        //codeditor.debugger.file.debug(temp);
        codeditor.user.settings.set(temp);
    }

    codeditor.editor.on("change", function () {
        const led = $("#led");
        if (codeditor.file.modified()) {
            codeditor.interface.filename.parent().addClass("primary");
            if (led.hasClass("off")) {
                led.removeClass("off").addClass("on");
            }
        } else if (!codeditor.file.modified()) {
            codeditor.interface.filename.parent().removeClass("primary");
            if (led.hasClass("on")) {
                led.removeClass("on").addClass("off");
            }
        } else {
        }
    });

    codeditor.editor.execCommand("refresh");
    codeditor.editor.execCommand("focus");
    codeditor.debugger.config.debug(
        "Restoring configuration settings if found."
    );
    if (codeditor.user.settings.contains("theme")) {
        codeditor.fn.set.theme(codeditor.user.settings.get("theme"));
    }
    if (codeditor.user.settings.contains("fontface")) {
        codeditor.fn.set.font(codeditor.user.settings.get("fontface"));
    }
    if (codeditor.user.settings.contains("fontsize")) {
        codeditor.fn.set.fontsize(codeditor.user.settings.get("fontsize"));
    }
    if (codeditor.user.settings.get("restart")) {
        codeditor.user.settings.set("restart", false);
        setTimeout(function () {
            $("body").toast({
                title: "Success!",
                message: "Codeditor was restarted successfully!",
                class: "success",
                transition: {
                    showMethod: "zoom",
                    showDuration: 1000,
                    hideMethod: "fade",
                    hideDuration: 1000,
                },
                className: {
                    toast: "ui inverted message",
                },
            });
        }, 500);
    }
    codeditor.editor.refresh();
});

async function fullscreen(el) {
    let id = el === "undefined" ? "Codeditor-Container" : el;
    await codeditor.fn.fullscreen(id);
    codeditor.user.settings.set(
        "fullscreen",
        !codeditor.user.settings.get("fullscreen")
    );
    //editor.setOption("fullScreen", !editor.getOption("fullScreen"));
}

codeditor.editor.setOption("extraKeys", {
    F11: function (cm) {
        codeditor.fn.fullscreen();
        cm.refresh();
        cm.focus();
    },
    Esc: function (cm) {
        if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
        cm.refresh();
        cm.focus();
    },
    "Ctrl-K Ctrl-K": function (cm) {
        cm.execCommand("killLine");
    },
    "Ctrl-S": function (cm) {
        cm.execCommand("save");
    },
    "Ctrl-D": function (cm) {
        cm.execCommand("selectNextOccurrence");
    },
    "Ctrl-F": function (cm) {
        cm.execCommand("find");
        cm.focus();
    },
    "Ctrl-R": function (cm) {
        cm.execCommand("replace");
        cm.focus();
    },
    "Ctrl-Z": function (cm) {
        cm.execCommand("undo");
    },
    "Ctrl-Y": function (cm) {
        cm.execCommand("redo");
    },
    "Ctrl-A": function (cm) {
        cm.execCommand("selectAll");
    },
    "Alt-G": function (cm) {
        cm.execCommand("jumpToLine");
    },
    "Ctrl-O": function (cm) {
        cm.execCommand("open");
    },
    "Ctrl-N": function (cm) {
        cm.execCommand("new");
    },
});

var nonEmpty = false;
function toggleSelProp() {
    nonEmpty = !nonEmpty;
    codeditor.editor.setOption("styleActiveLine", {
        nonEmpty: nonEmpty,
    });
    var toolbarLabel = nonEmpty
        ? '<i class="toggle off icon"></i>'
        : '<i class="toggle on icon"></i>';
    document.getElementById("toggleButton").innerHTML = toolbarLabel;
    var menuLabel = nonEmpty
        ? `<span class="text"> Highlight Current Line</span>`
        : `<i class="check icon"></i><span class="text"> Highlight Current Line</span>`;
    document.getElementById("highlight").innerHTML = menuLabel;
}

codeditor.interface.menu.all.dropdown({
    action: "select",
    transition: "drop",
    onShow: function () {
        $(".ui.sidebar").sidebar("hide");
    },
});

$(".ui.modal.developer")
    .modal({
        blurring: false,
        closable: true,
        transition: "vertical flip",
    })
    .modal("attach events", ".about.developer", "show");

$("#identity .logo").transition("set looping").transition("pulse", "2000ms");

$("#explorer.ui.sidebar")
    .sidebar({
        context: $(".bottom.input"),
    })
    .sidebar("setting", "exclusive", "true")
    .sidebar("attach events", "#toolbar .files.item");

$("#format.ui.sidebar")
    .sidebar({
        context: $(".bottom.input"),
    })
    .sidebar("setting", "exclusive", "true")
    .sidebar("attach events", "#toolbar .format.settings.item");

$("#console.ui.sidebar")
    .sidebar({
        context: $(".bottom.input"),
        onShow: function () {
            $("#console .input").focus();
        },
    })
    .sidebar("setting", "exclusive", "false")
    .sidebar("setting", "closable", "false")
    .sidebar("attach events", "#toolbar .console.item")
    .sidebar("attach events", "#console .close", "hide");

$("#debug.ui.sidebar")
    .sidebar({
        context: $(".bottom.input"),
    })
    .sidebar("setting", "exclusive", "false")
    .sidebar("setting", "closable", "false")
    .sidebar("attach events", "#toolbar .debug.item")
    .sidebar("attach events", "#debug .close", "hide");

let beautifyOptions = {
    js: [
        {
            name: `indent_level`,
            desc: `Initial indentation level`,
            type: `integer`,
            default: 0,
        },
        {
            name: `preserve_newlines`,
            desc: `Preserve line-breaks`,
            type: `boolean`,
            default: true,
        },
        {
            name: `max_preserve_newlines`,
            desc: `Number of line-breaks to be preserved in one chunk`,
            type: `integer`,
            default: 10,
        },
        {
            name: `space_in_paren`,
            desc: `Add spaces as padding within parentheses &mdash; e.g. f( a, b )`,
            type: `boolean`,
            default: false,
        },
        {
            name: `space_in_empty_paren`,
            desc: `Add a single space inside an empty set of parenthesis &mdash; i.e. f( )`,
            type: `boolean`,
            default: false,
        },
        {
            name: `jslint_happy`,
            desc: `Enable jslint-stricter mode`,
            type: `boolean`,
            default: false,
        },
        {
            name: `space_after_anon_function`,
            desc: `Add a space before an anonymous function's parentheses &mdash; i.e. function ()`,
            type: `boolean`,
            default: false,
        },
        {
            name: `space_after_named_function`,
            desc: `Add a space before a named function's parentheses, i.e. function example ()`,
            type: `boolean`,
            default: false,
        },
        {
            name: `brace_style`,
            desc: `[collapse|expand|end-expand|none][preserve-inline]`,
            type: `select`,
            default: `collapse`,
        },
        {
            name: `unindent_chained_methods`,
            desc: `Don't indent chained method calls`,
            type: `boolean`,
            default: false,
        },
        {
            name: `break_chained_methods`,
            desc: `Break chained method calls across subsequent lines`,
            type: `boolean`,
            default: false,
        },
        {
            name: `keep_array_indentation`,
            desc: `Preserve array indentation`,
            type: `boolean`,
            default: false,
        },
        {
            name: `unescape_strings`,
            desc: `Decode printable characters encoded in xNN notation`,
            type: `boolean`,
            default: false,
        },
        {
            name: `wrap_line_length`,
            desc: `Wrap lines that exceed N characters`,
            type: `integer`,
            default: 0,
        },
        {
            name: `e4x`,
            desc: `Pass E4X xml literals through untouched`,
            type: `boolean`,
            default: false,
        },
        {
            name: `comma_first`,
            desc: `Put commas at the beginning of new line instead of end`,
            type: `boolean`,
            default: false,
        },
        {
            name: `operator_position`,
            desc: `Set operator position (before-newline|after-newline|preserve-newline)`,
            type: `select`,
            default: `before-newline`,
        },
        {
            name: `indent_size`,
            desc: `Indentation size`,
            type: `integer`,
            default: 4,
        },
        {
            name: `eval_code`,
            desc: `Evaluate the code`,
            type: `boolean`,
            default: false,
        },
        {
            name: `templating`,
            desc: `List of templating languages (auto,django,erb,handlebars,php,smarty) [\"auto\"] auto = none in JavaScript, all in html`,
            type: `select`,
            default: `["auto"]`,
        },
        {
            name: `end_with_newline`,
            desc: `End output with a newline`,
            type: `boolean`,
            default: false,
        },
        {
            name: `indent_with_tabs`,
            desc: `Indent with tabs, overrides both indent_size and indent_char options`,
            type: `boolean`,
            default: false,
        },
        {
            name: `indent_empty_lines`,
            desc: `Keep indentation on empty lines`,
            type: `boolean`,
            default: false,
        },
        {
            name: `space_before_conditional`,
            desc: `Space before conditional: e.g. if(x) => if (x)`,
            type: `boolean`,
            default: true,
        },
    ],
    css: [
        {
            name: `brace_style`,
            desc: `[collapse|expand]`,
            type: `select`,
            default: `collapse`,
        },
        {
            name: `selector_separator_newline`,
            desc: `Add a newline between multiple selectors.`,
            type: `boolean`,
            default: false,
        },
        {
            name: `newline_between_rules`,
            desc: `Add a newline between CSS rules.`,
            type: `boolean`,
            default: false,
        },
        {
            name: `indent_size`,
            desc: `Indentation size`,
            type: `integer`,
            default: 4,
        },
        {
            name: `indent_with_tabs`,
            desc: `Indent with tabs, overrides both indent_size and indent_char options`,
            type: `boolean`,
            default: false,
        },
        {
            name: `end_with_newline`,
            desc: `End output with a newline`,
            type: `boolean`,
            default: false,
        },
        {
            name: `indent_empty_lines`,
            desc: `Keep indentation on empty lines`,
            type: `boolean`,
            default: false,
        },
    ],
    html: [
        {
            name: `brace_style`,
            desc: `[collapse|expand|end-expand]`,
            type: `select`,
            default: `collapse`,
        },
        {
            name: `indent_inner_html`,
            desc: `Indent body and head sections. Default is false.`,
            type: `boolean`,
            default: false,
        },
        {
            name: `indent_handlebars`,
            desc: `Indent handlebars. Default is false.`,
            type: `boolean`,
            default: false,
        },
        {
            name: `indent_scripts`,
            desc: `[keep|separate|normal]`,
            type: `select`,
            default: `normal`,
        },
        {
            name: `wrap_line_length`,
            desc: `Wrap lines that exceed N characters [0]`,
            type: `string`,
            default: `250`,
        },
        {
            name: `wrap_attributes`,
            desc: `Wrap html tag attributes to new lines [auto|force|force-aligned|force-expand-multiline|aligned-multiple|preserve|preserve-aligned] ["auto"]`,
            type: `select`,
            default: `auto`,
        },
        {
            name: `wrap_attributes_indent_size`,
            desc: `Indent wrapped tags to after N characters`,
            type: `integer`,
            default: 4,
        },
        {
            name: `preserve_newlines`,
            desc: `Preserve existing line-breaks (--no-preserve-newlines disables)`,
            type: `boolean`,
            default: true,
        },
        {
            name: `max_preserve_newlines`,
            desc: `Number of line-breaks to be preserved in one chunk [10]`,
            type: `integer`,
            default: 3,
        },
        {
            name: `unformatted`,
            desc: `List of tags (defaults to inline) that should not be reformatted`,
            type: `string`,
            default: `inline`,
        },
        {
            name: `content_unformatted`,
            desc: `List of tags (defaults to pre) whose content should not be reformatted`,
            type: `string`,
            default: `pre`,
        },
        {
            name: `extra_liners`,
            desc: `List of tags (defaults to [head,body,/html] that should have an extra newline`,
            type: `string`,
            default: `head,body,/html`,
        },
        {
            name: `indent_size`,
            desc: `Indentation size`,
            type: `integer`,
            default: 4,
        },
        {
            name: `indent_with_tabs`,
            desc: `Indent with tabs, overrides both indent_size and indent_char options`,
            type: `boolean`,
            default: false,
        },
        {
            name: `end_with_newline`,
            desc: `End output with a newline`,
            type: `boolean`,
            default: false,
        },
    ],
};

function beautifyOpts(lang) {
    let boolItem, strItem, intItem, template, data, i;
    const tempStrInput = document.getElementById("jsbOptStrInput").innerHTML;
    const tempCheckbox = document.getElementById("jsbOptToggle").innerHTML;
    const tempSpinner = document.getElementById("jsbOptSpinner").innerHTML;
    String.prototype.toTitleCase = function () {
        return this.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    for (i = 0; i < beautifyOptions[lang].length; i++) {
        let option = beautifyOptions[lang][i];
        if (option.type === "boolean") {
            let boolItem = tim(tempCheckbox, {
                opt: lang + `_` + option.name,
                name: option.name.replaceAll("_", " ").toTitleCase(),
                desc: option.desc
                    .replaceAll(/i\.e\./gi, "ɪɛ")
                    .replaceAll(/e\.g\./gi, "ɛɢ"),
                checked: option.default ? "checked " : " ",
            });
            $("#format .ui." + lang + ".boolean.settings").append(boolItem);
            let $toggle = $(".ui.toggle"),
                $label = $toggle.find("label"),
                $input = $label.find("input[type='checkbox']");
            if (option.default) {
                $input.prop("checked", true);
            } else {
                $input.prop("checked", false);
            }
        } else if (option.type === "string") {
            strItem = tim(tempStrInput, {
                opt: lang + `_` + option.name,
                name: option.name.replaceAll("_", " ").toTitleCase(),
                desc: option.desc
                    .replaceAll(/i\.e\./gi, "ɪɛ")
                    .replaceAll(/e\.g\./gi, "ɛɢ"),
                default: option.default,
            });
            $("#format .ui." + lang + ".string.settings").append(strItem);
        } else if (option.type === "integer") {
            intItem = tim(tempSpinner, {
                opt: lang + `_` + option.name,
                name: option.name.replaceAll("_", " ").toTitleCase(),
                desc: option.desc
                    .replaceAll(/i\.e\./gi, "ɪɛ")
                    .replaceAll(/e\.g\./gi, "ɛɢ"),
                default: option.default,
            });
            $("#format .ui." + lang + ".integer.settings").append(intItem);
        } else if (option.type === "select") {
            ("&nbsp;");
        }
    }
}
beautifyOpts("js");
beautifyOpts("html");
beautifyOpts("css");

document.addEventListener("beforeunload", async (e) => {
    let result = await codeditor.file.discard();
    if (result) {
        codeditor.editor.execCommand("save");
    }
});

$(
    "#js_indent_level, #js_indent_size, #css_indent_size, #html_indent_size, #js_wrap_line_length, #js_max_preserve_newlines, #html_wrap_attributes_indent_size, #html_max_preserve_newlines"
).spinner();

function settingsOnChange(id, value) {
    let lang = id.split("_", 1),
        tmp = {},
        opt = id.substring(id.indexOf("_") + 1);
    tmp[lang] = codeditor.config.object.beautify.options[`${lang}`];

    codeditor.debugger.file.info(
        "JS_Beautify | " + lang + "_beautifier: element's id: " + id
    );
    codeditor.debugger.file.info(
        "JS_Beautify | " + lang + "_beautifier: element's value: " + value
    );
    codeditor.debugger.file.info(
        "JS_Beautify | " + lang + "_beautifier: option name: " + opt
    );
    //codeditor.fn.debug("table", "%O, " + tmp[`${lang}`]);
    //console.table(tmp[`${lang}`]);
    /*  */
    tmp[lang][opt] = value;
    codeditor.config.object.beautify.options[lang] = tmp[lang];
    /*  */
    codeditor.config.write(
        beautifyOpts,
        codeditor.config.object.beautify.options
    );
}

$(".ui.spinner").spinner({
    onChange: function () {
        let value = $(this).spinner("get value");
        settingsOnChange($(this).attr("id"), value);
    },
});

$(".ui.toggle").click(function () {
    let $label = $(this).find("label"),
        $input = $label.find("input"),
        input = $input[0];
    if (input.checked) {
        input.checked = false;
        settingsOnChange($(this).attr("id"), false);
    } else {
        input.checked = true;
        settingsOnChange($(this).attr("id"), true);
    }
});

$(".language-mode.item").on("click", function () {
    const mode = this.getAttribute("data-mode");
    const mime = this.getAttribute("data-mime");
    codeditor.debugger.editor.info("Setting Mode to " + mode);
    codeditor.debugger.editor.info("Setting Mime to " + mime);
    codeditor.fn.set.mode(mode, mime);
});

$("#export-settings").on("click", function () {
    let opts = {};
    opts.fileName = "codeditorSettings.json";
    codeditor.file.handler.fileSave(
        new Blob([JSON.stringify(codeditor.config.object, null, 2)], {
            type: "application/json",
        }),
        opts
    );
});

$("#FormatTab .item").tab();
$(".ui.accordion.item").accordion({
    exclusive: false,
    selector: {
        accordion: ".accordion",
        title: ".title",
        trigger: ".title",
        content: ".content",
    },
    onOpen: function () {},
    onClose: function () {},
});

codeditor.user.online = new Date().getTime();

var user = codeditor.user.settings.contains("username")
    ? codeditor.user.settings.get("username")
    : "demo";
var eol = "&NewLine;";
var eol2 = "\n\n";
var emsp = "&emsp;";
var emsp2 = "&emsp;&emsp;";
var copiedText;

var title = $("#console .title");
var terminal = (codeditor.interface.terminal = $("#console .terminal"));
var prompt = "$";
var host = location.protocol === "filesystem:" || "file:" ? "localhost" : location.host;
var path = codeditor.filesystem.get.cwd();

var commandHistory = [];
var historyIndex = 0;

var command = "";

codeditor.filesystem.tree = {
    folders: codeditor.filesystem.ssd.folders,
    files: codeditor.filesystem.ssd.files,
};

//if (!codeditor.user.settings.contains('firstRun')) {
codeditor.filesystem.cwd = "~";
codeditor.filesystem.initialize();
codeditor.filesystem.cd("/");
codeditor.filesystem.cd("bin");
for (let i = 0; i < codeditor.console.commands.length; i++) {
//const cmd = codeditor.console.commands[i];
//for (let { name: n, func: f } of codeditor.console.commands) {
    codeditor.filesystem.touch(codeditor.console.commands[i].name, "application/x-pie-executable", "#!/usr/bin/env node\n\n" + String(codeditor.console.commands[i].func));
//codeditor.console.commands.forEach(function (cmd) {
    //codeditor.filesystem.touch(cmd.name, "application/x-pie-executable", "#!/usr/bin/env node\n\n" + String(cmd.func));
};
codeditor.filesystem.cd("~");
//} else {

//}

$(".terminal").contextmenu(function (e) {
    paste(this);
    e.preventDefault();
});

function set(key, value) {
    if (key === undefined) {
        Object.keys(codeditor.console.env)
            .sort()
            .forEach(function (name, i) {
                codeditor.interface.terminal.append(
                    name + "=" + codeditor.console.env[name] + "\n"
                );
            });
        codeditor.interface.terminal.append("\n");
    } else {
        if (value == undefined) {
            return codeditor.interface.terminal.append(
                "bash: set: Usage: set [key] [value]" + eol2
            );
        }
        if (key.toLowerCase() === "user") {
            codeditor.console.fn.set.user(value);
            codeditor.filesystem.mkdir("home/" + value);
            codeditor.filesystem.cwd = "home/" + value;
        }
        key = key.toUpperCase();
        codeditor.console.env[key] = value;
        codeditor.interface.terminal.append(
            '<span class="info">' +
                key +
                '</span> has been set to <span class="success">' +
                value +
                "</span>\n\n"
        );
        codeditor.interface.terminal.append("\n\n");
    }
}

function cd(path) {
    if (path !== undefined) {
        //codeditor.filesystem.instance.cd(path);
        codeditor.filesystem.cd(dir);
        //codeditor.filesystem.instance.cd(path);
        codeditor.interface.terminal.append(eol);
    } else {
        codeditor.interface.terminal.append("bash: cd: Usage: cd [dir]" + eol2);
    }
}

function cat(params) {
    params = Array.prototype.slice.call(arguments);
    if (params[0].match("^(>|>>)$") && params.length < 3) {
        params[0] = params[0] === ">>" ? "" : params[0];
        execute.call(this, params);
        params[0] = ">";
        execute.call(this, params);
        //this.buffer = 'cat ' + params.join(' ');
        //this.input.attr('data-capture-enter', 'false');
        //this.prompt.addClass('hidden');
    } else {
        if (!params[0].match("^(>|>>)$")) {
            params.unshift("");
        }
        execute.call(this, params);
        //this.buffer = null;
        //this.input.attr('data-capture-enter', 'true');
        //this.prompt.removeClass('hidden');
    }

    function execute(params) {
        let output = codeditor.filesystem.instance.cat.apply(
            codeditor.filesystem.instance,
            params
        );
        if (output !== undefined) {
            codeditor.interface.terminal.append(output + "\n");
            //output = output.split(/\r?\n/g);
            //for (let i = 0; i < output.length; i++) {
            //codeditor.interface.terminal.append(output[i]);
            //}
        }
    }
    codeditor.interface.terminal.append(eol2);
    /*if (path !== undefined) {
        //codeditor.filesystem.instance.cd(path);
        //codeditor.filesystem.cd(dir);
        cwd(codeditor.filesystem.instance.cd(path));
        codeditor.interface.terminal.append(eol);
    } else {
        codeditor.interface.terminal.append("bash: cat: Usage: cat [options] [file]" + eol2);
    }*/
}

function pwd() {
    codeditor.interface.terminal.append(codeditor.filesystem.get.cwd() + eol2);
}

function cwd(dir) {
    codeditor.filesystem.cwd = dir;
}

function touch(...args) {
    if (file !== undefined) {
        codeditor.filesystem.touch(...args);
    } else {
        codeditor.interface.terminal.append(
            "bash: touch: Usage: touch [file] [content]" + eol2
        );
    }
}

function b64UniEnc(str) {
    return btoa(
        encodeURIComponent(str).replace(
            /%([0-9A-F]{2})/g,
            function (match, p1) {
                return String.fromCharCode("0x" + p1);
            }
        )
    );
}

function b64UniDec(str) {
    return decodeURIComponent(
        Array.prototype.map
            .call(atob(str), function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
    );
}

function dir(path) {
    path = path === undefined ? codeditor.filesystem.get.cwd() : path;
    codeditor.console.cmd.dir(path);
}

function base64(s, ...str) {
    if (str.length !== 0) {
        str = str.join(" ");
        if (str.charAt(0) === '"' || str.charAt(0) === "'") {
            str = str.slice(0, 1);
        }
        if (
            str.charAt(str.length - 1) === '"' ||
            str.charAt(str.length - 1) === "'"
        ) {
            str = str.slice(-1);
        }
        switch (s.toLowerCase()) {
            case "de":
                try {
                    return codeditor.interface.terminal.append(
                        b64UniDec(str) + eol
                    );
                } catch (e) {
                    return codeditor.interface.terminal.append(
                        "bash: base64" +
                            e.toString().substr(e.toString().lastIndexOf(":")) +
                            eol
                    );
                }
                break;
            case "en":
            default:
                return codeditor.interface.terminal.append(
                    b64UniEnc(str) + eol
                );
        }
    }
    codeditor.interface.terminal.append(
        "bash: base64: Usage: base64 [options] [string]" + eol2
    );
}

function tree(path, i) {
    if (i == undefined) {
        path = codeditor.filesystem.cwd;
        i = 0;
        codeditor.interface.terminal.append(`Directory path listing${eol}`);
        codeditor.interface.terminal.append(`.${eol}`);
    }
    if (codeditor.filesystem.ssd.folders[path] !== undefined) {
        //for (let x = 0; x < codeditor.filesystem.ssd.folders[path].length; x++) {
        for (const folder in codeditor.filesystem.ssd.folders[path]) {
            let d = codeditor.filesystem.ssd.folders[path][folder].name;
            let s = "|";
            for (let y = 0; y < i; y++) {
                s += "  |";
            }
            codeditor.interface.terminal.append(s + "---" + d + eol);
            tree(path + "/" + d, i + 1);
        }
        //codeditor.interface.terminal.append(eol);
    }
}

function mkdir(name) {
    if (name !== undefined) {
        //codeditor.console.cmd.mkdir(dir, name);
        codeditor.console.cmd.mkdir(name);
    }
    return codeditor.interface.terminal.append("bash: mkdir: Usage: mkdir [dir]" + eol2);
}

function ls(path) {
    path = path === undefined ? codeditor.filesystem.get.cwd() : path;
    if (codeditor.filesystem.ssd.folders[path] !== undefined) {
        var folders = codeditor.filesystem.ssd.folders[path];
        var files = codeditor.filesystem.ssd.files[path];
        var width = 0;
        var entries = folders + files;
        codeditor.filesystem.ssd.folders[path].forEach(function (item) {
            width = Math.max(width, item.key.length);
        });
        width += 5;
        var columns = ~~(this.min_width / 7 / width);
        var line = "";
        for (var i = 0, j = columns; i < entries.length; i++) {
            line += entries[i].key;
            for (var k = 0; k < width - entries[i].key.length; k++) {
                line += "\u00a0";
            }
            if (--j == 0) {
                codeditor.interface.terminal.append(line);
                line = "";
                j = columns;
            }
        }
        codeditor.interface.terminal.append(line + eol2);
    }
}

function clear() {
    codeditor.interface.terminal.text("");
}

function help() {
    if (arguments[0] === undefined) {
        codeditor.interface.terminal.append(
            '<span class="success">Codeditor Console</span>, Bash-like CMD - '
        );
        codeditor.interface.terminal.append(
            'v<span class="prompt">' + codeditor.version + "-beta</span>" + eol
        );
        codeditor.interface.terminal.append(
            'These shell commands are defined internally. Type <span class="cmd">help</span> to see this list.' +
                eol
        );
        codeditor.interface.terminal.append(
            "Some of these commands aren't functional yet." + eol
        );
        codeditor.interface.terminal.append("Available commands: " + eol);
        for (let i = 0; i < codeditor.console.commands.length; i++) {
            codeditor.interface.terminal.append('<span class="cmd" style="padding-left:1em">' + codeditor.console.commands[i].name + "</span> ");
        }
        codeditor.interface.terminal.append(eol2 + 'Type <span class="cmd">help</span> <span class="parameter">command</span> for help with a particular command.' + eol2);
    } else {
        for (let i = 0; i < codeditor.console.commands.length; i++) {
            if (arguments[0] === codeditor.console.commands[i].name) {
                codeditor.interface.terminal.append(codeditor.console.commands[i].help);
            }
        }
        //terminal.append("bash: command not found: " + arguments[0] + eol2);
    }
}

function echo(args) {
    if (args !== undefined) {
        if (args.substring(0, 1) === "$") {
            let str = args.slice(1);
            if (codeditor.console.env.hasOwnProperty(str)) {
                return codeditor.interface.terminal.append(
                    codeditor.console.env[str] + "\n\n"
                );
            } else {
                return codeditor.interface.terminal.append(eol);
            }
        }
        let str = args.join(" ");
        return codeditor.interface.terminal.append(str + "\n\n");
    }
    codeditor.interface.terminal.append("bash: echo: Usage: echo [string]" + eol2);
}

function fortune() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "https://cdn.rawgit.com/bmc/fortunes/master/fortunes", false);
    xhr.send(null);

    if (xhr.status === 200) {
        let fortunes = xhr.responseText.split("%");
        let fortune = fortunes[getRandomInt(0, fortunes.length)].trim();
        codeditor.interface.terminal.append(fortune + "\n\n");
    }
}

function processCommand() {
    let isValid = false;

    let args = command.split(" ");
    let cmd = args[0];
    args.shift();

    for (let i = 0; i < codeditor.console.commands.length; i++) {
        if (cmd === codeditor.console.commands[i].name) {
            codeditor.console.commands[i].func(...args);
            isValid = true;
            break;
        }
    }

    if (!isValid) {
        codeditor.interface.terminal.append("bash: " + command + ": command not found\n\n");
    }

    commandHistory.push(command);
    historyIndex = commandHistory.length;
    if (codeditor.user.settings.contains("username")) {
        codeditor.filesystem.instance.cat(">>", "/home/" + codeditor.user.settings.get("username") + "/.bash_history", command + "\n");
    }
    command = "";
    codeditor.interface.terminal.scrollTop(codeditor.interface.terminal[0].scrollHeight);
}

function displayPrompt() {
    codeditor.interface.terminal.append('<span class="user">' + user + '</span>');
    codeditor.interface.terminal.append('<span class="at">@</span>');
    codeditor.interface.terminal.append('<span class="host">' + host + '</span>: ');
    codeditor.interface.terminal.append('<span class="path">[' + codeditor.filesystem.get.cwd() + ']</span> ');
    codeditor.interface.terminal.append('<span class="prompt">' + prompt + '</span> ');
}

// Delete n number of characters from the end of our output
function erase(n) {
    command = command.slice(0, -n);
    codeditor.interface.terminal.html(
        codeditor.interface.terminal.html().slice(0, -n)
    );
}

function clearCommand() {
    if (command.length > 0) {
        erase(command.length);
    }
}

function appendCommand(str) {
    codeditor.interface.terminal.append(str);
    command += str;
    $(document).scrollTop(10000);
}

async function paste() {
    if (copiedText == null) {
        return;
    } else {
        appendCommand(copiedText);
        //codeditor.interface.terminal.append(copiedText);
    }
}

/*
 /	Keypress doesn't catch special keys,
 /	so we catch the backspace here and
 /	prevent it from navigating to the previous
 /	page. We also handle arrow keys for command history.
*/
$(document).keydown(function (e) {
    e = e || window.event;
    let keyCode = typeof e.which === "number" ? e.which : e.keyCode;

    if (
        keyCode === 8 &&
        e.target.tagName !== "input" &&
        e.target.tagName !== "textarea"
    ) {
        e.preventDefault();
        if (command !== "") {
            erase(1);
        }
    }

    if (keyCode === 38 || keyCode === 40) {
        if (keyCode === 38) {
            historyIndex--;
            if (historyIndex < 0) {
                historyIndex++;
            }
        } else if (keyCode === 40) {
            historyIndex++;
            if (historyIndex > commandHistory.length - 1) {
                historyIndex--;
            }
        }

        var cmd = commandHistory[historyIndex];
        if (cmd !== undefined) {
            clearCommand();
            appendCommand(cmd);
        }
    }
});

$(document).keypress(function (e) {
    e = e || window.event;
    let keyCode = typeof e.which === "number" ? e.which : e.keyCode;

    switch (keyCode) {
        case 13: {
            codeditor.interface.terminal.append(eol);
            processCommand();
            displayPrompt();
            break;
        }
        default: {
            appendCommand(String.fromCharCode(keyCode));
        }
    }
});

/*/ Auto copying text on selection
document.querySelector("pre.terminal").onselectionchange = () => {
    var selection = window.getSelection().getRangeAt(0); //window.getSelection().toString();
    if (selection != "") {
        copiedText = selection;
        document.execCommand("copy");
    }
};*/

$(".terminal").mouseup(function () {
    if (document.getSelection) {
        copiedText = document.getSelection().toString();
        document.execCommand("copy");
    } else {
        if (document.selection.createRange) {
            copiedText = document.selection.createRange();
            document.execCommand("copy");
        }
    }
});

title.text("Codeditor Command Shell");
