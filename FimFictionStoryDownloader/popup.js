const message = "GETFIMFICTIONHTML";
const downloadTypeEnum = Object.freeze({"TXT":"txt", "HTML":"html", "EPUB":"epub"});
const errorEnum = Object.freeze({"URLUPDATE":"Error updating URL to get next page of favourites.", "DOWNLOAD":"Error downloading story.", "GENERALEXCEPTION":"An Exception has occured, error detail: "});
const urlBookShelfRegex = new RegExp("[https://www.fimfiction.net/bookshelf/./favourites]", "i");
const urlBookShelfNoPageRegex = new RegExp("[/favourites?page=.]", "i");
var downloadType = downloadTypeEnum.TXT;

//response from content script, sender is tab info, sendResponse is a response sent back to content script
chrome.runtime.onMessage.addListener(function (response, sender, sendResponse){
    alert("test has begun");
    alert(response.Data);
    alert(response.Data[0]);
});

$(document).ready(function() {
    $("#mainbutton").click(handler);
    $("#radiotext").change(function(){downloadType = downloadTypeEnum.TXT;});
    $("#radiohtml").change(function(){downloadType = downloadTypeEnum.HTML;});
    $("#radioepub").change(function(){downloadType = downloadTypeEnum.EPUB;});
});

function handler(){
    //chrome.tabs.executeScript(null,{file:"content.js"});
    getURL(validateURL);
}

function getURL(validateURL){
    chrome.tabs.query({
        active: true,
        currentWindow: true}, function urlTabs(tabs){
        var url2 = tabs[0].url;
        validateURL(url2.toString(), tabs[0].id);
    });
}

function testNavigate(){
    chrome.downloads.download({
        url: 'https://www.fimfiction.net/story/download/380265/html',
        filename: undefined,
        conflictAction: 'uniquify'});
}

function validateURL(validateurl, tabid){
    if(validateurl.includes("fimfiction.net/bookshelf/")){  
        if(urlBookShelfRegex.test(validateurl) && !urlBookShelfNoPageRegex.test(validateurl)){
            downloadStories(validateurl);
        }
        else
        {
            var changedurl = validateurl.match(new RegExp("/bookshelf/" + "(.*)" + "/favourites"));
            changedurl = 'https://www.fimfiction.net/bookshelf/' + changedurl[1] + '/favourites';
            try
            {
                var updatePromise = new Promise(function(resolve, reject){
                    chrome.tabs.update(tabid, {url : changedurl, active : true}, newTab => {    
                        chrome.tabs.onUpdated.addListener(
                            function onUpdated(updatedId, info, updatedTab){
                                try{
                                    if (info.status === "complete"){
                                        if (tabid === newTab.id){
                                            chrome.tabs.onUpdated.removeListener(onUpdated);
                                            resolve("Updated URL Success");
                                        }
                                    }
                                }catch(err){
                                    reject(Error(errorEnum.URLUPDATE));
                                }
                            }
                        );                 
                    });
                }).catch(error =>{
                    alert(error);
                }).then(function(){
                    downloadStories(changedurl);
                }).catch(error =>{
                    alert(error);
                });
            }catch(err){
                alert(errorEnum.GENERALEXCEPTION + error);
            }
        }       
    }else{
        alert("Please navigate to fimfiction.net main library favourites page and ensure" + 
                " sorting order is set to desired settings, as download follows sequential order starting from the first page of the library/bookshelf.");
    }
}

function downloadStory(storyID){
    chrome.downloads.download({
        url: 'https://www.fimfiction.net/story/download/' + storyID + '/' + downloadType,
        filename: undefined,
        conflictAction: 'uniquify'}, function(downloadId){
            if(downloadID === undefined){
                alert(errorEnum.DOWNLOAD + " Story with StoryID of " + storyID + " failed to download.");
            }
        }
    );
}

function downloadStories(validateurl){
    var downloadurl = validateurl;
    try{
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {message: message, windowId: tabs[0].windowId}, function(response){
                if (response == null || response.Data == null || response.Data.length < 1){
                    alert("No stories detected in the library. Make sure you are on your favourites page in FULL VIEW (not card or list view) " + 
                        "and that you have an internet connection.");
                }
                else
                {
                    for (var i = 0; i < response.Data.length; i++)
                    {
                        downloadStory(response.Data[i].toString());
                    }
                    downloadurl = validateurl + "?page=2";
                    startContentScript(downloadurl, 2, validateurl, tabs[0].id, response.WindowID);
                }
            });
        });
    }catch(err){
        alert(errorEnum.GENERALEXCEPTION);
    }
}

function startContentScript(changedurl, index, validateurl, tabid, windowID){
    var updatePromise = new Promise(function(resolve, reject){
        chrome.tabs.update(tabid, {url : changedurl, active : true}, newTab => {    
            chrome.tabs.onUpdated.addListener(
                function onUpdated(updatedId, info, updatedTab){
                    try{
                        if (info.status === "complete"){
                            //&& info.url
                            if (tabid === newTab.id){
                                chrome.tabs.onUpdated.removeListener(onUpdated);
                                resolve("Updated URL Success");
                            }
                        }
                    }catch(err){
                        reject(Error(errorEnum.URLUPDATE));
                    }
                }
            );                 
        });
    }).catch(error =>{
        alert(error);
    }).then(function(){       
        chrome.tabs.query({active: true, currentWindow: false, windowId: windowID }, function(tabs){
            chrome.tabs.sendMessage(tabid, {message: message}, function(response){
                if (response != null && response.Data != null && response.Data.length > 0){
                    for (var i = 0; i < response.Data.length; i++)
                    {
                        downloadStory(response.Data[i].toString());
                    }
                    startContentScript(validateurl + "?page=" + (index + 1).toString(), index + 1, validateurl, tabid, response.WindowID);
                }
            });
        });    
    }).catch(error =>{
        alert(error);
    });
}
