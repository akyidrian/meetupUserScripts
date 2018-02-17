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
// TODO: iframe to open google maps link?
(function() {
    'use strict';
	var eventIndex = 0;  // Keep track of next event to display on.

    // Click show more
    document.getElementsByClassName("simple-infinite-pager")[0].firstChild.click();

	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if(mutation.attributeName == 'id' &&
               mutation.oldValue == '__sizzle__') {
				processNewEventListings();
			}
		});
	});

	var observerConfig = {
		attributes: true,
		attributeOldValue: true
	};

	var targetNode = document.getElementsByClassName("searchResults")[0];
	observer.observe(targetNode, observerConfig);

	function processNewEventListings() {
		// Go through event listings and perform API request for extra information
		var eventListings = document.getElementsByClassName("event-listing");
		var eventCount = eventListings.length;
		console.log(eventCount);
		for(var i = eventIndex; i < eventCount; i++) {
			var slashSplitURL = eventListings[i].getElementsByTagName("a")[0].href.split("/");
			var urlName = slashSplitURL[3];
			var id = slashSplitURL[5];
			requestEventInfo(eventListings[i], urlName, id);
		}
		eventIndex = i;
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
				locationDiv.children[0].href = "https://www.google.com/maps/?q=" + venue.lat + "," + venue.lon;
			}
        }
    }

    //TODO: Need to skip displaying on events happening now?
    function updateEventListing(eventListing, json) {
        displayRSVPLimit(eventListing, json.rsvp_limit);
        displayVenue(eventListing, json.venue);
        displayDuration(eventListing, json.duration);
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
