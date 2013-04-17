/*
    Copyright (C) 2013  Krishna Srinivas (https://github.com/krishnasrinivas)

    The JavaScript code in this page is free software: you can
    redistribute it and/or modify it under the terms of the GNU
    General Public License (GNU GPL) as published by the Free Software
    Foundation, either version 3 of the License, or (at your option)
    any later version.  The code is distributed WITHOUT ANY WARRANTY;
    without even the implied warranty of MERCHANTABILITY or FITNESS
    FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

    As additional permission under GNU GPL version 3 section 7, you
    may distribute non-source (e.g., minimized or compacted) forms of
    that code without the copy of the GNU GPL normally required by
    section 4, provided you include this license notice and a URL
    through which recipients can access the Corresponding Source.
*/

var channel;
var term;

window.onload = function() {
    document.getElementById("buttonid").onclick = onload_;
    document.getElementById("statusbox").onclick = copytoclipboard;
};

var copytoclipboard = function copytoclipboard() {
    var range = document.createRange();
    range.selectNode(document.getElementById("statusbox"));
    window.getSelection().addRange(range);
    document.execCommand('copy');
    document.getElementById("textid").textContent = "Copied to clip board";
    setTimeout (function () {
	window.getSelection().removeAllRanges();
	document.getElementById("textid").textContent = "";
    }, 2000);
}

window.onresize = function (event) {
    var resizediv = document.getElementById("resizediv");
    resizediv.style.top = (document.body.scrollHeight - resizediv.clientHeight) / 2 + "px";
    resizediv.style.left = (document.body.scrollWidth - resizediv.clientWidth) / 2 + "px";
}

function ts(argv) {
    this.argv_ = argv;
    this.io = null;
    this.pid_ = -1;
    this.sockid = -1;
};

ts.init = function() {
    var terminal = new hterm.Terminal();
    terminal.decorate(document.querySelector('#terminal'));

    window.term_ = terminal;

    setTimeout(function() {
	terminal.setCursorPosition(0, 0);
	terminal.setCursorVisible(true);
	terminal.runCommandClass(ts, document.location.hash.substr(1));
    }, 500);
    return true;
};

ts.prototype.run = function() {
    this.io = this.argv_.io.push();

    this.io.onVTKeystroke = this.sendString_.bind(this);
    this.io.sendString = this.sendString_.bind(this);

    var self = this;
    this.io.onTerminalResize = this.onTerminalResize_.bind(this);

    term = this;
    document.body.style.background="black";
    term_.setHeight(28);
    term_.setWidth(96);
    var resizediv = document.getElementById("resizediv");
    var statusdiv = document.getElementById("statusdiv");
    var terminaldiv = document.getElementById("terminal");

    var x = resizediv.clientWidth - terminaldiv.clientWidth;
    var y = resizediv.clientHeight - (statusdiv.clientHeight + terminaldiv.clientHeight + 8);
    window.resizeBy (-x, -y);

    resizediv.style.width = terminaldiv.clientWidth + "px";
    resizediv.style.height = statusdiv.clientHeight + terminaldiv.clientHeight + 4 + "px";


    resizediv.style.position = "relative";
    resizediv.style.top = (document.body.scrollHeight - resizediv.clientHeight) / 2 + "px";
    resizediv.style.left = (document.body.scrollWidth - resizediv.clientWidth) / 2 + "px";
}

ts.prototype.sendString_ = function(string) {
    channel.send(string);
};


ts.prototype.onTerminalResize_ = function(width, height) {
    console.log("term size changed: "+ width + " " + height);
};

/* ---------------------------------- */


var trans = new paramikojs.transport(null);
var sockid;
var username;
var password;
var server;
var wsocket;

var cycle = function () {
    chrome.socket.read(sockid, function (readinfo) {
	if (readinfo.resultCode) {
            var data = readinfo.data;
            if (!data) {
		return;
	    }
	    var view = new Uint8Array(data);

	    var str = ""
	    for (var x = 0; x < view.length; ++x) {
		str += String.fromCharCode(view[x]);
	    }
            trans.fullBuffer += str;  // read data
            trans.run();
            cycle();
	}
    });
};

var write = function(out) {
    var buf = new ArrayBuffer(out.length);
    var view = new Uint8Array(buf);
    for (var x = 0; x < out.length; ++x) {
	view[x] = out.charCodeAt(x);
    }
    chrome.socket.write(sockid, buf, function() {});
};

var sharecodeprinted;

var input = function() {
    try {
	var stdin = channel.recv(65536);
    } catch (ex) {}
    try {
	var stderr = channel.recv_stderr(65536);
    } catch (ex) {}
    if (stdin && term) {
	term.io.writeUTF8(stdin);
	if (sharecodeprinted) {
	    try {
		wsocket.send(JSON.stringify({"d": stdin}));
	    } catch (ex) {}
	}
    }
    if (stderr && term) {
	term.io.writeUTF8(stderr);
	if (sharecodeprinted) {
	    try {
		wsocket.send(JSON.stringify({"d": stderr}));
	    } catch (ex) {}
	}
    }
}

var auth_success = function() {
    console.log("auth success");
    var on_success = function(chan) {
	chan.get_pty('linux', 96, 28);
	chan.invoke_shell();
	channel = chan;
    };
    trans.open_session(on_success);
};

var sharecode;

var onload_ = function() {
    var statusbox = document.getElementById("statusbox");
    var viewers = document.getElementById("viewers");

    server = document.getElementById('sshserver').value;
    username = document.getElementById('username').value;
    password = document.getElementById('password').value;
    sharecode = document.getElementById('sharecode').value;

    if (!server || !username || !password)
	return;

    if (sharecode) {
        if (!sharecode.match (/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)) {
            document.getElementById('sharecode').value = "Invalid Sharecode";
            return;
        }
    }

    statusbox.textContent = "getting sharecode...";

    chrome.socket.create('tcp', {}, function(c) {
	chrome.socket.connect(c.socketId, server, 22, function(res) {
	    sockid = c.socketId;
	    cycle();
	    trans.writeCallback = write;
	    trans.connect (null, null, username, password, null, auth_success);
	});
    });
    lib.init(ts.init);


    var sshinput = document.getElementById("sshinput");
    var payload;
    if (sshinput)
	sshinput.parentNode.removeChild(sshinput);
     wsocket = new ReconnectingWebSocket("ws://termishare.com", "echo-protocol");
    wsocket.onopen = function () {
	if (sharecode)
            payload = JSON.stringify ({"setsharecode_master":sharecode});
	else
            payload = JSON.stringify ({"getsharecode":1});
	wsocket.send(payload);
    };
    wsocket.onmessage = function(message) {
	var messageobj = JSON.parse(message.data);
	if(messageobj["viewers"]) {
	    viewers.textContent = "Viewers: " + messageobj["viewers"];
	}

	if (!sharecode) {
	    sharecode = messageobj["getsharecode_rsp"];
	    if (!sharecode) {
		console.log ("sharecode not recevied");
		return;
	    }
	}
	if (!sharecodeprinted) {
            statusbox.textContent = "http://termishare.com/"+sharecode;
            sharecodeprinted = 1;
	}

	else if (channel) {
	    if(messageobj["d"])
		channel.send(messageobj["d"]);
	}
    }
}

