"use strict"
const message = "GETFIMFICTIONHTML";
const failed = "FAILED";

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.message === message){
        var storyIds = [];
        $(".story_content_box").each(function (index, data){
            var kvp = { };
            kvp[0] = $(data).find(".story_name").attr('href').toString().split("story/")[1].split("/")[0];
            kvp[1] = $(data).find(".story_name").text();
            kvp[2] = $(data).find(".author a").text();
            storyIds.push(kvp);
        });  
        /* Card/List View Support */
        if (storyIds.length == 0){
            $(".story-card-container").each(function (index, data){
                var kvp = { };
                kvp[0] = $(data).find(".story_link").attr('href').toString().split("story/")[1].split("/")[0];
                kvp[1] = $(data).find(".story_link").text();
                kvp[2] = $(data).find(".story-card__author").text();
                storyIds.push(kvp);
            });  
        }
        sendResponse({Data: storyIds, WindowID: request.windowId});
    }else{
        sendResponse({Data: failed});
    }
    return true;
});
