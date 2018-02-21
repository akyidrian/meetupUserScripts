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
    //const API_KEY = "api_key_here";  // FIXME: Required to work in Greasemonkey on Firefox
    const SCRIPT_NAME = "meetupFindEventsImproved";

    var observer = new MutationObserver(makeMutationCallback(processEventListings));
    var observerConfig = {
        childList: true,
        subtree: true,
    };
    var targetNode = document.getElementById("simple-view");
    if(targetNode !== null) {  // If logged in...
        observer.observe(targetNode, observerConfig);
    } else {
        console.log(SCRIPT_NAME + ": Need to log in");
    }

    // Click show more
    //document.getElementsByClassName("simple-infinite-pager")[0].firstChild.click();

    function makeMutationCallback(processEventListings) {
        // Keeps track of next event listings to process.
        // Note, a call to processEventListings is necessary here in the definition
        // because on first page load a mutation is assumed. 
        var eventIndex = processEventListings(0);

        function eventListingsMutationCallback(mutations) {
            for(let m in mutations) {
                let mutation = mutations[m];
                let removedNodes = mutation.removedNodes;
                for(let r in removedNodes) {
                    let removed = removedNodes[r];
                    if(typeof removed.classList !== "undefined") {
                        if(removed.classList.contains("interstitialblock")) {
                            // Action: Filtering events action (e.g. by date, events I'm attending, etc)
                            console.log(SCRIPT_NAME + ": Filter events action");
                            eventIndex = processEventListings(0);
                            return;
                        } else if(removed.classList.contains("simple-post-result-wrap")) {
                            let loadWheel = removed.getElementsByClassName("simple-infinite-pager")[0];
                            if((typeof loadWheel !== "undefined") && !loadWheel.classList.contains("off")) {
                                // Action: Show more button clicked or scrolled down to more event
                                console.log(SCRIPT_NAME + ": Show more action");
                                eventIndex = processEventListings(eventIndex);
                                return;
                            }
                        }
                    }
                }
            }
        }

        return eventListingsMutationCallback;
    }


    function processEventListings(startIndex) {
        // Go through event listings and perform API request for extra information
        let eventListings = document.getElementsByClassName("event-listing");
        let eventCount = eventListings.length;
        for(var i = startIndex; i < eventCount; i++) {
            let slashSplitURL = eventListings[i].getElementsByTagName("a")[0].href.split("/");
            let urlName = slashSplitURL[3];
            let id = slashSplitURL[5];
            requestEventInfo(eventListings[i], urlName, id);
        }
        return i;
    }


    function displayRSVPLimit(eventListing, rsvpLimit) {
        if(typeof rsvpLimit !== "undefined") {
            let attendeeCount = eventListing.getElementsByClassName("attendee-count")[0];
            if(typeof attendeeCount !== "undefined") {
                let span = document.createElement("span");
                span.setAttribute("class", "text--countdown text--middotLeft");
                span.innerText += "/ " + rsvpLimit + " spaces available";
                attendeeCount.append(span);
            }
        }
    }


    // duration is in milliseconds.
    function displayDuration(eventListing, duration) {
        if(typeof duration !== "undefined") {
            let startTimeLink = eventListing.getElementsByClassName("resetLink chunk")[0];
            startTimeLink.append(document.createElement("br"));
            let time = document.createElement("time");
            time.innerText = (duration/(1000*60*60)) + "HRS";
            startTimeLink.append(time);
        }
    }


    function displayVenue(eventListing, venue) {
        if(typeof venue !== "undefined") {
            let locationDiv = eventListing.getElementsByClassName("chunk text--secondary")[0];
            if(typeof locationDiv !== "undefined") {
                let locationLink = locationDiv.children[0];
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
        if(typeof id === "undefined") {
            console.log(SCRIPT_NAME + ": Info request failed on event with urlName: " + urlName);
            return;
        }

        let url = "https://api.meetup.com/" + urlName + "/events/" + id;
        if(typeof API_KEY !== "undefined") {
            url += "?key=" + API_KEY + "&sign=true";
        } else {
            console.log(SCRIPT_NAME + ": API_KEY undefined");
        }

        let xhr = new XMLHttpRequest();
        let method = "GET";
        xhr.open(method, url, true);
        xhr.onload = function () { // xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
            updateEventListing(eventListing, JSON.parse(xhr.responseText));
        };
        xhr.send();
    }
})();
