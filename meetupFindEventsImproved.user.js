// ==UserScript==
// @name         meetupFindEventsImproved
// @namespace    https://akyidrian.github.io/
// @version      1.0
// @description  Display event RSVP limits, durations and Google Map links on listings
// @author       Aydin Arik
// @match        https://www.meetup.com/
// @match        https://www.meetup.com/find/events/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    ////////////////////////////////////////////////////////////////////////////////////
    // Constants
    ////////////////////////////////////////////////////////////////////////////////////
    //const API_KEY = "api_key_here";  // FIXME: Required to work in Greasemonkey on Firefox
    const SCRIPT_NAME = "meetupFindEventsImproved";
    const RATE_LIMIT_RESET = 10; // Time window in seconds
    const RATE_LIMIT_LIMIT = 30; // Number of requests in time window possible
    const REQUEST_RATE = ((RATE_LIMIT_RESET + 1) / RATE_LIMIT_LIMIT) * 1000;  // Request rate in milliseconds (with some leeway)
    ////////////////////////////////////////////////////////////////////////////////////
 
    var rl = rateLimiter(REQUEST_RATE);
    var observer = new MutationObserver(makeMutationCallback(generateRequests));
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



    ////////////////////////////////////////////////////////////////////////////////////
    // Closures
    ////////////////////////////////////////////////////////////////////////////////////

    // Push your request items so that requests are made at the right rate.
    function rateLimiter(rate) {
        var queue = [];
        var timer = null;

        function process() {
            let item = queue.shift();
            item.request(item.reqObj);
            if(queue.length === 0) {
                clearInterval(timer);
                timer = null;
            }
        }

        function push(item) {
            queue.push(item);
            if(timer === null) {
                timer = setInterval(process, rate);
            }
        }

        return {push: push};
    }


    function makeMutationCallback(generateRequests) {
        // Keeps track of next set of event listings to process.
        var eventIndex = 0;

        function eventListingsMutationCallback(mutations) {
            let eventListings = Array.from(document.getElementsByClassName("event-listing"));
            for(let m in mutations) {
                let mutation = mutations[m];
                let removedNodes = mutation.removedNodes;
                for(let r in removedNodes) {
                    let removed = removedNodes[r];
                    if(typeof removed.classList !== "undefined") {
                        if(removed.classList.contains("interstitialblock")) {
                            // Action: Filtering events action (e.g. by date, events I'm attending, etc)
                            console.log(SCRIPT_NAME + ": Filter events action");
                            generateRequests(eventListings);
                            eventIndex = eventListings.length;
                            return;
                        } else if(removed.classList.contains("simple-post-result-wrap")) {
                            let loadWheel = removed.getElementsByClassName("simple-infinite-pager")[0];
                            if((typeof loadWheel !== "undefined") && !loadWheel.classList.contains("off")) {
                                // Action: Show more button clicked or scrolled down to more event
                                console.log(SCRIPT_NAME + ": Show more action");
                                generateRequests(eventListings.slice(eventIndex));
                                eventIndex = eventListings.length;
                                return;
                            }
                        }
                    }
                }
            }
        }

        // An initial call to generateRequests is necessary because there are essentially
        // unrecorded mutations in the first page load. 
        (function() {
            let eventListings = Array.from(document.getElementsByClassName("event-listing"));
            generateRequests(eventListings);
            eventIndex = eventListings.length;
        })();

        return eventListingsMutationCallback;
    }


    function makeDisplayCallback(xhr, eventListing) {
        function displayExtraEventInfoCallback() {
            if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                displayExtraEventInfo(eventListing, JSON.parse(xhr.responseText));
            } else {
                console.log(SCRIPT_NAME + ": Unusual status code (" + xhr.status + ") returned by " + xhr.responseURL);
            }
        }
        return displayExtraEventInfoCallback;
    }



    ////////////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////////////

    // Go through provided event listings and process new event information
    function generateRequests(eventListings) {
        for(let i in eventListings) {
            let slashSplitURL = eventListings[i].getElementsByTagName("a")[0].href.split("/");
            let urlName = slashSplitURL[3];
            let id = slashSplitURL[5];
            let reqObj = {"eventListing": eventListings[i], 
                          "urlName": urlName,
                          "id": id,
                          "callback": makeDisplayCallback};
            rl.push({"reqObj": reqObj, "request": requestEventInfo});
        }
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


    function displayExtraEventInfo(eventListing, json) {
        displayRSVPLimit(eventListing, json.rsvp_limit);
        displayVenue(eventListing, json.venue);
        displayDuration(eventListing, json.duration);
    }

    function requestEventInfo(reqObj) {
        let eventListing = reqObj.eventListing;
        let urlName = reqObj.urlName;
        let id = reqObj.id;
        let callback = reqObj.callback;

        if(typeof id === "undefined") {
            console.log(SCRIPT_NAME + ": Info request failed on event with urlName: " + urlName);
            return;
        }

        let url = "https://api.meetup.com/" + urlName + "/events/" + id;
        if(typeof API_KEY !== "undefined") {
            url += "?key=" + API_KEY + "&sign=true";
        } else {
            console.log(SCRIPT_NAME + ": API_KEY is undefined");
        }

        let xhr = new XMLHttpRequest();
        let method = "GET";
        xhr.open(method, url, true);
        xhr.onload = callback(xhr, eventListing);
        xhr.send();
    }
})();
