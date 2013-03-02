console.log('succynct:content_adn.js');
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-2706568-45']);
_gaq.push(['_trackPageview']);

var seen_posts = [];

// chrome.storage.local.remove('seen_posts');

var observer = new MutationSummary({
  callback: handlePostMutations,
  queries: [
    { element: 'div[data-post-id]' }
  ]
});

chrome.storage.local.get('seen_posts', function (items) {
    if (items.seen_posts) {
        updateSeenPosts(items.seen_posts);
    }
});

function updateSeenPosts(items) {
    seen_posts = JSON.parse(items);
    // console.log(seen_posts);
    $('.stream-container div[data-post-id]').each(function(index, post) { colorPost(post); });
}

function handlePostMutations(summaries) {
    summaries[0].added.forEach(colorPost);
}

function colorPost(post) {
    var post_id = $(post).data('post-id');
    if (seen_posts && $.inArray(post_id, seen_posts) !== -1) {
        $(post).addClass('succynct-seen');
    }
}


chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.seen_posts && changes.seen_posts.newValue) {
        // console.log('add listener ', changes.seen_posts.newValue);
        updateSeenPosts(changes.seen_posts.newValue);
    }
});
