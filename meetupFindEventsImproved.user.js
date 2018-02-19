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

(function() {
    'use strict';
    // TODO: Put inside closure?
    var eventIndex = 0;  // Keep track of next event to display on.

    var observer = new MutationObserver(eventListingsMutationCallback);
    var observerConfig = {
        childList: true,
        subtree: true,
    };
    var targetNode = document.getElementById("simple-view");
    observer.observe(targetNode, observerConfig);

    // Click show more
    //document.getElementsByClassName("simple-infinite-pager")[0].firstChild.click();

    // First page load
    eventIndex = processNewEventListings(0);


    function eventListingsMutationCallback(mutations) {
        for(var m in mutations) {
            var mutation = mutations[m];
            var removedNodes = mutation.removedNodes;
            for(var r in removedNodes) {
                var removed = removedNodes[r];
                if(removed.classList !== undefined) {
                    if(removed.classList.contains("interstitialblock")) {
                        // Action: Filtering events action (e.g. by date, events I'm attending, etc)
                        //console.log("====================Filter Events Action====================");
                        eventIndex = 0;
                        eventIndex = processNewEventListings(0);
                        return;
                    } else if(removed.classList.contains("simple-post-result-wrap")) {
                        var loadWheel = removed.getElementsByClassName("simple-infinite-pager")[0];
                        if(loadWheel !== undefined && !loadWheel.classList.contains("off")) {
                            // Action: Show more button clicked or scrolled down to more event
                            //console.log("=====================Show More Action=====================");
                            eventIndex = processNewEventListings(eventIndex);
                            return;
                        }
                    }
                }
            }
        }
    }


    function processNewEventListings(startIndex) {
        // Go through event listings and perform API request for extra information
        var eventListings = document.getElementsByClassName("event-listing");
        var eventCount = eventListings.length;
        for(var i = startIndex; i < eventCount; i++) {
            var slashSplitURL = eventListings[i].getElementsByTagName("a")[0].href.split("/");
            var urlName = slashSplitURL[3];
            var id = slashSplitURL[5];
            requestEventInfo(eventListings[i], urlName, id);
        }
        return i;
    }


    function displayRSVPLimit(eventListing, rsvpLimit) {
        if(rsvpLimit !== undefined) {
            var attendeeCount = eventListing.getElementsByClassName("attendee-count")[0];
            if(attendeeCount !== undefined) {
                var span = document.createElement("span");
                span.setAttribute("class", "text--countdown text--middotLeft");
                span.innerText += "/ " + rsvpLimit + " spaces available";
                attendeeCount.append(span);
            }
        }
    }


    // duration is in milliseconds.
    function displayDuration(eventListing, duration) {
        if(duration !== undefined) {
            var startTimeLink = eventListing.getElementsByClassName("resetLink chunk")[0];
            startTimeLink.append(document.createElement("br"));
            var time = document.createElement("time");
            time.innerText = (duration/(1000*60*60)) + "HRS";
            startTimeLink.append(time);
        }
    }


    function displayVenue(eventListing, venue) {
        if(venue !== undefined) {
            var locationDiv = eventListing.getElementsByClassName("chunk text--secondary")[0];
            if(locationDiv !== undefined) {
                var locationLink = locationDiv.children[0];
                locationLink.href = "https://www.google.com/maps/?q=" + venue.lat + "," + venue.lon;
                locationLink.setAttribute("target", "_blank");  // Open new tab when clicked
            }
        }
    }


    function updateEventListing(eventListing, json) {
        displayRSVPLimit(eventListing, json.rsvp_limit);
        displayVenue(eventListing, json.venue);
        displayDuration(eventListing, json.duration);
    }


    function requestEventInfo(eventListing, urlName, id) {
        if(id === undefined) {
            return;
        }
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
