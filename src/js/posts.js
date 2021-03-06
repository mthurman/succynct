console.log('posts');

/**
 * A single interaction
 */
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


  // save: function() {
  //   if (this.get('text') && this.get('text').length < 256) {
  //     // TODO: for some reason this is not adding the response to the model
  //     var jqXHR = $.post(this.url, this.attributes)
  //         .success(this.success)
  //         .error(this.error);
  //   } else {
  //     return false;
  //   }
  // },


  parse: function(response) {
    return response.data;
  },


  success: function(model, textStatus, jqXHR) {
    var notification = new TextNotificationView({
      title: 'Successfully posted to App.net',
      body: model.get('text'),
      image: model.get('user').avatar_image.url,
      url: model.get('canonical_url'),
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


/**
 * This is left over from a previous design choice. It may be going away.
 */
var Polling = Backbone.Collection.extend({
  initialize: function(options) {
    _.bindAll(this, 'error');
    _.extend(this, options);
  },
  // update: function() {
  //   if (window.account && window.account.get('accessToken') && config.get(this.configName)) {
  //     this.fetch({ error: this.error });
  //   }
  //   return this;
  // },
  error: function(collection, response, options) {
    // TODO: update copy of notifications
    if (response.status === 401) {
      console.log('Invalid access_token');
      var notification = new TextNotificationView({
        image: chrome.extension.getURL('/img/angle.png'),
        title: 'Authentication failed',
        body: 'Click here to sign in to App.net again.',
        url: chrome.extension.getURL('/options.html'),
        type: 'AuthError'
      });
      notification.render();
      // TODO: update this to support multiple accounts
      accounts.remove(accounts.at(0));
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


// /**
//  * A collection of interactions
//  */
// var Interactions = Polling.extend({
//   model: Interaction,
//   url: 'https://alpha-api.app.net/stream/0/users/me/interactions',
//   initialize: function() {
//     _.bindAll(this, 'checkForNew');
//   },
//   checkForNew: function() {
//     if (accounts.length === 0) {
//       return false;
//     }
//     this.fetch({
//       error: this.error,
//       update: true,
//       data: {
//         count: 2 // TODO: start using since_id
//       },
//       headers: {
//         'Authorization': 'Bearer ' + accounts.at(0).get('access_token'),
//         // HACK: should be applied globally
//         'X-ADN-Migration-Overrides': 'response_envelope=1&disable_min_max_id=1&follow_pagination=1&pagination_ids=1'
//       }
//     });
//   },
//   parse: function(response) {
//     return response.data;
//   },
//   // renderNotification: function(model, index, array) {
//   //   if (this.notificationType === 'mentions') {
//   //     this.renderMentionNotification(model);
//   //   } else {
//   //     console.log('this.notificationType', this.notificationType);
//   //   }
//   // },
//   // renderMentionNotification: function(model) {
//   //   var notification = new TextNotificationView({
//   //     image: model.get('user').avatar_image.url,
//   //     title: 'Mentioned by @' + model.get('user').username + ' on ADN',
//   //     body: model.get('text'),
//   //     url: 'https://alpha.app.net/' + model.get('user').username + '/post/' + model.get('id'),
//   //     type: 'Mention'
//   //   });
//   //   notification.render();
//   // },
//   // filterNewPosts: function() {
//   //   var models = [];
//   //   var lastCreatedAt = localStorage.getItem(this.configName + '_lastCreatedAt');
//   //   // Don't notify for new polling channels
//   //   if (!lastCreatedAt) {
//   //     localStorage.setItem(this.configName + '_lastCreatedAt', (new Date()).getTime());
//   //     return this;
//   //   }
//   //   
//   //   // Reject posts by authenticated account
//   //   models = this.reject(function(post){ return post.get('user').id === account.get('id'); });
//   //   // Filter out old posts
//   //   models = models.filter(function(post){ return (new Date(post.get('created_at'))).getTime() > parseInt(lastCreatedAt); });
//   //   
//   //   // Store latest created_at date for future matches
//   //   if (_.first(models)) {
//   //     localStorage.setItem(this.configName + '_lastCreatedAt', (new Date(_.first(models).get('created_at'))).getTime());
//   //   }
//   //   _.each(models, this.renderNotification);
//   // }
// });
// 
// 
// window.interactions = new Interactions();