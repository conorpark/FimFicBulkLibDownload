const message = "GETFIMFICTIONHTML";
const failed = "FAILED";

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.message === message){
        var storyIds = [];
        $(".story_name").each(function (index, data){
            var storyID = $(data).attr('href').toString();
            storyIds.push(storyID.split("story/")[1].split("/")[0]);
        });  
        sendResponse({Data: storyIds, WindowID: request.windowId});
    }else{
        sendResponse({Data: failed});
    }
    return true;
});
