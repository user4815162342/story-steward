#!/usr/bin/node

/*
 * Retrieves the issues from story-steward google code project.
 */


(function() {
    var http = require('http');
    var fs = require('fs');
    var path = require('path');
    var pipette = require('pipette');


    var makeRequest = function(URI, target, completed, failed) {

        var responseReceived = false;

        var showProgress = function() {
            if (!responseReceived) {
                process.stdout
                    .write('.');
                if (!responseReceived) {
                    setTimeout(showProgress, 500);
                }
            }
        }

        var request = http.request(URI, function(response) {
            console.log('Response Received. Status: ', response.statusCode);
            responseReceived = true;
            response.setEncoding('utf8');
            response.pipe(target);
            response.on('end', completed);
        });

        request.on('error', failed);
        process.stdout.write("Requesting from: ");
        process.stdout.write(URI);
        request.end();
        showProgress();


    }


    var projectName = "story-steward";

    var issueURIs = [];
    var commentURIs = [];
    var URIRoot = "http://code.google.com/feeds/issues/p/" + projectName + "/issues/";
    var outputFile = path.join(__dirname,"issues.json");
    
    var allIssues = null;
    var issuesIndex = [];
    
    var processIssues = function(data) {
        process.stdout.write("Processing issues in batch");
        if (allIssues === null) {
            allIssues = {};
            allIssues.id = data.feed.id.$t;
            allIssues.updated = data.feed.updated.$t;
            allIssues.title = data.feed.title.$t;
            allIssues.subtitle = data.feed.subtitle.$t;
        } else {
            if ((allIssues.id !== data.feed.id.$t) ||
            (allIssues.title !== data.feed.title.$t) ||
            (allIssues.subtitle !== data.feed.subtitle.$t)) {
                console.log("Data from feed does not match previous page.");
                console.log(allIssues.id,data.feed.id.$t);
                console.log(allIssues.title,data.feed.title.$t);
                console.log(allIssues.subtitle,data.feed.subtitle.$t);
                return;
            }
        }
        for (var i = 0; i < data.feed.link.length; i++) {
            var link = data.feed.link[i];
            switch (link.rel) {
                case "next":
                    issueURIs.push(link.href);
                    break;
            }
        }
        if (!allIssues.entries) {
            allIssues.entries = [];
        }
        for (var i = 0; i < data.feed.entry.length; i++) {
            process.stdout.write(".");
            var sourceEntry = data.feed.entry[i];
            var entry = {};
            allIssues.entries.push(entry);
            entry.issueId = sourceEntry.issues$id.$t;
            issuesIndex[entry.issueId] = entry;
            entry.etag = sourceEntry.gd$etag;
            entry.id = sourceEntry.id.$t;
            entry.published = sourceEntry.published.$t;
            entry.updated = sourceEntry.updated.$t;
            entry.title = sourceEntry.title.$t;
            entry.content = sourceEntry.content.$t;
            for (var j = 0; j < sourceEntry.link.length; j++) {
                var link = sourceEntry.link[j];
                if (link.rel === "replies") {
                    var hasQuery = link.href.indexOf("?");
                    if (hasQuery === -1) {
                        link.href += "?alt=json";
                    } else if (link.href.indexOf("alt=json") < hasQuery) {
                        link.href += "&alt=json";
                    }
                    commentURIs.push({ URI: link.href, issueId: entry.issueId} );
                }
            }
            entry.authors = sourceEntry.author.map(function(item) {
                return item.name.$t;
            });
            if (sourceEntry.issues$cc) {
                entry.cc = sourceEntry.issues$cc.issues$username.$t;
            }
            entry.labels = sourceEntry.issues$label.map(function(item) {
                return item.$t;
            });
            entry.owner = sourceEntry.issues$owner.issues$username.$t;
            entry.stars = sourceEntry.issues$stars.$t;
            entry.state = sourceEntry.issues$state.$t;
            entry.status = sourceEntry.issues$status.$t;
        }
        console.log("done.");
    }
    
    var processComments = function(data,issueId) {
        process.stdout.write("Processing comments for issue " + issueId);
        var issue = issuesIndex[issueId];
        if (!issue) {
            console.log("IssueID %s not found for processing comments",issueId);
            return;
        }

        if (!issue.commentsMeta) {
            issue.commentsMeta = {};
            issue.commentsMeta.id = data.feed.id.$t;
            issue.commentsMeta.updated = data.feed.updated.$t;
            issue.commentsMeta.title = data.feed.title.$t;
            issue.commentsMeta.subtitle = data.feed.subtitle.$t;
        } else {
            if ((issue.commentsMeta.id !== data.feed.id.$t) ||
            (issue.commentsMeta.title !== data.feed.title.$t) ||
            (issue.commentsMeta.subtitle !== data.feed.subtitle.$t)) {
                console.log("Data from feed does not match previous page.");
                console.log(issue.commentsMeta.id,data.feed.id.$t);
                console.log(issue.commentsMeta.title,data.feed.title.$t);
                console.log(issue.commentsMeta.subtitle,data.feed.subtitle.$t);
                return;
            }
        }
        for (var i = 0; i < data.feed.link.length; i++) {
            var link = data.feed.link[i];
            switch (link.rel) {
                case "next":
                    commentURIs.push({ URI: link.href, issueId: issueId});
                    break;
            }
        }
        if (!issue.comments) {
            issue.comments = [];
        }
        if (data.feed.entry) {
            for (var i = 0; i < data.feed.entry.length; i++) {
                process.stdout.write(".");
                var sourceEntry = data.feed.entry[i];
                var comment = {};
                issue.comments.push(comment);
                comment.etag = sourceEntry.gd$etag;
                comment.id = sourceEntry.id.$t;
                comment.published = sourceEntry.published.$t;
                comment.updated = sourceEntry.updated.$t;
                comment.title = sourceEntry.title.$t;
                comment.content = sourceEntry.content.$t;
                comment.authors = sourceEntry.author.map(function(item) {
                    return item.name.$t;
                });
                comment.updates = {};
                var updates = sourceEntry.issues$updates;
                if (updates.issues$ccUpdate) {
                    comment.updates.ccUpdates = updates.issues$ccUpdate.map(function(item) {
                        return item.$t;
                    });
                }
                if (updates.issues$label) {
                    comment.updates.labels = updates.issues$label.map(function(item) {
                        return item.$t;
                    });
                }
                if (updates.issues$ownerUpdate) {
                    comment.updates.ownerUpdate = updates.issues$ownerUpdate.$t;
                }
                if (updates.issues$status) {
                    comment.updates.status = updates.issues$status.$t;
                }
                if (updates.issues$summary) {
                    comment.updates.summary = updates.issues$summary.$t;
                };
            }
        } 
        console.log("done.");

        
    };
    
    var writeData = function() {
        console.log("Writing file.");
        fs.writeFile(outputFile,JSON.stringify(allIssues,null," "), 'utf8', function(err) {
            if (err) {
                console.error("Error writing file",err);
                return;
            }
            console.log("Done.");
        });
    }

    var processCommentURIs = function() {
        if (commentURIs.length) {
            var commentEntry = commentURIs.pop();
            var pipe = new pipette.Pipe();
            var sink = new pipette.Sink(pipe.reader);
            sink.setEncoding('utf8');
            sink.on('data',function(data) {
                processComments(JSON.parse(data),commentEntry.issueId);
            });
            makeRequest(commentEntry.URI, pipe.writer, function() {
                processCommentURIs();
            }, function(error) {
                console.error("Could not retrieve comments: " + error)
            });
        } else {
            writeData();
        }
    };

    var processIssueURIs = function() {
        if (issueURIs.length) {
            var URI = issueURIs.pop();
            var pipe = new pipette.Pipe();
            var sink = new pipette.Sink(pipe.reader);
            sink.setEncoding('utf8');
            sink.on('data',function(data) {
                processIssues(JSON.parse(data));
            });
            makeRequest(URI, pipe.writer, function() {
                processIssueURIs();
            }, function(error) {
                console.error("Could not retrieve issues: " + error)
            });

        } else {
            processCommentURIs();
        }
    }


    issueURIs.push(URIRoot + "full?alt=json");

    processIssueURIs();

    // TODO: Attachments are not available with this, so we almost have to "scrape" the actual issue screen to get them. Bleh, I'm going to
    // worry about that some other time.


})();
