"use strict"
const CONTENTMESSAGE = "GETFIMFICTIONHTML";
const DOWNLOAD_TYPE_ENUM = Object.freeze({"TXT":"txt", "HTML":"html", "EPUB":"epub"});
const ERROR_ENUM = Object.freeze({"URLUPDATE":"Error updating URL to get next page of favourites.", "DOWNLOAD":"Error downloading story.", "GENERALEXCEPTION":"An Exception has occured, error detail: "});
const URL_BOOKSHELF_REGEX = new RegExp("[https://www.fimfiction.net/bookshelf/./favourites]", "i");
const URL_BOOKSHELFNOPAGE_REGEX = new RegExp("[/favourites?page=.]", "i");
let downloadType = DOWNLOAD_TYPE_ENUM.TXT;

$(document).ready(function() {
    $("#mainbutton").click(getURL);
    $("#radiotext").change(function(){downloadType = DOWNLOAD_TYPE_ENUM.TXT;});
    $("#radiohtml").change(function(){downloadType = DOWNLOAD_TYPE_ENUM.HTML;});
    $("#radioepub").change(function(){downloadType = DOWNLOAD_TYPE_ENUM.EPUB;});
});

function getURL(){
    chrome.tabs.query({
        active: true,
        currentWindow: true}, function urlTabs(tabs){
        validateURL(tabs[0].url.toString(), tabs[0].id);
    });
}

function validateURL(validateurl, tabid){
    if(validateurl.includes("fimfiction.net/bookshelf/")){  
        if(URL_BOOKSHELF_REGEX.test(validateurl) && !URL_BOOKSHELFNOPAGE_REGEX.test(validateurl)){
            downloadStories(validateurl);
        }
        else
        {
            try
            {
                let changedurl = validateurl.match(new RegExp("/bookshelf/" + "(.*)" + "/favourites"));
                changedurl = "https://www.fimfiction.net/bookshelf/" + changedurl[1] + "/favourites";
                const updatePromise = new Promise(function(resolve, reject){
                    chrome.tabs.update(tabid, {url : changedurl, active : true}, newTab => {    
                        chrome.tabs.onUpdated.addListener(
                            function onUpdated(updatedId, info){
                                try{
                                    if (info.status === "complete"){
                                        if (tabid === newTab.id){
                                            chrome.tabs.onUpdated.removeListener(onUpdated);
                                            resolve("Updated URL Success");
                                        }
                                    }
                                }catch(err){
                                    reject(Error(ERROR_ENUM.URLUPDATE));
                                }
                            }
                        );                 
                    });
                }).catch(error =>{
                    alert(error);
                });
                updatePromise.then(function onSuccess(){
                    downloadStories(changedurl);
                }, function onFailure(reason){
                    alert(reason);
                }).catch(error =>{
                    alert(error);
                });
            }catch(err){
                alert(ERROR_ENUM.GENERALEXCEPTION + err);
            }
        }       
    }else{
        alert("Please navigate to fimfiction.net main library favourites page and ensure" + 
                " sorting order is set to desired settings, as download follows sequential order starting from the first page of the library/bookshelf.");
    }
}

function downloadStory(storyDetails){
    try{
        chrome.downloads.download({
            url: 'https://www.fimfiction.net/story/download/' + storyDetails[0] + '/' + downloadType,
            filename: storyDetails[1].slice(0, 1).replace(/[/\\?%*.:|"<>]/g, "") + storyDetails[1].slice(1, storyDetails[1].length).replace(/[/\\?%*:|"<>]/g, "") + " - " + storyDetails[2] + "." + downloadType,
            conflictAction: 'uniquify'}, function(downloadID){
                if(downloadID === undefined){
                    alert(ERROR_ENUM.DOWNLOAD + " Story with StoryID of " + storyDetails[0] + " failed to download.");
                }
            }
        );
    }catch(err){
        if (storyDetails == null || storyDetails[0] == null || storyDetails[0] == undefined){
            alert(ERROR_ENUM.DOWNLOAD + " Story failed to download, no ID available.");
        }else{
            alert(ERROR_ENUM.DOWNLOAD + " Story with StoryID of " + storyDetails[0] + " failed to download.");
        }
    }
}

function downloadStories(validateurl){
    let downloadurl = validateurl;
    chrome.contentSettings.automaticDownloads.set({
        'primaryPattern': "https://fimfiction.net/*",
        'setting': "allow",
        'scope': ("regular")
    }, function(){
        try{
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.tabs.sendMessage(tabs[0].id, {message: CONTENTMESSAGE, windowId: tabs[0].windowId}, function(response){
                    if (response == null || response.Data == null || response.Data.length < 1){
                        alert("No stories detected in the library. Make sure you are on your favourites page in FULL VIEW (not card or list view) " + 
                            "and that you have an internet connection.");
                    }
                    else
                    {
                        for (let i = 0; i < response.Data.length; i++)
                        {
                            downloadStory(response.Data[i]);
                        }
                        downloadurl = validateurl + "?page=2";
                        startContentScript(downloadurl, 2, validateurl, tabs[0].id, response.WindowID);
                    }
                });
            });
        }catch(err){
            alert(ERROR_ENUM.GENERALEXCEPTION);
        }
    });
}

function startContentScript(changedurl, index, validateurl, tabid, windowID){
    const updatePromise = new Promise(function(resolve, reject){
        chrome.tabs.update(tabid, {url : changedurl, active : true}, newTab => {    
            chrome.tabs.onUpdated.addListener(
                function onUpdated(updatedId, info){
                    try{
                        if (info.status === "complete"){
                            //&& info.url
                            if (tabid === newTab.id){
                                chrome.tabs.onUpdated.removeListener(onUpdated);
                                resolve("Updated URL Success");
                            }
                        }
                    }catch(err){
                        reject(Error(ERROR_ENUM.URLUPDATE));
                    }
                }
            );                 
        });
    }).catch(error =>{
        alert(error);
    });
    updatePromise.then(function(){       
        chrome.tabs.query({active: true, currentWindow: false, windowId: windowID }, function(){
            chrome.tabs.sendMessage(tabid, {message: CONTENTMESSAGE}, function(response){
                if (response != null && response.Data != null && response.Data.length > 0){
                    for (let i = 0; i < response.Data.length; i++)
                    {
                        downloadStory(response.Data[i]);
                    }
                    startContentScript(validateurl + "?page=" + (index + 1).toString(), index + 1, validateurl, tabid, response.WindowID);
                }
            });
        });    
    }, function onFailure(reason){
        alert(reason);
    }).catch(error =>{
        alert(error);
    });
}