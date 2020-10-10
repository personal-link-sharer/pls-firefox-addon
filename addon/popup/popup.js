
function compare(a, b) {
  if (a.id < b.id)
    return 1;
  if (a.id > b.id)
    return -1;
  return 0;
}

async function update_settings() {
  const server_settings = await browser.runtime.sendMessage({query: 'get_settings'});

  if (server_settings.server === undefined && server_settings.token === undefined) {
    $('.sidenav').sidenav('open');
  }

  $('#server-url').val(server_settings.server);
  $('#token').val(server_settings.token);
  if (server_settings.sound === undefined)
    $('#sound').prop('checked', true);  
  else
    $('#sound').prop('checked', server_settings.sound);

  M.updateTextFields();
}

function urlify(text) {
  var urlRegex = /((https?:\/\/)?|(s?ftp:\/\/)?)(www\.)?[-a-zA-Z0-9äöü@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9äöü@:%_\+.~#?&//=]*)/g
  return text.replace(urlRegex, (url) => { 
    if (!url.startsWith('http')) 
      return '<a href="https://' + url + '">' + url + '</a>';
    return '<a href="' + url + '">' + url + '</a>';
  });
}

async function init_posts() {
  $('.collection').empty();
  const posts = await browser.runtime.sendMessage({query: 'get_posts'});
  posts.sort(compare);
  posts.forEach(post => {
    if (post.type === 'url') {
      $('.collection').append($('<a class="collection-item" id="' + post.id + '" href="' + post.content + '">' + post.content + '<i class="hidden btn-remove secondary-content material-icons">delete</i></a>'));
    } 
    else if (post.type === 'text') {
      $('.collection').append($('<li class="collection-item" id="' + post.id + '">' + urlify(post.content) + '<i class="hidden btn-copy secondary-content material-icons">content_copy</i><i class="hidden btn-remove secondary-content material-icons">delete</i></li>'));
    }
  });

  $('.collection').on('mouseenter', '.collection-item', function() {
    $(this).find('i.btn-remove').removeClass('hidden');
  });

  $('.collection').on('mouseleave', '.collection-item', function() {
    $(this).find('i.btn-remove').addClass('hidden');
  });

  $('.collection').on('mouseenter', 'li.collection-item', function() {
    $(this).find('i.btn-copy').removeClass('hidden');
  })

  $('.collection').on('mouseleave', 'li.collection-item', function() {
    $(this).find('i.btn-copy').addClass('hidden');
  })

  $('.btn-remove').on('click', function(event) {
    event.preventDefault();
    browser.runtime.sendMessage({query: 'remove_id', id: $(this).parent().attr('id')});
  })

  $('.btn-copy').on('click', function(event) {     
    var $temp = $('<input>');
    $("body").append($temp);
    $temp.val($(this).parent().text().substring(0, $(this).parent().text().lastIndexOf("content_copydelete"))).select();
    document.execCommand("copy");
    $temp.remove();

    M.toast({html: 'Copied &#10003;', classes: 'green'});
  })
}


function show_error_toast() {
  M.toast({html: 'Connection failed &#10007; Check Settings or Server', classes: 'red'});
}

function remove_badge() {
  browser.browserAction.setBadgeText({text: ''});
}

$(document).ready(async function() {
  init_posts();

  $('.sidenav').sidenav();
  $('.tooltipped').tooltip({enterDelay: 400});

  update_settings();

  const connected = await browser.runtime.sendMessage({query: 'is_connected'});
  if (!connected)
    show_error_toast();
  
  remove_badge();
});


$('.btn-save').on('click', async function() {
  await browser.storage.local.set({server: $('#server-url').val(), token: $('#token').val(), sound: $('#sound').is(':checked')});
  await browser.runtime.sendMessage({query: 'new_settings'});
  $('.sidenav').sidenav('close');
})

$('.btn-send').on('click', () => {
  if ($('input.send').val() != '') {
    browser.runtime.sendMessage({query: 'send_text', text: $('input.send').val()});
    $('input.send').val("");
  }
});

$('input.send').keypress((e) => {
  if (e.which == 13) {
    $('.btn-send').click();
  }
});

$('input#server-url').keypress((e) => {
  if (e.which == 13) {
    $('.btn-save').click();
    $('.sidenav').sidenav('close');
  }
});

$('input#token').keypress((e) => {
  if (e.which == 13) {
    $('.btn-save').click();
    $('.sidenav').sidenav('close');
  }
});

browser.runtime.onMessage.addListener(data => {
  if (data.query === 'redraw')
    init_posts();
  if (data.query === 'toast_connected') {
    M.toast({html: 'Connected &#10003;', classes: 'green'});
  }
  if (data.query === 'toast_not_connected') {
    show_error_toast();
  }
  if (data.query === 'remove_badge') {
    remove_badge();
  }
});