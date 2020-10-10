var posts = [];
var last_own_post = "";
var socket;
var server_settings = {};
var connected = false;

function makeSocketWithListeners(server, token, sound) {
  if (socket !== undefined)
    socket.close();

  var new_socket = io.connect(server, {path: "/" + token});
  posts = [];

  new_socket.on('connect', function() { 
    connected = true;
    browser.runtime.sendMessage({query: 'toast_connected'});
    browser.runtime.sendMessage({query: 'redraw'});
    browser.browserAction.setBadgeText({text: ''});
  });

  new_socket.io.on('connect_error', function () {
    if (connected) 
      browser.runtime.sendMessage({query: 'toast_not_connected'});

    connected = false;
    browser.runtime.sendMessage({query: 'redraw'});
    browser.browserAction.setBadgeText({text: '!'});
  });

  new_socket.on('all_posts', function(msg) {
    if (!(Object.keys(msg.data).length === 0 && msg.data.constructor === Object)) {
      posts = msg.data;
    }
  });

  new_socket.on('new_post', function(msg) {
    posts.push(msg);

    browser.runtime.sendMessage({query: 'redraw'});
    
    if (msg.content != last_own_post) {
      browser.browserAction.setBadgeText({text: '!'});
      browser.runtime.sendMessage({query: 'remove_badge'}); // only possible if popup is open right now
      if (sound) {
        var audio = new Audio('ding.wav');
        audio.play();
      }
    }
  });

  new_socket.on('id_removed', function(msg) {
    posts = posts.filter(function(post) {
      return post.id !== msg;
    });

    browser.runtime.sendMessage({query: 'redraw'});
  });

  return new_socket;
}

function onGot(item) {
  if (Object.keys(item).length === 0 && item.constructor === Object) {
    // server not yet set
    console.log("no settings existing");
  }
  else {
    if (item.server !== undefined && item.token !== undefined && item.sound !== undefined) {
      server_settings = item;
      socket = makeSocketWithListeners(item.server, item.token, item.sound);
    }
  }
  
}

function onError(error) {
  console.log("Error: ${error}");
}

let settings = browser.storage.local.get();
settings.then(onGot, onError);

browser.contextMenus.create({
    id: "share-url",
    title: "Share current site",
    contexts: ["all"]
});
  
browser.contextMenus.onClicked.addListener(function(info, tab) {
  switch (info.menuItemId) {
    case "share-url":
      socket.emit('send_post', {
        type: 'url',
        data: tab.url
      });
      last_own_post = tab.url;
      break;
  }
})


browser.runtime.onMessage.addListener(data => {
  if (data.query === 'get_posts')
    return Promise.resolve(posts);
  if (data.query === 'send_text') {
    socket.emit('send_post', {type: 'text', data: data.text});
    last_own_post = data.text;
  }
  if (data.query === 'new_settings') {
    let new_settings = browser.storage.local.get();
    return Promise.resolve(new_settings.then(onGot, onError));
  }
  if (data.query === 'get_settings') {
    return Promise.resolve(server_settings);
  }
  if (data.query === 'is_connected') {
    return Promise.resolve(connected);
  }
  if (data.query === 'remove_id') {
    socket.emit('remove_id', {id: data.id});
  }
});