// ==UserScript==
// @name         meetupFindEventsImproved
// @namespace    https://akyidrian.github.io/
// @version      0.1
// @description  Shows event RSVP limits, durations and addresses on listings
// @author       Aydin Arik
// @match        https://www.meetup.com/
// @match        https://www.meetup.com/find/events/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// TODO: Cache results for a set time frame to avoid excess API calls?
// TODO: Edge case: what do we do when more events are shown with further scrolling?
// TODO: Sometimes rsvp_limit, venue and duration are undefined!
(function() {
    'use strict';

    // Click show more
    document.getElementsByClassName("simple-infinite-pager")[0].firstChild.click();

    // Go through event listings and perform API request for extra information
    var eventListings = document.getElementsByClassName("event-listing");
    var eventCount = eventListings.length;
    for(var i = 0; i < eventCount; i++) {
        var slashSplitURL = eventListings[i].getElementsByTagName("a")[0].href.split("/");
        var urlName = slashSplitURL[3];
        var id = slashSplitURL[5];
        requestEventInfo(eventListings[i], urlName, id);
    }

    //TODO: Display time duration/end time
    //TODO: display rsvp_limit.
    //TODO: display address (clickable to google maps using address/latlong?)
    function updateEventListing(eventListing, json) {
        console.log(json.rsvp_limit);
        console.log(json.venue);
        console.log(json.duration / (1000*60*60));
    }

    function requestEventInfo(eventListing, urlName, id) {
        var xhr = new XMLHttpRequest(),
            method = "GET",
            url = "https://api.meetup.com/" + urlName + "/events/" + id;
        xhr.open(method, url, true);
        xhr.onload = function () { // xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
            updateEventListing(eventListing, JSON.parse(xhr.responseText));
        };
        xhr.send();
    }
})();
