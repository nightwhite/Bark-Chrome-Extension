var auto_copy_flag = "0"


function global_push(response, tab) {
    chrome.storage.sync.get({
        default_push_content: "clipboard",
        auto_copy: "no"
    }, function(items) {
        console.log(items);
        if (items.auto_copy === "yes") {
            auto_copy_flag = "1"
        } else {
            auto_copy_flag = "0"
        }
        //if default is URL, push URL
        if (items.default_push_content === "URL") {
            console.log(response);
            if (response != null && response.data != '') {
                var selectedText = response.data;
                console.log("send selected text: " + selectedText)
                sendMsg(response.data);
            } else {
                console.log("send url" + tab)
                sendUrl(tab);
            }
        } else if (items.default_push_content === "clipboard") {
            // if default is clipboard, push clipboard data
            sendClipboardData();
        }
    });
}


chrome.browserAction.onClicked.addListener(function (tab) {
	chrome.tabs.sendMessage(tab.id, {
		method: "getSelection"
	}, global_push)
});

//send selected text
function getword(info, tab) {
	console.log("menu " + info.menuItemId + " was clicked.");
	console.log("Word " + info.selectionText + " was clicked.");
	console.log(info);
	if (info.mediaType == "image") {
		sendMsg(info.srcUrl, info.menuItemId, msgType="image");
	} else {
		if (typeof info.selectionText == 'undefined') {
			global_push(null);
		} else {
			sendMsg(info.selectionText, info.menuItemId);
		}
	}
	
}

//send current page url
function sendUrl(tab) {
	chrome.tabs.query({
		'active': true,
		'lastFocusedWindow': true
	}, function (tabs) {
		var currentUrl = tabs[0].url;
		sendMsg(currentUrl);
		console.log(currentUrl);
	});
}

//send clipboard data
function sendClipboardData() {
	sendMsg(getClipboardData());
}

function getClipboardData() {
	var result = '';
	var sandbox = document.getElementById('sandbox');
	sandbox.value = '';
	sandbox.select();
	if (document.execCommand('paste')) {
		result = sandbox.value;
	}
	sandbox.value = '';
	console.log("clipboard conetent: " + result);
	return result;
}


function sendMsg(content, full_server_url = "", msgType = "normal") {
	chrome.storage.sync.get({
		server_urls: []
	}, function (items) {
		if (items.server_urls === '' | items.server_urls.length === 0) {
			alert("please set server_url in options!");
			chrome.tabs.create({
				url: "options.html"
			});
			// chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
		} else {
			if (full_server_url === "") {
				full_server_url = items.server_urls[0].server_url;
			}
			if (full_server_url.startsWith("selection#")) {
				full_server_url = full_server_url.replace(/selection#/g, "")
			}

			console.log(full_server_url);

			var notify_callback = function () {
					var notification = new Notification("Message Sent", {
						body: content,
						icon: "bark_128.png"
					});
				};
			
			if (full_server_url.startsWith("http") || full_server_url.startsWith("https")) {
				// iPhone push
				console.log("1111:"+full_server_url + encodeURIComponent(content) + "?automaticallyCopy=" + auto_copy_flag, notify_callback);
				httpGetAsync(full_server_url  + "%E8%AF%B7%E9%95%BF%E6%8C%89%E6%9C%AC%E9%80%9A%E7%9F%A5%E5%90%8E%E7%82%B9%E5%87%BB%E5%A4%8D%E5%88%B6/Nw%20Bark%20Push?automaticallyCopy=" + auto_copy_flag + "&copy=" + encodeURIComponent(content) + "&icon=https://i.postimg.cc/vmYkmdXL/bark-128.png&level=timeSensitive", notify_callback);
			} else {
				// Android push
				console.log("2222:"+full_server_url, content, notify_callback, msgType);
				pushAndroidMsg(full_server_url, content, notify_callback, msgType);
			}
			

			
		};
	});
}

function pushAndroidMsg(theToken, content, callback, msgType="normal") {
	var fcmServerURL = "https://fcm.googleapis.com/fcm/send"
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
			callback(xmlHttp.responseText);
	}

	xmlHttp.open("POST", fcmServerURL, true);
	//发送合适的请求头信息
	xmlHttp.setRequestHeader("Content-type", "application/json");
	xmlHttp.setRequestHeader("Authorization", "key=AIzaSyAd-JC3NxVeGRHyo5ZZB2BUmhSA7Z_IqHY")

	var sendData = {
		"to": theToken,
		"collapse_key": "type_a",
		"data": {
			"body": content,
			"title": "PushMessage",
			"autoCopy": auto_copy_flag,
			"msgType": msgType
		}
	}
	xmlHttp.send(JSON.stringify(sendData));

}


function httpGetAsync(theUrl, callback) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
			callback(xmlHttp.responseText);
	}
	xmlHttp.open("GET", theUrl, true); // true for asynchronous 
	xmlHttp.send(null);
}

function registerContextMenus() {
	chrome.storage.sync.get({
		server_urls: [],
		default_push_content: "clipboard",
		auto_copy: "no"
	}, function (items) {
		console.log(items);
		if (items.auto_copy === "yes") {
			auto_copy_flag = "1"
		} else {
			auto_copy_flag = "0"
		}
		chrome.contextMenus.removeAll(function() {
			console.log("items" + items[0]);
			for (const it of items.server_urls) {
				chrome.contextMenus.create({
					title: "Push To Device " + it.server_name,
					// contexts: ["selection"],
					onclick: getword,
					id: it.server_url
				});
			}
		});
		chrome.contextMenus.removeAll(function() {
			console.log("items" + items[0]);
			for (const it of items.server_urls) {
				chrome.contextMenus.create({
					title: "Send To Device " + it.server_name,
					contexts: ["selection", "image"],
					onclick: getword,
					id: "selection#" + it.server_url
				});
			}
		});
	});
}

registerContextMenus();

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		console.log(sender.tab ?
			"from a content script:" + sender.tab.url :
			"from the extension");
		if (request.greeting == "hello")
			registerContextMenus();
		sendResponse({
			farewell: "goodbye"
		});
	});