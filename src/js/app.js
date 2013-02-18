console.log('app.js');


window.OmniboxView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this);
  },
  events: { },
  onInputEntered: function(text) {
    if (text.indexOf('@@') === 0) {
      chrome.tabs.create({ url: 'https://alpha.app.net/' + text.substring(2) });
      return;
    }
    
    if (text.indexOf('##') === 0) {
      chrome.tabs.create({ url: 'https://alpha.app.net/hashtags/' + text.substring(2) });
      return;
    }
    
    if (text.indexOf('::') === 0) {
      text = text.substring(2);
    }
    var post = new Post();
    post.set({ text: text });
    // TODO: catch errors
    post.save();
  },
  onInputChanged: function(text, suggest) {
    var suggestions = [];
    suggestions.push({ content: '::' + text, description: (256 - text.length) + ' characters remaning' });
    
    if (text.indexOf(' ') > -1 || text.length === 0) {
      suggest(suggestions);
      return;
    }
    if (text.indexOf('#') === 0 || text.indexOf('@') === 0) {
      text = text.substring(1);
    }
    
    suggestions.push({ content: '@@' + text, description: 'View the @<match>' + text + "</match> profile on App.net" });
    suggestions.push({ content: '##' + text, description: 'Search the #<match>' + text + "</match> hashtag on App.net" });
    suggest(suggestions);
  }
});

/**
* Params: image, title, body, url, and timeout;
*/
window.TextNotificationView = Backbone.View.extend({
  initialize: function(options) {
    // TODO: Move to a model?
    _.bindAll(this);
    this.options = options;
    // TODO: move to Notifications. They support tags but not images yet?
    this.notification = webkitNotifications.createNotification(
      this.options.image,
      this.options.title,
      this.options.body
    );
  },
  render: function() {
    var notification = this.notification;
    notification.type = this.options.type;
    if (this.options.url) {
      notification.url = this.options.url;
    }
    notification.onclick = function() {
      if (this.url) {
        chrome.tabs.create({ url: this.url });
      }
      this.close();
      _gaq.push(['_trackEvent', 'Notifications', 'Click', this.type]);
    }
    if (this.options.timeout) {
      setTimeout(function(){
        notification.close();
        _gaq.push(['_trackEvent', 'Notifications', 'Timeout', this.type]);
      }, this.options.timeout);
      
    }
    notification.show();
    _gaq.push(['_trackEvent', 'Notifications', 'Show', this.options.type]);
  }
});

window.Post = Backbone.Model.extend({
  initialize: function() {
    _.bindAll(this);
  },
  url: 'https://alpha-api.app.net/stream/0/posts',
  validate: function(attributes) {
    if (attributes.text.length > 256) {
      return 'text is too long';
    }
  },
  save: function() {
    if (this.get('text') && this.get('text').length < 256) {
      // TODO: for some reason this is not adding the response to the model
      var jqXHR = $.post(this.url, this.attributes)
          .success(this.success)
          .error(this.error);
    } else {
      return false;
    }
  },
  success: function(response, textStatus, jqXHR) {
    var notification = new TextNotificationView({
      title: 'Successfully posted to App.net',
      body: response.text,
      image: response.user.avatar_image.url,
      url: 'https://alpha.app.net/' + response.user.username + '/post/' + response.id,
      timeout: 5 * 1000,
      type: 'PostSuccess'
    });
    notification.render();
  },
  error: function() {
    var notification = new TextNotificationView({
      image: chrome.extension.getURL('/img/angle.png'),
      title: 'Posting to App.net failed',
      body: 'Please try agian. This notification will close in 10 seconds.',
      timeout: 10 * 1000,
      type: 'PostError'
    });
    notification.render();
  }
});

var Polling = Backbone.Collection.extend({
  initialize: function(options) {
    _.bindAll(this);
    _.extend(this, options);
  },
  setInterval: function(frequency) {
    if (frequency && typeof(frequency) === 'string') {
      frequency = parseInt(frequency);
    }
    this.intervalID = window.setInterval(this.update, frequency || config.get(this.configFrequencyName) || config.get(this.configDefaultFrequencyName));
    return this;
  },
  clearInterval: function() {
    window.clearInterval(this.intervalID);
    return this;
  },
  toggleNotifications: function(model, enabled, other) {
    if (enabled) {
      this.setInterval();
    } else {
      this.clearInterval();
    }
  },
  changeFrequency: function(model, frequency, other) {
    this.clearInterval();
    if (frequency) {
      this.setInterval(frequency);
    }
  },
  update: function() {
    if (window.account && window.account.get('accessToken') && config.get(this.configName)) {
      this.fetch({ error: this.error });
    }
    return this;
  },
  error: function(collection, xhr) {
    if (xhr.status === 401) {
      console.log('Invalid access_token');
      var notification = new TextNotificationView({
        image: chrome.extension.getURL('/img/angle.png'),
        title: 'Authentication failed',
        body: 'Click here to sign in to App.net again.',
        url: chrome.extension.getURL('/options.html'),
        type: 'AuthError'
      });
      notification.render();
      window.account.unset('accessToken');
    } else {
      console.log('Unkown error');
      var notification = new TextNotificationView({
        image: chrome.extension.getURL('/img/angle.png'),
        title: 'Unkown error checking for posts',
        body: 'If you get this a lot please ping @abraham',
        url: 'https://alpha.app.net/abraham',
        type: 'UnknownError'
      });
      notification.render();
    }
    return this;
  }
});

var Posts = Polling.extend({
  model: Post,
  renderNotification: function(model, index, array) {
    if (this.notificationType === 'mentions') {
      this.renderMentionNotification(model);
    } else {
      console.log('this.notificationType', this.notificationType);
    }
  },
  renderMentionNotification: function(model) {
    var notification = new TextNotificationView({
      image: model.get('user').avatar_image.url,
      title: 'Mentioned by @' + model.get('user').username + ' on ADN',
      body: model.get('text'),
      url: 'https://alpha.app.net/' + model.get('user').username + '/post/' + model.get('id'),
      type: 'Mention'
    });
    notification.render();
  },
  filterNewPosts: function() {
    var models = [];
    var lastCreatedAt = localStorage.getItem(this.configName + '_lastCreatedAt');
    // Don't notify for new polling channels
    if (!lastCreatedAt) {
      localStorage.setItem(this.configName + '_lastCreatedAt', (new Date()).getTime());
      return this;
    }
    
    // Reject posts by authenticated account
    models = this.reject(function(post){ return post.get('user').id === account.get('id'); });
    // Filter out old posts
    models = models.filter(function(post){ return (new Date(post.get('created_at'))).getTime() > parseInt(lastCreatedAt); });
    
    // Store latest created_at date for future matches
    if (_.first(models)) {
      localStorage.setItem(this.configName + '_lastCreatedAt', (new Date(_.first(models).get('created_at'))).getTime());
    }
    _.each(models, this.renderNotification);
  }
});
