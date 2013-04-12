chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('window.html', {
    width: 800,
    height: 600,
    left: 100,
    top: 100,
    type: 'shell'
  });
});

