// ==UserScript==
// @name         filterByAttendeeNumbers
// @namespace    https://akyidrian.github.io/
// @version      1.0
// @description  Show/hide event listings based on numbers attending
// @author       Aydin Arik
// @match        https://www.meetup.com/
// @match        https://www.meetup.com/find/events/*
// ==/UserScript==

(function() {
    'use strict';

    ////////////////////////////////////////////////////////////////////////////////////
    // Constants
    ////////////////////////////////////////////////////////////////////////////////////
    const SCRIPT_NAME = "filterByAttendeeNumbers";
    ////////////////////////////////////////////////////////////////////////////////////
 
    createFilterByAttendeeNumbersForm(filterByAttendeeNumbersFormSubmitCallback);
    var observer = new MutationObserver(makeMutationCallback(showHideEventListings));
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
    function makeMutationCallback(showHideEventListings) {
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
                            triggerFilterByAttendeeNumbersFormSubmit();
                            return;
                        } else if(removed.classList.contains("simple-post-result-wrap")) {
                            let loadWheel = removed.getElementsByClassName("simple-infinite-pager")[0];
                            if((typeof loadWheel !== "undefined") && !loadWheel.classList.contains("off")) {
                                // Action: Show more button clicked or scrolled down to more event
                                console.log(SCRIPT_NAME + ": Show more action");
                                triggerFilterByAttendeeNumbersFormSubmit();
                                return;
                            }
                        }
                    }
                }
            }
        }

        return eventListingsMutationCallback;
    }



    ////////////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////////////

    // Show event listings where min <= attendee numbers <= max. Hide all others.
    function showHideEventListings(eventListings, min, max) {
        for(let i in eventListings) {
            let attendeeCountElem = eventListings[i].getElementsByClassName("attendee-count")[0];
            if(typeof attendeeCountElem !== "undefined") {  // Sometimes events don't show attendee numbers
                // In the beginning the innerText of an event listing is space separated. However, after hiding
                // it becomes separated by new lines! We need the trim() and '\n' in the regex because of this.
                let attendeeCountText = attendeeCountElem.innerText.trim().split(/[ \n]+/);
                
                let attendeeCount = Number(attendeeCountText[0]);
                if(attendeeCount <= max && attendeeCount >= min) {
                    eventListings[i].style.display = "";
                } else {
                    eventListings[i].style.display = "none";
                }
            } else {
                let eventListingLink = eventListings[i].getElementsByClassName("resetLink big event")[0];
                console.log(SCRIPT_NAME + ": Unable to show/hide event listing: " + eventListingLink);
            }
        }
    }


    function triggerFilterByAttendeeNumbersFormSubmit() {
        document.getElementById("filterSubmit").click();
    }


    function filterByAttendeeNumbersFormSubmitCallback(e) {
        e.preventDefault();  // Stop normal form submit action
        let inputs = e.srcElement.getElementsByTagName("input");
        let min = Number(inputs[0].value);  // "" (empty min input) is automatically turned into 0 (default min value)
        if(inputs[1].value === "") {  // Empty max input
            var max = Infinity;
        } else {  // Non-empty max input
            var max = Number(inputs[1].value);
        }
        let eventListings = Array.from(document.getElementsByClassName("event-listing"));
        showHideEventListings(eventListings, min, max);
    }


    // Should only be called once...
    function createFilterByAttendeeNumbersForm(submitCallback) {
        ////////////////////////////////
        // Min Input
        ////////////////////////////////
        let minLabel = document.createElement("label");
        minLabel.setAttribute("for", "min");
        minLabel.innerText = "Minimum: ";
        minLabel.style.width = "100%";

        let minInput = document.createElement("input");
        minInput.setAttribute("type", "number");
        minInput.setAttribute("id", "min");
        minInput.setAttribute("min", "0");
        minInput.setAttribute("step", "1");
        minInput.style.width = "100%";

        let minDiv = document.createElement("div");
        minDiv.append(minLabel);
        minDiv.append(minInput);
        minDiv.style.width = "75px";
        minDiv.style.display = "inline-block";
        minDiv.style.paddingRight = "10px";

        ////////////////////////////////
        // Max Input
        ////////////////////////////////
        let maxLabel = document.createElement("label");
        maxLabel.setAttribute("for", "max");
        maxLabel.innerText = "Maximum: ";
        maxLabel.style.width = "100%";

        let maxInput = document.createElement("input");
        maxInput.setAttribute("type", "number");
        maxInput.setAttribute("id", "max");
        maxInput.setAttribute("min", "0");
        maxInput.setAttribute("step", "1");
        maxInput.style.width = "100%";

        let maxDiv = document.createElement("div");
        maxDiv.append(maxLabel);
        maxDiv.append(maxInput);
        maxDiv.style.width = "75px";
        maxDiv.style.display = "inline-block";
        maxDiv.style.paddingRight = "10px";

        ////////////////////////////////
        // Submit Input
        ////////////////////////////////
        let submitInput = document.createElement("input");
        submitInput.setAttribute("type", "submit");
        submitInput.setAttribute("value", "Filter");
        submitInput.setAttribute("id", "filterSubmit");
        submitInput.style.marginTop = "10px";

        let submitDiv = document.createElement("div");
        submitDiv.append(submitInput);
        submitDiv.style.display = "inline-block";

        ////////////////////////////////
        // Attendee Numbers FieldSet 
        ////////////////////////////////
        let fieldSet = document.createElement("fieldset");
        let legend = document.createElement("legend");
        legend.innerText = "Attendee Numbers";
        fieldSet.append(legend);
        fieldSet.append(minDiv);
        fieldSet.append(maxDiv);
        fieldSet.append(submitDiv);

        ////////////////////////////////
        // Attendee Numbers Form 
        ////////////////////////////////
        let form = document.createElement("form");
        form.addEventListener("submit", submitCallback, false);
        form.append(fieldSet);

        // Insert form into the event filter panel...
        let eventFilter = document.getElementById("simple-event-filter");
        eventFilter.parentNode.insertBefore(form, eventFilter);
    }

})();
