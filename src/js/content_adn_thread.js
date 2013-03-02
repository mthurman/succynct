console.log('succynct:content_adn_thread.js');
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-2706568-45']);
_gaq.push(['_trackPageview']);

var seen_posts = [];
chrome.storage.local.get('seen_posts', function (items) {
    if (items.seen_posts) {
        seen_posts = JSON.parse(items.seen_posts);
    }
});
var page_post_ids = $.map($('div[data-post-id]'), function(post) { return $(post).data('post-id')});
seen_posts = seen_posts.concat(page_post_ids);

chrome.storage.local.set({'seen_posts': JSON.stringify(seen_posts)});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    // console.log('storage changed ', changes);
    if (changes.seen_posts) {
        seen_posts = JSON.parse(changes.seen_posts.newValue);
    }
});